-- Migration to extend session_participants status check constraint
-- Add 'pending' and 'declined' to the allowed statuses

ALTER TABLE session_participants
DROP CONSTRAINT IF EXISTS session_participants_status_check;

ALTER TABLE session_participants
ADD CONSTRAINT session_participants_status_check 
CHECK (status IN ('pending', 'active', 'declined', 'removed', 'removed_tp', 'removed_sl', 'left', 'kicked', 'stopped'));

-- Create index for pending invitations lookup
CREATE INDEX IF NOT EXISTS idx_session_participants_user_status ON session_participants(user_id, status);
