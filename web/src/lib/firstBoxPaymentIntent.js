import { resolveAwinPaymentIntentMetadata } from './awinAttribution.js';

export async function buildFirstBoxPaymentIntentBody({
  kitId,
  form,
  source,
  siteHost,
  tikTokIds = {},
  metaIds = {},
  attribution = {},
}, tokenResolver) {
  const awinMetadata = await resolveAwinPaymentIntentMetadata(attribution, tokenResolver);
  return {
    kit_id: kitId,
    email: form.email.trim().toLowerCase(),
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim() || null,
    phone: form.phone.trim() || null,
    source,
    site_host: siteHost,
    ...tikTokIds,
    ...metaIds,
    ...awinMetadata,
    line1: form.line1.trim(),
    line2: form.line2.trim() || null,
    city: form.city.trim(),
    county: form.county.trim() || null,
    postcode: form.postcode.trim(),
  };
}
