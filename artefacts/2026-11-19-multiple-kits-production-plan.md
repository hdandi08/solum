# Multi-kit production rollout

Authorized by the user on 19 November 2026. Promote the approved dev checkout, with admin parcel handling deferred.

1. Extend the exact-project environment guards to pair production with live Stripe credentials. Test mode mismatches and already-paid webhook recovery with creation disabled.
2. Verify and apply only the three prerequisite checkout reservation migrations and the multi-kit migration, in one transaction. Record migration history; preserve inventory counts and existing orders. Stop on duplicate first-box payment references.
3. Deploy checkout, webhook, parcel guards, release and reservation worker functions explicitly to gvfptmjluxpngfjendbi. Add a dedicated worker secret in Vault and the edge environment; schedule one authenticated minute job. Enable backend reservations and multi-kit checkout only after verification.
4. Enable the frontend flag on storefront Amplify master, preserving inherited production configuration. Run unit, backend and mocked browser checks including production mode. Push verified source to dev and master; verify Amplify and the live UI with payment mutations blocked.
5. Record schema, worker, flags and deployment evidence. All purchased kits and pending parcel units are durable database records. Admin fulfillment remains blocked for multi-kit orders; no live charge, shipping label or unsolicited email is part of verification.

Rollback disables new multi-kit creation and the frontend flag. Keep schema, webhook, release endpoint and worker for existing attempts and paid orders. Do not restore stock manually or remove paid records.
