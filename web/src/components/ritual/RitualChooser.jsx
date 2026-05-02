import { PRODUCTS } from '../../data/products.js';

const RITUALS = [
  {
    id: 'daily',
    freq: 'EVERY MORNING',
    title: 'DAILY RITUAL',
    time: '10',
    timeLabel: 'MINUTE RITUAL',
    steps: 3,
    desc: 'Your morning baseline. Scalp to skin — the foundation everything else builds on.',
    productNums: ['04', '01', '03', '08', '07'],
    bgProductNum: '07',
  },
  {
    id: 'weekly',
    freq: 'ONCE A WEEK',
    title: 'WEEKLY RITUAL',
    time: '22',
    timeLabel: 'MINUTE RITUAL',
    steps: 4,
    desc: 'The deeper clean. Atlas clay, full exfoliation, argan oil. Replaces your daily.',
    productNums: ['05', '06', '04', '02', '11'],
    bgProductNum: '06',
  },
];

const CSS = `
.rc { padding: 64px 48px 80px; max-width: 1400px; margin: 0 auto; }

.rc-header { margin-bottom: 48px; }
.rc-eyebrow {
  font-size: 11px; letter-spacing: 6px; text-transform: uppercase;
  font-weight: 600; color: var(--blit); margin-bottom: 14px;
}
.rc-heading {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(52px, 6vw, 88px);
  letter-spacing: .05em; color: var(--bone);
  line-height: 1; margin-bottom: 14px;
}
.rc-sub {
  font-size: 16px; color: var(--stone);
  font-weight: 300; max-width: 480px; line-height: 1.6;
}

.rc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── CARD ── */
.rc-card {
  position: relative;
  background: var(--char);
  border: 1px solid var(--line);
  border-top-width: 2px;
  padding: 44px 40px 36px;
  cursor: pointer;
  overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 540px;
  transition: transform .25s ease, box-shadow .25s ease;
}
.rc-card:hover { transform: translateY(-5px); }
.rc-card-daily  { border-top-color: var(--blue); }
.rc-card-weekly { border-top-color: #c8a96e; }
.rc-card-daily:hover  { box-shadow: 0 12px 48px rgba(46,109,164,0.12); }
.rc-card-weekly:hover { box-shadow: 0 12px 48px rgba(200,169,110,0.10); }

/* background product image */
.rc-bg-img {
  position: absolute;
  right: -20px; bottom: -10px;
  height: 75%;
  max-height: 380px;
  width: auto;
  object-fit: contain;
  pointer-events: none; user-select: none;
  opacity: 0.10;
  mix-blend-mode: luminosity;
  transition: opacity .3s ease;
  filter: grayscale(20%);
}
.rc-card:hover .rc-bg-img { opacity: 0.16; }

/* frequency pill */
.rc-freq {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase;
  font-weight: 600; margin-bottom: 22px;
}
.rc-freq-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.rc-card-daily  .rc-freq { color: var(--blue); }
.rc-card-daily  .rc-freq-dot { background: var(--blue); }
.rc-card-weekly .rc-freq { color: #c8a96e; }
.rc-card-weekly .rc-freq-dot { background: #c8a96e; }

/* title */
.rc-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(52px, 5vw, 76px);
  letter-spacing: .06em; color: var(--bone);
  line-height: 1; margin-bottom: 28px;
}

/* stats */
.rc-stats { display: flex; gap: 36px; margin-bottom: 24px; align-items: flex-end; }
.rc-stat {}
.rc-stat-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 60px; line-height: 1;
}
.rc-stat-lbl {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); margin-top: 4px;
}
.rc-card-daily  .rc-stat-val { color: var(--blue); }
.rc-card-weekly .rc-stat-val { color: #c8a96e; }

/* description */
.rc-desc {
  font-size: 14px; font-weight: 300; color: var(--stone);
  line-height: 1.7; margin-bottom: 32px; flex: 1; max-width: 360px;
}

/* product strip */
.rc-products { margin-bottom: 28px; }
.rc-prod-label {
  font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
  color: var(--stone); margin-bottom: 12px;
}
.rc-prod-strip { display: flex; gap: 8px; }
.rc-prod-thumb {
  flex-shrink: 0;
  width: 64px;
  background: var(--dark);
  border: 1px solid var(--line);
  overflow: hidden;
  transition: border-color .2s;
}
.rc-card-daily  .rc-prod-thumb:hover { border-color: rgba(46,109,164,0.5); }
.rc-card-weekly .rc-prod-thumb:hover { border-color: rgba(200,169,110,0.5); }
.rc-prod-img-wrap {
  aspect-ratio: 1/1;
  display: flex; align-items: center; justify-content: center;
  padding: 8px;
  border-bottom: 1px solid var(--line);
}
.rc-prod-img-wrap img {
  width: 100%; height: 100%;
  object-fit: contain; mix-blend-mode: lighten;
}
.rc-prod-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 11px; letter-spacing: .06em;
  text-align: center; padding: 5px 0;
}
.rc-card-daily  .rc-prod-num { color: var(--blue); }
.rc-card-weekly .rc-prod-num { color: #c8a96e; }
.rc-prod-name {
  font-size: 9px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--stone); text-align: center;
  padding: 0 4px 6px; line-height: 1.3;
}

/* CTA button */
.rc-cta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px;
  border: 1px solid; border-radius: 0;
  font-size: 12px; letter-spacing: 3px; text-transform: uppercase;
  font-weight: 600; cursor: pointer; background: none;
  width: 100%; transition: background .2s, border-color .2s;
}
.rc-card-daily  .rc-cta { color: var(--blue); border-color: rgba(46,109,164,0.3); }
.rc-card-daily  .rc-cta:hover { background: rgba(46,109,164,0.08); border-color: var(--blue); }
.rc-card-weekly .rc-cta { color: #c8a96e; border-color: rgba(200,169,110,0.3); }
.rc-card-weekly .rc-cta:hover { background: rgba(200,169,110,0.06); border-color: #c8a96e; }
.rc-cta-arrow { font-size: 16px; transition: transform .2s; }
.rc-cta:hover .rc-cta-arrow { transform: translateX(4px); }

/* responsive */
@media(max-width: 960px) {
  .rc-grid { grid-template-columns: 1fr; }
  .rc-card  { min-height: auto; }
  .rc-bg-img { height: 60%; opacity: 0.08; }
}
@media(max-width: 768px) {
  .rc { padding: 20px 16px 24px; }
  .rc-header { margin-bottom: 20px; }
  .rc-heading { font-size: 36px; }
  .rc-sub { font-size: 14px; }
  .rc-grid { gap: 10px; }
  .rc-card { padding: 20px 18px 18px; min-height: auto; }
  .rc-freq { margin-bottom: 10px; }
  .rc-title { font-size: 36px; margin-bottom: 12px; }
  .rc-stats { gap: 20px; margin-bottom: 10px; }
  .rc-stat-val { font-size: 36px; }
  .rc-products { display: none; }
  .rc-desc { display: none; }
  .rc-cta { padding: 12px 16px; }
  .rc-bg-img { height: 55%; right: -8px; opacity: 0.09; }
}
`;

