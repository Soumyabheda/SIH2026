/*
# Add user_id to price_alerts for per-user alerts

## Overview
The price_alerts table previously used phone_number as the identifier with anon-level
public policies. Now that the app has authentication, we add a user_id column so alerts
are scoped to the signed-in user. The old phone_number column remains for backward
compatibility but is now nullable.

## Changes
1. **price_alerts table**
   - Added `user_id uuid` column (nullable, defaults to auth.uid())
   - Added foreign key constraint to auth.users
   - Made `phone_number` nullable (was NOT NULL) since authenticated users may not need to provide a phone
   - Added `alert_type` support for 'three_month_low' type
   - Added index on user_id for efficient per-user queries

2. **Security (RLS)**
   - Replaced public anon policies with authenticated-only ownership policies
   - Users can only SELECT, INSERT, UPDATE, DELETE their own alerts
   - Uses auth.uid() = user_id for ownership checks
*/

-- Add user_id column with default
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'price_alerts_user_id_fkey' AND table_name = 'price_alerts'
  ) THEN
    ALTER TABLE price_alerts
    ADD CONSTRAINT price_alerts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Make phone_number nullable (was NOT NULL, now optional for authenticated users)
ALTER TABLE price_alerts ALTER COLUMN phone_number DROP NOT NULL;

-- Add index for per-user queries
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_crop_user ON price_alerts(crop_id, user_id);

-- Replace policies: remove old anon-level policies
DROP POLICY IF EXISTS "public_read_price_alerts" ON price_alerts;
DROP POLICY IF EXISTS "anon_insert_price_alerts" ON price_alerts;
DROP POLICY IF EXISTS "anon_delete_price_alerts" ON price_alerts;

-- New authenticated-only ownership policies
DROP POLICY IF EXISTS "select_own_price_alerts" ON price_alerts;
CREATE POLICY "select_own_price_alerts" ON price_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_price_alerts" ON price_alerts;
CREATE POLICY "insert_own_price_alerts" ON price_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_price_alerts" ON price_alerts;
CREATE POLICY "update_own_price_alerts" ON price_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_price_alerts" ON price_alerts;
CREATE POLICY "delete_own_price_alerts" ON price_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
