BEGIN;
-- Rollback-only migration fixture. The DEV runner replaces the marker below
-- with 20261121000001_short_promo_codes.sql BEFORE executing this transaction.
-- Fake payment references only; no Stripe, reservation, stock or email actions.
create temporary table short_promo_fixture_state (
 safe_claim uuid, active_claim uuid, paid_claim uuid, new_visitor uuid,
 active_attempt uuid, paid_order uuid, safe_code text, active_code text,
 paid_code text, safe_snapshot jsonb, active_snapshot jsonb, paid_snapshot jsonb,
 attempt_snapshot jsonb, order_snapshot jsonb
) on commit drop;
do $setup$
declare tag text:=replace(gen_random_uuid()::text,'-',''); v_safe uuid; v_active uuid; v_paid uuid; v_new uuid;
 g_safe uuid; g_active uuid; g_paid uuid; a uuid; o uuid; customer uuid; deadline timestamptz;
 code_safe text; code_active text; code_paid text;
begin
 select ends_at into deadline from public.meta_promo_campaigns where id='black-friday-2026';
 code_safe:='BF-'||upper(tag)||'SAFE';code_active:='BF-'||upper(tag)||'ACTIVE';code_paid:='BF-'||upper(tag)||'PAID';
 insert into public.meta_promo_visitors(campaign_id,eligible) values('black-friday-2026',true) returning token into v_safe;
 insert into public.meta_promo_visitors(campaign_id,eligible) values('black-friday-2026',true) returning token into v_active;
 insert into public.meta_promo_visitors(campaign_id,eligible) values('black-friday-2026',true) returning token into v_paid;
 insert into public.meta_promo_visitors(campaign_id,eligible) values('black-friday-2026',true) returning token into v_new;
 insert into public.meta_promo_claims(campaign_id,visitor_token,email,code,marketing_consent,consent_text,consent_version,ends_at)
 values('black-friday-2026',v_safe,'short-safe-'||tag||'@example.invalid',code_safe,false,'Send me SOLUM news and offers','black-friday-2026-v1',deadline) returning id into g_safe;
 insert into public.meta_promo_claims(campaign_id,visitor_token,email,code,marketing_consent,consent_text,consent_version,ends_at)
 values('black-friday-2026',v_active,'short-active-'||tag||'@example.invalid',code_active,false,'Send me SOLUM news and offers','black-friday-2026-v1',deadline) returning id into g_active;
 insert into public.meta_promo_claims(campaign_id,visitor_token,email,code,marketing_consent,consent_text,consent_version,ends_at)
 values('black-friday-2026',v_paid,'short-paid-'||tag||'@example.invalid',code_paid,false,'Send me SOLUM news and offers','black-friday-2026-v1',deadline) returning id into g_paid;
 -- An issued attempt keeps its long grant code and immutable financial snapshot.
 insert into public.checkout_multi_attempts(request_key,stripe_customer_id,items,total_quantity,amount_pence,promo_claim_id,promo_code,promo_email,subtotal_pence,discount_pence,stripe_payment_id)
 values('short-fixture-'||tag,'cus_short_'||tag,'[{"kit_id":"ground","quantity":2,"unit_amount_pence":5850,"line_amount_pence":11700}]',2,11700,g_active,code_active,'short-active-'||tag||'@example.invalid',13000,1300,'pi_short_fixture_'||tag) returning id into a;
 update public.meta_promo_claims set active_attempt_id=a where id=g_active;
 insert into public.customers(email,stripe_customer_id) values('short-paid-'||tag||'@example.invalid','cus_short_paid_'||tag) returning id into customer;
 insert into public.orders(customer_id,stripe_payment_id,kit_id,order_type,amount_pence,status,promo_claim_id,promo_code,subtotal_pence,discount_pence)
 values(customer,'pi_short_paid_fixture_'||tag,'ground','first_box',5850,'paid',g_paid,code_paid,6500,650) returning id into o;
 update public.meta_promo_claims set redeemed_order_id=o,redeemed_at=now() where id=g_paid;
 insert into short_promo_fixture_state
 select g_safe,g_active,g_paid,v_new,a,o,code_safe,code_active,code_paid,
 (select to_jsonb(g)-'code' from public.meta_promo_claims g where id=g_safe),
 (select to_jsonb(g) from public.meta_promo_claims g where id=g_active),
 (select to_jsonb(g) from public.meta_promo_claims g where id=g_paid),
 (select to_jsonb(x) from public.checkout_multi_attempts x where id=a),
 (select to_jsonb(x) from public.orders x where id=o);
end $setup$;

-- APPLY_SHORT_PROMO_MIGRATION_HERE

do $assert$
declare f short_promo_fixture_state%rowtype; generated text; g record; i integer; role_name text;
begin
 select * into f from short_promo_fixture_state;
 select * into g from public.meta_promo_claims where id=f.safe_claim;
 if g.code=f.safe_code or g.code!~'^BF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then raise exception 'TEST unprepared legacy claim was not shortened to eight safe characters';end if;
 if (to_jsonb(g)-'code') is distinct from f.safe_snapshot then raise exception 'TEST shortening changed grant email/visitor/consent/eligibility data';end if;
 if (select to_jsonb(x) from public.meta_promo_claims x where id=f.active_claim) is distinct from f.active_snapshot or (select to_jsonb(x) from public.checkout_multi_attempts x where id=f.active_attempt) is distinct from f.attempt_snapshot then raise exception 'TEST prepared claim or payment snapshot changed';end if;
 if (select to_jsonb(x) from public.meta_promo_claims x where id=f.paid_claim) is distinct from f.paid_snapshot or (select to_jsonb(x) from public.orders x where id=f.paid_order) is distinct from f.order_snapshot then raise exception 'TEST redeemed claim or paid order changed';end if;
 insert into public.meta_promo_claims(campaign_id,visitor_token,email,marketing_consent,consent_text,consent_version,ends_at)
 values('black-friday-2026',f.new_visitor,'short-new-'||f.new_visitor::text||'@example.invalid',false,'Send me SOLUM news and offers','black-friday-2026-v1','2026-12-01T00:00:00Z') returning code into generated;
 if generated!~'^BF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' then raise exception 'TEST new claim default does not use short codes';end if;
 for i in 1..256 loop
  generated:=public.generate_meta_promo_code();
  if generated!~'^BF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$' or substr(generated,4)~'[IO01]' or exists(select 1 from public.meta_promo_claims where code=generated) then raise exception 'TEST generated code has invalid format or collides with an existing claim';end if;
 end loop;
 foreach role_name in array array['anon','authenticated'] loop
  if has_function_privilege(role_name,'public.generate_meta_promo_code()','EXECUTE') then raise exception 'TEST public shortcode generator privilege';end if;
 end loop;
 if not has_function_privilege('service_role','public.generate_meta_promo_code()','EXECUTE') or exists(select 1 from pg_catalog.pg_proc where oid='public.generate_meta_promo_code()'::regprocedure and prosecdef) then raise exception 'TEST generator service privilege or invoker security';end if;
 if not exists(select 1 from pg_catalog.pg_constraint where conrelid='public.meta_promo_claims'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (code)') then raise exception 'TEST code uniqueness constraint lost';end if;
 raise notice 'PASS: eight-character safe codes, new defaults, safe legacy shortening, bound grant data, prepared/paid immutability, invoker privileges and uniqueness';
end $assert$;
ROLLBACK;
