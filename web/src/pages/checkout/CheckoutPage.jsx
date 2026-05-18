import { useState, useEffect, Fragment } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { KITS } from '../../data/kits.js';
import tshirtImg from '../../assets/solum-tshirt.jpeg';
import MobileHeader from './MobileHeader.jsx';
import OrderSummary from './OrderSummary.jsx';
import StepDetails from './StepDetails.jsx';
import StepDelivery from './StepDelivery.jsx';
import StepPayment from './StepPayment.jsx';
import './checkout.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY;
const STRIPE_KEY   = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_KEY);

const stripeAppearance = {
  theme: 'night',
  variables: {
    colorPrimary:       '#4A8FC7',
    colorBackground:    '#08090B',
    colorText:          '#F0ECE2',
    colorTextSecondary: 'rgba(168,180,188,0.8)',
    colorDanger:        '#e05c5c',
    fontFamily:         '"Barlow Condensed", system-ui, sans-serif',
    fontSizeBase:       '16px',
    borderRadius:       '0px',
    spacingUnit:        '5px',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(240,236,226,0.15)',
      backgroundColor: '#08090B',
      padding: '14px 16px',
    },
    '.Input:focus': { border: '1px solid #4A8FC7', boxShadow: 'none', outline: 'none' },
    '.Label': {
      fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase',
      fontWeight: '600', color: 'rgba(168,180,188,0.9)', marginBottom: '7px',
    },
    '.Tab': { border: '1px solid rgba(240,236,226,0.15)', backgroundColor: '#08090B' },
    '.Tab--selected': { border: '1px solid #4A8FC7', backgroundColor: '#0d1520' },
  },
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function isValidUKPhone(raw) {
  // Strip spaces, dashes, dots, brackets
  const cleaned = raw.replace(/[\s\-().]/g, '');
  // Strip a leading + to get pure digits
  const digits = cleaned.replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return false;
  // UK numbers: +447xxx = 12 digits starting with 44; 07xxx = 11 digits starting with 0
  if (digits.startsWith('44')) return digits.length === 12;
  if (digits.startsWith('0'))  return digits.length === 11;
  return false;
}

