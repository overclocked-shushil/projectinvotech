CREATE TABLE IF NOT EXISTS public.deleted_ration_ids (
  ration_id text PRIMARY KEY,
  role text NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deleted_ration_ids ENABLE ROW LEVEL SECURITY;