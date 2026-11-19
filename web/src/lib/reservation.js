export function reservationRemaining(deadline, now = Date.now()) {
  if (!deadline) return null;
  const expiry = Date.parse(deadline);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry-now)/1000)) : 0;
}
export const canConfirmReservation = (deadline, now) => reservationRemaining(deadline,now) !== 0;
export const reservationLabel = seconds => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

const promoAttempts = new Map();
// Persist only an opaque request ID + hash. Retrying an unchanged request reuses
// the same Stripe creation key; starting over explicitly rotates it.
export async function withReservationAttempt(body, flow) {
  const financialFields=['kit_id','items','email','first_name','last_name','phone','line1','line2','city','county','postcode','promo_code','promo_visitor_token','payment_flow'];
  const identity=body.promo_code ? Object.fromEntries(financialFields.filter(key=>body[key]!==undefined).map(key=>[key,body[key]])) : body;
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(identity)));
  const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  let saved=promoAttempts.get(flow);
  try {saved=JSON.parse(sessionStorage.getItem(`solum_reservation_${flow}`)||'null') ?? saved;}catch{/* storage unavailable */}
  if(saved?.promo && !body.promo_code) throw Error('Your previous payment used a personal offer. Recover that original payment before starting another order.');
  if (body.promo_code) {
    saved = saved ?? promoAttempts.get(flow);
    if (saved && saved.fingerprint !== fingerprint) throw Error('We are still checking your previous payment attempt. Retry with the original order and details before making changes.');
  }
  if(saved?.fingerprint!==fingerprint) saved={fingerprint,id:crypto.randomUUID()};
  if(body.promo_code) { saved={...saved,promo:true,pending_body:saved.pending_body ?? body}; promoAttempts.set(flow,saved); }
  try {sessionStorage.setItem(`solum_reservation_${flow}`,JSON.stringify(saved));}catch{/* storage unavailable */}
  return {...body,reservation_request_id:saved.id};
}
export function restorePendingPromoAttempt(flow) {
  let saved=promoAttempts.get(flow);
  try {saved=JSON.parse(sessionStorage.getItem(`solum_reservation_${flow}`) || 'null') ?? saved;}catch{/* Session persistence can be unavailable. */}
  return saved?.promo && saved.pending_body?.promo_code ? {body:saved.pending_body,requestId:saved.id} : null;
}
export function assertReservationEditable(flow, knownAttempt, promoOnly = false) {
  if (knownAttempt?.client_secret) return;
  let saved=promoAttempts.get(flow);
  try {saved=JSON.parse(sessionStorage.getItem(`solum_reservation_${flow}`) || 'null') ?? saved;}catch{/* Check memory if storage is unavailable. */}
  if(saved && (!promoOnly || saved.promo)) throw Error('We are still checking your previous payment attempt. Retry with the original order and details before making changes.');
}
export function clearReservationAttempt(flow) {
  promoAttempts.delete(flow);
  try {sessionStorage.removeItem(`solum_reservation_${flow}`);sessionStorage.removeItem('solum_payment_retry');}catch{/* storage unavailable */}
}
export async function releaseReservation(url,headers,payInfo) {
  if(!payInfo?.reservation_expires_at) return;
  const response=await fetch(`${url}/functions/v1/release-checkout-reservation`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({client_secret:payInfo.client_secret})});
  const data=await response.json();
  if(!response.ok) {
    if(data.error==='payment_completed') throw Error('This payment has already completed. Please check your order confirmation.');
    if(data.error==='payment_processing') throw Error('Your payment is still processing. Please wait before making changes.');
    throw Error('We could not release your reservation just now. Please try again.');
  }
}
export function localiseReservation(data, now=Date.now()) {
  if(!data?.reservation_expires_at || !data.reservation_server_now) return data;
  const remaining=Date.parse(data.reservation_expires_at)-Date.parse(data.reservation_server_now);
  return {...data,reservation_expires_at:Number.isFinite(remaining)?new Date(now+remaining).toISOString():'invalid'};
}
