ALTER TABLE public.market_transaction ADD COLUMN IF NOT EXISTS dedup_key text;

CREATE OR REPLACE FUNCTION public.market_transaction_dedup_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  norm_name text;
BEGIN
  norm_name := lower(regexp_replace(coalesce(NEW.hotel_name, ''), '[^a-zA-Z0-9]', '', 'g'));
  IF norm_name = '' THEN
    NEW.dedup_key := NULL;
  ELSE
    NEW.dedup_key := norm_name
      || '|' || coalesce(to_char(NEW.published_at, 'YYYY-MM-DD'), '')
      || '|' || coalesce(NEW.room_count::text, '')
      || '|' || coalesce(NEW.price_cents::text, '')
      || '|' || coalesce(NEW.transaction_type, '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_transaction_dedup_key_trg ON public.market_transaction;
CREATE TRIGGER market_transaction_dedup_key_trg
BEFORE INSERT OR UPDATE ON public.market_transaction
FOR EACH ROW EXECUTE FUNCTION public.market_transaction_dedup_key();

UPDATE public.market_transaction SET hotel_name = hotel_name;

DELETE FROM public.market_transaction t
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY dedup_key
           ORDER BY (status = 'validated') DESC, confidence DESC, created_at ASC
         ) AS rn
  FROM public.market_transaction
  WHERE dedup_key IS NOT NULL
) d
WHERE t.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS market_transaction_dedup_key_uidx
  ON public.market_transaction (dedup_key)
  WHERE dedup_key IS NOT NULL;