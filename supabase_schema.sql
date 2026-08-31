-- =========================================================
-- LAYO POSTGRESQL DATABASE SCHEMA (SUPABASE)
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hlqeddasjkxweiqadege/sql
-- =========================================================

-- 1. Shipments Table (Master Logistics & Order Record)
CREATE TABLE IF NOT EXISTS shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mode VARCHAR DEFAULT 'online',
  status VARCHAR DEFAULT 'draft',
  destination_city VARCHAR,
  destination_address TEXT,
  india_warehouse VARCHAR,
  external_order_id VARCHAR,
  external_tracking VARCHAR,
  total_weight NUMERIC DEFAULT 1.0,
  total_cost NUMERIC DEFAULT 0,
  payment_method VARCHAR DEFAULT 'online',
  items JSONB DEFAULT '[]'::jsonb,
  stage_timestamps JSONB DEFAULT '{}'::jsonb,
  qc_photos JSONB DEFAULT '[]'::jsonb,
  box_dimensions JSONB DEFAULT '{}'::jsonb,
  discrepancy_note TEXT,
  customer_notes TEXT,
  master_box_id VARCHAR,
  canada_local_carrier VARCHAR,
  canada_local_awb VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on existing table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS mode VARCHAR DEFAULT 'online',
ADD COLUMN IF NOT EXISTS destination_city VARCHAR,
ADD COLUMN IF NOT EXISTS destination_address TEXT,
ADD COLUMN IF NOT EXISTS india_warehouse VARCHAR,
ADD COLUMN IF NOT EXISTS external_order_id VARCHAR,
ADD COLUMN IF NOT EXISTS external_tracking VARCHAR,
ADD COLUMN IF NOT EXISTS total_weight NUMERIC DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'online',
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stage_timestamps JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS qc_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS box_dimensions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS discrepancy_note TEXT,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS master_box_id VARCHAR,
ADD COLUMN IF NOT EXISTS canada_local_carrier VARCHAR,
ADD COLUMN IF NOT EXISTS canada_local_awb VARCHAR,
ADD COLUMN IF NOT EXISTS warehouse_action VARCHAR DEFAULT 'ship',
ADD COLUMN IF NOT EXISTS expected_packages INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS hold_group_id UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Warehouses Table (India Hub Locations)
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city VARCHAR NOT NULL,
  address TEXT NOT NULL,
  pincode VARCHAR NOT NULL,
  contact VARCHAR NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default India Hub if empty
INSERT INTO warehouses (city, address, pincode, contact)
SELECT 'Delhi NCR Hub', 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', '110077', '+91 9321852629'
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE city ILIKE '%Delhi%');

-- 3. Haul Cards Table (Marketing Arbitrage Comparison Cards)
CREATE TABLE IF NOT EXISTS haul_cards (
  id VARCHAR PRIMARY KEY,
  headline VARCHAR NOT NULL,
  age_label VARCHAR NOT NULL,
  asset1_icon VARCHAR DEFAULT 'checkroom',
  asset1_label VARCHAR DEFAULT 'Tops',
  asset1_qty INT DEFAULT 1,
  asset2_icon VARCHAR DEFAULT 'category',
  asset2_label VARCHAR DEFAULT 'Bottoms',
  asset2_qty INT DEFAULT 1,
  canada_price NUMERIC DEFAULT 0,
  india_price NUMERIC DEFAULT 0,
  highlight_subtext TEXT,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ops Staff Table (Warehouse Personnel & Admin Authorization)
CREATE TABLE IF NOT EXISTS ops_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  hub_location VARCHAR DEFAULT 'Delhi NCR Hub',
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by VARCHAR,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default whitelisted staff
INSERT INTO ops_staff (email, full_name, hub_location, status, approved_by, approved_at)
VALUES 
  ('ankur.iitd.nita@gmail.com', 'Ankur Sharma (Admin)', 'Delhi NCR Hub', 'approved', 'system', NOW()),
  ('admin@layo.com', 'Layo Operations Master', 'Delhi NCR Hub', 'approved', 'system', NOW())
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS) policies
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE haul_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops_staff ENABLE ROW LEVEL SECURITY;

