CREATE TABLE public.broker_agent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  photo_url text,
  bio text,
  regions text[] NOT NULL DEFAULT '{}',
  star_ratings integer[] NOT NULL DEFAULT '{}',
  transaction_types text[] NOT NULL DEFAULT '{}',
  min_rooms integer,
  max_rooms integer,
  languages text[] NOT NULL DEFAULT '{}',
  transactions_count integer NOT NULL DEFAULT 0,
  monthly_capacity integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.broker_agent TO anon;
GRANT SELECT ON public.broker_agent TO authenticated;
GRANT ALL ON public.broker_agent TO service_role;

ALTER TABLE public.broker_agent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read public agents" ON public.broker_agent
  FOR SELECT TO anon, authenticated
  USING (is_public = true AND is_active = true);

CREATE POLICY "Admins manage agents" ON public.broker_agent
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER broker_agent_updated_at
  BEFORE UPDATE ON public.broker_agent
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.brokerage_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id uuid NOT NULL REFERENCES public.estimation(id) ON DELETE CASCADE,
  sale_horizon text NOT NULL,
  operation_type text NOT NULL,
  has_mandate boolean NOT NULL DEFAULT false,
  confidential boolean NOT NULL DEFAULT false,
  availability text,
  phone text,
  message text,
  consent_share boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'nouveau',
  agent_id uuid REFERENCES public.broker_agent(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  contacted_at timestamptz,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX brokerage_lead_estimation_unique ON public.brokerage_lead (estimation_id);
CREATE INDEX brokerage_lead_status_idx ON public.brokerage_lead (status, created_at DESC);

GRANT SELECT, UPDATE ON public.brokerage_lead TO authenticated;
GRANT ALL ON public.brokerage_lead TO service_role;

ALTER TABLE public.brokerage_lead ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read brokerage leads" ON public.brokerage_lead
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Admins update brokerage leads" ON public.brokerage_lead
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER brokerage_lead_updated_at
  BEFORE UPDATE ON public.brokerage_lead
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.brokerage_lead_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.brokerage_lead(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_value text,
  to_value text,
  agent_id uuid REFERENCES public.broker_agent(id) ON DELETE SET NULL,
  detail text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brokerage_lead_event_lead_idx ON public.brokerage_lead_event (lead_id, created_at DESC);

GRANT SELECT ON public.brokerage_lead_event TO authenticated;
GRANT ALL ON public.brokerage_lead_event TO service_role;

ALTER TABLE public.brokerage_lead_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read brokerage lead events" ON public.brokerage_lead_event
  FOR SELECT TO authenticated USING (public.is_admin());