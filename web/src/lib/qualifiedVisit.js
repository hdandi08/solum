// Decides whether a visitor is "qualified" (a convertible browser) and why.
// Strong signals fire immediately; otherwise require sustained engagement.
export function evaluateQualified({ productDetailViewed = false, ritualVideoPct = 0, scrollPct = 0, dwellMs = 0 } = {}) {
  if (productDetailViewed) return 'product_detail';
  if (ritualVideoPct >= 50) return 'ritual_50';
  if (scrollPct >= 50 && dwellMs >= 60000) return 'scroll_dwell';
  return null;
}
