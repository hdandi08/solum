// Single source of truth for the free-delivery launch offer.
// Honest, time-bound, no auto-charge: delivery is genuinely free during launch;
// £5.95 is the realistic tracked-delivery price we would charge post-launch.
// Turn the offer off by setting enabled:false or letting endDate pass (one place).
export const DELIVERY_OFFER = {
  enabled: true,
  value: '£5.95',        // anchored worth of UK tracked delivery (display)
  valuePence: 595,       // for the struck-through checkout line
  endDate: '2026-08-11', // launch offer end (6 weeks from 2026-06-30)
};

function endOfDay() {
  return new Date(DELIVERY_OFFER.endDate + 'T23:59:59');
}

export function offerActive(now = new Date()) {
  return DELIVERY_OFFER.enabled && now <= endOfDay();
}

export function daysLeft(now = new Date()) {
  return Math.max(0, Math.ceil((endOfDay() - now) / 86400000));
}
