-- Trading System Database Migration
-- Run this migration to add tables for multi-account automated trading

-- ==================== Trading Accounts Table ====================
-- Stores connected Deriv trading accounts
CREATE TABLE IF NOT EXISTS trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR(255) NOT NULL REFERENCES user_profiles(deriv_id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL UNIQUE,
    deriv_token TEXT NOT NULL,
    account_type VARCHAR(20) DEFAULT 'real' CHECK (account_type IN ('real', 'demo')),
    currency VARCHAR(10) DEFAULT 'USD',
    balance DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'disabled')),
    last_connected TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_trading_accounts_admin ON trading_accounts(admin_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_status ON trading_accounts(status);

-- ==================== Trading Sessions Table ====================
-- Stores trading session configurations and state
CREATE TABLE IF NOT EXISTS trading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id VARCHAR(255) NOT NULL REFERENCES user_profiles(deriv_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) DEFAULT 'day' CHECK (type IN ('day', 'one_time', 'recovery')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'tp_reached', 'sl_reached', 'error')),
    
    -- Trading Configuration
    volatility_index VARCHAR(20) DEFAULT 'R_100',
    contract_type VARCHAR(20) DEFAULT 'DIGITEVEN',
    strategy VARCHAR(20) DEFAULT 'DFPM',
    staking_mode VARCHAR(20) DEFAULT 'fixed' CHECK (staking_mode IN ('fixed', 'martingale', 'compounding')),
    
    -- Stake Settings
    base_stake DECIMAL(15, 4) DEFAULT 1.0,
    target_profit DECIMAL(15, 2) DEFAULT 10.0,
    stop_loss DECIMAL(15, 2) DEFAULT 5.0,
    
    -- Session Statistics
    current_pnl DECIMAL(15, 4) DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    loss_count INTEGER DEFAULT 0,
    
    -- Additional Settings (JSON)
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_trading_sessions_admin ON trading_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_status ON trading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_type ON trading_sessions(type);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_created ON trading_sessions(created_at DESC);

-- ==================== Session Invitations Table ====================
-- Tracks account invitations to trading sessions
CREATE TABLE IF NOT EXISTS session_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES trading_sessions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
    admin_id VARCHAR(255) NOT NULL REFERENCES user_profiles(deriv_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one invitation per account per session
    CONSTRAINT unique_session_account UNIQUE (session_id, account_id)
);

-- Indexes for invitation queries
CREATE INDEX IF NOT EXISTS idx_session_invitations_session ON session_invitations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_invitations_account ON session_invitations(account_id);
CREATE INDEX IF NOT EXISTS idx_session_invitations_status ON session_invitations(status);
CREATE INDEX IF NOT EXISTS idx_session_invitations_expires ON session_invitations(expires_at);

-- ==================== Trades Table ====================
-- Records all executed trades
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES trading_sessions(id) ON DELETE SET NULL,
    account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
    
    -- Contract Details
    contract_id VARCHAR(50),
    contract_type VARCHAR(20) NOT NULL,
    volatility_index VARCHAR(20) NOT NULL,
    strategy VARCHAR(20),
    
    -- Trade Details
    stake DECIMAL(15, 4) NOT NULL,
    payout DECIMAL(15, 4),
    profit DECIMAL(15, 4),
    
    -- Tick Information
    entry_tick DECIMAL(20, 6),
    exit_tick DECIMAL(20, 6),
    prediction INTEGER,
    
    -- Result
    result VARCHAR(20) DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trade queries
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_result ON trades(result);
CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_contract ON trades(contract_id);

