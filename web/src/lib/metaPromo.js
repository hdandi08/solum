export const META_PROMO_STORAGE_KEY = 'solum_meta_black_friday_2026';
export const META_PROMO_CONSENT = 'Send me SOLUM news and offers';
export function metaPromoEnabled(env = import.meta.env) {
  return env.VITE_META_PROMO_ENABLED === 'true'
    && multiKitEnvironmentAllowed(env);
}
export function promoIsEligible(state, now = Date.now()) {
  return state?.eligible === true && !state.blocked && Date.parse(state.ends_at) > now;
}
export function shouldAutoShowPromo(state, {visibleMs, browsed, now = Date.now()}) {
  return promoIsEligible(state, now) && !state.claimed && !state.shown && !(state.dismissedUntil > now)
    && visibleMs >= 12000 && (browsed || visibleMs >= 20000);
}
export function promoPaymentFields(promo, email) {
  if (!promo) return {};
  if (!promo.valid || !promo.visitor_token || promo.discount_percent !== 10 || !promo.code || !(Date.parse(promo.ends_at) > Date.now())) throw Error('Your offer needs checking. Return to your details to review it before paying.');
  if (String(email).trim().toLowerCase() !== promo.email) throw Error(`Use ${promo.email} for your personal offer, or remove the offer before paying. Your wallet email must match too.`);
  return {promo_code:promo.code,promo_visitor_token:promo.visitor_token};
}
import {multiKitEnvironmentAllowed} from './kitOrder.js';
