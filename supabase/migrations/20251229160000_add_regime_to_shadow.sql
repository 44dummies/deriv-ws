
-- Add regime column to shadow_signals
ALTER TABLE shadow_signals
ADD COLUMN regime TEXT;

CREATE INDEX idx_shadow_regime ON shadow_signals(regime);
