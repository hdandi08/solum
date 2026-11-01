import { afterEach, expect, it, vi } from 'vitest';
import { readCheckoutInventory, saveStockWaitlist } from './checkoutStock.js';

afterEach(() => vi.unstubAllGlobals());
const save = () => saveStockWaitlist('https://example.com', {}, { email: 'harsha@ecompilers.com' }, 'ritual');

it.each([
  [500, { error: 'Unable to save' }],
  [409, { error: 'Unrelated conflict' }],
  [200, {}],
])('does not claim a saved signup for status %s and body %j', async (status, body) => {
  vi.stubGlobal('fetch', async () => Response.json(body, { status }));
  await expect(save()).rejects.toThrow();
});

it('recognizes a confirmed existing waitlist signup on retry', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ code: 'already_on_waitlist' }, { status: 409 }));
  await expect(save()).resolves.toBeUndefined();
});

it('requires an explicit successful save', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ success: true }));
  await expect(save()).resolves.toBeUndefined();
});

it('authenticates waitlist saves from callers that supply only the anon API key', async () => {
  vi.stubGlobal('fetch', async (_url, options) => {
    return options.headers.Authorization === 'Bearer anon-test-key'
      ? Response.json({ success: true })
      : Response.json({ error: 'Missing authorization header' }, { status: 401 });
  });
  await expect(saveStockWaitlist('https://example.com', { apikey: 'anon-test-key' }, { email: 'harsha@ecompilers.com' }, 'ritual')).resolves.toBeUndefined();
});

it('rejects unsuccessful inventory responses even if they contain kits', async () => {
  vi.stubGlobal('fetch', async () => Response.json({ kits: {} }, { status: 503 }));
  await expect(readCheckoutInventory('https://example.com', {})).rejects.toThrow();
});
