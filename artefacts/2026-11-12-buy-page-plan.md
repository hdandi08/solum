# Buy page improvements, revised after local review

Latest user direction: use the previous buy page and improve it, lead with the Esquire logo and clear benefits/value, introduce no extra purchase step, move the supplied What's inside section to the home page.

Implemented on codex/buy-paid-traffic-dev from local dev. No deployment or live transaction.

- Previous buy-page layout and immediate express/card checkout restored. Plain /buy defaults to a compact Ritual checkout for cold ad traffic, with Ground available through Change kit.
- Existing Esquire winner artwork enlarged at the top of checkout. Benefits and nine essentials/four weeks/tools value copy follow.
- What's inside image, gallery and accessible numbered list now appear on the home page after the kit comparison, at /#whats-inside.
- URL kit matching remains case-insensitive. Ritual remains first in expanded choices. Campaign params remain in the URL and are stored and attached to card/wallet PaymentIntent metadata.
- Meta ViewContent includes the correct value and GBP, using the existing shared Pixel/CAPI event ID. Existing checkout/purchase tracking timing retained.
- Local mobile browser confirms express payment is present on initial page load, without a new continue-to-checkout screen.
- Completed payment, Meta Events Manager, Lighthouse comparison and 4G LCP remain release checks.

Final opening: Esquire winner logo first; “A proper clean. Softer skin. No guesswork.” Outcome-led copy introduces nine essentials (seven for Ground), a guided daily routine and weekly reset. No extra checkout step. Shipping changes remain paused and unimplemented.

Approved final copy applied: “The award-winning kit for a proper whole-body clean.” Supporting copy includes intimate care, where and in what order to use each product, and “No guesswork.” Ground uses a non-award headline so the Ritual award is not attributed to Ground.
