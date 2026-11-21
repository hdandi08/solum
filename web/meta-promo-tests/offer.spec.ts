import {test,expect,Page} from '@playwright/test';
import {setup} from '../multi-kit-tests/support';
const entry='/buy?kit=ritual&utm_source=meta&utm_medium=paid_social&offer_entry=signed-test';
async function offerSetup(page:Page,{blocked=false,resolveFail=false}={}){
 const requests=await setup(page);
 let admitted=false;let claimed:any;
 await page.route('**/awin/resolve',route=>resolveFail?route.fulfill({status:503,json:{}}):route.fulfill({json:{token:blocked?'affiliate-token':null}}));
 await page.route('**/functions/v1/meta-promo',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  const ends_at='2026-12-01T00:00:00Z';
  if(body.action==='claim') {claimed={code:'PERSONAL',email:body.email.toLowerCase(),discount_percent:10};return route.fulfill({json:{...claimed,ends_at,email_delivery:'preview'}});}
  const url=new URL(body.landing_url);if(url.hostname==='127.0.0.1')admitted=true;
  return route.fulfill({json:{visitor_token:'opaque',eligible:admitted&&!blocked&&body.attribution_checked,blocked,ends_at,discount_percent:10,...(claimed?{claimed}:{})}});
 });
 await page.clock.install({time:new Date('2026-11-20T12:00:00Z')});
 return requests;
}
async function showOffer(page:Page){await page.goto(entry);await page.getByTestId('details-form').waitFor();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('solum_meta_black_friday_2026')??'{}').visitor_token)).toBe('opaque');await page.clock.runFor(21000);}
test('invitation reminder appears only after dismissal and disappears after claiming',async({page})=>{
 await offerSetup(page);await page.goto(entry);await page.getByTestId('details-form').waitFor();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('solum_meta_black_friday_2026')??'{}').visitor_token)).toBe('opaque');
 const reminder=page.getByRole('button',{name:'Your 10% invitation',exact:true});
 await expect(reminder).not.toBeVisible();
 await page.clock.runFor(21000);
 const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});
 await expect(dialog).toBeVisible();await expect(reminder).not.toBeVisible();
 await dialog.getByRole('button',{name:'Close invitation',exact:true}).click();
 await expect(reminder).toBeVisible();await reminder.click();
 await dialog.getByLabel('Email address',{exact:true}).fill('buyer@example.test');
 await dialog.getByRole('button',{name:'Unlock my 10%'}).click();
 await expect(dialog.getByText('PERSONAL',{exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'Continue shopping'}).click();
 await expect(reminder).not.toBeVisible();
 await page.reload();await page.clock.runFor(30000);
 await expect(reminder).not.toBeVisible();await expect(dialog).not.toBeVisible();
});
test('delays, claims with unchecked consent, applies net prices and persists dismissal',async({page})=>{
 const requests=await offerSetup(page);await showOffer(page);
 const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('Limited Black Friday offer. Ends 30 November, 11:59pm UK, while kits last.');
 await expect(dialog.getByRole('checkbox')).not.toBeChecked();
 await expect(dialog.locator('img')).toHaveAttribute('src','/products/kit/holding-box@600.webp');
 await dialog.screenshot({path:`/tmp/solum-meta-promo-${page.viewportSize()!.width}.png`});
 const box=await dialog.boundingBox();expect(box!.width).toBeLessThanOrEqual((page.viewportSize()!.width));
 await dialog.getByLabel('Email address',{exact:true}).fill('buyer@example.test');await dialog.getByRole('button',{name:'Unlock my 10%'}).click();
 await expect(dialog.getByText('PERSONAL',{exact:true})).toBeVisible();await expect(dialog).toContainText('Limited Black Friday offer.');await dialog.getByRole('button',{name:'Continue shopping'}).click();
 await expect(page.getByTestId('meta-promo-summary').first()).toContainText('10% applied');
 const confirmation=page.getByTestId('meta-promo-applied');
 await expect(confirmation).toContainText('Order total £76.50');
 await expect(confirmation.getByRole('button',{name:'Copy code',exact:true})).toBeVisible();
 expect(await confirmation.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('[data-testid="express-checkout"]'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 expect(requests.find(r=>r.action==='claim')).toMatchObject({marketing_consent:false,attribution_checked:true});
 await page.reload();await page.clock.runFor(30000);await expect(dialog).not.toBeVisible();
});
test('Escape dismisses without automatic repeat and permits eligible reopen',async({page})=>{
 await offerSetup(page);await showOffer(page);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).toBeVisible();
 await page.keyboard.press('Escape');await page.reload();await expect(page.getByRole('button',{name:'Your 10% invitation'})).toBeVisible();await page.clock.runFor(30000);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();
 await page.getByRole('button',{name:'Your 10% invitation'}).click();await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).toBeVisible();
});
test('affiliate visits and unknown attribution never show offer',async({page})=>{
 await offerSetup(page,{blocked:true});await showOffer(page);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();
});

