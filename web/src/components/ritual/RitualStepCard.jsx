import RitualVideoPlaceholder from './RitualVideoPlaceholder';

const CSS = `
.rsc{background:var(--char);border:1px solid var(--line);overflow:hidden;margin-bottom:24px;}
.rsc:last-child{margin-bottom:0;}
.rsc-header{display:grid;grid-template-columns:56px 1fr auto;gap:20px;align-items:center;padding:20px 28px;border-bottom:1px solid var(--line);}
.rsc-badge{width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.05em;flex-shrink:0;}
.rsc-badge.daily{background:var(--blue);color:#fff;}
.rsc-badge.weekly{background:#c8a96e;color:var(--black);}
.rsc-meta{}
.rsc-product{font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;}
.rsc-product.daily{color:var(--blit);}
.rsc-product.weekly{color:#c8a96e;}
.rsc-name{font-size:16px;letter-spacing:1px;text-transform:uppercase;color:var(--bone);font-weight:600;}
.rsc-time-block{text-align:right;}
.rsc-time-num{font-family:'Bebas Neue',sans-serif;font-size:36px;line-height:1;letter-spacing:-.5px;}
.rsc-time-num.daily{color:var(--blue);}
.rsc-time-num.weekly{color:#c8a96e;}
.rsc-time-unit{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);}
.rsc-body{display:grid;grid-template-columns:1fr 1fr;}
.rsc-instructions{padding:24px 28px;overflow:auto;}
.rsc-section-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-bottom:14px;display:flex;align-items:center;gap:12px;}
.rsc-section-label::after{content:'';flex:1;height:1px;background:var(--line);}
.rsc-steps{display:flex;flex-direction:column;margin-bottom:20px;}
.rsc-step-row{display:grid;grid-template-columns:24px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);}
.rsc-step-row:last-child{border-bottom:none;}
.rsc-step-n{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--stone);line-height:1.4;}
.rsc-step-t{font-size:15px;font-weight:300;color:var(--bone);line-height:1.65;}
.rsc-tip{margin-bottom:12px;border-left:2px solid var(--blue);background:rgba(46,109,164,0.05);padding:14px 16px;}
.rsc-tip.weekly{border-left-color:#c8a96e;background:rgba(200,169,110,0.05);}
.rsc-tip-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:6px;}
.rsc-tip-label.daily{color:var(--blit);}
.rsc-tip-label.weekly{color:#c8a96e;}
.rsc-tip-body{font-size:14px;font-weight:300;color:var(--mist);line-height:1.65;}
.rsc-warning{margin-bottom:12px;border-left:2px solid #e05c3a;background:rgba(224,92,58,0.06);padding:14px 16px;}
.rsc-warning-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:#e05c3a;margin-bottom:6px;}
.rsc-warning-body{font-size:14px;font-weight:300;color:var(--mist);line-height:1.65;}
.rsc-upgrade{margin-bottom:12px;border:1px solid rgba(200,169,110,0.35);background:rgba(200,169,110,0.05);padding:14px 16px;}
.rsc-upgrade-label{font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:#c8a96e;margin-bottom:6px;display:flex;align-items:center;gap:8px;}
.rsc-upgrade-arrow{font-size:14px;}
.rsc-upgrade-body{font-size:14px;font-weight:300;color:var(--mist);line-height:1.65;}
.rsc-why{font-size:14px;font-weight:300;color:var(--mist);line-height:1.65;}
@media(max-width:900px){
  .rsc-body{grid-template-columns:1fr;}
  .rsc-header{padding:16px 20px;gap:14px;}
  .rsc-badge{width:40px;height:40px;font-size:18px;}
  .rsc-time-num{font-size:28px;}
  .rsc-instructions{padding:20px;}
}
`;

function parseTime(time) {
  const parts = time.split(' ');
  return { num: parts[0], unit: parts[1] || 'MIN' };
}

export default function RitualStepCard({ position, step, detail, variant }) {
  const { num, unit } = parseTime(step.time);

  return (
    <>
      <style>{CSS}</style>
      <div className="rsc">
        <div className="rsc-header">
          <div className={`rsc-badge ${variant}`}>{String(position).padStart(2, '0')}</div>
          <div className="rsc-meta">
            <div className={`rsc-product ${variant}`}>Product {step.num}</div>
            <div className="rsc-name">{step.name}</div>
          </div>
          <div className="rsc-time-block">
            <div className={`rsc-time-num ${variant}`}>{num}</div>
            <div className="rsc-time-unit">{unit} · {step.zone}</div>
          </div>
        </div>

        <div className="rsc-body">
          <RitualVideoPlaceholder productNum={step.num} time={step.time} variant={variant} />

          <div className="rsc-instructions">
            {detail?.steps?.length > 0 && (
              <>
                <div className="rsc-section-label">How to use</div>
                <div className="rsc-steps">
                  {detail.steps.map((s, i) => (
                    <div className="rsc-step-row" key={i}>
                      <div className="rsc-step-n">{i + 1}</div>
                      <div className="rsc-step-t">{s}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {detail?.warning && (
              <div className="rsc-warning">
                <div className="rsc-warning-label">⚠ Warning</div>
                <div className="rsc-warning-body">{detail.warning}</div>
              </div>
            )}

            {detail?.tip && (
              <div className={`rsc-tip ${variant}`}>
                <div className={`rsc-tip-label ${variant}`}>Tip</div>
                <div className="rsc-tip-body">{detail.tip}</div>
              </div>
            )}

            {detail?.upgrade && (
              <div className="rsc-upgrade">
                <div className="rsc-upgrade-label">
                  <span className="rsc-upgrade-arrow">↑</span>
                  {detail.upgrade.label}
                </div>
                <div className="rsc-upgrade-body">{detail.upgrade.body}</div>
              </div>
            )}

            {detail?.why && (
              <>
                <div className="rsc-section-label">Why it matters</div>
                <div className="rsc-why">{detail.why}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
