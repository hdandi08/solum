import { PRODUCTS } from '../../data/products.js';

function fmtDay(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
function fmtDate(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

export default function OrderSummary({
  activeKit, dispatch, arrival, firstCharge,
  inventoryAvailable, showUpgradeNudge, ritualKit, kit,
}) {
  const products = PRODUCTS.filter(p => activeKit.productNums.includes(p.num));

  return (
    <div className="co-right">
      {showUpgradeNudge && ritualKit && (
        <div className="co-upgrade">
          <div className="co-upgrade-label">
            <span>★</span> Most customers choose RITUAL
          </div>
          <div className="co-upgrade-copy">
            You're one product away from the full ritual. The argan oil is the step that changes
            what your skin feels like long-term —{' '}
            <strong>most GROUND customers upgrade within 90 days.</strong>
          </div>
          <a className="co-upgrade-link" href="/checkout?kit=ritual">
            Upgrade to RITUAL — £{ritualKit.firstBoxPrice} first box →
          </a>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div className="co-kit-name">{activeKit.name}</div>
        {inventoryAvailable === false && (
          <span style={{
            fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase',
            color: '#e05c5c', fontWeight: 600,
            border: '1px solid rgba(224,92,92,0.4)', padding: '3px 8px',
          }}>Sold Out</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span className="co-price-main">£{activeKit.firstBoxPrice}</span>
        <span className="co-price-label">first box</span>
      </div>
      <div className="co-price-sub">
        Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}
      </div>
      <div className="co-price-refill" style={{ marginTop: 6 }}>
        Then £{activeKit.monthlyPrice}/mo from {fmtDate(firstCharge)} — cancel any time
      </div>

      <div className="co-divider" />

      <div className="co-promise">
        <div className="co-promise-title">Our Promise</div>
        <div className="co-promise-item">
          <span className="co-promise-check">🚫</span>
          <span>Cancel any time — no lock-in, no questions asked</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">⏸</span>
          <span>Pause or skip any month from your account</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">📦</span>
          <span>Refills arrive before you run out — tools replaced when due</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">🛡️</span>
          <span>Payment secured by Stripe — encrypted, never stored on our servers</span>
        </div>
      </div>

      <div className="co-divider" />

      <div className="co-panel-label">What's in your box</div>
      <div className="co-product-list">
        {products.map(p => (
          <div key={p.num} className={`co-product${p.comingSoon ? ' dimmed' : ''}`}>
            {p.image
              ? <img src={p.image} alt={p.name} className="co-product-thumb" loading="lazy" />
              : <div className="co-product-thumb-ph" />
            }
            <span className="co-product-num">{p.num}</span>
            <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
          </div>
        ))}
      </div>
      {products.some(p => p.comingSoon) && (
        <div className="co-soon-note">* Coming soon — included when available</div>
      )}
    </div>
  );
}
