import { useState, useEffect, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { KITS, kitWorth } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';
import { offerActive } from '../lib/offer.js';
import { getDispatchDate, estDeliveryDate, nextDispatchCutoff } from '../lib/dispatch.js';
import { capture, identify, fbViewContent, fbInitiateCheckout, ttqViewContent, ttqAddPaymentInfo, ttqPlaceAnOrder, ttqInitiateCheckout, ttqIdentify, getTikTokIds } from '../lib/analytics.js';
import { trackAddToCart } from '../lib/addToCartTracker.js';
import { checkEmailDomain } from '../lib/emailMx.js';
import SolumWordmark from '../components/SolumWordmark.jsx';
import FounderChat from '../components/FounderChat.jsx';
import InAppBrowserBanner from '../components/InAppBrowserBanner.jsx';
import { videoFor } from '../data/productMedia.js';
import './checkout/checkout.css';
import { jumpTop } from '../lib/scroll.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_KEY   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_KEY);

const KIT_PRICES = { ground: 65, ritual: 85 };

const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:            '#4A8FC7',
    colorBackground:         '#08090B',
    colorText:               '#F0ECE2',
    colorTextSecondary:      'rgba(168,180,188,0.8)',
    colorDanger:             '#e05c5c',
    colorIconTab:            '#F0ECE2',
    colorIconTabSelected:    '#F0ECE2',
    colorIconTabHover:       '#F0ECE2',
    fontFamily:              '"Barlow Condensed", system-ui, sans-serif',
    fontSizeBase:            '16px',
    borderRadius:            '0px',
    spacingUnit:             '5px',
  },
  rules: {
    '.Input': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B', padding: '14px 16px' },
    '.Input:focus': { border: '1px solid #4A8FC7', boxShadow: 'none', outline: 'none' },
    '.Label': { fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '600', color: 'rgba(168,180,188,0.9)', marginBottom: '7px' },
    '.Tab': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B' },
    '.Tab--selected': { border: '1px solid #4A8FC7', backgroundColor: '#0d1520' },
    '.TabLabel': { color: '#F0ECE2' },
    '.TabLabel--selected': { color: '#F0ECE2' },
  },
};

function isValidUKPhone(raw) {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  const digits  = cleaned.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return false;
  if (digits.startsWith('44')) return digits.length === 12;
  if (digits.startsWith('0'))  return digits.length === 11;
  return false;
}

// ── Inline CSS — kit selector only (everything else reuses checkout.css) ──────

