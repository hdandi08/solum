import {useCallback, useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {assertReservationEditable} from '../../lib/reservation.js';
import {captureAwinAttribution} from '../../lib/awinAttribution.js';
import {resolveAwcAttribution} from '../../lib/awinCookieBridge.js';
import {META_PROMO_STORAGE_KEY, metaPromoEnabled, promoIsEligible, shouldAutoShowPromo, META_PROMO_CONSENT} from '../../lib/metaPromo.js';
import './metaPromo.css';
import PromoCode from './PromoCode.jsx';
import {MetaPromoContext as Context,EMPTY_META_PROMO as EMPTY} from './metaPromoContext.js';
const enabled=metaPromoEnabled();
function pendingCheckout(){try{assertReservationEditable('buy',null);assertReservationEditable('express',null);return false;}catch{return true;}}
function read(){try{return JSON.parse(localStorage.getItem(META_PROMO_STORAGE_KEY) ?? '{}');}catch{return {};}}
function persist(state){try{localStorage.setItem(META_PROMO_STORAGE_KEY,JSON.stringify(state));}catch{/* Optional persistence. */}}
export default function MetaPromoProvider({children}){
 const location=useLocation();
 const [state,setState]=useState(()=>enabled?{...read(),eligible:false}:{});
 const stateRef=useRef(state);stateRef.current=state;
 const visits=useRef(Promise.resolve()), revision=useRef(0);
 const guard=useRef(null);
 const routeSuppressed=['/checkout','/success','/confirm','/account'].includes(location.pathname);
 const forbiddenRoute=useRef(routeSuppressed);forbiddenRoute.current=routeSuppressed;
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [email,setEmail]=useState('');
 const [consent,setConsent]=useState(false);
 const [error,setError]=useState('');
 const [now,setNow]=useState(Date.now());
 const [suppressed,setSuppressed]=useState(false);
 const visibleMs=useRef(0),browsed=useRef(false),autoShown=useRef(false);
 const dialog=useRef(null),emailInput=useRef(null);
 const commit=useCallback(next=>{stateRef.current=next;setState(next);persist(next);},[]);
 const setCheckoutGuard=useCallback(value=>{guard.current=value;setSuppressed(value.suppressed);return()=>{if(guard.current===value){guard.current=null;setSuppressed(false);}};},[]);
 async function request(action,extra={},landingUrl=window.location.href,attribution=captureAwinAttribution()){
  const resolved=await resolveAwcAttribution(fetch,{timeoutMs:2500});
  const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-promo`,{
   method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`},
   body:JSON.stringify({action,visitor_token:stateRef.current.visitor_token,landing_url:landingUrl,attribution,attribution_checked:resolved.checked,...(resolved.token?{awin_attribution_token:resolved.token}:{}),...extra}),
  });
  const data=await response.json();if(!response.ok)throw Error(data.message ?? 'We could not check your invitation. Please try again.');return data;
 }
 useEffect(()=>{
  if(!enabled)return;
  const version=++revision.current;
  const landingUrl=window.location.href;
  const attribution=captureAwinAttribution();
  commit({...stateRef.current,eligible:false});
  // Serialize every landing, including routes entered while the initial token
  // is being issued. Persist that identity before processing later evidence.
  visits.current=visits.current.catch(()=>{}).then(async()=>{
   try{
    const data=await request('visit',{},landingUrl,attribution);
    const current=stateRef.current;
    commit({...current,...data,blocked:current.blocked||data.blocked,eligible:version===revision.current&&data.eligible&&!current.blocked,optedOut:data.redeemed?true:current.optedOut,claimed:data.redeemed||current.optedOut?undefined:(data.claimed??current.claimed)});
   }catch{commit({...stateRef.current,eligible:false});}
  });
 },[location.pathname,location.search,commit]);
 useEffect(()=>{
  if(!enabled)return;
  let last=performance.now();let startY=window.scrollY;
  const scroll=()=>{const height=document.documentElement.scrollHeight-window.innerHeight;if(Math.abs(window.scrollY-startY)>=100 || (height>0 && window.scrollY/height>=.2))browsed.current=true;};
  const timer=setInterval(()=>{
   const current=performance.now();if(document.visibilityState==='visible')visibleMs.current+=Math.min(current-last,1000);last=current;setNow(Date.now());
   if(!autoShown.current && !guard.current?.suppressed && !pendingCheckout() && !forbiddenRoute.current && !document.querySelector('[aria-modal="true"],dialog[open]') && shouldAutoShowPromo(stateRef.current,{visibleMs:visibleMs.current,browsed:browsed.current})){
    autoShown.current=true;commit({...stateRef.current,shown:true});setOpen(true);
   }
  },500);
  const visibility=()=>{last=performance.now();};
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('scroll',scroll,{passive:true});
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('scroll',scroll);};
 },[commit]);
 const pendingWithoutGuard=!guard.current&&pendingCheckout();
 const eligible=enabled&&promoIsEligible(state,now);
 const promo=enabled&&state.claimed?{...state.claimed,visitor_token:state.visitor_token,ends_at:state.ends_at,valid:eligible}:null;
 useEffect(()=>{if(open&&!busy&&(suppressed||routeSuppressed||pendingWithoutGuard||!eligible))setOpen(false);},[open,busy,suppressed,routeSuppressed,pendingWithoutGuard,eligible]);
 function close(){setOpen(false);setError('');commit({...stateRef.current,dismissedUntil:Math.min(Date.now()+7*86400000,Date.parse(stateRef.current.ends_at))});}
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement;
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const initialFocus=window.matchMedia('(max-width:650px), (pointer:coarse)').matches ? dialog.current?.querySelector('button') : emailInput.current;
  initialFocus?.focus({preventScroll:true});
  const key=e=>{
   if(e.key==='Escape'&&!busy){e.preventDefault();close();}
   if(e.key==='Tab'){
    const controls=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
    const first=controls[0],last=controls.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('keydown',key);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[open,busy]); // eslint-disable-line react-hooks/exhaustive-deps
 async function claim(e){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   if(guard.current?.suppressed)throw Error('Finish your current checkout step before applying your invitation.');
   await visits.current;
   if(!promoIsEligible(stateRef.current))throw Error('Your invitation is no longer available.');
   if(guard.current?.suppressed||forbiddenRoute.current)throw Error('Finish your current checkout step before applying your invitation.');
   if(!guard.current){assertReservationEditable('buy',null);assertReservationEditable('express',null);}
   await guard.current?.beforeApply?.();
   const version=revision.current;
   const data=await request('claim',{email:email.trim().toLowerCase(),marketing_consent:consent});
   if(data.discount_percent!==10||!data.code||data.email!==email.trim().toLowerCase()||!(Date.parse(data.ends_at)>Date.now()))throw Error('We could not verify your invitation. Please try again.');
   const next={...stateRef.current,eligible:version===revision.current&&!stateRef.current.blocked,blocked:stateRef.current.blocked,ends_at:data.ends_at,optedOut:false,claimed:{code:data.code,email:data.email,discount_percent:10}};
   commit(next);autoShown.current=true;
   guard.current?.onApplied?.(data.email);
  }catch(cause){setError(cause.message);}finally{setBusy(false);}
 }
 async function remove(){
  if(busy)return;setBusy(true);setError('');
  try{await guard.current?.beforeApply?.();commit({...stateRef.current,claimed:undefined,optedOut:true,dismissedUntil:Date.parse(stateRef.current.ends_at)});}catch(cause){setError(cause.message);}finally{setBusy(false);}
 }
 const value={promo,eligible,setCheckoutGuard,reopen:()=>{if(eligible&&!guard.current?.suppressed&&(guard.current||!pendingCheckout())&&!forbiddenRoute.current&&!document.querySelector('[aria-modal="true"],dialog[open]')){setError('');setOpen(true);}},remove,error};
 return <Context.Provider value={enabled?value:EMPTY}>{children}
  {enabled&&eligible&&!suppressed&&!routeSuppressed&&!pendingWithoutGuard&&!open&&!state.claimed&&<button type="button" className="meta-promo-reopen" onClick={value.reopen}>Your 10% invitation</button>}
  {open&&eligible&&(!suppressed||busy)&&!routeSuppressed&&!pendingWithoutGuard&&<div className="meta-promo-overlay" onClick={e=>{if(e.target===e.currentTarget&&!busy)close();}}>
   <section ref={dialog} className="meta-promo-dialog" role="dialog" aria-modal="true" aria-labelledby="meta-promo-title">
    <div className="meta-promo-close-wrap"><button type="button" className="meta-promo-close" aria-label="Close invitation" disabled={busy} onClick={close}>×</button></div>
    <div className="meta-promo-photo"><img src="/products/kit/holding-box@600.webp" alt="Opening the SOLUM ritual kit"/><span>SOLUM<br/><small>Your body. Done right.</small></span></div>
    <div className="meta-promo-content">
     <p className="meta-promo-eyebrow" id="meta-promo-title">Your Black Friday invitation.</p>
     {state.claimed?<><h2>10% applied.</h2><p>Your personal code</p><PromoCode code={state.claimed.code}/><p>Bound to {state.claimed.email}. Ready to use on your entire kit order.</p><p className="meta-promo-fine">DEV preview: your code is shown here. No offer email has been sent.</p><button type="button" className="meta-promo-submit" onClick={close}>Continue shopping</button></>:<>
      <h2><span>10% off</span> your entire order.</h2>
      <p className="meta-promo-intro">A daily ritual. A weekly reset.<br/>Yours for a little less.</p>
      <form onSubmit={claim}>
       <label className="meta-promo-label" htmlFor="meta-promo-email">Email address</label>
       <input ref={emailInput} id="meta-promo-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/>
       <label className="meta-promo-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/><span>{META_PROMO_CONSENT} <small>(optional)</small></span></label>
       {error&&<p role="alert" className="meta-promo-error">{error}</p>}
       <button className="meta-promo-submit" disabled={busy}>{busy?'Checking your invitation…':'Unlock my 10%'}</button>
      </form>
      <p className="meta-promo-fine">One personal offer per email. Ends 30 November, 11:59pm UK. Free UK delivery included. <a href="/privacy">Privacy</a></p>
     </>}
    </div>
   </section>
  </div>}
 </Context.Provider>;
}
export function MetaPromoSummary({order}){
 if(!order?.promo)return null;
 return <div className="meta-promo-saving" data-testid="meta-promo-summary"><span>Subtotal <s>£{(order.subtotalPence/100).toFixed(2)}</s></span><strong>10% applied · You save £{(order.discountPence/100).toFixed(2)}</strong></div>;
}
