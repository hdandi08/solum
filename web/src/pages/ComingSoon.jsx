import { useState, useEffect } from 'react';

const styles = `
  .cs-wrap {
    min-height: 100vh;
    background: #08090b;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .cs-ghost {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(180px, 30vw, 420px);
    letter-spacing: -4px;
    color: transparent;
    -webkit-text-stroke: 1px rgba(46,109,164,0.055);
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    z-index: 0;
  }

  /* Top bar */
  .cs-topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 48px;
    height: 64px;
    background: rgba(8,9,11,0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 26px;
    letter-spacing: 0.18em;
    color: #f0ece2;
  }
  .cs-badge {
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2e6da4;
    border: 1px solid rgba(46,109,164,0.4);
    padding: 6px 14px;
  }

  /* Hero */
  .cs-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 120px 24px 80px;
    text-align: center;
  }
  .cs-eyebrow {
    font-size: 13px;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #2e6da4;
    margin-bottom: 28px;
    font-weight: 600;
  }
  .cs-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(56px, 10vw, 120px);
    letter-spacing: 0.04em;
    line-height: 0.92;
    color: #f0ece2;
    margin-bottom: 32px;
  }
  .cs-headline em { color: #4a8fc7; font-style: normal; }
  .cs-subhead {
    font-size: clamp(16px, 2.2vw, 20px);
    font-weight: 300;
    color: rgba(240,236,226,0.88);
    max-width: 520px;
    line-height: 1.55;
    margin-bottom: 48px;
  }

  /* Stats */
  .cs-stats {
    display: flex;
    gap: 0;
    border: 1px solid rgba(240,236,226,0.07);
    margin-bottom: 52px;
    max-width: 600px;
    width: 100%;
  }
  .cs-stat {
    flex: 1;
    padding: 24px 20px;
    border-right: 1px solid rgba(240,236,226,0.07);
    text-align: center;
  }
  .cs-stat:last-child { border-right: none; }
  .cs-stat-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 0.05em;
    color: #4a8fc7;
    line-height: 1;
    margin-bottom: 6px;
  }
  .cs-stat-label {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.75);
    font-weight: 600;
    line-height: 1.4;
  }

  /* Email form */
  .cs-form-wrap {
    width: 100%;
    max-width: 480px;
    margin-bottom: 20px;
  }
  .cs-offer {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4a8fc7;
    font-weight: 600;
    margin-bottom: 16px;
  }
  .cs-offer-bar {
    background: rgba(46,109,164,0.1);
    border: 1px solid rgba(46,109,164,0.25);
    padding: 12px 20px;
    margin-bottom: 20px;
    font-size: 15px;
    color: #f0ece2;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .cs-offer-bar strong { color: #4a8fc7; }

  /* Mailchimp overrides */
  #mc_embed_signup { background: transparent !important; font-family: 'Barlow Condensed', sans-serif !important; width: 100%; }
  #mc_embed_signup form { padding: 0 !important; }
  #mc_embed_signup .mc-field-group { width: 100% !important; padding-bottom: 0 !important; }
  #mc_embed_signup input.email {
    width: 100% !important; background: rgba(24,28,36,0.8) !important;
    border: 1px solid rgba(46,109,164,0.35) !important; border-bottom: none !important;
    color: #f0ece2 !important; font-family: 'Barlow Condensed', sans-serif !important;
    font-size: 15px !important; letter-spacing: 1px !important; padding: 16px 20px !important;
    outline: none !important; border-radius: 0 !important; height: auto !important;
  }
  #mc_embed_signup input.email::placeholder { color: rgba(240,236,226,0.3) !important; }
  #mc_embed_signup input.email:focus { border-color: rgba(74,143,199,0.6) !important; }
  #mc_embed_signup .button {
    width: 100% !important; background: #2e6da4 !important; color: #f0ece2 !important;
    font-family: 'Bebas Neue', sans-serif !important; font-size: 18px !important;
    letter-spacing: 3px !important; padding: 16px 32px !important; border: none !important;
    border-radius: 0 !important; cursor: crosshair !important; transition: background 0.2s !important;
    height: auto !important; line-height: 1 !important; margin: 0 !important;
  }
  #mc_embed_signup .button:hover { background: #4a8fc7 !important; }
  #mc_embed_signup div#mce-responses { padding: 0 !important; margin: 0 !important; float: none !important; width: 100% !important; }
  #mc_embed_signup #mce-error-response,
  #mc_embed_signup #mce-success-response { font-size: 13px !important; letter-spacing: 1px !important; padding: 10px 0 0 !important; margin: 0 !important; }
  #mc_embed_signup #mce-success-response { color: #3aaa68 !important; }

  /* Fallback form */
  .cs-form-placeholder { display: flex; flex-direction: column; gap: 0; }
  .cs-input {
    background: rgba(24,28,36,0.8);
    border: 1px solid rgba(46,109,164,0.35);
    border-bottom: none;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 15px;
    letter-spacing: 1px;
    padding: 16px 20px;
    outline: none;
    width: 100%;
  }
  .cs-input::placeholder { color: rgba(240,236,226,0.3); }
  .cs-input:focus { border-color: rgba(74,143,199,0.6); }
  .cs-submit {
    width: 100%;
    background: #2e6da4;
    color: #f0ece2;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 3px;
    padding: 16px 32px;
    border: none;
    cursor: crosshair;
    transition: background 0.2s;
  }
  .cs-submit:hover { background: #4a8fc7; }
  .cs-submit.sent { background: #1a4a78; cursor: default; }
  .cs-privacy {
    font-size: 13px;
    letter-spacing: 1.5px;
    color: rgba(240,236,226,0.7);
    text-transform: uppercase;
    margin-top: 12px;
  }

  /* Provenance */
  .cs-provenance {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid rgba(240,236,226,0.055);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-prov-item {
    padding: 36px 28px;
    border-right: 1px solid rgba(240,236,226,0.055);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cs-prov-item:last-child { border-right: none; }
  .cs-prov-flag { font-size: 28px; line-height: 1; }
  .cs-prov-country {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2e6da4;
    font-weight: 600;
  }
  .cs-prov-tradition {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-prov-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.82);
    line-height: 1.6;
  }
  .cs-prov-products {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(46,109,164,0.8);
    font-weight: 600;
    margin-top: 4px;
  }

  /* Ritual */
  .cs-ritual {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-ritual-col {
    padding: 52px 44px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .cs-ritual-col:first-child { border-right: 1px solid rgba(240,236,226,0.055); }
  .cs-ritual-header { display: flex; flex-direction: column; gap: 8px; }
  .cs-ritual-tag {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .cs-ritual-tag.daily { color: #2e6da4; }
  .cs-ritual-tag.weekly { color: #c8a96e; }
  .cs-ritual-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 40px;
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-ritual-time {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.65);
    font-weight: 600;
  }
  .cs-ritual-steps { display: flex; flex-direction: column; gap: 2px; }
  .cs-ritual-step {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(240,236,226,0.04);
  }
  .cs-ritual-step:last-child { border-bottom: none; }
  .cs-step-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 0.05em;
    min-width: 24px;
  }
  .cs-step-num.daily { color: #2e6da4; }
  .cs-step-num.weekly { color: #c8a96e; }
  .cs-step-body { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .cs-step-name {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #f0ece2;
    text-transform: uppercase;
  }
  .cs-step-note {
    font-size: 13px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    line-height: 1.5;
  }
  .cs-step-prod {
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
  }
  .cs-step-prod.daily { color: #4a8fc7; }
  .cs-step-prod.weekly { color: #c8a96e; }

  /* Subscription section */
  .cs-sub {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-left {
    padding: 64px 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
    border-right: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-tag {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: #2e6da4;
    font-weight: 600;
  }
  .cs-sub-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 4vw, 56px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
  }
  .cs-sub-body {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.85);
    line-height: 1.65;
    max-width: 420px;
  }
  .cs-sub-right {
    padding: 64px 48px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }
  .cs-sub-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 0;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-sub-item:last-child { border-bottom: none; }
  .cs-sub-item-tag {
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2e6da4;
    font-weight: 600;
  }
  .cs-sub-item-title {
    font-size: 18px;
    font-weight: 600;
    color: #f0ece2;
    letter-spacing: 0.5px;
  }
  .cs-sub-item-body {
    font-size: 14px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    line-height: 1.5;
  }

  /* Second CTA */
  .cs-cta2 {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 24px;
    text-align: center;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-cta2-headline {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 5vw, 60px);
    letter-spacing: 0.06em;
    color: #f0ece2;
    line-height: 1;
    margin-bottom: 12px;
  }
  .cs-cta2-sub {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.78);
    margin-bottom: 40px;
    letter-spacing: 0.3px;
  }

  /* Product pills */
  .cs-products-wrap {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px;
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-products-label {
    font-size: 12px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.6);
    font-weight: 600;
    margin-bottom: 20px;
  }
  .cs-products { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 640px; }
  .cs-pill {
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.88);
    border: 1px solid rgba(240,236,226,0.12);
    padding: 8px 16px;
    font-weight: 600;
  }
  .cs-pill span { color: #2e6da4; margin-right: 6px; }

  /* Marquee */
  .cs-marquee-wrap {
    position: relative;
    z-index: 1;
    overflow: hidden;
    padding: 14px 0;
    background: rgba(24,28,36,0.6);
    border-bottom: 1px solid rgba(240,236,226,0.055);
  }
  .cs-marquee-track {
    display: flex;
    animation: marquee 28s linear infinite;
    width: max-content;
  }
  .cs-marquee-item {
    font-size: 13px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.82);
    font-weight: 600;
    padding: 0 28px;
    white-space: nowrap;
  }
  .cs-marquee-dot {
    display: inline-block;
    width: 3px; height: 3px;
    background: #2e6da4;
    border-radius: 50%;
    vertical-align: middle;
    margin-left: 28px;
  }
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* Footer */
  .cs-footer {
    position: relative;
    z-index: 1;
    padding: 32px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cs-footer-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    color: rgba(240,236,226,0.88);
  }
  .cs-footer-contact {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.7);
    text-decoration: none;
    transition: color 0.2s;
  }
  .cs-footer-contact:hover { color: #f0ece2; }
  .cs-footer-ig {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #f0ece2;
    text-decoration: none;
    font-weight: 600;
    border: 1px solid rgba(46,109,164,0.5);
    padding: 10px 16px;
    background: rgba(46,109,164,0.08);
    transition: border-color 0.2s, background 0.2s;
  }
  .cs-footer-ig:hover { border-color: #4a8fc7; background: rgba(74,143,199,0.13); }
  .cs-footer-ig svg { width: 17px; height: 17px; color: #4a8fc7; flex-shrink: 0; }

  /* Glow */
  .cs-glow {
    position: fixed;
    bottom: -200px; left: 50%;
    transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(46,109,164,0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 768px) {
    .cs-topbar { padding: 0 20px; }
    .cs-main { padding: 100px 20px 60px; }
    .cs-eyebrow { font-size: 12px; letter-spacing: 4px; }
    .cs-subhead { font-size: 17px; }
    .cs-stats { flex-direction: column; }
    .cs-stat { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.07); }
    .cs-stat:last-child { border-bottom: none; }
    .cs-stat-num { font-size: 44px; }
    .cs-stat-label { font-size: 14px; }
    .cs-provenance { grid-template-columns: 1fr 1fr; }
    .cs-prov-item { padding: 28px 20px; }
    .cs-prov-item:nth-child(2) { border-right: none; }
    .cs-prov-item:nth-child(3) { border-top: 1px solid rgba(240,236,226,0.055); }
    .cs-prov-item:nth-child(4) { border-top: 1px solid rgba(240,236,226,0.055); border-right: none; }
    .cs-prov-tradition { font-size: 22px; }
    .cs-prov-body { font-size: 14px; }
    .cs-ritual { grid-template-columns: 1fr; }
    .cs-ritual-col:first-child { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.055); }
    .cs-ritual-col { padding: 40px 24px; }
    .cs-ritual-title { font-size: 36px; }
    .cs-step-name { font-size: 15px; }
    .cs-step-note { font-size: 14px; }
    .cs-sub { grid-template-columns: 1fr; }
    .cs-sub-left { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.055); padding: 48px 24px; }
    .cs-sub-right { padding: 40px 24px; }
    .cs-sub-body { font-size: 16px; }
    .cs-sub-item-title { font-size: 17px; }
    .cs-sub-item-body { font-size: 15px; }
    .cs-cta2-sub { font-size: 16px; }
    .cs-footer { flex-direction: column; gap: 16px; text-align: center; padding: 24px 20px; }
  }
`;

