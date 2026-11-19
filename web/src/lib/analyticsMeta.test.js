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

 it('includes the viewed kit price and GBP with a shared Pixel/CAPI event ID', async () => {
    environment(); const sent = []; const pixel = [];
    window.fbq = (...args) => pixel.push(args);
    vi.stubGlobal('fetch', async (_url, options) => { sent.push(JSON.parse(options.body)); });
    const { fbViewContent } = await import('./analytics.js');
    fbViewContent('ritual', 85);
    expect(pixel[0][2]).toMatchObject({ content_ids: ['ritual'], value: 85, currency: 'GBP' });
    expect(sent[0]).toMatchObject({ event_name: 'ViewContent', value: 85 });
    expect(pixel[0][3].eventID).toBe(sent[0].event_id);
  });

it('reports all real kit IDs and quantities in one mixed checkout and purchase event', async () => {
  environment(); const pixel = []; const tiktok = [];
  window.fbq = (...args) => pixel.push(args); window.ttq = { track: (...args) => tiktok.push(args) };
  vi.stubGlobal('fetch', async () => ({}));
  const analytics = await import('./analytics.js');
  const items = [{ kit_id: 'ground', quantity: 1, unit_amount_pence: 6500, line_amount_pence: 6500 }, { kit_id: 'ritual', quantity: 2, unit_amount_pence: 8500, line_amount_pence: 17000 }];
  analytics.fbInitiateCheckout(null, 235, {}, items); analytics.fbPurchase(null,235,'pi_mixed',items);
  analytics.ttqCompletePayment(null,'3 kits',235,'pi_mixed',items);
  expect(pixel[0][2]).toMatchObject({ content_ids: ['ground','ritual'], num_items: 3, contents: [{ id:'ground',quantity:1,item_price:65 },{ id:'ritual',quantity:2,item_price:85 }] });
  expect(pixel[1][2]).toMatchObject({ value:235,num_items:3,content_ids:['ground','ritual'] });
  expect(tiktok[0][1]).toMatchObject({ contents:[{content_id:'ground',content_name:'GROUND',quantity:1,price:65},{content_id:'ritual',content_name:'RITUAL',quantity:2,price:85}] });
});
