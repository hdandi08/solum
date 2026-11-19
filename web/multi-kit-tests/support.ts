import { Page } from '@playwright/test';
export async function setup(page: Page, counts = { ritual: 5, ground: 5 }) {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      if (url.pathname === '/src/lib/stripe.js') return route.fulfill({ contentType: 'application/javascript', body: 'export const stripePromise=Promise.resolve(null);' });
      if (url.pathname.includes('@stripe_stripe-js.js')) return route.fulfill({contentType:'application/javascript',body:`export const loadStripe=async()=>({retrievePaymentIntent:async()=>({paymentIntent:{id:'pi_mock123',status:'succeeded',currency:'gbp',amount:Number(sessionStorage.getItem('mockStripeAmount')),livemode:false}})});`});
      if (url.pathname.includes('@stripe_react-stripe-js.js')) return route.fulfill({ contentType: 'application/javascript', body: `import React from '/node_modules/.vite/deps/react.js';
export const Elements=({children})=>children;
export const PaymentElement=()=>null;
export const useElements=()=>({submit:async()=>({})});
export const useStripe=()=>({confirmPayment:async()=>{if(window.__declinePayment) return {error:{message:'Try another card.'}};if(window.__confirmBlocked) await new Promise(resolve=>window.__finishConfirm=resolve); return {paymentIntent:{id:'pi_mock123',status:'succeeded',amount:window.__paymentAmount,currency:'gbp',livemode:false}};}});
export const ExpressCheckoutElement=(props)=>{React.useEffect(()=>props.onReady({availablePaymentMethods:{applePay:true}}),[]);return React.createElement('button',{type:'button','data-testid':'mock-wallet',onClick:()=>{props.onClick({expressPaymentType:'apple_pay',resolve:()=>{}}); props.onConfirm({expressPaymentType:'apple_pay',paymentFailed:()=>{},billingDetails:{email:'buyer@example.test',name:'Test Buyer'},shippingAddress:{name:'Test Buyer',address:{line1:'10 Test Street',city:'London',postal_code:'SW1A 1AA'}}});}},'Mock wallet');};` });
      return route.continue();
    }
    if (url.hostname === 'cloudflare-dns.com') return route.fulfill({ json: { Status: 0, Answer: [{ type: 15, data: 'mail.example.test' }] } });
    const endpoint = url.pathname.split('/').pop();
    if (endpoint === 'get-inventory-status') return route.fulfill({ json: { kits: Object.fromEntries(Object.entries(counts).map(([id,count])=>[id,{available:count>0,count}])) } });
    if (endpoint === 'create-first-box-payment-intent') {
      const body = route.request().postDataJSON(); requests.push(body);
      const items = body.items ?? [{ kit_id: body.kit_id, quantity: 1 }];
      const order_items = items.map(item => ({ ...item, unit_amount_pence: item.kit_id === 'ritual' ? 8500 : 6500, line_amount_pence: item.quantity * (item.kit_id === 'ritual' ? 8500 : 6500) }));
      const amount_pence = order_items.reduce((sum,item)=>sum+item.line_amount_pence,0);
      await page.evaluate(amount=>{window.__paymentAmount=amount;sessionStorage.setItem('mockStripeAmount',String(amount));},amount_pence);
      return route.fulfill({ json: { client_secret: 'pi_mock123_secret_mock', amount_pence, reservation_expires_at: new Date(Date.now()+600000).toISOString(), reservation_server_now: new Date().toISOString(), dispatch_date:'Fri 20 Nov', ...(body.items ? {checkout_flow:'multi_kit_v1',order_items,total_quantity:items.reduce((sum,item)=>sum+item.quantity,0)} : {}) } });
    }
    if (endpoint === 'release-checkout-reservation') { requests.push({ release: true }); return route.fulfill({json:{released:true}}); }
    // Block all other external network traffic, including analytics and Stripe.
    return route.fulfill({json:{}});
  });
  return requests;
}
