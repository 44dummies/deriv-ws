-- =============================================
-- QUICK ADMIN SETUP
-- Copy and paste this entire script into Supabase SQL Editor
-- =============================================

-- Step 1: Add is_admin column (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added is_admin column';
  ELSE
    RAISE NOTICE 'is_admin column already exists';
  END IF;
END $$;

-- Step 2: Set yourself as admin (CHANGE CR6550175 to your actual Deriv ID if different)
UPDATE user_profiles 
SET is_admin = true 
WHERE deriv_id = 'CR6550175';

-- Step 3: Verify admin status
SELECT 
  deriv_id, 
  username,
  fullname, 
  email, 
  is_admin,
  created_at
FROM user_profiles 
WHERE deriv_id = 'CR6550175';

-- =============================================
-- VERIFICATION QUERIES
-- Run these after the main migration
-- =============================================

-- Check all trading tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'trading_%'
ORDER BY table_name;

-- Check RLS policies are enabled
SELECT 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'trading_%'
ORDER BY tablename, policyname;

-- =============================================
-- AFTER RUNNING THIS:
-- 1. Go to Supabase SQL Editor
-- 2. Open clean_trading_migration.sql (all 369 lines)
-- 3. Run it to create all 8 trading tables
-- 4. Then run this script to enable admin access
-- 5. Logout and login to refresh your session
-- 6. Click Trading tab (⚡) or press Ctrl+R
-- =============================================
