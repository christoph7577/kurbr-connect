
-- Hauler status enum
CREATE TYPE public.hauler_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Hauler profiles
CREATE TABLE public.hauler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT,
  license_number TEXT,
  vehicle_type TEXT,
  vehicle_plate TEXT,
  insurance_policy TEXT,
  service_areas TEXT[],
  status hauler_status NOT NULL DEFAULT 'pending',
  background_check_consent BOOLEAN DEFAULT false,
  background_check_date TIMESTAMPTZ,
  training_completed BOOLEAN DEFAULT false,
  training_completed_date TIMESTAMPTZ,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.hauler_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Haulers can view own profile" ON public.hauler_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Haulers can update own profile" ON public.hauler_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Haulers can insert own profile" ON public.hauler_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Job status enum
CREATE TYPE public.job_status AS ENUM ('pending', 'confirmed', 'dispatched', 'en_route', 'arrived', 'completed', 'cancelled');

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id),
  hauler_id UUID REFERENCES public.hauler_profiles(id),
  service_type TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  photos TEXT[],
  scheduled_date DATE,
  scheduled_time TEXT,
  status job_status NOT NULL DEFAULT 'pending',
  price_cents INTEGER,
  eta TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own jobs" ON public.jobs FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);
CREATE POLICY "Haulers can view assigned jobs" ON public.jobs FOR SELECT USING (
  hauler_id IN (SELECT id FROM public.hauler_profiles WHERE user_id = auth.uid())
);

-- Payments table
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  hauler_payout_cents INTEGER NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (
  job_id IN (SELECT id FROM public.jobs WHERE customer_id = auth.uid())
);

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for jobs
CREATE POLICY "Admins can view all jobs" ON public.jobs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all jobs" ON public.jobs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for hauler_profiles
CREATE POLICY "Admins can view all haulers" ON public.hauler_profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all haulers" ON public.hauler_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Generate job number function
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  WHEN (NEW.job_number IS NULL OR NEW.job_number = '')
  EXECUTE FUNCTION public.generate_job_number();
