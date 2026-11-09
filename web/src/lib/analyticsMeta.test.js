import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('posthog-js', () => ({ default: {} }));
const values = new Map();
function environment(search = '') {
  values.clear();
  vi.stubGlobal('window', { location: { hostname: 'bysolum.co.uk', href: `https://bysolum.co.uk/${search}`, search } });
  vi.stubGlobal('document', { cookie: '' });
  vi.stubGlobal('sessionStorage', { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_POSTHOG_KEY', '');
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });
describe('Meta attribution continuity', () => {
  it('retains the landing click for checkout when the pixel is blocked', async () => {
    environment('?fbclid=ad-click'); const analytics = await import('./analytics.js'); analytics.initAnalytics();
    const landing = analytics.getMetaIds(); window.location.search = '?kit=ritual';
    expect(landing.fbc).toMatch(/^fb\.1\.\d+\.ad-click$/); expect(analytics.getMetaIds().fbc).toBe(landing.fbc);
  });
  it('sends the retained identifier in the CAPI checkout payload', async () => {
    environment('?fbclid=ad-click'); const sent = [];
    vi.stubGlobal('fetch', async (_url, options) => { sent.push(JSON.parse(options.body)); });
    const analytics = await import('./analytics.js'); analytics.initAnalytics(); window.location.search = '?kit=ritual'; analytics.fbInitiateCheckout('ritual', 85);
    expect(sent[0]).toMatchObject({ event_name: 'InitiateCheckout', kit_id: 'ritual', value: 85 }); expect(sent[0].fbc).toMatch(/^fb\.1\.\d+\.ad-click$/);
  });
  it('uses a fresh ad click ahead of an old pixel cookie', async () => {
    environment('?fbclid=new-click'); document.cookie = '_fbc=fb.1.100.old-click';
    const { getMetaIds } = await import('./analytics.js'); expect(getMetaIds().fbc).toMatch(/\.new-click$/);
  });
  it('retains breakout attribution ahead of target-browser cookies', async () => {
    environment('?fbc=fb.1.200.breakout&fbp=fb.1.200.browser'); document.cookie = '_fbc=fb.1.100.old-click; _fbp=fb.1.100.old-browser';
    const { getMetaIds } = await import('./analytics.js'); getMetaIds(); window.location.search = '?kit=ritual';
    expect(getMetaIds()).toEqual({ fbc: 'fb.1.200.breakout', fbp: 'fb.1.200.browser' });
  });
  it('retains attribution in memory when browser storage is blocked', async () => {
    environment('?fbclid=ad-click'); vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    const { getMetaIds } = await import('./analytics.js'); getMetaIds(); window.location.search = '?kit=ritual'; expect(getMetaIds().fbc).toMatch(/\.ad-click$/);
  });
});
