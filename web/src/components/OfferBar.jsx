import { useState } from 'react';
import { offerActive, daysLeft, DELIVERY_OFFER } from '../lib/offer.js';

const CSS = `
.offerbar {
  width: 100%;
  background: #08090B;
  border-bottom: 1px solid rgba(240,236,226,0.10);
  color: #F0ECE2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 9px 40px;
  position: relative;
  font-family: 'Barlow Condensed', sans-serif;
}
.offerbar-text {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
}
.offerbar-accent { color: #2E6DA4; }
.offerbar-dismiss {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(240,236,226,0.55);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;
}
.offerbar-dismiss:hover { color: #F0ECE2; }
@media (max-width: 600px) {
  .offerbar { padding: 8px 32px; }
  .offerbar-text { font-size: 11px; letter-spacing: 1px; }
}
`;

const DISMISS_KEY = 'offerbar_dismissed';

export default function OfferBar() {
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  if (!offerActive() || dismissed) return null;

  const dleft = daysLeft();
  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="offerbar" role="region" aria-label="Delivery offer">
      <style>{CSS}</style>
      <span className="offerbar-text">
        Free UK delivery · <span className="offerbar-accent">worth {DELIVERY_OFFER.value}</span> · launch offer ends 11 Aug{dleft > 0 ? ` · ${dleft} days left` : ''}
      </span>
      <button className="offerbar-dismiss" onClick={dismiss} aria-label="Dismiss offer">×</button>
    </div>
  );
}
