/*
  # Wallet and Payment System

  1. New Tables
    - `wallets` - User wallet balances and payment info
    - `wallet_transactions` - Transaction history for wallets
    - `payment_intents` - Stripe payment intent tracking
    - `payouts` - Payout requests and status

  2. Functions
    - `add_wallet_transaction` - Add transaction and update wallet balance
    - `process_wallet_payment` - Process payment using wallet balance

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for wallet access
*/

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance decimal(10,2) DEFAULT 0.00 CHECK (available_balance >= 0),
  pending_balance decimal(10,2) DEFAULT 0.00 CHECK (pending_balance >= 0),
  total_earned decimal(10,2) DEFAULT 0.00 CHECK (total_earned >= 0),
  total_spent decimal(10,2) DEFAULT 0.00 CHECK (total_spent >= 0),
  stripe_account_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'escrow_hold', 'escrow_release', 'payout')),
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  reference_id text,
  reference_type text CHECK (reference_type IN ('order', 'payout', 'refund', 'payment')),
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  id text PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL,
  client_secret text,
  type text DEFAULT 'purchase' CHECK (type IN ('purchase', 'wallet_topup')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  stripe_transfer_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add platform_fee and seller_amount to orders table
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee decimal(10,2) DEFAULT 0.00;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_amount decimal(10,2);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallets
CREATE POLICY "Users can view their own wallet"
  ON wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own wallet"
  ON wallets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallet"
  ON wallets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own transactions"
  ON wallet_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions"
  ON wallet_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for payment_intents
CREATE POLICY "Users can view their own payment intents"
  ON payment_intents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment intents"
  ON payment_intents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment intents"
  ON payment_intents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for payouts
CREATE POLICY "Users can view their own payouts"
  ON payouts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payouts"
  ON payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);

-- Function to add wallet transaction and update balance
CREATE OR REPLACE FUNCTION add_wallet_transaction(
  p_user_id uuid,
  p_type text,
  p_amount decimal,
  p_description text,
  p_reference_id text DEFAULT NULL,
  p_reference_type text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  transaction_id uuid;
  current_wallet wallets%ROWTYPE;
BEGIN
  -- Get or create wallet
  SELECT * INTO current_wallet FROM wallets WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, available_balance, pending_balance, total_earned, total_spent)
    VALUES (p_user_id, 0, 0, 0, 0)
    RETURNING * INTO current_wallet;
  END IF;

  -- Insert transaction
  INSERT INTO wallet_transactions (
    user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    p_user_id, p_type, p_amount, p_description, p_reference_id, p_reference_type
  ) RETURNING id INTO transaction_id;

  -- Update wallet balance based on transaction type
  CASE p_type
    WHEN 'credit' THEN
      UPDATE wallets SET 
        available_balance = available_balance + p_amount,
        total_earned = total_earned + p_amount,
        updated_at = now()
      WHERE user_id = p_user_id;
    
    WHEN 'debit' THEN
      UPDATE wallets SET 
        available_balance = available_balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
      WHERE user_id = p_user_id;
    
    WHEN 'escrow_hold' THEN
      UPDATE wallets SET 
        pending_balance = pending_balance + p_amount,
        total_earned = total_earned + p_amount,
        updated_at = now()
      WHERE user_id = p_user_id;
    
    WHEN 'escrow_release' THEN
      UPDATE wallets SET 
        available_balance = available_balance + p_amount,
        pending_balance = pending_balance - p_amount,
        updated_at = now()
      WHERE user_id = p_user_id;
    
    WHEN 'payout' THEN
      UPDATE wallets SET 
        available_balance = available_balance + p_amount, -- p_amount is negative for payouts
        updated_at = now()
      WHERE user_id = p_user_id;
  END CASE;

  RETURN transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process wallet payment
CREATE OR REPLACE FUNCTION process_wallet_payment(
  p_buyer_id uuid,
  p_seller_id uuid,
  p_item_id uuid,
  p_total_amount decimal,
  p_platform_fee decimal,
  p_seller_amount decimal
) RETURNS json AS $$
DECLARE
  order_id uuid;
  buyer_wallet wallets%ROWTYPE;
BEGIN
  -- Get buyer wallet
  SELECT * INTO buyer_wallet FROM wallets WHERE user_id = p_buyer_id;
  
  IF NOT FOUND OR buyer_wallet.available_balance < p_total_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Start transaction
  BEGIN
    -- Create order
    INSERT INTO orders (
      item_id, buyer_id, seller_id, total_amount, platform_fee, seller_amount, status
    ) VALUES (
      p_item_id, p_buyer_id, p_seller_id, p_total_amount, p_platform_fee, p_seller_amount, 'paid'
    ) RETURNING id INTO order_id;

    -- Update item status
    UPDATE items SET status = 'sold' WHERE id = p_item_id;

    -- Debit buyer wallet
    PERFORM add_wallet_transaction(
      p_buyer_id, 'debit', p_total_amount, 
      'Purchase payment', order_id::text, 'order'
    );

    -- Credit seller wallet (in escrow)
    PERFORM add_wallet_transaction(
      p_seller_id, 'escrow_hold', p_seller_amount,
      'Sale proceeds (in escrow)', order_id::text, 'order'
    );

    RETURN json_build_object('order_id', order_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Payment processing failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release escrow funds
CREATE OR REPLACE FUNCTION release_escrow_funds(p_order_id uuid) RETURNS boolean AS $$
DECLARE
  order_record orders%ROWTYPE;
BEGIN
  -- Get order details
  SELECT * INTO order_record FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Release escrow funds to seller
  PERFORM add_wallet_transaction(
    order_record.seller_id, 'escrow_release', order_record.seller_amount,
    'Sale completed - funds released', p_order_id::text, 'order'
  );

  -- Update order status
  UPDATE orders SET status = 'completed', updated_at = now() WHERE id = p_order_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;