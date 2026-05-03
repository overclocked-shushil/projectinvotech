ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ration_id_format;
ALTER TABLE public.users ADD CONSTRAINT ration_id_format CHECK (ration_id = 'ADMIN001' OR ration_id ~ '^[A-Z]{4}[0-9]{6}$');