alter table public.orders
  add column if not exists dispatch_status text not null default 'pending',
  add column if not exists tracking_number text,
  add column if not exists dispatched_at   timestamptz;

create index if not exists orders_dispatch_status_idx on public.orders (dispatch_status);