const MARQUEE_ITEMS = [
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco · Turkey',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco · Turkey',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Monthly. Automatic. Never Run Out.',
];

const PRODUCTS = [
  { num: '01', name: 'Body Wash' },
  { num: '02', name: 'Italy Towel Mitt' },
  { num: '03', name: 'Exfoliating Cloth' },
  { num: '04', name: 'Scalp Massager' },
  { num: '05', name: 'Atlas Clay' },
  { num: '06', name: 'Body Oil' },
  { num: '07', name: 'Body Lotion' },
  { num: '08', name: 'Bamboo Cloth' },
  { num: '09', name: 'Kese Mitt' },
];

const MC_ACTION = 'https://bysolum.us5.list-manage.com/subscribe/post?u=45c32693942e5a8c9e6828488&id=31f70ffa8e&f_id=0099c2e1f0';
const MC_HONEYPOT = 'b_45c32693942e5a8c9e6828488_31f70ffa8e';

function MailchimpForm({ label = 'Claim Early Access' }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // Delay success state so form POST completes before unmounting
    setTimeout(() => setSubmitted(true), 800);
  };

  return (
    <div className="cs-form-placeholder">
      {/* iframe always in DOM so it exists when form submits */}
      <iframe name="mc_iframe" style={{ display: 'none' }} title="mc" />
      {!submitted ? (
        <form
          action={MC_ACTION}
          method="post"
          target="mc_iframe"
          onSubmit={handleSubmit}
        >
          <input
            className="cs-input"
            type="email"
            name="EMAIL"
            placeholder="Enter your email address"
            required
          />
          {/* Mailchimp honeypot — do not remove */}
          <input type="text" name={MC_HONEYPOT} style={{ position: 'absolute', left: '-5000px' }} tabIndex="-1" defaultValue="" />
          <button type="submit" className="cs-submit">{label}</button>
        </form>
      ) : (
        <button className="cs-submit sent">✓ You're on the list</button>
      )}
    </div>
  );
}

