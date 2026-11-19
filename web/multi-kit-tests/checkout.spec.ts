import { setup } from './support';
import { test, expect } from '@playwright/test';
const mixed = [{ kit_id: 'ground', quantity: 1 }, { kit_id: 'ritual', quantity: 2 }];
async function makeMixed(page: Page) {
  await page.getByRole('button',{name:'Add another kit',exact:true}).click();
  await page.getByRole('button',{name:'Increase RITUAL quantity'}).click();
  await page.getByRole('button',{name:/Add GROUND kit/}).click();
  await page.getByRole('button',{name:'Update order',exact:true}).click();
}
async function delivery(page: Page) {
  await page.getByTestId('first-name').fill('Test'); await page.getByTestId('email').fill('buyer@example.test');
  await page.getByTestId('continue-btn').click();
  await page.getByTestId('line1').fill('10 Test Street'); await page.getByTestId('city').fill('London'); await page.getByTestId('postcode').fill('SW1A 1AA');
  await page.getByTestId('delivery-btn').click();
}
for (const kit of ['ritual','ground']) test(`default ${kit} stays one kit; editor cancel and limits are safe`, async ({page}) => {
  await setup(page,{ritual:2,ground:4}); await page.goto(`/buy?kit=${kit}`);
  await expect(page.getByTestId('kit-confirm')).toContainText(kit.toUpperCase());
  await expect(page.getByTestId('kit-quantity-editor')).toHaveCount(0);
  await page.getByRole('button',{name:'Add another kit',exact:true}).click();
  await expect(page.getByRole('button',{name:`Decrease ${kit.toUpperCase()} quantity`})).toBeDisabled();
  await page.getByRole('button',{name:`Increase ${kit.toUpperCase()} quantity`}).click();
  if (kit==='ritual') await expect(page.getByRole('button',{name:'Increase RITUAL quantity'})).toBeDisabled();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByTestId('kit-confirm')).toBeVisible();
  await expect(page.getByTestId('kit-confirm')).toContainText(kit==='ritual'?'£85':'£65');
});
test('mixed card checkout shares quantities across summaries, refresh, payment and success',async({page})=>{
  const requests=await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page);
  await expect(page.getByTestId('kits-confirm')).toContainText('£235');
  await page.screenshot({path:`/tmp/solum-multi-summary-${page.viewportSize()?.width}.png`,fullPage:true});
  if ((page.viewportSize()?.width ?? 1200) < 900) {
    await page.evaluate(()=>window.scrollTo(0,600));
    await expect(page.locator('.co-mobile-price')).toHaveText('£235');
    await page.locator('.co-mobile-header-info').click();
    await expect(page.locator('.co-mobile-header-body')).toContainText('2 × £85');
    await page.getByRole('button',{name:'Close summary'}).click();
  } else await expect(page.getByRole('complementary',{name:'Order summary'})).toContainText('2 × £85');
  await page.reload(); await expect(page.getByTestId('kits-confirm')).toContainText('£235');
  await delivery(page); await expect(page.getByTestId('pay-btn')).toBeVisible(); expect(requests[0]).toMatchObject({kit_id:'ritual',items:mixed});
  await expect(page.getByTestId('pay-btn')).toHaveText('Pay £235 Now →');
  await page.getByRole('checkbox').check(); await page.getByTestId('pay-btn').click();
  await expect(page.getByText('Order confirmed',{exact:true})).toBeVisible();
  await expect(page.getByTestId('success-order')).toContainText('£235');
  await expect(page.getByTestId('success-order')).toContainText('2 × £85');
});
test('mixed wallet freezes editing and confirms the complete order',async({page})=>{
  const requests=await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page);
  await page.evaluate(()=>{window.__confirmBlocked=true;});
  await page.getByTestId('mock-wallet').click();
  await expect(page.getByTestId('kits-confirm').getByRole('button',{name:'Edit',exact:true})).toBeDisabled();
  await expect.poll(()=>requests.length).toBe(1); expect(requests[0]).toMatchObject({items:mixed,payment_flow:'express_wallet'});
  await page.waitForFunction(()=>typeof window.__finishConfirm==='function');
  await page.evaluate(()=>window.__finishConfirm());
  await expect(page.getByTestId('success-order')).toContainText('£235');
});
test('payment edits release the old attempt before changing quantities',async({page})=>{
  const requests=await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page); await delivery(page);
  await page.getByRole('button',{name:'Edit kits',exact:true}).click();
  await expect(page.getByTestId('kit-quantity-editor')).toBeVisible(); expect(requests[1]).toEqual({release:true});
  await page.getByRole('button',{name:'Decrease RITUAL quantity'}).click(); await page.getByRole('button',{name:'Update order',exact:true}).click();
  await expect(page.getByTestId('email')).toHaveValue('buyer@example.test');
});

