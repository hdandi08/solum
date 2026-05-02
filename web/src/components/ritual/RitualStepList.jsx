import RitualStepCard from './RitualStepCard';
import { PRODUCTS } from '../../data/products.js';
import { WEEKLY_PRODUCT_NUMS } from '../../data/rituals.js';

const CSS = `
.rp-steps { max-width: 1400px; margin: 0 auto; padding: 40px 48px 80px; }

.rp-kit { margin-bottom: 40px; }
.rp-kit-head {
  display: flex; align-items: baseline;
  justify-content: space-between; margin-bottom: 14px;
}
.rp-kit-eyebrow {
  font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--stone);
}
.rp-kit-count { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; }
.rp-kit-count-weekly { color: #c8a96e; }
.rp-kit-rail {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.rp-kit-card {
  background: var(--char); border: 1px solid var(--line);
  overflow: hidden; display: flex; flex-direction: column;
}
.rp-kit-img-wrap {
  aspect-ratio: 1/1; background: var(--dark);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; border-bottom: 1px solid var(--line);
}
.rp-kit-img { width: 80%; height: 80%; object-fit: contain; mix-blend-mode: lighten; }
.rp-kit-img-placeholder { font-size: 28px; color: var(--stone); line-height: 1; }
.rp-kit-info { padding: 12px 14px; }
.rp-kit-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 13px; letter-spacing: .08em; margin-bottom: 3px;
}
.rp-kit-num-weekly { color: #c8a96e; }
.rp-kit-name {
  font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--bone); font-weight: 600; line-height: 1.3;
}
.rp-kit-tag {
  font-size: 10px; letter-spacing: 1px; text-transform: uppercase;
  color: var(--stone); margin-top: 4px;
}

@media(max-width: 900px) {
  .rp-kit-rail { grid-template-columns: repeat(5, minmax(110px, 1fr)); overflow-x: auto; }
}
@media(max-width: 768px) {
  .rp-kit-rail { grid-template-columns: repeat(5, 100px); overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
}
@media(max-width: 768px) {
  .rp-steps { padding: 24px 20px 60px; }
  .rp-kit-info { padding: 10px 12px; }
}
`;

function ProductRail({ steps, variant }) {
  const productNums = variant === 'weekly' ? WEEKLY_PRODUCT_NUMS : steps.map(s => s.num);
  const products = productNums
    .map(n => PRODUCTS.find(p => p.num === n))
    .filter(Boolean);
  const isWeekly = variant === 'weekly';

  return (
    <div className="rp-kit">
      <div className="rp-kit-head">
        <div className="rp-kit-eyebrow">What you need</div>
        <div className={`rp-kit-count${isWeekly ? ' rp-kit-count-weekly' : ''}`}>
          {products.length} Products
        </div>
      </div>
      <div className="rp-kit-rail">
        {products.map(p => (
          <div key={p.num} className="rp-kit-card">
            <div className="rp-kit-img-wrap">
              {p.image
                ? <img src={p.image} alt={p.name} className="rp-kit-img" loading="lazy" />
                : <div className="rp-kit-img-placeholder">○</div>
              }
            </div>
            <div className="rp-kit-info">
              <div className={`rp-kit-num${isWeekly ? ' rp-kit-num-weekly' : ''}`}>
                PRODUCT · {p.num}
              </div>
              <div className="rp-kit-name">{p.name}</div>
              <div className="rp-kit-tag">{p.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RitualStepList({ steps, details, variant }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="rp-steps">
        <ProductRail steps={steps} variant={variant} />
        {steps.map((step, i) => (
          <RitualStepCard
            key={step.num}
            position={i + 1}
            step={step}
            detail={details[step.num]}
            variant={variant}
          />
        ))}
      </div>
    </>
  );
}
