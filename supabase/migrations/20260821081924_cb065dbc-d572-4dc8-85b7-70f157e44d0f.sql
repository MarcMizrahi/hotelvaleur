UPDATE public.valuation_coefficient SET
  price_per_room_low_cents = round(price_per_room_low_cents * CASE star_rating WHEN 0 THEN 1.70 WHEN 1 THEN 1.60 WHEN 2 THEN 1.25 WHEN 3 THEN 0.72 WHEN 4 THEN 0.62 ELSE 0.72 END),
  price_per_room_high_cents = round(price_per_room_high_cents * CASE star_rating WHEN 0 THEN 1.70 WHEN 1 THEN 1.60 WHEN 2 THEN 1.25 WHEN 3 THEN 0.72 WHEN 4 THEN 0.62 ELSE 0.72 END),
  updated_at = now();