-- Privacy fix (security review HIGH): previously any signed-in user could read
-- EVERY sighting's exact GPS coordinates and user_id via the base table — a
-- stalking / de-anonymization risk. We:
--   1. Restrict direct reads of the `sightings` table to the row's owner.
--   2. Expose the community feed/map through a `community_sightings` view that
--      rounds coordinates to ~1km and omits user_id.
-- The owner and the analysis engine keep precise coordinates via the base table.

-- 1. Owner-only direct reads.
DROP POLICY IF EXISTS "sightings_select_authenticated" ON sightings;
DROP POLICY IF EXISTS "sightings_select_own" ON sightings;
CREATE POLICY "sightings_select_own"
ON sightings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Community view. This view is owned by the migration role and intentionally
-- runs with definer privileges (security_invoker = off) so authenticated users
-- can read all rows — but ONLY the non-sensitive, coarsened columns selected
-- here. It deliberately omits user_id and exact latitude/longitude.
DROP VIEW IF EXISTS public.community_sightings;
CREATE VIEW public.community_sightings
WITH (security_invoker = off) AS
SELECT
  id,
  round(latitude::numeric, 2) AS latitude,
  round(longitude::numeric, 2) AS longitude,
  status,
  created_at,
  sighted_at,
  duration,
  description,
  shape,
  colors,
  sound,
  direction,
  altitude,
  movement,
  speed,
  photo_urls,
  matched_flight,
  matched_celestial,
  matched_satellite
FROM sightings;

REVOKE ALL ON public.community_sightings FROM anon;
GRANT SELECT ON public.community_sightings TO authenticated;
