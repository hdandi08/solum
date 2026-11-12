export function resolveBuyKit(value) {
  const kit = typeof value === 'string' ? value.toLowerCase() : '';
  return kit === 'ritual' || kit === 'ground' ? kit : null;
}
