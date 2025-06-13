/*
  # Social Features Implementation

  1. New Tables
    - `followers` - Track user follow relationships
    - Add follower/following counts to profiles

  2. Functions & Triggers
    - Auto-update follower/following counts
    - Maintain data consistency

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for follow relationships
*/

-- Add follower/following counts to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- Create followers table
CREATE TABLE IF NOT EXISTS followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, followed_id)
);

-- Enable RLS on followers table
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followers
CREATE POLICY "Users can view all follow relationships"
  ON followers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON followers
  FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow others"
  ON followers
  FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed_id ON followers(followed_id);
CREATE INDEX IF NOT EXISTS idx_followers_created_at ON followers(created_at DESC);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for followed user
    UPDATE profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.followed_id;
    
    -- Increment following count for follower user
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for followed user
    UPDATE profiles
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.followed_id;
    
    -- Decrement following count for follower user
    UPDATE profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update follower counts on insert/delete
DROP TRIGGER IF EXISTS update_follower_counts_trigger ON followers;
CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Function to get social feed for a user
CREATE OR REPLACE FUNCTION get_social_feed(user_uuid uuid, limit_val integer DEFAULT 20, offset_val integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price decimal,
  images text[],
  brand text,
  size text,
  condition text,
  category text,
  seller_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  seller_nickname text,
  seller_profile_picture text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.price,
    i.images,
    i.brand,
    i.size,
    i.condition,
    i.category,
    i.seller_id,
    i.status,
    i.created_at,
    i.updated_at,
    p.nickname as seller_nickname,
    p.profile_picture as seller_profile_picture
  FROM 
    items i
  JOIN 
    profiles p ON i.seller_id = p.id
  WHERE 
    i.status = 'active' AND
    i.seller_id IN (
      SELECT followed_id 
      FROM followers 
      WHERE follower_id = user_uuid
    )
  ORDER BY 
    i.created_at DESC
  LIMIT 
    limit_val
  OFFSET 
    offset_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is following another user
CREATE OR REPLACE FUNCTION is_following(follower_uuid uuid, followed_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM followers 
    WHERE follower_id = follower_uuid AND followed_id = followed_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;