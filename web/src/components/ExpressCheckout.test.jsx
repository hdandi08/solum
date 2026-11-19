import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExpressCheckout from './ExpressCheckout.jsx';

vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }));

const rendered = vi.hoisted(() => ({ props: null }));
const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn() }));
vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => stripe,
  useElements: () => ({ submit: async () => ({}) }),
  ExpressCheckoutElement: (props) => { rendered.props = props; return null; },
}));
vi.mock('../lib/analytics.js', () => ({
  capture: () => {}, fbInitiateCheckout: () => {}, identify: () => {},
  ttqAddPaymentInfo: () => {}, ttqIdentify: () => {}, ttqInitiateCheckout: () => {},
  getMetaIds: () => ({}), getTikTokIds: () => ({}),
}));
vi.mock('../lib/awinAttribution.js', () => ({
  captureAwinAttribution: () => ({}), resolveAwinPaymentIntentMetadata: async () => ({}),
}));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('wallet stock rejection', () => {
  it('closes a sold-out wallet and passes buyer details to the waitlist without confirming payment', async () => {
    vi.stubGlobal('React', React);
    vi.stubGlobal('window', { location: { hostname: 'localhost' } });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'sold_out', message: 'This kit is currently sold out.' }, { status: 409 })));
    const onSoldOut = vi.fn();
    const paymentFailed = vi.fn();
    renderToStaticMarkup(<ExpressCheckout {...{
      kitId: 'ritual', kitName: 'RITUAL', price: 85, source: 'first_batch',
      supabaseUrl: 'https://example.com', authHeaders: {}, onError: vi.fn(),
      onSoldOut, onAvailability: vi.fn(),
    }} />);
    await rendered.props.onConfirm({
      expressPaymentType: 'apple_pay', paymentFailed,
      billingDetails: { email: 'harsha@ecompilers.com', name: 'Harsha Dandi' },
      shippingAddress: { name: 'Harsha Dandi', address: { line1: '10 Test Street', city: 'London', postal_code: 'SW1A 1AA' } },
    });
    expect(paymentFailed).toHaveBeenCalledOnce();
    expect(onSoldOut).toHaveBeenCalledWith(expect.objectContaining({ email: 'harsha@ecompilers.com', first_name: 'Harsha', kit_id: 'ritual' }));
    expect(stripe.confirmPayment).not.toHaveBeenCalled();
  });
});


describe('wallet loading', () => {
  it('updates availability when Stripe exposes a wallet after ready and recovers from load errors', () => {
    vi.stubGlobal('React', React);
    const onAvailability = vi.fn();
    const onLoadError = vi.fn();
    renderToStaticMarkup(<ExpressCheckout kitId="ritual" onAvailability={onAvailability} onLoadError={onLoadError} />);
    rendered.props.onReady({ availablePaymentMethods: { applePay: false, link: false } });
    rendered.props.onAvailablePaymentMethodsChange({ paymentMethods: { applePay: { available: true } } });
    expect(onAvailability.mock.calls).toEqual([[false], [true]]);
    rendered.props.onLoadError({ error: { code: 'network_error' } });
    expect(onAvailability).toHaveBeenLastCalledWith(false);
    expect(onLoadError).toHaveBeenCalledOnce();
  });
});

