// SOVEREIGN contains 9 products: replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    firstBoxPrice: 55,
    monthlyPrice: 38,
    productNums: ['01','02','03','04','05','07','08'],
    tagline: 'Daily ritual. Weekly exfoliation. Your body clean for the first time.',
    popular: false,
    comingSoon: false,
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productNums: ['01','02','03','04','05','06','07','08'],
    tagline: 'Adds the weekly oil treatment. Skin that stays fed — not just after the shower.',
    popular: true,
    comingSoon: false,
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    firstBoxPrice: 110,
    monthlyPrice: 58,
    // 02 replaced by 09 — Italy Towel Mitt → Turkish Kese Mitt
    productNums: ['01','03','04','05','06','07','08','09','10'],
    replacedProducts: { '02': '09' },
    tagline: 'Artisan exfoliation. Hand-woven in Istanbul. Goes deeper than the daily mitt.',
    popular: false,
    comingSoon: true,
  },
];
