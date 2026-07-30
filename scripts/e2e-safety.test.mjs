import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeE2ETarget } from './e2e-safety.mjs';

const dev = {
  target: 'dev',
  baseURL: 'https://dev.d3pa095gzazg3c.amplifyapp.com',
  supabaseURL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  localServer: false,
};

test('accepts the exact remote development target', () => {
  assert.deepEqual(assertSafeE2ETarget(dev), {
    baseURL: 'https://dev.d3pa095gzazg3c.amplifyapp.com',
    supabaseURL: 'https://rodvvmfzkyjsqbufkjbc.supabase.co',
  });
});

test('accepts localhost only with a Stripe test key', () => {
  assert.equal(assertSafeE2ETarget({
    ...dev,
    baseURL: 'http://localhost:5173',
    localServer: true,
    stripePublishableKey: 'pk_test_example',
  }).baseURL, 'http://localhost:5173');
});

const unsafeCases = [
  ['missing target', { ...dev, target: undefined }],
  ['production website', { ...dev, baseURL: 'https://bysolum.co.uk' }],
  ['unknown Amplify website', { ...dev, baseURL: 'https://main.d3pa095gzazg3c.amplifyapp.com' }],
  ['production Supabase', { ...dev, supabaseURL: 'https://gvfptmjluxpngfjendbi.supabase.co' }],
  ['live Stripe key', {
    ...dev,
    baseURL: 'http://localhost:5173',
    localServer: true,
    stripePublishableKey: 'pk_live_example',
  }],
];

for (const [name, input] of unsafeCases) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => assertSafeE2ETarget(input),
      /E2E .* blocked|E2E .* required/,
    );
  });
}
