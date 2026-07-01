// SOVEREIGN contains 9 products: replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    image: '/products/kit/ground.webp', // GROUND kit flatlay (no argan oil / mixing bowl — those are the RITUAL upgrade)
    gallery: ['/products/kit/ground.webp'],
    firstBoxPrice: 65,
    monthlyPrice: 38,
    productNums: ['01','02','03','04','05','07','08'],
    tagline: 'The foundation. Properly clean, for the first time. Your back actually clean. Skin that holds moisture past midday.',
    outcome: 'Properly clean, head to toe.',
    popular: false,
    comingSoon: false,
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    image: '/products/kit/still.webp', // top-down flatlay — full kit visible
    gallery: ['/products/kit/still.webp', '/products/kit/use-1.webp', '/products/kit/use-2.webp'],
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productNums: ['01','02','03','04','05','06','07','08','11'],
    tagline: 'The complete ritual. A proper daily clean head to toe, finished with the weekly body oil that leaves skin genuinely fed, not just moisturised. The step most men wish they had started with.',
    outcome: 'Not just clean. Properly fed.',
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
