CREATE TABLE public.calibration_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'auto',
  applied boolean NOT NULL DEFAULT false,
  segments_considered integer NOT NULL DEFAULT 0,
  segments_adjusted integer NOT NULL DEFAULT 0,
  transactions_used integer NOT NULL DEFAULT 0,
  detail jsonb,
  actor text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.calibration_run TO authenticated;
GRANT ALL ON public.calibration_run TO service_role;

ALTER TABLE public.calibration_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read calibration runs"
ON public.calibration_run
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE INDEX calibration_run_created_at_idx ON public.calibration_run (created_at DESC);