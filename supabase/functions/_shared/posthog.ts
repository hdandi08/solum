export function buildPosthogPurchase(opts: {
  apiKey: string; email?: string | null; piId: string;
  kitId?: string | null; amountPence: number; source?: string | null;
}) {
  return {
    api_key: opts.apiKey,
    event: 'purchase',
    distinct_id: (opts.email ?? opts.piId).trim().toLowerCase(),
    properties: {
      kit: opts.kitId ?? 'unknown',
      source: opts.source ?? 'server',
      revenue_pence: opts.amountPence,
      ref: opts.piId,
      $insert_id: opts.piId,
      $host: 'bysolum.co.uk',
      server_side: true,
    },
  };
}

export async function sendPosthogPurchase(opts: {
  email?: string | null; piId: string; kitId?: string | null;
  amountPence: number; source?: string | null;
}) {
  const apiKey = Deno.env.get('POSTHOG_PROJECT_KEY');
  if (!apiKey) { console.warn('POSTHOG_PROJECT_KEY not set — skipping PostHog event'); return; }
  try {
    const res = await fetch('https://eu.i.posthog.com/capture/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPosthogPurchase({ apiKey, ...opts })),
    });
    if (!res.ok) console.error('posthog_capture_error', res.status, await res.text());
    else console.log('posthog_capture_ok', opts.piId);
  } catch (err) {
    console.error('posthog_capture_throw', (err as Error).message);
  }
}
