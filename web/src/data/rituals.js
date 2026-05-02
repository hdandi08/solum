// Italy Towel Mitt (02) is WEEKLY ONLY. Viscose rayon is too aggressive for daily use.
export const DAILY_STEPS = [
  { num: '04', name: 'Scalp Massager', time: '2–3 MIN', zone: 'SCALP', desc: 'Small firm circles, hairline to back. 2–3 minutes.' },
  { num: '01', name: 'Body Wash', time: '1 MIN', zone: 'FULL BODY', desc: 'Amino acid formula. No sulphates. Cleans without stripping.' },
  { num: '03', name: 'Back Scrub Cloth', time: '1 MIN', zone: 'BACK', desc: 'Both handles, drape over shoulder, saw back and forth. The only way to reach your back.' },
  { num: '08', name: 'Bamboo Cloth', time: '30 SEC', zone: 'SENSITIVE AREAS', desc: 'For sensitive areas. Nothing left uncleaned.' },
  { num: '07', name: 'Body Lotion', time: '1 MIN', zone: 'FULL BODY', desc: 'Within 3 minutes of towelling. Skin absorbs 70% more moisture.' },
];

export const WEEKLY_STEPS = [
  {
    num: '05',
    name: 'Apply Clay',
    time: '3 MIN',
    zone: 'FULL BODY',
    desc: '1/4 clay + 2–3 drops argan oil for weekly. Use 1/2 clay for the full experience — makes it bi-weekly. Apply head to toe, face included. Avoid eyes. Yes, it\'s messy. That\'s the point.',
  },
  {
    num: '04',
    name: 'Scalp Oil Massage',
    time: '8–10 MIN',
    zone: 'SCALP',
    desc: 'While the clay works on your body — apply argan oil generously to the scalp and use the massager for the full 8–10 minutes. Don\'t rush this window.',
  },
  {
    num: '02',
    name: 'Scrub Off Clay',
    time: '4–5 MIN',
    zone: 'FULL BODY',
    desc: 'Wet the Italy Towel Mitt and scrub the clay off from neck to toe. The clay lubricates the mitt — this is the hammam technique. Dead skin rolls off. Rinse thoroughly after.',
  },
  {
    num: '06',
    name: 'Seal With Argan Oil',
    time: '2–3 MIN',
    zone: 'FULL BODY',
    desc: 'Towel lightly — stay damp. Press 10–15 drops in from feet upward. No lotion needed today.',
  },
];

// Explicit product list for weekly — body wash is used in step 1 but isn't a standalone step card
export const WEEKLY_PRODUCT_NUMS = ['05', '06', '04', '02', '11'];
