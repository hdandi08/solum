import { PRODUCTS } from '../../data/products.js';

const DAILY_PRODUCT_NUMS = ['04', '03', '01', '08', '07'];

const DAILY_STEPS = [
  {
    id: 'scalp',
    num: '01',
    emoji: '💆',
    label: 'SCALP',
    zone: 'HEAD & SCALP',
    time: '1–2',
    unit: 'MIN',
    productNums: ['04'],
    actions: [
      'Wet hair — add your shampoo directly to the scalp',
      'Place the massager flat at your hairline',
      'Firm circles, front to back — cover the full head',
    ],
    tip: 'Light-to-medium pressure only. You\'re stimulating blood flow, not scrubbing.',
  },
  {
    id: 'body',
    num: '02',
    emoji: '🚿',
    label: 'BODY',
    zone: 'NECK TO TOES',
    time: '4–5',
    unit: 'MIN',
    productNums: ['03', '01', '08'],
    actions: [
      'Add one pump of body wash to the wet back scrub cloth',
      'Scrub neck → shoulders → chest → back → hips → legs → toes',
      'For the back: one handle each hand, drape over shoulder, saw across every zone',
      'Switch to the soft cleansing cloth for below the belt — thorough and gentle',
    ],
    tip: 'One pump is enough. The back cloth is the only tool that reaches every zone of your back.',
  },
  {
    id: 'seal',
    num: '03',
    emoji: '💧',
    label: 'SEAL',
    zone: 'FULL BODY',
    time: '≤3',
    unit: 'MIN',
    productNums: ['07'],
    actions: [
      'Rinse off completely',
      'Towel dry — your 3-minute clock starts now',
      'Two pumps of lotion — press into skin from feet upward. Don\'t rub. Press.',
    ],
    tip: 'Skin absorbs 70% more moisture while still warm. Miss the window and the lotion just sits on the surface.',
  },
];

