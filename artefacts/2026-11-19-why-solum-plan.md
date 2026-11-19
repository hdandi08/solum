# Why SOLUM refresh

Approved brief: explain the problems SOLUM solves for a man moving beyond a 3-in-1, with a premium presentation and the brand idea “Built for men. From the ground up.” User requested implementation, then deployment to dev, and will perform visual checks.

Use an editorial photograph beside three short reasons instead of another product list: considered formulas/tools/fragrance, a guided 10-minute daily routine, and a 22-minute spa-like weekly reset. Keep the existing black/bone/blue typography system and gold weekly accent. Use original photography. Explain the name as Latin for ground or foundation, with “from the ground up” as the brand philosophy. Avoid unsupported odour-control promises. Retain gift-page custom content and the existing #what menu anchor.

Implementation:
- [x] Update WhatSolumIs with responsive photograph/story layout and concise copy; preserve custom gifting pillars.
- [x] Update the existing homepage heading assertion.
- [x] Run focused homepage/gift checks and build; 35 checks pass and 25 public pages prerender.
- [ ] Commit the accumulated authorized storefront work and publish to the Amplify dev branch only. Shared app-level routing requires separate production rollout and remains unchanged.
- [ ] Confirm the dev deployment job succeeds and serves the new section. User handles visual acceptance.

Deployment uses the repository-connected Amplify dev branch. A manual deployment API probe confirmed direct artifact upload is unavailable for this app. Dev configuration must retain the development Supabase endpoint and test Stripe key.
