-- Allow anyone (anon or authenticated) to insert jobs for public booking
CREATE POLICY "Anyone can book jobs"
ON public.jobs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);