for (const kit of ['ritual','ground']) test(`on-site ${kit} one-kit checkout keeps the legacy request`,async({page})=>{
  const requests=await setup(page); await page.goto('/');
  await page.evaluate(items=>sessionStorage.setItem('solum_buy_kit_items',JSON.stringify(items)),mixed);
  await page.evaluate(kit=>{history.pushState({idx:1,usr:{checkoutEntry:'site'}},'',`/buy?kit=${kit}`);},kit); await page.reload();
  await expect(page.locator('.co-left').getByRole('link',{name:'← Back to kits',exact:true})).toBeVisible();
  await expect(page.getByTestId('kit-confirm')).toBeVisible();
  await delivery(page); await expect(page.getByTestId('pay-btn')).toHaveText(kit==='ritual'?'Pay £85 Now →':'Pay £65 Now →');
  expect(requests[0]).toHaveProperty('kit_id',kit); expect(requests[0]).not.toHaveProperty('items');
});
test('five-kit limit applies across both kit types',async({page})=>{
  await setup(page); await page.goto('/buy?kit=ritual'); await page.getByRole('button',{name:'Add another kit',exact:true}).click();
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'Increase RITUAL quantity'}).click();
  await page.getByRole('button',{name:/Add GROUND kit/}).click();
  await expect(page.getByRole('button',{name:'Increase RITUAL quantity'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Increase GROUND quantity'})).toBeDisabled();
  await expect(page.getByTestId('kit-quantity-editor')).toContainText('Maximum 5 kits per order.');
});
test('in-app browser shows the grouped order and £235 total',async({page})=>{
  await setup(page); await page.goto('/buy?kit=ritual&forceIab=1'); await makeMixed(page);
  await expect(page.locator('.iabg-card')).toContainText('£235');
  await expect(page.locator('.iabg-card')).toContainText('2 × £85');
  await expect(page.locator('.iabg-card')).toContainText('separate parcels');
});
test('redirect recovery uses the remembered lines with a fresh Stripe verification',async({page})=>{
  await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page); await delivery(page);
  await expect(page.getByTestId('pay-btn')).toBeVisible();
  await page.goto('/success?kit=ritual&source=first_batch&payment_intent=pi_mock123&payment_intent_client_secret=pi_mock123_secret_mock');
  await expect(page.getByTestId('success-order')).toContainText('£235');
  await expect(page.getByTestId('success-order')).toContainText('2 × £85');
});
test('a processing old payment blocks quantity edits',async({page})=>{
  await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page); await delivery(page);
  await expect(page.getByTestId('pay-btn')).toBeVisible();
  await page.route('**/functions/v1/release-checkout-reservation',r=>r.fulfill({status:409,json:{error:'payment_processing'}}));
  await page.getByRole('button',{name:'Edit kits',exact:true}).click();
  await expect(page.getByTestId('pay-error')).toContainText('Your payment is still processing.');
  await expect(page.getByTestId('kit-quantity-editor')).toHaveCount(0);
});

