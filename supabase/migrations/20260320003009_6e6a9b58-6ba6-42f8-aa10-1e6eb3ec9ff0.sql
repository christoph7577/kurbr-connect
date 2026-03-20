-- Allow anonymous users to insert jobs (public booking flow)
CREATE POLICY "Anyone can insert jobs"
ON public.jobs
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anyone to view a job by job_number (for tracking page)
CREATE POLICY "Anyone can view jobs by job_number"
ON public.jobs
FOR SELECT
TO anon
USING (true);

-- Enable realtime for jobs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;