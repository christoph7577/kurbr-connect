-- Allow haulers to update status on their assigned jobs
CREATE POLICY "Haulers can update assigned jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (hauler_id IN (
  SELECT id FROM hauler_profiles WHERE user_id = auth.uid()
))
WITH CHECK (hauler_id IN (
  SELECT id FROM hauler_profiles WHERE user_id = auth.uid()
));