const CSS = `
.by-intro{margin-bottom:24px;}
.by-intro-eyebrow{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:700;display:block;margin-bottom:10px;}
.by-intro-head{font-size:26px;font-weight:600;color:var(--bone);line-height:1.25;margin:0 0 6px;max-width:540px;}
@media(max-width:768px){.by-intro-head{font-size:22px;}}
.by-intro-sub{font-size:15px;font-weight:300;color:var(--stone);line-height:1.5;max-width:520px;margin:0 0 4px;}
.by-express-wrap{margin-bottom:8px;scroll-margin-top:calc(84px + var(--offerbar-h));}
.by-express-skel{height:48px;background:linear-gradient(90deg,var(--char) 25%,#232936 50%,var(--char) 75%);background-size:200% 100%;animation:byShimmer 1.2s linear infinite;border-radius:6px;margin-bottom:8px;}
@keyframes byShimmer{to{background-position:-200% 0;}}
.by-kit-confirm{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--char);border:1px solid var(--line);padding:14px 16px;margin-bottom:24px;}
.by-kit-confirm-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.12em;color:var(--bone);display:block;line-height:1.1;}
.by-kit-confirm-meta{font-size:13px;color:var(--stone);}
.by-kit-confirm-change{background:none;border:1px solid var(--line);color:var(--stone);font-size:13px;padding:9px 14px;cursor:pointer;transition:color .15s,border-color .15s;}
.by-kit-confirm-change:hover{color:var(--bone);border-color:var(--stone);}
.co-form-trust{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--stone);border:1px solid var(--line);padding:12px 16px;margin:0 0 14px;}
.co-form-trust-line:first-child{color:var(--bone);font-weight:500;}
.co-form-trust a{color:inherit;}
.co-mobile-product-worth{margin-left:auto;color:var(--stone);font-size:12px;white-space:nowrap;}
.co-product-worth{margin-left:auto;color:var(--stone);font-size:13px;white-space:nowrap;}
.co-worth-total{font-size:14px;color:var(--bone);font-weight:600;border-top:1px solid var(--line);margin-top:10px;padding-top:10px;}
.co-worth-total s{color:var(--mist);font-weight:500;}
.co-price-worth{font-size:20px;font-weight:600;color:var(--mist);}
.by-kit-stock{font-size:13px;font-weight:600;color:var(--blit);margin-top:7px;letter-spacing:.3px;}
.by-kit-cert{font-size:13px;color:var(--stone);font-weight:500;margin-top:5px;}
.by-kit-worth{font-size:15px;font-weight:600;color:var(--mist);text-decoration:line-through;text-decoration-color:rgba(240,236,226,0.5);margin-bottom:2px;}
.by-kit-nextprice{font-size:13px;color:var(--stone);margin-top:3px;}
.by-demo{display:flex;align-items:center;gap:16px;background:var(--char);border:1px solid var(--line);padding:12px;margin:0 0 24px;}
.by-demo-video{width:104px;aspect-ratio:9/16;object-fit:cover;flex-shrink:0;display:block;background:#000;}
.by-demo-head{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.1em;color:var(--bone);margin-bottom:6px;}
.by-demo-caption{font-size:14px;font-weight:300;color:var(--mist);line-height:1.5;}
.by-express-or{display:flex;align-items:center;gap:14px;margin:18px 0 22px;color:var(--stone);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;}
.by-express-or::before,.by-express-or::after{content:'';flex:1;height:1px;background:var(--line);}
.by-express-consent{font-size:12px;color:var(--stone);font-weight:300;line-height:1.5;text-align:center;margin:12px 4px 0;}
.by-express-consent a{color:var(--blit);text-decoration:none;}
.by-express-consent a:hover{text-decoration:underline;}
.by-kits{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);margin-bottom:32px;}
@media(max-width:520px){.by-kits{grid-template-columns:1fr;}}
.by-kit{background:var(--black);padding:24px 20px;cursor:pointer;transition:background .15s;}
.by-kit:hover{background:var(--dark);}
.by-kit.selected{background:var(--dark);outline:2px solid var(--blue);}
.by-kit.soldout{opacity:.45;cursor:default;}
.by-kit-badge{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);font-weight:700;margin-bottom:8px;display:block;}
.by-kit-name{font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:.06em;line-height:1;margin-bottom:4px;color:var(--bone);}
.by-kit-img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;margin-bottom:14px;background:var(--dark);}
.by-kit-outcome{font-size:16px;font-weight:500;color:var(--mist);line-height:1.35;margin-bottom:4px;}
.by-kit-contents{font-size:13px;font-weight:300;color:var(--stone);letter-spacing:.3px;margin-bottom:14px;}
.by-kit-buyrow{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.by-kit-cta{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.08em;background:var(--blue);color:#fff;border:none;padding:13px 22px;cursor:pointer;transition:background .15s;}
.by-kit-cta:hover{background:var(--blit);}
.by-kit-price{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:-1px;line-height:1;color:var(--bone);}
.by-kit-price-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:2px;}
.by-kit-soldout-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);margin-top:6px;}
.by-stock-pill{display:inline-flex;align-items:center;gap:8px;margin:12px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--blit);border:1px solid rgba(46,109,164,0.35);padding:5px 10px;}
.by-stock-dot{width:5px;height:5px;border-radius:50%;background:var(--blit);animation:bydot 2s ease infinite;}
@keyframes bydot{0%,100%{opacity:1;}50%{opacity:.3;}}
.by-soldout-page{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);min-height:calc(100vh - 64px);align-items:start;padding-top:64px;}
.by-soldout-left{background:var(--black);padding:48px 40px;}
.by-soldout-right{background:var(--char);padding:48px 40px;display:flex;flex-direction:column;gap:0;}
.by-soldout-badge{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;border:1px solid rgba(224,92,92,0.3);padding:5px 12px;margin-bottom:28px;font-weight:700;}
.by-soldout-badge-dot{width:6px;height:6px;border-radius:50%;background:#e05c5c;animation:bydot 1.5s ease infinite;}
.by-soldout-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(48px,6vw,76px);letter-spacing:.04em;color:var(--bone);line-height:.95;margin-bottom:16px;}
.by-soldout-kit{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:28px;}
.by-soldout-apology{border-left:2px solid #e05c5c;padding-left:18px;margin-bottom:28px;}
.by-soldout-apology-head{font-size:16px;color:var(--bone);font-weight:500;line-height:1.55;margin-bottom:6px;}
.by-soldout-apology-body{font-size:14px;color:var(--stone);font-weight:300;line-height:1.7;}
.by-soldout-saved{display:flex;align-items:flex-start;gap:14px;background:rgba(46,109,164,0.07);border:1px solid rgba(46,109,164,0.2);padding:18px 20px;margin-bottom:28px;}
.by-soldout-saved-tick{width:26px;height:26px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;color:#fff;margin-top:2px;}
.by-soldout-saved-text{font-size:14px;color:var(--mist);font-weight:300;line-height:1.65;}
.by-soldout-saved-text strong{color:var(--bone);font-weight:600;display:block;margin-bottom:2px;}
.by-soldout-home{font-family:'Bebas Neue',sans-serif;font-size:14px;letter-spacing:.1em;color:var(--stone);text-decoration:none;border:1px solid var(--lineb);padding:13px 24px;text-align:center;transition:border-color .2s,color .2s;display:block;}
.by-soldout-home:hover{border-color:var(--bone);color:var(--bone);}
/* Founder card */
.by-founder-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:var(--blit);font-weight:600;margin-bottom:24px;}
.by-founder-photo-wrap{position:relative;width:88px;height:88px;margin-bottom:20px;}
.by-founder-photo{width:88px;height:88px;border-radius:50%;object-fit:cover;object-position:center top;border:2px solid var(--blue);display:block;}
.by-founder-status{position:absolute;bottom:2px;right:2px;width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid var(--char);}
.by-founder-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:.06em;color:var(--bone);line-height:1;margin-bottom:4px;}
.by-founder-role{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:500;margin-bottom:24px;}
.by-founder-message{font-size:16px;color:var(--mist);font-weight:300;line-height:1.75;font-style:italic;border-left:2px solid var(--blue);padding-left:18px;margin-bottom:28px;}
.by-founder-message em{font-style:normal;color:var(--bone);font-weight:500;}
.by-founder-sig{font-size:13px;color:var(--stone);font-weight:400;margin-bottom:32px;letter-spacing:.3px;}
.by-ig-btn{display:flex;align-items:center;gap:12px;background:var(--black);border:1px solid var(--lineb);padding:14px 18px;text-decoration:none;transition:border-color .2s,background .2s;}
.by-ig-btn:hover{border-color:var(--blue);background:rgba(46,109,164,0.08);}
.by-ig-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.by-ig-icon svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.by-ig-text{display:flex;flex-direction:column;gap:1px;}
.by-ig-handle{font-size:14px;color:var(--bone);font-weight:600;letter-spacing:.3px;}
.by-ig-sub{font-size:11px;color:var(--stone);font-weight:300;letter-spacing:.3px;}
@media(max-width:768px){
  .by-soldout-page{grid-template-columns:1fr;padding-top:64px;}
  .by-soldout-left,.by-soldout-right{padding:36px 24px;}
}
/* Kit-contents thumbnail hover-zoom (overrides checkout.css 32x40 defaults) */
.co-product-list .co-product-thumb,.co-product-list .co-product-thumb-ph{width:40px;height:52px;cursor:zoom-in;}
.co-product-preview-fixed{position:fixed;width:220px;height:275px;object-fit:cover;object-position:center;background:var(--dark);border:1px solid var(--line);box-shadow:0 12px 32px rgba(0,0,0,0.6);z-index:2000;pointer-events:none;}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDay(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}


// ── Progress bar ──────────────────────────────────────────────────────────────

const STEPS = ['details', 'delivery', 'payment'];
const STEP_LABELS = ['Details', 'Delivery', 'Payment'];

function ProgressBar({ step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="co-progress">
      {STEPS.map((s, i) => (
        <Fragment key={s}>
          <div className={`co-progress-step${i === idx ? ' active' : i < idx ? ' done' : ''}`}>
            <div className="co-progress-dot">{i < idx ? '✓' : i + 1}</div>
            <div className="co-progress-label">{STEP_LABELS[i]}</div>
          </div>
          {i < STEPS.length - 1 && <div className="co-progress-line" />}
        </Fragment>
      ))}
    </div>
  );
}

// ── Mobile header (one-time, no subscription language) ────────────────────────

function BuyMobileHeader({ kit, price, dispatch, arrival, inventory, onCta, hideUntilScroll }) {
  const [open, setOpen] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);

  // Details step: the kit cards above the fold already show photo, price and a
  // buy button — the bar would only cover them. Reveal it once they scroll away.
  const [scrolledPast, setScrolledPast] = useState(false);
  useEffect(() => {
    if (!hideUntilScroll) return undefined;
    const onScroll = () => setScrolledPast(window.scrollY > 340);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideUntilScroll]);
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num) && !p.comingSoon);
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);

  // Swipe-down-to-dismiss for the expanded panel (a bottom sheet that opens
  // upward). Only engage when the panel is scrolled to the top, so a normal
  // upward scroll through the product list is never hijacked into a close.
  const bodyRef = useRef(null);
  const dragStartY = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onTouchStart = (e) => {
    if ((bodyRef.current?.scrollTop ?? 0) <= 0) {
      dragStartY.current = e.touches[0].clientY;
      setDragging(true);
    }
  };
  const onTouchEnd = () => {
    if (dragY > 80) setOpen(false);
    dragStartY.current = null;
    setDragging(false);
    setDragY(0);
  };
  const closeSummary = () => { setOpen(false); setDragY(0); setDragging(false); dragStartY.current = null; };

  // Lock the page behind the sheet so the expanded summary can't scroll /buy.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Track the downward drag with a NON-passive listener so we can preventDefault
  // and stop the gesture from scroll-chaining into the page. React's onTouchMove
  // is passive, so preventDefault there is a no-op.
  useEffect(() => {
    const el = bodyRef.current;
    if (!open || !el) return undefined;
    const move = (e) => {
      if (dragStartY.current == null) return;
      const dy = e.touches[0].clientY - dragStartY.current;
      if (dy > 0) { e.preventDefault(); setDragY(dy); } // downward only
    };
    el.addEventListener('touchmove', move, { passive: false });
    return () => el.removeEventListener('touchmove', move);
  }, [open]);

  if (hideUntilScroll && !scrolledPast) return null;

  return (
    <div className="co-mobile-header">
      <div className="co-mobile-header-bar">
        <button
          className="co-mobile-header-info"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          type="button"
        >
          {kit.image && <img src={kit.image} alt="" className="co-mobile-hero-thumb" />}
          <div className="co-mobile-header-left">
            <span className="co-mobile-kit-name">{kit.name}</span>
            <span className="co-mobile-see-more">
              {open ? 'Hide summary' : "What's inside ›"}
            </span>
          </div>
          <div className="co-mobile-price-block">
            <span className="co-mobile-price">£{price}</span>
            <span className="co-mobile-price-note">one-time</span>
          </div>
        </button>
        {onCta && (
          <button type="button" className="co-mobile-cta" onClick={onCta}>
            Buy →
          </button>
        )}
      </div>

      {open && (
        <div
          className="co-mobile-header-body"
          ref={bodyRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            transform: dragY ? `translateY(${dragY}px)` : undefined,
            transition: dragging ? 'none' : 'transform 0.22s ease',
          }}
        >
          <div className="co-mobile-sheet-head">
            <span className="co-mobile-sheet-grab" aria-hidden="true" />
            <button
              type="button"
              className="co-mobile-sheet-close"
              onClick={closeSummary}
              aria-label="Close summary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="co-mobile-dispatch">
            Ships {fmtDay(dispatch)} · Est. delivery {fmtDay(arrival)}
          </div>
          <div className="co-mobile-products">
            {products.map(p => (
              <button
                key={p.num}
                type="button"
                className="co-mobile-product"
                onClick={() => p.media?.still && setZoomSrc(p.media.still)}
              >
                {p.media?.still
                  ? <img src={p.media.still} alt="" className="co-mobile-product-thumb" loading="lazy" />
                  : <span className="co-mobile-product-thumb ph" />}
                <span className="co-mobile-product-num">{p.num}</span>
                <span className="co-mobile-product-name">{p.name}</span>
                {p.value > 0 && <span className="co-mobile-product-worth">£{p.value}</span>}
                {p.media?.still && <span className="co-mobile-product-zoom" aria-hidden="true">⤢</span>}
              </button>
            ))}
          </div>
          <div className="co-worth-total">
            <s>£{kitWorth(kit)} of product</s> · you pay £{price}
          </div>
          <div className="co-mobile-trust">
            <div className="co-mobile-trust-line">📦 Royal Mail Tracked 48 · {offerActive() ? <><s style={{ color: 'var(--stone)' }}>£5.95</s> <span style={{ color: '#4a8fc7', fontWeight: 600 }}>FREE</span></> : 'Free'} · UK only</div>
            <div className="co-mobile-trust-line">🔒 Secured by Stripe · encrypted end to end</div>
            <div className="co-mobile-trust-line">✓ 14-day returns · <a href="/terms#s7" className="co-returns-link">T&amp;Cs apply</a></div>
            <div className="co-mobile-trust-line">📞 Questions? <a href="tel:03330502313" className="co-returns-link" onClick={() => capture('buy_phone_clicked')}>0333 050 2313</a> · Mon–Fri 9–5</div>
            <div className="co-mobile-trust-line">🏢 Bysolum Limited · Company No. 17117056</div>
          </div>
        </div>
      )}

      {zoomSrc && (
        <div className="co-mobile-zoom-overlay" onClick={() => setZoomSrc(null)} role="dialog" aria-modal="true">
          <img src={zoomSrc} alt="" className="co-mobile-zoom-img" />
          <span className="co-mobile-zoom-hint">Tap to close</span>
        </div>
      )}
    </div>
  );
}

// ── Checkout nav (SOLUM wordmark, fixed top) ─────────────────────────────────

function BuyCheckoutNav() {
  return (
    <nav className="co-checkout-nav">
      <SolumWordmark />
      <span className="co-checkout-nav-lock">
        <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden="true">
          <rect x="0.75" y="5.75" width="9.5" height="6.5" rx="0.75" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 5.5V3.5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Secure Checkout
      </span>
    </nav>
  );
}

// ── Desktop right panel ───────────────────────────────────────────────────────

function BuyOrderSummary({ kit, price, dispatch, arrival, inventory }) {
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num));
  const totalRemaining = (inventory?.ground?.count ?? 0) + (inventory?.ritual?.count ?? 0);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewPos, setPreviewPos] = useState({ top: 0, left: 0 });

  const showPreview = (e, src) => {
    if (!src) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const previewW = 220;
    const previewH = 275;
    // Place the preview above the thumb so it never covers the product name
    // (which sits to the right of the thumb on the same row).
    const left = Math.min(window.innerWidth - previewW - 12, Math.max(12, rect.left));
    const top = Math.max(12, rect.top - previewH - 12);
    setPreviewPos({ top, left });
    setPreviewSrc(src);
  };
  const hidePreview = () => setPreviewSrc(null);

  return (
    <div className="co-right">
      {kit.image && <img src={kit.image} alt={`${kit.name} kit`} className="co-summary-hero" />}
      <div className="co-kit-name">{kit.name}</div>
      {kit.outcome && <div className="co-outcome">{kit.outcome}</div>}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <span className="co-price-worth"><s>£{kitWorth(kit)}</s></span>
        <span className="co-price-main">£{price}</span>
        <span className="co-price-label">one-time</span>
      </div>
      <div className="co-price-sub">Ships {fmtDay(dispatch)} · Est. delivery {fmtDay(arrival)}</div>
      {offerActive() ? (
        <div className="co-price-sub" style={{ marginTop: 3 }}>
          Royal Mail Tracked 48 · <s style={{ color: 'var(--stone)' }}>£5.95</s>{' '}
          <span style={{ color: '#2E6DA4', fontWeight: 600 }}>FREE</span> · UK only
        </div>
      ) : (
        <div className="co-price-sub" style={{ marginTop: 3 }}>Royal Mail Tracked 48 · Free · UK only</div>
      )}

      <div className="co-divider" />

      <div className="co-promise">
        <div className="co-promise-title">Before You Buy</div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Ships {fmtDay(dispatch)} · Est. delivery {fmtDay(arrival)}</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Ritual guide included in the box · QR code to bysolum.co.uk/ritual</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Secured by Stripe · your card details never touch our servers</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>14-day returns · <a href="/terms#s7" className="co-returns-link">T&amp;Cs apply</a></span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Questions? Call <a href="tel:03330502313" className="co-returns-link" onClick={() => capture('buy_phone_clicked')}>0333 050 2313</a> · Mon–Fri 9–5</span>
        </div>
        <div className="co-promise-item">
          <span className="co-promise-check">◆</span>
          <span>Bysolum Limited · Company No. 17117056</span>
        </div>
      </div>

      <div className="co-divider" />

      <div className="co-panel-label">What's in your box</div>
      <div className="co-product-list">
        {products.map(p => (
          <div key={p.num} className={`co-product${p.comingSoon ? ' dimmed' : ''}`}>
            {p.media?.still
              ? (
                <img
                  src={p.media.still}
                  alt={p.name}
                  className="co-product-thumb"
                  loading="lazy"
                  onMouseEnter={(e) => showPreview(e, p.media.still)}
                  onMouseLeave={hidePreview}
                />
              )
              : <div className="co-product-thumb-ph" />
            }
            <span className="co-product-num">{p.num}</span>
            <span>{p.name}{p.comingSoon ? ' *' : ''}</span>
            {p.value > 0 && !p.comingSoon && <span className="co-product-worth">£{p.value}</span>}
          </div>
        ))}
      </div>
      <div className="co-worth-total">
        <s>£{kitWorth(kit)} of product</s> · you pay £{price}
      </div>
      {products.some(p => p.comingSoon) && (
        <div className="co-soon-note">* Coming soon — included when available</div>
      )}
      {previewSrc && (
        <img
          src={previewSrc}
          alt=""
          aria-hidden="true"
          className="co-product-preview-fixed"
          style={{ top: previewPos.top, left: previewPos.left }}
        />
      )}
    </div>
  );
}

// ── Step 3: Payment ───────────────────────────────────────────────────────────

function StepPayment({ activeKit, price, payInfo, form, source, onBack, onEditDetails }) {
  const stripe     = useStripe();
  const elements   = useElements();
  const submitting = useRef(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [paymentType, setPaymentType]     = useState('card');
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements || submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');

    try {
      const successParams = new URLSearchParams({
        kit:      activeKit.id,
        source,
        dispatch: payInfo.dispatch_date ?? '',
        arrival:  payInfo.arrival_date  ?? '',
        amount:   String(payInfo.amount_pence),
      });

      const piId = payInfo.client_secret?.split('_secret_')[0];
      ttqPlaceAnOrder(activeKit.id, activeKit.name, payInfo.amount_pence / 100, piId);

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/success?${successParams.toString()}`,
          payment_method_data: {
            billing_details: {
              name:    [form.first_name, form.last_name].filter(Boolean).join(' ') || undefined,
              email:   form.email   || undefined,
              phone:   form.phone   || undefined,
              address: {
                line1:       form.line1    || undefined,
                line2:       form.line2    || undefined,
                city:        form.city     || undefined,
                postal_code: form.postcode || undefined,
                state:       form.county   || null,
                country:     'GB',
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message ?? 'Payment failed. Please try again.');
      } else if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        successParams.set('ref', paymentIntent.id);
        window.location.href = `/success?${successParams.toString()}`;
        return;
      } else {
        setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again or contact contact@bysolum.co.uk.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handlePay} noValidate>
      <div className="co-step-heading">Payment.</div>
      <div className="co-step-subhead">Your card details are encrypted, never stored on our servers.</div>

      <div className="co-email-confirm">
        <span className="co-email-confirm-label">Paying as</span>
        <span className="co-email-confirm-value">{form.email}</span>
        <button type="button" className="co-email-confirm-edit" onClick={onEditDetails}>Wrong? Edit ›</button>
      </div>

      <div className="co-order-pill">
        <div className="co-order-pill-kit">{activeKit.name} · One-Time Kit</div>
        <div className="co-order-pill-charge-row">
          <span className="co-order-pill-charge-label">Charged today</span>
          <span className="co-order-pill-charge-amount">£{price}</span>
        </div>
        <div className="co-order-pill-detail">
          Ships {payInfo.dispatch_date} · Est. delivery {payInfo.arrival_date}
        </div>
      </div>

      <div className="co-payment-element-wrap">
        <PaymentElement
          onChange={(e) => setPaymentType(e.value?.type ?? 'card')}
          options={{
            layout: 'tabs',
            fields: { billingDetails: 'never' },
          }}
        />
      </div>

      {error && <div className="co-error" data-testid="pay-error">{error}</div>}

      <label className="co-terms-check">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={e => setTermsAccepted(e.target.checked)}
        />
        <span>
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </span>
      </label>

      <button type="submit" className="co-submit" disabled={!stripe || !elements || loading || !termsAccepted} data-testid="pay-btn">
        {loading ? 'Processing…' : `Pay £${price} Now →`}
      </button>

      <div className="co-trust-row">
        <span style={{ fontSize: 13, color: '#a09bff' }}>🔒</span>
        <span className="co-trust-row-text">256-bit SSL · Secured by</span>
        <span className="co-trust-row-brand">Stripe</span>
      </div>

      <button type="button" className="co-back-btn" onClick={onBack}>
        ← Back to delivery
      </button>
    </form>
  );
}

