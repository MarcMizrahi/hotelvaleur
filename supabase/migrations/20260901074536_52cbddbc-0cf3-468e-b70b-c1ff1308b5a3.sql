ALTER TABLE public.broker_agent ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS broker_agent_user_id_key ON public.broker_agent(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.current_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.broker_agent WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.current_agent_id() FROM public;
GRANT EXECUTE ON FUNCTION private.current_agent_id() TO authenticated;

DROP POLICY IF EXISTS "Agents read own profile" ON public.broker_agent;
CREATE POLICY "Agents read own profile" ON public.broker_agent
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Agents update own contact" ON public.broker_agent;
CREATE POLICY "Agents update own contact" ON public.broker_agent
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Agents read assigned estimations" ON public.estimation;
CREATE POLICY "Agents read assigned estimations" ON public.estimation
  FOR SELECT TO authenticated
  USING (agent_id IS NOT NULL AND agent_id = private.current_agent_id());

DROP POLICY IF EXISTS "Agents read assigned leads" ON public.brokerage_lead;
CREATE POLICY "Agents read assigned leads" ON public.brokerage_lead
  FOR SELECT TO authenticated
  USING (agent_id IS NOT NULL AND agent_id = private.current_agent_id());

DROP POLICY IF EXISTS "Agents update assigned leads" ON public.brokerage_lead;
CREATE POLICY "Agents update assigned leads" ON public.brokerage_lead
  FOR UPDATE TO authenticated
  USING (agent_id IS NOT NULL AND agent_id = private.current_agent_id())
  WITH CHECK (agent_id IS NOT NULL AND agent_id = private.current_agent_id());

DROP POLICY IF EXISTS "Agents read own lead events" ON public.brokerage_lead_event;
CREATE POLICY "Agents read own lead events" ON public.brokerage_lead_event
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brokerage_lead l
    WHERE l.id = brokerage_lead_event.lead_id
      AND l.agent_id = private.current_agent_id()
  ));