-- =============================================================================
-- RLS SECURITY HARDENING MIGRATION
-- Fixes overly permissive policies identified in security audit
-- Date: January 4, 2026
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. FIX SESSIONS TABLE RLS (Critical - was USING (true))
-- =============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Enable update for service role or admin" ON sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON sessions;

-- New secure policies for sessions
-- Read: Users can see sessions they participate in or are admin of
CREATE POLICY "sessions_select_policy" ON sessions
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = admin_id
        OR EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.session_id = sessions.id 
            AND participants.user_id = auth.uid()::text
        )
    );

-- Insert: Only service role or authenticated users can create
CREATE POLICY "sessions_insert_policy" ON sessions
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR (auth.role() = 'authenticated' AND auth.uid()::text = admin_id)
    );

-- Update: Only service role or session admin can update
CREATE POLICY "sessions_update_policy" ON sessions
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = admin_id
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR auth.uid()::text = admin_id
    );

-- Delete: Only service role can delete
CREATE POLICY "sessions_delete_policy" ON sessions
    FOR DELETE
    USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. FIX PARTICIPANTS TABLE RLS
-- =============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON participants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON participants;
DROP POLICY IF EXISTS "Enable update for participants" ON participants;

-- New secure policies for participants
-- Read: Users can see their own participation or if they're session admin
CREATE POLICY "participants_select_policy" ON participants
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
        OR EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = participants.session_id 
            AND sessions.admin_id = auth.uid()::text
        )
    );

-- Insert: Service role or user joining themselves
CREATE POLICY "participants_insert_policy" ON participants
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
    );

-- Update: Service role or the participant themselves
CREATE POLICY "participants_update_policy" ON participants
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
    );

-- Delete: Service role or user leaving themselves
CREATE POLICY "participants_delete_policy" ON participants
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
    );

-- =============================================================================
-- 3. ENSURE TRADES TABLE IS PROPERLY LOCKED
-- =============================================================================

-- Verify trades RLS is enabled
ALTER TABLE IF EXISTS trades ENABLE ROW LEVEL SECURITY;

-- Drop any overly permissive policies if they exist
DROP POLICY IF EXISTS "trades_public_read" ON trades;

-- Ensure users can only read their own trades
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
CREATE POLICY "trades_select_policy" ON trades
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR auth.uid()::text = user_id
    );

-- =============================================================================
-- 4. ENSURE USER_DERIV_TOKENS IS SERVICE-ROLE ONLY
-- =============================================================================

-- This should already be correct but verify
ALTER TABLE IF EXISTS user_deriv_tokens ENABLE ROW LEVEL SECURITY;

-- Ensure only service role can access tokens
DROP POLICY IF EXISTS "Service role only for tokens" ON user_deriv_tokens;
CREATE POLICY "tokens_service_role_only" ON user_deriv_tokens
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 5. AUDIT LOG TABLE (New - for security tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can write, admins can read
CREATE POLICY "audit_log_insert" ON security_audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "audit_log_select" ON security_audit_log
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR (auth.jwt() ->> 'role') = 'ADMIN'
    );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON security_audit_log(event_type);

COMMENT ON TABLE security_audit_log IS 'Immutable audit trail for security-relevant events';

COMMIT;
