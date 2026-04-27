import { useState } from 'react';
import { capture } from '../lib/analytics';

const COMMON_DOMAINS = [
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
  'me.com','live.com','aol.com','protonmail.com','googlemail.com',
  'btinternet.com','sky.com','talktalk.net','virgin.net','virginmedia.com',
];

export const FOUNDING_LIMIT = 100;

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function suggestEmail(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain.includes('.')) return null;
  for (const correct of COMMON_DOMAINS) {
    if (domain === correct) return null;
    if (levenshtein(domain, correct) <= 2) return `${local}@${correct}`;
  }
  return null;
}

export function detectSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    if (utmSource) return {
      source: utmSource.toLowerCase(),
      medium: params.get('utm_medium') || null,
      campaign: params.get('utm_campaign') || null,
    };
    const ref = document.referrer;
    if (!ref) return { source: 'direct', medium: null, campaign: null };
    const hostname = new URL(ref).hostname;
    if (hostname.includes('instagram.com')) return { source: 'instagram', medium: 'social', campaign: null };
    if (hostname.includes('google.'))       return { source: 'google',    medium: 'search', campaign: null };
    if (hostname.includes('facebook.com'))  return { source: 'facebook',  medium: 'social', campaign: null };
    if (hostname.includes('tiktok.com'))    return { source: 'tiktok',    medium: 'social', campaign: null };
    return { source: 'referral', medium: null, campaign: null };
  } catch {
    return { source: 'direct', medium: null, campaign: null };
  }
}

const CSS = `
.wf-placeholder { display: flex; flex-direction: column; gap: 0; }
.wf-input {
  width: 100%;
  background: rgba(240,236,226,0.04);
  border: 1px solid rgba(240,236,226,0.15);
  border-bottom: none;
  color: #f0ece2;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 17px;
  font-weight: 300;
  letter-spacing: 0.3px;
  padding: 16px 20px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.wf-input::placeholder { color: rgba(240,236,226,0.3); }
.wf-input:focus { border-color: rgba(74,143,199,0.6); }
.wf-typo-suggest {
  font-size: 13px;
  color: rgba(240,236,226,0.6);
  padding: 6px 12px;
  background: rgba(240,236,226,0.04);
  border: 1px solid rgba(240,236,226,0.1);
  border-bottom: none;
}
.wf-typo-btn {
  background: none; border: none; cursor: pointer;
  color: #4a8fc7; font-size: 13px;
  font-family: 'Barlow Condensed', sans-serif;
  text-decoration: underline; padding: 0;
}
.wf-submit {
  width: 100%;
  background: #f0ece2;
  color: #08090b;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 17px;
  letter-spacing: 0.12em;
  padding: 17px 24px;
  border: none;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}
.wf-submit:hover:not(:disabled) { background: #fff; }
.wf-submit:disabled { opacity: 0.6; cursor: default; }
.wf-error {
  margin-top: 10px;
  font-size: 13px;
  color: #e05a5a;
  letter-spacing: 0.5px;
}
.wf-success { display: flex; flex-direction: column; gap: 12px; }
.wf-success-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(32px, 5vw, 48px);
  letter-spacing: 0.06em;
  color: #f0ece2;
  line-height: 1;
}
.wf-success-num { color: #4a8fc7; }
.wf-success-body {
  font-size: 16px;
  font-weight: 300;
  color: rgba(240,236,226,0.75);
  line-height: 1.65;
}
.wf-success-ig {
  margin-top: 4px;
  padding: 14px 20px;
  background: rgba(240,236,226,0.03);
  border: 1px solid rgba(240,236,226,0.09);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.wf-success-ig-cta {
  display: inline-block;
  background: #f0ece2;
  color: #08090B;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 15px;
  letter-spacing: .12em;
  padding: 10px 20px;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.wf-founding-teaser {
  background: #181C24;
  border: 1px solid rgba(74,143,199,0.3);
}
.wf-founding-teaser-header {
  border-bottom: 1px solid rgba(240,236,226,0.07);
  padding: 12px 20px;
  font-size: 11px;
  letter-spacing: 5px;
  text-transform: uppercase;
  font-weight: 700;
  color: #4A8FC7;
}
.wf-founding-teaser-body { padding: 20px 20px 0; }
.wf-founding-teaser-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  letter-spacing: .06em;
  color: #f0ece2;
  margin-bottom: 10px;
}
.wf-founding-teaser-text {
  font-size: 13px;
  font-weight: 300;
  color: rgba(240,236,226,0.75);
  line-height: 1.65;
  margin-bottom: 20px;
}
.wf-founding-teaser-link {
  display: block;
  background: #2E6DA4;
  color: #f0ece2;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 15px;
  letter-spacing: .15em;
  padding: 14px 20px;
  text-decoration: none;
  text-align: center;
}
`;