test('declined wallet survives refresh and safely switches to card with buyer details',async({page})=>{
  const requests=await setup(page); await page.goto('/buy?kit=ritual'); await makeMixed(page);
  await page.evaluate(()=>{window.__declinePayment=true;}); await page.getByTestId('mock-wallet').click();
  await expect(page.getByTestId('form-error')).toContainText('Try another card.');
  await page.reload(); await expect(page.getByTestId('email')).toHaveValue('buyer@example.test');
  await page.getByTestId('continue-btn').click(); await expect(page.getByTestId('delivery-form')).toBeVisible();
  await expect(page.getByTestId('line1')).toHaveValue('10 Test Street'); await page.getByTestId('delivery-btn').click();
  await expect(page.getByTestId('pay-btn')).toHaveText('Pay £235 Now →');
  expect(requests[1]).toEqual({release:true}); expect(requests[2]).toMatchObject({items:mixed});
});

test('editing a refreshed last-stock reservation restores its own held units first',async({page})=>{
  const counts={ritual:2,ground:1}; const requests=await setup(page,counts);
  await page.goto('/buy?kit=ritual'); await makeMixed(page); await delivery(page); await expect(page.getByTestId('pay-btn')).toBeVisible();
  counts.ritual=0; counts.ground=0; await page.reload(); await expect(page.getByTestId('pay-btn')).toBeVisible();
  await page.route('**/functions/v1/release-checkout-reservation',r=>{requests.push({release:true});counts.ritual=2;counts.ground=1;return r.fulfill({json:{released:true}});});
  await page.getByRole('button',{name:'Edit kits',exact:true}).click();
  await expect(page.getByRole('button',{name:'Update order',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Update order',exact:true}).click();
  await expect(page.getByTestId('kits-confirm')).toContainText('£235'); expect(requests[1]).toEqual({release:true});
});

test('card fallback retires a declined last-stock wallet before checking availability',async({page})=>{
  const counts={ritual:2,ground:1};const requests=await setup(page,counts);
  await page.goto('/buy?kit=ritual');await makeMixed(page);await page.evaluate(()=>{window.__declinePayment=true;});
  await page.getByTestId('mock-wallet').click();await expect(page.getByTestId('form-error')).toContainText('Try another card.');
  counts.ritual=0;counts.ground=0;await page.reload();await expect(page.getByTestId('email')).toHaveValue('buyer@example.test');
  await page.route('**/functions/v1/release-checkout-reservation',r=>{requests.push({release:true});counts.ritual=2;counts.ground=1;return r.fulfill({json:{released:true}});});
  await page.getByTestId('continue-btn').click();await expect(page.getByTestId('delivery-form')).toBeVisible();
  expect(requests[1]).toEqual({release:true});await page.getByTestId('delivery-btn').click();await expect(page.getByTestId('pay-btn')).toHaveText('Pay £235 Now →');
});

test('quantity edits preserve the compact on-site checkout introduction',async({page})=>{
  await setup(page);await page.goto('/');await page.evaluate(()=>history.pushState({idx:1,usr:{checkoutEntry:'site'}},'','/buy?kit=ritual'));await page.reload();
  await expect(page.getByRole('heading',{name:'Checkout',exact:true})).toBeVisible();await makeMixed(page);
  await expect(page.getByRole('heading',{name:'Checkout',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'The shower routine for men who want to feel their best.',exact:true})).toHaveCount(0);
});

test('switching from a sold-out mixed order clears old quantities on refresh',async({page})=>{
  await setup(page,{ritual:0,ground:5});await page.goto('/buy?kit=ritual&items=ground:1,ritual:2');
  await page.getByRole('button',{name:'Switch to GROUND · £65',exact:true}).click();
  await expect(page.getByTestId('kit-confirm')).toContainText('GROUND');await page.reload();
  await expect(page.getByTestId('kit-confirm')).toContainText('£65');await expect(page.getByTestId('kits-confirm')).toHaveCount(0);
});