describe('multi-kit wallet snapshot', () => {
  it('sends the quantities, retains the held attempt and persists the verified full receipt', async () => {
    vi.stubGlobal('React', React);
    const values = new Map(); vi.stubGlobal('sessionStorage', { getItem: key => values.get(key), setItem: (key,value) => values.set(key,value), removeItem:key=>values.delete(key) });
    vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost' } });
    const items = [{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}];
    const order_items=items.map(item=>({...item,unit_amount_pence:item.kit_id==='ground'?6500:8500,line_amount_pence:item.quantity*(item.kit_id==='ground'?6500:8500)}));
    const data = {checkout_flow:'multi_kit_v1',client_secret:'pi_mixed_secret_test',order_items,total_quantity:3,amount_pence:23500,reservation_expires_at:new Date(Date.now()+600000).toISOString()};
    const requests=[];vi.stubGlobal('fetch',async(_url,options)=>{requests.push(JSON.parse(options.body));return Response.json(data);});
    stripe.confirmPayment.mockResolvedValue({paymentIntent:{id:'pi_mixed',status:'succeeded',amount:23500,currency:'gbp',livemode:false}});
    const attemptRef={current:null};const onBusyChange=vi.fn();
    renderToStaticMarkup(<ExpressCheckout kitId="ritual" kitName="3 kits" price={235} items={items} source="first_batch" supabaseUrl="https://example.com" authHeaders={{}} onError={vi.fn()} onAvailability={vi.fn()} attemptRef={attemptRef} onBusyChange={onBusyChange}/>);
    await rendered.props.onConfirm({expressPaymentType:'apple_pay',billingDetails:{email:'buyer@example.test'},shippingAddress:{name:'Test Buyer',address:{line1:'1 Test Street',city:'London',postal_code:'SW1A 1AA'}}});
    expect(requests[0].items).toEqual(items);
    const receipt=JSON.parse(values.get('solum_payment_result_pi_mixed')); expect(receipt.items).toEqual(order_items);
    expect(onBusyChange.mock.calls).toEqual([[true],[false]]);
    expect(attemptRef.current).toBeNull();
  });
});

it('persists a declined wallet attempt for refresh and reuses the unchanged payment on retry', async () => {
  vi.stubGlobal('React', React); const values=new Map();
  vi.stubGlobal('sessionStorage',{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
  vi.stubGlobal('window',{location:{hostname:'localhost',origin:'http://localhost'}});
  const data={client_secret:'pi_retry_secret_test',amount_pence:8500,reservation_expires_at:new Date(Date.now()+600000).toISOString()};
  const fetch=vi.fn(async()=>Response.json(data));vi.stubGlobal('fetch',fetch);
  stripe.confirmPayment.mockResolvedValue({error:{message:'Try a different card.'}});
  const attemptRef={current:null};const props={kitId:'ritual',kitName:'RITUAL',price:85,source:'first_batch',supabaseUrl:'https://example.com',authHeaders:{},onError:vi.fn(),onAvailability:vi.fn(),attemptRef};
  const event={billingDetails:{email:'buyer@example.test'},shippingAddress:{name:'Test Buyer',address:{line1:'1 Test Street',city:'London',postal_code:'SW1A 1AA'}}};
  renderToStaticMarkup(<ExpressCheckout {...props}/>); await rendered.props.onConfirm(event);
  const saved=JSON.parse(values.get('solum_payment_retry'));expect(saved).toMatchObject({flow:'express',kit:'ritual',items:[{kit_id:'ritual',quantity:1}],payInfo:{client_secret:'pi_retry_secret_test'}});
  renderToStaticMarkup(<ExpressCheckout {...props}/>); await rendered.props.onConfirm(event);
  expect(fetch).toHaveBeenCalledOnce(); expect(stripe.confirmPayment).toHaveBeenCalledTimes(2);
});

it('unlocks the original card recovery after rejecting an alternate wallet without making a payment request',async()=>{
 vi.stubGlobal('React',React);const onBusyChange=vi.fn();const onError=vi.fn();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 renderToStaticMarkup(<ExpressCheckout kitId="ritual" pendingRecoveryFlow="buy" onBusyChange={onBusyChange} onError={onError} onAvailability={vi.fn()}/>);
 rendered.props.onClick({expressPaymentType:'apple_pay',resolve:()=>{}});
 await rendered.props.onConfirm({paymentFailed:vi.fn()});
 expect(onBusyChange.mock.calls).toEqual([[true],[false]]);
 expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('original details and card checkout'));
 expect(fetch).not.toHaveBeenCalled();expect(stripe.confirmPayment).not.toHaveBeenCalled();
});
