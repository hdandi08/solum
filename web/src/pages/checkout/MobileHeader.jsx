import { useState } from 'react';
import { PRODUCTS } from '../../data/products.js';

export default function MobileHeader({ kit, dispatch, arrival, firstCharge }) {
  const [open, setOpen] = useState(false);
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));

  function fmtDay(d) {
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function fmtDate(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="co-mobile-header">
      <button
        className="co-mobile-header-bar"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        type="button"
      >
        {/* Left: kit name + expandable CTA */}
        <div className="co-mobile-header-left">
          <span className="co-mobile-kit-name">{kit.name}</span>
          <span className="co-mobile-see-more">
            {open ? '▴ Hide summary' : '▾ Order summary'}
          </span>
        </div>

        {/* Right: price — always visible */}
        <div className="co-mobile-price-block">
          <span className="co-mobile-price">£{kit.firstBoxPrice}</span>
          <span className="co-mobile-price-note">first box</span>
        </div>
      </button>

      {open && (
        <div className="co-mobile-header-body">
          <div className="co-mobile-dispatch">
            Ships {fmtDay(dispatch)} · Arrives {fmtDay(arrival)}
          </div>
          <div className="co-mobile-dispatch">
            Then £{kit.monthlyPrice}/mo from {fmtDate(firstCharge)} — cancel any time
          </div>

          <div className="co-mobile-products">
            {products.map(p => (
              <div key={p.num} className="co-mobile-product">
                <span className="co-mobile-product-num">{p.num}</span>
                <span style={{ opacity: p.comingSoon ? 0.5 : 1 }}>
                  {p.name}{p.comingSoon ? ' *' : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="co-mobile-trust">
            <div className="co-mobile-trust-line">🚫 Cancel any time — no lock-in, no questions</div>
            <div className="co-mobile-trust-line">⏸ Pause or skip any month from your account</div>
            <div className="co-mobile-trust-line">📦 Refills arrive before you run out</div>
          </div>
        </div>
      )}
    </div>
  );
}
