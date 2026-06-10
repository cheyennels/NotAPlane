ALTER TABLE sightings
ADD COLUMN IF NOT EXISTS matched_satellite text;
