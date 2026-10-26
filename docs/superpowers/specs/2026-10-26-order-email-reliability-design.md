# Order Email Reliability Design

## Intent

Every paid first-box order must create an independently trackable customer confirmation and founder notification. A failed Resend request must fail the Stripe webhook so Stripe retries it; a successful request must be recorded before that message is skipped on a replay. The dedicated development project sends labelled test emails; production Stripe test-mode purchases remain silent.

## Scope

- Applies to all live first-box routes handled by `stripe-webhook`: one-time Payment Intents, one-time Checkout Sessions, subscription Checkout Sessions, and subscription Payment Intents.
- Adds persistent timestamps and Resend IDs to the existing `orders` record for the two order-created messages.
- Uses a stable Resend idempotency key for each order/message pair.
- Returns a webhook error if Resend rejects either message or persistence fails after a successful provider response.

## Non-goals

- Do not send emails for production Stripe test-mode payments.
- Do not change order copy, Stripe payment processing, AWIN attribution, or non-email analytics.
- Do not create a new asynchronous email worker in this change; Stripe's webhook retry remains the retry driver.

## Design

`orders` receives four nullable fields: the customer confirmation and founder-notification sent timestamps plus their Resend IDs. A shared delivery coordinator receives the current status, sends only messages whose timestamp is absent, and records each accepted Resend response immediately. This lets a webhook retry send only the message that failed.

Both Resend calls require a successful HTTP response. The requests include stable `Idempotency-Key` headers based on the order ID and message role. Resend protects repeated retries within its documented 24-hour idempotency period; the persisted sent timestamp protects all later retries.

All first-box handlers continue to use `shouldSendExternalPurchaseSideEffects` to reject test-mode AWIN and analytics effects. The dedicated development Supabase project is the sole exception for order emails; both development subjects receive a `[DEV]` prefix. The founder notification is no longer conditional on a customer email being present; only the customer confirmation is. Existing-order webhook replays resume message delivery instead of returning before it.

## Acceptance criteria

1. Production Stripe test-mode orders produce neither external email, while development Stripe test-mode orders send both applicable emails with `[DEV]` subjects.
2. A live order with a customer email attempts and persists both messages.
3. A live order without a customer email still attempts and persists the founder notification.
4. A failure after one message succeeds leaves only the failed message pending; a replay does not resend the successful one.
5. A non-2xx Resend response fails the webhook rather than being logged and treated as successful.
6. The migration and Edge Function deploy cleanly to development before production.