function getDispatchDate() {
  const now = new Date();
  const day = now.getDay();
  const isBeforeNoon = now.getHours() < 12;
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const daysToAdd = { 1: 3, 2: 2, 4: 4, 5: 3, 6: 2 };
  if (day in daysToAdd) d.setDate(d.getDate() + daysToAdd[day]);
  else if (day === 3) d.setDate(d.getDate() + (isBeforeNoon ? 1 : 5));
  else d.setDate(d.getDate() + (isBeforeNoon ? 1 : 4));
  return d;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function getFirstChargeDate() { const r = new Date(); r.setDate(r.getDate() + 30); r.setHours(0, 0, 0, 0); return r; }

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

// ── Main component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const kitId    = params.get('kit');
  const kit      = KITS.find(k => k.id === kitId);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    birth_year: '', birth_month: '',
    line1: '', line2: '', city: '', postcode: '',
  });

  const [step, setStep]           = useState('details');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [interstitial, setInterstitial] = useState(null); // null | 'upgrade' | 'addon'

  const [clientSecret, setClientSecret] = useState(null);
  const [payInfo, setPayInfo]           = useState(null);
  const [activeKitId, setActiveKitId]   = useState(kitId);

  const [inventoryAvailable, setInventoryAvailable] = useState(null);
  const [waitlistForm, setWaitlistForm]   = useState({ first_name: '', last_name: '', email: '' });
  const [waitlistState, setWaitlistState] = useState('idle');

  useEffect(() => {
    if (!kit) return;
    fetch(`${SUPABASE_URL}/functions/v1/get-inventory-status`, {
      headers: { apikey: ANON_KEY },
    })
      .then(r => r.json())
      .then(data => setInventoryAvailable(data?.kits?.[kit.id] !== false))
      .catch(() => setInventoryAvailable(true));
  }, [kit?.id]); // eslint-disable-line

  if (!kit || kit.comingSoon) { navigate('/#kits'); return null; }

  const activeKit  = KITS.find(k => k.id === activeKitId) ?? kit;
  const ritualKit  = KITS.find(k => k.id === 'ritual');

  const dispatch    = getDispatchDate();
  const arrival     = addDays(dispatch, 2);
  const firstCharge = getFirstChargeDate();
  const refillShip  = addDays(firstCharge, 2);
  const refillArrive = addDays(firstCharge, 4);

  function onChange(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  // ── Step navigation ───────────────────────────────────────────────────────

  function handleDetailsNext() {
    setError('');
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    const emailVal = form.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setError('Please enter a valid email address.'); return;
    }
    if (!form.birth_year) { setError('Birth year is required.'); return; }
    if (!form.birth_month) { setError('Birth month is required.'); return; }
    if (form.birth_year < 1940 || form.birth_year > 2006) {
      setError('Birth year must be between 1940 and 2006.'); return;
    }
    if (!form.phone.trim()) { setError('Phone number is required.'); return; }
    if (!isValidUKPhone(form.phone)) {
      setError('Please enter a valid UK phone number (e.g. 07700 900000 or +44 7700 900000).');
      return;
    }
    setStep('delivery');
    window.scrollTo(0, 0);
  }

  async function handleDeliveryNext() {
    setError('');
    if (!form.line1.trim()) { setError('Address line 1 is required.'); return; }
    if (!form.city.trim())  { setError('City is required.'); return; }
    if (!form.postcode.trim()) { setError('Postcode is required.'); return; }

    setLoading(true);

    // DNS check
    try {
      const domain = form.email.trim().split('@')[1];
      const dnsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
        { headers: { Accept: 'application/dns-json' } },
      );
      const dns = await dnsRes.json();
      if (dns.Status === 3 || !dns.Answer?.length) {
        setError(`We couldn't find a mail server for ${domain}. Please check your email.`);
        setLoading(false);
        return;
      }
    } catch { /* allow through if DNS lookup fails */ }

    setLoading(false);

    if (kit.id === 'ground') {
      setInterstitial('upgrade');
    } else {
      await initiatePayment(kit.id, []);
    }
  }

  async function initiatePayment(kId, addons = []) {
    setInterstitial(null);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          kit_id:      kId,
          email:       form.email.trim(),
          first_name:  form.first_name.trim(),
          last_name:   form.last_name.trim() || null,
          birth_year:  form.birth_year  ? parseInt(form.birth_year,  10) : null,
          birth_month: form.birth_month ? parseInt(form.birth_month, 10) : null,
          phone:       form.phone.trim() || null,
          line1:       form.line1.trim(),
          line2:       form.line2.trim() || null,
          city:        form.city.trim(),
          postcode:    form.postcode.trim(),
          addons,
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'existing_subscriber') {
        setError(
          'You already have an active subscription with this email. ' +
          'Log in to your account to manage it.',
        );
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setClientSecret(data.client_secret);
      setPayInfo(data);
      setActiveKitId(kId);
      setStep('payment');
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWaitlist(e) {
    e.preventDefault();
    const emailVal = waitlistForm.email.trim();
    if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return;
    setWaitlistState('submitting');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({
          email:      emailVal,
          first_name: waitlistForm.first_name.trim() || null,
          last_name:  waitlistForm.last_name.trim()  || null,
          kit_id:     kit.id,
        }),
      });
      if (!res.ok) throw new Error();
      setWaitlistState('done');
    } catch { setWaitlistState('error'); }
  }

  // ── Shared props ──────────────────────────────────────────────────────────

  const summaryProps = {
    kit, activeKit, dispatch, arrival, firstCharge, refillShip, refillArrive,
    inventoryAvailable,
    showUpgradeNudge: kit.id === 'ground' && step !== 'payment',
    ritualKit,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Interstitial: Upgrade to RITUAL? */}
      {interstitial === 'upgrade' && ritualKit && (
        <div className="co-overlay-step">
          <div className="co-overlay-step-inner">
            <button className="co-overlay-close" onClick={() => setInterstitial(null)}>✕</button>
            <div className="co-overlay-eyebrow">Before you go</div>
            <div className="co-overlay-title">
              Most men who start<br />with GROUND — upgrade.
            </div>
            <p className="co-overlay-body">
              The argan oil is the step that changes what your skin feels like long-term.
              Without it, you're doing 80% of the ritual. RITUAL adds the weekly oil
              treatment — the part most men say they wish they'd started with.
            </p>
            <div className="co-overlay-perks">
              <div className="co-overlay-perk">
                → <strong>Products 01–08</strong> — everything in GROUND plus argan oil
              </div>
              <div className="co-overlay-perk">
                → <strong>Weekly oil ritual</strong> — skin that stays fed, not just after the shower
              </div>
              <div className="co-overlay-perk">
                → <strong>£{ritualKit.firstBoxPrice} first box</strong>, then £{ritualKit.monthlyPrice}/mo
                — only £{ritualKit.firstBoxPrice - kit.firstBoxPrice} more to start
              </div>
            </div>
            <div className="co-overlay-actions">
              <button className="co-overlay-btn-primary" onClick={() => initiatePayment('ritual', [])}>
                Upgrade to RITUAL — £{ritualKit.firstBoxPrice} →
              </button>
              <button className="co-overlay-btn-secondary" onClick={() => setInterstitial('addon')}>
                No thanks, stay with GROUND
              </button>
              <button className="co-overlay-btn-back" onClick={() => setInterstitial(null)}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interstitial: Add mixing bowl? */}
      {interstitial === 'addon' && (
        <div className="co-overlay-step">
          <div className="co-overlay-step-inner">
            <button className="co-overlay-close" onClick={() => setInterstitial(null)}>✕</button>
            <div className="co-overlay-eyebrow">One more thing</div>
            <div className="co-overlay-title">Add a mixing<br />bowl?</div>
            <div className="co-overlay-addon">
              <div className="co-overlay-addon-info">
                <div className="co-overlay-addon-name">Silicone Mixing Bowl</div>
                <div className="co-overlay-addon-desc">
                  Mix your clay mask in the shower without mess. Rinses clean in seconds. One use, every week.
                </div>
              </div>
              <div className="co-overlay-addon-price">£10</div>
            </div>
            <div className="co-overlay-actions">
              <button
                className="co-overlay-btn-primary"
                onClick={() => initiatePayment('ground', ['mixing_bowl'])}
              >
                Yes, add it — £{kit.firstBoxPrice + 10} total →
              </button>
              <button
                className="co-overlay-btn-secondary"
                onClick={() => initiatePayment('ground', [])}
              >
                No thanks, continue to payment
              </button>
              <button className="co-overlay-btn-back" onClick={() => setInterstitial('upgrade')}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay — 180 Club teaser */}
      {loading && (
        <div className="co-loading-overlay">
          <div className="co-loading-inner">
            <div className="co-loading-tag">The 180 Club</div>
            <img src={tshirtImg} alt="SOLUM 180 Tee" className="co-loading-img" />
            <div className="co-loading-title">You Can't Buy This.</div>
            <div className="co-loading-rule">Not for sale. Not in the shop. Only earned.</div>
            <p className="co-loading-body">
              Six months of continuous subscription — that's the only qualification.<br />
              Stay consistent. Do the ritual. At month six it ships with your box.
            </p>
            <div className="co-loading-spinner">
              <div className="co-loading-dot" />
              <div className="co-loading-dot" />
              <div className="co-loading-dot" />
              <span>Preparing secure payment…</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment step — requires Elements context */}
      {step === 'payment' && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
          <div className="co-page">
            <div className="co-left">
              <MobileHeader
                kit={activeKit}
                dispatch={dispatch}
                arrival={arrival}
                firstCharge={firstCharge}
                refillShip={refillShip}
              />
              <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
                ← Choose a different kit
              </a>
              <ProgressBar step="payment" />
              <StepPayment
                activeKit={activeKit}
                payInfo={payInfo}
                form={form}
                onBack={() => { setStep('delivery'); window.scrollTo(0, 0); }}
              />
            </div>
            <OrderSummary {...summaryProps} />
          </div>
        </Elements>
      ) : (
        <div className="co-page">
          <div className="co-left">
            <MobileHeader
              kit={activeKit}
              dispatch={dispatch}
              arrival={arrival}
              firstCharge={firstCharge}
              refillShip={refillShip}
            />
            <a className="co-back-btn" href="/#kits" style={{ marginTop: 0, marginBottom: 20 }}>
              ← Choose a different kit
            </a>

            {inventoryAvailable === false ? (
              <div className="co-waitlist">
                {waitlistState === 'done' ? (
                  <div className="co-waitlist-done">
                    <div className="co-waitlist-done-tick">✓</div>
                    <div className="co-waitlist-done-title">You're on the list.</div>
                    <div className="co-waitlist-done-body">
                      We'll email you the moment {kit.name} is back in stock.
                      Usually within a week.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="co-waitlist-eyebrow">Sold Out</div>
                    <div className="co-waitlist-title">Get notified<br />when it's back.</div>
                    <div className="co-waitlist-body">
                      {kit.name} is temporarily out of stock. Leave your details and we'll
                      email you the moment it's available.
                    </div>
                    <form onSubmit={handleWaitlist} noValidate>
                      <div className="co-row">
                        <div className="co-field">
                          <label className="co-label">First Name</label>
                          <input
                            className="co-input"
                            value={waitlistForm.first_name}
                            onChange={e => setWaitlistForm(f => ({ ...f, first_name: e.target.value }))}
                            placeholder="James"
                          />
                        </div>
                        <div className="co-field">
                          <label className="co-label">Last Name</label>
                          <input
                            className="co-input"
                            value={waitlistForm.last_name}
                            onChange={e => setWaitlistForm(f => ({ ...f, last_name: e.target.value }))}
                            placeholder="Smith"
                          />
                        </div>
                      </div>
                      <div className="co-field">
                        <label className="co-label">Email</label>
                        <input
                          className="co-input"
                          type="email"
                          value={waitlistForm.email}
                          onChange={e => setWaitlistForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="james@example.com"
                          required
                        />
                      </div>
                      {waitlistState === 'error' && (
                        <div className="co-error">Something went wrong — please try again.</div>
                      )}
                      <button
                        type="submit"
                        className="co-waitlist-submit"
                        disabled={waitlistState === 'submitting'}
                      >
                        {waitlistState === 'submitting' ? 'Saving…' : 'Notify Me When Available →'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : (
              <>
                <ProgressBar step={step} />

                {step === 'details' && (
                  <StepDetails
                    form={form}
                    onChange={onChange}
                    onNext={handleDetailsNext}
                    loading={loading}
                    error={error}
                  />
                )}

                {step === 'delivery' && (
                  <StepDelivery
                    form={form}
                    onChange={onChange}
                    onBack={() => { setError(''); setStep('details'); window.scrollTo(0, 0); }}
                    onNext={handleDeliveryNext}
                    loading={loading}
                    error={error}
                    dispatch={dispatch}
                    arrival={arrival}
                  />
                )}
              </>
            )}
          </div>

          <OrderSummary {...summaryProps} />
        </div>
      )}
    </>
  );
}
