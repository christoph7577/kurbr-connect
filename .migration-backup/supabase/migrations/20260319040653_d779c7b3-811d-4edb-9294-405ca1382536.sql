
-- Fix 1: Set search_path on generate_job_number function
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 5) AS INTEGER)), 2846) + 1
  INTO next_num
  FROM public.jobs;
  NEW.job_number := 'JOB-' || next_num;
  RETURN NEW;
END;
$$;

-- Fix 2: Replace permissive INSERT policy on jobs
DROP POLICY "Customers can insert jobs" ON public.jobs;
CREATE POLICY "Authenticated users can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (true);
