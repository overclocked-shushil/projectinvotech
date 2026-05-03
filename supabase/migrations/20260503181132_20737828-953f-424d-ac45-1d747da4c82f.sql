
-- Roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'distributor', 'customer');

-- Users table (custom auth, not auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ration_id TEXT UNIQUE NOT NULL,
  role public.user_role NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ration_id_format CHECK (ration_id ~ '^[A-Z]{4}[0-9]{6}$')
);
CREATE INDEX idx_users_role ON public.users(role);

-- OTP codes
CREATE TABLE public.otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ration_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otps_ration ON public.otps(ration_id, used);

-- Sessions
CREATE TABLE public.sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON public.sessions(user_id);

-- Families
CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dob DATE,
  relation TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ration collections (transactions)
CREATE TABLE public.ration_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  date_received TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'Completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_collections_customer ON public.ration_collections(customer_id);
CREATE INDEX idx_collections_distributor ON public.ration_collections(distributor_id);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  branch TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS — all access is via server functions using service role key
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ration_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- No policies = no anon/auth access. Service role bypasses RLS.

-- Seed the single admin
INSERT INTO public.users (ration_id, role, name, phone)
VALUES ('ADMN000001', 'admin', 'System Admin', NULL);
