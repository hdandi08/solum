# SOLUM Admin — Isolated Manual Amplify Deployment Design

**Status:** Approved in conversation on 30 July 2026
**Scope:** Replace only the Git-connected Amplify deployment mechanism in the
secure-admin design. The application, Supabase boundary, environments, domains,
security controls, and production gate remain unchanged.

## Context

The AWS CLI is authenticated to account `798470762256` in `eu-west-2`, but the
AWS browser session is not. A Git-connected Amplify app created through the CLI
requires a GitHub access token. More importantly, the repository contains a
root `amplify.yml` for the existing `solum-web` marketing application. AWS gives
that repository-root file precedence over build settings saved on a separate
Amplify app, so connecting the repository would risk building or publishing
the marketing artifact as the admin application.

The existing `solum-web` application, its repository build, its apex and `www`
domain mappings, and its trackers must remain unchanged.

## Decision

Create `solum-admin` as a manually deployed static Amplify application through
the authenticated AWS CLI. Do not connect it to GitHub.

Build the admin artifact locally from the reviewed source commit with exactly
one environment:

- development: `rodvvmfzkyjsqbufkjbc`;
- production: `gvfptmjluxpngfjendbi`.

Run the artifact verifier immediately after each build. Zip the contents of
`admin/dist`, not the directory itself. Upload the archive only to the
short-lived URL returned by Amplify `create-deployment`, then call
`start-deployment` with that deployment's job ID.

## AWS Resources

- Separate Amplify app: `solum-admin`
- Platform: static `WEB`
- Development branch: `dev`, stage `DEVELOPMENT`
- Production branch: `master`, stage `PRODUCTION`
- Development hostname: `admin-dev.bysolum.co.uk`
- Production hostname: `admin.bysolum.co.uk`

The development branch is created and accepted first. The production branch is
not created or deployed until the development acceptance gate passes.

## Security Controls

- No service-role, Stripe, SendCloud, GitHub, or other privileged credential is
  stored in Amplify or included in an artifact.
- The development artifact contains no production Supabase reference.
- The production artifact contains no development Supabase reference.
- Amplify custom rules provide SPA fallback only for extensionless routes.
- Amplify custom headers enforce CSP, `Cache-Control: no-store`, HSTS,
  `nosniff`, `Referrer-Policy: no-referrer`, clickjacking protection, and a
  restrictive `Permissions-Policy`.
- Development remains password protected as defence in depth.
- The existing `solum-web` app and its domain association are never updated.

## Deployment Flow

1. Confirm the reviewed source commit and clean worktree.
2. Build and verify the development artifact.
3. Create the separate manual Amplify app and `dev` branch.
4. Create a deployment, upload the zipped artifact to its short-lived URL, and
   start the deployment.
5. Use bounded status checks until the job reaches one terminal state.
6. Configure security headers, SPA fallback, and branch access control.
7. Add only the `admin-dev` hostname if AWS permits it without changing the
   storefront domain association.
8. Complete development authentication, MFA, read-only page, network, and
   reversible development-mutation acceptance.
9. Only after acceptance, build and verify the production artifact and repeat
   the process for `master`.

## Error Handling and Rollback

- If app creation fails, do not modify `solum-web`; report the AWS error.
- If artifact upload or deployment fails, keep the failed job for diagnosis and
  create a new deployment only after correcting the cause.
- If AWS rejects the `admin-dev` subdomain because `bysolum.co.uk` is already
  associated with `solum-web`, stop without detaching or editing that existing
  association.
- Roll back by manually redeploying the last accepted artifact archive for the
  affected branch.
- Never use production E2E, checkout, synthetic-order, refund, label, dispatch,
  or other mutation tests.

## Verification

Development acceptance requires:

- the deployment job reaches `SUCCEED`;
- the artifact verifier passed before upload;
- the development banner is shown;
- role and TOTP MFA enforcement work;
- Dashboard, Orders, and Events load development data;
- one preselected reversible development order-status change creates one audit
  event;
- network requests contain no marketing trackers;
- the existing storefront and its domain mappings remain unchanged.

Production acceptance remains non-destructive and read-only.

## Operational Trade-off

The admin app no longer auto-deploys on a Git push. Each release requires an
explicit local build, artifact verification, and manual Amplify deployment.
This is intentional: it preserves strict environment isolation and avoids any
change to the existing marketing application's build configuration.
