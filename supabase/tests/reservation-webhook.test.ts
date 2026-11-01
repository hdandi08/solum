import {assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
// Execute the real signed webhook handler; all provider/database traffic is mocked.
Deno.env.set('SUPABASE_URL','https://reservation-test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','fixture-service-role');
Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');
Deno.env.set('STRIPE_WEBHOOK_SECRET','whsec_fixture');
let transport:typeof fetch=()=>Promise.reject(Error('Unexpected external request'));
globalThis.fetch=(...args)=>transport(...args);
let handler:(r:Request)=>Promise<Response>;
const serve=Deno.serve;
Deno.serve=((fn:typeof handler)=>{handler=fn;}) as typeof Deno.serve;
await import('../functions/stripe-webhook/index.ts');
Deno.serve=serve;
async function deliver(type:string,object:unknown) {
 const body=JSON.stringify({id:'evt_fixture',type,data:{object}}), timestamp=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('whsec_fixture'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`));
 const hex=Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,'0')).join('');
 return handler(new Request('http://localhost/webhook',{method:'POST',headers:{'stripe-signature':`t=${timestamp},v1=${hex}`},body}));
}
Deno.test('unpaid hosted completion does not create orders, subscriptions or consume stock',async()=>{
 transport=()=>Promise.reject(Error('No side effects allowed before payment'));
 assertEquals((await deliver('checkout.session.completed',{id:'cs_test',payment_status:'unpaid',metadata:{kit_id:'ritual',stock_reservation:'v1',source:'first_batch'}})).status,200);
});
Deno.test('hosted PaymentIntent success does not also create a subscription',async()=>{
 transport=()=>Promise.reject(Error('Hosted payment is fulfilled by session event'));
 assertEquals((await deliver('payment_intent.succeeded',{id:'pi_test',metadata:{kit_id:'ritual',checkout_flow:'hosted'}})).status,200);
});
for(const paid of [false,true]) Deno.test(`async failure rechecks Stripe and ${paid?'preserves paid stock':'releases unpaid hold'}`,async()=>{
 let releases=0;
 transport=async(input,init)=>{
  const r=new Request(input,init),url=new URL(r.url);
  if(url.hostname==='api.stripe.com' && url.pathname.endsWith('/cs_test')) return Response.json({id:'cs_test',status:'complete',payment_status:paid?'paid':'unpaid'});
  if(url.pathname.endsWith('/rpc/settle_checkout_reservation')) {const body=await r.json();assertEquals(body,{p_resource_id:'cs_test',p_outcome:'released'});releases++;return Response.json('released');}
  throw Error(`Unexpected request: ${url.pathname}`);
 };
 assertEquals((await deliver('checkout.session.async_payment_failed',{id:'cs_test',metadata:{stock_reservation:'v1'}})).status,200);
 assertEquals(releases,paid?0:1);
});
Deno.test('full refund without an order persists its intent before acknowledgement',async()=>{
 const calls:string[]=[];
 transport=async(input,init)=>{
  const r=new Request(input,init),path=new URL(r.url).pathname;calls.push(path);
  if(path.endsWith('/rpc/record_checkout_full_refund')) {assertEquals((await r.json()).p_payment_id,'pi_test');return Response.json(null);}
  if(path.endsWith('/orders')) return Response.json([]);
  if(path.endsWith('/events')) return Response.json({});
  throw Error(`Unexpected request: ${path}`);
 };
 assertEquals((await deliver('charge.refunded',{payment_intent:'pi_test',amount:8500,amount_refunded:8500})).status,200);
 assertEquals(calls[0],'/rest/v1/rpc/record_checkout_full_refund');
});
