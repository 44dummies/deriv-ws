-- Add idempotency key to trades table for retry safety
-- This prevents duplicate trade execution when requests are retried

ALTER TABLE trades ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique constraint ensures no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_idempotency 
ON trades(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Comment
COMMENT ON COLUMN trades.idempotency_key IS 'Unique key to prevent duplicate trades on retry';
