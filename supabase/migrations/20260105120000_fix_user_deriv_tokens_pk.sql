-- Allow multiple Deriv accounts per user
ALTER TABLE IF EXISTS user_deriv_tokens
    DROP CONSTRAINT IF EXISTS user_deriv_tokens_pkey;

ALTER TABLE IF EXISTS user_deriv_tokens
    ADD CONSTRAINT user_deriv_tokens_pkey PRIMARY KEY (user_id, account_id);

CREATE INDEX IF NOT EXISTS idx_user_deriv_tokens_user_id ON user_deriv_tokens(user_id);
