// web/src/pages/AccountPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import tshirtImg from '../assets/solum-tshirt.jpeg';
import { KITS } from '../data/kits.js';
import { PRODUCTS } from '../data/products.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PRODUCT_IMAGES = {
  'Body Wash':       '/products/01-body-wash.png',
  'Italy Towel Mitt':'/products/02-italy-towel-mitt.png',
  'Back Scrub Cloth':'/products/03-back-scrub-cloth.png',
  'Scalp Massager':  '/products/04-scalp-massager.png',
  'Atlas Clay Mask': '/products/05-atlas-clay.png',
  'Argan Body Oil':  '/products/06-argan-oil.png',
  'Body Lotion':     '/products/07-body-lotion.png',
  'Bamboo Cloth':    '/products/08-cleansing-cloth.png',
};

const MONTHLY_ITEMS = ['Body Wash', 'Body Lotion', 'Bamboo Cloth'];
const QUARTERLY_ITEMS = ['Italy Towel Mitt', 'Back Scrub Cloth', 'Atlas Clay Mask'];
const RITUAL_QUARTERLY = ['Argan Body Oil'];

const CSS = `
/* ── Base ── */
.ac-page{min-height:100vh;background:var(--black);font-family:'Barlow Condensed',sans-serif;}
.ac-wrap{width:100%;max-width:680px;margin:0 auto;padding:0 0 80px;}

/* ── Loading ── */
.ac-loading{display:flex;align-items:center;justify-content:center;min-height:100vh;}
.ac-loading-text{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--stone);}

/* ── Login ── */
.ac-login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:48px 24px;}
.ac-login-inner{width:100%;max-width:480px;}
.ac-login-back{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);text-decoration:none;display:inline-flex;align-items:center;gap:8px;margin-bottom:48px;transition:color .2s;}
.ac-login-back:hover{color:var(--bone);}
.ac-login-heading{font-family:'Bebas Neue',sans-serif;font-size:clamp(40px,6vw,64px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:12px;}
.ac-login-sub{font-size:17px;color:var(--stone);font-weight:300;margin-bottom:40px;line-height:1.6;}
.ac-input{width:100%;background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:16px 18px;font-family:'Barlow Condensed',sans-serif;font-size:17px;outline:none;transition:border-color .2s;box-sizing:border-box;}
.ac-input:focus{border-color:var(--blue);}
.ac-input::placeholder{color:var(--stone);}
.ac-btn{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:.15em;padding:18px;cursor:pointer;transition:background .2s;margin-top:12px;display:block;}
.ac-btn:hover:not(:disabled){background:#fff;}
.ac-btn:disabled{background:var(--stone);cursor:wait;}
.ac-btn-ghost{width:100%;background:transparent;color:var(--stone);border:1px solid var(--lineb);font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;padding:13px;cursor:pointer;margin-top:10px;transition:border-color .2s,color .2s;display:block;}
.ac-btn-ghost:hover{border-color:var(--bone);color:var(--bone);}
.ac-err{font-size:14px;color:#e05c5c;margin-top:12px;padding:12px 16px;border:1px solid rgba(224,92,92,0.3);line-height:1.5;}

/* ── Dashboard header ── */
.ac-dash-head{background:var(--char);border-bottom:1px solid var(--lineb);padding:32px 40px;}
.ac-head-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
.ac-logo{display:flex;align-items:center;text-decoration:none;}.ac-logo img{height:16px;width:auto;display:block;}
.ac-signout{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);background:none;border:none;cursor:pointer;padding:0;transition:color .2s;}
.ac-signout:hover{color:var(--bone);}
.ac-greeting{font-family:'Bebas Neue',sans-serif;font-size:clamp(36px,5vw,52px);letter-spacing:.04em;color:var(--bone);line-height:1;margin-bottom:12px;}
.ac-head-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.ac-kit-badge{display:inline-block;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-weight:700;padding:5px 12px;background:var(--blue);color:var(--bone);}
.ac-status-badge{display:inline-block;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;padding:5px 10px;}
.ac-status-active{background:rgba(74,143,199,0.15);color:#4A8FC7;}
.ac-status-cancelling{background:rgba(200,149,42,0.12);color:#c8952a;}
.ac-status-cancelled{background:rgba(168,180,188,0.1);color:var(--stone);}
.ac-status-past_due{background:rgba(224,92,92,0.12);color:#e05c5c;}
.ac-months-tag{font-size:13px;color:var(--stone);font-weight:300;letter-spacing:.5px;}

/* ── Body padding ── */
.ac-body{padding:0 40px;}

/* ── 180 Club panel ── */
.club-panel{background:var(--mid);border:1px solid var(--lineb);margin-top:24px;overflow:hidden;}
.club-head{padding:20px 24px;border-bottom:1px solid var(--lineb);display:flex;align-items:center;justify-content:space-between;}
.club-head-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.club-head-earned{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c8a96e;font-weight:600;}
.club-body{padding:24px;}
.club-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:.06em;color:var(--bone);margin-bottom:4px;}
.club-sub{font-size:15px;color:var(--stone);font-weight:300;line-height:1.5;margin-bottom:20px;}
.club-bar-wrap{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.club-bar-bg{flex:1;height:5px;background:var(--dark);border-radius:3px;overflow:hidden;}
.club-bar-fill{height:100%;background:linear-gradient(90deg,var(--deep-blue),var(--blit));border-radius:3px;transition:width .6s ease;}
.club-bar-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--blit);font-weight:600;white-space:nowrap;}
.club-milestones{display:flex;gap:0;border-top:1px solid var(--lineb);margin-top:16px;}
.club-milestone{flex:1;padding:12px 16px;border-right:1px solid var(--lineb);display:flex;flex-direction:column;gap:3px;}
.club-milestone:last-child{border-right:none;}
.club-ms-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.club-ms-val{font-size:13px;color:var(--mist);font-weight:300;}
.club-ms-val.done{color:var(--blit);}

/* ── Next box panel ── */
.next-panel{background:var(--char);border:1px solid var(--lineb);margin-top:16px;}
.next-head{padding:20px 24px;border-bottom:1px solid var(--lineb);display:flex;align-items:center;justify-content:space-between;}
.next-head-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.next-head-date{font-size:13px;color:var(--bone);font-weight:500;letter-spacing:.5px;}
.next-body{padding:24px;}
.next-items{display:flex;flex-direction:column;gap:8px;}
.next-item{display:flex;align-items:center;gap:12px;font-size:15px;color:var(--mist);font-weight:300;}
.next-item-dot{width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0;}
.next-item-tag{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-left:auto;}
.next-note{font-size:13px;color:var(--stone);font-weight:300;margin-top:16px;padding-top:16px;border-top:1px solid var(--line);line-height:1.6;}

/* ── Standard panels ── */
.ac-panel{border:1px solid var(--lineb);margin-top:16px;background:var(--char);}
.ac-panel-head{padding:20px 24px;border-bottom:1px solid var(--lineb);display:flex;align-items:center;justify-content:space-between;}
.ac-panel-label{font-size:11px;letter-spacing:5px;text-transform:uppercase;color:var(--blit);font-weight:700;}
.ac-panel-body{padding:24px;}
.ac-field-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;margin-bottom:5px;}
.ac-field-value{font-size:16px;color:var(--bone);font-weight:300;margin-bottom:20px;line-height:1.5;}
.ac-field-value:last-child{margin-bottom:0;}
.ac-panel-btn{background:transparent;color:var(--stone);border:1px solid var(--lineb);font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;padding:6px 16px;cursor:pointer;transition:border-color .2s,color .2s;}
.ac-panel-btn:hover{border-color:var(--bone);color:var(--bone);}

/* ── Form ── */
.ac-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.ac-form-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}
.ac-form-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--stone);font-weight:600;}
.ac-form-input{background:var(--dark);border:1px solid var(--lineb);color:var(--bone);padding:13px 16px;font-family:'Barlow Condensed',sans-serif;font-size:16px;outline:none;transition:border-color .2s;}
.ac-form-input:focus{border-color:var(--blue);}

/* ── Cancel flow ── */
.cancel-trigger{margin-top:32px;padding-top:24px;border-top:1px solid var(--line);}
.cancel-link{background:none;border:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--stone);cursor:pointer;padding:0;text-decoration:underline;text-decoration-color:rgba(106,115,128,0.4);transition:color .2s;}
.cancel-link:hover{color:#e05c5c;}
.retention-screen{background:var(--mid);border:1px solid rgba(224,92,92,0.2);margin-top:24px;overflow:hidden;}
.retention-head{padding:20px 24px;border-bottom:1px solid rgba(224,92,92,0.15);}
.retention-head-label{font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#e05c5c;font-weight:700;}
.retention-body{padding:24px;}
.retention-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:.04em;color:var(--bone);margin-bottom:8px;line-height:1.05;}
.retention-copy{font-size:15px;color:var(--mist);font-weight:300;line-height:1.7;margin-bottom:24px;}
.retention-stakes{display:flex;flex-direction:column;gap:8px;margin-bottom:24px;}
.retention-stake{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--char);border:1px solid var(--lineb);}
.retention-stake-icon{font-size:18px;flex-shrink:0;}
.retention-stake-text{font-size:14px;color:var(--mist);font-weight:300;line-height:1.4;}
.retention-stake-text strong{color:var(--bone);font-weight:600;display:block;}
.retention-actions{display:flex;flex-direction:column;gap:10px;}
.retention-stay{width:100%;background:var(--bone);color:var(--black);border:none;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.12em;padding:16px;cursor:pointer;transition:background .2s;}
.retention-stay:hover{background:#fff;}
.retention-proceed{background:none;border:1px solid rgba(224,92,92,0.3);color:var(--stone);font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:12px;cursor:pointer;width:100%;transition:border-color .2s,color .2s;}
.retention-proceed:hover{border-color:#e05c5c;color:#e05c5c;}
.confirm-screen{background:var(--char);border:1px solid rgba(224,92,92,0.25);padding:24px;margin-top:16px;}
.confirm-copy{font-size:15px;color:var(--mist);line-height:1.7;margin-bottom:20px;}
.confirm-actions{display:flex;gap:12px;flex-wrap:wrap;}
.btn-danger{background:#c0392b;color:#fff;border:none;font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.1em;padding:14px 28px;cursor:pointer;transition:background .2s;}
.btn-danger:hover:not(:disabled){background:#a93226;}
.btn-danger:disabled{background:var(--stone);cursor:wait;}
.cancelling-note{font-size:15px;color:#c8952a;font-weight:300;line-height:1.6;}
.past-due-note{font-size:15px;color:#e05c5c;font-weight:300;line-height:1.6;}

/* ── Header box image ── */
.ac-head-box{position:absolute;right:0;top:0;bottom:0;width:260px;pointer-events:none;}
.ac-head-box img{width:100%;height:100%;object-fit:cover;object-position:center left;opacity:0.12;mask-image:linear-gradient(to left,rgba(0,0,0,0.6) 0%,transparent 100%);-webkit-mask-image:linear-gradient(to left,rgba(0,0,0,0.6) 0%,transparent 100%);}

/* ── Kit strip ── */
.kit-strip{border-bottom:1px solid var(--lineb);padding:0 40px;background:var(--char);overflow-x:auto;scrollbar-width:none;}
.kit-strip::-webkit-scrollbar{display:none;}
.kit-strip-inner{display:flex;gap:1px;width:max-content;}
.kit-strip-item{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 12px;min-width:72px;}
.kit-strip-img{width:48px;height:60px;object-fit:cover;object-position:center;opacity:0.85;transition:opacity .2s;}
.kit-strip-item:hover .kit-strip-img{opacity:1;}
.kit-strip-num{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--blue);font-weight:600;}

/* ── 180 Club with image ── */
.club-inner{display:grid;grid-template-columns:1fr 160px;gap:0;align-items:stretch;}
.club-img-wrap{border-left:1px solid var(--lineb);overflow:hidden;position:relative;}
.club-img{width:100%;height:100%;object-fit:cover;object-position:center top;opacity:0.75;display:block;}
.club-img-label{position:absolute;bottom:0;left:0;right:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(240,236,226,0.6);text-align:center;padding:8px;background:linear-gradient(transparent,rgba(8,9,11,0.8));font-weight:600;}

/* ── Next box thumbnails ── */
.next-item-img{width:36px;height:46px;object-fit:cover;object-position:center;opacity:0.85;flex-shrink:0;border:1px solid var(--line);}
.next-item-img-placeholder{width:36px;height:46px;background:var(--dark);border:1px solid var(--line);flex-shrink:0;}

@media(max-width:600px){
  .ac-dash-head,.ac-body,.kit-strip{padding-left:24px;padding-right:24px;}
  .ac-form-row{grid-template-columns:1fr;}
  .club-milestones{flex-direction:column;}
  .club-milestone{border-right:none;border-bottom:1px solid var(--lineb);}
  .club-milestone:last-child{border-bottom:none;}
  .club-inner{grid-template-columns:1fr;}
  .club-img-wrap{display:none;}
  .ac-head-box{display:none;}
}
`;

