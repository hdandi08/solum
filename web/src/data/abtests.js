// A/B Test Registry — SOLUM
// Add a new test here. Status: 'active' | 'paused' | 'completed'
// traffic: 0.0–1.0 (proportion of visitors included, rest get 'control')
// Never delete completed tests — they are the institutional memory of what works.

export const AB_TESTS = {

  // ─── HERO ───────────────────────────────────────────────────────────────

  'hero-cta-copy': {
    name: 'Hero CTA Copy',
    status: 'active',
    variants: ['control', 'ritual'],
    traffic: 1.0,
    startDate: '2026-04-25',
    hypothesis: '"Build your ritual" is more specific and subscription-forward than "Choose your kit" — should increase checkout starts.',
    metric: 'checkout_started',
    result: null,
    notes: null,
  },

  'hero-eyebrow-copy': {
    name: 'Hero Eyebrow Line',
    status: 'paused',
    variants: ['control', 'system'],
    traffic: 0.5,
    startDate: null,
    hypothesis: '"The first serious body care system for men" as eyebrow outperforms "Men shower. Men don\'t actually clean." — system framing vs problem framing.',
    metric: 'hero_scroll_depth',
    result: null,
    notes: 'Run after hero-cta-copy concludes. Do not run two hero tests simultaneously.',
  },

  // ─── SOCIAL PROOF ───────────────────────────────────────────────────────

  'proof-section-position': {
    name: 'Social Proof Position',
    status: 'paused',
    variants: ['control', 'early'],
    traffic: 1.0,
    startDate: null,
    hypothesis: 'Moving star rating + review count immediately below the hero headline (not below the product section) will lift checkout starts by 10–18%.',
    metric: 'checkout_started',
    result: null,
    notes: 'Cannot run until we have genuine reviews. Minimum 5 reviews required.',
  },

  // ─── KIT PAGE ───────────────────────────────────────────────────────────

  'kit-preselect': {
    name: 'Kit Pre-Selection',
    status: 'paused',
    variants: ['control', 'ritual-preselected'],
    traffic: 1.0,
    startDate: null,
    hypothesis: 'Pre-selecting RITUAL as the default (vs showing all three equally) increases RITUAL conversion rate and AOV.',
    metric: 'kit_selected',
    result: null,
    notes: 'Research: pre-selected subscription increases conversion. Most popular kit should be default.',
  },

  'kit-cta-copy': {
    name: 'Kit CTA Copy',
    status: 'paused',
    variants: ['control', 'start'],
    traffic: 1.0,
    startDate: null,
    hypothesis: '"Start your ritual — £85" outperforms "Add to cart" — ritual framing maintains premium positioning through to checkout.',
    metric: 'checkout_started',
    result: null,
    notes: null,
  },

  // ─── ATHLETE SEGMENT ────────────────────────────────────────────────────

  'athlete-segment': {
    name: 'Athlete Segment Landing Page',
    status: 'active',
    variants: ['control', 'athlete'],
    traffic: 1.0,
    startDate: '2026-04-26',
    hypothesis: 'Athlete-specific messaging at /athletes drives higher checkout conversion from sports/fitness ad traffic than the generic homepage.',
    metric: 'checkout_started',
    result: null,
    notes: 'Track via PostHog: funnel athlete_page_viewed → checkout_started. Ad UTMs: utm_source=meta&utm_campaign=athlete-segment. Compare vs generic traffic.',
  },

  // ─── CHECKOUT ───────────────────────────────────────────────────────────

  'checkout-trust-line': {
    name: 'Checkout Trust Line',
    status: 'paused',
    variants: ['control', 'cancel-prominent'],
    traffic: 1.0,
    startDate: null,
    hypothesis: 'Showing "Cancel any time — one click, no penalty" prominently above the pay button reduces abandonment by surfacing the escape route.',
    metric: 'checkout_completed',
    result: null,
    notes: 'UK CMA compliance is already satisfied by the account page. This is about conversion, not compliance.',
  },

};

// Completed tests — document wins and losses here as they conclude.
// This is the institutional memory. Never delete.
export const COMPLETED_TESTS = [
  // { id, name, winner, lift, metric, concludedDate, notes }
];