test('unknown affiliate resolution is excluded',async({page})=>{
 await offerSetup(page,{resolveFail:true});await showOffer(page);await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();
});
async function claimOffer(page:Page,email='buyer@example.test'){
 await showOffer(page);const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});
 await dialog.getByLabel('Email address',{exact:true}).fill(email);await dialog.getByRole('button',{name:'Unlock my 10%'}).click();
 await expect(dialog.getByText('PERSONAL',{exact:true})).toBeVisible();await dialog.getByRole('button',{name:'Continue shopping'}).click();
}
test('personal code can be copied with clear confirmation',async({page})=>{
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await offerSetup(page);await showOffer(page);
 const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});
 await dialog.getByLabel('Email address',{exact:true}).fill('buyer@example.test');
 await dialog.getByRole('button',{name:'Unlock my 10%'}).click();
 await dialog.getByRole('button',{name:'Copy code',exact:true}).click();
 await expect(dialog.getByRole('status',{name:'Copy status'})).toHaveText('Code copied.');
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('PERSONAL');
});
test('blocked clipboard selects the personal code without claiming it was copied',async({page})=>{
 await offerSetup(page);await showOffer(page);
 const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});
 await dialog.getByLabel('Email address',{exact:true}).fill('buyer@example.test');
 await dialog.getByRole('button',{name:'Unlock my 10%'}).click();
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked');}}});Object.defineProperty(document,'execCommand',{configurable:true,value:()=>false});});
 await dialog.getByRole('button',{name:'Copy code',exact:true}).click();
 await expect(dialog.getByRole('status',{name:'Copy status'})).toHaveText('Code selected. Copy it using your device’s copy option.');
 expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe('PERSONAL');
 await expect(dialog.getByRole('button',{name:'Copied',exact:true})).toHaveCount(0);
});
async function mockedPromoPayments(page:Page,requests:Record<string,unknown>[]){
 await page.route('**/functions/v1/create-first-box-payment-intent',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  const items=body.items??[{kit_id:body.kit_id,quantity:1}];
  const subtotal_pence=items.reduce((sum,item)=>sum+item.quantity*(item.kit_id==='ritual'?8500:6500),0);
  const order_items=items.map(item=>({...item,unit_amount_pence:(item.kit_id==='ritual'?8500:6500)*(body.promo_code ? .9 : 1),line_amount_pence:item.quantity*(item.kit_id==='ritual'?8500:6500)*(body.promo_code ? .9 : 1)}));
  const amount_pence=order_items.reduce((sum,item)=>sum+item.line_amount_pence,0);
  await page.evaluate(amount=>{window.__paymentAmount=amount;sessionStorage.setItem('mockStripeAmount',String(amount));},amount_pence);
  return route.fulfill({json:{client_secret:'pi_mock123_secret_mock',checkout_flow:'multi_kit_v1',total_quantity:items.reduce((sum,item)=>sum+item.quantity,0),order_items,amount_pence,reservation_expires_at:new Date('2026-12-02T00:00:00Z').toISOString(),...(body.promo_code?{promo:{code:body.promo_code,discount_percent:10,subtotal_pence,discount_pence:subtotal_pence/10}}:{})}});
 });
}
async function startCard(page:Page){
 await page.getByTestId('first-name').fill('Test');await page.getByTestId('continue-btn').click();
 await page.getByTestId('line1').fill('10 Test Street');await page.getByTestId('city').fill('London');await page.getByTestId('postcode').fill('SW1A 1AA');await page.getByTestId('delivery-btn').click();
}
test('mixed discounted card snapshot survives refresh and paid receipt',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page);
 await page.getByRole('button',{name:'Increase RITUAL quantity'}).click();await page.getByRole('button',{name:'Add GROUND kit'}).click();
 await expect(page.getByTestId('kits-confirm')).toContainText('£211.50');await startCard(page);
 await expect(page.getByTestId('pay-btn')).toHaveText('Pay £211.50 Now →');
 expect(requests.find(r=>r.promo_code)).toMatchObject({promo_code:'PERSONAL',promo_visitor_token:'opaque',attribution_checked:true,items:[{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}]});
 await page.reload();await expect(page.getByTestId('pay-btn')).toHaveText('Pay £211.50 Now →');await page.evaluate(()=>{window.__paymentAmount=Number(sessionStorage.getItem('mockStripeAmount'));});await page.getByRole('checkbox').check();await page.getByTestId('pay-btn').click();
 await expect(page.getByTestId('success-order')).toContainText('£211.50');await expect(page.getByTestId('success-order')).toContainText('£235.00');await page.reload();await expect(page.getByTestId('success-order')).toContainText('£23.50');
});
test('card rejects a different offer email and explicit removal persists',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page);
 await page.getByTestId('email').fill('other@example.test');await page.getByTestId('continue-btn').click();await expect(page.getByTestId('form-error')).toContainText('Use buyer@example.test');
 await page.getByRole('button',{name:'Remove offer'}).click();await expect(page.getByTestId('meta-promo-applied')).not.toBeVisible();
 await page.reload();await expect(page.getByTestId('kit-confirm')).toContainText('£85');expect(requests.filter(r=>r.promo_code)).toHaveLength(0);
});
test('single kit wallet charges the net durable quote and retains savings',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page);await page.getByTestId('mock-wallet').click();
 await expect(page.getByTestId('success-order')).toContainText('£76.50');await expect(page.getByTestId('success-order')).toContainText('£8.50');
 expect(requests.find(r=>r.promo_code)).toMatchObject({items:[{kit_id:'ritual',quantity:1}],promo_code:'PERSONAL',payment_flow:'express_wallet'});
});

