-- Add delivered_at and sendcloud_parcel_id to orders
-- delivered_at: set by sendcloud-webhook when status = delivered
-- sendcloud_parcel_id: set by create-sendcloud-parcel when label is created

alter table public.orders
  add column if not exists delivered_at        timestamptz,
  add column if not exists sendcloud_parcel_id bigint;
