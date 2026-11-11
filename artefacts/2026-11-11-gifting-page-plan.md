# Gifting landing page

Approved direction: separate /gift page, existing purchase flow, reusable components. Audience: people gifting men's body care to their partners. No AI imagery; no woman featured for now. Use existing authentic product photography only.

Intent: a thoughtful gift he can use daily, clear contents and guide, straightforward choice. Preserve locked palette and fonts. No gift messages, scheduled delivery or unverified wrapping promises.

- [x] Add optional copy/navigation props to Nav, KitComparison, FAQ and UnboxingFilm; preserve homepage defaults. Fix footer section links on other routes.
- [x] Build lazy /gift: product-led hero, actual packaging and contents, simple ritual explanation, existing comparison (RITUAL featured), unboxing and gifting FAQs. Prices from KITS.
- [x] Add route metadata with cleanup; retain existing purchase tracking and checkout.
- [x] Verify shared defaults, checkout destinations, mobile/desktop layout, FAQ accessibility, images and production build. No live payments or database mutation.

User requested implementation; proceed inline in current checkout. Preserve existing untracked documents. No new hosting or deployment is needed for this repository change.

User refinement: explicitly Christmas gifting. Lead hero with existing Esquire award and all three press logos using CheckoutProof; reuse full PressSection immediately after hero. No Christmas delivery guarantee or cutoff invented.

Latest user refinement: explain SOLUM in the hero; move publication logos below. Reuse homepage AwardProof in hero and PressSection below it, showing existing publication logos. Add reusable ProductPhotoSwitcher to present the included closed box and RITUAL contents. No additional gift-wrap service implied.

Validation: 262 unit tests passed; production build passed. Browser checks at desktop and mobile: hero/award order, press below hero, no horizontal overflow, real image loading, mobile menu, keyboard FAQ expansion, gift-box selection and RITUAL selection reaching /buy?kit=ritual. No payment submitted.

Viewport refinement: replaced separate gifting hero with existing shared Hero, adding optional copy/image props that preserve homepage defaults. Shortened copy to one concise description. Mobile image now appears behind the content and hero height follows the viewport. Removed redundant hero typography/layout CSS.

Education refinement: reused WhatSolumIs with gift-specific body care, ease-of-use and everyday-value copy. Reused RitualInAction with compact mode: daily/weekly selector, a single active media rail and optional link to the full ritual. Both sections precede the kit choice; removed the older text-only ritual block. Existing homepage component defaults remain unchanged.
