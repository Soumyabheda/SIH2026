/*
# Add user profiles, verification, and transactions

## Overview
This migration adds three new tables to support user authentication, identity verification for farmers and sellers, and a transaction/payment system between farmers and buyers.

## New Tables

1. **profiles** — Extended user data linked to auth.users (full name, role, phone, verification status, verification documents)
   - `id` → references auth.users(id)
   - `full_name` — user's display name
   - `role` — 'farmer' or 'buyer'
   - `phone` — contact phone
   - `state`, `district` — location
   - `verification_status` — 'unverified', 'pending', 'verified', 'rejected'
   - `verification_doc_type` — 'aadhaar', 'pan', 'land_records', 'other'
   - `verification_doc_number` — document reference (stored partially, not full sensitive numbers)
   - `verification_notes` — admin notes on verification
   - `verified_at` — timestamp when verified

2. **transactions** — Payment/transaction records between farmers and buyers for produce
   - `id` — primary key
   - `farmer_id` → references auth.users(id)
   - `buyer_id` → references auth.users(id)
   - `listing_id` → references farmer_listings(id) (nullable, can be direct)
   - `crop_name` — name of crop traded
   - `quantity` — quantity traded
   - `unit` — unit of measurement
   - `amount` — total transaction amount in INR
   - `status` — 'pending', 'escrow_held', 'completed', 'disputed', 'cancelled'
   - `payment_method` — 'upi', 'bank_transfer', 'cash', 'stripe'
   - `stripe_payment_intent_id` — Stripe payment intent reference (for future Stripe integration)
   - `farmer_confirmed` — farmer confirms dispatch
   - `buyer_confirmed` — buyer confirms receipt
   - `notes` — transaction notes

3. **verification_reviews** — Admin review log for verification requests
   - `id` — primary key
   - `profile_id` → references profiles(id)
   - `reviewer_email` — admin who reviewed
   - `decision` — 'approved' or 'rejected'
   - `notes` — review notes
   - `created_at` — review timestamp

## Security
- RLS enabled on all new tables.
- profiles: users can read and update their own profile; all authenticated users can read basic profile info (for trust).
- transactions: farmers and buyers can only see transactions they are party to.
- verification_reviews: only the profile owner can see their reviews (admin writes via service role).
- farmer_listings updated: add user_id column for ownership, add authenticated-scoped policies.

## Important Notes
1. A trigger auto-creates a profile row when a new auth.users row is created (on signup).
2. The transactions table includes a stripe_payment_intent_id column ready for future Stripe integration.
3. farmer_listings gets a user_id column (nullable, for backward compat with existing anon-created listings).
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'farmer',
  phone text,
  state text,
  district text,
  verification_status text NOT NULL DEFAULT 'unverified',
  verification_doc_type text,
  verification_doc_number text,
  verification_notes text,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_all_profiles" ON profiles;
CREATE POLICY "read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES farmer_listings(id) ON DELETE SET NULL,
  crop_name text NOT NULL,
  quantity numeric(14,2) NOT NULL,
  unit text NOT NULL DEFAULT 'Quintal',
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'upi',
  stripe_payment_intent_id text,
  farmer_confirmed boolean DEFAULT false,
  buyer_confirmed boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_transactions" ON transactions;
CREATE POLICY "read_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = farmer_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "create_own_transactions" ON transactions;
CREATE POLICY "create_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = farmer_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = farmer_id OR auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = farmer_id OR auth.uid() = buyer_id);

-- ============================================================
-- VERIFICATION REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_email text,
  decision text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_reviews" ON verification_reviews;
CREATE POLICY "read_own_reviews" ON verification_reviews FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = verification_reviews.profile_id AND profiles.id = auth.uid())
  );

-- ============================================================
-- Add user_id to farmer_listings for ownership
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'farmer_listings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE farmer_listings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Authenticated-scoped policies for farmer_listings
DROP POLICY IF EXISTS "insert_own_farmer_listings" ON farmer_listings;
CREATE POLICY "insert_own_farmer_listings" ON farmer_listings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_farmer_listings" ON farmer_listings;
CREATE POLICY "update_own_farmer_listings" ON farmer_listings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_farmer_listings" ON farmer_listings;
CREATE POLICY "delete_own_farmer_listings" ON farmer_listings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on signup via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_farmer ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON profiles(verification_status);
