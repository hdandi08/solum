import { offerActive, daysLeft, DELIVERY_OFFER } from '../lib/offer.js';

const CSS = `
.offerbar {
  width: 100%;
  background: #2E6DA4;
  color: #F0ECE2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 11px 24px;
  text-align: center;
  font-family: 'Barlow Condensed', sans-serif;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.18);
}
.offerbar-main {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  line-height: 1.1;
}
.offerbar-main .save { color: #08090B; }
.offerbar-sub {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(240,236,226,0.92);
}
.offerbar-sub .days { color: #08090B; font-weight: 700; }
@media (max-width: 600px) {
  .offerbar { padding: 9px 16px; }
  .offerbar-main { font-size: 13px; letter-spacing: 1.5px; }
  .offerbar-sub { font-size: 11px; letter-spacing: 1px; }
}
`;

export default function OfferBar() {
  if (!offerActive()) return null;

  const dleft = daysLeft();

  return (
    <div className="offerbar" role="region" aria-label="Delivery offer">
      <style>{CSS}</style>
      <div className="offerbar-main">
        Free UK Delivery · <span className="save">Save {DELIVERY_OFFER.value}</span>
      </div>
      <div className="offerbar-sub">
        Launch offer · ends 11 Aug{dleft > 0 ? <> · <span className="days">{dleft} days left</span></> : ''}
      </div>
    </div>
  );
}