-- ==================== Recovery States Table ====================
-- Stores recovery state for martingale and recovery sessions
CREATE TABLE IF NOT EXISTS recovery_states (
    session_id UUID PRIMARY KEY REFERENCES trading_sessions(id) ON DELETE CASCADE,
    martingale_step INTEGER DEFAULT 0,
    consecutive_losses INTEGER DEFAULT 0,
    last_trade_result VARCHAR(20),
    accumulated_loss DECIMAL(15, 4) DEFAULT 0,
    recovery_target DECIMAL(15, 4) DEFAULT 0,
    state_data JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Activity Logs Table ====================
-- Stores trading system activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON activity_logs(type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- ==================== Digit History Table ====================
-- Stores digit history for analysis (optional, for detailed analytics)
CREATE TABLE IF NOT EXISTS digit_history (
    id BIGSERIAL PRIMARY KEY,
    volatility_index VARCHAR(20) NOT NULL,
    epoch BIGINT NOT NULL,
    quote DECIMAL(20, 6) NOT NULL,
    digit SMALLINT NOT NULL CHECK (digit >= 0 AND digit <= 9),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for digit analysis
CREATE INDEX IF NOT EXISTS idx_digit_history_index ON digit_history(volatility_index);
CREATE INDEX IF NOT EXISTS idx_digit_history_epoch ON digit_history(epoch DESC);
CREATE INDEX IF NOT EXISTS idx_digit_history_index_epoch ON digit_history(volatility_index, epoch DESC);

-- ==================== Functions ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_trading_accounts_updated_at ON trading_accounts;
CREATE TRIGGER update_trading_accounts_updated_at
    BEFORE UPDATE ON trading_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trading_sessions_updated_at ON trading_sessions;
CREATE TRIGGER update_trading_sessions_updated_at
    BEFORE UPDATE ON trading_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at
    BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recovery_states_updated_at ON recovery_states;
CREATE TRIGGER update_recovery_states_updated_at
    BEFORE UPDATE ON recovery_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE session_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- ==================== Row Level Security (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_accounts
CREATE POLICY "Users can view own accounts"
    ON trading_accounts FOR SELECT
    USING (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own accounts"
    ON trading_accounts FOR INSERT
    WITH CHECK (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own accounts"
    ON trading_accounts FOR UPDATE
    USING (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own accounts"
    ON trading_accounts FOR DELETE
    USING (admin_id = current_setting('app.current_user_id', true));

-- RLS Policies for trading_sessions
CREATE POLICY "Users can view own sessions"
    ON trading_sessions FOR SELECT
    USING (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own sessions"
    ON trading_sessions FOR INSERT
    WITH CHECK (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own sessions"
    ON trading_sessions FOR UPDATE
    USING (admin_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own sessions"
    ON trading_sessions FOR DELETE
    USING (admin_id = current_setting('app.current_user_id', true));

-- RLS Policies for session_invitations
CREATE POLICY "Admins can manage invitations for their sessions"
    ON session_invitations FOR ALL
    USING (admin_id = current_setting('app.current_user_id', true));

-- RLS Policies for trades (less restrictive for analytics)
CREATE POLICY "Users can view trades from their sessions"
    ON trades FOR SELECT
    USING (
        session_id IN (
            SELECT id FROM trading_sessions
            WHERE admin_id = current_setting('app.current_user_id', true)
        )
    );

-- RLS Policies for activity_logs (admin only)
CREATE POLICY "All users can view activity logs"
    ON activity_logs FOR SELECT
    USING (true);

CREATE POLICY "All users can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);

-- ==================== Comments ====================
COMMENT ON TABLE trading_accounts IS 'Stores connected Deriv trading accounts for automated trading';
COMMENT ON TABLE trading_sessions IS 'Trading session configurations including strategy, TP/SL, and staking settings';
COMMENT ON TABLE session_invitations IS 'Tracks invitations for accounts to join trading sessions (5-min expiry)';
COMMENT ON TABLE trades IS 'Complete trade history with entry/exit ticks and P&L';
COMMENT ON TABLE recovery_states IS 'Martingale and recovery session state for persistence across restarts';
COMMENT ON TABLE activity_logs IS 'System activity logs for monitoring and debugging';
COMMENT ON TABLE digit_history IS 'Historical digit data for advanced strategy analysis';

-- ==================== Verification ====================
-- Uncomment to verify tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
--     'trading_accounts', 'trading_sessions', 'session_invitations', 'trades', 'recovery_states', 'activity_logs', 'digit_history'
-- );