-- Public read policies for authenticated/anon users
CREATE POLICY IF NOT EXISTS "Allow public read warehouses" ON warehouses FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public read haul_cards" ON haul_cards FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public read ops_staff" ON ops_staff FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow users read own shipments" ON shipments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow users insert shipments" ON shipments FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow users update shipments" ON shipments FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "Allow users delete shipments" ON shipments FOR DELETE USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin modify warehouses" ON warehouses FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin modify haul_cards" ON haul_cards FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin modify ops_staff" ON ops_staff FOR ALL USING (true);


-- =========================================================
-- 5. Customers Table (Customer shipping profile & addresses)
-- =========================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  -- Canadian delivery address
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR DEFAULT 'Toronto',
  province VARCHAR DEFAULT 'ON',
  postal_code VARCHAR,
  country VARCHAR DEFAULT 'Canada',
  -- Indian sender address (for personal goods)
  india_address TEXT,
  india_city VARCHAR,
  india_pincode VARCHAR,
  india_phone VARCHAR,
  -- Metadata
  kyc_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS full_name VARCHAR,
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR DEFAULT 'Toronto',
ADD COLUMN IF NOT EXISTS province VARCHAR DEFAULT 'ON',
ADD COLUMN IF NOT EXISTS postal_code VARCHAR,
ADD COLUMN IF NOT EXISTS country VARCHAR DEFAULT 'Canada',
ADD COLUMN IF NOT EXISTS india_address TEXT,
ADD COLUMN IF NOT EXISTS india_city VARCHAR,
ADD COLUMN IF NOT EXISTS india_pincode VARCHAR,
ADD COLUMN IF NOT EXISTS india_phone VARCHAR,
ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =========================================================
-- 6. Employee Profiles Table (Ops Staff & Admins only)
-- =========================================================
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic info
  full_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  avatar_url TEXT,
  -- Role & access
  role VARCHAR NOT NULL DEFAULT 'ops',          -- 'ops', 'admin', 'supervisor'
  -- Location & assignment
  hub_location VARCHAR DEFAULT 'Delhi NCR Hub', -- which warehouse they work at
  department VARCHAR DEFAULT 'Warehouse',       -- 'Warehouse', 'Admin', 'Customer Support'
  -- Employment details
  employee_code VARCHAR UNIQUE,                 -- e.g. LAYO-OPS-001
  joined_at DATE DEFAULT CURRENT_DATE,
  shift VARCHAR DEFAULT 'Morning',              -- 'Morning', 'Afternoon', 'Night'
  -- Access control
  status VARCHAR DEFAULT 'active',              -- 'active', 'inactive', 'suspended'
  approved_by VARCHAR,                          -- email of admin who approved
  approved_at TIMESTAMPTZ,
  -- Emergency contact
  emergency_contact_name VARCHAR,
  emergency_contact_phone VARCHAR,
  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS full_name VARCHAR,
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS phone VARCHAR,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'ops',
ADD COLUMN IF NOT EXISTS hub_location VARCHAR DEFAULT 'Delhi NCR Hub',
ADD COLUMN IF NOT EXISTS department VARCHAR DEFAULT 'Warehouse',
ADD COLUMN IF NOT EXISTS employee_code VARCHAR,
ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS shift VARCHAR DEFAULT 'Morning',
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
ADD COLUMN IF NOT EXISTS approved_by VARCHAR,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR,
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Seed default admin & ops staff from ops_staff table
INSERT INTO employee_profiles (email, full_name, role, hub_location, status, approved_by, approved_at)
VALUES
  ('ankur.iitd.nita@gmail.com', 'Ankur Sharma', 'admin', 'Delhi NCR Hub', 'active', 'system', NOW()),
  ('admin@layo.com', 'Layo Operations Master', 'admin', 'Delhi NCR Hub', 'active', 'system', NOW())
