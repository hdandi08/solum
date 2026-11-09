# Checkout and homepage startup fixes

Keep checkout copy and every homepage section. Work on dev locally, with no pushes or deployment.

1. Verify wallet eligibility from live diagnostic events and Stripe domain settings. Recent iPhone Safari events show Link but no Apple Pay. Domain settings require a signed-in Stripe session.
2. Remove artificial hero visibility delays. Split the homepage route from the checkout startup graph. Start Stripe alongside checkout route download using one shared promise. Keep Awin checkout isolation and all attribution.
3. Load account session code after homepage paint and chat code only when sending. Avoid changing tracking initialization during this fix.
4. Request Apple Pay on all supported platforms and show wallet buttons without overflow. Handle live wallet availability changes, load errors and slow loading without blocking the details form.
5. Make the existing in-app card action a clear touch target and scroll to the details when chosen. Retain the external-browser guide and campaign context.
6. Verify unit tests, production build and route bundle sizes. Inspect homepage sections, both kits, wallet loading and in-app continuation locally. A real iPhone Safari wallet test is still required before claiming Apple Pay restored.
