-- Allow anon to update jobs (temporary until auth is implemented)
CREATE POLICY "Anon can update jobs"
ON public.jobs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);