const CSS = `
.rdg { max-width: 1400px; margin: 0 auto; padding: 40px 48px 80px; }

/* ── VIDEO ── */
.rdg-video {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  max-height: 600px;
  background: var(--dark);
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  overflow: hidden;
  margin-bottom: 40px;
}
.rdg-video-glow {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at 50% 60%, rgba(46,109,164,0.12), transparent 65%);
  pointer-events: none;
}
.rdg-video-ghost {
  position: absolute;
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(120px, 18vw, 220px);
  letter-spacing: -4px;
  color: transparent;
  -webkit-text-stroke: 1px rgba(46,109,164,0.06);
  user-select: none; pointer-events: none;
  bottom: -20px; right: 24px;
}
.rdg-play-btn {
  position: relative; z-index: 2;
  width: 80px; height: 80px;
  border-radius: 50%;
  border: 2px solid rgba(46,109,164,0.5);
  background: rgba(46,109,164,0.1);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}
.rdg-play-btn:hover { background: rgba(46,109,164,0.2); border-color: var(--blue); }
.rdg-play-triangle {
  width: 0; height: 0;
  border-style: solid;
  border-width: 13px 0 13px 24px;
  border-color: transparent transparent transparent var(--blue);
  margin-left: 5px;
}
.rdg-video-label {
  position: relative; z-index: 2;
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  color: var(--stone);
}
.rdg-video-badge {
  position: absolute; top: 16px; left: 18px; z-index: 3;
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); background: rgba(8,9,11,0.75);
  padding: 5px 12px; backdrop-filter: blur(4px);
}

/* ── WHAT YOU NEED ── */
.rdg-kit { margin-bottom: 40px; }
.rdg-kit-head {
  display: flex; align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.rdg-kit-eyebrow {
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--stone);
}
.rdg-kit-count {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--blit);
}
.rdg-kit-rail {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.rdg-kit-card {
  background: var(--char);
  border: 1px solid var(--line);
  overflow: hidden;
  display: flex; flex-direction: column;
}
.rdg-kit-img-wrap {
  aspect-ratio: 1/1;
  background: var(--dark);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
}
.rdg-kit-img {
  width: 80%; height: 80%;
  object-fit: contain;
  mix-blend-mode: lighten;
}
.rdg-kit-info { padding: 12px 14px; }
.rdg-kit-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 13px; letter-spacing: .08em; color: var(--blue);
  margin-bottom: 3px;
}
.rdg-kit-name {
  font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--bone); font-weight: 600; line-height: 1.3;
}
.rdg-kit-tag {
  font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--stone); margin-top: 4px;
}

/* ── TIMELINE ── */
.rdg-timeline { margin-bottom: 40px; }
.rdg-tl-head {
  display: flex; align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}
.rdg-tl-eyebrow {
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--stone);
}
.rdg-tl-total {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px; letter-spacing: .06em; color: var(--blue);
}
.rdg-tl-bar {
  display: flex; gap: 3px; height: 52px;
}
.rdg-tl-seg {
  display: flex; flex-direction: column;
  justify-content: center; padding: 0 16px;
  overflow: hidden;
}
.rdg-tl-seg.s1 { flex: 2; background: rgba(46,109,164,0.10); border: 1px solid rgba(46,109,164,0.15); }
.rdg-tl-seg.s2 { flex: 5; background: rgba(46,109,164,0.18); border: 1px solid rgba(46,109,164,0.25); }
.rdg-tl-seg.s3 { flex: 3; background: rgba(46,109,164,0.10); border: 1px solid rgba(46,109,164,0.15); }
.rdg-tl-name {
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--bone); font-weight: 600; line-height: 1;
  display: flex; align-items: center; gap: 6px;
}
.rdg-tl-dur {
  font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--stone); margin-top: 4px;
}

/* ── STEP CARDS ── */
.rdg-step {
  background: var(--char);
  border: 1px solid var(--line);
  margin-bottom: 14px;
  overflow: hidden;
}
.rdg-step:last-of-type { margin-bottom: 0; }

.rdg-step-header {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  border-bottom: 1px solid var(--line);
}
.rdg-step-num-col {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; padding: 20px 0;
  border-right: 1px solid var(--line);
  background: rgba(46,109,164,0.05);
}
.rdg-step-n {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 34px; letter-spacing: .04em;
  color: var(--blue); line-height: 1;
}
.rdg-step-ico { font-size: 20px; line-height: 1; }

.rdg-step-meta {
  padding: 18px 24px;
  display: flex; flex-direction: column; justify-content: center; gap: 6px;
}
.rdg-step-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 30px; letter-spacing: .08em; color: var(--bone); line-height: 1;
}
.rdg-step-zone {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--stone);
}
.rdg-step-prods {
  display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px;
}
.rdg-step-prod {
  display: flex; align-items: center; gap: 8px;
  background: rgba(46,109,164,0.06);
  border: 1px solid rgba(46,109,164,0.18);
  padding: 5px 10px 5px 6px;
}
.rdg-step-prod-img {
  width: 28px; height: 28px;
  object-fit: contain;
  mix-blend-mode: lighten;
  flex-shrink: 0;
}
.rdg-step-prod-txt {}
.rdg-step-prod-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 12px; letter-spacing: .06em; color: var(--blue); line-height: 1;
}
.rdg-step-prod-name {
  font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
  color: var(--stone); line-height: 1.3; margin-top: 1px;
}

.rdg-step-time-col {
  padding: 20px 28px;
  display: flex; flex-direction: column;
  align-items: flex-end; justify-content: center; gap: 2px;
  border-left: 1px solid var(--line);
}
.rdg-step-time-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 52px; line-height: 1;
  letter-spacing: -.5px; color: var(--blue);
}
.rdg-step-time-lbl {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--stone);
}

/* ── ACTIONS ── */
.rdg-step-body { padding: 28px; }
.rdg-actions { margin-bottom: 20px; }
.rdg-action {
  display: grid; grid-template-columns: 30px 1fr;
  gap: 14px; padding: 12px 0;
  border-bottom: 1px solid var(--line);
  align-items: start;
}
.rdg-action:last-child { border-bottom: none; }
.rdg-action-badge {
  width: 26px; height: 26px;
  background: rgba(46,109,164,0.1);
  border: 1px solid rgba(46,109,164,0.3);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 15px; color: var(--blue);
  flex-shrink: 0; margin-top: 2px;
}
.rdg-action-text {
  font-size: 15px; font-weight: 300; color: var(--bone); line-height: 1.65;
}

/* ── TIP ── */
.rdg-tip {
  background: rgba(46,109,164,0.06);
  border-left: 2px solid var(--blue);
  padding: 14px 18px;
  display: flex; gap: 10px; align-items: flex-start;
}
.rdg-tip-ico { font-size: 14px; flex-shrink: 0; margin-top: 2px; }
.rdg-tip-text {
  font-size: 13px; font-weight: 300; color: var(--mist); line-height: 1.65;
}

/* ── RESPONSIVE ── */
@media(max-width: 900px) {
  .rdg-kit-rail { grid-template-columns: repeat(5, minmax(120px, 1fr)); overflow-x: auto; }
}
@media(max-width: 768px) {
  .rdg { padding: 24px 20px 60px; }
  .rdg-kit-rail { gap: 8px; }
  .rdg-kit-info { padding: 10px 12px; }
  .rdg-step-header { grid-template-columns: 64px 1fr auto; }
  .rdg-step-num-col { padding: 16px 0; }
  .rdg-step-n { font-size: 26px; }
  .rdg-step-ico { font-size: 17px; }
  .rdg-step-name { font-size: 24px; }
  .rdg-step-time-val { font-size: 38px; }
  .rdg-step-time-col { padding: 16px 18px; }
  .rdg-step-meta { padding: 14px 16px; }
  .rdg-step-body { padding: 20px; }
  .rdg-action-text { font-size: 14px; }
  .rdg-tl-bar { height: 44px; }
  .rdg-tl-seg { padding: 0 10px; }
  .rdg-tl-dur { display: none; }
  .rdg-tl-name { font-size: 10px; letter-spacing: 2px; }
  .rdg-step-prod-name { display: none; }
}
`;

