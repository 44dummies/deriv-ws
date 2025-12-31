-- =============================================================================
-- FIX: Function Search Path Mutable (Linter: 0011)
-- Security Best Practice: Explicitly set search_path to prevent malicious overrides.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_memory_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp -- Explicitly set search_path
AS $$
BEGIN
    RAISE EXCEPTION 'Memories are immutable. Updates are not allowed.';
END;
$$;
