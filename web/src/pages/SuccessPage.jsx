import { useSearchParams, Link } from 'react-router-dom';
import { KITS } from '../data/kits.js';

const CSS = `
.su-page{min-height:100vh;background:var(--black);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;position:relative;overflow:hidden;}
.su-page::before{content:'';position:absolute;inset:0;z-index:0;background-image:linear-gradient(rgba(46,109,164,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(46,109,164,0.03) 1px,transparent 1px);background-size:80px 80px;}
.su-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:800px;height:600px;background:radial-gradient(ellipse,rgba(46,109,164,0.07) 0%,transparent 70%);pointer-events:none;}
.su-inner{position:relative;z-index:1;max-width:640px;width:100%;text-align:center;}

.su-check{width:56px;height:56px;border-radius:50%;border:1.5px solid var(--blue);display:flex;align-items:center;justify-content:center;margin:0 auto 32px;font-size:22px;}
.su-eyebrow{font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.su-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,8vw,96px);letter-spacing:.04em;color:var(--bone);line-height:.95;margin-bottom:24px;}
.su-kit{display:inline-block;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);border:1px solid var(--lineb);padding:6px 16px;margin-bottom:24px;}
.su-ref-block{background:var(--char);border:1px solid var(--lineb);padding:24px 32px;margin-bottom:40px;width:100%;box-sizing:border-box;}
.su-ref-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-bottom:8px;}
.su-ref-num{font-family:'Bebas Neue',sans-serif;font-size:48px;letter-spacing:.1em;color:var(--bone);line-height:1;}
.su-ref-note{font-size:12px;color:var(--stone);font-weight:300;margin-top:6px;}
.su-divider{width:100%;height:1px;background:var(--line);margin-bottom:40px;}

/* What happens next */
.su-next-label{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:28px;}
.su-steps{display:flex;flex-direction:column;gap:0;text-align:left;border:1px solid var(--lineb);}
.su-step{display:flex;align-items:flex-start;gap:20px;padding:20px 24px;border-bottom:1px solid var(--line);}
.su-step:last-child{border-bottom:none;}
.su-step-num{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--blue);line-height:1;flex-shrink:0;width:28px;text-align:center;}
.su-step-body{display:flex;flex-direction:column;gap:4px;}
.su-step-title{font-size:15px;color:var(--bone);font-weight:500;letter-spacing:.3px;}
.su-step-copy{font-size:14px;color:var(--stone);font-weight:300;line-height:1.5;}

.su-divider2{width:100%;height:1px;background:var(--line);margin:40px 0;}

/* Ritual teaser */
.su-ritual-label{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:16px;}
.su-ritual-copy{font-size:15px;color:var(--mist);font-weight:300;line-height:1.7;margin-bottom:28px;max-width:480px;margin-left:auto;margin-right:auto;}
.su-ritual-pills{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:40px;}
.su-pill{display:flex;align-items:center;gap:8px;padding:8px 16px;border:1px solid var(--lineb);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--mist);font-weight:500;}
.su-pill-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.su-pill-dot.blue{background:var(--blit);}
.su-pill-dot.gold{background:#c8a96e;}

/* Actions */
.su-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;}
.su-btn-primary{font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.12em;background:var(--bone);color:var(--black);padding:16px 40px;text-decoration:none;display:inline-block;transition:background .2s,transform .15s;}
.su-btn-primary:hover{background:#fff;transform:translateY(-1px);}
.su-btn-ghost{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;border-bottom:1px solid var(--lineb);padding-bottom:3px;transition:color .2s,border-color .2s;display:inline-flex;align-items:center;}
.su-btn-ghost:hover{color:var(--bone);border-color:var(--blue);}

@media(max-width:600px){.su-steps{border:none;gap:1px;background:var(--line);}.su-step{background:var(--char);}}
`;

export default function SuccessPage() {
  const [params] = useSearchParams();
  const kitId    = params.get('kit');
  const rawRef   = params.get('ref') ?? '';
  const kit      = KITS.find(k => k.id === kitId);
  const kitName  = kit?.name ?? 'SOLUM';
  const orderRef = rawRef ? rawRef.slice(-8).toUpperCase() : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="su-page">
        <div className="su-glow" />
        <div className="su-inner">

          <div className="su-check">✓</div>
          <div className="su-eyebrow">Order confirmed</div>
          <h1 className="su-heading">Ritual<br />Begins.</h1>
          <div className="su-kit">{kitName} Kit</div>
          {orderRef && (
            <div className="su-ref-block">
              <div className="su-ref-label">Order Reference</div>
              <div className="su-ref-num">#{orderRef}</div>
              <div className="su-ref-note">Keep this for your records</div>
            </div>
          )}

          <div className="su-divider" />

          <div className="su-next-label">What happens next</div>
          <div className="su-steps">
            <div className="su-step">
              <span className="su-step-num">1</span>
              <div className="su-step-body">
                <div className="su-step-title">Confirmation email on its way</div>
                <div className="su-step-copy">Check your inbox — your order details and receipt are there.</div>
              </div>
            </div>
            <div className="su-step">
              <span className="su-step-num">2</span>
              <div className="su-step-body">
                <div className="su-step-title">First box ships within a week</div>
                <div className="su-step-copy">Your full {kitName} kit — tools and consumables — packed and dispatched. You'll get a separate email with your tracking link once it's on its way.</div>
              </div>
            </div>
            <div className="su-step">
              <span className="su-step-num">3</span>
              <div className="su-step-body">
                <div className="su-step-title">Monthly refills on the 1st</div>
                <div className="su-step-copy">Consumables replenish automatically. Your first box lasts 4–6 weeks — you won't run out before the first refill arrives.</div>
              </div>
            </div>
            <div className="su-step">
              <span className="su-step-num">4</span>
              <div className="su-step-body">
                <div className="su-step-title">Ritual card is in the box</div>
                <div className="su-step-copy">Step-by-step instructions for your daily and weekly ritual. Everything you need, in the right order.</div>
              </div>
            </div>
          </div>

          <div className="su-divider2" />

          <div className="su-ritual-label">Your ritual at a glance</div>
          <p className="su-ritual-copy">
            10 minutes every morning. 18 minutes once a week. That's all it takes to go from showering to actually being clean.
          </p>
          <div className="su-ritual-pills">
            <div className="su-pill"><span className="su-pill-dot blue" />Daily · 10 min</div>
            <div className="su-pill"><span className="su-pill-dot gold" />Weekly · 18 min</div>
            <div className="su-pill"><span className="su-pill-dot blue" />Head to toe</div>
          </div>

          <div className="su-actions">
            <a href="/full#ritual" className="su-btn-primary">See Your Ritual →</a>
            <a href="/account" className="su-btn-ghost">Manage subscription</a>
          </div>

        </div>
      </div>
    </>
  );
}
