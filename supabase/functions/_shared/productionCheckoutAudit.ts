// Authenticated rollout inspection only. Never cancels, pays or reserves a resource.
export async function auditProductionCheckoutResources(stripe:any){
 if(Deno.env.get('SUPABASE_URL')!=='https://gvfptmjluxpngfjendbi.supabase.co'||!Deno.env.get('STRIPE_SECRET_KEY')?.startsWith('sk_live_'))throw Error('production_audit_not_allowed');
 const found:any[]=[];
 for(const kind of ['payment_intent','checkout_session']){
  let after:string|undefined;
  for(let page=0;page<20;page++){
   const params={limit:100,...(after?{starting_after:after}:{})};
   const list=kind==='payment_intent'?await stripe.paymentIntents.list(params):await stripe.checkout.sessions.list(params);
   for(const item of list.data){
    if(item.livemode!==true||!['ground','ritual'].includes(item.metadata?.kit_id)||item.metadata?.stock_reservation==='v1')continue;
    if(kind==='payment_intent'&&(!item.description?.startsWith('SOLUM')||['succeeded','canceled'].includes(item.status)))continue;
    if(kind==='checkout_session'&&(item.status==='expired'||item.payment_status==='paid'))continue;
    found.push({id:item.id,kind,kit_id:item.metadata.kit_id,status:item.status,payment_intent:kind==='checkout_session'?item.payment_intent:undefined});
   }
   if(!list.has_more)break;
   if(page===19||!list.data.length)throw Error('production_audit_truncated');
   after=list.data.at(-1).id;
  }
 }
 return found;
}
