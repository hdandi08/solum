-- cancel-order fields
alter table public.orders
  add column if not exists cancelled_at  timestamptz,
  add column if not exists refund_id     text,
  add column if not exists cancel_notes  text;
