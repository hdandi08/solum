# Secure Admin and AWS Amplify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unsafe browser-privileged admin with an MFA-protected, server-authorized Dashboard/Orders/Events application and deploy isolated development and production builds through a separate AWS Amplify app.

**Architecture:** `admin/` becomes the only admin frontend and compiles against exactly one Supabase project per build. Browser requests use a single anon Supabase client and authenticated Edge Functions; a shared server helper verifies the JWT, the protected `admin` role, `aal2`, and the request origin before creating a service-role client. A new `solum-admin` Amplify app maps `dev` to `admin-dev.bysolum.co.uk` and `master` to `admin.bysolum.co.uk`.

**Tech Stack:** React 19, Vite 8, Vitest, Supabase Auth/MFA, Supabase Edge Functions (Deno), PostgreSQL migrations/RPC, AWS Amplify Hosting, Route 53/Amplify-managed TLS.

## Global Constraints

- Never place a Supabase service-role key, Stripe secret, SendCloud secret, or other privileged credential in `admin/`, Vite variables, Amplify frontend variables, or a browser artifact.
- Production Supabase project reference is exactly `gvfptmjluxpngfjendbi`.
- Development Supabase project reference is exactly `rodvvmfzkyjsqbufkjbc`.
- Production admin origin is exactly `https://admin.bysolum.co.uk`.
- Development origins are exactly `https://admin-dev.bysolum.co.uk`, `http://localhost:5174`, and `http://127.0.0.1:5174`.
- A development artifact must contain no production Supabase reference; a production artifact must contain no development Supabase reference.
- Every exposed admin API requires a valid Supabase token, `app_metadata.role === "admin"`, and assurance level `aal2`.
- Every admin data request goes through an Edge Function. There is no browser `.from(...)` call and no direct-query fallback.
- Initial deployed routes are only `/`, `/orders`, `/events`, and `/login`.
- Existing `solum-web` Amplify app `d3pa095gzazg3c`, its apex/`www` domain mappings, and its marketing scripts are unchanged.
- Development migrations, functions, artifact scans, and acceptance checks complete before production deployment.
- No Playwright, checkout, synthetic order, refund, or shipping-label test runs against production.
- Do not monitor production continuously; use bounded deployment-status checks only when a deployment is explicitly started.

---

## File Map

### Frontend configuration and API boundary

- `admin/src/lib/environment.js`: validates the compiled environment and exact Supabase project reference.
- `admin/src/lib/supabase.js`: exports the one anon/auth Supabase client for the current build.
- `admin/src/lib/adminApi.js`: authenticated Edge Function client and normalized errors.
- `admin/src/lib/*.test.js`: pure environment and API-client tests.
- `admin/vitest.config.js`: admin unit-test configuration.

### Frontend authentication and pages

- `admin/src/App.jsx`: session, role, and MFA route boundary.
- `admin/src/components/MfaGate.jsx`: TOTP enrollment/challenge.
- `admin/src/components/Layout.jsx`: fixed environment banner, secure navigation, and sign-out.
- `admin/src/pages/LoginPage.jsx`: single-environment sign-in.
- `admin/src/pages/DashboardPage.jsx`: canonical dashboard contract.
- `admin/src/pages/OrdersPage.jsx`: server-backed order list and actions.
- `admin/src/pages/EventsPage.jsx`: server-backed inventory event list.
- `admin/src/features/*/model.js`: pure response/input validation used by pages.
- `admin/src/features/*/*.test.js`: page-model tests.

### Server authorization, contracts, and audit

- `supabase/functions/_shared/adminAuth.ts`: JWT, role, MFA, CORS, request-ID, and response envelope.
- `supabase/functions/_shared/adminAuth.test.ts`: pure auth/CORS/response tests.
- `supabase/functions/_shared/adminAudit.ts`: external-operation audit lifecycle.
- `supabase/functions/_shared/adminAudit.test.ts`: audit lifecycle tests using a fake database adapter.
- `supabase/functions/_shared/adminDashboard.ts`: pure dashboard calculations and contract shaping.
- `supabase/functions/_shared/adminDashboard.test.ts`: dashboard contract tests.
- `supabase/functions/_shared/adminOrders.ts`: filter and order-transition validation.
- `supabase/functions/_shared/adminOrders.test.ts`: order validation tests.
- `supabase/functions/_shared/adminEvents.ts`: event filter validation.
- `supabase/functions/_shared/adminEvents.test.ts`: event validation tests.
- `supabase/migrations/20260730000001_secure_admin_audit.sql`: append-only audit table.
- `supabase/migrations/20260730000002_secure_admin_order_mutation.sql`: atomic order mutation and audit RPC.
- `supabase/functions/admin-dashboard/index.ts`: canonical dashboard endpoint.
- `supabase/functions/admin-orders/index.ts`: list and reversible order-mutation endpoint.
- `supabase/functions/admin-events/index.ts`: inventory-event endpoint.
- `supabase/functions/cancel-order/index.ts`: secured and audited refund flow.
- `supabase/functions/create-sendcloud-parcel/index.ts`: secured and audited label flow.

### Canonicalization and deployment

- Delete `admin/src/lib/clients.js` and `admin/src/context/EnvContext.jsx`.
- Delete unused `web/src/admin/`.
- `admin/public/fonts/*`: local SOLUM fonts copied from `web/public/fonts`.
- `admin/index.html`: no external font or tracking requests.
- `admin/amplify.yml`: deterministic admin build.
- `admin/scripts/verify-artifact.mjs`: credential, environment, and tracker artifact scan.
- `admin/.env.example`: non-secret variable names.
- `docs/admin-amplify-deployment.md`: executable AWS and Supabase runbook.

---

### Task 1: Establish the single-environment frontend boundary

**Files:**

- Modify: `admin/package.json`
- Modify: `admin/package-lock.json`
- Create: `admin/vitest.config.js`
- Create: `admin/src/lib/environment.js`
- Create: `admin/src/lib/environment.test.js`
- Modify: `admin/src/lib/supabase.js`
- Create: `admin/.env.example`

