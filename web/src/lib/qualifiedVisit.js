// Decides whether a visitor is "qualified" (a convertible browser) and why.
// Strong signals fire immediately; otherwise require sustained engagement.
export function evaluateQualified({ productDetailViewed = false, offerReached = false, ritualVideoPct = 0, unboxingVideoPct = 0, scrollPct = 0, dwellMs = 0, ritualVideosEngaged = 0 } = {}) {
  if (productDetailViewed) return 'product_detail';
  if (ritualVideoPct >= 50) return 'ritual_50';
  if (unboxingVideoPct >= 50) return 'unboxing_50';
  if (ritualVideosEngaged >= 3) return 'ritual_multi';
  if (offerReached && dwellMs >= 20000) return 'offer_reached';  // reached the kits AND spent >=20s — genuine consideration, not a fast scroll-through
  return null;
}