// ── Express Checkout (Apple Pay / Google Pay / Link) ──────────────────────────
// Deferred PaymentIntent flow: wallet supplies email + shipping address, then we
// create the PI server-side (existing function) and confirm. One tap, no form.

function ExpressCheckout({ kitId, price, source, authHeaders, onError, onAvailability }) {
  const stripe = useStripe();
  const elements = useElements();

  async function onConfirm(event) {
    if (!stripe || !elements) return;
    onError('');
    const { error: submitError } = await elements.submit();
    if (submitError) { onError(submitError.message ?? 'Could not start payment.'); return; }

    const ship   = event.shippingAddress ?? {};
    const addr    = ship.address ?? {};
    const billing = event.billingDetails ?? {};
    const fullName = (ship.name || billing.name || '').trim();
    const [first_name, ...rest] = fullName.split(/\s+/);
    const last_name = rest.join(' ') || null;
    const email = (billing.email || '').trim().toLowerCase();

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id:     kitId,
          email,
          first_name: first_name || (fullName || 'Customer'),
          last_name,
          phone:      billing.phone || null,
          source,
          site_host:  window.location.hostname,
          ...getTikTokIds(),
          line1:      addr.line1 || '',
          line2:      addr.line2 || null,
          city:       addr.city || '',
          county:     addr.state || null,
          postcode:   addr.postal_code || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.message ?? data.error ?? 'Something went wrong. Please try again.'); return; }

      identify(email, { first_name: first_name || '', kit: kitId, source });
      // expressPaymentType distinguishes the wallet used: 'apple_pay' | 'google_pay' | 'link' | 'paypal'
      capture('checkout_initiated', { kit: kitId, source, price, method: 'express', wallet: event.expressPaymentType });
      fbInitiateCheckout(kitId, price, { email });
      try { sessionStorage.setItem('solum_buyer_email', email); } catch {}

      const successParams = new URLSearchParams({
        kit: kitId, source,
        dispatch: data.dispatch_date ?? '', arrival: data.arrival_date ?? '',
        amount: String(data.amount_pence),
      });

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.client_secret,
        confirmParams: { return_url: `${window.location.origin}/success?${successParams.toString()}` },
        redirect: 'if_required',
      });

      if (confirmError) { onError(confirmError.message ?? 'Payment failed. Please try again.'); return; }
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
        successParams.set('ref', paymentIntent.id);
        window.location.href = `/success?${successParams.toString()}`;
      }
    } catch {
      onError('Network error. Please try again.');
    }
  }

  return (
    <ExpressCheckoutElement
      options={{
        buttonHeight: 48,
        paymentMethods: {
          applePay: 'auto', googlePay: 'auto', link: 'auto',
          amazonPay: 'never', klarna: 'never', paypal: 'auto', // paypal approved by Stripe 2026-07-08
        },
      }}
      onReady={({ availablePaymentMethods }) => {
        // Which wallets Stripe actually rendered — measurable per browser in
        // PostHog (Meta in-app browser has no Apple/Google Pay; recordings
        // can't see into the Stripe iframe, so this event is the only signal).
        const w = availablePaymentMethods ?? {};
        capture('express_availability', {
          available:  !!availablePaymentMethods,
          apple_pay:  !!w.applePay,
          google_pay: !!w.googlePay,
          link:       !!w.link,
          paypal:     !!w.paypal,
          kit: kitId, source,
        });
        onAvailability(!!availablePaymentMethods);
      }}
      onClick={({ resolve }) => resolve({
        emailRequired: true,
        shippingAddressRequired: true,
        phoneNumberRequired: false,
        allowedShippingCountries: ['GB'],
      })}
      onConfirm={onConfirm}
      onCancel={() => {}}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

// ── Mitt demo loop ─────────────────────────────────────────────────────────
// The product demos itself: dead skin visibly rolling off is the single most
// convincing asset in this category. Compact thumbnail loop + caption.
function MittDemo() {
  const v = videoFor('02-italy-towel-mitt');
  const wrapRef = useRef(null);
  // The film is 0.8-1.9 MB; loading it on page-open competes with Stripe for
  // bandwidth at the exact moment the wallets render. Mount the <video> only
  // when the section approaches the viewport; until then show the poster.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!v || !wrapRef.current) return undefined;
    let io;
    // Arm the observer only after window load, so the film never competes
    // with Stripe/fonts/images during the initial page load.
    const arm = () => {
      if (!wrapRef.current) return;
      io = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setInView(true); },
        { rootMargin: '200px' },
      );
      io.observe(wrapRef.current);
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    return () => { window.removeEventListener('load', arm); io?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!v) return null;
  return (
    <div className="by-demo" ref={wrapRef}>
      {inView ? (
        <video
          className="by-demo-video"
          autoPlay muted loop playsInline preload="none"
          poster={v.poster}
          aria-label="Italy Towel Mitt lifting dead skin on first use"
        >
          <source src={v.webm} type="video/webm" />
          <source src={v.mp4} type="video/mp4" />
        </video>
      ) : (
        <img className="by-demo-video" src={v.poster} alt="" aria-hidden="true" />
      )}
      <div className="by-demo-text">
        <div className="by-demo-head">Watch it work</div>
        <div className="by-demo-caption">First use. Weeks of dead skin your shower never touched. You'll see it roll off.</div>
      </div>
    </div>
  );
}

