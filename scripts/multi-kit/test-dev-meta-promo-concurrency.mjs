// Isolated DEV database fixtures only: no Stripe resource, hold or email.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {devQuery,DEV_PROJECT} from './dev-db.mjs';

if(DEV_PROJECT!=='rodvvmfzkyjsqbufkjbc')throw Error('DEV project guard failed.');
const tag=randomUUID().replaceAll('-','');
const email=`promo-race-${tag}@example.invalid`;
let visitor,claim;
try{
 const [campaign]=await devQuery("select enabled and now()>=starts_at and now()<ends_at as active from public.meta_promo_campaigns where id='black-friday-2026'");
 assert.equal(campaign?.active,true,'Run only after DEV campaign activation.');
 const [visit]=await devQuery('select public.record_meta_promo_visit(null,true,false,true) as result');
 visitor=visit.result.visitor_token;assert.match(visitor,/^[a-f0-9-]{36}$/);
 const [grant]=await devQuery(`select public.claim_meta_promo('${visitor}','${email}',false,'Send me SOLUM news and offers','black-friday-2026-v1') as result`);
 const code=grant.result.code;assert.match(code,/^BF-[A-F0-9]{24}$/);
 [claim]=await devQuery(`select id from public.meta_promo_claims where visitor_token='${visitor}' and email='${email}'`);
 const keys=Array.from({length:8},()=>`multi-${randomUUID()}`);
 const results=await Promise.allSettled(keys.map(key=>devQuery(`select public.prepare_meta_promo_attempt('${key}','[{"kit_id":"ritual","quantity":2},{"kit_id":"ground","quantity":1}]'::jsonb,'cus_fixture_${tag}','${code}','${visitor}','${email}') as result`)));
 const winners=results.filter(result=>result.status==='fulfilled');
 assert.equal(winners.length,1,'Exactly one concurrent attempt may own the discount grant.');
 for(const result of results.filter(result=>result.status==='rejected'))assert.match(String(result.reason),/promo_attempt_active/);
 const attempt=winners[0].value[0].result;
 assert.equal(attempt.amount_pence,21150);assert.equal(attempt.subtotal_pence,23500);assert.equal(attempt.discount_pence,2350);
 const key=attempt.request_key;
 const [replay]=await devQuery(`select public.prepare_meta_promo_attempt('${key}','[{"kit_id":"ritual","quantity":2},{"kit_id":"ground","quantity":1}]'::jsonb,'cus_fixture_${tag}','${code}','${visitor}','${email}') as result`);
 assert.equal(replay.result.id,attempt.id,'Original immutable request remains recoverable.');
 const [held]=await devQuery(`select count(*)::integer n from public.checkout_reservations where resource_id in(select stripe_payment_id from public.checkout_multi_attempts where promo_claim_id='${claim.id}')`);
 assert.equal(held.n,0,'Prepare-only fixtures must never hold real stock.');
 console.log('PASS: one of eight concurrent attempts owns the email-bound grant; £235→£211.50; original key replays; no stock hold or provider operation.');
}finally{
 if(claim?.id)await devQuery(`BEGIN; update public.meta_promo_claims set active_attempt_id=null where id='${claim.id}'; delete from public.checkout_multi_attempts where promo_claim_id='${claim.id}'; delete from public.meta_promo_claims where id='${claim.id}'; COMMIT;`);
 if(visitor)await devQuery(`delete from public.meta_promo_visitors where token='${visitor}'`);
}