ON CONFLICT (email) DO NOTHING;


-- =========================================================
-- 7. Transactions Table (All payment records)
-- =========================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount_inr NUMERIC NOT NULL DEFAULT 0,
  amount_cad NUMERIC NOT NULL DEFAULT 0,
  currency VARCHAR DEFAULT 'CAD',
  exchange_rate NUMERIC,
  payment_method VARCHAR NOT NULL DEFAULT 'stripe',
  stripe_session_id VARCHAR,
  stripe_payment_intent_id VARCHAR,
  razorpay_order_id VARCHAR,
  razorpay_payment_id VARCHAR,
  status VARCHAR DEFAULT 'pending',
  failure_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refund_amount_cad NUMERIC DEFAULT 0,
  customer_email VARCHAR,
  customer_name VARCHAR,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS amount_inr NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_cad NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'CAD',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR,
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR,
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR,
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_amount_cad NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_email VARCHAR,
ADD COLUMN IF NOT EXISTS customer_name VARCHAR,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Link transactions → customers via customer_id
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Indexes for fast joins
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shipment_id ON transactions(shipment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- RLS for new tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='customers' AND policyname='Allow users manage customers') THEN
    CREATE POLICY "Allow users manage customers" ON customers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Allow users manage profiles') THEN
    CREATE POLICY "Allow users manage profiles" ON user_profiles FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='Allow read transactions') THEN
    CREATE POLICY "Allow read transactions" ON transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='Allow insert transactions') THEN
    CREATE POLICY "Allow insert transactions" ON transactions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='Allow update transactions') THEN
    CREATE POLICY "Allow update transactions" ON transactions FOR UPDATE USING (true);
  END IF;
END $$;

-- =========================================================
-- 8. Shipment Activity Logs Table (Detailed step-by-step audit)
-- =========================================================
CREATE TABLE IF NOT EXISTS shipment_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  stage VARCHAR NOT NULL,                      -- e.g. 'draft', 'paid', 'inwarded', 'qc_verified', 'repacked', 'bulk_consolidated', 'in_transit', 'delivered'
  status_label VARCHAR,                        -- Human-readable label
  done_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  done_by_email VARCHAR,
  done_by_role VARCHAR DEFAULT 'ops',          -- 'customer', 'ops', 'admin', 'system'
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,          -- photos, weights, dimensions, AWB, carrier etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure stage_history column exists on shipments table
ALTER TABLE shipments 
ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]'::jsonb;

-- Indexes for fast query and audit joins
CREATE INDEX IF NOT EXISTS idx_activity_logs_shipment_id ON shipment_activity_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON shipment_activity_logs(done_by_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_stage ON shipment_activity_logs(stage);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON shipment_activity_logs(created_at);

-- RLS for activity logs
ALTER TABLE shipment_activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shipment_activity_logs' AND policyname='Allow read activity logs') THEN
    CREATE POLICY "Allow read activity logs" ON shipment_activity_logs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shipment_activity_logs' AND policyname='Allow insert activity logs') THEN
    CREATE POLICY "Allow insert activity logs" ON shipment_activity_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;


-- =========================================================
-- 11. System Settings Table (Dynamic Pricing & Weight configurations)
-- =========================================================
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read of settings
CREATE POLICY "Allow public read system_settings" ON system_settings FOR SELECT USING (true);

-- Allow admins/system to modify settings
CREATE POLICY "Allow admin modify system_settings" ON system_settings FOR ALL USING (true);


-- =========================================================
-- 12. Contact Submissions Table (For Lead Management)
-- =========================================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  contact VARCHAR NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts
CREATE POLICY "Allow public insert contact_submissions" ON contact_submissions FOR INSERT WITH CHECK (true);

-- Allow admins to read/manage submissions
CREATE POLICY "Allow admin read contact_submissions" ON contact_submissions FOR SELECT USING (true);