**Interfaces:**

- Produces: `resolveAdminEnvironment(rawEnv)` returning `{ name, isProduction, supabaseUrl, anonKey, projectRef, allowedOrigin }`.
- Produces: `adminEnvironment`, resolved once from `import.meta.env`.
- Produces: `supabase`, one anon-key client for the compiled environment.

- [ ] **Step 1: Add the test runner**

Run:

```bash
npm --prefix admin install --save-dev vitest@2.1.9
```

Add these scripts to `admin/package.json`:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 2: Configure Vitest**

Create `admin/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.js'],
  },
})
```

- [ ] **Step 3: Write failing environment tests**

Create `admin/src/lib/environment.test.js` covering:

```js
import { describe, expect, it } from 'vitest'
import { resolveAdminEnvironment } from './environment'

const prod = {
  VITE_ADMIN_ENV: 'production',
  VITE_SUPABASE_URL: 'https://gvfptmjluxpngfjendbi.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'public-anon-key',
}

it('accepts the exact production project', () => {
  expect(resolveAdminEnvironment(prod)).toMatchObject({
    name: 'production',
    isProduction: true,
    projectRef: 'gvfptmjluxpngfjendbi',
    allowedOrigin: 'https://admin.bysolum.co.uk',
  })
})

it('rejects a production label with the development project', () => {
  expect(() => resolveAdminEnvironment({
    ...prod,
    VITE_SUPABASE_URL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  })).toThrow(/environment does not match Supabase project/i)
})

it('rejects missing or unknown configuration', () => {
  expect(() => resolveAdminEnvironment({})).toThrow(/VITE_ADMIN_ENV/)
  expect(() => resolveAdminEnvironment({ ...prod, VITE_ADMIN_ENV: 'staging' })).toThrow(/production or development/)
})
```

- [ ] **Step 4: Verify the tests fail**

Run:

```bash
npm --prefix admin test -- src/lib/environment.test.js
```

Expected: FAIL because `environment.js` does not exist.

- [ ] **Step 5: Implement exact environment validation**

Create `environment.js` with immutable definitions:

```js
const DEFINITIONS = Object.freeze({
  production: {
    projectRef: 'gvfptmjluxpngfjendbi',
    allowedOrigin: 'https://admin.bysolum.co.uk',
  },
  development: {
    projectRef: 'rodvvmfzkyjsqbufkjbc',
    allowedOrigin: 'https://admin-dev.bysolum.co.uk',
  },
})

export function resolveAdminEnvironment(rawEnv) {
  const name = rawEnv.VITE_ADMIN_ENV
  const definition = DEFINITIONS[name]
  if (!definition) throw new Error('VITE_ADMIN_ENV must be production or development.')
  if (!rawEnv.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required.')
  if (!rawEnv.VITE_SUPABASE_ANON_KEY) throw new Error('VITE_SUPABASE_ANON_KEY is required.')

  const url = new URL(rawEnv.VITE_SUPABASE_URL)
  const projectRef = url.hostname.split('.')[0]
  if (url.protocol !== 'https:' || projectRef !== definition.projectRef) {
    throw new Error('Admin environment does not match Supabase project.')
  }

  return Object.freeze({
    name,
    isProduction: name === 'production',
    supabaseUrl: url.origin,
    anonKey: rawEnv.VITE_SUPABASE_ANON_KEY,
    projectRef,
    allowedOrigin: definition.allowedOrigin,
  })
}

export const adminEnvironment = resolveAdminEnvironment(import.meta.env)
```

Update `admin/src/lib/supabase.js` to create one client with
`adminEnvironment.supabaseUrl` and `adminEnvironment.anonKey`. Use
`flowType: "pkce"`, `persistSession: true`, `autoRefreshToken: true`, and
`detectSessionInUrl: true`.

- [ ] **Step 6: Document only non-secret variables**

Create `admin/.env.example`:

```dotenv
VITE_ADMIN_ENV=development
VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 7: Run tests and build**

Run:

```bash
npm --prefix admin test -- src/lib/environment.test.js
VITE_ADMIN_ENV=development VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co VITE_SUPABASE_ANON_KEY=test-anon npm --prefix admin run build
```

Expected: environment tests PASS and Vite build succeeds.

- [ ] **Step 8: Commit**

```bash
git add admin/package.json admin/package-lock.json admin/vitest.config.js admin/src/lib/environment.js admin/src/lib/environment.test.js admin/src/lib/supabase.js admin/.env.example
git commit -m "refactor: isolate admin frontend environment"
```

---

### Task 2: Add the shared server authorization and response boundary

**Files:**

- Create: `supabase/functions/_shared/adminAuth.ts`
- Create: `supabase/functions/_shared/adminAuth.test.ts`

**Interfaces:**

- Produces: `authorizeAdminRequest(req, deps?) -> Promise<AdminContext>`.
- Produces: `handleAdminPreflight(req) -> Response | null`.
- Produces: `jsonOk(data, context, status?)` and `jsonError(error, context?)`.
- `AdminContext` contains `{ actor: { userId, email }, requestId, origin, corsHeaders }`.

- [ ] **Step 1: Write failing pure authorization tests**

Cover these cases in `adminAuth.test.ts`:

```ts
Deno.test('approved production origin, admin role, and aal2 succeed', async () => {
  const req = new Request('https://edge.test', {
    headers: {
      origin: 'https://admin.bysolum.co.uk',
      authorization: 'Bearer valid-token',
    },
  })
  const context = await authorizeAdminRequest(req, {
    supabaseUrl: 'https://gvfptmjluxpngfjendbi.supabase.co',
    getClaims: async () => ({
      sub: '00000000-0000-0000-0000-000000000001',
      email: 'harsha@bysolum.com',
      aal: 'aal2',
      app_metadata: { role: 'admin' },
    }),
    randomUUID: () => '10000000-0000-0000-0000-000000000001',
  })
  assertEquals(context.actor.email, 'harsha@bysolum.com')
})
```

Also assert:

- no bearer token -> `AdminHttpError` status `401`;
- invalid claims -> `401`;
- role other than `admin` -> `403`;
- `aal1` -> `403` with code `MFA_REQUIRED`;
- production request from development/local origin -> `403`;
- development request accepts only the three approved development origins;
- an OPTIONS request from an unknown origin receives no
  `Access-Control-Allow-Origin`;
- success and error responses use the canonical envelopes and preserve the
  request ID.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
deno test supabase/functions/_shared/adminAuth.test.ts
```

