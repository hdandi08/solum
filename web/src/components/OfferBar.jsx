import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { offerActive, DELIVERY_OFFER } from '../lib/offer.js';

const CSS = `
.offerbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: var(--offerbar-h);
  box-sizing: border-box;
  background: #08090b;
  border-bottom: 1px solid rgba(240,236,226,0.07);
  color: rgba(240,236,226,0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 44px;
  font-family: 'Barlow Condensed', sans-serif;
}
.offerbar-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.offerbar-text .save { color: #4a8fc7; font-weight: 600; }
.offerbar-text .sep { color: rgba(240,236,226,0.22); margin: 0 7px; }
.offerbar-dismiss {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(240,236,226,0.35);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}
.offerbar-dismiss:hover { color: rgba(240,236,226,0.85); }
@media (max-width: 600px) {
  .offerbar { padding: 0 34px; }
  .offerbar-text { font-size: 11px; letter-spacing: 0.8px; }
}
`;

const DISMISS_KEY = 'offerbar_dismissed';

export default function OfferBar() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  if (pathname === '/creators') return null;

  const show = offerActive() && !dismissed;

  // Reserve space for the fixed bar (shifts nav + content down) only while it
  // is actually shown, so dismissing it collapses the space and leaves no gap.
  useEffect(() => {
    if (!show) return;
    document.body.classList.add('has-offerbar');
    return () => document.body.classList.remove('has-offerbar');
  }, [show]);

  if (!show) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="offerbar" role="region" aria-label="Delivery offer">
      <style>{CSS}</style>
      <span className="offerbar-text">
        Free UK Delivery <span className="sep">·</span> <span className="save">Save {DELIVERY_OFFER.value}</span> <span className="sep">·</span> Limited time
      </span>
      <button className="offerbar-dismiss" onClick={dismiss} aria-label="Dismiss offer">×</button>
    </div>
  );
}
