// Instant scroll-to-top for route/step changes. A plain window.scrollTo(0, 0)
// animates because global.css sets html{scroll-behavior:smooth} (kept for
// #anchor links) — so a freshly opened page visibly "scrolls up" from wherever
// the previous page was. behavior:'instant' bypasses the CSS; the inline-style
// override trick does NOT work in Chromium (verified 2026-07-07). The catch
// covers pre-15.4 Safari, where the unknown enum value throws.
export function jumpTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, 0);
  }
}
