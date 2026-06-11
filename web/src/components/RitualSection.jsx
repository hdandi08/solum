import { capture } from '../lib/analytics.js';

const CSS = `
/* ── Section shell ─────────────────────────────── */
.ritual-section{background:var(--black);border-top:1px solid var(--line);padding:80px 24px;}
.ritual-inner{max-width:1100px;margin:0 auto;}
.ritual-section-tag{font-size:11px;letter-spacing:6px;text-transform:uppercase;color:var(--blit);font-weight:600;text-align:center;margin-bottom:14px;}
.ritual-section-head{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:.95;text-align:center;margin-bottom:12px;}
.ritual-section-sub{font-size:15px;font-weight:300;color:var(--stone);text-align:center;margin:0 auto 56px;max-width:460px;line-height:1.6;}

/* ── Two panels ────────────────────────────────── */
.ritual-panels{display:flex;flex-direction:column;gap:1px;background:var(--line);}
.ritual-panel{background:var(--char);padding:40px 28px;}
.ritual-panel-badge{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;margin-bottom:20px;}
.ritual-panel-badge-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.ritual-panel-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4vw,42px);letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:8px;}
.ritual-panel-desc{font-size:14px;font-weight:300;color:var(--stone);line-height:1.6;margin-bottom:32px;}

/* ── Mobile: vertical step list ────────────────── */
.ritual-steps-mobile{display:flex;flex-direction:column;gap:0;position:relative;padding-left:24px;margin-bottom:32px;}
.ritual-steps-mobile::before{content:'';position:absolute;left:15px;top:16px;bottom:16px;width:1px;}
.ritual-steps-mobile.daily::before{background:linear-gradient(to bottom,var(--blue),rgba(46,109,164,0.2));}
.ritual-steps-mobile.weekly::before{background:linear-gradient(to bottom,#c8a96e,rgba(200,169,110,0.2));}
.ritual-step-row{display:flex;align-items:flex-start;gap:16px;padding:14px 0;}
.ritual-step-circle{width:32px;height:32px;border-radius:50%;background:var(--black);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-left:-24px;position:relative;z-index:1;}
.ritual-step-circle.daily{border:1.5px solid var(--blue);}
.ritual-step-circle.weekly{border:1.5px solid #c8a96e;}
.ritual-step-circle-num{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:.04em;}
.ritual-step-circle-num.daily{color:var(--blit);}
.ritual-step-circle-num.weekly{color:#c8a96e;}
.ritual-step-info{padding-top:4px;}
.ritual-step-name{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--bone);font-weight:700;margin-bottom:2px;}
.ritual-step-time{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);margin-bottom:3px;}
.ritual-step-note{font-size:12px;font-weight:300;color:var(--mist);font-style:italic;line-height:1.5;}

/* ── Panel CTA ─────────────────────────────────── */
.ritual-panel-cta{display:inline-flex;align-items:center;gap:8px;font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;padding:12px 28px;text-decoration:none;transition:background .2s,color .2s,border-color .2s;}
.ritual-panel-cta.daily{color:var(--bone);border:1px solid rgba(240,236,226,0.3);}
.ritual-panel-cta.daily:hover{border-color:var(--bone);}
.ritual-panel-cta.weekly{color:#c8a96e;border:1px solid rgba(200,169,110,0.4);}
.ritual-panel-cta.weekly:hover{border-color:#c8a96e;}
.ritual-panel-cta svg{transition:transform .2s;}
.ritual-panel-cta:hover svg{transform:translateX(3px);}

/* ── Desktop: side by side + horizontal flows ──── */
@media(min-width:800px){
  .ritual-panels{flex-direction:row;}
  .ritual-panel{flex:1;padding:48px 40px;}

  .ritual-steps-mobile{display:none;}

  .ritual-flow{display:flex;align-items:flex-start;position:relative;gap:0;margin-bottom:36px;}
  .ritual-flow::before{content:'';position:absolute;top:22px;left:calc(100%/10);right:calc(100%/10);height:1px;z-index:0;}
  .ritual-flow.daily::before{background:var(--blue);}
  .ritual-flow.weekly::before{background:#c8a96e;}
  .ritual-flow-step{flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;position:relative;z-index:1;padding:0 4px;}
  .ritual-flow-circle{width:44px;height:44px;border-radius:50%;background:var(--char);display:flex;align-items:center;justify-content:center;}
  .ritual-flow-circle.daily{border:1.5px solid var(--blue);}
  .ritual-flow-circle.weekly{border:1.5px solid #c8a96e;}
  .ritual-flow-num{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.04em;}
  .ritual-flow-num.daily{color:var(--blit);}
  .ritual-flow-num.weekly{color:#c8a96e;}
  .ritual-flow-name{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--bone);font-weight:700;text-align:center;line-height:1.3;}
  .ritual-flow-time{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--stone);text-align:center;}
  .ritual-flow-note{font-size:11px;font-weight:300;color:var(--mist);font-style:italic;text-align:center;line-height:1.5;}
}

@media(min-width:800px) and (max-width:1099px){
  .ritual-flow-note{display:none;}
}

@media(max-width:799px){
  .ritual-flow{display:none;}
  .ritual-section{padding:60px 24px;}
  .ritual-panels{display:none;}
  .ritual-compact{display:flex;flex-direction:column;gap:1px;background:var(--line);}
}
@media(min-width:800px){
  .ritual-compact{display:none;}
}
/* Compact rows */
.ritual-compact-row{display:flex;align-items:center;justify-content:space-between;background:var(--char);padding:24px 28px;text-decoration:none;transition:background .15s;}
.ritual-compact-row:hover,.ritual-compact-row:active{background:var(--mid);}
.ritual-compact-left{display:flex;align-items:center;gap:16px;}
.ritual-compact-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.ritual-compact-pip.daily{background:var(--blue);}
.ritual-compact-pip.weekly{background:#c8a96e;}
.ritual-compact-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:.05em;color:var(--bone);line-height:1;margin-bottom:4px;}
.ritual-compact-meta{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--stone);font-weight:500;}
.ritual-compact-arrow{font-size:22px;color:var(--blue);flex-shrink:0;}
`;

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h10M8 3l4 4-4 4"/>
  </svg>
);

