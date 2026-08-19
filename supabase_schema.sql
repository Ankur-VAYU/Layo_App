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
SELECT 'Delhi NCR Hub', 'Plot 42, Okhla Industrial Area Phase 3, New Delhi', '110020', '+91 98100 12345'
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
CREATE POLICY IF NOT EXISTS "Allow admin modify warehouses" ON warehouses FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin modify haul_cards" ON haul_cards FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow admin modify ops_staff" ON ops_staff FOR ALL USING (true);

