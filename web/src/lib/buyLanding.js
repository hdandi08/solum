// Browser history state stays with this navigation, without marking shared ad URLs.
export const BUY_FROM_SITE = Object.freeze({ checkoutEntry: 'site' });

export function resolveBuyKit(value) {
  const kit = typeof value === 'string' ? value.toLowerCase() : '';
  return kit === 'ritual' || kit === 'ground' ? kit : null;
}
