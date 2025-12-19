-- Add refresh_token column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS refresh_token TEXT;
