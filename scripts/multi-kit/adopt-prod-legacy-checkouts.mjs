import{prodQuery,PROD_PROJECT}from'./prod-db.mjs';
if(PROD_PROJECT!=='gvfptmjluxpngfjendbi')throw Error('Production project guard failed.');
const[{decrypted_secret:secret}]=await prodQuery("select decrypted_secret from vault.decrypted_secrets where name='checkout_reservation_worker_bearer_prod'");
const response=await fetch(`https://${PROD_PROJECT}.supabase.co/functions/v1/checkout-reservation-worker`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({action:'audit_legacy_prod'}),signal:AbortSignal.timeout(55000)});
const data=await response.json();if(!response.ok||!Array.isArray(data.resources))throw Error('Production legacy audit failed.');
// Production preflight found only intents. Fail closed on hosted resources,
// whose session and underlying intent must be reconciled as one payment.
if(data.resources.some(r=>r.kind!=='payment_intent'))throw Error('Legacy hosted sessions require separate reconciliation before activation.');
const resources=data.resources;
const statements=[];
for(const r of resources){
 if(!/^(pi|cs)_[a-zA-Z0-9]+$/.test(r.id)||!['ground','ritual'].includes(r.kit_id)||!['payment_intent','checkout_session'].includes(r.kind))throw Error('Unexpected Stripe audit shape.');
 // Share the paid-order lock before adopting a legacy hold. An already-accounted
 // payment must not lose stock a second time if it completed during the audit.
 statements.push(`perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('${r.id}',2));
 if not exists(select 1 from public.orders where stripe_payment_id='${r.id}' and inventory_kit_deducted) then
  result:=public.reserve_checkout_stock('${r.kit_id}','${r.id}','${r.kind}');
  if result->>'state'='sold_out' then raise exception 'insufficient_stock_for_legacy_adoption'; end if;
 end if;`);
}
if(statements.length)await prodQuery(`BEGIN; SET LOCAL lock_timeout='5s'; DO $adopt$ declare result jsonb; begin ${statements.join('\n')} end $adopt$; COMMIT;`);
console.log(`Accounted for ${resources.length} older unpaid checkout resources using existing reservations; no Stripe resource was charged or cancelled.`);
