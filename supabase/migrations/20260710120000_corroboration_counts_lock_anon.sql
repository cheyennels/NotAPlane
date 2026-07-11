-- Supabase's default privileges also grant EXECUTE on public functions to the
-- anon role, which `REVOKE ... FROM public` does not undo. Revoke it explicitly
-- so the corroboration count accessor is authenticated-only.
REVOKE EXECUTE ON FUNCTION public.corroboration_counts(uuid[]) FROM anon;