Expected: FAIL because `adminAuth.ts` does not exist.

- [ ] **Step 3: Implement claims, role, MFA, and origin validation**

Use these exact protected claim requirements:

```ts
type AdminClaims = {
  sub?: string
  email?: string
  aal?: string
  app_metadata?: { role?: string }
}

if (claims.app_metadata?.role !== 'admin') {
  throw new AdminHttpError(403, 'FORBIDDEN', 'Administrator access is required.')
}
if (claims.aal !== 'aal2') {
  throw new AdminHttpError(403, 'MFA_REQUIRED', 'Administrator MFA is required.')
}
```

The runtime `getClaims` implementation must call:

```ts
const client = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
const { data, error } = await client.auth.getClaims(token)
if (error || !data?.claims) throw new AdminHttpError(401, 'UNAUTHORIZED', 'Sign in is required.')
return data.claims as AdminClaims
```

Map allowed origins from the exact project reference embedded in
`SUPABASE_URL`. An unknown reference fails closed. Reflect the request origin
only after it is approved; never return `Access-Control-Allow-Origin: *`.

- [ ] **Step 4: Implement canonical response helpers**

Use:

```ts
jsonOk(data, context, status = 200)
// {"data": data, "request_id": context.requestId}

jsonError(error, context)
// {"error":{"code":error.code,"message":error.publicMessage},"request_id":context?.requestId}
```

Every JSON response includes `Content-Type: application/json` and
`Cache-Control: no-store`.

- [ ] **Step 5: Run shared tests**

Run:

```bash
deno test supabase/functions/_shared/adminAuth.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/adminAuth.ts supabase/functions/_shared/adminAuth.test.ts
git commit -m "feat: add secure admin function boundary"
```

---

### Task 3: Add append-only admin audit infrastructure

**Files:**

- Create: `supabase/migrations/20260730000001_secure_admin_audit.sql`
- Create: `supabase/functions/_shared/adminAudit.ts`
- Create: `supabase/functions/_shared/adminAudit.test.ts`

**Interfaces:**

- Produces table `public.admin_audit_events`.
- Produces `startAdminAudit(db, input) -> Promise<AuditHandle>`.
- Produces `finishAdminAudit(db, handle, outcome) -> Promise<void>`.

- [ ] **Step 1: Write the migration**

Create the table with:

```sql
create table public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  actor_user_id uuid not null,
  actor_email text not null,
  environment text not null check (environment in ('production', 'development')),
  action text not null,
  target_type text not null,
  target_id text not null,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  before_state jsonb,
  after_state jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.admin_audit_events enable row level security;
revoke all on public.admin_audit_events from anon, authenticated;
create index admin_audit_events_target_idx
  on public.admin_audit_events (target_type, target_id, created_at desc);
create index admin_audit_events_actor_idx
  on public.admin_audit_events (actor_user_id, created_at desc);
```

Do not create browser RLS policies. The service role is the only data path.

- [ ] **Step 2: Write failing audit-helper tests**

Use a fake adapter implementing:

```ts
interface AuditDatabase {
  insertAudit(row: Record<string, unknown>): Promise<{ id: string }>
  updateAudit(id: string, patch: Record<string, unknown>): Promise<void>
}
```

Assert:

- `startAdminAudit` inserts `pending` with actor, request, target, and bounded
  before-state;
- `finishAdminAudit(..., { status: "succeeded" })` sets `completed_at`;
- failure stores a stable error code without an exception stack or secret;
- an insert failure rejects before an external operation can be called.

- [ ] **Step 3: Verify tests fail**

Run:

```bash
deno test supabase/functions/_shared/adminAudit.test.ts
```

Expected: FAIL because `adminAudit.ts` does not exist.

- [ ] **Step 4: Implement the audit lifecycle**

Export:

```ts
export type AuditInput = {
  requestId: string
  actorUserId: string
  actorEmail: string
  environment: 'production' | 'development'
  action: string
  targetType: string
  targetId: string
  beforeState?: Record<string, unknown>
}

export type AuditOutcome =
  | { status: 'succeeded'; afterState?: Record<string, unknown> }
  | { status: 'failed'; errorCode: string; afterState?: Record<string, unknown> }
```

Limit state objects to fields explicitly passed by the calling function. The
helper must not serialize request headers, tokens, full customer rows, or raw
third-party responses.

- [ ] **Step 5: Run tests**

Run:

```bash
deno test supabase/functions/_shared/adminAudit.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260730000001_secure_admin_audit.sql supabase/functions/_shared/adminAudit.ts supabase/functions/_shared/adminAudit.test.ts
git commit -m "feat: add admin audit log"
```

---

### Task 4: Repair the dashboard contract end to end

**Files:**

- Create: `supabase/functions/_shared/adminDashboard.ts`
- Create: `supabase/functions/_shared/adminDashboard.test.ts`
- Modify: `supabase/functions/admin-dashboard/index.ts`
- Create: `admin/src/lib/adminApi.js`
- Create: `admin/src/lib/adminApi.test.js`
- Create: `admin/src/features/dashboard/model.js`
- Create: `admin/src/features/dashboard/model.test.js`
- Modify: `admin/src/pages/DashboardPage.jsx`

**Interfaces:**

- Produces `createAdminApi({ supabase, environment, fetchImpl })`.
- Produces `adminApi.request(functionName, options)`.
- Produces canonical dashboard payload `{ summary, subscribers_by_kit, products, recent_orders, recent_inventory_events }`.

- [ ] **Step 1: Write failing API-client tests**

