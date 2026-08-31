create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('scrape-transactions-weekly') where exists (select 1 from cron.job where jobname = 'scrape-transactions-weekly');
select cron.unschedule('calibrate-coefficients-weekly') where exists (select 1 from cron.job where jobname = 'calibrate-coefficients-weekly');

select cron.schedule(
  'scrape-transactions-weekly',
  '0 3 * * 1',
  $$
  select net.http_post(
    url := 'https://hotelvaleur.lovable.app/api/public/hooks/scrape-transactions',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_1MjhiShjYjjT2J3Cnw3hEA_QvlnqwOZ"}'::jsonb,
    body := '{"source": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

select cron.schedule(
  'calibrate-coefficients-weekly',
  '30 4 * * 1',
  $$
  select net.http_post(
    url := 'https://hotelvaleur.lovable.app/api/public/hooks/calibrate-coefficients',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_1MjhiShjYjjT2J3Cnw3hEA_QvlnqwOZ"}'::jsonb,
    body := '{"source": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);