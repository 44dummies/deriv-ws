
-- Create shadow_signals table for A/B testing
CREATE TABLE IF NOT EXISTS shadow_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    session_id TEXT NOT NULL,
    market TEXT NOT NULL,
    model_id TEXT NOT NULL,
    signal_bias TEXT NOT NULL, -- CALL, PUT, NEUTRAL
    confidence NUMERIC NOT NULL,
    input_hash TEXT NOT NULL,
    metadata JSONB, -- Store full AI response/reasoning
    
    -- Indexes for fast joining
    CONSTRAINT shadow_signals_uniq UNIQUE (model_id, input_hash) 
    -- Assumption: One signal per model per input state.
);

CREATE INDEX idx_shadow_input_hash ON shadow_signals(input_hash);
CREATE INDEX idx_shadow_model_id ON shadow_signals(model_id);
