BEGIN;
-- Rollback-only fixture: no external provider operations. All stock, campaign,
-- customer, order and grant changes below are restored by ROLLBACK.
do $test$
declare tag text:=replace(gen_random_uuid()::text,'-',''); v uuid; v2 uuid; blocked uuid;
 email text; customer uuid:=gen_random_uuid(); customer_ref text; code text; claim uuid;
 a jsonb; retry jsonb; edited jsonb; result jsonb; oid uuid; payment text;
 rejected boolean; role_name text; before_stock integer; params jsonb; frozen jsonb;
 address jsonb:='{"name":"Promo Fixture","line1":"1 Fixture Road","city":"London","postcode":"SW1A 1AA","country":"GB"}';
begin
 email:='promo-'||tag||'@example.invalid';customer_ref:='cus_promo_'||tag;payment:='pi_promo_'||tag;
 update public.meta_promo_campaigns set enabled=true,starts_at=now()-interval '1 day' where id='black-friday-2026';
 v:=(public.record_meta_promo_visit(null,true,false,true)->>'visitor_token')::uuid;
 v2:=(public.record_meta_promo_visit(null,true,false,true)->>'visitor_token')::uuid;
 blocked:=(public.record_meta_promo_visit(null,true,false,true)->>'visitor_token')::uuid;
 result:=public.record_meta_promo_visit(blocked,false,true,true);
 result:=public.record_meta_promo_visit(blocked,true,false,true);
 if result->>'blocked'<>'true' or result->>'eligible'<>'false' then raise exception 'TEST sticky affiliate exclusion failed';end if;
 result:=public.record_meta_promo_visit(v,false,false,false);
 if result->>'eligible'<>'false' then raise exception 'TEST unknown resolution did not fail closed';end if;
 result:=public.record_meta_promo_visit(v,false,false,true);
 if result->>'eligible'<>'true' then raise exception 'TEST navigation lost prior signed admission';end if;
 result:=public.claim_meta_promo(v,email,false,'Send me SOLUM news and offers','black-friday-2026-v1');code:=result->>'code';
 select id into claim from public.meta_promo_claims where visitor_token=v;
 if not exists(select 1 from public.meta_promo_claims where id=claim and marketing_consent=false and consent_at is not null and consent_text='Send me SOLUM news and offers' and consent_version='black-friday-2026-v1') then raise exception 'TEST explicit consent choice missing';end if;
 if public.claim_meta_promo(v,email,true,'Send me SOLUM news and offers','black-friday-2026-v1')->>'code'<>code then raise exception 'TEST claim idempotency';end if;
 rejected:=false;begin perform public.claim_meta_promo(v2,email,false,'Send me SOLUM news and offers','black-friday-2026-v1');exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST another visitor acquired same email claim';end if;
 rejected:=false;begin perform public.claim_meta_promo(blocked,'blocked-'||email,false,'Send me SOLUM news and offers','black-friday-2026-v1');exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST affiliate claim acquired';end if;
 insert into public.customers(id,email,first_name,stripe_customer_id) values(customer,email,'Promo Fixture',customer_ref);
 -- Client unit prices are ignored: SQL builds the full mixed 10% snapshot.
 a:=public.prepare_meta_promo_attempt('promo_a_'||tag,'[{"kit_id":"ground","quantity":1,"unit_amount_pence":1},{"kit_id":"ritual","quantity":2}]',customer_ref,code,v,email);
 if (a->>'amount_pence')::integer<>21150 or (a->>'subtotal_pence')::integer<>23500 or (a->>'discount_pence')::integer<>2350 or (a->'items'->0->>'unit_amount_pence')::integer<>5850 or (a->'items'->1->>'unit_amount_pence')::integer<>7650 then raise exception 'TEST trusted mixed net arithmetic';end if;
 params:=jsonb_build_object('amount',21150,'currency','gbp','customer',customer_ref,'metadata',jsonb_build_object('email',email,'multi_kit_attempt_id',a->>'id','checkout_flow','multi_kit_v1','fbp','original'));
 frozen:=public.freeze_meta_promo_payment_params((a->>'id')::uuid,params);
 retry:=public.freeze_meta_promo_payment_params((a->>'id')::uuid,params||jsonb_build_object('metadata',(params->'metadata')||'{"fbp":"changed"}'::jsonb));
 if frozen is distinct from params or retry is distinct from frozen then raise exception 'TEST original Stripe parameters not frozen across retries';end if;
 rejected:=false;begin perform public.freeze_meta_promo_payment_params((a->>'id')::uuid,params||'{"amount":1}'::jsonb);exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST noncanonical Stripe amount snapshot accepted';end if;
 rejected:=false;begin update public.checkout_multi_attempts set promo_payment_params='{}' where id=(a->>'id')::uuid;exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST original provider parameters mutable';end if;

 retry:=public.prepare_meta_promo_attempt('promo_a_'||tag,'[{"kit_id":"ritual","quantity":2},{"kit_id":"ground","quantity":1}]','cus_different',code,v,email);
 if retry->>'id'<>a->>'id' or retry->>'stripe_customer_id'<>customer_ref then raise exception 'TEST immutable same-key retry';end if;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_b_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,email);exception when others then rejected:=sqlerrm='promo_attempt_active';end;
 if not rejected then raise exception 'TEST unknown unbound Stripe create unlocked grant';end if;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_a_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,email);exception when others then rejected:=sqlerrm='checkout_attempt_mismatch';end;
 if not rejected then raise exception 'TEST edited same key accepted';end if;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_wrong_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,'wrong-'||email);exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST wrong email accepted';end if;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_wrong_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v2,email);exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST wrong visitor accepted';end if;
 perform public.bind_meta_promo_payment((a->>'id')::uuid,payment||'_cancel');
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_b_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,email);exception when others then rejected:=sqlerrm='promo_attempt_active';end;
 if not rejected then raise exception 'TEST bound possibly payable resource unlocked grant';end if;
 -- The trusted edge calls release ONLY on positively confirmed Stripe canceled.
 perform public.release_meta_promo_payment((a->>'id')::uuid,payment||'_cancel');
 edited:=public.prepare_meta_promo_attempt('promo_b_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,email);
 if edited->>'id'=a->>'id' or (edited->>'amount_pence')::integer<>5850 or (edited->>'total_quantity')::integer<>1 then raise exception 'TEST released hold/single promo replacement';end if;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_a_'||tag,'[{"kit_id":"ground","quantity":1},{"kit_id":"ritual","quantity":2}]',customer_ref,code,v,email);exception when others then rejected:=sqlerrm='promo_attempt_replaced';end;
 if not rejected then raise exception 'TEST replaced old key revived';end if;
 rejected:=false;begin update public.checkout_multi_attempts set amount_pence=1 where id=(edited->>'id')::uuid;exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST promo attempt financial mutation accepted';end if;
 perform public.bind_meta_promo_payment((edited->>'id')::uuid,payment);
 select available_count into before_stock from public.kit_inventory where kit_id='ground';
 update public.kit_inventory set available_count=greatest(available_count,1) where kit_id='ground';
 result:=public.reserve_multi_kit_stock((edited->>'id')::uuid,payment);
 if result->>'state'<>'held' then raise exception 'TEST single promo hold';end if;
 -- Expiry and disable prevent all new payments but must not lose an already paid
 -- immutable order. Flags/exclusion do not retroactively invalidate settlement.
 update public.meta_promo_claims set ends_at=now()-interval '1 second' where id=claim;
 rejected:=false;begin perform public.prepare_meta_promo_attempt('promo_b_'||tag,'[{"kit_id":"ground","quantity":1}]',customer_ref,code,v,email);exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST expired claim issued payment';end if;
 update public.meta_promo_campaigns set enabled=false where id='black-friday-2026';
 perform public.record_meta_promo_visit(v,false,true,true);
 result:=public.finalise_multi_kit_order((edited->>'id')::uuid,payment,customer,5850,address,'first_batch');oid:=(result->>'id')::uuid;
 if result->'promo'->>'subtotal_pence'<>'6500' or result->'promo'->>'discount_pence'<>'650' or not exists(select 1 from public.orders where id=oid and amount_pence=5850 and subtotal_pence=6500 and discount_pence=650 and promo_claim_id=claim and kit_quantity=1 and checkout_version='multi_kit_v1') then raise exception 'TEST promo financial order snapshot';end if;
 if not exists(select 1 from public.meta_promo_claims where id=claim and redeemed_order_id=oid and redeemed_at is not null) then raise exception 'TEST redemption not atomic';end if;
 update public.meta_promo_campaigns set enabled=true where id='black-friday-2026';
 update public.meta_promo_visitors set affiliate_blocked=false where token=v; -- fixture isolates redemption from earlier exclusion
 result:=public.record_meta_promo_visit(v,true,false,true);
 if result->>'eligible'<>'false' or result->>'redeemed'<>'true' then raise exception 'TEST redeemed visitor still teased eligible offer';end if;
 update public.meta_promo_campaigns set enabled=false where id='black-friday-2026';
 if (select sum(line_amount_pence) from public.order_items where order_id=oid)<>5850 then raise exception 'TEST net line totals disagree with charged total';end if;
 retry:=public.finalise_multi_kit_order((edited->>'id')::uuid,payment,customer,5850,address,'first_batch');
 if retry->>'id'<>oid::text or (select count(*) from public.orders where stripe_payment_id=payment)<>1 then raise exception 'TEST paid webhook replay duplicated order/redemption';end if;
 rejected:=false;begin update public.orders set discount_pence=0,subtotal_pence=5850 where id=oid;exception when others then rejected:=true;end;
 if not rejected then raise exception 'TEST order promo snapshot mutation accepted';end if;
 perform public.record_checkout_full_refund(payment);
 if not exists(select 1 from public.meta_promo_claims where id=claim and redeemed_order_id=oid) then raise exception 'TEST refund restored promo entitlement';end if;
 foreach role_name in array array['anon','authenticated'] loop
  if has_table_privilege(role_name,'public.meta_promo_claims','SELECT') or has_table_privilege(role_name,'public.meta_promo_visitors','SELECT') or has_function_privilege(role_name,'public.freeze_meta_promo_payment_params(uuid,jsonb)','EXECUTE') or has_function_privilege(role_name,'public.claim_meta_promo(uuid,text,boolean,text,text)','EXECUTE') or has_function_privilege(role_name,'public.prepare_meta_promo_attempt(text,jsonb,text,text,uuid,text)','EXECUTE') then raise exception 'TEST public promo privileges';end if;
 end loop;
 if has_function_privilege('service_role','public.finalise_multi_kit_order_base(uuid,text,uuid,integer,jsonb,text)','EXECUTE') then raise exception 'TEST base finalizer bypass available';end if;
 raise notice 'PASS: sticky exclusion, unknown fail-closed, consent, idempotent claim, email/visitor binding, canonical 10%% arithmetic, immutable retries, unknown-resource pinning, confirmed-release replacement, promo single kit, expired/disabled settlement, atomic redemption replay, refund and privileges';
end $test$;
ROLLBACK;
