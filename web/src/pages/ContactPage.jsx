import { useEffect } from 'react';
import Nav from '../components/Nav';
import SolumFooter from '../components/SolumFooter';
import { jumpTop } from '../lib/scroll.js';
import { capture } from '../lib/analytics.js';

// Set once the VoIP number is live (e.g. '0330 043 1234') — the phone block
// renders only when this is non-empty.
const PHONE = '';
const EMAIL = 'contact@bysolum.com';

const CSS = `
.contact-page { background: var(--black); min-height: 100vh; padding-top: 64px; }
.contact-hero { border-bottom: 1px solid var(--line); padding: 64px 48px 48px; max-width: 1000px; margin: 0 auto; }
.contact-hero-eyebrow { font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: var(--blit); font-weight: 600; margin-bottom: 16px; display: block; }
.contact-hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(40px, 6vw, 72px); letter-spacing: .04em; color: var(--bone); line-height: 1; margin-bottom: 16px; }
.contact-hero-sub { font-size: 16px; font-weight: 300; color: var(--mist); line-height: 1.7; max-width: 560px; }
.contact-body { max-width: 1000px; margin: 0 auto; padding: 48px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.contact-card { background: var(--char); padding: 36px 32px; display: flex; flex-direction: column; gap: 10px; }
.contact-card-label { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--stone); font-weight: 600; }
.contact-card-value { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: .05em; color: var(--bone); line-height: 1.1; text-decoration: none; }
a.contact-card-value:hover { color: var(--blit); }
.contact-card-note { font-size: 14px; font-weight: 300; color: var(--mist); line-height: 1.6; }
.contact-meta { max-width: 1000px; margin: 0 auto; padding: 0 48px 72px; }
.contact-meta-block { border: 1px solid var(--line); padding: 24px 28px; margin-top: 24px; }
.contact-meta-title { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--stone); font-weight: 600; margin-bottom: 10px; }
.contact-meta-text { font-size: 14px; font-weight: 300; color: var(--mist); line-height: 1.7; }
@media (max-width: 700px) {
  .contact-hero { padding: 48px 24px 36px; }
  .contact-body { padding: 24px; grid-template-columns: 1fr; }
  .contact-meta { padding: 0 24px 56px; }
}
`;

export default function ContactPage() {
  useEffect(() => { jumpTop(); }, []);

  return (
    <>
      <style>{CSS}</style>
      <Nav />
      <div className="contact-page">
        <div className="contact-hero">
          <span className="contact-hero-eyebrow">We answer fast.</span>
          <h1 className="contact-hero-title">Contact SOLUM.</h1>
          <p className="contact-hero-sub">
            Question about your order, the ritual, or which kit to start with?
            Reach us directly. A real person replies, usually within one working day.
          </p>
        </div>

        <div className="contact-body">
          <div className="contact-card">
            <span className="contact-card-label">Email</span>
            <a
              className="contact-card-value"
              href={`mailto:${EMAIL}`}
              onClick={() => capture('contact_email_clicked')}
            >
              {EMAIL}
            </a>
            <p className="contact-card-note">
              Orders, delivery, returns, product questions. Include your order
              number if you have one.
            </p>
          </div>

          {PHONE ? (
            <div className="contact-card">
              <span className="contact-card-label">Phone</span>
              <a
                className="contact-card-value"
                href={`tel:${PHONE.replace(/\s/g, '')}`}
                onClick={() => capture('contact_phone_clicked')}
              >
                {PHONE}
              </a>
              <p className="contact-card-note">
                Monday to Friday, 9am to 5pm UK time. If we miss you, leave a
                message and we call back.
              </p>
            </div>
          ) : (
            <div className="contact-card">
              <span className="contact-card-label">Instagram</span>
              <a
                className="contact-card-value"
                href="https://instagram.com/bysolum.body"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => capture('contact_instagram_clicked')}
              >
                @bysolum.body
              </a>
              <p className="contact-card-note">
                DMs open. Quick questions about the ritual land fastest here.
              </p>
            </div>
          )}
        </div>

        <div className="contact-meta">
          <div className="contact-meta-block">
            <div className="contact-meta-title">Returns &amp; Refunds</div>
            <p className="contact-meta-text">
              14-day returns on unopened products. Email us with your order
              number and we'll send instructions. Full policy in our{' '}
              <a href="/terms#s7" style={{ color: 'var(--blit)' }}>Terms</a>.
            </p>
          </div>
          <div className="contact-meta-block">
            <div className="contact-meta-title">Company</div>
            <p className="contact-meta-text">
              Bysolum Limited · Company No. 17117056 · Registered in England and
              Wales · bysolum.co.uk
            </p>
          </div>
        </div>
      </div>
      <SolumFooter />
    </>
  );
}