export default function ComingSoon() {
  useEffect(() => {}, []);

  return (
    <>
      <style>{styles}</style>
      <div className="cs-wrap">
        <div className="cs-ghost">SOLUM</div>
        <div className="cs-glow" />

        <header className="cs-topbar">
          <span className="cs-logo">SOLUM</span>
          <div className="cs-badge">Launching Soon</div>
        </header>

        {/* 1 — Headline + subhead */}
        <main className="cs-main">
          <div className="cs-eyebrow">Men shower. Men don't actually clean.</div>
          <h1 className="cs-headline">
            Your Body.<br />Actually<br /><em>Taken Care Of.</em>
          </h1>
          <p className="cs-subhead">
            Most men shower every day and still have rough skin, a neglected back,
            and a scalp they've never properly cleaned.
            Not laziness — nobody built them a system.
            Korean bathhouses, Moroccan hammams, Turkish hamams — centuries of body ritual, perfected over generations.
            <strong style={{ color: '#f0ece2', fontWeight: 600 }}> SOLUM compressed that wisdom into 10 minutes. Built for modern men.</strong>
          </p>

          {/* 2 — Stats */}
          <div className="cs-stats">
            <div className="cs-stat">
              <div className="cs-stat-num">58%</div>
              <div className="cs-stat-label">of men use<br />zero skincare</div>
            </div>
            {/* TODO: verify "<10% of men moisturise their body" stat via Mintel before launch */}
            <div className="cs-stat">
              <div className="cs-stat-num">&lt;10%</div>
              <div className="cs-stat-label">of men ever<br />moisturise their body</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">8 min</div>
              <div className="cs-stat-label">the average shower.<br />we built the system to fit.</div>
            </div>
          </div>

          {/* 3 — CTA first */}
          <div className="cs-form-wrap">
            <div className="cs-offer">Early Access — Limited Spots</div>
            <div className="cs-offer-bar">
              Sign up now → get <strong>20% off your first kit</strong> at launch
            </div>
            <MailchimpForm label="Claim Early Access" />
            <div className="cs-privacy">No spam. One email when we launch. Unsubscribe any time.</div>
          </div>
        </main>

        {/* 4 — Provenance */}
        <div className="cs-provenance">
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇬🇧</div>
            <div className="cs-prov-country">United Kingdom</div>
            <div className="cs-prov-tradition">British Formulation</div>
            <div className="cs-prov-body">Amino acid body wash and fast-absorb lotion. Sulphate-free, pH-balanced, skin barrier safe.</div>
            <div className="cs-prov-products">Products 01 · 07</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇰🇷</div>
            <div className="cs-prov-country">Korea</div>
            <div className="cs-prov-tradition">Bathhouse Tradition</div>
            <div className="cs-prov-body">The Italy Towel and back cloth — tools of the Korean jjimjilbang. Centuries of removing dead skin through friction, not chemicals.</div>
            <div className="cs-prov-products">Products 02 · 03 · 04</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇲🇦</div>
            <div className="cs-prov-country">Morocco</div>
            <div className="cs-prov-tradition">Hammam Ritual</div>
            <div className="cs-prov-body">Atlas Mountain clay and cold-pressed body oil. The hammam has used both for over a thousand years. Single ingredient. Nothing added.</div>
            <div className="cs-prov-products">Products 05 · 06</div>
          </div>
          <div className="cs-prov-item">
            <div className="cs-prov-flag">🇹🇷</div>
            <div className="cs-prov-country">Turkey</div>
            <div className="cs-prov-tradition">Hamam Craft</div>
            <div className="cs-prov-body">The Kese mitt — hand-woven raw silk from Istanbul artisans. The original exfoliation tool of the Ottoman hamam. Nothing replaces it.</div>
            <div className="cs-prov-products">Product 08</div>
          </div>
        </div>

        {/* 5 — Ritual teaser */}
        <div className="cs-ritual">
          <div className="cs-ritual-col">
            <div className="cs-ritual-header">
              <div className="cs-ritual-tag daily">Daily Ritual</div>
              <div className="cs-ritual-title">10 Minutes.<br />Every Shower.</div>
              <div className="cs-ritual-time">5 steps · Products 01 03 04 07 08</div>
            </div>
            <div className="cs-ritual-steps">
              {[
                { n: '1', name: 'Scalp Massage', note: 'Small firm circles, hairline to back. 2–3 minutes.', prod: '04' },
                { n: '2', name: 'Body Wash', note: 'Apply to wet skin. No sulphates. Cleans without stripping.', prod: '01' },
                { n: '3', name: 'Exfoliating Cloth', note: 'Full body and back. Both handles for reach. 60 seconds each area.', prod: '03' },
                { n: '4', name: 'Bamboo Cloth', note: 'For sensitive areas. Gentle enough where other cloths are not.', prod: '08' },
                { n: '5', name: 'Body Lotion', note: 'Within 3 minutes of towelling. Skin absorbs 70% more while warm.', prod: '07' },
              ].map(s => (
                <div key={s.n} className="cs-ritual-step">
                  <div className="cs-step-num daily">{s.n}</div>
                  <div className="cs-step-body">
                    <div className="cs-step-name">{s.name}</div>
                    <div className="cs-step-note">{s.note}</div>
                  </div>
                  <div className="cs-step-prod daily">{s.prod}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cs-ritual-col">
            <div className="cs-ritual-header">
              <div className="cs-ritual-tag weekly">Weekly Ritual</div>
              <div className="cs-ritual-title">18 Minutes.<br />Once a Week.</div>
              <div className="cs-ritual-time">5 steps · Products 02 04 05 06 08</div>
            </div>
            <div className="cs-ritual-steps">
              {[
                { n: '1', name: 'Deep Scalp Massage', note: '5 minutes. More time, more pressure than daily.', prod: '04' },
                { n: '2', name: 'Atlas Clay Mask', note: 'Apply head to toe on damp skin. Leave 8–10 minutes. Draws out impurities.', prod: '05' },
                { n: '3', name: 'Italy Towel Mitt', note: 'Deep exfoliation. Firm slow strokes top to bottom. Dead skin rolls off.', prod: '02' },
                { n: '4', name: 'Bamboo Cloth', note: 'For sensitive areas. Gentle enough where other cloths are not.', prod: '08' },
                { n: '5', name: 'Body Oil', note: 'Stay damp. 10–15 drops pressed into skin. No lotion needed today.', prod: '06' },
              ].map(s => (
                <div key={s.n} className="cs-ritual-step">
                  <div className="cs-step-num weekly">{s.n}</div>
                  <div className="cs-step-body">
                    <div className="cs-step-name">{s.name}</div>
                    <div className="cs-step-note">{s.note}</div>
                  </div>
                  <div className="cs-step-prod weekly">{s.prod}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6 — Subscription */}
        <div className="cs-sub">
          <div className="cs-sub-left">
            <div className="cs-sub-tag">Subscription</div>
            <div className="cs-sub-title">Your system.<br />On autopilot.</div>
            <div className="cs-sub-body">
              The tools last months. The consumables run out. Your monthly
              refill arrives automatically — body wash, lotion, clay, oil —
              so the ritual never stops. You never have to think about it.
            </div>
          </div>
          <div className="cs-sub-right">
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">First Box</div>
              <div className="cs-sub-item-title">Everything included</div>
              <div className="cs-sub-item-body">All 8 products — tools and consumables. Everything you need to start the ritual from day one.</div>
            </div>
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">Monthly Refill</div>
              <div className="cs-sub-item-title">Consumables. Automatically.</div>
              <div className="cs-sub-item-body">Body wash, lotion, clay, oil, bamboo cloth — delivered before you run out. Tools last 6–12 months and stay in your bathroom.</div>
            </div>
            <div className="cs-sub-item">
              <div className="cs-sub-item-tag">No lock-in</div>
              <div className="cs-sub-item-title">Cancel any time</div>
              <div className="cs-sub-item-body">No commitment. But once the ritual is part of your morning, you won't want to stop.</div>
            </div>
          </div>
        </div>

        {/* 7 — CTA second */}
        <div className="cs-cta2">
          <div className="cs-cta2-headline">Ready to start the ritual?</div>
          <div className="cs-cta2-sub">Join the waitlist. 20% off your first kit at launch.</div>
          <div className="cs-form-wrap" style={{ marginBottom: 0 }}>
            <MailchimpForm label="Join the Waitlist" />
            <div className="cs-privacy">No spam. One email when we launch. Unsubscribe any time.</div>
          </div>
        </div>

        {/* 8 — Product pills */}
        <div className="cs-products-wrap">
          <div className="cs-products-label">8 Products · The Complete System</div>
          <div className="cs-products">
            {PRODUCTS.map(p => (
              <div key={p.num} className="cs-pill">
                <span>{p.num}</span>{p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Marquee */}
        <div className="cs-marquee-wrap">
          <div className="cs-marquee-track">
            {MARQUEE_ITEMS.map((item, i) => (
              <span key={i} className="cs-marquee-item">
                {item}<span className="cs-marquee-dot" />
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="cs-footer">
          <span className="cs-footer-logo">SOLUM</span>
          <a href="mailto:contact@bysolum.com" className="cs-footer-contact">contact@bysolum.com</a>
          <a href="https://instagram.com/bysolum.body" target="_blank" rel="noopener noreferrer" className="cs-footer-ig">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4.5"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            @bysolum.body
          </a>
        </footer>
      </div>
    </>
  );
}
