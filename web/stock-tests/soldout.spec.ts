import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, { stock = 0, inventoryFailure = false, waitlistFailure = false } = {}) {
  const calls = { payments: 0, waitlist: 0 };
  await page.route('https://cloudflare-dns.com/**', route => route.fulfill({ json: { Status: 0, Answer: [{ type: 15, data: 'mail.example.com' }] } }));
  await page.route('**/functions/v1/**', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    if (name === 'get-inventory-status') {
      await route.fulfill({ status: inventoryFailure ? 503 : 200, json: inventoryFailure ? { error: 'unavailable' } : {
        kits: { ritual: { available: stock > 0, count: stock }, ground: { available: true, count: 70 } },
      } });
    } else if (name === 'join-waitlist') {
      calls.waitlist++;
      const fail = waitlistFailure && calls.waitlist === 1;
      await route.fulfill({ status: fail ? 500 : 200, json: fail ? { error: 'Unable to save' } : { success: true } });
    } else if (name === 'create-first-box-payment-intent') {
      calls.payments++;
      await route.fulfill({ status: 409, json: { error: 'sold_out', message: 'This kit is currently sold out.' } });
    } else {
      await route.fulfill({ status: 200, json: {} });
    }
  });
  await page.goto('/buy?kit=ritual');
  await page.getByPlaceholder('James', { exact: true }).fill('Harsha');
  await page.getByPlaceholder('james@example.com').fill('harsha@ecompilers.com');
  return calls;
}

test('sold-out signup confirms only after saving', async ({ page }) => {
  const calls = await setup(page);
  await page.getByTestId('continue-btn').click();
  await expect(page.getByText("You're on the list.", { exact: true })).toBeVisible();
  expect(calls.waitlist).toBe(1);
  expect(calls.payments).toBe(0);
});

test('failed waitlist save shows retry instead of false confirmation', async ({ page }) => {
  const calls = await setup(page, { waitlistFailure: true });
  await page.getByTestId('continue-btn').click();
  await expect(page.getByText("You're on the list.", { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText("You're on the list.", { exact: true })).toBeVisible();
  expect(calls.waitlist).toBe(2);
  expect(calls.payments).toBe(0);
});

test('inventory outage is not described as sold out or saved to waitlist', async ({ page }) => {
  const calls = await setup(page, { inventoryFailure: true });
  await page.getByTestId('continue-btn').click();
  await expect(page.getByTestId('delivery-form')).toBeVisible();
  expect(calls.waitlist).toBe(0);
});

test('stock selling out during address entry leads to saved waitlist', async ({ page }) => {
  const calls = await setup(page, { stock: 1 });
  await page.getByTestId('continue-btn').click();
  await page.getByPlaceholder('14 Example Street').fill('10 Test Street');
  await page.getByPlaceholder('London', { exact: true }).fill('London');
  await page.getByPlaceholder('SW1A 1AA').fill('SW1A 1AA');
  await page.getByTestId('delivery-form').getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText("You're on the list.", { exact: true })).toBeVisible();
  expect(calls.payments).toBe(1);
  expect(calls.waitlist).toBe(1);
});

test('subscription checkout uses the same sold-out inventory response', async ({ page }) => {
  await setup(page);
  await page.goto('/checkout?kit=ritual');
  await expect(page.locator('.co-waitlist')).toBeVisible();
});

test('unknown stock at payment preserves the address and offers another attempt', async ({ page }) => {
  const calls = await setup(page, { stock: 1 });
  await page.route('**/functions/v1/create-first-box-payment-intent', route => route.fulfill({
    status: 503, json: { error: 'inventory_unavailable', message: 'We could not check stock just now. Please try again shortly.' },
  }));
  await page.getByTestId('continue-btn').click();
  await page.getByPlaceholder('14 Example Street').fill('10 Test Street');
  await page.getByPlaceholder('London', { exact: true }).fill('London');
  await page.getByPlaceholder('SW1A 1AA').fill('SW1A 1AA');
  await page.getByTestId('delivery-form').getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText(/We could not check stock just now/)).toBeVisible();
  await expect(page.getByPlaceholder('14 Example Street')).toHaveValue('10 Test Street');
  await expect(page.getByTestId('delivery-form').getByRole('button', { name: /continue/i })).toBeEnabled();
  expect(calls.waitlist).toBe(0);
});

test('a rejected waitlist email can be corrected without starting checkout again', async ({ page }) => {
  await setup(page);
  await page.route('**/functions/v1/join-waitlist', route => route.fulfill({
    status: route.request().postDataJSON().email === 'harsha@ecompilers.com' ? 400 : 200,
    json: route.request().postDataJSON().email === 'harsha@ecompilers.com'
      ? { error: 'Please double-check your email address.' } : { success: true },
  }));
  await page.getByTestId('continue-btn').click();
  await page.getByRole('button', { name: 'Change email' }).click();
  await page.getByPlaceholder('james@example.com').fill('harsha+stock@ecompilers.com');
  await page.getByTestId('continue-btn').click();
  await expect(page.getByText("You're on the list.", { exact: true })).toBeVisible();
});

test('an upgrade selling out retains buyer details and signs up for the rejected kit', async ({ page }) => {
  await setup(page, { stock: 1 });
  await page.route('**/functions/v1/create-payment-intent', route => route.fulfill({ status: 409, json: { error: 'sold_out' } }));
  await page.goto('/checkout?kit=ground');
  await page.getByPlaceholder('James', { exact: true }).fill('Harsha');
  await page.getByPlaceholder('james@example.com').fill('harsha@ecompilers.com');
  await page.getByPlaceholder('+44 7700 900000').fill('07700900000');
  await page.getByRole('combobox').selectOption('1');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByRole('button', { name: /Next: Delivery/ }).click();
  await page.getByPlaceholder('14 Example Street').fill('10 Test Street');
  await page.getByPlaceholder('London', { exact: true }).fill('London');
  await page.getByPlaceholder('SW1A 1AA').fill('SW1A 1AA');
  await page.getByRole('button', { name: /Continue to Payment/ }).click();
  await page.getByRole('button', { name: /Upgrade to RITUAL/ }).click();
  await expect(page.locator('.co-waitlist-body')).toContainText('RITUAL');
  await expect(page.getByPlaceholder('james@example.com')).toHaveValue('harsha@ecompilers.com');
  const request = page.waitForRequest('**/functions/v1/join-waitlist');
  await page.getByRole('button', { name: /Notify Me When Available/ }).click();
  expect((await request).postDataJSON().source).toBe('buy-soldout-ritual');
  await expect(page.getByText("You're on the list.", { exact: true })).toBeVisible();
});
