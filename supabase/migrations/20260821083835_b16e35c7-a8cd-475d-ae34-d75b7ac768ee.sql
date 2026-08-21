-- Grant Data API access aligned with existing RLS policies
GRANT SELECT, INSERT ON public.profile TO authenticated;
GRANT UPDATE, DELETE ON public.profile TO authenticated;
GRANT ALL ON public.profile TO service_role;

GRANT SELECT ON public.broker_agent TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.broker_agent TO authenticated;
GRANT ALL ON public.broker_agent TO service_role;

GRANT SELECT ON public.valuation_coefficient TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.valuation_coefficient TO authenticated;
GRANT ALL ON public.valuation_coefficient TO service_role;

GRANT INSERT ON public.analytics_event TO anon, authenticated;
GRANT SELECT ON public.analytics_event TO authenticated;
GRANT ALL ON public.analytics_event TO service_role;

GRANT SELECT, UPDATE ON public.brokerage_lead TO authenticated;
GRANT ALL ON public.brokerage_lead TO service_role;

GRANT SELECT ON public.brokerage_lead_event TO authenticated;
GRANT ALL ON public.brokerage_lead_event TO service_role;

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

GRANT SELECT, UPDATE ON public.estimation TO authenticated;
GRANT ALL ON public.estimation TO service_role;

GRANT SELECT, UPDATE, DELETE ON public.market_transaction TO authenticated;
GRANT ALL ON public.market_transaction TO service_role;

GRANT SELECT ON public.market_transaction_dedup_log TO authenticated;
GRANT ALL ON public.market_transaction_dedup_log TO service_role;

GRANT SELECT ON public.scrape_run TO authenticated;
GRANT ALL ON public.scrape_run TO service_role;

GRANT SELECT ON public.unsubscribe TO authenticated;
GRANT ALL ON public.unsubscribe TO service_role;