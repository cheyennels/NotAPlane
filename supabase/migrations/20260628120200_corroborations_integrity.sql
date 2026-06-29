-- Integrity fixes (security review LOW): a user could corroborate the same
-- sighting multiple times (no unique constraint), and deleting a sighting left
-- orphaned corroborations. Add a uniqueness constraint and a cascading FK.

-- Remove any pre-existing duplicate corroborations, keeping one per (sighting,user).
DELETE FROM public.corroborations a
USING public.corroborations b
WHERE a.ctid < b.ctid
  AND a.sighting_id = b.sighting_id
  AND a.user_id = b.user_id;

-- Remove corroborations pointing at sightings that no longer exist, so the FK
-- below can be added cleanly.
DELETE FROM public.corroborations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.sightings s WHERE s.id = c.sighting_id
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'corroborations_sighting_user_unique'
  ) THEN
    ALTER TABLE public.corroborations
      ADD CONSTRAINT corroborations_sighting_user_unique
      UNIQUE (sighting_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.corroborations'::regclass
      AND contype = 'f'
      AND confrelid = 'public.sightings'::regclass
  ) THEN
    ALTER TABLE public.corroborations
      ADD CONSTRAINT corroborations_sighting_id_fkey
      FOREIGN KEY (sighting_id) REFERENCES public.sightings (id) ON DELETE CASCADE;
  END IF;
END $$;
