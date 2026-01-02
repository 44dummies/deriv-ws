-- Create trades table for tracking active and historical trades
-- This is separate from trade_memory_events which is an immutable AI analysis log

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Trade Details
    market TEXT NOT NULL,
    contract_type TEXT NOT NULL,  -- 'CALL' | 'PUT'
    stake DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    
    -- Deriv Contract Info
    contract_id TEXT,
    deriv_transaction_id TEXT,
    entry_price DECIMAL(12,4),
    exit_price DECIMAL(12,4),
    
    -- Execution Status
    status TEXT NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'OPEN', 'WON', 'LOST', 'CANCELLED', 'FAILED')),
    
    -- Financial Results
    pnl DECIMAL(12,2) DEFAULT 0,
    payout DECIMAL(12,2),
    
    -- Metadata
    metadata_json JSONB DEFAULT '{}'::jsonb,
    risk_confidence DECIMAL(4,3),
    signal_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own trades
CREATE POLICY "Users can view own trades" ON trades
    FOR SELECT
    USING (auth.uid()::text = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Service role can insert trades (from ExecutionCore)
CREATE POLICY "Service role can insert trades" ON trades
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Service role can update trades (for settlement)
CREATE POLICY "Service role can update trades" ON trades
    FOR UPDATE
    TO service_role
    USING (true);

-- Create user_deriv_tokens table if not exists (for secure token storage)
CREATE TABLE IF NOT EXISTS user_deriv_tokens (
    user_id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    encrypted_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on tokens table
ALTER TABLE user_deriv_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access tokens (for ExecutionCore)
CREATE POLICY "Service role only for tokens" ON user_deriv_tokens
    FOR ALL
    TO service_role
    USING (true);

-- Create signals table for persisting generated signals
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
    market TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('CALL', 'PUT')),
    confidence DECIMAL(4,3) NOT NULL,
    reason TEXT,
    
    -- AI inference data
    ai_confidence DECIMAL(4,3),
    regime TEXT,
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED')),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- Indexes for signals
CREATE INDEX IF NOT EXISTS idx_signals_session ON signals(session_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_created ON signals(created_at DESC);

-- Enable RLS
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

-- Signal policies
CREATE POLICY "Enable read for authenticated" ON signals
    FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can insert signals" ON signals
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update signals" ON signals
    FOR UPDATE
    TO service_role
    USING (true);

-- Comment
COMMENT ON TABLE trades IS 'Tracks all executed trades with their status and results';
COMMENT ON TABLE user_deriv_tokens IS 'Securely stores encrypted Deriv API tokens per user';
COMMENT ON TABLE signals IS 'Stores generated trading signals for audit and analysis';
