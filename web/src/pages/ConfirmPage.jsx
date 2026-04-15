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
  const [status, setStatus] = useState('loading'); // loading | confirmed | already_confirmed | invalid | error
  const [firstName, setFirstName] = useState(null);

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
              Your email is confirmed and your spot is locked. We'll send you one email when we launch — nothing before that.
            </div>
            <div className="cp-divider" />
            <div className="cp-note">
              You can close this tab. See you at launch.
            </div>
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
