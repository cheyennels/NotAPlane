-- Corroborations should expose only a COUNT, never who corroborated. The old
-- SELECT policy was USING (true), so any authenticated user could read the whole
-- table (including user_id) — a privacy leak. Lock reads to own rows (keeps the
-- "have I corroborated this?" toggle working) and serve totals via a
-- SECURITY DEFINER function that returns counts only, no identities.

DROP POLICY IF EXISTS "corroborations_select_authenticated" ON public.corroborations;
DROP POLICY IF EXISTS "corroborations_select_own" ON public.corroborations;
CREATE POLICY "corroborations_select_own"
ON public.corroborations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Aggregate-only accessor. SECURITY DEFINER so it can count everyone's
-- corroborations, but it returns just (sighting_id, total, recent) — no user_id.
CREATE OR REPLACE FUNCTION public.corroboration_counts(sighting_ids uuid[])
RETURNS TABLE (sighting_id uuid, total bigint, recent bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.sighting_id,
    count(*)::bigint AS total,
    count(*) FILTER (
      WHERE c.created_at >= now() - interval '7 days'
    )::bigint AS recent
  FROM public.corroborations c
  WHERE c.sighting_id = ANY(sighting_ids)
  GROUP BY c.sighting_id;
$$;

REVOKE ALL ON FUNCTION public.corroboration_counts(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.corroboration_counts(uuid[]) TO authenticated;
