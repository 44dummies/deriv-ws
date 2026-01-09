-- Create users table if not exists (for admin user management)
-- This table is separate from auth.users and tracks application-level user data

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    fullname TEXT,
    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    active_account_id TEXT, -- Current active Deriv account ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT
    USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can read all users" ON public.users
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Service role full access" ON public.users
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Comments
COMMENT ON TABLE public.users IS 'Application-level user data and preferences';
COMMENT ON COLUMN public.users.active_account_id IS 'Currently active Deriv account loginid';
