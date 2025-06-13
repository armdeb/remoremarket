/*
  # User Reviews & Ratings System

  1. New Tables
    - `reviews` - User reviews and ratings for transactions
    - `review_responses` - Seller responses to reviews
    - `review_helpful_votes` - Tracks which users found reviews helpful

  2. Schema Updates
    - Add average_rating to profiles table
    - Add review_count to profiles table

  3. Functions
    - `update_user_rating` - Updates a user's average rating when reviews change
    - `calculate_user_rating` - Calculates the average rating for a user

  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies for review access and creation
*/

-- Add rating fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating decimal(3,2) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text,
  item_accuracy integer CHECK (item_accuracy >= 1 AND item_accuracy <= 5),
  communication integer CHECK (communication >= 1 AND communication <= 5),
  shipping_speed integer CHECK (shipping_speed >= 1 AND shipping_speed <= 5),
  helpful_count integer DEFAULT 0,
  is_verified_purchase boolean DEFAULT true,
  is_hidden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create review responses table
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create review helpful votes table
CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view non-hidden reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (NOT is_hidden);

CREATE POLICY "Users can create reviews for their own orders"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = reviews.order_id AND
      (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid()) AND
      orders.status = 'completed'
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "Users can delete their own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- RLS Policies for review responses
CREATE POLICY "Anyone can view review responses"
  ON review_responses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can respond to reviews about themselves"
  ON review_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    responder_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_responses.review_id AND
      reviews.reviewee_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own responses"
  ON review_responses
  FOR UPDATE
  TO authenticated
  USING (responder_id = auth.uid());

CREATE POLICY "Users can delete their own responses"
  ON review_responses
  FOR DELETE
  TO authenticated
  USING (responder_id = auth.uid());

-- RLS Policies for review helpful votes
CREATE POLICY "Anyone can view helpful votes"
  ON review_helpful_votes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpful_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their helpful votes"
  ON review_helpful_votes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);

-- Function to update user rating when reviews change
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new average rating and count
  PERFORM calculate_user_rating(NEW.reviewee_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user rating
CREATE OR REPLACE FUNCTION calculate_user_rating(user_id uuid)
RETURNS void AS $$
DECLARE
  avg_rating decimal(3,2);
  count_reviews integer;
BEGIN
  -- Get average rating and count
  SELECT 
    COALESCE(AVG(rating)::decimal(3,2), NULL),
    COUNT(*)
  INTO 
    avg_rating,
    count_reviews
  FROM reviews
  WHERE reviewee_id = user_id AND NOT is_hidden;

  -- Update user profile
  UPDATE profiles
  SET 
    average_rating = avg_rating,
    review_count = count_reviews,
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user rating when a review is inserted
CREATE TRIGGER update_user_rating_on_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Trigger to update user rating when a review is updated
CREATE TRIGGER update_user_rating_on_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Trigger to update user rating when a review is deleted
CREATE TRIGGER update_user_rating_on_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Function to update helpful count when votes change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews
    SET helpful_count = helpful_count - 1
    WHERE id = OLD.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update helpful count when a vote is added
CREATE TRIGGER update_helpful_count_on_insert
  AFTER INSERT ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();

-- Trigger to update helpful count when a vote is removed
CREATE TRIGGER update_helpful_count_on_delete
  AFTER DELETE ON review_helpful_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_helpful_count();