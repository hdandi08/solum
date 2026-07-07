import { useState } from 'react';
import { validateApplication, NICHE_OPTIONS, DEAL_OPTIONS } from '../lib/creatorApplication.js';
import { jumpTop } from '../lib/scroll.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EMPTY = { name: '', email: '', instagram_handle: '', tiktok_handle: '',
  portfolio_url: '', follower_count: '', niche: '', deal_types: [], notes: '' };

const CSS = `
.cr-page{
  --black:#08090B; --charcoal:#181C24; --line:#1e2530;
  --deep-blue:#1A4A78; --steel-blue:#2E6DA4; --sky-blue:#4A8FC7; --bone:#F0ECE2;
  background:var(--black);color:var(--bone);font-family:'Barlow Condensed',sans-serif;min-height:100vh;
}
.cr-wrap{max-width:760px;margin:0 auto;padding:0 20px;}
.cr-page *{box-sizing:border-box;}
.cr-page :focus-visible{outline:2px solid var(--sky-blue);outline-offset:2px;}

/* Hero: full-bleed shoot image, brand rule motif borrowed from SOLUM box/email copy */
.cr-hero{position:relative;padding:0;overflow:hidden;}
.cr-hero-media{position:relative;height:min(72vh,580px);min-height:420px;}
.cr-hero-media img{width:100%;height:100%;object-fit:cover;object-position:50% 72%;display:block;filter:saturate(0.92) contrast(1.05);}
.cr-hero-scrim{position:absolute;inset:0;
  background:
    linear-gradient(180deg,rgba(8,9,11,0.55) 0%,rgba(8,9,11,0.25) 32%,rgba(8,9,11,0.65) 68%,var(--black) 100%),
    linear-gradient(90deg,rgba(8,9,11,0.35),rgba(8,9,11,0) 45%,rgba(8,9,11,0) 55%,rgba(8,9,11,0.35));
}
.cr-hero-copy{position:absolute;left:0;right:0;bottom:0;padding:0 20px 44px;text-align:center;}
.cr-hero-inner{max-width:640px;margin:0 auto;animation:cr-rise 0.7s ease-out both;}
.cr-rule{display:block;width:56px;height:2px;background:var(--sky-blue);margin:0 auto 18px;}
.cr-eyebrow{font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:var(--sky-blue);font-weight:600;margin:0 0 14px;}
.cr-h1{font-family:'Bebas Neue',sans-serif;letter-spacing:0.03em;font-size:clamp(38px,7.2vw,64px);line-height:0.96;margin:0 0 16px;text-transform:uppercase;}
.cr-sub{font-size:16px;color:rgba(240,236,226,0.8);line-height:1.7;max-width:480px;margin:0 auto;}
@keyframes cr-rise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@media(prefers-reduced-motion:reduce){.cr-hero-inner{animation:none;}}

/* Offer cards */
.cr-offer{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:44px 0 8px;}
.cr-card{background:var(--charcoal);border:1px solid var(--line);border-top:2px solid var(--sky-blue);padding:22px 20px;}
.cr-card h3{font-size:14px;font-weight:600;color:var(--bone);margin:0 0 8px;letter-spacing:0.06em;text-transform:uppercase;}
.cr-card p{font-size:13px;color:rgba(240,236,226,0.62);line-height:1.6;margin:0;}

/* Prose sections */
.cr-sec{padding:40px 0;border-top:1px solid var(--line);}
.cr-eyebrow-sm{display:block;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--sky-blue);font-weight:600;margin:0 0 10px;}
.cr-sec h2{font-family:'Bebas Neue',sans-serif;letter-spacing:0.03em;font-size:clamp(26px,4vw,32px);margin:0 0 14px;text-transform:uppercase;}
.cr-sec p{font-size:15px;color:rgba(240,236,226,0.72);line-height:1.75;max-width:560px;}

/* How it works: a real sequence, styled as a threaded timeline */
.cr-steps{list-style:none;margin:0;padding:0;max-width:520px;}
.cr-steps li{position:relative;padding:0 0 22px 42px;font-size:15px;color:rgba(240,236,226,0.8);line-height:1.6;}
.cr-steps li:last-child{padding-bottom:0;}
.cr-steps li::before{content:counter(step);counter-increment:step;position:absolute;left:0;top:0;width:26px;height:26px;border:1px solid var(--steel-blue);color:var(--sky-blue);font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;background:var(--charcoal);}
.cr-steps li::after{content:'';position:absolute;left:13px;top:26px;bottom:0;width:1px;background:var(--line);}
.cr-steps li:last-child::after{display:none;}
.cr-steps{counter-reset:step;}

/* Form */
.cr-form{padding:40px 0 96px;border-top:1px solid var(--line);}
.cr-form h2{font-family:'Bebas Neue',sans-serif;letter-spacing:0.03em;font-size:clamp(26px,4vw,32px);margin:0 0 6px;text-transform:uppercase;}
.cr-form-lede{font-size:14px;color:rgba(240,236,226,0.55);margin:0 0 26px;}
.cr-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;}
.cr-field{margin:0 0 16px;}
.cr-field label{display:block;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(240,236,226,0.55);margin:0 0 6px;}
.cr-field input,.cr-field select,.cr-field textarea{
  width:100%;background:var(--black);border:1px solid var(--line);color:var(--bone);
  font-size:15px;padding:13px 14px;font-family:inherit;transition:border-color 0.15s ease;
}
.cr-field input:hover,.cr-field select:hover,.cr-field textarea:hover{border-color:#2a3340;}
.cr-field input:focus,.cr-field select:focus,.cr-field textarea:focus{border-color:var(--steel-blue);outline:none;}
.cr-field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234A8FC7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;}
.cr-field textarea{resize:vertical;min-height:76px;}
.cr-field .err{color:#e88888;font-size:12px;margin-top:5px;}
.cr-deals{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;color:rgba(240,236,226,0.8);}
.cr-deals label{display:flex;align-items:center;gap:7px;letter-spacing:0;text-transform:capitalize;cursor:pointer;}
.cr-deals input{width:auto;accent-color:#4A8FC7;}
.cr-server-err{color:#e88888;font-size:13px;margin:0 0 14px;}
.cr-submit{
  width:100%;background:var(--bone);color:var(--black);border:none;font-size:13px;letter-spacing:0.24em;
  text-transform:uppercase;font-weight:700;padding:18px;cursor:pointer;font-family:inherit;transition:opacity 0.15s ease;
}
.cr-submit:hover:not(:disabled){opacity:0.88;}
.cr-submit:disabled{opacity:0.5;cursor:default;}

/* Thanks */
.cr-thanks{text-align:center;padding:140px 0;}
.cr-thanks h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(32px,5vw,40px);letter-spacing:0.03em;text-transform:uppercase;margin:0 0 14px;}

@media(max-width:640px){
  .cr-offer{grid-template-columns:1fr;}
  .cr-grid{grid-template-columns:1fr;}
  .cr-hero-media{height:min(64vh,480px);min-height:360px;}
}
`;

