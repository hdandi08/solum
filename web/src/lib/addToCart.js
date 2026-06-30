import { KITS } from '../data/kits.js';

// Pure resolver: maps a kit id to the AddToCart payload, or null if the kit is
// unknown or not yet buyable (coming soon). No side effects, no analytics imports
// (keeps it node-testable — see plan Global Constraints).
export function resolveAddToCart(kitId) {
  const kit = KITS.find(k => k.id === kitId);
  if (!kit || kit.comingSoon) return null;
  return { kitId: kit.id, kitName: kit.name, value: kit.firstBoxPrice };
}
