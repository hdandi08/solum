import { afterEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ __loaded: true, init: vi.fn(), capture: vi.fn(), register: vi.fn(), startSessionRecording: vi.fn() }));
vi.mock('posthog-js', () => ({ default: sdk }));

function setup() {
  const store = new Map();
  vi.stubGlobal('sessionStorage', { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) });
  vi.stubGlobal('window', { location: { hostname: 'localhost', pathname: '/gift', search: '', href: 'http://localhost/gift' }, addEventListener: vi.fn() });
  vi.stubGlobal('document', { cookie: '' });
  vi.stubEnv('VITE_POSTHOG_KEY', 'test-key');
  vi.useFakeTimers();
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

describe('PostHog gifting integration', () => {
  it('enriches the existing checkout events without overwriting their source or kit', async () => {
    setup();
    const { capture } = await import('./analytics.js');
    capture('gift_page_viewed');
    window.location.pathname = '/buy';
    capture('checkout_initiated', { source: 'gift', kit: 'ritual', method: 'standard' });
    expect(sdk.capture).toHaveBeenLastCalledWith('checkout_initiated', {
      source: 'gift', kit: 'ritual', method: 'standard', landing_experience: 'christmas_gifting', gift_occasion: 'christmas',
    });
  });
  it('tags automatic pageviews while preserving PostHog reserved properties', async () => {
    setup();
    const { initAnalytics } = await import('./analytics.js');
    initAnalytics();
    const hook = sdk.init.mock.calls[0][1].before_send;
    expect(hook(null)).toBeNull();
    expect(hook({ event: '$pageview', properties: { token: 'reserved', $current_url: 'http://localhost/gift' } })).toEqual({
      event: '$pageview', properties: { token: 'reserved', $current_url: 'http://localhost/gift', landing_experience: 'christmas_gifting', gift_occasion: 'christmas' },
    });
  });
});
