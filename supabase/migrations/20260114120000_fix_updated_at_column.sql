-- Ensure updated_at column exists on user_deriv_tokens and has auto-update trigger
-- Addresses Supabase schema cache issue: "Could not find the 'updated_at' column"

BEGIN;

-- Ensure updated_at column exists (should be idempotent)
ALTER TABLE IF EXISTS user_deriv_tokens
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_deriv_tokens_updated_at ON user_deriv_tokens;

CREATE TRIGGER update_user_deriv_tokens_updated_at
    BEFORE UPDATE ON user_deriv_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Refresh schema cache hint (comment for documentation)
COMMENT ON COLUMN user_deriv_tokens.updated_at IS 'Auto-updated timestamp for token modifications';

-- Verify table structure
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_deriv_tokens' 
        AND column_name = 'updated_at'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE EXCEPTION 'updated_at column still not found after migration';
    END IF;
    
    RAISE NOTICE 'user_deriv_tokens.updated_at column verified';
END $$;

COMMIT;
