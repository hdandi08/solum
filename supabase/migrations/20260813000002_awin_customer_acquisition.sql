alter table public.awin_conversion_outbox
  add column customer_acquisition text;

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_customer_acquisition_check
  check (
    customer_acquisition is null
    or customer_acquisition in ('NEW', 'RETURNING')
  );

do $$
begin
  if exists (
    select 1
    from public.awin_conversion_outbox as outbox
    left join public.awin_commission_groups as imported_group
      on imported_group.code = outbox.commission_group
    where imported_group.code is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'awin_outbox_group_missing_from_imported_policy';
  end if;
end;
$$;

alter table public.awin_conversion_outbox
  drop constraint awin_conversion_outbox_group_check;

alter table public.awin_conversion_outbox
  add constraint awin_conversion_outbox_group_format_check
  check (commission_group ~ '^[A-Z0-9_]{1,50}$'),
  add constraint awin_conversion_outbox_group_fkey
  foreign key (commission_group)
  references public.awin_commission_groups(code);

create or replace function public.guard_awin_conversion_outbox_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if (
    new.id is distinct from old.id
    or new.order_ref is distinct from old.order_ref
    or new.order_id is distinct from old.order_id
    or new.customer_paid_pence is distinct from old.customer_paid_pence
    or new.discount_pence is distinct from old.discount_pence
    or new.delivery_pence is distinct from old.delivery_pence
    or new.vat_pence is distinct from old.vat_pence
    or new.amount_pence is distinct from old.amount_pence
    or new.voucher_code is distinct from old.voucher_code
    or new.financial_basis_version is distinct from old.financial_basis_version
    or new.currency is distinct from old.currency
    or new.commission_group is distinct from old.commission_group
    or new.customer_acquisition is distinct from old.customer_acquisition
    or new.channel is distinct from old.channel
    or new.awc_ciphertext is distinct from old.awc_ciphertext
    or new.awc_hash is distinct from old.awc_hash
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '22023',
      message = 'AWIN outbox identity and financial basis are immutable';
  end if;

  return new;
end;
$$;

alter function public.guard_awin_conversion_outbox_immutable() owner to postgres;
revoke all on function public.guard_awin_conversion_outbox_immutable()
  from public, anon, authenticated, service_role;
