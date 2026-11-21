-- Multi-kit and discounted single-kit orders store kit identities in order_items.
-- Preserve the original non-null kit requirement for legacy single-kit rows.
alter table public.orders alter column kit_id drop not null;
alter table public.orders drop constraint orders_checkout_shape;
alter table public.orders add constraint orders_checkout_shape check (case
 when checkout_version is null then kit_quantity=1 and kit_id is not null
 when checkout_version='multi_kit_v1' then kit_quantity between 1 and 5 and kit_id is null
 else false end);
