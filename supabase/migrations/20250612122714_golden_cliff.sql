/*
  # Delivery API Support

  1. New Tables
    - `delivery_status_history` - Track all status changes for deliveries
    - `riders` - Information about delivery riders

  2. Schema Updates
    - Add `rider_id` to orders table
    - Add `status` to delivery_schedules table
    - Add location tracking support

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Add rider_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Add status to delivery_schedules table
ALTER TABLE delivery_schedules ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (
  status IN (
    'pending', 
    'assigned', 
    'en_route_to_pickup', 
    'at_pickup', 
    'picked_up', 
    'en_route_to_delivery', 
    'at_delivery', 
    'delivered', 
    'failed'
  )
);

-- Create delivery_status_history table
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  location geometry(POINT, 4326),
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Create riders table (for external rider app)
CREATE TABLE IF NOT EXISTS riders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  api_key text UNIQUE,
  vehicle_type text,
  license_plate text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_status_history
CREATE POLICY "Users can view delivery history for their orders"
  ON delivery_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = delivery_status_history.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid() OR orders.rider_id = auth.uid())
    )
  );

-- RLS Policies for riders
CREATE POLICY "Riders can view their own profile"
  ON riders
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Riders can update their own profile"
  ON riders
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_order_id ON delivery_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_created_at ON delivery_status_history(created_at);
CREATE INDEX IF NOT EXISTS idx_riders_profile_id ON riders(profile_id);
CREATE INDEX IF NOT EXISTS idx_riders_api_key ON riders(api_key);

-- Add spatial index for location queries
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_location ON delivery_status_history USING GIST(location);

-- Function to generate API key for riders
CREATE OR REPLACE FUNCTION generate_rider_api_key()
RETURNS text AS $$
DECLARE
  key text;
  key_exists boolean;
BEGIN
  LOOP
    -- Generate a random API key
    key := encode(gen_random_bytes(24), 'base64');
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM riders WHERE api_key = key) INTO key_exists;
    
    -- Exit loop if key doesn't exist
    EXIT WHEN NOT key_exists;
  END LOOP;
  
  RETURN key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a new rider
CREATE OR REPLACE FUNCTION register_rider(
  p_profile_id uuid,
  p_vehicle_type text,
  p_license_plate text
)
RETURNS json AS $$
DECLARE
  api_key text;
  rider_id uuid;
BEGIN
  -- Generate API key
  api_key := generate_rider_api_key();
  
  -- Insert new rider
  INSERT INTO riders (
    profile_id,
    api_key,
    vehicle_type,
    license_plate
  ) VALUES (
    p_profile_id,
    api_key,
    p_vehicle_type,
    p_license_plate
  ) RETURNING id INTO rider_id;
  
  RETURN json_build_object(
    'rider_id', rider_id,
    'api_key', api_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;