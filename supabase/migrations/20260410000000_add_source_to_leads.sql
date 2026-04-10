alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_medium text;

create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_checkout_status_source_idx on public.leads (checkout_status, source);
