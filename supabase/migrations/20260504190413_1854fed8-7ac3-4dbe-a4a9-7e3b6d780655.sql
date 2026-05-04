CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON public.users (phone) WHERE phone IS NOT NULL;
-- complaints.status already exists with default 'Open'; ensure it
ALTER TABLE public.complaints ALTER COLUMN status SET DEFAULT 'Open';