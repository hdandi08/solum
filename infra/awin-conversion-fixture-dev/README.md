# Development-only AWIN conversion fixture

This isolated SAM stack exists only for guarded development acceptance of the
durable AWIN outbox. It never calls AWIN and is not part of the production
tracking-domain deployment. The only route is HTTPS `POST
/s2s/advertiser/129171/orders`; it has no CORS policy, stores no request data,
and emits no application logs. API Gateway throttles the route and Lambda logs
expire after one day.

Run local validation first:

```bash
npm test
sam validate --template-file template.yaml --region eu-west-2
sam build --template-file template.yaml
```

Deploy only after the scripts prove AWS account `798470762256`, region
`eu-west-2`, stack suffix `-dev`, linked Supabase ref
`rodvvmfzkyjsqbufkjbc`, and CLI profile `supabase`:

```bash
./scripts/deploy-aws-dev.sh
./scripts/deploy-supabase-dev.sh
```

The Supabase script checks required secret names without reading their values.
It generates the previously absent normal DEV AWIN attribution, encryption, and
worker secrets and leaves the development worker pointed at this fixture. It
removes the temporary Stripe acceptance secret on exit; that fallback requires
the exact development hostname and is dormant once the value is unset. The
existing normal Stripe webhook secret is never read or overwritten.

Acceptance creates synthetic database fixtures only, signs the webhook locally,
and invokes only the deployed webhook and worker. It suppresses purchase side
effects with a durable pre-seeded marker and cleans all synthetic rows in a
`finally` block. It does not call Stripe, Resend, Meta, TikTok, PostHog, AWIN,
checkout, refunds, labels, or dispatch.

To remove the AWS development fixture, run:

```bash
./scripts/teardown-aws-dev.sh
```

The teardown script repeats the exact account, region, and `-dev` stack guard
before deletion. Never rename this stack or its resources without retaining the
development suffix and updating the guard tests.
