-- Store the geocoded coordinates of a user's account location so the map can
-- open centered on it. Populated from the free-text `location` at save time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
