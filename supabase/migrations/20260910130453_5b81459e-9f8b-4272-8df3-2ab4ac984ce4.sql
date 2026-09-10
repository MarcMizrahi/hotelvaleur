CREATE TABLE public.estimation_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id uuid NOT NULL REFERENCES public.estimation(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.broker_agent(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  sent_to text,
  status text NOT NULL DEFAULT 'generated',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estimation_report_estimation_idx ON public.estimation_report (estimation_id, created_at DESC);
CREATE INDEX estimation_report_agent_idx ON public.estimation_report (agent_id, created_at DESC);

GRANT SELECT ON public.estimation_report TO authenticated;
GRANT ALL ON public.estimation_report TO service_role;

ALTER TABLE public.estimation_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read estimation reports"
  ON public.estimation_report FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY "Agents read own estimation reports"
  ON public.estimation_report FOR SELECT TO authenticated
  USING (agent_id IS NOT NULL AND agent_id = private.current_agent_id());