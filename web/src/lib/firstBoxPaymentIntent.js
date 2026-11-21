import { resolveAwcAttribution } from './awinCookieBridge.js';
import { promoPaymentFields } from './metaPromo.js';
import { normalizeKitItems } from './kitOrder.js';
import { captureCampaignAttribution } from './campaignAttribution.js';
import { resolveAwinPaymentIntentMetadata } from './awinAttribution.js';

export async function buildFirstBoxPaymentIntentBody({
  kitId,
  items,
  promo,
  form,
  source,
  siteHost,
  tikTokIds = {},
  metaIds = {},
  attribution = {},
}, tokenResolver) {
  const promoFields = promoPaymentFields(promo, form.email);
  const campaign = captureCampaignAttribution();
  const resolution = promo ? (tokenResolver ? {checked:true,token:await tokenResolver()} : await resolveAwcAttribution(fetch,{timeoutMs:2500})) : null;
  if (promo && !resolution.checked) throw Error('We could not check your offer attribution. Please try again before paying.');
  const awinMetadata = await resolveAwinPaymentIntentMetadata(attribution, promo ? async()=>resolution.token : tokenResolver);
  const selection = items ? normalizeKitItems(items) : promo ? [{kit_id:kitId,quantity:1}] : null;
  return {
    kit_id: kitId,
    ...promoFields,
    ...(promo ? { attribution_checked: true, landing_url: globalThis.location?.href } : {}),
    ...(selection && (promo || selection.reduce((sum, item) => sum + item.quantity, 0) > 1) ? { items: selection } : {}),
    email: form.email.trim().toLowerCase(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim() || null,
    phone: form.phone.trim() || null,
    source,
    site_host: siteHost,
    ...tikTokIds,
    ...metaIds,
    ...awinMetadata,
    ...(Object.keys(campaign).length ? { campaign_attribution: campaign } : {}),
    line1: form.line1.trim(),
    line2: form.line2.trim() || null,
    city: form.city.trim(),
    county: form.county.trim() || null,
    postcode: form.postcode.trim(),
  };
}