test('wallet email must match the grant before any payment request',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page,'other@example.test');await page.getByTestId('mock-wallet').click();
 await expect(page.getByTestId('form-error')).toContainText('Your wallet email must match');expect(requests.filter(r=>r.promo_code)).toHaveLength(0);await expect(page.getByTestId('success-order')).not.toBeVisible();
});

test('an automatic appearance is remembered even when the page reloads before dismissal',async({page})=>{
 await offerSetup(page);await showOffer(page);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).toBeVisible();
 await page.reload();await page.getByTestId('details-form').waitFor();await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();await page.clock.runFor(22000);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();
});
test('issued card quote stays discounted after offer expiry',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page);await startCard(page);await expect(page.getByTestId('pay-btn')).toHaveText('Pay £76.50 Now →');
 await page.clock.setFixedTime(new Date('2026-12-01T00:01:00Z'));await page.reload();await expect(page.getByTestId('pay-btn')).toHaveText('Pay £76.50 Now →');
 await page.evaluate(()=>{window.__paymentAmount=Number(sessionStorage.getItem('mockStripeAmount'));});await page.getByRole('checkbox').check();await page.getByTestId('pay-btn').click();await expect(page.getByTestId('success-order')).toContainText('£76.50');
});

test('direct visitors can claim the delayed offer without campaign tags',async({page})=>{
 await offerSetup(page);await page.goto('/buy?kit=ritual');await page.getByTestId('details-form').waitFor();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('solum_meta_black_friday_2026')??'{}').visitor_token)).toBe('opaque');
 await page.clock.runFor(22000);
 await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).toBeVisible({timeout:1500});
});
test('queued affiliate navigation uses the first visitor identity and cannot be restored by stale Meta response',async({page})=>{
 await offerSetup(page);const visits:any[]=[];let releaseFirst:()=>void=()=>{};
 await page.route('**/functions/v1/meta-promo',async route=>{
  const body=route.request().postDataJSON();visits.push(body);
  if(visits.length===1)await new Promise<void>(resolve=>{releaseFirst=resolve;});
  return route.fulfill({json:{visitor_token:'opaque',eligible:visits.length===1,blocked:visits.length>1,ends_at:'2026-12-01T00:00:00Z',discount_percent:10}});
 });
 await page.goto(entry);await expect.poll(()=>visits.length).toBe(1);
 await page.evaluate(()=>{history.pushState({},'', '/buy?source=aw&awc=affiliate-evidence');window.dispatchEvent(new PopStateEvent('popstate'));});
 await page.clock.runFor(22000);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();releaseFirst();
 await expect.poll(()=>visits.some(v=>v.landing_url.includes('awc=affiliate-evidence'))).toBe(true);const affiliateVisit=visits.find(v=>v.landing_url.includes('awc=affiliate-evidence'));expect(affiliateVisit).toMatchObject({visitor_token:'opaque'});expect(visits.slice(1).every(v=>v.visitor_token==='opaque')).toBe(true);
 await page.clock.runFor(22000);await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();
});

