ALTER TABLE public.estimation
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.broker_agent(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS estimation_agent_id_idx ON public.estimation(agent_id);