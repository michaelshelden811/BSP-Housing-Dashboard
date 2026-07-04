-- BSP Housing Dashboard Schema
-- Run once in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS housing_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house TEXT NOT NULL CHECK (house IN ('acoma','mayberry','bell','noah')),
  amount NUMERIC(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house TEXT CHECK (house IN ('acoma','mayberry','bell','noah','org')),
  category TEXT NOT NULL CHECK (category IN ('rent','utilities','food_supplies','internet','vehicle_gas','subscription','other')),
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date DATE NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  receipt_count INTEGER DEFAULT 1,
  notes TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('peer','house_manager')),
  hourly_rate NUMERIC(6,2) NOT NULL CHECK (hourly_rate > 0),
  primary_house TEXT CHECK (primary_house IN ('acoma','mayberry','bell','noah')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  peer_id UUID REFERENCES peers(id),
  peer_name TEXT NOT NULL,
  peer_email TEXT,
  client_name TEXT NOT NULL,
  house TEXT NOT NULL CHECK (house IN ('acoma','mayberry','bell','noah')),
  session_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  house_fallback BOOLEAN DEFAULT FALSE,
  billing_rate NUMERIC(6,2) NOT NULL DEFAULT 60.00,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','peerbill')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: run this in Supabase SQL editor if table already exists
-- ALTER TABLE billing_entries ADD COLUMN IF NOT EXISTS peer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_housing_payments_month_year ON housing_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_month_year ON expenses(year, month);
CREATE INDEX IF NOT EXISTS idx_expenses_house ON expenses(house);
CREATE INDEX IF NOT EXISTS idx_supply_runs_month_year ON supply_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_billing_entries_month_year ON billing_entries(year, month);
CREATE INDEX IF NOT EXISTS idx_billing_entries_house ON billing_entries(house);
CREATE INDEX IF NOT EXISTS idx_billing_entries_peer ON billing_entries(peer_id);
