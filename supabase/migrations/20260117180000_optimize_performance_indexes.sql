-- Database Performance Optimization
-- Adds missing indexes for high-frequency dashboard queries

-- 1. Accelerate "My Sessions" lookup for Admins
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);

-- 2. Accelerate "Joined Sessions" lookup for Users
CREATE INDEX IF NOT EXISTS idx_participants_user ON participants(user_id);

-- 3. Maintenance statistics update
ANALYZE sessions;
ANALYZE participants;
ANALYZE trades;
