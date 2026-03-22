-- Remove temporary overly-permissive anon policies now that auth is in place
DROP POLICY IF EXISTS "Anon can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON public.jobs;