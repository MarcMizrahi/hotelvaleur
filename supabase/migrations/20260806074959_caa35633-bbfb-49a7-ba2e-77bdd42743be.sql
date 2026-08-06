CREATE TABLE public.market_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  title text,
  published_at date,
  hotel_name text,
  city text,
  department_code text,
  region_slug text,
  star_rating integer,
  room_count integer,
  transaction_type text,
  price_cents bigint,
  price_per_room_cents bigint,
  buyer text,
  seller text,
  excerpt text,
  confidence numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX market_transaction_region_star_idx ON public.market_transaction (region_slug, star_rating);
CREATE INDEX market_transaction_status_idx ON public.market_transaction (status);

GRANT SELECT, UPDATE, DELETE ON public.market_transaction TO authenticated;
GRANT ALL ON public.market_transaction TO service_role;
ALTER TABLE public.market_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read market transactions" ON public.market_transaction
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins update market transactions" ON public.market_transaction
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete market transactions" ON public.market_transaction
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.scrape_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  sources_count integer NOT NULL DEFAULT 0,
  articles_found integer NOT NULL DEFAULT 0,
  transactions_inserted integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text
);

GRANT SELECT ON public.scrape_run TO authenticated;
GRANT ALL ON public.scrape_run TO service_role;
ALTER TABLE public.scrape_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scrape runs" ON public.scrape_run
  FOR SELECT TO authenticated USING (public.is_admin());