-- DEV-only opt-in campaign. No configuration, Stripe, email or stock mutations.
-- Every table is service-role only. Edge admission additionally requires exact
-- DEV project + test Stripe + all three feature flags + signed Meta destination.
create table public.meta_promo_campaigns (
 id text primary key check(id='black-friday-2026'),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null check(ends_at='2026-12-01T00:00:00Z'::timestamptz),
 enabled boolean not null default false,
 discount_percent integer not null default 10 check(discount_percent=10)
);
insert into public.meta_promo_campaigns(id,ends_at) values('black-friday-2026','2026-12-01T00:00:00Z');
create table public.meta_promo_visitors (
 token uuid primary key default gen_random_uuid(),
 campaign_id text not null references public.meta_promo_campaigns(id),
 eligible boolean not null default false,
 affiliate_blocked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 claim_requests integer not null default 0
);
create table public.meta_promo_claims (
 id uuid primary key default gen_random_uuid(),
 campaign_id text not null references public.meta_promo_campaigns(id),
 visitor_token uuid not null references public.meta_promo_visitors(token),
 email text not null check(email=lower(btrim(email)) and length(email) between 3 and 254),
 code text not null unique default ('BF-' || upper(encode(extensions.gen_random_bytes(12),'hex'))),
 marketing_consent boolean not null,
 consent_text text not null,
 consent_version text not null,
 consent_at timestamptz not null default now(),
 ends_at timestamptz not null,
 created_at timestamptz not null default now(),
 active_attempt_id uuid references public.checkout_multi_attempts(id),
 redeemed_order_id uuid unique references public.orders(id),
 redeemed_at timestamptz,
 unique(campaign_id,email),unique(campaign_id,visitor_token)
);
create table public.meta_promo_rate_limits (
 bucket text not null,
 action text not null check(action in ('visit','claim')),
 window_start timestamptz not null,
 requests integer not null default 1,
 primary key(bucket,action,window_start)
);
alter table public.checkout_multi_attempts
 add column promo_claim_id uuid references public.meta_promo_claims(id),
 add column promo_code text,
 add column promo_email text,
 add column promo_payment_params jsonb,
 add column subtotal_pence integer,
 add column discount_pence integer,
 add constraint checkout_multi_promo_financials check (
  (promo_claim_id is null and promo_code is null and promo_email is null and subtotal_pence is null and discount_pence is null) or
  (promo_claim_id is not null and promo_code is not null and promo_email is not null and subtotal_pence>0 and discount_pence=subtotal_pence/10 and amount_pence=subtotal_pence-discount_pence)
 );
alter table public.checkout_multi_attempts drop constraint checkout_multi_attempts_total_quantity_check;
alter table public.checkout_multi_attempts add constraint checkout_multi_attempts_total_quantity_check check(total_quantity between 1 and 5 and (total_quantity>1 or promo_claim_id is not null));
alter table public.orders add column promo_claim_id uuid references public.meta_promo_claims(id),add column promo_code text,add column subtotal_pence integer,add column discount_pence integer;
alter table public.orders drop constraint orders_checkout_shape;
alter table public.orders add constraint orders_checkout_shape check(case when checkout_version is null then kit_quantity=1 when checkout_version='multi_kit_v1' then kit_quantity between 1 and 5 and kit_id is null else false end);
alter table public.orders add constraint orders_promo_financials check(
 (promo_claim_id is null and promo_code is null and subtotal_pence is null and discount_pence is null) or
 (promo_claim_id is not null and promo_code is not null and subtotal_pence>0 and discount_pence=subtotal_pence/10 and amount_pence=subtotal_pence-discount_pence)
);
-- Privileges intentionally include no anon/authenticated access or policies.
alter table public.meta_promo_campaigns enable row level security;
alter table public.meta_promo_visitors enable row level security;
alter table public.meta_promo_claims enable row level security;
alter table public.meta_promo_rate_limits enable row level security;
revoke all on public.meta_promo_campaigns,public.meta_promo_visitors,public.meta_promo_claims,public.meta_promo_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.meta_promo_campaigns,public.meta_promo_visitors,public.meta_promo_claims,public.meta_promo_rate_limits to service_role;

