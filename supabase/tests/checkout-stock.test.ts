import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Execute the real endpoint handlers against a controlled HTTP boundary.
// No Stripe, database, or email requests leave this process.
Deno.env.set('SUPABASE_URL', 'https://stock-test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_fixture');
Deno.env.delete('RESEND_API_KEY');

// Stripe captures fetch when its client is constructed, so install the test
// transport before importing endpoints, not after creating their clients.
let testFetch: typeof fetch = () => Promise.reject(new Error('No test transport installed'));
globalThis.fetch = (...args) => testFetch(...args);

let handler: (req: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof handler) => { handler = fn; }) as typeof Deno.serve;
const handlers = new Map<string, typeof handler>();
for (const name of ['create-first-box-payment-intent', 'create-first-box-session', 'create-payment-intent', 'create-checkout-session']) {
  await import(`../functions/${name}/index.ts`);
  handlers.set(name, handler!);
}
Deno.serve = serve;

for (const [name, endpoint] of handlers) {
  Deno.test(`${name}: positive stock still creates the expected checkout`, async () => {
    const originalFetch = testFetch;
    const paymentRequests: string[] = [];
    testFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.hostname === 'stock-test.supabase.co') {
        if (url.pathname === '/rest/v1/kit_inventory') return Response.json([{ available_count: 1 }]);
        if (url.pathname === '/rest/v1/customers') return Response.json([]);
        if (url.pathname === '/rest/v1/leads') return Response.json({});
      }
      if (url.hostname === 'api.stripe.com') {
        if (url.pathname === '/v1/customers') return Response.json({ data: [{ id: 'cus_fixture' }] });
        if (url.pathname === '/v1/prices') return Response.json({ id: 'price_fixture' });
        if (url.pathname === '/v1/payment_intents') {
          paymentRequests.push(url.pathname);
          const body = new URLSearchParams(await request.text());
          assertEquals(body.get('amount'), '8500');
          assertEquals(body.get('metadata[kit_id]'), 'ritual');
          return Response.json({ id: 'pi_fixture', client_secret: 'pi_fixture_secret_test', livemode: false });
        }
        if (url.pathname === '/v1/checkout/sessions') {
          paymentRequests.push(url.pathname);
          return Response.json({ id: 'cs_fixture', url: 'https://checkout.stripe.com/test-fixture' });
        }
      }
      throw new Error(`Unexpected test request: ${url.hostname}${url.pathname}`);
    }) as typeof fetch;
    try {
      const response = await endpoint(new Request('http://localhost/checkout', {
        method: 'POST', body: JSON.stringify({ kit_id: 'ritual', email: 'harsha@ecompilers.com', first_name: 'Harsha' }),
      }));
      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(paymentRequests.length, 1);
      if (name.endsWith('payment-intent')) assertEquals(body.client_secret, 'pi_fixture_secret_test');
      else assertEquals(body.url, 'https://checkout.stripe.com/test-fixture');
    } finally { testFetch = originalFetch; }
  });
  for (const fixture of [
    { name: 'zero stock', data: [{ available_count: 0 }], status: 200, expected: 409, code: 'sold_out' },
    { name: 'missing inventory row', data: [], status: 200, expected: 503, code: 'inventory_unavailable' },
    { name: 'database failure', data: { message: 'database unavailable' }, status: 503, expected: 503, code: 'inventory_unavailable' },
    { name: 'invalid count', data: [{ available_count: null }], status: 200, expected: 503, code: 'inventory_unavailable' },
  ]) {
    Deno.test(`${name}: ${fixture.name} blocks payment before Stripe`, async () => {
      const originalFetch = testFetch;
      const unexpected: string[] = [];
      testFetch = ((input: RequestInfo | URL) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        if (url.hostname === 'stock-test.supabase.co' && url.pathname === '/rest/v1/kit_inventory') {
          assertEquals(url.searchParams.get('kit_id'), 'eq.ritual');
          return Promise.resolve(Response.json(fixture.data, { status: fixture.status }));
        }
        unexpected.push(url.hostname + url.pathname);
        return Promise.resolve(Response.json({ error: { message: 'Unexpected external request' } }, { status: 400 }));
      }) as typeof fetch;
      try {
        const response = await endpoint(new Request('http://localhost/checkout', {
          method: 'POST', body: JSON.stringify({ kit_id: 'ritual', email: 'harsha@ecompilers.com' }),
        }));
        assertEquals(response.status, fixture.expected);
        assertEquals((await response.json()).error, fixture.code);
        assertEquals(unexpected, []);
      } finally { testFetch = originalFetch; }
    });
  }
}