const DAILY = [
  { num: '04', name: 'Scalp Massager',  time: '2–3 MIN', note: 'Small firm circles, hairline to back.' },
  { num: '01', name: 'Body Wash',        time: '1 MIN',   note: 'Amino acid formula. No sulphates.' },
  { num: '03', name: 'Back Scrub Cloth', time: '1 MIN',   note: 'Drape over shoulder, saw back and forth.' },
  { num: '08', name: 'Cleansing Cloth',  time: '30 SEC',  note: 'Sensitive areas. Nothing left uncleaned.' },
  { num: '07', name: 'Body Lotion',      time: '1 MIN',   note: 'Within 3 minutes of towelling.' },
];

const WEEKLY = [
  { num: '05', name: 'Atlas Clay Mask',   time: '3 MIN',    note: 'Head to toe. Leave 8–10 min.' },
  { num: '04', name: 'Scalp Oil Massage', time: '8–10 MIN', note: 'Argan oil into scalp while clay works.' },
  { num: '02', name: 'Italy Towel Mitt',  time: '4–5 MIN',  note: 'Scrub clay off. Dead skin rolls off.' },
  { num: '06', name: 'Argan Body Oil',    time: '2–3 MIN',  note: 'Press into damp skin. No lotion today.' },
];

function StepFlow({ steps, variant }) {
  return (
    <>
      {/* Desktop */}
      <div className={`ritual-flow ${variant}`}>
        {steps.map(s => (
          <div key={s.num + s.name} className="ritual-flow-step">
            <div className={`ritual-flow-circle ${variant}`}>
              <span className={`ritual-flow-num ${variant}`}>{s.num}</span>
            </div>
            <div className="ritual-flow-name">{s.name}</div>
            <div className="ritual-flow-time">{s.time}</div>
            <div className="ritual-flow-note">{s.note}</div>
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className={`ritual-steps-mobile ${variant}`}>
        {steps.map(s => (
          <div key={s.num + s.name} className="ritual-step-row">
            <div className={`ritual-step-circle ${variant}`}>
              <span className={`ritual-step-circle-num ${variant}`}>{s.num}</span>
            </div>
            <div className="ritual-step-info">
              <div className="ritual-step-name">{s.name}</div>
              <div className="ritual-step-time">{s.time}</div>
              <div className="ritual-step-note">{s.note}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function RitualSection() {
  return (
    <>
      <style>{CSS}</style>
      <section className="ritual-section" id="ritual">
        <div className="ritual-inner">
          <div className="ritual-section-tag reveal">The Ritual</div>
          <div className="ritual-section-head reveal">Two Rituals.<br />One System.</div>
          <p className="ritual-section-sub reveal">Daily keeps you clean. Weekly goes deeper. Follow both exactly.</p>

          {/* Mobile compact view — replaces full panels on small screens */}
          <div className="ritual-compact reveal">
            <a href="/ritual?ritual=daily" className="ritual-compact-row"
               onClick={() => capture('ritual_cta_clicked', { ritual: 'daily', source: 'compact' })}>
              <div className="ritual-compact-left">
                <span className="ritual-compact-pip daily" />
                <div>
                  <div className="ritual-compact-title">Daily Ritual</div>
                  <div className="ritual-compact-meta">10 min · 5 steps · Every shower</div>
                </div>
              </div>
              <span className="ritual-compact-arrow">→</span>
            </a>
            <a href="/ritual?ritual=weekly" className="ritual-compact-row"
               onClick={() => capture('ritual_cta_clicked', { ritual: 'weekly', source: 'compact' })}>
              <div className="ritual-compact-left">
                <span className="ritual-compact-pip weekly" />
                <div>
                  <div className="ritual-compact-title">Weekly Deep Clean</div>
                  <div className="ritual-compact-meta">18 min · 4 steps · Once a week</div>
                </div>
              </div>
              <span className="ritual-compact-arrow">→</span>
            </a>
          </div>

          <div className="ritual-panels reveal">

            {/* Daily */}
            <div className="ritual-panel">
              <div className="ritual-panel-badge" style={{ color: 'var(--blit)' }}>
                <span className="ritual-panel-badge-dot" style={{ background: 'var(--blue)' }} />
                Daily · 10 Minutes · Every Shower
              </div>
              <div className="ritual-panel-title">10 Minutes.<br />Every Shower.</div>
              <p className="ritual-panel-desc">Five steps in the shower you already take. Follow the numbers.</p>
              <StepFlow steps={DAILY} variant="daily" />
              <a href="/ritual?ritual=daily" className="ritual-panel-cta daily"
                 onClick={() => capture('ritual_cta_clicked', { ritual: 'daily' })}>
                Full Daily Guide {ARROW}
              </a>
            </div>

            {/* Weekly */}
            <div className="ritual-panel" style={{ borderLeft: '1px solid var(--line)' }}>
              <div className="ritual-panel-badge" style={{ color: '#c8a96e' }}>
                <span className="ritual-panel-badge-dot" style={{ background: '#c8a96e' }} />
                Weekly · 18 Minutes · Once a Week
              </div>
              <div className="ritual-panel-title">18 Minutes.<br />Once a Week.</div>
              <p className="ritual-panel-desc">Replaces the daily ritual. Goes deeper — clay, oil, full exfoliation.</p>
              <StepFlow steps={WEEKLY} variant="weekly" />
              <a href="/ritual?ritual=weekly" className="ritual-panel-cta weekly"
                 onClick={() => capture('ritual_cta_clicked', { ritual: 'weekly' })}>
                Full Weekly Guide {ARROW}
              </a>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