create function public.rate_limit_meta_promo(p_bucket text,p_action text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_bucket is null or length(p_bucket)<>64 or p_action not in ('visit','claim') then return false; end if;
 insert into public.meta_promo_rate_limits(bucket,action,window_start) values(p_bucket,p_action,date_trunc('hour',now()))
 on conflict(bucket,action,window_start) do update set requests=public.meta_promo_rate_limits.requests+1 returning requests into n;
 return n<=case p_action when 'visit' then 240 else 20 end;
end $$;
create function public.record_meta_promo_visit(p_visitor_token uuid,p_eligible boolean,p_blocked boolean,p_checked boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.meta_promo_visitors%rowtype; c public.meta_promo_campaigns%rowtype; g public.meta_promo_claims%rowtype; ok boolean;
begin
 select * into c from public.meta_promo_campaigns where id='black-friday-2026';
 if p_visitor_token is not null then select * into v from public.meta_promo_visitors where token=p_visitor_token for update; end if;
 if v.token is null then
  insert into public.meta_promo_visitors(campaign_id,eligible,affiliate_blocked) values(c.id,coalesce(p_eligible,false) and coalesce(p_checked,false),coalesce(p_blocked,false)) returning * into v;
 else
  update public.meta_promo_visitors set eligible=eligible or (coalesce(p_eligible,false) and coalesce(p_checked,false)),affiliate_blocked=affiliate_blocked or coalesce(p_blocked,false),updated_at=now() where token=v.token returning * into v;
 end if;
 ok:=c.enabled and now()>=c.starts_at and now()<c.ends_at and v.eligible and not v.affiliate_blocked and coalesce(p_checked,false);
 select * into g from public.meta_promo_claims where visitor_token=v.token and campaign_id=c.id;
 ok:=ok and g.redeemed_order_id is null;
 return jsonb_build_object('visitor_token',v.token,'eligible',ok,'blocked',v.affiliate_blocked,'ends_at',c.ends_at,'discount_percent',10,'redeemed',g.redeemed_order_id is not null) ||
  case when ok and g.id is not null then jsonb_build_object('claimed',jsonb_build_object('code',g.code,'email',g.email,'discount_percent',10)) else '{}'::jsonb end;
end $$;
create function public.claim_meta_promo(p_visitor_token uuid,p_email text,p_marketing_consent boolean,p_consent_text text,p_consent_version text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.meta_promo_visitors%rowtype; c public.meta_promo_campaigns%rowtype; g public.meta_promo_claims%rowtype;
begin
 select * into c from public.meta_promo_campaigns where id='black-friday-2026';
 select * into v from public.meta_promo_visitors where token=p_visitor_token for update;
 if v.token is null or not v.eligible or v.affiliate_blocked or not c.enabled or now()<c.starts_at or now()>=c.ends_at then raise exception 'promo_unavailable'; end if;
 update public.meta_promo_visitors set claim_requests=claim_requests+1 where token=v.token;
 if v.claim_requests>=20 then raise exception 'promo_rate_limited'; end if;
 if p_email is null or p_email<>lower(btrim(p_email)) or length(p_email)>254 or p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_marketing_consent is null or p_consent_text is distinct from 'Send me SOLUM news and offers' or p_consent_version is distinct from 'black-friday-2026-v1' then raise exception 'invalid_promo_claim'; end if;
 -- Unique email + visitor constraints prevent another visitor reusing a claim.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(c.id||':'||p_email,71));
 select * into g from public.meta_promo_claims where campaign_id=c.id and (email=p_email or visitor_token=v.token) for update;
 if found then
  if g.email<>p_email or g.visitor_token<>v.token or g.redeemed_order_id is not null then raise exception 'promo_claim_bound'; end if;
 else
  insert into public.meta_promo_claims(campaign_id,visitor_token,email,marketing_consent,consent_text,consent_version,ends_at)
  values(c.id,v.token,p_email,p_marketing_consent,p_consent_text,p_consent_version,c.ends_at) returning * into g;
 end if;
 return jsonb_build_object('code',g.code,'email',g.email,'discount_percent',10,'ends_at',g.ends_at);
end $$;

create function public.prepare_meta_promo_attempt(p_request_key text,p_items jsonb,p_stripe_customer_id text,p_code text,p_visitor_token uuid,p_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.meta_promo_campaigns%rowtype; v public.meta_promo_visitors%rowtype; g public.meta_promo_claims%rowtype;
 a public.checkout_multi_attempts%rowtype; prior public.checkout_multi_attempts%rowtype; item jsonb; q numeric; total integer; subtotal integer; net integer; canonical jsonb;
begin
 if p_request_key is null or length(p_request_key) not between 16 and 200 or p_stripe_customer_id is null or p_stripe_customer_id not like 'cus_%' then raise exception 'invalid_checkout_attempt'; end if;
 select * into c from public.meta_promo_campaigns where id='black-friday-2026';
 -- Lock visitor before claim in every admission path to avoid claim/visit races.
 select * into v from public.meta_promo_visitors where token=p_visitor_token for update;
 if v.token is null or not v.eligible or v.affiliate_blocked or not c.enabled or now()<c.starts_at or now()>=c.ends_at then raise exception 'promo_unavailable'; end if;
 select * into g from public.meta_promo_claims where code=p_code and campaign_id=c.id for update;
 if not found or g.visitor_token<>v.token or g.email is distinct from p_email or g.ends_at<=now() or g.redeemed_order_id is not null then raise exception 'promo_claim_invalid'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 5 then raise exception 'invalid_order_items'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or item->>'kit_id' is null or item->>'kit_id' not in ('ground','ritual') or jsonb_typeof(item->'quantity') is distinct from 'number' then raise exception 'invalid_order_items'; end if;
  q:=(item->>'quantity')::numeric;if q<>trunc(q) or q<1 or q>5 then raise exception 'invalid_quantity'; end if;
 end loop;
 select sum((value->>'quantity')::integer) into total from jsonb_array_elements(p_items);
 if total not between 1 and 5 then raise exception 'invalid_order_quantity'; end if;
 select jsonb_agg(jsonb_build_object('kit_id',kit,'quantity',qty,'unit_amount_pence',unit,'line_amount_pence',qty*unit) order by kit),sum(qty*gross),sum(qty*unit) into canonical,subtotal,net
 from (select value->>'kit_id' kit,sum((value->>'quantity')::integer)::integer qty,case value->>'kit_id' when 'ground' then 5850 else 7650 end unit,case value->>'kit_id' when 'ground' then 6500 else 8500 end gross from jsonb_array_elements(p_items) group by value->>'kit_id') normalized;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_key,8));
 select * into a from public.checkout_multi_attempts where request_key=p_request_key for update;
 if found then
  if a.promo_claim_id is distinct from g.id or a.items<>canonical or a.promo_email is distinct from g.email or a.subtotal_pence<>subtotal or a.discount_pence<>subtotal-net then raise exception 'checkout_attempt_mismatch'; end if;
  if g.active_attempt_id is distinct from a.id then raise exception 'promo_attempt_replaced'; end if;
  if a.created_at<now()-interval '24 hours' then raise exception 'reservation_expired'; end if;
 else
  if g.active_attempt_id is not null then
   select * into prior from public.checkout_multi_attempts where id=g.active_attempt_id for update;
   -- Absence/age does NOT prove Stripe cannot still charge. Require positively
   -- cancelled resource recorded as released by trusted payment code.
   if prior.stripe_payment_id is null or not exists(select 1 from public.checkout_reservations where resource_id=prior.stripe_payment_id and state='released') then raise exception 'promo_attempt_active'; end if;
  end if;
  insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence,promo_claim_id,promo_code,promo_email,subtotal_pence,discount_pence)
  values(p_request_key,p_stripe_customer_id,canonical,total,net,g.id,g.code,g.email,subtotal,subtotal-net) returning * into a;
  update public.meta_promo_claims set active_attempt_id=a.id where id=g.id;
 end if;
 return to_jsonb(a);
