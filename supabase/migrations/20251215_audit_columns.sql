-- Migration to add audit columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_spot NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_spot NUMERIC;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS execution_latency_ms INTEGER;
