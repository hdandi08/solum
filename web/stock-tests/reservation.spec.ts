import {test,expect} from '@playwright/test';

async function restoredCheckout(page, {route='/buy', expired=false}={}) {
  await page.route('**/functions/v1/get-inventory-status',r=>r.fulfill({json:{kits:{ritual:{available:false,count:0},ground:{available:true,count:70}}}}));
  await page.addInitScript(({expired})=>{
    if(sessionStorage.getItem('reservation_fixture_seeded')) return;
    sessionStorage.setItem('reservation_fixture_seeded','1');
    sessionStorage.setItem('solum_payment_retry',JSON.stringify({flow:'buy',kit:'ritual',source:'first_batch',clientSecret:'pi_test123_secret_test123',form:{first_name:'Harsha',last_name:'Test',email:'harsha@ecompilers.com',phone:'',line1:'10 Test Street',line2:'',city:'London',postcode:'SW1A 1AA',county:''},payInfo:{client_secret:'pi_test123_secret_test123',reservation_expires_at:new Date(Date.now()+(expired?-1000:600000)).toISOString(),amount_pence:8500,dispatch_date:'Tue 3 Nov'}}));
  },{expired});
  await page.goto(route);
}

test('bare buy URL restores the reserved kit and timer after refresh',async({page})=>{
  await restoredCheckout(page);
  await expect(page.getByTestId('reservation-timer')).toContainText('Your kit is reserved for');
  await expect(page.getByText('harsha@ecompilers.com',{exact:true})).toBeVisible();
  const deadline=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solum_payment_retry')).payInfo.reservation_expires_at);
  await page.reload();
  await expect(page.getByTestId('reservation-timer')).toContainText('Your kit is reserved for');
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solum_payment_retry')).payInfo.reservation_expires_at)).toBe(deadline);
});

test('expired reservation blocks payment and releases before retry, keeping details',async({page})=>{
  let released=0;
  await page.route('**/functions/v1/release-checkout-reservation',async r=>{released++;expect(r.request().postDataJSON().client_secret).toBe('pi_test123_secret_test123');await r.fulfill({json:{released:true}});});
  await restoredCheckout(page,{expired:true});
  await expect(page.getByTestId('reservation-timer')).toContainText('Your reservation has ended');
  await expect(page.getByTestId('pay-btn')).toBeDisabled();
  await page.getByRole('button',{name:'Check availability again'}).click();
  await expect(page.getByTestId('delivery-form')).toBeVisible();
  await expect(page.getByPlaceholder('14 Example Street')).toHaveValue('10 Test Street');
  expect(released).toBe(1);
});

test('editing a held last kit first cancels its old payment',async({page})=>{
  let released=0;
  await page.route('**/functions/v1/release-checkout-reservation',r=>{released++;return r.fulfill({json:{released:true}});});
  await restoredCheckout(page);
  await page.getByRole('button',{name:'Wrong? Edit'}).click();
  await expect(page.getByPlaceholder('james@example.com')).toHaveValue('harsha@ecompilers.com');
  expect(released).toBe(1);
});
