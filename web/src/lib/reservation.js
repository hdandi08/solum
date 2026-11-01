export function reservationRemaining(deadline, now = Date.now()) {
  if (!deadline) return null;
  const expiry = Date.parse(deadline);
  return Number.isFinite(expiry) ? Math.max(0, Math.ceil((expiry-now)/1000)) : 0;
}
export const canConfirmReservation = (deadline, now) => reservationRemaining(deadline,now) !== 0;
export const reservationLabel = seconds => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

// Persist only an opaque request ID + hash. Retrying an unchanged request reuses
// the same Stripe creation key; starting over explicitly rotates it.
export async function withReservationAttempt(body, flow) {
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
  const fingerprint=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  let saved;
  try {saved=JSON.parse(sessionStorage.getItem(`solum_reservation_${flow}`)||'null');}catch{/* storage unavailable */}
  if(saved?.fingerprint!==fingerprint) saved={fingerprint,id:crypto.randomUUID()};
  try {sessionStorage.setItem(`solum_reservation_${flow}`,JSON.stringify(saved));}catch{/* storage unavailable */}
  return {...body,reservation_request_id:saved.id};
}
export function clearReservationAttempt(flow) {
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
