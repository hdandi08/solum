import { PRODUCTS } from './products.js';

// Sum of the standalone worth of everything in the kit — the "£X of product ·
// £Y as the kit" anchor. Products without a value (coming soon) contribute 0.
export function kitWorth(kit) {
  if (!kit) return 0;
  return kit.productNums.reduce((sum, num) => {
    const p = PRODUCTS.find(pr => pr.num === num);
    return sum + (p && !p.comingSoon && p.value ? p.value : 0);
  }, 0);
}

// SOVEREIGN contains 9 products: replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    image: '/products/kit/ground.webp', // open box with GROUND-correct contents (no argan oil / mixing bowl — those are the RITUAL upgrade)
    gallery: ['/products/kit/ground.webp', '/products/kit/model-back.webp', '/products/kit/ground-group.webp', '/products/kit/outer-box.webp'],
    firstBoxPrice: 65,
    monthlyPrice: 38,
    productNums: ['01','02','03','04','05','07','08'],
    tagline: 'The foundation. Properly clean, for the first time. Your back actually clean. Skin that holds moisture past midday.',
    outcome: 'Properly clean, head to toe.',
    chooser: 'The complete clean: daily wash, exfoliation, back, scalp + the weekly clay reset.',
    popular: false,
    comingSoon: false,
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    image: '/products/kit/box-open.webp', // open box with full RITUAL contents (oil + bowl visible)
    gallery: ['/products/kit/box-open.webp', '/products/kit/holding-box.webp', '/products/kit/group.webp', '/products/kit/group-detail.webp', '/products/kit/outer-box.webp'],
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productNums: ['01','02','03','04','05','06','07','08','11'],
    tagline: 'The complete ritual. A proper daily clean head to toe, finished with the weekly body oil that leaves skin genuinely fed, not just moisturised. The step most men wish they had started with.',
    outcome: 'Not just clean. Properly fed.',
    chooser: 'Everything in GROUND + the weekly argan oil finish that feeds your skin. Where most men start.',
    popular: true,
    comingSoon: false,
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    hidden: true, // hidden from the buy decision until it can actually be ordered (keep data for later)
    image: null, // TODO: SOVEREIGN (artisan tier) kit photo — placeholder shown until provided
    firstBoxPrice: 130,
    monthlyPrice: 58,
    // 02 replaced by 09 — Italy Towel Mitt → Turkish Kese Mitt
    productNums: ['01','03','04','05','06','07','08','09','10','11'],
    replacedProducts: { '02': '09' },
    tagline: 'The artisan tier. Hand-woven Turkish silk. The deepest exfoliation available. For the man who requires everything.',
    popular: false,
    comingSoon: true,
  },
];
