// Stripe metadata has a 500-character value limit. Leave room for order fields.
export function campaignMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, item]) =>
    (key === 'fbclid' || /^utm_[a-z0-9_]{1,36}$/.test(key)) &&
    typeof item === 'string' && item.length > 0 && item.length <= 500
  ).slice(0, 12));
}
