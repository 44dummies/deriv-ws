-- Create immutable memory table
CREATE TABLE IF NOT EXISTS trade_memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL,
  features JSONB NOT NULL,
  signal JSONB NOT NULL,
  ai_confidence FLOAT,
  regime TEXT,
  decision TEXT CHECK (decision IN ('EXECUTED','BLOCKED')),
  result TEXT CHECK (result IN ('WIN','LOSS','NO_TRADE')),
  pnl FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_memory_market ON trade_memory_events(market);
CREATE INDEX IF NOT EXISTS idx_memory_timestamp ON trade_memory_events(created_at);
CREATE INDEX IF NOT EXISTS idx_memory_regime_result ON trade_memory_events(regime, result);

-- Enable RLS
ALTER TABLE trade_memory_events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow Service Role to INSERT.
-- NOTE: We explicitly DO NOT create policies for UPDATE or DELETE, effectively prohibiting them for everyone (except postgres superuser).
-- Even service_role can be restricted if we want, but usually service_role bypasses RLS. To strictly enforce, we can use a Trigger.
-- However, for this task, standard RLS "Allow Insert" and omitting "Allow Update" is sufficient for the application layer.

CREATE POLICY "Enable insert for service role only" ON trade_memory_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Enable read for service role only" ON trade_memory_events
FOR SELECT
TO service_role
USING (true);

-- Explicitly NO policies for UPDATE/DELETE.

-- Trigger to Prevent Updates (Hard Enforcement)
CREATE OR REPLACE FUNCTION prevent_memory_updates()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Updates are not allowed on trade_memory_events. This table is immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_memory_update
BEFORE UPDATE OR DELETE ON trade_memory_events
FOR EACH ROW
EXECUTE FUNCTION prevent_memory_updates();
