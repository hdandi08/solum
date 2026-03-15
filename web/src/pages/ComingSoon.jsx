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

  /* Background ghost wordmark */
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
    text-decoration: none;
  }
  .cs-badge {
    font-size: 15px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2e6da4;
    border: 1px solid rgba(46,109,164,0.4);
    padding: 6px 14px;
  }

  /* Main layout */
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
    font-size: 15px;
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
  .cs-headline em {
    color: #4a8fc7;
    font-style: normal;
  }

  .cs-subhead {
    font-size: clamp(16px, 2.2vw, 22px);
    font-weight: 300;
    color: rgba(240,236,226,0.88);
    max-width: 520px;
    line-height: 1.5;
    margin-bottom: 48px;
  }

  /* Stats row */
  .cs-stats {
    display: flex;
    gap: 0;
    border: 1px solid rgba(240,236,226,0.07);
    margin-bottom: 52px;
    max-width: 680px;
    width: 100%;
  }
  .cs-stat {
    flex: 1;
    padding: 20px 16px;
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
    margin-bottom: 4px;
  }
  .cs-stat-label {
    font-size: 15px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.4);
    font-weight: 600;
  }

  /* Email form */
  .cs-form-wrap {
    width: 100%;
    max-width: 480px;
    margin-bottom: 20px;
  }
  .cs-offer {
    font-size: 15px;
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
  .cs-offer-bar strong {
    color: #4a8fc7;
  }

  /* MAILCHIMP FORM OVERRIDES */
  #mc_embed_signup {
    background: transparent !important;
    font-family: 'Barlow Condensed', sans-serif !important;
    font-size: inherit !important;
    width: 100%;
  }
  #mc_embed_signup form {
    padding: 0 !important;
  }
  #mc_embed_signup .mc-field-group {
    width: 100% !important;
    padding-bottom: 0 !important;
  }
  #mc_embed_signup input.email {
    width: 100% !important;
    background: rgba(24,28,36,0.8) !important;
    border: 1px solid rgba(46,109,164,0.35) !important;
    border-bottom: none !important;
    color: #f0ece2 !important;
    font-family: 'Barlow Condensed', sans-serif !important;
    font-size: 15px !important;
    letter-spacing: 1px !important;
    padding: 16px 20px !important;
    outline: none !important;
    border-radius: 0 !important;
    height: auto !important;
  }
  #mc_embed_signup input.email::placeholder {
    color: rgba(240,236,226,0.3) !important;
  }
  #mc_embed_signup input.email:focus {
    border-color: rgba(74,143,199,0.6) !important;
  }
  #mc_embed_signup .button {
    width: 100% !important;
    background: #2e6da4 !important;
    color: #f0ece2 !important;
    font-family: 'Bebas Neue', sans-serif !important;
    font-size: 18px !important;
    letter-spacing: 3px !important;
    padding: 16px 32px !important;
    border: none !important;
    border-radius: 0 !important;
    cursor: crosshair !important;
    transition: background 0.2s !important;
    height: auto !important;
    line-height: 1 !important;
    margin: 0 !important;
  }
  #mc_embed_signup .button:hover {
    background: #4a8fc7 !important;
  }
  #mc_embed_signup div#mce-responses {
    padding: 0 !important;
    margin: 0 !important;
    float: none !important;
    width: 100% !important;
  }
  #mc_embed_signup #mce-error-response,
  #mc_embed_signup #mce-success-response {
    font-size: 12px !important;
    letter-spacing: 1px !important;
    padding: 10px 0 0 !important;
    margin: 0 !important;
  }
  #mc_embed_signup #mce-success-response {
    color: #3aaa68 !important;
  }

  /* Fallback form (before Mailchimp code added) */
  .cs-form-placeholder {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
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
    font-size: 15px;
    letter-spacing: 1.5px;
    color: rgba(240,236,226,0.75);
    text-transform: uppercase;
    margin-top: 12px;
  }

  /* Product pills */
  .cs-products {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 600px;
    margin-bottom: 52px;
  }
  .cs-pill {
    font-size: 15px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.82);
    border: 1px solid rgba(240,236,226,0.07);
    padding: 7px 14px;
    font-weight: 600;
  }
  .cs-pill span {
    color: #2e6da4;
    margin-right: 6px;
  }

  /* Marquee */
  .cs-marquee-wrap {
    position: relative;
    z-index: 1;
    border-top: 1px solid rgba(240,236,226,0.055);
    border-bottom: 1px solid rgba(240,236,226,0.055);
    overflow: hidden;
    padding: 14px 0;
    background: rgba(24,28,36,0.6);
  }
  .cs-marquee-track {
    display: flex;
    gap: 0;
    animation: marquee 28s linear infinite;
    width: max-content;
  }
  .cs-marquee-item {
    font-size: 15px;
    letter-spacing: 5px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.72);
    font-weight: 600;
    padding: 0 28px;
    white-space: nowrap;
  }
  .cs-marquee-dot {
    display: inline-block;
    width: 3px;
    height: 3px;
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
    border-top: 1px solid rgba(240,236,226,0.055);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cs-footer-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.18em;
    color: rgba(240,236,226,0.82);
  }
  .cs-footer-copy {
    font-size: 15px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,236,226,0.7);
  }
  .cs-footer-ig {
    font-size: 15px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #2e6da4;
    text-decoration: none;
    font-weight: 600;
  }
  .cs-footer-ig:hover { color: #4a8fc7; }

  /* Glow accent */
  .cs-glow {
    position: fixed;
    bottom: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse, rgba(46,109,164,0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  @media (max-width: 640px) {
    .cs-topbar { padding: 0 20px; }
    .cs-main { padding: 100px 20px 60px; }
    .cs-stats { flex-direction: column; }
    .cs-stat { border-right: none; border-bottom: 1px solid rgba(240,236,226,0.07); }
    .cs-stat:last-child { border-bottom: none; }
    .cs-footer { flex-direction: column; gap: 16px; text-align: center; padding: 24px 20px; }
  }
`;

const MARQUEE_ITEMS = [
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Coming Soon',
  'The Ritual Men Were Never Taught',
  'UK · Korea · Morocco',
  '10 Minutes Daily',
  '8 Products · One System',
  'Body Care — Not Face. Not Hair.',
  'Coming Soon',
];

const PRODUCTS = [
  { num: '01', name: 'Body Wash' },
  { num: '02', name: 'Exfoliating Mitt' },
  { num: '03', name: 'Back Scrub Cloth' },
  { num: '04', name: 'Scalp Massager' },
  { num: '05', name: 'Rhassoul Clay' },
  { num: '06', name: 'Argan Body Oil' },
  { num: '07', name: 'Body Lotion' },
  { num: '08', name: 'Bamboo Cloth' },
];

// ── REPLACE THIS with your Mailchimp embedded form HTML once you have it ──
// Go to: Mailchimp → Audience → Signup forms → Embedded forms → Copy HTML
// Paste the full <div id="mc_embed_signup">...</div> block into MAILCHIMP_FORM below
const MAILCHIMP_FORM = null;
// Example when ready:
// const MAILCHIMP_FORM = `<div id="mc_embed_signup">...</div>`;

function FallbackForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    // Replace this with actual submission when Mailchimp is connected
    setSent(true);
  };

  return (
    <div className="cs-form-placeholder">
      {!sent ? (
        <>
          <input
            className="cs-input"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button className="cs-submit" onClick={handleSubmit}>
            Claim Early Access
          </button>
        </>
      ) : (
        <button className="cs-submit sent">
          ✓ You're on the list
        </button>
      )}
    </div>
  );
}

export default function ComingSoon() {
  useEffect(() => {
    // Inject Mailchimp script if form is present
    if (MAILCHIMP_FORM) {
      const script = document.createElement('script');
      script.src = '//s3.amazonaws.com/downloads.mailchimp.com/js/mc-validate.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="cs-wrap">
        <div className="cs-ghost">SOLUM</div>
        <div className="cs-glow" />

        {/* Top bar */}
        <header className="cs-topbar">
          <span className="cs-logo">SOLUM</span>
          <div className="cs-badge">Launching Soon</div>
        </header>

        {/* Main content */}
        <main className="cs-main">
          <div className="cs-eyebrow">Centuries of ritual. Finally a system.</div>

          <h1 className="cs-headline">
            Your Body.<br />
            Finally<br />
            <em>Done Right.</em>
          </h1>

          <p className="cs-subhead">
            Most men shower every day and still have rough skin, a neglected back,
            and a scalp they've never properly cleaned.
            Not laziness — nobody built them a system.
            Korean bathhouses, Moroccan hammams, Turkish hamams — they figured this out centuries ago.
            <strong style={{ color: '#f0ece2', fontWeight: 600 }}> SOLUM brings it together.</strong>
          </p>

          {/* Stats */}
          <div className="cs-stats">
            <div className="cs-stat">
              <div className="cs-stat-num">58%</div>
              <div className="cs-stat-label">of UK men use<br />zero skincare</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">10</div>
              <div className="cs-stat-label">minutes.<br />the full ritual.</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">1000+</div>
              <div className="cs-stat-label">years of ritual.<br />one system.</div>
            </div>
            <div className="cs-stat">
              <div className="cs-stat-num">3</div>
              <div className="cs-stat-label">countries.<br />one system.</div>
            </div>
          </div>

          {/* Email capture */}
          <div className="cs-form-wrap">
            <div className="cs-offer">Early Access — Limited Spots</div>
            <div className="cs-offer-bar">
              Sign up now → get <strong>20% off your first kit</strong> at launch
            </div>

            {MAILCHIMP_FORM ? (
              <div dangerouslySetInnerHTML={{ __html: MAILCHIMP_FORM }} />
            ) : (
              <FallbackForm />
            )}

            <div className="cs-privacy">No spam. One email when we launch. Unsubscribe any time.</div>
          </div>

          {/* Product pills */}
          <div className="cs-products">
            {PRODUCTS.map(p => (
              <div key={p.num} className="cs-pill">
                <span>{p.num}</span>{p.name}
              </div>
            ))}
          </div>
        </main>

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
          <span className="cs-footer-copy">© 2026 SOLUM · Your body. Done right.</span>
          <a
            href="https://instagram.com/bysolum"
            target="_blank"
            rel="noopener noreferrer"
            className="cs-footer-ig"
          >
            @bysolum ↗
          </a>
        </footer>
      </div>
    </>
  );
}
