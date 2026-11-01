import {test,expect} from '@playwright/test';

test('fresh card checkout shows its server reservation timer within the payment viewport',async({page})=>{
  await page.route('https://cloudflare-dns.com/**',r=>r.fulfill({json:{Status:0,Answer:[{type:15,data:'mail.example.com'}]}}));
  await page.route('**/functions/v1/**',r=>{
    const endpoint=new URL(r.request().url()).pathname.split('/').pop();
    if(endpoint==='get-inventory-status') return r.fulfill({json:{kits:{ritual:{available:true,count:250},ground:{available:true,count:250}}}});
    if(endpoint==='create-first-box-payment-intent') return r.fulfill({json:{client_secret:'pi_test123_secret_test123',reservation_expires_at:new Date(Date.now()+720000).toISOString(),reservation_server_now:new Date().toISOString(),amount_pence:6500,dispatch_date:'Tue 3 Nov'}});
    return r.fulfill({json:{}});
  });
  await page.goto('/buy?kit=ground');
  await page.getByPlaceholder('James',{exact:true}).fill('Harsha');
  await page.getByPlaceholder('james@example.com').fill('harsha@ecompilers.com');
  await page.getByTestId('continue-btn').click();
  await page.getByPlaceholder('14 Example Street').fill('10 Test Street');
  await page.getByPlaceholder('London',{exact:true}).fill('London');
  await page.getByPlaceholder('SW1A 1AA').fill('SW1A 1AA');
  await page.getByTestId('delivery-form').getByRole('button',{name:/continue/i}).click();
  const timer=page.getByTestId('reservation-timer');
  await expect(timer).toBeVisible();
  await expect(timer).toContainText('Your kit is reserved for');
  await expect(timer).toBeInViewport({ratio:1});
});

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
