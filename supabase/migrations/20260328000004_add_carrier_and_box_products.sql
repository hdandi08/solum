-- Add carrier to orders
alter table public.orders
  add column if not exists carrier text not null default 'royal-mail';

-- Add box packaging as inventory products
insert into public.products (id, name, sku, current_stock, reorder_weeks, unit_cost_pence, is_consumable, is_active)
values
  ('box-first-kit',     'First Kit Box (Magnetic)',  'BOX-FIRST',  0, 4, 335, false, true),
  ('box-monthly-refill','Monthly Refill Mailer',     'BOX-REFILL', 0, 4, 120, false, true)
on conflict (id) do nothing;
