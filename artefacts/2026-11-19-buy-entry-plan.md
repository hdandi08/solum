# Buy page entry experiences

User requested a shorter buy page for homepage kit selections, an introduction for direct/ad arrivals, and condensed award/press proof in both. Follow-up copy and visual revisions are incorporated below. Visual acceptance is handled by the user.

Keep explicit kit decisions in router history state, not query-string kit selection or a visitor-wide storage flag. Direct links with ?kit=ritual still receive full context. KitComparison, HomeCTABand and the shared bottom buy click handler mark on-site choices while preserving prices, attribution URLs and tracking. Refresh/back/forward retain the current history entry; unrelated arrivals do not inherit an earlier visit's choice. Modified clicks open natively with the conservative direct-landing introduction.

Extract BuyIntroduction for independently verifiable direct/on-site rendering. Both paths use the same small Esquire award row (explicitly RITUAL) and all four linked publication logos. Keep other CheckoutProof uses unchanged. No changes to payment, inventory, reservations or backend services. User subsequently requested deployment to dev and production through Git pushes.

Approved direct-visitor copy now uses the homepage headline, a concise explanation of moving beyond a 3-in-1, the 10-minute daily ritual and 22-minute spa reset, and Cedarwood + Vetiver fragrance. Award-winning applies only to RITUAL.

BuyKitConfirmation now presents the original kit image, name, total and free UK delivery in a responsive card, with a small Change kit link in its header and the shipping date below. Delivery uses a truck icon; shipping uses a calendar icon. Desktop delivery text aligns under its price, and the desktop order summary uses document scrolling instead of a separate scroll container.

Validation: 307 unit tests pass; production build prerenders all 25 public pages. Browser checks cover direct GROUND/RITUAL entry, the homepage-to-buy route, Change kit, small-screen fit, price/delivery alignment and document scrolling. The stale local Vite dependency cache was resolved by restarting the preview server.
