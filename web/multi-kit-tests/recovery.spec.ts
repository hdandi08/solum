import { test, expect } from '@playwright/test';
import { setup } from './support';
const items=[{kit_id:'ground',quantity:1},{kit_id:'ritual',quantity:2}];
for(const flow of ['buy','express']) test(`flag-off ${flow} recovery preserves a held order until successful retirement`,async({page},info)=>{
  const requests=await setup(page);
  await page.addInitScript(({flow,items})=>{
    if(sessionStorage.getItem('recovery-seeded')) return;sessionStorage.setItem('recovery-seeded','1');
    const order_items=items.map(item=>({...item,unit_amount_pence:item.kit_id==='ritual'?8500:6500,line_amount_pence:item.quantity*(item.kit_id==='ritual'?8500:6500)}));
    sessionStorage.setItem('solum_payment_retry',JSON.stringify({flow,kit:'ritual',items,source:'first_batch',clientSecret:'pi_oldhold_secret_mock',form:{first_name:'Test',last_name:'Buyer',email:'buyer@example.test',phone:'',line1:'10 Test Street',line2:'',city:'London',county:'',postcode:'SW1A 1AA'},payInfo:{client_secret:'pi_oldhold_secret_mock',checkout_flow:'multi_kit_v1',order_items,total_quantity:3,amount_pence:23500,reservation_expires_at:new Date(Date.now()+600000).toISOString()}}));
  },{flow,items});
  let processing=true;
  await page.route('**/functions/v1/release-checkout-reservation',r=>{requests.push({release:true});return r.fulfill({status:processing?409:200,json:processing?{error:'payment_processing'}:{released:true}});});
  await page.goto('/buy?kit=ritual&items=ground:1,ritual:2');
  if(info.project.name==='production-blocked') {
    await expect(page.getByTestId('kit-confirm')).toContainText('£85');await expect(page.getByTestId('pay-btn')).toHaveCount(0);await expect(page.getByTestId('kits-confirm')).toHaveCount(0);return;
  }
  if(flow==='buy') {
    await expect(page.getByTestId('pay-btn')).toHaveText('Pay £235 Now →');
    await page.getByRole('button',{name:'← Back to delivery',exact:true}).click();
    await expect(page.getByTestId('pay-error')).toContainText('Your payment is still processing.');
    await expect(page.getByTestId('pay-btn')).toHaveText('Pay £235 Now →');
    expect(requests.filter(body=>!body.release)).toHaveLength(0);
    processing=false;await page.getByRole('button',{name:'← Back to delivery',exact:true}).click();
  } else {
    await expect(page.getByTestId('kits-confirm')).toContainText('£235');await expect(page.getByTestId('mock-wallet')).toHaveCount(0);
    await page.getByTestId('continue-btn').click();await expect(page.getByTestId('form-error')).toContainText('Your payment is still processing.');
    await expect(page.getByTestId('kits-confirm')).toContainText('£235');expect(requests.filter(body=>!body.release)).toHaveLength(0);
    processing=false;await page.getByTestId('continue-btn').click();
    await expect(page.getByTestId('kit-confirm')).toContainText('£85');await page.getByTestId('continue-btn').click();
  }
  await expect(page.getByTestId('delivery-form')).toBeVisible();await page.getByTestId('delivery-btn').click();
  await expect(page.getByTestId('pay-btn')).toHaveText('Pay £85 Now →');
  const created=requests.filter(body=>!body.release);expect(created).toHaveLength(1);expect(created[0]).not.toHaveProperty('items');expect(created[0].kit_id).toBe('ritual');
  expect(new URL(page.url()).searchParams.has('items')).toBe(false);
});
