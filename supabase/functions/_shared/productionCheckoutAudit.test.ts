import{assertEquals,assertRejects}from'https://deno.land/std@0.224.0/assert/mod.ts';
import{auditProductionCheckoutResources}from'./productionCheckoutAudit.ts';
Deno.test('production rollout audit is read-only, mode-bound, and finds only unpaid unreserved SOLUM resources',async()=>{
 Deno.env.set('SUPABASE_URL','https://gvfptmjluxpngfjendbi.supabase.co');Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');Deno.env.set('CHECKOUT_RESERVATIONS_ENABLED','false');
 const pi=(id:string,patch={})=>({id,livemode:true,description:'SOLUM RITUAL',metadata:{kit_id:'ritual'},status:'requires_payment_method',...patch});
 const stripe={paymentIntents:{list:()=>Promise.resolve({has_more:false,data:[pi('pi_old'),pi('pi_paid',{status:'succeeded'}),pi('pi_other',{description:'Other'}),pi('pi_test',{livemode:false}),pi('pi_held',{metadata:{kit_id:'ritual',stock_reservation:'v1'}})]})},checkout:{sessions:{list:()=>Promise.resolve({has_more:false,data:[{id:'cs_old',livemode:true,metadata:{kit_id:'ground'},status:'open',payment_status:'unpaid',payment_intent:'pi_session'},{id:'cs_paid',livemode:true,metadata:{kit_id:'ground'},status:'complete',payment_status:'paid'}]})}}};
 const result=await auditProductionCheckoutResources(stripe);assertEquals(result.map(r=>r.id),['pi_old','cs_old']);
 Deno.env.set('STRIPE_SECRET_KEY','sk_test_fixture');await assertRejects(()=>auditProductionCheckoutResources(stripe));
});
Deno.test('production audit refuses truncated scans',async()=>{
 Deno.env.set('STRIPE_SECRET_KEY','sk_live_fixture');
 await assertRejects(()=>auditProductionCheckoutResources({paymentIntents:{list:()=>Promise.resolve({has_more:true,data:[{id:'pi_page'}]})}}));
});