end $$;

-- Freeze every original provider parameter before the first create. An unknown
-- create outcome can retry under its original key despite later tracking changes.
create function public.freeze_meta_promo_payment_params(p_attempt_id uuid,p_params jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype;
begin
 select * into a from public.checkout_multi_attempts where id=p_attempt_id for update;
 if not found or a.promo_claim_id is null or p_params is null or jsonb_typeof(p_params)<>'object' or
  (p_params->>'amount')::integer is distinct from a.amount_pence or p_params->>'currency' is distinct from 'gbp' or
  p_params->>'customer' is distinct from a.stripe_customer_id or p_params->'metadata'->>'email' is distinct from a.promo_email or
  p_params->'metadata'->>'multi_kit_attempt_id' is distinct from a.id::text or p_params->'metadata'->>'checkout_flow' is distinct from 'multi_kit_v1' then raise exception 'promo_payment_params_mismatch'; end if;
 if a.promo_payment_params is null then
  update public.checkout_multi_attempts set promo_payment_params=p_params where id=a.id returning * into a;
 end if;
 return a.promo_payment_params;
end $$;

-- Bind before any retrieval/reservation; a failed/unknown Stripe create remains
-- pinned to the original idempotency key, never implicitly released.
create function public.bind_meta_promo_payment(p_attempt_id uuid,p_resource_id text) returns void language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype;
begin
 select * into a from public.checkout_multi_attempts where id=p_attempt_id for update;
 if not found or a.promo_claim_id is null or p_resource_id is null or p_resource_id not like 'pi_%' or (a.stripe_payment_id is not null and a.stripe_payment_id<>p_resource_id) then raise exception 'promo_payment_mismatch'; end if;
 update public.checkout_multi_attempts set stripe_payment_id=p_resource_id where id=a.id;
end $$;
-- Called ONLY after Stripe confirms status=canceled. A cancellation before stock
-- hold needs a durable released marker so a later edited order can retry safely.
create function public.release_meta_promo_payment(p_attempt_id uuid,p_resource_id text) returns void language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype; r public.checkout_reservations%rowtype;
begin
 select * into a from public.checkout_multi_attempts where id=p_attempt_id for update;
 if not found or a.promo_claim_id is null or a.stripe_payment_id is distinct from p_resource_id then raise exception 'promo_payment_mismatch'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_resource_id,1));
 select * into r from public.checkout_reservations where resource_id=p_resource_id for update;
 if found then
  if r.items_snapshot is distinct from a.items or r.state='consumed' then raise exception 'promo_payment_mismatch'; end if;
  perform public.settle_checkout_reservation(p_resource_id,'released');
 else
  insert into public.checkout_reservations(resource_id,resource_kind,kit_id,items_snapshot,state) values(p_resource_id,'payment_intent',null,a.items,'released');
 end if;
