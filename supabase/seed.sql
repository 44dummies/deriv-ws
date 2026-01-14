-- ============================================================================
-- TraderMind Database Seed File
-- ============================================================================
-- This file seeds initial data for development and testing
-- Run with: supabase db reset (includes migrations + seed)
--          or: psql -f seed.sql

-- Ensure we're in the public schema
SET search_path TO public;

-- ============================================================================
-- SEED: Demo Users (for local development only)
-- ============================================================================
-- NOTE: In production, users are created via Supabase Auth (OAuth/Email)
-- These are test users with known IDs for development

-- Insert demo user profiles (links to auth.users)
-- Supabase Auth users must be created via signup or admin API
-- This just ensures the users table has corresponding entries

-- Example: If you have test auth users with these IDs, link them
-- Otherwise, create via Supabase Dashboard or Auth API first

-- Cleanup existing demo data if re-running
DELETE FROM trades WHERE user_id LIKE 'demo-%';
DELETE FROM participants WHERE user_id LIKE 'demo-%';
DELETE FROM sessions WHERE id LIKE 'demo-%';
DELETE FROM user_deriv_tokens WHERE user_id LIKE 'demo-%';
DELETE FROM users WHERE id LIKE 'demo-%';

-- ============================================================================
-- SEED: Demo Sessions (for testing session recovery)
-- ============================================================================

-- Insert a completed demo session
INSERT INTO sessions (id, status, config_json, admin_id, created_at, started_at, completed_at)
VALUES (
    'demo-session-001',
    'COMPLETED',
    '{"max_participants": 5, "risk_profile": "MEDIUM", "allowed_markets": ["R_100", "R_50"]}'::jsonb,
    NULL,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;

-- Insert a pending session (ready to start)
INSERT INTO sessions (id, status, config_json, admin_id, created_at, started_at, completed_at)
VALUES (
    'demo-session-002',
    'PENDING',
    '{"max_participants": 10, "risk_profile": "LOW", "allowed_markets": ["R_100"]}'::jsonb,
    NULL,
    NOW() - INTERVAL '30 minutes',
    NULL,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED: Threshold Versions (for backtesting)
-- ============================================================================

INSERT INTO threshold_versions (version_id, version_name, config, created_at, is_active)
VALUES (
    'v1.0-conservative',
    'Conservative Risk Profile',
    '{
        "rsi": {"oversold": 25, "overbought": 75},
        "volatility": {"spike_threshold": 0.8},
        "confidence": {"min_threshold": 0.75}
    }'::jsonb,
    NOW() - INTERVAL '7 days',
    false
),
(
    'v1.1-balanced',
    'Balanced Risk Profile (Default)',
    '{
        "rsi": {"oversold": 30, "overbought": 70},
        "volatility": {"spike_threshold": 0.7},
        "confidence": {"min_threshold": 0.65}
    }'::jsonb,
    NOW() - INTERVAL '3 days',
    true
),
(
    'v1.2-aggressive',
    'Aggressive Risk Profile',
    '{
        "rsi": {"oversold": 35, "overbought": 65},
        "volatility": {"spike_threshold": 0.6},
        "confidence": {"min_threshold": 0.55}
    }'::jsonb,
    NOW() - INTERVAL '1 day',
    false
)
ON CONFLICT (version_id) DO NOTHING;

-- ============================================================================
-- SEED: Analytics Materialized View Refresh
-- ============================================================================

-- Refresh materialized views if they exist
REFRESH MATERIALIZED VIEW IF EXISTS analytics_performance_summary;
REFRESH MATERIALIZED VIEW IF EXISTS analytics_risk_metrics;

-- ============================================================================
-- SEED: Shadow Signals (Example AI inference logs)
-- ============================================================================

-- Example shadow signals for testing attribution pipeline
-- These represent ML model predictions that were NOT executed (shadow mode)

INSERT INTO shadow_signals (session_id, market, model_id, signal_bias, confidence, regime, input_hash, metadata, created_at)
VALUES (
    'demo-session-001',
    'R_100',
    'rule_based_v1.0',
    'CALL',
    0.72,
    'TRENDING',
    'hash_' || md5(random()::text),
    '{"technicals": {"rsi": 28, "ema_fast": 102.3}, "reason": "RSI_OVERSOLD"}'::jsonb,
    NOW() - INTERVAL '1 hour'
),
(
    'demo-session-001',
    'R_50',
    'rule_based_v1.0',
    'PUT',
    0.68,
    'RANGING',
    'hash_' || md5(random()::text),
    '{"technicals": {"rsi": 72, "ema_fast": 98.1}, "reason": "RSI_OVERBOUGHT"}'::jsonb,
    NOW() - INTERVAL '50 minutes'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================

-- Verify seed data
DO $$
DECLARE
    session_count INT;
    threshold_count INT;
    shadow_count INT;
BEGIN
    SELECT COUNT(*) INTO session_count FROM sessions WHERE id LIKE 'demo-%';
    SELECT COUNT(*) INTO threshold_count FROM threshold_versions;
    SELECT COUNT(*) INTO shadow_count FROM shadow_signals;
    
    RAISE NOTICE 'Seed complete:';
    RAISE NOTICE '  - Demo sessions: %', session_count;
    RAISE NOTICE '  - Threshold versions: %', threshold_count;
    RAISE NOTICE '  - Shadow signals: %', shadow_count;
END $$;
