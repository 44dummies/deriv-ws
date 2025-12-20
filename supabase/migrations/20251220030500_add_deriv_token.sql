-- Add deriv_token column to session_participants for trade execution
ALTER TABLE session_participants ADD COLUMN IF NOT EXISTS deriv_token TEXT;
