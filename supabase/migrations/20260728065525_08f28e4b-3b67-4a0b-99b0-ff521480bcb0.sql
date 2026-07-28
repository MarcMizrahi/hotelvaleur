
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public EXECUTE on SECURITY DEFINER helpers.
-- is_admin() is still callable by RLS (runs as table owner) — the revocation
-- only affects direct RPC/API calls, which we don't want to expose.
REVOKE EXECUTE ON FUNCTION public.is_admin()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()  FROM PUBLIC, anon, authenticated;

-- Tighten analytics insert policy: require non-empty session_id/name so anon
-- writers can't spam empty rows.
DROP POLICY IF EXISTS "Public insert events" ON public.analytics_event;
CREATE POLICY "Public insert events" ON public.analytics_event
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 120
    AND length(session_id) BETWEEN 1 AND 100
  );
