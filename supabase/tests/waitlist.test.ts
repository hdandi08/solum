import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.env.set('SUPABASE_URL', 'https://rodvvmfzkyjsqbufkjbc.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
Deno.env.set('RESEND_API_KEY', 'test-email-key');
let handler: (req: Request) => Promise<Response>;
const serve = Deno.serve;
Deno.serve = ((fn: typeof handler) => { handler = fn; }) as typeof Deno.serve;
await import('../functions/join-waitlist/index.ts');
Deno.serve = serve;

for (const scenario of ['saved', 'existing', 'failed']) {
  Deno.test(`waitlist ${scenario}: truthful response and dev email isolation`, async () => {
    const originalFetch = globalThis.fetch;
    const originalDns = Deno.resolveDns;
    Deno.resolveDns = (() => Promise.resolve([{ preference: 1, exchange: 'mail.example.com' }])) as typeof Deno.resolveDns;
    const emails: Record<string, unknown>[] = [];
    let inserts = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      if (url.hostname === 'api.resend.com') {
        emails.push(await request.json());
        return Response.json({ id: 'email-test' });
      }
      assertEquals(url.hostname, 'rodvvmfzkyjsqbufkjbc.supabase.co');
      assertEquals(url.pathname, '/rest/v1/leads');
      if (request.method === 'GET') return Response.json(scenario === 'existing' ? [{ id: 'lead-test' }] : []);
      inserts++;
      return scenario === 'failed'
        ? Response.json({ message: 'insert failed' }, { status: 400 })
        : Response.json({ confirm_token: 'test-token' }, { status: 201 });
    }) as typeof fetch;
    try {
      const response = await handler(new Request('http://localhost/waitlist', {
        method: 'POST', body: JSON.stringify({ email: 'harsha@ecompilers.com', first_name: 'Harsha', source: 'buy-soldout-ritual' }),
      }));
      const body = await response.json();
      if (scenario === 'saved') {
        assertEquals(response.status, 200);
        assertEquals(body.success, true);
        assertEquals(inserts, 1);
        assertEquals(emails.length, 1);
        assertStringIncludes(String(emails[0].subject), '[DEV]');
      } else if (scenario === 'existing') {
        assertEquals(response.status, 409);
        assertEquals(body.code, 'already_on_waitlist');
        assertEquals(inserts, 0);
        assertEquals(emails.length, 0);
      } else {
        assertEquals(response.status, 500);
        assertEquals(body.success, undefined);
        assertEquals(emails.length, 0);
      }
    } finally { globalThis.fetch = originalFetch; Deno.resolveDns = originalDns; }
  });
}
