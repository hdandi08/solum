alter table public.leads
  add column if not exists confirm_token uuid default gen_random_uuid(),
  add column if not exists confirmed_at  timestamptz;

create unique index if not exists leads_confirm_token_idx on public.leads (confirm_token);