export default function BuyPage() {
  const [params] = useSearchParams();

  const rawSource = params.get('source');
  const source    = rawSource === 'tiktok' ? 'tiktok_shop' : (rawSource ?? 'first_batch');
  const preselect = params.get('kit');
  const isFirstBatch = source === 'first_batch';

  // React Router's history writes an idx into history.state; 0 means /buy is
  // the first entry in this tab (ad click / direct landing) — a "Back to kits"
  // link would point at a page the visitor has never seen.
  const isDirectLanding = (window.history.state?.idx ?? 0) === 0;

  // Warm arrival: navigated here in-site with a kit already chosen (homepage
  // kit CTA passes ?kit=). The page's job shrinks to confirm + pay — the full
  // kit re-decision UI stays collapsed behind "Change kit".
  const isWarmArrival = !isDirectLanding && !!preselect;

  // Kit CTAs and the sticky bar scroll here (express wallets + form).
  const formStartRef = useRef(null);
  const scrollToForm = () => formStartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const [inventory, setInventory]       = useState(null);
  const [selectedKit, setSelectedKit]   = useState(preselect ?? 'ritual');
  const [step, setStep]                 = useState('details'); // details | delivery | payment | soldout
  const [form, setForm]                 = useState({ first_name: '', last_name: '', email: '', phone: '', line1: '', line2: '', city: '', county: '', postcode: '' });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [payInfo, setPayInfo]           = useState(null);
  const [soldoutSaved, setSoldoutSaved] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [expressReady, setExpressReady]         = useState(false);
  const [kitPickerOpen, setKitPickerOpen]       = useState(!isWarmArrival);

  const authHeaders = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` };

  // Stripe's wallet iframe takes 1.5–4s to render (measured via
  // express_availability); a skeleton fills the gap. Failsafe: stop showing
  // it after 6s even if onReady never fires (blocked scripts).
  useEffect(() => {
    const t = setTimeout(() => setExpressReady(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Restore state after a failed redirect-based payment (Revolut Pay etc.)
  useEffect(() => {
    if (params.get('resume') !== '1') return;
    try {
      const saved = JSON.parse(sessionStorage.getItem('solum_payment_retry') ?? '{}');
      if (!saved.clientSecret || !saved.form) return;
      setForm(saved.form);
      setPayInfo(saved.payInfo);
      setClientSecret(saved.clientSecret);
      if (saved.kit) setSelectedKit(saved.kit);
      setStep('payment');
      jumpTop();
      sessionStorage.removeItem('solum_payment_retry');
    } catch {}
  }, []); // eslint-disable-line

  // Always open the buy flow at the top, regardless of the scroll position it was clicked from.
  useEffect(() => { jumpTop(); }, []);

  useEffect(() => {
    capture('buy_page_viewed', { source, preselect: preselect ?? 'none' });
    fbViewContent(preselect ?? 'ground');
    ttqViewContent(preselect ?? 'ground', 'SOLUM Kit', 65);
  }, []); // eslint-disable-line

  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setInventory(d.kits ?? {}))
      .catch(() => setInventory({}));
  }, []); // eslint-disable-line

  // Ticks every 30s so the cutoff countdown and dispatch date stay honest
  // across the 6 PM boundary without a reload.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dispatch = getDispatchDate();
  const arrival  = estDeliveryDate(dispatch);
  const cutoff   = nextDispatchCutoff();
  const cutoffMins = Math.max(1, Math.floor((cutoff.getTime() - new Date(new Date(nowTs).toLocaleString('en-US', { timeZone: 'Europe/London' })).getTime()) / 60000));
  const cutoffText = cutoffMins < 720
    ? `Order within ${Math.floor(cutoffMins / 60)}h ${cutoffMins % 60}m`
    : `Order by ${cutoff.toLocaleDateString('en-GB', { weekday: 'long' })} 6 PM`;

  const activeKit = KITS.find(k => k.id === selectedKit) ?? KITS.find(k => k.id === 'ritual');
  const price     = KIT_PRICES[selectedKit] ?? KIT_PRICES.ritual;

  function onChange(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  // ── Step 1: details validation ────────────────────────────────────────────

  async function handleDetailsNext(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    const emailVal = form.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setError('Please enter a valid email address.'); return;
    }
    if (form.phone.trim() && !isValidUKPhone(form.phone)) {
      setError('Please enter a valid UK phone number (e.g. 07700 900000 or +44 7700 900000).'); return;
    }

    // MX record check — catches typos like gmail.con, hotmal.com etc.
    // Blocks only on a definitive NXDOMAIN / no-MX answer; timeouts and
    // resolver errors always let the buyer through (see lib/emailMx.js).
    setLoading(true);
    const domain = emailVal.split('@')[1];
    const mxVerdict = await checkEmailDomain(domain);
    if (mxVerdict === 'invalid') {
      capture('email_mx_blocked', { domain, kit: selectedKit, source });
      setError(`We couldn't find a mail server for ${domain}. Please double-check your email.`);
      setLoading(false); return;
    }
    setLoading(false);

    const kitSoldOut = inventory !== null && !inventory[selectedKit]?.available;
    if (kitSoldOut) {
      setLoading(true);
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body: JSON.stringify({
            email:      emailVal.toLowerCase(),
            first_name: form.first_name.trim() || null,
            last_name:  form.last_name.trim()  || null,
            phone:      form.phone.trim()      || null,
            source:     `buy-soldout-${selectedKit}`,
          }),
        });
        setSoldoutSaved(true);
      } catch {
        setSoldoutSaved(false);
      }
      capture('soldout_detected', { kit: selectedKit, source });
      setStep('soldout');
      jumpTop();
      setLoading(false);
      return;
    }

    capture('checkout_details_submitted', { kit: selectedKit, source });
    setStep('delivery');
    jumpTop();
  }

  // ── Step 2: delivery → create payment intent ──────────────────────────────

  async function handleDeliveryNext(e) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!form.line1.trim()) { setError('Address line 1 is required.'); return; }
    if (!form.city.trim())  { setError('City is required.'); return; }
    if (!form.postcode.trim()) { setError('Postcode is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-first-box-payment-intent`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kit_id:     selectedKit,
          email:      form.email.trim().toLowerCase(),
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim() || null,
          phone:      form.phone.trim() || null,
          source,
          site_host:  window.location.hostname,
          ...getTikTokIds(),
          line1:      form.line1.trim(),
          line2:      form.line2.trim() || null,
          city:       form.city.trim(),
          county:     form.county.trim() || null,
          postcode:   form.postcode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      identify(form.email.trim().toLowerCase(), { first_name: form.first_name.trim(), kit: selectedKit, source });
      capture('checkout_delivery_submitted', { kit: selectedKit, source });
      capture('checkout_initiated', { kit: selectedKit, source, price, method: 'standard' });
      fbInitiateCheckout(selectedKit, price, { email: form.email.trim().toLowerCase(), phone: form.phone.trim() });
      ttqIdentify(form.email.trim().toLowerCase());
      ttqInitiateCheckout(selectedKit, activeKit?.name ?? selectedKit, price);
      ttqAddPaymentInfo(selectedKit, activeKit?.name ?? selectedKit, price);
      try { sessionStorage.setItem('solum_buyer_email', form.email.trim().toLowerCase()); } catch {}

      setClientSecret(data.client_secret);
      setPayInfo(data);
      setStep('payment');
      jumpTop();
      try {
        sessionStorage.setItem('solum_payment_retry', JSON.stringify({
          clientSecret: data.client_secret, payInfo: data, form, kit: selectedKit, source,
        }));
      } catch {}
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Shared header + summary props ─────────────────────────────────────────

  const headerProps = { kit: activeKit, price, dispatch, arrival, inventory };

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === 'soldout') {
    return (
      <>
        <style>{CSS}</style>
        <BuyCheckoutNav />
        <InAppBrowserBanner />
        <div className="by-soldout-page">
          {/* Left — apology */}
          <div className="by-soldout-left">
            <div className="by-soldout-badge">
              <span className="by-soldout-badge-dot" />
              Sold Out
            </div>
            <div className="by-soldout-title">Oh No.<br />We're Sorry.</div>
            <div className="by-soldout-kit">
              SOLUM {activeKit?.name} — {activeKit?.firstBoxPrice ? `£${activeKit.firstBoxPrice}` : ''} · One-Time Kit
            </div>
            <div className="by-soldout-apology">
              <div className="by-soldout-apology-head">
                You got this far and we let you down. This kit has sold out.
              </div>
              <div className="by-soldout-apology-body">
                The first batch went faster than expected. We are working on the next restock now.
                You will be the first to know the moment it is back.
              </div>
            </div>
            <div className="by-soldout-saved">
              <div className="by-soldout-saved-tick">✓</div>
              <div className="by-soldout-saved-text">
                <strong>You're on the list.</strong>
                We've saved your details and will email {form.email} the moment stock is back. No action needed.
              </div>
            </div>
            <a href="/" className="by-soldout-home">← Back to bysolum.co.uk</a>
          </div>

          {/* Right — founder card */}
          <div className="by-soldout-right">
            <div className="by-founder-tag">From the Founder</div>
            <div className="by-founder-photo-wrap">
              <img src="/harsha.webp" alt="Harsha, Founder of SOLUM" className="by-founder-photo" />
              <span className="by-founder-status" />
            </div>
            <div className="by-founder-name">Harsha</div>
            <div className="by-founder-role">Founder · SOLUM</div>
            <div className="by-founder-message">
              "I'm genuinely sorry. You did everything right and we ran out. I built SOLUM because I believe
              in what it does — and running out of stock on people who want it is the worst feeling.
              I'm personally working on the restock. <em>You will hear from me the moment it's ready.</em>"
            </div>
            <div className="by-founder-sig">— Harsha · harsha@bysolum.co.uk</div>
            <a
              href="https://instagram.com/bysolum.body"
              target="_blank"
              rel="noopener noreferrer"
              className="by-ig-btn"
            >
              <span className="by-ig-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="5"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="#fff" stroke="none"/>
                </svg>
              </span>
              <span className="by-ig-text">
                <span className="by-ig-handle">@bysolum.body</span>
                <span className="by-ig-sub">Follow for restock updates</span>
              </span>
            </a>
          </div>
        </div>
      </>
    );
  }

  if (step === 'payment' && clientSecret) {
    return (
      <>
        <style>{CSS}</style>
        <BuyCheckoutNav />
        <InAppBrowserBanner />
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
          <div className="co-page">
            <div className="co-left">
              <BuyMobileHeader {...headerProps} />
              {!isDirectLanding && (
                <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
                  ← Back to kits
                </a>
              )}
              <ProgressBar step="payment" />
              <StepPayment
                activeKit={activeKit}
                price={price}
                payInfo={payInfo}
                form={form}
                source={source}
                onBack={() => { setStep('delivery'); jumpTop(); }}
                onEditDetails={() => { setStep('details'); jumpTop(); }}
              />
            </div>
            <BuyOrderSummary {...headerProps} />
          </div>
        </Elements>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <BuyCheckoutNav />
      {step !== 'details' && <InAppBrowserBanner />}
      <div className="co-page">
        <div className="co-left">
          <BuyMobileHeader {...headerProps} onCta={step === 'details' ? scrollToForm : undefined} hideUntilScroll={step === 'details'} />
          {!isDirectLanding && (
            <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
              ← Back to kits
            </a>
          )}

          <>
              {/* Progress bar sits at top only for the delivery step (which has
                  no express option). On the details step it moves below the wallet
                  buttons — see further down — so Apple Pay / Link users aren't
                  shown an irrelevant 1-2-3 journey they never take. */}
              {step === 'delivery' && <ProgressBar step="delivery" />}

              {/* Step-1 intro. Cold landings get the orientation pitch; warm
                  arrivals already read the homepage, so just confirm and move. */}
              {step === 'details' && (
                <div className="by-intro">
                  <span className="by-intro-eyebrow">Men's Body Care</span>
                  {isWarmArrival ? (
                    <h1 className="by-intro-head">Good choice. Let's get it to your door.</h1>
                  ) : (
                    <>
                      <h1 className="by-intro-head">You shower every day. Your body still isn't properly clean.</h1>
                      <p className="by-intro-sub">One kit fixes it, head to toe. 10 minutes a day. We show you exactly how.</p>
                    </>
                  )}
                </div>
              )}

              {/* Warm arrivals: chosen kit as a one-line confirmation instead
                  of re-opening the whole decision */}
              {step === 'details' && !kitPickerOpen && (
                <div className="by-kit-confirm" data-testid="kit-confirm">
                  <div>
                    <span className="by-kit-confirm-name">{activeKit?.name}</span>
                    <span className="by-kit-confirm-meta">£{price} one-time · £{kitWorth(activeKit)} of product inside · free UK delivery</span>
                  </div>
                  <button
                    type="button"
                    className="by-kit-confirm-change"
                    data-testid="change-kit"
                    onClick={() => { setKitPickerOpen(true); capture('kit_picker_expanded', { kit: selectedKit, source }); }}
                  >
                    Change kit
                  </button>
                </div>
              )}

              {/* Kit selector — shown on step 1 only. AddToCart is gated on
                  in-site arrival: cold ad clicks landing straight on /buy must
                  not feed Meta's AddToCart optimisation. */}
              {step === 'details' && kitPickerOpen && (
                <div className="by-kits" data-testid="kit-selector">
                  {(preselect === 'ground' ? ['ground', 'ritual'] : ['ritual', 'ground']).map((id, i) => {
                    const kit = KITS.find(k => k.id === id);
                    const contentsCount = PRODUCTS.filter(p => kit.productNums.includes(p.num) && !p.comingSoon).length;
                    return (
                      <div
                        key={id}
                        data-testid={`kit-${id}`}
                        className={`by-kit${selectedKit === id ? ' selected' : ''}`}
                        onClick={() => { setSelectedKit(id); if (!isDirectLanding) trackAddToCart(id); }}
                      >
                        {kit?.popular && <span className="by-kit-badge">Most Popular</span>}
                        {kit?.image && (
                          <img
                            src={kit.image.replace('.webp', '@600.webp')}
                            alt={`${kit.name} kit contents`}
                            className="by-kit-img"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            fetchpriority={i === 0 ? 'high' : undefined}
                          />
                        )}
                        <div className="by-kit-name">{kit?.name}</div>
                        <div className="by-kit-outcome">{kit?.outcome}</div>
                        <div className="by-kit-contents">{contentsCount} products in the box · {id === 'ritual' ? 'daily + weekly ritual' : 'the daily system'}</div>
                        <div className="by-kit-cert">
                          {id === 'ritual'
                            ? '100% certified organic argan oil · 100% natural Atlas clay'
                            : '100% natural Atlas clay · sulphate-free wash'}
                        </div>
                        {isFirstBatch && (
                          inventory?.[id]?.count > 0 && inventory[id].count <= 30
                            ? <div className="by-kit-stock">Only {inventory[id].count} left in the first batch</div>
                            : <div className="by-kit-stock">First batch · only 250 kits made</div>
                        )}
                        <div className="by-kit-buyrow">
                          <div>
                            <div className="by-kit-worth">£{kitWorth(kit)} of product</div>
                            <div className="by-kit-price">£{KIT_PRICES[id]}</div>
                            <div className="by-kit-price-label">one-time</div>
                            {isFirstBatch && (
                              <div className="by-kit-nextprice">£{id === 'ritual' ? 95 : 75} after this batch</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="by-kit-cta"
                            onClick={(e) => { e.stopPropagation(); setSelectedKit(id); if (!isDirectLanding) trackAddToCart(id); capture('buy_kit_cta_clicked', { kit: id, source }); scrollToForm(); }}
                          >
                            Buy {kit?.name} →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Demo loop: for cold visitors it sits right after the kit choice;
                  warm arrivals get it below the form so wallets stay at the fold */}
              {step === 'details' && kitPickerOpen && <MittDemo />}

              {/* Trust strip just before the payment decision — Baymard: surprise
                  costs are the #1 abandonment cause, so "free · no hidden costs"
                  is the last thing read before choosing how to pay. The top
                  OfferBar already covers the very top of the page. */}
              {step === 'details' && (
                <div className="co-form-trust">
                  <div className="co-form-trust-line">📦 {cutoffText} · ships {fmtDay(dispatch)}</div>
                  <div className="co-form-trust-line">🚚 Free UK delivery · no hidden costs</div>
                  <div className="co-form-trust-line">✓ 14-day returns · 🔒 Secured by Stripe</div>
                  <div className="co-form-trust-line">📞 Questions? <a href="tel:03330502313" onClick={() => capture('buy_phone_clicked')}>0333 050 2313</a></div>
                </div>
              )}

              {/* In-app browsers can't show Apple Pay — offer the breakout here,
                  at the payment decision, instead of as the first thing on screen */}
              {step === 'details' && <InAppBrowserBanner variant="inline" />}

              {/* Express checkout — one-tap wallets, above the manual form */}
              {step === 'details' && (
                <div className="by-express-wrap" ref={formStartRef}>
                  {!expressReady && <div className="by-express-skel" aria-hidden="true" />}
                  <Elements
                    key={selectedKit}
                    stripe={stripePromise}
                    options={{ mode: 'payment', amount: price * 100, currency: 'gbp', appearance: stripeAppearance }}
                  >
                    <ExpressCheckout
                      kitId={selectedKit}
                      price={price}
                      source={source}
                      authHeaders={authHeaders}
                      onError={setError}
                      onAvailability={(a) => { setExpressAvailable(a); setExpressReady(true); }}
                    />
                  </Elements>
                  {expressAvailable && (
                    <>
                      <div className="by-express-consent">
                        By continuing with Apple Pay or Link, you agree to our{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
                        {' '}and{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                      </div>
                      <div className="by-express-or"><span>or pay by card</span></div>
                    </>
                  )}
                </div>
              )}

              {/* Progress bar — card path only; express payers skip these steps */}
              {step === 'details' && <ProgressBar step="details" />}

              {/* Step 1: Details */}
              {step === 'details' && (
                <form onSubmit={handleDetailsNext} noValidate data-testid="details-form">
                  <div className="co-step-heading">Your Details.</div>
                  <div className="co-step-subhead">Takes 60 seconds. We only ask what we need.</div>

                  <div className="co-row">
                    <div className="co-field">
                      <label className="co-label">First Name</label>
                      <input className="co-input" type="text" value={form.first_name} onChange={onChange('first_name')} placeholder="James" autoComplete="given-name" data-testid="first-name" />
                    </div>
                    <div className="co-field">
                      <label className="co-label">Last Name <span className="co-label-opt">optional</span></label>
                      <input className="co-input" type="text" value={form.last_name} onChange={onChange('last_name')} placeholder="Smith" autoComplete="family-name" />
                    </div>
                  </div>

                  <div className="co-field">
                    <label className="co-label">Email</label>
                    <input className="co-input" type="email" value={form.email} onChange={onChange('email')} placeholder="james@example.com" autoComplete="email" data-testid="email" />
                  </div>

                  <div className="co-field">
                    <label className="co-label">Phone <span className="co-label-opt">optional · for delivery updates</span></label>
                    <input className="co-input" type="tel" value={form.phone} onChange={onChange('phone')} placeholder="+44 7700 900000" autoComplete="tel" data-testid="phone" />
                  </div>

                  {error && <div className="co-error" data-testid="form-error">{error}</div>}

                  <button className="co-submit" type="submit" disabled={loading} data-testid="continue-btn">
                    {loading ? 'Saving…' : 'Next: Delivery →'}
                  </button>

                  <div className="co-inline-trust">
                    <div className="co-inline-trust-item">
                      <span>🔒</span>
                      <span>Your information is encrypted and never sold</span>
                    </div>
                  </div>
                </form>
              )}

              {/* Warm arrivals get the demo below the form (see above) */}
              {step === 'details' && !kitPickerOpen && <MittDemo />}

              {/* Step 2: Delivery */}
              {step === 'delivery' && (
                <form onSubmit={handleDeliveryNext} noValidate data-testid="delivery-form">
                  <div className="co-step-heading">Delivery.</div>
                  <div className="co-step-subhead">UK delivery only · Royal Mail Tracked 48 · Free shipping</div>

                  <div className="co-field">
                    <label className="co-label">Address Line 1</label>
                    <input className="co-input" type="text" value={form.line1} onChange={onChange('line1')} placeholder="14 Example Street" autoComplete="address-line1" data-testid="line1" />
                  </div>
                  <div className="co-field">
                    <label className="co-label">Address Line 2 <span className="co-label-opt">optional</span></label>
                    <input className="co-input" type="text" value={form.line2} onChange={onChange('line2')} placeholder="Flat 2" autoComplete="address-line2" />
                  </div>
                  <div className="co-row">
                    <div className="co-field">
                      <label className="co-label">City / Town</label>
                      <input className="co-input" type="text" value={form.city} onChange={onChange('city')} placeholder="London" autoComplete="address-level2" data-testid="city" />
                    </div>
                    <div className="co-field">
                      <label className="co-label">Postcode</label>
                      <input className="co-input" type="text" value={form.postcode} onChange={onChange('postcode')} placeholder="SW1A 1AA" autoComplete="postal-code" style={{ textTransform: 'uppercase' }} data-testid="postcode" />
                    </div>
                  </div>
                  <div className="co-field">
                    <label className="co-label">County <span className="co-label-opt">optional</span></label>
                    <input className="co-input" type="text" value={form.county} onChange={onChange('county')} placeholder="Buckinghamshire" autoComplete="address-level1" />
                  </div>

                  <div className="co-ship-strip">
                    <span className="co-ship-strip-icon">📦</span>
                    <div className="co-ship-strip-text">
                      <span className="co-ship-strip-main">Ships {fmtDay(dispatch)} · Est. delivery {fmtDay(arrival)}</span>
                      <span className="co-ship-strip-sub">Royal Mail Tracked 48 · Free</span>
                    </div>
                  </div>

                  {error && <div className="co-error" data-testid="delivery-error">{error}</div>}

                  <button className="co-submit" type="submit" disabled={loading} data-testid="delivery-btn">
                    {loading ? 'Preparing payment…' : 'Continue to Payment →'}
                  </button>

                  <button type="button" className="co-back-btn" onClick={() => { setError(''); setStep('details'); jumpTop(); }}>
                    ← Back to your details
                  </button>
                </form>
              )}
            </>
        </div>

        <BuyOrderSummary {...headerProps} />
      </div>
      <FounderChat />
    </>
  );
}