function ProductRail() {
  const dailyProducts = DAILY_PRODUCT_NUMS.map(n => PRODUCTS.find(p => p.num === n)).filter(Boolean);
  return (
    <div className="rdg-kit">
      <div className="rdg-kit-head">
        <div className="rdg-kit-eyebrow">What you need</div>
        <div className="rdg-kit-count">{dailyProducts.length} Products</div>
      </div>
      <div className="rdg-kit-rail">
        {dailyProducts.map(p => (
          <div key={p.num} className="rdg-kit-card">
            <div className="rdg-kit-img-wrap">
              <img src={p.image} alt={p.name} className="rdg-kit-img" loading="lazy" />
            </div>
            <div className="rdg-kit-info">
              <div className="rdg-kit-num">PRODUCT · {p.num}</div>
              <div className="rdg-kit-name">{p.name}</div>
              <div className="rdg-kit-tag">{p.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyStep({ step }) {
  const stepProducts = step.productNums.map(n => PRODUCTS.find(p => p.num === n)).filter(Boolean);
  return (
    <div className="rdg-step">
      <div className="rdg-step-header">
        <div className="rdg-step-num-col">
          <div className="rdg-step-n">{step.num}</div>
          <div className="rdg-step-ico">{step.emoji}</div>
        </div>
        <div className="rdg-step-meta">
          <div className="rdg-step-name">{step.label}</div>
          <div className="rdg-step-zone">{step.zone}</div>
          <div className="rdg-step-prods">
            {stepProducts.map(p => (
              <div key={p.num} className="rdg-step-prod">
                <img src={p.image} alt={p.name} className="rdg-step-prod-img" />
                <div className="rdg-step-prod-txt">
                  <div className="rdg-step-prod-num">{p.num}</div>
                  <div className="rdg-step-prod-name">{p.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rdg-step-time-col">
          <div className="rdg-step-time-val">{step.time}</div>
          <div className="rdg-step-time-lbl">{step.unit}</div>
        </div>
      </div>

      <div className="rdg-step-body">
        <div className="rdg-actions">
          {step.actions.map((text, i) => (
            <div className="rdg-action" key={i}>
              <div className="rdg-action-badge">{i + 1}</div>
              <div className="rdg-action-text">{text}</div>
            </div>
          ))}
        </div>
        <div className="rdg-tip">
          <span className="rdg-tip-ico">💡</span>
          <span className="rdg-tip-text">{step.tip}</span>
        </div>
      </div>
    </div>
  );
}

export default function RitualDailyGuide() {
  return (
    <>
      <style>{CSS}</style>
      <div className="rdg">

        {/* WHAT YOU NEED */}
        <ProductRail />

        {/* SINGLE VIDEO */}
        <div className="rdg-video">
          <div className="rdg-video-glow" />
          <div className="rdg-video-ghost">10</div>
          <div className="rdg-play-btn">
            <div className="rdg-play-triangle" />
          </div>
          <div className="rdg-video-label">Daily Ritual · 90 Seconds</div>
          <div className="rdg-video-badge">Video Coming Soon</div>
        </div>

        {/* TIMELINE INFOGRAPHIC */}
        <div className="rdg-timeline">
          <div className="rdg-tl-head">
            <div className="rdg-tl-eyebrow">Your daily ritual</div>
            <div className="rdg-tl-total">10 MIN TOTAL</div>
          </div>
          <div className="rdg-tl-bar">
            <div className="rdg-tl-seg s1">
              <div className="rdg-tl-name">💆 Scalp</div>
              <div className="rdg-tl-dur">1–2 min</div>
            </div>
            <div className="rdg-tl-seg s2">
              <div className="rdg-tl-name">🚿 Body</div>
              <div className="rdg-tl-dur">4–5 min</div>
            </div>
            <div className="rdg-tl-seg s3">
              <div className="rdg-tl-name">💧 Seal</div>
              <div className="rdg-tl-dur">2–3 min</div>
            </div>
          </div>
        </div>

        {/* 3 STEP CARDS */}
        {DAILY_STEPS.map(step => (
          <DailyStep key={step.id} step={step} />
        ))}

      </div>
    </>
  );
}
