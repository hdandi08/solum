import { afterEach, expect, it, vi } from 'vitest';
import { captureCampaignAttribution } from './campaignAttribution.js';
import { buildExpressPaymentIntentBody } from './expressCheckout.js';
import { campaignMetadata } from '../../../supabase/functions/_shared/campaignAttribution.mjs';
import { buildFirstBoxPaymentIntentBody } from './firstBoxPaymentIntent.js';
afterEach(() => vi.unstubAllGlobals());
it('retains campaign parameters after the URL changes and passes them to card and wallet payment metadata', async () => {
 const data = new Map();
 vi.stubGlobal('sessionStorage', {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)});
 vi.stubGlobal('window', {location: {search: '?kit=ritual&utm_source=meta&utm_content=test&fbclid=click&custom=keep'}});
 expect(captureCampaignAttribution()).toEqual({utm_source:'meta',utm_content:'test',fbclid:'click'});
 window.location.search = '?kit=ground';
 const form = Object.fromEntries(['email','first_name','last_name','phone','line1','line2','city','county','postcode'].map(key => [key,'test']));
 const body = await buildFirstBoxPaymentIntentBody({kitId:'ground',form}, async () => null);
 expect(body.campaign_attribution).toEqual({utm_source:'meta',utm_content:'test',fbclid:'click'});
 const wallet = await buildExpressPaymentIntentBody({event:{billingDetails:{email:'buyer@example.com',name:'Test Buyer'},shippingAddress:{address:{}}},kitId:'ritual'}, async () => null);
 expect(wallet.body.campaign_attribution).toEqual({utm_source:'meta',utm_content:'test',fbclid:'click'});
 expect(campaignMetadata(wallet.body.campaign_attribution)).toEqual({utm_source:'meta',utm_content:'test',fbclid:'click'});
});
it('ignores invalid storage and bounds the values sent to Stripe', () => {
 vi.stubGlobal('sessionStorage', {getItem: () => '{broken',setItem: () => {throw new Error('blocked')}});
 vi.stubGlobal('window', {location: {search: '?utm_source='+ 'a'.repeat(501)+'&email=private'}});
 expect(captureCampaignAttribution()).toEqual({});
});

it('rejects arrays, arbitrary fields and oversized metadata at the server boundary', () => {
 expect(campaignMetadata(['private'])).toEqual({});
 expect(campaignMetadata({email:'private',kit_id:'override',utm_source:'meta',fbclid:'x'.repeat(501)})).toEqual({utm_source:'meta'});
});