Assert that `createAdminApi`:

- fetches the current session;
- sends the current session token as `Authorization: Bearer ...` and sends the
  anon `apikey`;
- sends no request when the session is absent;
- unwraps `{ data, request_id }`;
- maps `401`, `MFA_REQUIRED`, `FORBIDDEN`, validation, and server errors to
  `AdminApiError`;
- never logs the token or response body.

- [ ] **Step 2: Write failing dashboard model and server tests**

Use this exact contract:

```js
{
  summary: {
    active_subscribers: 3,
    pending_orders: 2,
    unresolved_payment_issues: 1,
    products_at_risk: 1,
  },
  subscribers_by_kit: { ground: 2, ritual: 1, sovereign: 0 },
  products: [{
    id: 'product-01',
    name: 'Amino Acid Body Wash',
    current_stock: 20,
    monthly_burn: 10,
    days_runway: 60,
    weeks_runway: 8.6,
    risk_level: 'ok',
  }],
  recent_orders: [],
  recent_inventory_events: [],
}
```

Assert the frontend model rejects the legacy fields `active_subscribers` at the
root and `runway_weeks`, and that risk level is supplied by the server rather
than recalculated in React.

- [ ] **Step 3: Verify tests fail**

Run:

```bash
npm --prefix admin test -- src/lib/adminApi.test.js src/features/dashboard/model.test.js
deno test supabase/functions/_shared/adminDashboard.test.ts
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 4: Implement the API client**

Use:

```js
export function createAdminApi({ supabase, environment, fetchImpl = fetch }) {
  return {
    async request(functionName, { method = 'POST', body, signal } = {}) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new AdminApiError('UNAUTHORIZED', 'Sign in is required.', 401)
      const response = await fetchImpl(
        `${environment.supabaseUrl}/functions/v1/${functionName}`,
        {
          method,
          signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: environment.anonKey,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      )
      // parse canonical envelope and throw AdminApiError when !response.ok
    },
  }
}
```

- [ ] **Step 5: Implement pure dashboard shaping**

Move subscriber counts, monthly burn, runway, and risk calculation into
`adminDashboard.ts`. The function receives query result arrays and returns the
canonical contract. It must use `null`, not falsy checks, so zero runway remains
zero.

- [ ] **Step 6: Rewrite `admin-dashboard`**

The handler sequence is:

```ts
const preflight = handleAdminPreflight(req)
if (preflight) return preflight
const context = await authorizeAdminRequest(req)
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
// query bounded fields
return jsonOk(buildAdminDashboard(input), context)
```

Remove hard-coded email allow-lists and wildcard CORS. Select only fields used by
the contract. Catch `AdminHttpError` separately from unexpected errors.

- [ ] **Step 7: Rewrite the Dashboard page**

Fetch only through:

```js
const dashboard = await adminApi.request('admin-dashboard', { body: {} })
```

Render `summary`, server-supplied `risk_level`, recent orders, and recent
inventory events. Remove all direct `.from(...)` calls and client risk formulas.

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm --prefix admin test -- src/lib/adminApi.test.js src/features/dashboard/model.test.js
deno test supabase/functions/_shared/adminAuth.test.ts supabase/functions/_shared/adminDashboard.test.ts
```

Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add admin/src/lib/adminApi.js admin/src/lib/adminApi.test.js admin/src/features/dashboard admin/src/pages/DashboardPage.jsx supabase/functions/_shared/adminDashboard.ts supabase/functions/_shared/adminDashboard.test.ts supabase/functions/admin-dashboard/index.ts
git commit -m "feat: secure admin dashboard data"
```

---

### Task 5: Move order reads and reversible mutations behind `admin-orders`

**Files:**

- Create: `supabase/migrations/20260730000002_secure_admin_order_mutation.sql`
- Create: `supabase/functions/_shared/adminOrders.ts`
- Create: `supabase/functions/_shared/adminOrders.test.ts`
- Create: `supabase/functions/admin-orders/index.ts`
- Create: `admin/src/features/orders/model.js`
- Create: `admin/src/features/orders/model.test.js`
- Modify: `admin/src/pages/OrdersPage.jsx`

**Interfaces:**

- Produces `parseOrderListInput(input)` with page size `1..100`.
- Produces `parseOrderMutation(input)` for `dispatch`, `deliver`, and `reset_pending`.
- Produces RPC `public.admin_mutate_order(...)`.
- Produces `admin-orders` POST list and PATCH mutation operations.

- [ ] **Step 1: Write failing order validation tests**

Cover:

```ts
parseOrderListInput({
  page: 0,
  page_size: 25,
  order_type: 'first_box',
  dispatch_status: 'pending',
  search: 'harsha',
})
```

Reject negative pages, page sizes over 100, unknown order/status values, search
strings over 100 characters, unknown mutation actions, non-UUID IDs, carriers
outside `royal-mail|evri|dpd|dhl|parcelforce|other`, and tracking values over 100
characters.

State transitions are exact:

- `pending -> dispatched`;
- `dispatched -> delivered`;
- `dispatched -> pending`;
- all other requested transitions return conflict.

- [ ] **Step 2: Verify server tests fail**

Run:

```bash
deno test supabase/functions/_shared/adminOrders.test.ts
```

Expected: FAIL because `adminOrders.ts` does not exist.

- [ ] **Step 3: Create the atomic mutation RPC**

`public.admin_mutate_order` accepts:

```sql
p_order_id uuid,
p_action text,
p_tracking_number text,
p_carrier text,
p_actor_user_id uuid,
p_actor_email text,
p_environment text,
p_request_id uuid
```

It locks the order `for update`, validates the transition, updates only:

- `dispatch_status`;
- `tracking_number`;
- `carrier`;
- `dispatched_at`;

and inserts the succeeded/failed audit row in the same transaction. Return:

```json
{"ok":true,"order":{}}
```

or:

```json
{"ok":false,"code":"INVALID_TRANSITION","message":"Order must be dispatched before delivery."}
```

Revoke execution from `public`, `anon`, and `authenticated`; grant it only to
`service_role`. Set `search_path = public`.

- [ ] **Step 4: Implement the orders endpoint**

POST:

- use server-side validated pagination and filters;
- select only order, current address, and displayed customer fields;
- escape `%`, `_`, and `\` in search input before `ilike`;
- return `{ rows, total_count, dispatch_batches }`.

PATCH:

- validate the mutation;
- call `admin_mutate_order` with the authenticated actor and request ID;
- map RPC conflicts to HTTP `409`;
- return the updated order in the canonical envelope.

- [ ] **Step 5: Write failing frontend order-model tests**

Assert:

- filters serialize to the server input;
- dispatch requires a confirmed order ID and normalized carrier/tracking value;
- server rows map current addresses without a second query;
- pagination uses the returned `total_count`;
- there is no customer-panel direct-query dependency.

- [ ] **Step 6: Rewrite OrdersPage**

Replace all order `.from(...)` calls with:

```js
adminApi.request('admin-orders', { body: listInput })
adminApi.request('admin-orders', { method: 'PATCH', body: mutationInput })
```

Remove the direct-query `CustomerPanel` drill-down and the shipping-options debug
button. Keep existing explicit confirmation prompts. Dedicated refund and label
actions remain buttons but will be secured in Task 6.

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm --prefix admin test -- src/features/orders/model.test.js
deno test supabase/functions/_shared/adminOrders.test.ts
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260730000002_secure_admin_order_mutation.sql supabase/functions/_shared/adminOrders.ts supabase/functions/_shared/adminOrders.test.ts supabase/functions/admin-orders/index.ts admin/src/features/orders admin/src/pages/OrdersPage.jsx
git commit -m "feat: secure admin order operations"
```

