import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildAwinS2sUrl, normalizeOrderSource } from './awin.ts';

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