export default function CreatorsApplyPage() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleDeal = (d) => setForm(f => ({ ...f, deal_types: f.deal_types.includes(d) ? f.deal_types.filter(x => x !== d) : [...f.deal_types, d] }));

  async function submit(e) {
    e.preventDefault();
    const { valid, errors } = validateApplication(form);
    setErrors(errors);
    if (!valid) return;
    setSubmitting(true); setServerError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-creator-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          utm_source: params.get('utm_source'), utm_medium: params.get('utm_medium'), utm_campaign: params.get('utm_campaign'),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setServerError(data.error || 'Something went wrong. Please try again.'); return; }
      try { window.posthog?.capture?.('creator_application_submitted', { niche: form.niche }); } catch { /* ignore */ }
      setDone(true);
      jumpTop();
    } catch { setServerError('Something went wrong. Please try again.'); }
    finally { setSubmitting(false); }
  }

  if (done) return (
    <div className="cr-page"><style>{CSS}</style><div className="cr-wrap cr-thanks">
      <span className="cr-rule" />
      <p className="cr-eyebrow">Application received</p>
      <h2>Thanks. We will review your content.</h2>
      <p className="cr-sub">We look at every application by hand. If it is a fit, we will be in touch with the next steps. Check your inbox for a confirmation.</p>
    </div></div>
  );

  return (
    <div className="cr-page"><style>{CSS}</style>
      <section className="cr-hero">
        <div className="cr-hero-media">
          <img src="/email/promo-man.jpg" alt="" />
          <div className="cr-hero-scrim" />
        </div>
        <div className="cr-hero-copy">
          <div className="cr-hero-inner">
            <span className="cr-rule" />
            <p className="cr-eyebrow">Create with SOLUM</p>
            <h1 className="cr-h1">Get paid to<br/>create with SOLUM.</h1>
            <p className="cr-sub">SOLUM is a guided body care system for men, head to toe. We work with premium creators and couples on paid collaborations, a free kit, and ongoing affiliate. If your content is dark, premium, and real, we want to hear from you.</p>
          </div>
        </div>
      </section>

      <div className="cr-wrap">
        <section className="cr-offer">
          <div className="cr-card"><h3>Get paid</h3><p>Paid collaborations for the right creators. We sort the details once we have seen your work.</p></div>
          <div className="cr-card"><h3>Free premium kit</h3><p>The full guided SOLUM system, yours to keep and film with.</p></div>
          <div className="cr-card"><h3>Ongoing affiliate</h3><p>Your own code and commission on every sale you drive.</p></div>
        </section>

        <section className="cr-sec">
          <span className="cr-eyebrow-sm">The bar</span>
          <h2>Who we want</h2>
          <p>Premium male creators and couples who shoot dark, cinematic content. Grooming, fitness, lifestyle, or just real and well shot. The bar is quality, not follower count.</p>
        </section>

        <section className="cr-sec">
          <span className="cr-eyebrow-sm">The process</span>
          <h2>How it works</h2>
          <ol className="cr-steps">
            <li>Apply below with a link to your best content.</li>
            <li>We review your work by hand.</li>
            <li>If it is a fit, we send a kit and a brief.</li>
            <li>You create. You get paid.</li>
          </ol>
        </section>

        <form className="cr-form" onSubmit={submit} noValidate>
          <h2>Apply</h2>
          <p className="cr-form-lede">Tell us who you are and where we can see your work.</p>
          <div className="cr-grid">
            {[
              ['name', 'Name', 'text'], ['email', 'Email', 'email'],
              ['instagram_handle', 'Instagram handle', 'text'], ['tiktok_handle', 'TikTok handle (optional)', 'text'],
            ].map(([k, label, type]) => (
              <div className="cr-field" key={k}>
                <label>{label}</label>
                <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} />
                {errors[k] && <div className="err">{errors[k]}</div>}
              </div>
            ))}
          </div>
          <div className="cr-grid">
            {[
              ['portfolio_url', 'Link to your best content', 'url'],
              ['follower_count', 'Follower count', 'text'],
            ].map(([k, label, type]) => (
              <div className="cr-field" key={k}>
                <label>{label}</label>
                <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} />
                {errors[k] && <div className="err">{errors[k]}</div>}
              </div>
            ))}
          </div>
          <div className="cr-field">
            <label>Niche</label>
            <select value={form.niche} onChange={e => set('niche', e.target.value)} style={{ textTransform: 'capitalize' }}>
              <option value="">Select</option>
              {NICHE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.niche && <div className="err">{errors.niche}</div>}
          </div>
          <div className="cr-field">
            <label>Interested in (optional)</label>
            <div className="cr-deals">
              {DEAL_OPTIONS.map(d => (
                <label key={d}>
                  <input type="checkbox" checked={form.deal_types.includes(d)} onChange={() => toggleDeal(d)} /> {d}
                </label>
              ))}
            </div>
          </div>
          <div className="cr-field">
            <label>Anything else (optional)</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          {serverError && <div className="cr-server-err">{serverError}</div>}
          <button className="cr-submit" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Apply to create'}</button>
        </form>
      </div>
    </div>
  );
}
