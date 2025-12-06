-- Verify is_admin column exists and set admin user
-- Run this in Supabase SQL Editor

-- 1. Check if is_admin column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'is_admin';

-- 2. If not exists, add it
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

-- 3. Set your account as admin
UPDATE user_profiles 
SET is_admin = true 
WHERE deriv_id = 'CR6550175';

-- 4. Verify the change
SELECT 
  deriv_id, 
  username,
  fullname, 
  is_admin,
  created_at
FROM user_profiles 
WHERE deriv_id = 'CR6550175';

-- 5. List all admins
SELECT 
  deriv_id, 
  username,
  is_admin
FROM user_profiles 
WHERE is_admin = true;