---

### Task 6: Secure and audit refund and shipping-label actions

**Files:**

- Modify: `supabase/functions/cancel-order/index.ts`
- Modify: `supabase/functions/create-sendcloud-parcel/index.ts`
- Create: `supabase/functions/_shared/adminExternalActions.ts`
- Create: `supabase/functions/_shared/adminExternalActions.test.ts`
- Modify: `admin/src/pages/OrdersPage.jsx`

**Interfaces:**

- Produces pure `refundIdempotencyKey(orderId)`.
- Produces pure `labelActionKey(orderId)`.
- Both endpoints consume the shared admin auth/audit helpers and return canonical envelopes.

- [ ] **Step 1: Write failing action tests**

Assert:

- refund idempotency key for order
  `00000000-0000-0000-0000-000000000001` is exactly
  `solum-admin-refund:00000000-0000-0000-0000-000000000001`;
- label action key for that order is exactly
  `solum-admin-label:00000000-0000-0000-0000-000000000001`;
- missing order ID returns validation failure before an audit or external call;
- audit `pending` is created before the external adapter runs;
- success finishes the audit with bounded identifiers;
- Stripe/SendCloud failure finishes it as failed without recording raw responses,
  credentials, addresses, or tokens.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
deno test supabase/functions/_shared/adminExternalActions.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Secure `cancel-order`**

Replace the email allow-list and wildcard CORS with `authorizeAdminRequest`.
Create a pending `order.refund` audit before Stripe. Call Stripe with:

```ts
await stripe.refunds.create(
  { payment_intent: order.stripe_payment_id },
  { idempotencyKey: refundIdempotencyKey(order.id) },
)
```

On success, update the order and mark the audit succeeded with only
`refund_id`, `sendcloud_cancelled`, and `order_status`. On any failure, mark the
audit failed with a stable code such as `STRIPE_REFUND_FAILED` or
`ORDER_UPDATE_FAILED`.

- [ ] **Step 4: Secure `create-sendcloud-parcel`**

Replace the email allow-list and wildcard CORS with `authorizeAdminRequest`.
Remove the shipping-options debug mode from the deployed contract. For label
creation, create a pending `order.shipping_label.create` audit before calling
SendCloud. Preserve the existing `sendcloud_parcel_id` duplicate guard and
record only parcel/tracking identifiers in the completed audit.

Label PDF retrieval is read-only and requires auth/MFA but does not create an
audit event.

- [ ] **Step 5: Update the Orders page response handling**

Use the shared API client for:

```js
adminApi.request('cancel-order', { body: { order_id: orderId } })
adminApi.request('create-sendcloud-parcel', { body: { order_id: orderId } })
adminApi.request('create-sendcloud-parcel', { body: { order_id: orderId, get_label: true } })
```

Continue to require the existing irreversible-action confirmations.

- [ ] **Step 6: Run tests**

Run:

```bash
deno test supabase/functions/_shared/adminAuth.test.ts supabase/functions/_shared/adminAudit.test.ts supabase/functions/_shared/adminExternalActions.test.ts
npm --prefix admin test -- src/features/orders/model.test.js
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/cancel-order/index.ts supabase/functions/create-sendcloud-parcel/index.ts supabase/functions/_shared/adminExternalActions.ts supabase/functions/_shared/adminExternalActions.test.ts admin/src/pages/OrdersPage.jsx
git commit -m "feat: audit admin refund and label actions"
```

---

### Task 7: Add the secure Events endpoint and page

**Files:**

- Create: `supabase/functions/_shared/adminEvents.ts`
- Create: `supabase/functions/_shared/adminEvents.test.ts`
- Create: `supabase/functions/admin-events/index.ts`
- Create: `admin/src/features/events/model.js`
- Create: `admin/src/features/events/model.test.js`
- Modify: `admin/src/pages/EventsPage.jsx`

**Interfaces:**

- Produces `parseEventListInput(input)`.
- Produces response `{ rows, total_count, products }`.

- [ ] **Step 1: Write failing event filter tests**

Accept transaction types:

```text
inbound
outbound_order
adjustment
damaged
```

Accept ISO dates `YYYY-MM-DD`, page `>= 0`, and page size `1..100`. Reject an
unknown product ID format, reversed date range, unknown type, or oversized page.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
deno test supabase/functions/_shared/adminEvents.test.ts
npm --prefix admin test -- src/features/events/model.test.js
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 3: Implement `admin-events`**

