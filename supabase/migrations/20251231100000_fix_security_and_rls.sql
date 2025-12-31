-- =============================================================================
-- DATABASE SECURITY HARDENING MIGRATION
-- Fixes critical vulnerabilities reported by linter and audit.
-- =============================================================================

BEGIN;

-- 1. Fix Security Definer Views (Linter: 0010_security_definer_view)
-- Security Definer views execute with permissions of the owner.
-- Resetting them to Security Invoker ensures RLS is respected for the caller.
DO $$ 
BEGIN
    -- Check if views exist before altering
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_analytics_executed') THEN
        ALTER VIEW view_analytics_executed SET (security_invoker = true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_analytics_all') THEN
        ALTER VIEW view_analytics_all SET (security_invoker = true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'view_analytics_blocked') THEN
        ALTER VIEW view_analytics_blocked SET (security_invoker = true);
    END IF;
END $$;

-- 2. Fix RLS on Public Tables (Linter: 0013_rls_disabled_in_public)

-- A. price_history
-- Assume it exists; Enable RLS.
ALTER TABLE IF EXISTS price_history ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can INSERT (e.g. service role or logic)
CREATE POLICY "Enable insert for service role" ON price_history
    FOR INSERT TO service_role WITH CHECK (true);

-- Policy: Everyone can READ (ticker features)
CREATE POLICY "Enable select for all" ON price_history
    FOR SELECT USING (true);


-- B. threshold_versions
ALTER TABLE IF EXISTS threshold_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access
CREATE POLICY "Enable full access for service role" ON threshold_versions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: Authenticated users can READ (transparency)
CREATE POLICY "Enable select for authenticated" ON threshold_versions
    FOR SELECT TO authenticated USING (true);


-- C. shadow_signals
ALTER TABLE IF EXISTS shadow_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Service role full access (AI Service writes here)
CREATE POLICY "Enable full access for service role" ON shadow_signals
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy: Admin read access
CREATE POLICY "Enable select for admins" ON shadow_signals
    FOR SELECT TO authenticated 
    USING (auth.jwt() ->> 'role' = 'ADMIN');

-- 3. Fix Realtime for Sessions (Audit Finding)
ALTER TABLE IF EXISTS sessions REPLICA IDENTITY FULL;
-- Add to publication if not already present (idempotent-ish via DO block or just try)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;
EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'Could not add sessions to publication: %', SQLERRM;
END $$;

COMMIT;