test('unchanged held wallet quote retries after expiry without creating a new payment',async({page})=>{
 const requests=await offerSetup(page);await mockedPromoPayments(page,requests);await claimOffer(page);await page.evaluate(()=>{window.__declinePayment=true;});await page.getByTestId('mock-wallet').click();
 await expect(page.getByTestId('form-error')).toContainText('Try another card.');expect(requests.filter(r=>r.promo_code)).toHaveLength(1);
 await page.clock.setFixedTime(new Date('2026-12-01T00:01:00Z'));await page.reload();await expect(page.getByTestId('kit-confirm')).toContainText('£76.50');await page.evaluate(()=>{window.__paymentAmount=Number(sessionStorage.getItem('mockStripeAmount'));});await page.getByTestId('mock-wallet').click();
 await expect(page.getByTestId('success-order')).toContainText('£76.50');expect(requests.filter(r=>r.promo_code)).toHaveLength(1);
});
test('unknown payment creation blocks removing the offer or changing its quantities',async({page})=>{
 await offerSetup(page);await claimOffer(page);await page.route('**/functions/v1/create-first-box-payment-intent',route=>route.abort());await page.getByTestId('mock-wallet').click();
 await expect(page.getByTestId('form-error')).toContainText('Failed to fetch');await page.getByRole('button',{name:'Remove offer'}).click();await expect(page.getByTestId('meta-promo-applied')).toContainText('previous payment attempt');
 await page.getByRole('button',{name:'Increase RITUAL quantity'}).click();await expect(page.getByRole('alert').last()).toContainText('previous payment attempt');await expect(page.getByTestId('kit-confirm')).toContainText('£76.50');
});

test('automatic offer waits for twelve visible seconds and browsing',async({page})=>{
 await offerSetup(page);await page.goto(entry);await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('solum_meta_black_friday_2026')??'{}').visitor_token)).toBe('opaque');await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();await page.clock.runFor(11500);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();
 await page.evaluate(()=>window.scrollTo(0,150));await page.clock.runFor(1000);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).toBeVisible();
});
test('dialog traps focus and keeps close available with a narrow keyboard viewport',async({page})=>{
 await offerSetup(page);await showOffer(page);const dialog=page.getByRole('dialog',{name:'Your Black Friday invitation.'});await expect(dialog).toBeVisible();
 const close=dialog.getByRole('button',{name:'Close invitation'});await close.focus();await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('link',{name:'Privacy'})).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();
 await page.setViewportSize({width:320,height:420});await dialog.getByLabel('Email address',{exact:true}).focus();await dialog.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(close).toBeInViewport();await close.click();await expect(dialog).not.toBeVisible();
});

test('an unknown payment from another page suppresses claiming until its checkout is recovered',async({page})=>{
 await offerSetup(page);await page.addInitScript(()=>sessionStorage.setItem('solum_reservation_express',JSON.stringify({id:'unknown-gross-payment',fingerprint:'previous-order'})));
 await page.goto('/?utm_source=meta&utm_medium=paid_social&offer_entry=signed-test');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('solum_meta_black_friday_2026')??'{}').visitor_token)).toBe('opaque');
 await page.clock.runFor(22000);await expect(page.getByRole('dialog',{name:'Your Black Friday invitation.'})).not.toBeVisible();await expect(page.getByRole('button',{name:'Your 10% invitation'})).not.toBeVisible();
});

test('lost card creation response restores buyer address and mixed order then retries the original request identity',async({page})=>{
 const requests=await offerSetup(page);await claimOffer(page);await page.getByRole('button',{name:'Increase RITUAL quantity'}).click();await page.getByRole('button',{name:'Add GROUND kit'}).click();
 const lost:any[]=[];await page.route('**/functions/v1/create-first-box-payment-intent',route=>{lost.push(route.request().postDataJSON());return route.abort();});await startCard(page);await expect(page.getByTestId('delivery-error')).toContainText('Failed to fetch');
 await page.reload();await expect(page.getByTestId('first-name')).toHaveValue('Test');await expect(page.getByTestId('email')).toHaveValue('buyer@example.test');await expect(page.getByTestId('kits-confirm')).toContainText('£211.50');await expect(page.getByTestId('pending-payment-recovery')).toBeVisible();
 await page.getByTestId('mock-wallet').click();await expect(page.getByTestId('form-error')).toContainText('original details and card checkout');await expect(page.getByTestId('continue-btn')).toBeEnabled();expect(lost).toHaveLength(1);
 await mockedPromoPayments(page,requests);await page.getByTestId('continue-btn').click();await expect(page.getByTestId('line1')).toHaveValue('10 Test Street');await expect(page.getByTestId('city')).toHaveValue('London');await expect(page.getByTestId('postcode')).toHaveValue('SW1A 1AA');await page.getByTestId('delivery-btn').click();await expect(page.getByTestId('pay-btn')).toHaveText('Pay £211.50 Now →');
 const recovered:any=requests.find(r=>r.promo_code);expect(recovered.reservation_request_id).toBe(lost[0].reservation_request_id);expect(recovered.items).toEqual(lost[0].items);
 await page.getByRole('button',{name:'Edit kits',exact:true}).click();await expect(page.getByTestId('kit-quantity-editor')).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByTestId('pending-payment-recovery')).not.toBeVisible();await page.getByTestId('mock-wallet').click();await expect(page.getByTestId('success-order')).toContainText('£211.50');
});
