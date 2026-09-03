CREATE TABLE public.agent_valuation_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.broker_agent(id) ON DELETE CASCADE,
  hotel_name text NOT NULL,
  city text,
  region_slug text,
  department_code text,
  room_count integer,
  star_rating integer,
  transaction_type text,
  contact_name text,
  contact_email text,
  contact_phone text,
  urgency text NOT NULL DEFAULT 'normale',
  message text,
  status text NOT NULL DEFAULT 'nouveau',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.agent_valuation_request TO authenticated;
GRANT UPDATE ON public.agent_valuation_request TO authenticated;
GRANT ALL ON public.agent_valuation_request TO service_role;

ALTER TABLE public.agent_valuation_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents read own requests" ON public.agent_valuation_request
  FOR SELECT TO authenticated
  USING (agent_id IS NOT NULL AND agent_id = private.current_agent_id());

CREATE POLICY "Agents create own requests" ON public.agent_valuation_request
  FOR INSERT TO authenticated
  WITH CHECK (agent_id IS NOT NULL AND agent_id = private.current_agent_id());

CREATE POLICY "Admins read agent requests" ON public.agent_valuation_request
  FOR SELECT TO authenticated USING (private.is_admin());

CREATE POLICY "Admins update agent requests" ON public.agent_valuation_request
  FOR UPDATE TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE INDEX agent_valuation_request_agent_idx ON public.agent_valuation_request (agent_id, created_at DESC);

CREATE TRIGGER agent_valuation_request_updated_at
  BEFORE UPDATE ON public.agent_valuation_request
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();