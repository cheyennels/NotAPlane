-- Sightings are a shared community map: any signed-in user can read all reports,
-- but may only create/update/delete their own.

ALTER TABLE sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can read own sightings" ON sightings;
DROP POLICY IF EXISTS "Users can select own sightings" ON sightings;
DROP POLICY IF EXISTS "sightings_select_own" ON sightings;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON sightings;

DROP POLICY IF EXISTS "sightings_select_authenticated" ON sightings;
CREATE POLICY "sightings_select_authenticated"
ON sightings FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "sightings_insert_own" ON sightings;
CREATE POLICY "sightings_insert_own"
ON sightings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sightings_update_own" ON sightings;
CREATE POLICY "sightings_update_own"
ON sightings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sightings_delete_own" ON sightings;
CREATE POLICY "sightings_delete_own"
ON sightings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Corroborations: readable for counts; users add/remove only their own.

ALTER TABLE corroborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own corroborations" ON corroborations;
DROP POLICY IF EXISTS "Users can read own corroborations" ON corroborations;
DROP POLICY IF EXISTS "corroborations_select_own" ON corroborations;

DROP POLICY IF EXISTS "corroborations_select_authenticated" ON corroborations;
CREATE POLICY "corroborations_select_authenticated"
ON corroborations FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "corroborations_insert_own" ON corroborations;
CREATE POLICY "corroborations_insert_own"
ON corroborations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "corroborations_delete_own" ON corroborations;
CREATE POLICY "corroborations_delete_own"
ON corroborations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
