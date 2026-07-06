import { offerActive } from '../lib/offer.js';

const CSS = `
.friction-strip{background:var(--black);border-top:1px solid var(--line);padding:28px 24px;}
.friction-inner{max-width:1100px;margin:0 auto;display:flex;align-items:stretch;justify-content:center;gap:0;flex-wrap:wrap;}
.friction-item{display:flex;align-items:center;gap:10px;padding:8px 26px;color:var(--mist);font-size:14px;font-weight:300;letter-spacing:.3px;}
.friction-item:not(:last-child){border-right:1px solid var(--line);}
.friction-item strong{color:var(--bone);font-weight:600;}
.friction-ic{flex-shrink:0;color:var(--blit);}
@media(max-width:760px){
  .friction-inner{flex-direction:column;align-items:stretch;gap:0;}
  .friction-item{justify-content:flex-start;padding:12px 8px;border-right:none;}
  .friction-item:not(:last-child){border-right:none;border-bottom:1px solid var(--line);}
}
`;

const Check = () => (
  <svg className="friction-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);

export default function FrictionStrip() {
  return (
    <>
      <style>{CSS}</style>
      <div className="friction-strip">
        <div className="friction-inner">
          <div className="friction-item"><Check /><span><strong>{offerActive() ? 'Free UK delivery' : 'UK delivery'}</strong> · Royal Mail Tracked</span></div>
          <div className="friction-item"><Check /><span>Dispatched <strong>next working day</strong></span></div>
          <div className="friction-item"><Check /><span><strong>14-day returns</strong> · UK consumer rights</span></div>
          <div className="friction-item"><Check /><span>Secure <strong>Stripe</strong> checkout</span></div>
        </div>
      </div>
    </>
  );
}
