/*
  # User-Facing Dispute Workflow and Promoted Listings

  1. Dispute Workflow
    - Create disputes table for tracking user disputes
    - Add dispute_evidence table for storing evidence
    - Add dispute_messages for communication
    - Add dispute_status_history for tracking changes

  2. Promoted Listings
    - Create promotions table for tracking promoted items
    - Add promotion_plans for different promotion tiers
    - Add promotion_transactions for payment tracking
    - Update items table with promotion fields

  3. Functions & Triggers
    - Create functions for dispute resolution
    - Create functions for promotion management
    - Add triggers for status updates

  4. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- =====================
-- DISPUTE WORKFLOW
-- =====================

-- Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('item_not_received', 'item_not_as_described', 'payment_issue', 'other')),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dispute_evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES disputes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('image', 'document', 'text')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create dispute_messages table
CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_admin_message boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create dispute_status_history table
CREATE TABLE IF NOT EXISTS dispute_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid REFERENCES disputes(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- PROMOTED LISTINGS
-- =====================

-- Create promotion_plans table
CREATE TABLE IF NOT EXISTS promotion_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_hours integer NOT NULL,
  features jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES promotion_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  start_time timestamptz DEFAULT now(),
  end_time timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotion_transactions table
CREATE TABLE IF NOT EXISTS promotion_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('wallet', 'card', 'credits')),
  payment_intent_id text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now()
);

-- Add promotion fields to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_promoted boolean DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS promotion_expires_at timestamptz;

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Function to create a dispute status history entry
CREATE OR REPLACE FUNCTION log_dispute_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO dispute_status_history (
      dispute_id,
      previous_status,
      new_status,
      changed_by,
      notes,
      created_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for dispute status changes
CREATE TRIGGER log_dispute_status_change_trigger
  AFTER UPDATE OF status ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION log_dispute_status_change();

-- Function to handle promotion expiration
CREATE OR REPLACE FUNCTION handle_promotion_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update item when promotion is created
  IF TG_OP = 'INSERT' THEN
    UPDATE items
    SET 
      is_promoted = true,
      promotion_id = NEW.id,
      promotion_expires_at = NEW.end_time
    WHERE id = NEW.item_id;
  -- Update item when promotion status changes
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
      UPDATE items
      SET 
        is_promoted = false,
        promotion_id = NULL,
        promotion_expires_at = NULL
      WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for promotion changes
CREATE TRIGGER handle_promotion_trigger
  AFTER INSERT OR UPDATE OF status ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION handle_promotion_expiration();

-- Function to check and expire promotions
CREATE OR REPLACE FUNCTION check_expired_promotions()
RETURNS void AS $$
BEGIN
  -- Update promotions that have expired
  UPDATE promotions
  SET status = 'completed'
  WHERE status = 'active' AND end_time < now();
  
  -- Update items with expired promotions
  UPDATE items
  SET 
    is_promoted = false,
    promotion_id = NULL,
    promotion_expires_at = NULL
  WHERE promotion_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- SECURITY (RLS)
-- =====================

-- Enable RLS on all new tables
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
CREATE POLICY "Users can view their own disputes"
  ON disputes
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid() OR reported_id = auth.uid());

CREATE POLICY "Users can create disputes for their orders"
  ON disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = disputes.order_id AND
      (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own disputes"
  ON disputes
  FOR UPDATE
  TO authenticated
  USING (reporter_id = auth.uid() AND status = 'open');

-- RLS Policies for dispute_evidence
CREATE POLICY "Users can view evidence for their disputes"
  ON dispute_evidence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidence.dispute_id AND
      (disputes.reporter_id = auth.uid() OR disputes.reported_id = auth.uid())
    )
  );

CREATE POLICY "Users can add evidence to their disputes"
  ON dispute_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidence.dispute_id AND
      (disputes.reporter_id = auth.uid() OR disputes.reported_id = auth.uid())
    )
  );

-- RLS Policies for dispute_messages
CREATE POLICY "Users can view messages for their disputes"
  ON dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id AND
      (disputes.reporter_id = auth.uid() OR disputes.reported_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their disputes"
  ON dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id AND
      (disputes.reporter_id = auth.uid() OR disputes.reported_id = auth.uid())
    )
  );

-- RLS Policies for dispute_status_history
CREATE POLICY "Users can view status history for their disputes"
  ON dispute_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_status_history.dispute_id AND
      (disputes.reporter_id = auth.uid() OR disputes.reported_id = auth.uid())
    )
  );

-- RLS Policies for promotion_plans
CREATE POLICY "Anyone can view active promotion plans"
  ON promotion_plans
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for promotions
CREATE POLICY "Users can view their own promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Users can create promotions for their items"
  ON promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = promotions.item_id AND
      items.seller_id = auth.uid() AND
      items.status = 'active'
    )
  );

CREATE POLICY "Users can update their own promotions"
  ON promotions
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid());

-- RLS Policies for promotion_transactions
CREATE POLICY "Users can view their own promotion transactions"
  ON promotion_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =====================
-- INDEXES
-- =====================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter_id ON disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_id ON disputes(reported_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_user_id ON dispute_evidence(user_id);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_status_history_dispute_id ON dispute_status_history(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_status_history_created_at ON dispute_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_promotions_item_id ON promotions(item_id);
CREATE INDEX IF NOT EXISTS idx_promotions_seller_id ON promotions(seller_id);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_end_time ON promotions(end_time);

CREATE INDEX IF NOT EXISTS idx_promotion_transactions_promotion_id ON promotion_transactions(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_transactions_user_id ON promotion_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_items_is_promoted ON items(is_promoted);
CREATE INDEX IF NOT EXISTS idx_items_promotion_expires_at ON items(promotion_expires_at);

-- =====================
-- INITIAL DATA
-- =====================

-- Insert default promotion plans
INSERT INTO promotion_plans (name, description, price, duration_hours, features, is_active)
VALUES
  ('Basic Boost', 'Highlight your item in search results', 2.99, 24, '{"featured_in_search": true}', true),
  ('Featured', 'Show your item on the homepage and search results', 4.99, 48, '{"featured_in_search": true, "homepage_featured": true}', true),
  ('Premium', 'Maximum visibility across the platform for 7 days', 9.99, 168, '{"featured_in_search": true, "homepage_featured": true, "category_top": true}', true)
ON CONFLICT DO NOTHING;