CREATE TABLE public.market_transaction_dedup_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.scrape_run(id) ON DELETE SET NULL,
  source_name text,
  source_url text,
  title text,
  hotel_name text,
  city text,
  published_at date,
  room_count integer,
  price_cents bigint,
  transaction_type text,
  dedup_key text,
  reason text NOT NULL,
  detail text,
  kept_transaction_id uuid REFERENCES public.market_transaction(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX market_transaction_dedup_log_created_idx ON public.market_transaction_dedup_log (created_at DESC);

GRANT SELECT ON public.market_transaction_dedup_log TO authenticated;
GRANT ALL ON public.market_transaction_dedup_log TO service_role;

ALTER TABLE public.market_transaction_dedup_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read dedup log"
  ON public.market_transaction_dedup_log
  FOR SELECT TO authenticated
  USING (is_admin());