function RitualCard({ ritual, onSelect }) {
  const products = ritual.productNums
    .map(n => PRODUCTS.find(p => p.num === n))
    .filter(Boolean);
  const bgProduct = PRODUCTS.find(p => p.num === ritual.bgProductNum);

  return (
    <div
      className={`rc-card rc-card-${ritual.id}`}
      onClick={() => onSelect(ritual.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(ritual.id)}
    >
      {bgProduct?.image && (
        <img src={bgProduct.image} alt="" aria-hidden="true" className="rc-bg-img" />
      )}

      <div className="rc-freq">
        <span className="rc-freq-dot" />
        {ritual.freq}
      </div>

      <div className="rc-products">
        <div className="rc-prod-label">What you need</div>
        <div className="rc-prod-strip">
          {products.map(p => (
            <div key={p.num} className="rc-prod-thumb">
              <div className="rc-prod-img-wrap">
                <img src={p.image} alt={p.name} loading="lazy" />
              </div>
              <div className="rc-prod-num">{p.num}</div>
              <div className="rc-prod-name">{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rc-title">{ritual.title}</div>

      <div className="rc-stats">
        <div className="rc-stat">
          <div className="rc-stat-val">{ritual.time}</div>
          <div className="rc-stat-lbl">{ritual.timeLabel}</div>
        </div>
        <div className="rc-stat">
          <div className="rc-stat-val">{ritual.steps}</div>
          <div className="rc-stat-lbl">STEPS</div>
        </div>
      </div>

      <div className="rc-desc">{ritual.desc}</div>

      <button className="rc-cta" tabIndex={-1}>
        <span>Start {ritual.id} ritual</span>
        <span className="rc-cta-arrow">→</span>
      </button>
    </div>
  );
}

export default function RitualChooser({ onSelect }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="rc">
        <div className="rc-header">
          <div className="rc-eyebrow">The Ritual System</div>
          <div className="rc-heading">Choose Your Ritual</div>
          <p className="rc-sub">Two rituals. One daily, one weekly. Pick where you want to start.</p>
        </div>
        <div className="rc-grid">
          {RITUALS.map(r => (
            <RitualCard key={r.id} ritual={r} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </>
  );
}
