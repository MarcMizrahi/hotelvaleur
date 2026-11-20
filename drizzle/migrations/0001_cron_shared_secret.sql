create table if not exists public.app_config (
  key text primary key,
  value text not null
);

grant all on public.app_config to service_role;

alter table public.app_config enable row level security;

insert into public.app_config (key, value)
values ('cron_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

select cron.unschedule('scrape-transactions-weekly') where exists (select 1 from cron.job where jobname = 'scrape-transactions-weekly');
select cron.unschedule('calibrate-coefficients-weekly') where exists (select 1 from cron.job where jobname = 'calibrate-coefficients-weekly');

select cron.schedule(
  'scrape-transactions-weekly',
  '0 3 * * 1',
  $$
  select net.http_post(
    url := 'https://hotelvaleur.lovable.app/api/public/hooks/scrape-transactions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_config where key = 'cron_secret')
    ),
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
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select value from public.app_config where key = 'cron_secret')
    ),
    body := '{"source": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);