import {describe,it,expect} from 'vitest';
import {metaPromoEnabled,shouldAutoShowPromo,promoPaymentFields} from './metaPromo.js';
import {resolveAwcAttribution} from './awinCookieBridge.js';
const env={VITE_META_PROMO_ENABLED:'true',VITE_SUPABASE_URL:'https://rodvvmfzkyjsqbufkjbc.supabase.co',VITE_STRIPE_PUBLISHABLE_KEY:'pk_test_mock'};
describe('offer environment guard',()=>{
 it('requires exact DEV/test or production/live pairing and explicit activation',()=>{
  expect(metaPromoEnabled(env)).toBe(true);
  const production={...env,VITE_SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co',VITE_STRIPE_PUBLISHABLE_KEY:'pk_live_fixture'};
  expect(metaPromoEnabled(production)).toBe(true);
  expect(metaPromoEnabled({...production,VITE_STRIPE_PUBLISHABLE_KEY:'pk_test_fixture'})).toBe(false);
  expect(metaPromoEnabled({...production,VITE_META_PROMO_ENABLED:'false'})).toBe(false);
  for(const patch of [{VITE_META_PROMO_ENABLED:'false'},{VITE_SUPABASE_URL:'https://gvfptmjluxpngfjendbi.supabase.co'},{VITE_STRIPE_PUBLISHABLE_KEY:'pk_live_no'},{VITE_SUPABASE_URL:'https://other.supabase.co'}])expect(metaPromoEnabled({...env,...patch})).toBe(false);
 });
 it('waits for visible browsing and suppresses dismissed, claimed, blocked or expired offers',()=>{
  const state={eligible:true,ends_at:'2026-12-01T00:00:00Z'}; const now=Date.parse('2026-11-20');
  expect(shouldAutoShowPromo(state,{visibleMs:12000,browsed:true,now})).toBe(true);
  expect(shouldAutoShowPromo(state,{visibleMs:11999,browsed:true,now})).toBe(false);
  expect(shouldAutoShowPromo(state,{visibleMs:20000,browsed:false,now})).toBe(true);
  for(const patch of [{blocked:true},{claimed:{code:'x'}},{dismissedUntil:now+1},{ends_at:'2026-11-19'},{eligible:false}])expect(shouldAutoShowPromo({...state,...patch},{visibleMs:30000,browsed:true,now})).toBe(false);
 });
 it('binds checkout email and fails closed for a claim pending revalidation',()=>{
  const promo={code:'PERSONAL',discount_percent:10,email:'buyer@example.com',visitor_token:'opaque',valid:true,ends_at:'2099-12-01'};
  expect(promoPaymentFields(promo,' Buyer@Example.com ')).toEqual({promo_code:'PERSONAL',promo_visitor_token:'opaque'});
  expect(()=>promoPaymentFields(promo,'other@example.com')).toThrow(/email/i);
  expect(()=>promoPaymentFields({...promo,valid:false},promo.email)).toThrow();
  expect(()=>promoPaymentFields({...promo,ends_at:'2000-01-01'},promo.email)).toThrow();
 });
 it('distinguishes known absent affiliate cookie from resolution errors',async()=>{
  globalThis.location={hostname:'localhost'};
  expect(await resolveAwcAttribution(async()=>({ok:true,json:async()=>({token:null})})) ).toEqual({checked:true});
  expect(await resolveAwcAttribution(async()=>({ok:false}))).toEqual({checked:false});
  expect(await resolveAwcAttribution(async()=>({ok:true,json:async()=>({})}))).toEqual({checked:false});
 });
});
