import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import nodeTokenVector from '../../../infra/awin-tracking/test-vectors/node-aes-gcm.json' with { type: 'json' };
import { buildAwinS2sUrl, normalizeOrderSource, resolveAwinCheckoutAttribution } from './awin.ts';

const SECRET = 'development-secret-development-secret';
const NOW = Date.parse('2026-08-11T12:00:00.000Z');

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function encryptFixture(
  payload: Record<string, unknown>,
  secret = SECRET,
): Promise<string> {
  const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const ciphertextAndTag = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  ));
  const packed = new Uint8Array(iv.length + ciphertextAndTag.length);
  packed.set(iv);
  packed.set(ciphertextAndTag, iv.length);
  return base64Url(packed);
}

Deno.test('normalizes Awin source away from the order-flow source', () => {
  assertEquals(normalizeOrderSource('aw'), 'first_batch');
  assertEquals(normalizeOrderSource('gift'), 'gift');
  assertEquals(normalizeOrderSource('tiktok'), 'tiktok_shop');
});

Deno.test('builds an Awin-last S2S URL', () => {
  const url = new URL(buildAwinS2sUrl({
    live: true, amountPence: 8500, orderRef: 'pi_123', awc: '129171_click', channel: 'aw',
  })!);
  assertEquals(url.searchParams.get('ch'), 'aw');
  assertEquals(url.searchParams.get('cks'), '129171_click');
  assertEquals(url.searchParams.get('parts'), 'DEFAULT:85.00');
});

Deno.test('uses display when Meta was the last paid click', () => {
  const url = new URL(buildAwinS2sUrl({
    live: true, amountPence: 6500, orderRef: 'pi_456', awc: '129171_click', channel: 'display',
  })!);
  assertEquals(url.searchParams.get('ch'), 'display');
});

Deno.test('fails closed for missing channel, missing checksum, or test payment', () => {
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', awc: 'x' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: false, amountPence: 6500, orderRef: 'pi_1', awc: 'x', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: 'pi_1', awc: 'x', channel: 'meta' }), undefined);
});

Deno.test('fails closed for a non-positive amount or empty order reference', () => {
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 0, orderRef: 'pi_1', awc: 'x', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: -1, orderRef: 'pi_1', awc: 'x', channel: 'aw' }), undefined);
  assertEquals(buildAwinS2sUrl({ live: true, amountPence: 6500, orderRef: '', awc: 'x', channel: 'aw' }), undefined);
});

Deno.test('builds the required S2S merchant fields', () => {
  const url = new URL(buildAwinS2sUrl({
    live: true, amountPence: 1, orderRef: 'pi_789', awc: 'checksum', channel: 'email',
  })!);
  assertEquals(url.origin + url.pathname, 'https://www.awin1.com/sread.php');
  assertEquals(url.searchParams.get('tt'), 'ss');
  assertEquals(url.searchParams.get('tv'), '2');
  assertEquals(url.searchParams.get('merchant'), '129171');
  assertEquals(url.searchParams.get('amount'), '0.01');
  assertEquals(url.searchParams.get('parts'), 'DEFAULT:0.01');
  assertEquals(url.searchParams.get('cr'), 'GBP');
  assertEquals(url.searchParams.get('ref'), 'pi_789');
  assertEquals(url.searchParams.get('ch'), 'email');
  assertEquals(url.searchParams.get('cks'), 'checksum');
});

Deno.test('prefers a valid direct checksum over the opaque fallback token', async () => {
  assertEquals(await resolveAwinCheckoutAttribution({
    awc: ' 129171_direct ',
    token: 'not-a-token',
    channel: 'display',
    secret: SECRET,
    now: () => NOW,
  }), { awc: '129171_direct', channel: 'display' });
});

Deno.test('decrypts a valid five-minute fallback token', async () => {
  const token = await encryptFixture({
    v: 1,
    awc: '129171_cookie',
    exp: Math.floor(NOW / 1000) + 300,
  });

  assertEquals(await resolveAwinCheckoutAttribution({
    token,
    channel: 'aw',
    secret: SECRET,
    now: () => NOW,
  }), { awc: '129171_cookie', channel: 'aw' });
});

Deno.test('decrypts the locked token emitted by the Node implementation', async () => {
  assertEquals(await resolveAwinCheckoutAttribution({
    token: nodeTokenVector.token,
    channel: nodeTokenVector.channel,
    secret: nodeTokenVector.secret,
    now: () => Date.parse(nodeTokenVector.now),
  }), { awc: nodeTokenVector.awc, channel: 'email' });
  assertEquals(await resolveAwinCheckoutAttribution({
    token: nodeTokenVector.token,
    channel: nodeTokenVector.channel,
    secret: nodeTokenVector.secret,
    now: () => Date.parse(nodeTokenVector.expires_at),
  }), {});
});

Deno.test('fails closed for expired, overlong, malformed, or tampered tokens', async () => {
  const expired = await encryptFixture({ v: 1, awc: 'expired', exp: Math.floor(NOW / 1000) });
  const overlong = await encryptFixture({ v: 1, awc: 'future', exp: Math.floor(NOW / 1000) + 301 });
  const valid = await encryptFixture({ v: 1, awc: 'valid', exp: Math.floor(NOW / 1000) + 300 });
  const tampered = `${valid.slice(0, -1)}${valid.endsWith('A') ? 'B' : 'A'}`;

  for (const token of [expired, overlong, 'not-a-token', tampered]) {
    assertEquals(await resolveAwinCheckoutAttribution({
      token,
      channel: 'aw',
      secret: SECRET,
      now: () => NOW,
    }), {});
  }
});

Deno.test('fails closed for an invalid direct checksum when no valid fallback exists', async () => {
  assertEquals(await resolveAwinCheckoutAttribution({
    awc: 'unsafe value',
    channel: 'aw',
    secret: SECRET,
    now: () => NOW,
  }), {});
});
