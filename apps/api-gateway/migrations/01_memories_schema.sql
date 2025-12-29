-- Phase 8: Data Capture & Memory Foundation
-- Table: memories
-- Purpose: Immutable record of every decision cycle for AI learning.

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- Logical link, cascading delete might not be desired for history, but for hygiene yes.
    user_id UUID, -- Nullable for session-global signals
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    market TEXT NOT NULL,
    
    -- 1. INPUT STATE
    technicals JSONB NOT NULL,
    
    -- 2. AI PREDICTION
    ai_inference JSONB, -- Nullable
    
    -- 3. DECISION
    signal JSONB NOT NULL,
    risk_check JSONB NOT NULL,
    
    -- 4. OUTCOME
    trade_id TEXT,
    outcome JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_session_id ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_market ON memories(market);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);

-- RLS Policies
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: Backend (Service Role) can insert/update
CREATE POLICY "Service Role can full access memories"
ON memories
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated Admins can read (if needed)
-- Assuming 'admins' table or claim exists. For now, strict isolation.

-- Policy: Users can read their own memories?
-- Maybe later for "My Trading History".
CREATE POLICY "Users can view own memories"
ON memories
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- COMMENT
COMMENT ON TABLE memories IS 'Immutable decision logs for AI training.';
