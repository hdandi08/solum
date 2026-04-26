// SOVEREIGN contains 9 products: replaces 02 (Italy Towel Mitt) with 09 (Turkish Kese Mitt). Does not include 02.
export const KITS = [
  {
    id: 'ground',
    name: 'GROUND',
    firstBoxPrice: 65,
    monthlyPrice: 38,
    productNums: ['01','02','03','04','05','07','08'],
    tagline: 'Properly clean for the first time. Dead skin gone. Your back actually clean. Skin that holds moisture past midday.',
    popular: false,
    comingSoon: false,
  },
  {
    id: 'ritual',
    name: 'RITUAL',
    firstBoxPrice: 85,
    monthlyPrice: 48,
    productNums: ['01','02','03','04','05','06','07','08'],
    tagline: 'Everything in GROUND plus the oil ritual. Skin that stays fed all day — the step most men say they wish they\'d started with.',
    popular: true,
    comingSoon: false,
  },
  {
    id: 'sovereign',
    name: 'SOVEREIGN',
    firstBoxPrice: 130,
    monthlyPrice: 58,
    // 02 replaced by 09 — Italy Towel Mitt → Turkish Kese Mitt
    productNums: ['01','03','04','05','06','07','08','09','10'],
    replacedProducts: { '02': '09' },
    tagline: 'The full system plus hand-woven Turkish silk. The deepest exfoliation available. For men who want everything.',
    popular: false,
    comingSoon: true,
  },
];
