-- Store account metadata for Deriv accounts
ALTER TABLE IF EXISTS user_deriv_tokens
    ADD COLUMN IF NOT EXISTS currency TEXT,
    ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN,
    ADD COLUMN IF NOT EXISTS fullname TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS last_balance NUMERIC(12,2);
