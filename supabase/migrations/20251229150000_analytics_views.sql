-- Analytics Views for Phase 10
-- Transforms JSONB log data into structured feature sets

-- 1. Base View: All Signals (Normalized)
CREATE OR REPLACE VIEW view_analytics_all AS
SELECT
    id,
    market,
    created_at,
    decision,   -- 'EXECUTED' | 'BLOCKED'
    result,     -- 'WIN' | 'LOSS' | 'NO_TRADE'
    pnl,
    
    -- Extracted Signal Metadata
    (signal->>'confidence')::numeric as ai_confidence,
    (signal->>'type')::text as direction,
    (signal->>'strength')::numeric as signal_strength,
    
    -- Extracted Features (Technicals)
    (features->>'rsi')::numeric as feat_rsi,
    (features->>'adx')::numeric as feat_adx,
    (features->>'ema_fast')::numeric as feat_ema_fast,
    (features->>'ema_slow')::numeric as feat_ema_slow,
    (features->>'volatility')::numeric as feat_volatility,
    
    -- Derived Columns
    CASE 
        WHEN pnl > 0 THEN 1 
        ELSE 0 
    END as is_profit,
    
    (signal->'metadata'->>'feature_version')::text as feature_version

FROM trade_memory_events;

-- 2. Executed Trades (For Performance Analysis)
CREATE OR REPLACE VIEW view_analytics_executed AS
SELECT * 
FROM view_analytics_all
WHERE decision = 'EXECUTED';

-- 3. Blocked Signals (For Opportunity Analysis)
CREATE OR REPLACE VIEW view_analytics_blocked AS
SELECT * 
FROM view_analytics_all
WHERE decision = 'BLOCKED';
