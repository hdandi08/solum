import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./analytics.js', () => ({ capture: vi.fn() }));
import { capture } from './analytics.js';
import { captureStockEvent } from './stockAnalytics.js';
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
it.each([
  ['www.bysolum.com', 'production'],
  ['bysolum.co.uk', 'production'],
  ['dev.d3pa095gzazg3c.amplifyapp.com', 'dev'],
  ['localhost', 'local'],
  ['preview.example.com', 'other'],
])('labels %s as %s', (hostname, environment) => {
  vi.stubGlobal('window', { location: { hostname } });
  captureStockEvent('soldout_detected', { kit: 'ground', checkout_flow: 'one_time' });
  expect(capture).toHaveBeenCalledWith('soldout_detected', expect.objectContaining({ environment, kit: 'ground' }));
});
it('drops contact details and free-text errors from stock events', () => {
  captureStockEvent('soldout_waitlist_failed', {
    kit: 'ritual', email: 'private@example.com', first_name: 'Private', phone: '123',
    message: 'private@example.com is invalid', source: 'private@example.com',
    reason: 'request_failed', details_shared: true,
  });
  const payload = capture.mock.calls[0][1];
  expect(payload).toMatchObject({ kit: 'ritual', reason: 'request_failed', details_shared: true });
  expect(JSON.stringify(payload)).not.toContain('private');
  expect(payload).not.toHaveProperty('phone');
});
it('analytics failures never break checkout', () => {
  capture.mockImplementationOnce(() => { throw new Error('analytics unavailable'); });
  expect(() => captureStockEvent('soldout_detected', { kit: 'ground' })).not.toThrow();
});