Authorize before parsing the body. Query bounded inventory event fields with
product name and query active products for the filter. Apply all validated
filters server-side. Return:

```json
{
  "rows": [],
  "total_count": 0,
  "products": [{"id":"product-01","name":"Amino Acid Body Wash"}]
}
```

inside the standard success envelope.

- [ ] **Step 4: Rewrite EventsPage**

Fetch only through `adminApi.request('admin-events', { body: filters })`. Remove
the direct Supabase fallback and the separate dashboard request for product
options.

- [ ] **Step 5: Run tests**

Run:

```bash
deno test supabase/functions/_shared/adminEvents.test.ts
npm --prefix admin test -- src/features/events/model.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/_shared/adminEvents.ts supabase/functions/_shared/adminEvents.test.ts supabase/functions/admin-events/index.ts admin/src/features/events admin/src/pages/EventsPage.jsx
git commit -m "feat: add secure admin events"
```

---

### Task 8: Enforce administrator role and MFA in the canonical frontend

**Files:**

- Create: `admin/src/lib/authState.js`
- Create: `admin/src/lib/authState.test.js`
- Create: `admin/src/components/MfaGate.jsx`
- Modify: `admin/src/App.jsx`
- Modify: `admin/src/pages/LoginPage.jsx`
- Modify: `admin/src/components/Layout.jsx`
- Modify: `admin/src/admin.css`
- Delete: `admin/src/lib/clients.js`
- Delete: `admin/src/context/EnvContext.jsx`
- Delete: `web/src/admin/`

**Interfaces:**

- Produces `resolveAdminAuthStep({ session, aal, factors })`.
- Produces auth states `loading|signed_out|forbidden|enrol_mfa|challenge_mfa|ready`.

- [ ] **Step 1: Write failing auth-state tests**

Assert:

- no resolved session -> `loading`;
- resolved null session -> `signed_out`;
- authenticated user without `app_metadata.role=admin` -> `forbidden`;
- admin with no verified TOTP factor -> `enrol_mfa`;
- admin with verified factor and current `aal1` -> `challenge_mfa`;
- admin with current `aal2` -> `ready`.

- [ ] **Step 2: Verify tests fail**

Run:

```bash
npm --prefix admin test -- src/lib/authState.test.js
```

Expected: FAIL because `authState.js` does not exist.

- [ ] **Step 3: Implement TOTP enrollment and challenge**

`MfaGate` uses:

```js
supabase.auth.mfa.listFactors()
supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SOLUM Admin' })
supabase.auth.mfa.challenge({ factorId })
supabase.auth.mfa.verify({ factorId, challengeId, code })
supabase.auth.mfa.getAuthenticatorAssuranceLevel()
```

Show the TOTP QR code/secret only during enrollment. Accept exactly six numeric
digits. After verification, refresh the session before rendering routes.

- [ ] **Step 4: Replace the browser email allow-list**

`App.jsx` checks the protected role only for routing usability. It must not
contain `ADMIN_EMAILS`. Subscribe to auth changes using the single `supabase`
client and protect routes with the auth-state machine.

- [ ] **Step 5: Replace environment switching**

`LoginPage` signs into the one compiled environment. `Layout` reads
`adminEnvironment` and renders a non-interactive red production banner or amber
development banner. Remove local-storage environment state and the switch modal.

Route only:

```jsx
<Route path="/" element={<DashboardPage />} />
<Route path="/orders" element={<OrdersPage />} />
<Route path="/events" element={<EventsPage />} />
<Route path="/login" element={<LoginPage />} />
```

- [ ] **Step 6: Remove unsafe and duplicate code**

Delete `admin/src/lib/clients.js`, `admin/src/context/EnvContext.jsx`, and the
unused `web/src/admin/` tree. Verify no production source imports them.

- [ ] **Step 7: Run auth and source-safety checks**

Run:

```bash
npm --prefix admin test -- src/lib/authState.test.js
rg -n "SERVICE_ROLE|ADMIN_EMAILS|EnvContext|switchEnv|config\\.client|\\.from\\(" admin/src web/src
```

Expected: tests PASS and `rg` returns no match in deployed admin code for
service-role variables, email allow-lists, environment switching, or direct
table calls.

- [ ] **Step 8: Commit**

```bash
git add -A admin/src web/src/admin
git commit -m "feat: require MFA for canonical admin"
```

---

### Task 9: Make the admin build deterministic and artifact-safe

**Files:**

- Modify: `admin/index.html`
- Create: `admin/public/fonts/barlow-condensed-300.woff2`
- Create: `admin/public/fonts/barlow-condensed-400.woff2`
- Create: `admin/public/fonts/barlow-condensed-500.woff2`
- Create: `admin/public/fonts/barlow-condensed-600.woff2`
- Create: `admin/public/fonts/barlow-condensed-700.woff2`
- Create: `admin/public/fonts/bebas-neue-400.woff2`
- Modify: `admin/src/index.css`
- Modify: `admin/amplify.yml`
- Create: `admin/scripts/verify-artifact.mjs`
- Create: `admin/scripts/verify-artifact.test.js`
- Modify: `admin/package.json`
- Modify: `docs/admin-amplify-deployment.md`

**Interfaces:**

- Produces `npm --prefix admin run verify:artifact -- development` and
  `npm --prefix admin run verify:artifact -- production`.
- Produces an Amplify build from app root `admin`.

- [ ] **Step 1: Localize fonts and remove external HTML requests**

Copy the six locked brand fonts from `web/public/fonts` to `admin/public/fonts`.
Remove Google Fonts links from `admin/index.html`. Add local `@font-face` rules
to `admin/src/index.css` and use Barlow Condensed/Bebas Neue according to the
brand system.

- [ ] **Step 2: Write failing artifact-verifier tests**

Create temporary fixture directories and assert the verifier rejects:

