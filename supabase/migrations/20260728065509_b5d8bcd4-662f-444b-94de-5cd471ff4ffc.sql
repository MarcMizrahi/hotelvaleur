
-- =====================================================================
-- HotelValeur — schéma initial
-- Montants en centimes (bigint). Taux en numeric(5,2).
-- RLS activée sur toutes les tables.
-- =====================================================================

-- ---------- profile + is_admin() ------------------------------------
CREATE TABLE public.profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profile TO authenticated;
GRANT ALL ON public.profile TO service_role;
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "Own profile readable" ON public.profile
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage profiles" ON public.profile
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Auto-create profile row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile (id, role) VALUES (NEW.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- estimation ---------------------------------------------
CREATE TABLE public.estimation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL,
  department_code text NOT NULL,
  city text,
  transaction_type text NOT NULL CHECK (transaction_type IN ('murs','fonds','murs_fonds')),
  room_count int NOT NULL CHECK (room_count BETWEEN 1 AND 500),
  star_rating int NOT NULL CHECK (star_rating BETWEEN 0 AND 5),
  is_independent boolean NOT NULL DEFAULT true,
  has_restaurant boolean NOT NULL DEFAULT false,
  has_licence_4 boolean NOT NULL DEFAULT false,
  works_needed text CHECK (works_needed IN ('aucun','legers','importants')),
  annual_revenue_cents bigint,
  ebitda_cents bigint,
  occupancy_rate numeric(5,2),
  value_low_cents bigint NOT NULL,
  value_high_cents bigint NOT NULL,
  method_used text NOT NULL CHECK (method_used IN ('ebitda_multiple','per_room','blended')),
  calculation_detail jsonb,
  email text NOT NULL,
  phone text,
  first_name text,
  last_name text,
  sale_intent text NOT NULL CHECK (sale_intent IN ('moins_1_an','1_a_2_ans','plus_2_ans','curiosite')),
  consent_contact boolean NOT NULL DEFAULT false,
  consent_marketing boolean NOT NULL DEFAULT false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  landing_page text,
  status text NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau','qualifie','injoignable','hors_cible','archive')),
  internal_notes text,
  report_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX estimation_created_at_idx ON public.estimation (created_at DESC);
CREATE INDEX estimation_sale_intent_idx ON public.estimation (sale_intent);
CREATE INDEX estimation_status_idx ON public.estimation (status);
GRANT SELECT, UPDATE ON public.estimation TO authenticated;
GRANT ALL ON public.estimation TO service_role;
ALTER TABLE public.estimation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read estimations" ON public.estimation
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update estimations" ON public.estimation
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- valuation_coefficient ----------------------------------
CREATE TABLE public.valuation_coefficient (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text NOT NULL,
  star_rating int NOT NULL CHECK (star_rating BETWEEN 0 AND 5),
  ebitda_multiple_low numeric(4,2) NOT NULL,
  ebitda_multiple_high numeric(4,2) NOT NULL,
  price_per_room_low_cents bigint NOT NULL,
  price_per_room_high_cents bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_slug, star_rating)
);
COMMENT ON TABLE public.valuation_coefficient IS
  'Coefficients de valorisation : ORDRES DE GRANDEUR DE DEPART, a valider par un professionnel de la transaction hoteliere et a affiner avec les donnees reelles collectees.';
CREATE INDEX valuation_coef_region_idx ON public.valuation_coefficient (region_slug);
GRANT SELECT ON public.valuation_coefficient TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.valuation_coefficient TO authenticated;
GRANT ALL ON public.valuation_coefficient TO service_role;
ALTER TABLE public.valuation_coefficient ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read coefficients" ON public.valuation_coefficient
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write coefficients" ON public.valuation_coefficient
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER valuation_coef_updated_at
  BEFORE UPDATE ON public.valuation_coefficient
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- analytics_event ----------------------------------------
CREATE TABLE public.analytics_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  session_id text NOT NULL,
  properties jsonb,
  path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_event_name_created_idx ON public.analytics_event (name, created_at DESC);
CREATE INDEX analytics_event_session_idx ON public.analytics_event (session_id);
GRANT INSERT ON public.analytics_event TO anon, authenticated;
GRANT SELECT ON public.analytics_event TO authenticated;
GRANT ALL ON public.analytics_event TO service_role;
ALTER TABLE public.analytics_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert events" ON public.analytics_event
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read events" ON public.analytics_event
  FOR SELECT TO authenticated USING (public.is_admin());

-- ---------- email_log ----------------------------------------------
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id uuid REFERENCES public.estimation(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  template text NOT NULL,
  status text NOT NULL CHECK (status IN ('envoye','erreur')),
  provider_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_log_estimation_idx ON public.email_log (estimation_id);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email_log" ON public.email_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- ---------- unsubscribe --------------------------------------------
CREATE TABLE public.unsubscribe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.unsubscribe TO authenticated;
GRANT ALL ON public.unsubscribe TO service_role;
ALTER TABLE public.unsubscribe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unsubscribes" ON public.unsubscribe
  FOR SELECT TO authenticated USING (public.is_admin());

-- =====================================================================
-- Seed : 78 coefficients (13 régions × 6 classements 0..5)
-- Base nationale par classement, multipliée par le coefficient régional.
-- Arrondis : multiples à 2 décimales, prix par chambre au millier d'euros.
-- =====================================================================
WITH base_star AS (
  SELECT * FROM (VALUES
    (0, 4.0::numeric, 5.5::numeric, 25000::numeric, 45000::numeric),
    (1, 4.0::numeric, 5.5::numeric, 25000::numeric, 45000::numeric),
    (2, 4.5::numeric, 6.0::numeric, 40000::numeric, 70000::numeric),
    (3, 5.5::numeric, 7.5::numeric, 70000::numeric, 120000::numeric),
    (4, 6.5::numeric, 9.0::numeric, 120000::numeric, 220000::numeric),
    (5, 8.0::numeric, 11.0::numeric, 250000::numeric, 600000::numeric)
  ) AS t(stars, m_low, m_high, ppr_low, ppr_high)
),
region_coef AS (
  SELECT * FROM (VALUES
    ('ile-de-france',                1.35::numeric),
    ('provence-alpes-cote-d-azur',   1.20::numeric),
    ('auvergne-rhone-alpes',         1.15::numeric),
    ('corse',                        1.15::numeric),
    ('occitanie',                    1.05::numeric),
    ('nouvelle-aquitaine',           1.05::numeric),
    ('bretagne',                     1.05::numeric),
    ('pays-de-la-loire',             1.00::numeric),
    ('normandie',                    0.95::numeric),
    ('grand-est',                    0.95::numeric),
    ('hauts-de-france',              0.90::numeric),
    ('centre-val-de-loire',          0.90::numeric),
    ('bourgogne-franche-comte',      0.90::numeric)
  ) AS r(region_slug, coef)
)
INSERT INTO public.valuation_coefficient
  (region_slug, star_rating, ebitda_multiple_low, ebitda_multiple_high,
   price_per_room_low_cents, price_per_room_high_cents)
SELECT
  r.region_slug,
  b.stars,
  ROUND(b.m_low  * r.coef, 2),
  ROUND(b.m_high * r.coef, 2),
  (ROUND(b.ppr_low  * r.coef / 1000.0) * 1000)::bigint * 100,
  (ROUND(b.ppr_high * r.coef / 1000.0) * 1000)::bigint * 100
FROM region_coef r CROSS JOIN base_star b;
