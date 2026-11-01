import React, {useEffect,useState} from 'react';
import {reservationRemaining,reservationLabel} from '../lib/reservation.js';
export function useReservationDeadline(deadline) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    if(!deadline) return;
    const tick=()=>setNow(Date.now());
    const interval=setInterval(tick,1000);
    window.addEventListener('focus',tick);
    document.addEventListener('visibilitychange',tick);
    return ()=>{clearInterval(interval);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
  },[deadline]);
  return reservationRemaining(deadline,now);
}
export default function ReservationTimer({remaining,busy,onRestart}) {
  if(remaining===null) return null;
  const expired=remaining===0;
  return <div data-testid="reservation-timer" style={{margin:'16px 0',padding:'12px 14px',border:'1px solid #2E6DA4',background:'#181C24',color:'#F0ECE2',fontSize:16,lineHeight:1.4}}>
    {busy ? <span>Confirming your payment. Please keep this page open.</span> : expired ? <>
      <div>Your reservation has ended.</div>
      <button type="button" className="co-back-btn" style={{margin:'8px 0 0',color:'#4A8FC7'}} onClick={onRestart}>Check availability again</button>
    </> : <span>Your kit is reserved for <strong style={{fontVariantNumeric:'tabular-nums'}}>{reservationLabel(remaining)}</strong></span>}
  </div>;
}