// source prop overrides UTM/referrer detection — pass 'athlete' for the athlete page
export default function WaitlistForm({
  label    = 'Claim Founding Member Spot',
  onSuccess,
  formId   = 'unknown',
  source: sourceProp = null,
}) {
  const [email, setEmail]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [position, setPosition]   = useState(null);

  const refCode = (() => {
    try {
      const p = new URLSearchParams(window.location.search).get('ref');
      if (p) { sessionStorage.setItem('solum_ref', p); return p; }
      return sessionStorage.getItem('solum_ref') || null;
    } catch { return null; }
  })();

  function handleEmailChange(e) {
    const val = e.target.value;
    setEmail(val);
    setError('');
    if (val.includes('@') && val.includes('.')) {
      setSuggestion(suggestEmail(val));
    } else {
      setSuggestion(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuggestion(null);
    setLoading(true);

    const detected = detectSource();
    const source   = sourceProp || detected.source;
    const medium   = detected.medium;
    const campaign = detected.campaign;

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          first_name: null,
          source,
          utm_medium: medium,
          utm_campaign: campaign || null,
          referred_by: refCode || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong. Try again.'); return; }

      setPosition(data.position);
      capture('Waitlist Signup', { cta: formId, position: String(data.position), source });
      onSuccess && onSuccess();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (position !== null) {
    const isFounder = position <= FOUNDING_LIMIT;
    return (
      <>
        <style>{CSS}</style>
        <div className="wf-success">
          <div className="wf-success-title">
            Spot secured. <span className="wf-success-num">#{position}</span>
          </div>
          <div className="wf-success-body">
            You're <strong style={{ color: '#f0ece2' }}>#{position} of 100</strong>. One email when we launch. First to ship.
          </div>
          <div className="wf-success-ig">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ece2', marginBottom: 2 }}>Follow us while you wait</div>
              <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(240,236,226,0.65)' }}>Sneak previews, formulas, rituals. Before anyone else sees them.</div>
            </div>
            <a href="https://instagram.com/bysolum.body" target="_blank" rel="noopener noreferrer" className="wf-success-ig-cta">
              @bysolum.body
            </a>
          </div>
          {isFounder && (
            <div className="wf-founding-teaser">
              <div className="wf-founding-teaser-header">Founding 100 · Members Portal</div>
              <div className="wf-founding-teaser-body">
                <div className="wf-founding-teaser-title">Real equity in Solum</div>
                <div className="wf-founding-teaser-text">
                  A share of the founding pool vesting at <strong style={{ color: '#f0ece2' }}>£1M ARR or 14 months</strong>, whichever comes first. Shape products, track growth, see what it could be worth.
                </div>
              </div>
              <a href="/founding-100" className="wf-founding-teaser-link">Find Out More</a>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="wf-placeholder">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <input
            className="wf-input"
            type="email"
            value={email}
            onChange={handleEmailChange}
            onFocus={() => capture('Email Input Focus', { cta: formId })}
            placeholder="Your email address"
            required
            autoComplete="email"
          />
          {suggestion && (
            <div className="wf-typo-suggest">
              Did you mean <button type="button" className="wf-typo-btn" onClick={() => { setEmail(suggestion); setSuggestion(null); }}>{suggestion}</button>?
            </div>
          )}
          <button type="submit" className="wf-submit" disabled={loading}>
            {loading ? 'Securing your spot...' : label}
          </button>
        </form>
        {error && <div className="wf-error">{error}</div>}
      </div>
    </>
  );
}
