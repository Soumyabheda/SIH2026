/*
# Farmer Market Linkages & Price Discovery Schema

## Overview
This migration creates the complete database schema for a farmer market linkages and price discovery platform.
It enables farmers to discover current market prices, list their produce for sale, connect with buyers,
and access government policies and schemes relevant to agriculture.

## New Tables

1. **crops** — Master list of crops (name, category, scientific name, image, unit)
2. **markets** — Market locations (name, location/state, type, contact info)
3. **market_prices** — Daily/periodic price records per crop per market (min/max/modal price, arrival quantity)
4. **farmer_listings** — Farmers listing their produce for sale (crop, quantity, price, location, contact)
5. **buyer_requests** — Buyers posting demand for crops (crop, quantity needed, budget, location)
6. **gov_policies** — Government schemes and policies for farmers (title, category, description, eligibility, benefits)
7. **price_alerts** — User subscriptions for price change notifications (crop, market, threshold)
8. **market_insights** — Aggregated market analysis articles/tips

## Security
- RLS enabled on all tables.
- All tables use `TO anon, authenticated` policies since this is a public-access platform (no sign-in required to browse).
- Farmer listings, buyer requests, and price alerts allow public read + anon write so anyone can post.
- Gov policies, crops, markets, market_prices, and market_insights are public read, admin-managed (write via service role only).
*/

-- ============================================================
-- CROPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS crops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Cereals',
  scientific_name text,
  image_url text,
  unit text NOT NULL DEFAULT 'Quintal',
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_crops" ON crops;
CREATE POLICY "public_read_crops" ON crops FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- MARKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  district text,
  market_type text NOT NULL DEFAULT 'Mandi',
  address text,
  contact_phone text,
  latitude numeric(10,6),
  longitude numeric(10,6),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_markets" ON markets;
CREATE POLICY "public_read_markets" ON markets FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- MARKET PRICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id) ON DELETE CASCADE,
  market_id uuid REFERENCES markets(id) ON DELETE CASCADE,
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  min_price numeric(12,2) NOT NULL,
  max_price numeric(12,2) NOT NULL,
  modal_price numeric(12,2) NOT NULL,
  arrival_qty numeric(14,2),
  unit text NOT NULL DEFAULT 'Quintal',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_market_prices" ON market_prices;
CREATE POLICY "public_read_market_prices" ON market_prices FOR SELECT
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_market_prices_crop ON market_prices(crop_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_market ON market_prices(market_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_date ON market_prices(price_date);

-- ============================================================
-- FARMER LISTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS farmer_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id) ON DELETE SET NULL,
  crop_name text NOT NULL,
  farmer_name text NOT NULL,
  quantity numeric(14,2) NOT NULL,
  unit text NOT NULL DEFAULT 'Quintal',
  asking_price numeric(12,2) NOT NULL,
  state text NOT NULL,
  district text,
  contact_phone text NOT NULL,
  description text,
  quality_grade text DEFAULT 'A',
  harvest_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE farmer_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_farmer_listings" ON farmer_listings;
CREATE POLICY "public_read_farmer_listings" ON farmer_listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_farmer_listings" ON farmer_listings;
CREATE POLICY "anon_insert_farmer_listings" ON farmer_listings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_farmer_listings" ON farmer_listings;
CREATE POLICY "anon_update_farmer_listings" ON farmer_listings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_farmer_listings" ON farmer_listings;
CREATE POLICY "anon_delete_farmer_listings" ON farmer_listings FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- BUYER REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS buyer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id) ON DELETE SET NULL,
  crop_name text NOT NULL,
  buyer_name text NOT NULL,
  buyer_type text NOT NULL DEFAULT 'Trader',
  quantity_needed numeric(14,2) NOT NULL,
  unit text NOT NULL DEFAULT 'Quintal',
  budget_per_unit numeric(12,2) NOT NULL,
  state text NOT NULL,
  district text,
  contact_phone text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buyer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_buyer_requests" ON buyer_requests;
CREATE POLICY "public_read_buyer_requests" ON buyer_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_buyer_requests" ON buyer_requests;
CREATE POLICY "anon_insert_buyer_requests" ON buyer_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_buyer_requests" ON buyer_requests;
CREATE POLICY "anon_update_buyer_requests" ON buyer_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_buyer_requests" ON buyer_requests;
CREATE POLICY "anon_delete_buyer_requests" ON buyer_requests FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- GOVERNMENT POLICIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS gov_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Subsidy',
  ministry text,
  description text NOT NULL,
  eligibility text,
  benefits text,
  application_url text,
  effective_date date,
  valid_until date,
  state text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gov_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_gov_policies" ON gov_policies;
CREATE POLICY "public_read_gov_policies" ON gov_policies FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- PRICE ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id uuid REFERENCES crops(id) ON DELETE CASCADE,
  market_id uuid REFERENCES markets(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  threshold_price numeric(12,2) NOT NULL,
  alert_type text NOT NULL DEFAULT 'above',
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_price_alerts" ON price_alerts;
CREATE POLICY "public_read_price_alerts" ON price_alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_price_alerts" ON price_alerts;
CREATE POLICY "anon_insert_price_alerts" ON price_alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_price_alerts" ON price_alerts;
CREATE POLICY "anon_delete_price_alerts" ON price_alerts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- MARKET INSIGHTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS market_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Analysis',
  content text NOT NULL,
  author text,
  image_url text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_market_insights" ON market_insights;
CREATE POLICY "public_read_market_insights" ON market_insights FOR SELECT
  TO anon, authenticated USING (true);

-- ============================================================
-- CROP CATEGORIES VIEW (helper)
-- ============================================================
CREATE OR REPLACE VIEW crop_categories AS
SELECT DISTINCT category FROM crops ORDER BY category;