end $$;

alter function public.finalise_multi_kit_order(uuid,text,uuid,integer,jsonb,text) rename to finalise_multi_kit_order_base;
revoke all on function public.finalise_multi_kit_order_base(uuid,text,uuid,integer,jsonb,text) from public,anon,authenticated,service_role;
create function public.finalise_multi_kit_order(p_attempt_id uuid,p_payment_id text,p_customer_id uuid,p_amount_pence integer,p_address jsonb,p_source text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.checkout_multi_attempts%rowtype; g public.meta_promo_claims%rowtype; result jsonb;
begin
 -- Lock in the same visitor->claim->attempt order as preparation. Paid snapshots
 -- deliberately ignore current campaign flags/deadline and visitor exclusion.
 select * into a from public.checkout_multi_attempts where id=p_attempt_id;
 if a.promo_claim_id is not null then
  select * into g from public.meta_promo_claims where id=a.promo_claim_id;
  perform 1 from public.meta_promo_visitors where token=g.visitor_token for update;
  select * into g from public.meta_promo_claims where id=a.promo_claim_id for update;
  if g.active_attempt_id is distinct from a.id or not exists(select 1 from public.customers where id=p_customer_id and email=g.email) then raise exception 'promo_payment_mismatch'; end if;
  if g.redeemed_order_id is not null and not exists(select 1 from public.orders where id=g.redeemed_order_id and stripe_payment_id=p_payment_id) then raise exception 'promo_already_redeemed'; end if;
 end if;
 result:=public.finalise_multi_kit_order_base(p_attempt_id,p_payment_id,p_customer_id,p_amount_pence,p_address,p_source);
 if a.promo_claim_id is not null then
  update public.orders set promo_claim_id=g.id,promo_code=g.code,subtotal_pence=a.subtotal_pence,discount_pence=a.discount_pence where id=(result->>'id')::uuid;
  update public.meta_promo_claims set redeemed_order_id=(result->>'id')::uuid,redeemed_at=coalesce(redeemed_at,now()) where id=g.id;
  result:=result || jsonb_build_object('promo',jsonb_build_object('code',g.code,'discount_percent',10,'subtotal_pence',a.subtotal_pence,'discount_pence',a.discount_pence));
 end if;
 return result;
end $$;

create function public.guard_meta_promo_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='checkout_multi_attempts' then
  if (to_jsonb(new)-'stripe_payment_id'-'promo_payment_params') is distinct from (to_jsonb(old)-'stripe_payment_id'-'promo_payment_params') or (old.stripe_payment_id is not null and new.stripe_payment_id is distinct from old.stripe_payment_id) or (old.promo_payment_params is not null and new.promo_payment_params is distinct from old.promo_payment_params) or (new.promo_payment_params is not null and new.promo_claim_id is null) then raise exception 'checkout_attempt_immutable'; end if;
 elsif old.promo_claim_id is not null and (new.promo_claim_id is distinct from old.promo_claim_id or new.promo_code is distinct from old.promo_code or new.subtotal_pence is distinct from old.subtotal_pence or new.discount_pence is distinct from old.discount_pence) then raise exception 'promo_order_snapshot_immutable';
 end if;
 return new;
end $$;
create trigger meta_promo_attempt_immutable before update on public.checkout_multi_attempts for each row execute function public.guard_meta_promo_snapshot();
create trigger meta_promo_order_immutable before update on public.orders for each row execute function public.guard_meta_promo_snapshot();

revoke all on function public.rate_limit_meta_promo(text,text),public.record_meta_promo_visit(uuid,boolean,boolean,boolean),public.claim_meta_promo(uuid,text,boolean,text,text),public.prepare_meta_promo_attempt(text,jsonb,text,text,uuid,text),public.freeze_meta_promo_payment_params(uuid,jsonb),public.bind_meta_promo_payment(uuid,text),public.release_meta_promo_payment(uuid,text),public.finalise_multi_kit_order(uuid,text,uuid,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.rate_limit_meta_promo(text,text),public.record_meta_promo_visit(uuid,boolean,boolean,boolean),public.claim_meta_promo(uuid,text,boolean,text,text),public.prepare_meta_promo_attempt(text,jsonb,text,text,uuid,text),public.freeze_meta_promo_payment_params(uuid,jsonb),public.bind_meta_promo_payment(uuid,text),public.release_meta_promo_payment(uuid,text),public.finalise_multi_kit_order(uuid,text,uuid,integer,jsonb,text) to service_role;