- `service_role`;
- `VITE_SUPABASE_SERVICE_ROLE_KEY`;
- production project ref in a development artifact;
- development project ref in a production artifact;
- PostHog, Meta Pixel, TikTok, Google Ads, or Awin tracker markers.

Assert a fixture containing only its expected project reference passes.

- [ ] **Step 3: Verify the tests fail**

Run:

```bash
npm --prefix admin test -- scripts/verify-artifact.test.js
```

Expected: FAIL because the script does not exist.

- [ ] **Step 4: Implement the artifact verifier**

The script recursively scans text-like files in `admin/dist`, never prints file
contents, and exits non-zero with the file path and forbidden marker category.
Add:

```json
{
  "verify:artifact": "node scripts/verify-artifact.mjs"
}
```

- [ ] **Step 5: Fix the Amplify build**

Use:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --include=dev
    build:
      commands:
        - npm test
        - npm run build
        - npm run verify:artifact -- "$VITE_ADMIN_ENV"
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Do not echo variables into `.env` and do not add service-role variables.

- [ ] **Step 6: Rewrite the deployment runbook**

Replace the deferred runbook with the approved sequence, exact project refs,
branch/domain mapping, MFA setup, CLI inspection commands, app-specific CSP,
`no-store`/security headers, and rollback instructions. State that the initial
GitHub App connection is performed in the Amplify console.

- [ ] **Step 7: Build and scan both environments locally**

Run:

```bash
VITE_ADMIN_ENV=development VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co VITE_SUPABASE_ANON_KEY=test-anon npm --prefix admin run build
npm --prefix admin run verify:artifact -- development
VITE_ADMIN_ENV=production VITE_SUPABASE_URL=https://gvfptmjluxpngfjendbi.supabase.co VITE_SUPABASE_ANON_KEY=test-anon npm --prefix admin run build
npm --prefix admin run verify:artifact -- production
```

Expected: both builds and scans PASS.

- [ ] **Step 8: Commit**

```bash
git add admin/index.html admin/public/fonts admin/src/index.css admin/amplify.yml admin/scripts admin/package.json docs/admin-amplify-deployment.md
git commit -m "build: harden admin Amplify artifact"
```

---

### Task 10: Run the full local security verification

**Files:**

- Modify only files required to fix failures found by the commands below.

**Interfaces:**

- Consumes all prior task interfaces.
- Produces a clean, deployable source state.

- [ ] **Step 1: Run all admin frontend tests**

```bash
npm --prefix admin test
```

Expected: all tests PASS.

- [ ] **Step 2: Run all shared Deno tests**

```bash
deno test supabase/functions/_shared/*.test.ts
```

Expected: all TypeScript shared tests PASS.

- [ ] **Step 3: Run existing web regressions**

```bash
npm --prefix web run test:unit
npm --prefix web run build
```

Expected: public-site unit tests and build PASS.

- [ ] **Step 4: Run static secret and direct-query scans**

```bash
rg -n "VITE_SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|ADMIN_EMAILS|Access-Control-Allow-Origin['\"]?: ['\"]\\*" admin/src
rg -n "\\.from\\(" admin/src
rg -n "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/admin-* supabase/functions/cancel-order supabase/functions/create-sendcloud-parcel
```

Expected: the first two commands return no match. The third command finds each
server-only service-role client creation; inspect every result and confirm it
appears after `authorizeAdminRequest` succeeds.

- [ ] **Step 5: Build and scan both artifacts again**

Repeat the two Task 9 build/scan commands. Expected: PASS.

- [ ] **Step 6: Inspect the final diff**

```bash
git status --short
git diff --check
git log --oneline --decorate -12
```

Expected: clean diff formatting and only the planned files changed.

- [ ] **Step 7: Commit verification-only fixes if needed**

If verification required changes:

```bash
git add -p
git commit -m "fix: close admin security verification gaps"
```

If no changes were required, do not create an empty commit.

---

### Task 11: Deploy and accept the development admin

**Files:**

- No application-code changes unless development acceptance finds a defect.
- Update: `docs/admin-amplify-deployment.md` only if observed AWS behavior
  differs from the documented runbook.

**Interfaces:**

- Produces development Edge Functions and `https://admin-dev.bysolum.co.uk`.

- [ ] **Step 1: Integrate the reviewed implementation into `dev`**

From the main checkout after all local verification:

```bash
git checkout dev
git pull --ff-only origin dev
git merge --no-ff codex/secure-admin-amplify
git push origin dev
```

Expected: `origin/dev` contains the reviewed implementation and the worktree is
clean.

- [ ] **Step 2: Apply migrations to development**

Confirm the linked ref is development before pushing:

```bash
supabase link --project-ref rodvvmfzkyjsqbufkjbc
supabase db push --dry-run
supabase db push
```

Expected: only the two secure-admin migrations apply.

- [ ] **Step 3: Deploy development functions**

```bash
supabase functions deploy admin-dashboard --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy admin-orders --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy admin-events --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy cancel-order --project-ref rodvvmfzkyjsqbufkjbc
supabase functions deploy create-sendcloud-parcel --project-ref rodvvmfzkyjsqbufkjbc
```

Expected: all five deployments succeed.

- [ ] **Step 4: Assign the protected admin role in development**

Using a local service-role environment variable that is never printed or
committed, update the intended development Auth user through the Supabase Admin
API so `app_metadata` contains:

```json
{"role":"admin"}
```

Sign out existing sessions after the update so the next token contains the
claim.

- [ ] **Step 5: Create the Amplify app through the console**

In `eu-west-2`:

1. Amplify Hosting -> Create new app -> GitHub.
2. Select `hdandi08/solum`.
3. Select branch `dev`.
4. Mark as monorepo and set app root to `admin`.
5. Name the app `solum-admin`.
6. Save without adding any custom domain yet.

Record the returned app ID in the runbook. Never copy the existing
`solum-web` app ID.

- [ ] **Step 6: Configure the development branch**

Set only:

```text
AMPLIFY_MONOREPO_APP_ROOT=admin
VITE_ADMIN_ENV=development
VITE_SUPABASE_URL=https://rodvvmfzkyjsqbufkjbc.supabase.co
VITE_SUPABASE_ANON_KEY
```

