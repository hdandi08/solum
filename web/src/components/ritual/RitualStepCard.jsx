const CSS = `
.rp-step{display:grid;grid-template-columns:120px 1fr;gap:48px;padding:48px 0;border-bottom:1px solid var(--line);}
.rp-step:last-child{border-bottom:none;}
.rp-step-left{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding-top:4px;}
.rp-step-num{font-family:'Bebas Neue',sans-serif;font-size:72px;letter-spacing:.03em;line-height:1;}
.rp-step-num.daily{color:var(--blue);}
.rp-step-num.weekly{color:#c8a96e;}
.rp-step-badge{font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;padding:5px 10px;border:1px solid;}
.rp-step-badge.daily{color:var(--blit);border-color:rgba(74,143,199,0.3);background:rgba(74,143,199,0.06);}
.rp-step-badge.weekly{color:#c8a96e;border-color:rgba(200,169,110,0.3);background:rgba(200,169,110,0.06);}
.rp-step-right{display:flex;flex-direction:column;gap:20px;}
.rp-step-name{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.08em;color:var(--bone);}
.rp-step-chips{display:flex;gap:12px;flex-wrap:wrap;}
.rp-step-chip{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);background:var(--mid);padding:5px 12px;}
.rp-step-label{font-size:10px;letter-spacing:5px;text-transform:uppercase;font-weight:600;margin-bottom:6px;}
.rp-step-label.how.daily{color:var(--blit);}
.rp-step-label.how.weekly{color:#c8a96e;}
.rp-step-label.why{color:var(--stone);margin-top:16px;}
.rp-step-how{font-size:16px;color:var(--bone);font-weight:300;line-height:1.65;}
.rp-step-why{font-size:14px;color:var(--stone);font-weight:300;line-height:1.6;}
@media(max-width:768px){
  .rp-step{grid-template-columns:1fr;gap:16px;}
  .rp-step-left{flex-direction:row;align-items:center;}
  .rp-step-num{font-size:52px;}
}
`;

export default function RitualStepCard({ position, step, detail, variant }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-step">
        <div className="rp-step-left">
          <div className={`rp-step-num ${variant}`}>{String(position).padStart(2, '0')}</div>
          <div className={`rp-step-badge ${variant}`}>Product {step.num}</div>
        </div>
        <div className="rp-step-right">
          <div>
            <div className="rp-step-name">{step.name}</div>
            <div className="rp-step-chips">
              <div className="rp-step-chip">{step.time}</div>
              <div className="rp-step-chip">{step.zone}</div>
            </div>
          </div>
          {detail?.how && (
            <div>
              <div className={`rp-step-label how ${variant}`}>How</div>
              <div className="rp-step-how">{detail.how}</div>
            </div>
          )}
          {detail?.why && (
            <div>
              <div className="rp-step-label why">Why it matters</div>
              <div className="rp-step-why">{detail.why}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
