-- SQL Script to properly configure Supabase shipments table
-- Run this in the SQL Editor of your Supabase Dashboard

-- 1. Check if shipments table exists, if not create it
CREATE TABLE IF NOT EXISTS public.shipments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mode text,
    destination_city text,
    destination_address text,
    total_weight numeric,
    total_cost numeric,
    items jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'paid'::text,
    payment_method text
);

-- 2. Add any missing columns to shipments table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='user_id') THEN
        ALTER TABLE public.shipments ADD COLUMN user_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='india_warehouse') THEN
        ALTER TABLE public.shipments ADD COLUMN india_warehouse text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='external_order_id') THEN
        ALTER TABLE public.shipments ADD COLUMN external_order_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipments' AND column_name='external_tracking') THEN
        ALTER TABLE public.shipments ADD COLUMN external_tracking text;
    END IF;
END $$;

-- 3. Create public.warehouses table if it does not exist
CREATE TABLE IF NOT EXISTS public.warehouses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    city text NOT NULL,
    address text NOT NULL,
    pincode text,
    contact text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Enable Row Level Security (RLS) or add policies if needed (optional)
-- ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
