-- supabase/migrations/20260530000001_orders_source.sql

alter table orders
  add column if not exists source text
    check (source in ('first_batch', 'gift', 'tiktok_shop', 'website'))
    default null;

comment on column orders.source is
  'Acquisition channel for this order. NULL = subscription flow (legacy). first_batch = Phase 1 launch. gift = gift purchase. tiktok_shop = TikTok sale.';
