DROP POLICY IF EXISTS "Public read coefficients" ON public.valuation_coefficient;
REVOKE SELECT ON public.valuation_coefficient FROM anon;