Copy the exact `VITE_SUPABASE_ANON_KEY` value from the existing
`solum-web`/`dev` branch environment in Amplify; do not write it into the
runbook. The anon key is public configuration. Confirm no service-role variable
exists. Enable auto-build and branch stage `DEVELOPMENT`.

- [ ] **Step 7: Apply hosting security**

Configure:

- SPA rewrite to `/index.html` for extensionless routes;
- branch access control with a unique generated hosting password;
- CSP allowing only self assets and
  `https://rodvvmfzkyjsqbufkjbc.supabase.co` connections;
- HSTS, `nosniff`, `Referrer-Policy: no-referrer`, restrictive
  `Permissions-Policy`, and `Cache-Control: no-store` for `index.html`.

- [ ] **Step 8: Add the development hostname without moving the storefront**

Create an Amplify domain association for `bysolum.co.uk` containing only:

```json
[
  {"prefix":"admin-dev","branchName":"dev"}
]
```

Do not add or remove the apex/`www` mappings on `solum-web`. Wait using bounded
status checks until `admin-dev` has Amplify-managed TLS. If AWS reports that the
root domain is already associated and rejects the unused prefix, stop without
detaching or modifying `solum-web` and record the exact AWS error for a
subdomain-delegation revision.

- [ ] **Step 9: Complete development acceptance**

Verify manually:

1. Development banner is amber and cannot switch environments.
2. A non-admin receives forbidden.
3. The admin account must enrol/challenge TOTP and reaches `aal2`.
4. Dashboard, Orders, and Events load development data.
5. One preselected reversible development order status change succeeds and
   creates one audit event.
6. The browser bundle contains no service-role key.
7. Network requests contain no PostHog, Meta, TikTok, Google Ads, or Awin call.

- [ ] **Step 10: Record the verified development deployment**

Update the runbook with the app ID, branch URL, custom-domain status, and
verification date. Commit only documentation:

```bash
git add docs/admin-amplify-deployment.md
git commit -m "docs: record development admin deployment"
```

---

### Task 12: Deploy and accept the production admin

**Files:**

- No application-code changes unless production read-only acceptance finds a
  defect.
- Update: `docs/admin-amplify-deployment.md`.

**Interfaces:**

- Produces `https://admin.bysolum.co.uk`.

- [ ] **Step 1: Confirm the deployment gate**

Before production:

- development acceptance is complete;
- local tests/builds/artifact scans still pass;
- `dev` contains the reviewed implementation;
- there are no uncommitted changes;
- no production E2E command is scheduled or running.

- [ ] **Step 2: Merge the accepted implementation into `master`**

```bash
git checkout master
git pull --ff-only origin master
git merge --no-ff dev
git push origin master
```

Expected: `origin/master` contains exactly the development-accepted
implementation.

- [ ] **Step 3: Apply migrations to production**

```bash
supabase link --project-ref gvfptmjluxpngfjendbi
supabase db push --dry-run
supabase db push
```

Expected: only the reviewed secure-admin migrations apply.

- [ ] **Step 4: Deploy production functions**

```bash
supabase functions deploy admin-dashboard --project-ref gvfptmjluxpngfjendbi
supabase functions deploy admin-orders --project-ref gvfptmjluxpngfjendbi
supabase functions deploy admin-events --project-ref gvfptmjluxpngfjendbi
supabase functions deploy cancel-order --project-ref gvfptmjluxpngfjendbi
supabase functions deploy create-sendcloud-parcel --project-ref gvfptmjluxpngfjendbi
```

- [ ] **Step 5: Assign the protected production role**

Set `app_metadata.role = "admin"` on the intended production Auth user through
the Supabase Admin API using a local service-role environment variable. Revoke
old sessions, sign in again, and enrol/challenge production TOTP.

- [ ] **Step 6: Connect and configure the `master` Amplify branch**

Connect `master` with auto-build disabled, then set:

Set:

```text
VITE_ADMIN_ENV=production
VITE_SUPABASE_URL=https://gvfptmjluxpngfjendbi.supabase.co
VITE_SUPABASE_ANON_KEY
```

Copy the exact `VITE_SUPABASE_ANON_KEY` value from the existing `solum-web`
application environment in Amplify; do not write it into the runbook. Enable
stage `PRODUCTION`, the same access-control policy, the production Supabase CSP
origin, and the approved security headers. Keep auto-build disabled until all
values and headers have been re-read and confirmed.

- [ ] **Step 7: Deploy and use bounded status checks**

Enable auto-build and start the `master` Amplify build. Check until it reaches
one terminal status: `SUCCEED`, `FAILED`, or `CANCELLED`. Do not enter a
recurring monitor loop.

- [ ] **Step 8: Add the production hostname**

Update the existing `solum-admin` domain association so it contains exactly:

```json
[
  {"prefix":"admin","branchName":"master"},
  {"prefix":"admin-dev","branchName":"dev"}
]
```

Do not change `solum-web` domain mappings. Use bounded status checks until
`admin.bysolum.co.uk` has Amplify-managed TLS.

- [ ] **Step 9: Complete non-destructive production acceptance**

Verify:

1. Production banner is red and cannot switch environments.
2. Authentication requires the protected role and `aal2`.
3. Dashboard, Orders, and Events perform read-only production loads.
4. The production audit table and order mutation RPC exist using a read-only
   Supabase schema inspection.
5. Browser artifacts contain no service-role credential or development project
   reference.
6. Browser network requests contain no marketing trackers.
7. `bysolum.co.uk` and `www.bysolum.co.uk` still resolve to `solum-web`.

Do not create, refund, ship, cancel, or mutate a production order for
verification.

- [ ] **Step 10: Record production deployment**

Update the runbook with the successful build ID, custom-domain/TLS status,
acceptance date, and rollback target. Commit:

```bash
git add docs/admin-amplify-deployment.md
git commit -m "docs: record production admin deployment"
```
