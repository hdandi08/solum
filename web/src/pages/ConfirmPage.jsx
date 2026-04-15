import { useState, useEffect } from 'react';

const styles = `
  .cp-wrap {
    min-height: 100vh;
    background: #08090b;
    color: #f0ece2;
    font-family: 'Barlow Condensed', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
  }
  .cp-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 0.18em;
    color: #f0ece2;
    margin-bottom: 64px;
  }
  .cp-card {
    max-width: 460px;
    width: 100%;
    border: 1px solid rgba(240,236,226,0.08);
    padding: 48px 40px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
  }
  .cp-tag {
    font-size: 11px;
    letter-spacing: 5px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .cp-tag.success { color: #4a8fc7; }
  .cp-tag.already { color: #c8a96e; }
  .cp-tag.error   { color: rgba(240,236,226,0.4); }
  .cp-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 40px;
    letter-spacing: 0.05em;
    color: #f0ece2;
    line-height: 1;
  }
  .cp-body {
    font-size: 16px;
    font-weight: 300;
    color: rgba(240,236,226,0.82);
    line-height: 1.65;
  }
  .cp-body strong { color: #f0ece2; font-weight: 600; }
  .cp-divider {
    height: 1px;
    background: rgba(240,236,226,0.07);
    margin: 8px 0;
  }
  .cp-note {
    font-size: 13px;
    font-weight: 300;
    color: rgba(240,236,226,0.45);
    line-height: 1.6;
  }
  .cp-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid rgba(46,109,164,0.2);
    border-top-color: #4a8fc7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 24px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function ConfirmPage() {
  const [status,    setStatus]    = useState('loading'); // loading | confirmed | already_confirmed | invalid | error
  const [firstName, setFirstName] = useState(null);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setStatus('invalid'); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    fetch(`${supabaseUrl}/functions/v1/confirm-email?token=${token}`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        setFirstName(data.first_name || null);
        setIsFounder(!!data.is_founder);
        setStatus(data.status === 'confirmed' ? 'confirmed'
          : data.status === 'already_confirmed' ? 'already_confirmed'
          : 'invalid');
      })
      .catch(() => setStatus('error'));
  }, []);

  const name = firstName ? `${firstName}, ` : '';

  return (
    <>
      <style>{styles}</style>
      <div className="cp-wrap">
        <div className="cp-logo">SOLUM</div>

        {status === 'loading' && (
          <>
            <div className="cp-spinner" />
            <p style={{ fontSize: 14, color: 'rgba(240,236,226,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>Confirming...</p>
          </>
        )}

        {status === 'confirmed' && (
          <div className="cp-card">
            <div className="cp-tag success">Confirmed</div>
            <div className="cp-title">{name}You're in.</div>
            <div className="cp-body">
              Your spot is locked. We'll send one email when we launch — nothing before that.
            </div>

            {/* Founding 100 teaser — founders only */}
            {isFounder && (
              <div style={{
                marginTop: 20,
                padding: '16px 20px',
                background: 'rgba(74,143,199,0.07)',
                border: '1px solid rgba(74,143,199,0.28)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700, color: '#4A8FC7' }}>
                  Founding 100 · Members Portal
                </div>
                <div style={{ fontSize: 13, fontWeight: 300, color: 'rgba(240,236,226,0.88)', lineHeight: 1.65 }}>
                  You're one of the first 100 — you get <strong style={{ color: '#f0ece2' }}>real equity in bySolum</strong>.
                  A share of the founding pool that vests at £1M ARR or 14 months, whichever comes first.
                  Inside the portal: shape products, track SOLUM's growth, and see what your equity could be worth.
                </div>
                <a
                  href="/founding-100"
                  style={{
                    display: 'inline-block',
                    marginTop: 4,
                    fontSize: 12,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: '#4A8FC7',
                    textDecoration: 'none',
                  }}
                >
                  Enter the Founding 100 Portal →
                </a>
              </div>
            )}

            {/* Instagram CTA — everyone */}
            <div style={{
              marginTop: 16,
              padding: '14px 18px',
              background: 'rgba(240,236,226,0.03)',
              border: '1px solid rgba(240,236,226,0.09)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f0ece2', marginBottom: 2 }}>Follow while you wait</div>
                <div style={{ fontSize: 12, fontWeight: 300, color: 'rgba(240,236,226,0.60)' }}>
                  Sneak previews, formulas, rituals — before anyone else.
                </div>
              </div>
              <a
                href="https://instagram.com/bysolum.body"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#f0ece2',
                  color: '#08090B',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 14,
                  letterSpacing: '.12em',
                  padding: '9px 18px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                @bysolum.body
              </a>
            </div>

            <div className="cp-divider" />
            <div className="cp-note">See you at launch.</div>
          </div>
        )}

        {status === 'already_confirmed' && (
          <div className="cp-card">
            <div className="cp-tag already">Already confirmed</div>
            <div className="cp-title">You're already in.</div>
            <div className="cp-body">
              Your spot was already confirmed. Nothing else to do — we'll be in touch at launch.
            </div>
            <div className="cp-divider" />
            <div className="cp-note">You can close this tab.</div>
          </div>
        )}

        {(status === 'invalid' || status === 'error') && (
          <div className="cp-card">
            <div className="cp-tag error">Link issue</div>
            <div className="cp-title">That link didn't work.</div>
            <div className="cp-body">
              This confirmation link is invalid or has expired. If you signed up recently, check your inbox for the original email — or sign up again at{' '}
              <strong><a href="/" style={{ color: '#4a8fc7' }}>bysolum.co.uk</a></strong>.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