/* ─── helpers ─── */
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function nextBoxItems(kitId, monthsActive) {
  const isRitual = kitId === 'ritual' || kitId === 'sovereign';
  const isQuarterlyMonth = monthsActive > 0 && monthsActive % 3 === 0;
  const is6Month = monthsActive > 0 && monthsActive % 6 === 0;
  const items = [...MONTHLY_ITEMS];
  if (isQuarterlyMonth) {
    items.push(...QUARTERLY_ITEMS);
    if (isRitual) items.push(...RITUAL_QUARTERLY);
  }
  if (is6Month) items.push('Scalp Massager');
  return { items, isQuarterlyMonth, is6Month };
}

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  const map = {
    active:     { label: 'Active',     cls: 'ac-status-active'     },
    cancelling: { label: 'Cancelling', cls: 'ac-status-cancelling' },
    cancelled:  { label: 'Cancelled',  cls: 'ac-status-cancelled'  },
    paused:     { label: 'Paused',     cls: 'ac-status-cancelled'  },
    past_due:   { label: 'Past Due',   cls: 'ac-status-past_due'   },
  };
  const b = map[status] ?? { label: status ?? '—', cls: '' };
  return <span className={`ac-status-badge ${b.cls}`}>{b.label}</span>;
}

/* ─── Kit Strip ─── */
function KitStrip({ kitId }) {
  const kit = KITS.find(k => k.id === kitId);
  if (!kit) return null;
  const products = PRODUCTS.filter(p => kit.productNums.includes(p.num) && !p.comingSoon);
  return (
    <div className="kit-strip">
      <div className="kit-strip-inner">
        {products.map(p => (
          <div key={p.num} className="kit-strip-item">
            {p.image
              ? <img src={p.image} alt={p.name} className="kit-strip-img" loading="lazy" />
              : <div style={{width:48,height:60,background:'var(--dark)',border:'1px solid var(--line)'}} />
            }
            <span className="kit-strip-num">{p.num}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── 180 Club Panel ─── */
function ClubPanel({ months }) {
  const m = Math.min(months ?? 0, 6);
  const pct = (m / 6) * 100;
  const earned = m >= 6;
  const sizeAsked = m >= 3;

  return (
    <div className="club-panel">
      <div className="club-head">
        <span className="club-head-label">The 180 Club</span>
        {earned && <span className="club-head-earned">Earned ✓</span>}
      </div>
      <div className="club-inner">
        <div className="club-body">
          <div className="club-title">{earned ? 'It Ships With Your Next Box.' : 'Earned, Not Bought.'}</div>
          <div className="club-sub">
            {earned
              ? 'Six months continuous. The SOLUM 180 tee ships with your next box. Beyond clean.'
              : `${6 - m} month${6 - m !== 1 ? 's' : ''} of continuous subscription earns you the SOLUM 180 tee — free, unannounced, ships with your box.`
            }
          </div>
          <div className="club-bar-wrap">
            <div className="club-bar-bg">
              <div className="club-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="club-bar-label">{m} / 6 months</span>
          </div>
          <div className="club-milestones">
            <div className="club-milestone">
              <span className="club-ms-label">Start</span>
              <span className={`club-ms-val${m >= 1 ? ' done' : ''}`}>{m >= 1 ? 'Done ✓' : 'Day 1'}</span>
            </div>
            <div className="club-milestone">
              <span className="club-ms-label">Month 3</span>
              <span className={`club-ms-val${sizeAsked ? ' done' : ''}`}>{sizeAsked ? 'Size confirmed ✓' : 'We ask your size'}</span>
            </div>
            <div className="club-milestone">
              <span className="club-ms-label">Month 6</span>
              <span className={`club-ms-val${earned ? ' done' : ''}`}>{earned ? 'Tee ships ✓' : 'Tee ships with box'}</span>
            </div>
          </div>
        </div>
        <div className="club-img-wrap">
          <img src={tshirtImg} alt="SOLUM 180 tee" className="club-img" />
          <div className="club-img-label">180 Club Tee</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Next Box Panel ─── */
function NextBoxPanel({ sub, kitId }) {
  if (!sub || sub.status !== 'active') return null;
  const months = sub.months_active ?? 0;
  const { items, isQuarterlyMonth, is6Month } = nextBoxItems(kitId, months + 1);
  const nextDate = formatDate(sub.current_period_end);

  return (
    <div className="next-panel">
      <div className="next-head">
        <span className="next-head-label">Next Box</span>
        <span className="next-head-date">{nextDate}</span>
      </div>
      <div className="next-body">
        <div className="next-items">
          {items.map(item => {
            const img = PRODUCT_IMAGES[item];
            const isQuarterly = (isQuarterlyMonth && QUARTERLY_ITEMS.includes(item)) || (is6Month && item === 'Scalp Massager');
            return (
              <div key={item} className="next-item">
                {img
                  ? <img src={img} alt={item} className="next-item-img" loading="lazy" />
                  : <div className="next-item-img-placeholder" />
                }
                <span>{item}</span>
                {isQuarterly && <span className="next-item-tag">Quarterly</span>}
              </div>
            );
          })}
        </div>
        {(isQuarterlyMonth || is6Month) && (
          <div className="next-note">
            This is a quarterly refresh box — tools and weekly ritual products ship alongside your monthly essentials.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Cancel Flow ─── */
function CancelFlow({ sub, months, nextBillingDate, onCancel, cancelling }) {
  const [step, setStep] = useState(null); // null | 'retention' | 'confirm'

  if (sub.status === 'cancelling') {
    return (
      <div className="cancel-trigger">
        <div className="cancelling-note">
          Cancellation scheduled for {formatDate(sub.cancel_at)}. No further boxes after that date.
        </div>
      </div>
    );
  }

  if (step === null) {
    return (
      <div className="cancel-trigger">
        <button className="cancel-link" onClick={() => setStep('retention')}>
          I want to cancel my subscription
        </button>
      </div>
    );
  }

  if (step === 'retention') {
    const monthsLeft = Math.max(0, 6 - (months ?? 0));
    return (
      <div className="retention-screen">
        <div className="retention-head">
          <span className="retention-head-label">Before You Go</span>
        </div>
        <div className="retention-body">
          <div className="retention-title">Here's What You'd Be Walking Away From.</div>
          <div className="retention-copy">
            Your subscription is still active until {nextBillingDate}. But we want to make sure you know what cancelling means for your progress.
          </div>
          <div className="retention-stakes">
            {months > 0 && (
              <div className="retention-stake">
                <span className="retention-stake-icon">📅</span>
                <div className="retention-stake-text">
                  <strong>{months} month{months !== 1 ? 's' : ''} of continuous ritual</strong>
                  Your skin has been properly maintained for {months} month{months !== 1 ? 's' : ''}. Stopping now resets what took time to build.
                </div>
              </div>
            )}
            {monthsLeft > 0 && (
              <div className="retention-stake">
                <span className="retention-stake-icon">👕</span>
                <div className="retention-stake-text">
                  <strong>The 180 Club — {monthsLeft} month{monthsLeft !== 1 ? 's' : ''} away</strong>
                  You're {months} of 6 months toward your free SOLUM 180 tee. Cancel now and the clock resets.
                </div>
              </div>
            )}
            {months >= 6 && (
              <div className="retention-stake">
                <span className="retention-stake-icon">✓</span>
                <div className="retention-stake-text">
                  <strong>You've earned the 180 Club tee</strong>
                  It ships with your next box. Cancel before it arrives and you forfeit it.
                </div>
              </div>
            )}
          </div>
          <div className="retention-actions">
            <button className="retention-stay" onClick={() => setStep(null)}>
              Keep My Subscription
            </button>
            <button className="retention-proceed" onClick={() => setStep('confirm')}>
              I still want to cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="retention-screen">
      <div className="retention-head">
        <span className="retention-head-label">Confirm Cancellation</span>
      </div>
      <div className="retention-body">
        <div className="confirm-copy">
          Your subscription will remain active until <strong style={{color:'var(--bone)'}}>{nextBillingDate}</strong>. After that, no further boxes will be sent and your 180 Club progress will be lost.
        </div>
        <div className="confirm-actions">
          <button className="btn-danger" onClick={onCancel} disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Yes, cancel my subscription'}
          </button>
          <button className="ac-btn-ghost" style={{width:'auto',padding:'10px 20px',marginTop:0}} onClick={() => setStep(null)}>
            Keep my subscription
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
function Dashboard({ session, customer, sub, address, setAddress, setSub, setCustomer, setPhase }) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [addrForm, setAddrForm]             = useState({ name: '', line1: '', line2: '', city: '', postcode: '' });
  const [addrSaving, setAddrSaving]         = useState(false);
  const [addrError, setAddrError]           = useState('');

  const [editingName, setEditingName] = useState(false);
  const [nameForm, setNameForm]       = useState({ first_name: '', last_name: '' });
  const [nameSaving, setNameSaving]   = useState(false);
  const [nameError, setNameError]     = useState('');
  const [cancelling, setCancelling]   = useState(false);

  const months = sub?.months_active ?? 0;
  const nextBillingDate = formatDate(sub?.current_period_end);

  function startEditName() {
    setNameForm({ first_name: customer?.first_name ?? '', last_name: customer?.last_name ?? '' });
    setNameError('');
    setEditingName(true);
  }

  async function saveName(e) {
    e.preventDefault();
    if (!nameForm.first_name.trim()) { setNameError('First name is required.'); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-customer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(nameForm),
      });
      if (!res.ok) throw new Error('Failed to save name');
      const updated = await res.json();
      setCustomer(c => ({ ...c, first_name: updated.first_name, last_name: updated.last_name }));
      setEditingName(false);
    } catch (err) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  }

  function startEditAddress() {
    setAddrForm({
      name:     address?.name ?? [customer?.first_name, customer?.last_name].filter(Boolean).join(' '),
      line1:    address?.line1    ?? '',
      line2:    address?.line2    ?? '',
      city:     address?.city     ?? '',
      postcode: address?.postcode ?? '',
    });
    setAddrError('');
    setEditingAddress(true);
  }

  async function saveAddress(e) {
    e.preventDefault();
    setAddrSaving(true);
    setAddrError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-address`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(addrForm),
      });
      if (!res.ok) throw new Error('Failed to save address');
      const updated = await res.json();
      setAddress(updated);
      setEditingAddress(false);
    } catch (err) {
      setAddrError(err.message);
    } finally {
      setAddrSaving(false);
    }
  }

  async function cancelSubscription() {
    setCancelling(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to cancel');
      const { cancel_at } = await res.json();
      setSub(s => ({ ...s, status: 'cancelling', cancel_at }));
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-wrap">

        {/* Header */}
        <div className="ac-dash-head" style={{position:'relative',overflow:'hidden'}}>
          <div className="ac-head-box">
            <img src="/solum-box-open-v4.png" alt="" aria-hidden="true" />
          </div>
          <div className="ac-head-top" style={{position:'relative',zIndex:1}}>
            <a href="/" className="ac-logo"><img src="/solum-wordmark-clean.svg" alt="SOLUM" /></a>
            <button className="ac-signout" onClick={() => { setPhase('login'); supabase.auth.signOut(); }}>
              Sign out
            </button>
          </div>
          <div className="ac-greeting" style={{position:'relative',zIndex:1}}>
            {customer?.first_name ? `${customer.first_name}.` : 'Your Account.'}
          </div>
          <div className="ac-head-meta" style={{position:'relative',zIndex:1}}>
            {sub?.kit_id && (
              <span className="ac-kit-badge">{sub.kit_id.toUpperCase()}</span>
            )}
            {sub?.status && <StatusBadge status={sub.status} />}
            {months > 0 && (
              <span className="ac-months-tag">{months} month{months !== 1 ? 's' : ''} active</span>
            )}
          </div>
        </div>

        {/* Kit strip */}
        {sub?.kit_id && <KitStrip kitId={sub.kit_id} />}

        <div className="ac-body">

          {/* 180 Club */}
          {sub?.status === 'active' || sub?.status === 'cancelling' ? (
            <ClubPanel months={months} />
          ) : null}

          {/* Next Box */}
          <NextBoxPanel sub={sub} kitId={sub?.kit_id} />

          {/* Subscription Panel */}
          <div className="ac-panel">
            <div className="ac-panel-head">
              <span className="ac-panel-label">Subscription</span>
            </div>
            <div className="ac-panel-body">
              <div className="ac-field-label">Kit</div>
              <div className="ac-field-value">{sub?.kit_id?.toUpperCase() ?? '—'}</div>

              {sub?.status === 'active' && (
                <>
                  <div className="ac-field-label">Next billing date</div>
                  <div className="ac-field-value">{nextBillingDate}</div>
                </>
              )}
              {sub?.status === 'past_due' && (
                <div className="past-due-note">
                  Your last payment failed. Email <a href="mailto:contact@bysolum.com" style={{color:'#e05c5c'}}>contact@bysolum.com</a> and we'll send a secure link to update your payment method.
                </div>
              )}

              {(sub?.status === 'active') && (
                <CancelFlow
                  sub={sub}
                  months={months}
                  nextBillingDate={nextBillingDate}
                  onCancel={cancelSubscription}
                  cancelling={cancelling}
                />
              )}
              {sub?.status === 'cancelling' && (
                <div className="cancel-trigger">
                  <div className="cancelling-note">
                    Cancellation scheduled for {formatDate(sub.cancel_at)}. Your box will still arrive on the above date.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Details */}
          <div className="ac-panel">
            <div className="ac-panel-head">
              <span className="ac-panel-label">Personal Details</span>
              {!editingName && (
                <button className="ac-panel-btn" onClick={startEditName}>Edit</button>
              )}
            </div>
            <div className="ac-panel-body">
              {!editingName ? (
                <>
                  <div className="ac-field-label">Name</div>
                  <div className="ac-field-value">
                    {[customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div className="ac-field-label">Email</div>
                  <div className="ac-field-value">{customer?.email ?? '—'}</div>
                </>
              ) : (
                <form onSubmit={saveName}>
                  <div className="ac-form-row">
                    <div className="ac-form-field">
                      <label className="ac-form-label">First name</label>
                      <input className="ac-form-input" value={nameForm.first_name}
                        onChange={e => setNameForm(f => ({...f, first_name: e.target.value}))} required />
                    </div>
                    <div className="ac-form-field">
                      <label className="ac-form-label">Last name</label>
                      <input className="ac-form-input" value={nameForm.last_name}
                        onChange={e => setNameForm(f => ({...f, last_name: e.target.value}))} />
                    </div>
                  </div>
                  {nameError && <div className="ac-err">{nameError}</div>}
                  <button className="ac-btn" type="submit" disabled={nameSaving}>
                    {nameSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="ac-btn-ghost" type="button" onClick={() => setEditingName(false)}>Cancel</button>
                </form>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="ac-panel">
            <div className="ac-panel-head">
              <span className="ac-panel-label">Shipping Address</span>
              {!editingAddress && (
                <button className="ac-panel-btn" onClick={startEditAddress}>
                  {address ? 'Update' : 'Add'}
                </button>
              )}
            </div>
            <div className="ac-panel-body">
              {!editingAddress ? (
                address ? (
                  <div className="ac-field-value">
                    {address.name}<br />
                    {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                    {address.city}, {address.postcode}<br />
                    United Kingdom
                  </div>
                ) : (
                  <div style={{fontSize:15,color:'var(--stone)',fontWeight:300,fontStyle:'italic'}}>
                    No shipping address on file — please add one.
                  </div>
                )
              ) : (
                <form onSubmit={saveAddress}>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Full name</label>
                    <input className="ac-form-input" value={addrForm.name}
                      onChange={e => setAddrForm(f => ({...f, name: e.target.value}))} required />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Address line 1</label>
                    <input className="ac-form-input" value={addrForm.line1}
                      onChange={e => setAddrForm(f => ({...f, line1: e.target.value}))} required />
                  </div>
                  <div className="ac-form-field">
                    <label className="ac-form-label">Address line 2 (optional)</label>
                    <input className="ac-form-input" value={addrForm.line2}
                      onChange={e => setAddrForm(f => ({...f, line2: e.target.value}))} />
                  </div>
                  <div className="ac-form-row">
                    <div className="ac-form-field">
                      <label className="ac-form-label">City</label>
                      <input className="ac-form-input" value={addrForm.city}
                        onChange={e => setAddrForm(f => ({...f, city: e.target.value}))} required />
                    </div>
                    <div className="ac-form-field">
                      <label className="ac-form-label">Postcode</label>
                      <input className="ac-form-input" value={addrForm.postcode}
                        onChange={e => setAddrForm(f => ({...f, postcode: e.target.value}))} required />
                    </div>
                  </div>
                  <div style={{fontSize:14,color:'var(--stone)',marginBottom:16}}>United Kingdom</div>
                  {addrError && <div className="ac-err">{addrError}</div>}
                  <button className="ac-btn" type="submit" disabled={addrSaving}>
                    {addrSaving ? 'Saving…' : 'Save Address'}
                  </button>
                  <button className="ac-btn-ghost" type="button" onClick={() => setEditingAddress(false)}>Cancel</button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Login ─── */
function LoginView({ phase, setPhase }) {
  const [email, setEmail]     = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setSending(true);
    const normalisedEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-account-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ email: normalisedEmail }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.reason === 'no_account') {
          setError('No account found for this email. If you think this is wrong, email contact@bysolum.co.uk.');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setSending(false);
        return;
      }
      setPhase('sent');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (phase === 'sent') {
    return (
      <div className="ac-page">
        <style>{CSS}</style>
        <div className="ac-login-wrap">
          <div className="ac-login-inner">
            <a href="/" className="ac-login-back">← Back to home</a>
            <div className="ac-login-heading">Check Your Email.</div>
            <div className="ac-login-sub">
              We've sent a login link to{' '}
              <strong style={{color:'var(--bone)'}}>{email.trim().toLowerCase()}</strong>.<br />
              Click it to access your account. The link expires in 1 hour.
            </div>
            <button className="ac-btn-ghost" onClick={() => setPhase('login')}>
              ← Wrong email? Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-login-wrap">
        <div className="ac-login-inner">
          <a href="/" className="ac-login-back">← Back to SOLUM</a>
          <div className="ac-login-heading">Your Account.</div>
          <div className="ac-login-sub">Enter your email and we'll send a login link. No password needed.</div>
          <form onSubmit={handleSend}>
            <input
              className="ac-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <div className="ac-err">{error}</div>}
            <button className="ac-btn" type="submit" disabled={sending || !email}>
              {sending ? 'Sending…' : 'Send Login Link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Loading ─── */
function LoadingView() {
  return (
    <div className="ac-page">
      <style>{CSS}</style>
      <div className="ac-loading">
        <span className="ac-loading-text">Loading…</span>
      </div>
    </div>
  );
}

/* ─── Mock data (dev only — ?mock=1) ─── */
const MOCK_CUSTOMER = {
  first_name: 'Marcus',
  last_name: 'R.',
  email: 'marcus@example.com',
};
const MOCK_SUB = {
  kit_id: 'ritual',
  status: 'active',
  months_active: 4,
  current_period_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  cancel_at: null,
};
const MOCK_ADDRESS = {
  name: 'Marcus R.',
  line1: '14 Shoreditch High Street',
  line2: '',
  city: 'London',
  postcode: 'E1 6JE',
};

function isMockMode() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalhost && new URLSearchParams(window.location.search).get('mock') === '1';
}

/* ─── Root ─── */
export default function AccountPage() {
  const [phase, setPhase]       = useState('loading');
  const [session, setSession]   = useState(null);
  const [customer, setCustomer] = useState(null);
  const [sub, setSub]           = useState(null);
  const [address, setAddress]   = useState(null);

  useEffect(() => {
    if (isMockMode()) {
      setCustomer(MOCK_CUSTOMER);
      setSub(MOCK_SUB);
      setAddress(MOCK_ADDRESS);
      setPhase('dashboard');
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setSession(session);
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          loadCustomerData(session);
        }
      } else {
        setSession(null);
        setCustomer(null);
        setSub(null);
        setAddress(null);
        setPhase('login');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadCustomerData(session) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-account`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setPhase('login'); return; }
      const { customer, subscription, address } = await res.json();
      if (!customer) { setPhase('login'); return; }
      setCustomer(customer);
      setSub(subscription);
      setAddress(address);
      setPhase('dashboard');
    } catch {
      setPhase('login');
    }
  }

  if (phase === 'loading')                   return <LoadingView />;
  if (phase === 'login' || phase === 'sent') return <LoginView phase={phase} setPhase={setPhase} />;
  return (
    <Dashboard
      session={session}
      customer={customer}
      sub={sub}
      address={address}
      setAddress={setAddress}
      setSub={setSub}
      setCustomer={setCustomer}
      setPhase={setPhase}
    />
  );
}
