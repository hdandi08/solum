alter table public.leads
  add column if not exists phone    text,
  add column if not exists line1    text,
  add column if not exists line2    text,
  add column if not exists city     text,
  add column if not exists postcode text;
