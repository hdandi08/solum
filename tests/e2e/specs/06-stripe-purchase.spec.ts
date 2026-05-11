import { test, expect } from '@playwright/test';
import { getAdminClient } from '../helpers/supabase-admin';
import * as path from 'path';

const STRIPE_TEST_CARD = '4242424242424242';

async function fillCheckoutForm(page: any, email: string) {
  await page.locator('input[placeholder="James"]').first().fill('Stripe');
  await page.locator('input[placeholder="Smith"]').fill('Test');
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[placeholder="1990"]').fill('1990');
  await page.locator('input[placeholder="1–12"]').fill('6');
}

// Poll Supabase for a paid first_box order by email — webhook may take a few seconds
async function waitForOrder(email: string, maxWaitMs = 30_000): Promise<Record<string, unknown> | null> {
  const db = getAdminClient();
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const { data: customer } = await db
      .from('customers').select('id').eq('email', email.toLowerCase()).maybeSingle();
    if (customer?.id) {
      const { data: order } = await db
        .from('orders').select('*')
        .eq('customer_id', customer.id).eq('order_type', 'first_box').eq('status', 'paid')
        .maybeSingle();
      if (order) return order;
    }
    await new Promise(r => setTimeout(r, 2_000));
  }
  return null;
}

test.describe('Stripe purchase → Solum API sale event', () => {
  test.setTimeout(120_000);

  test('completing a Stripe test purchase records a paid order in the API', async ({ page }) => {
    const testEmail = `stripe-e2e-${Date.now()}@bysolum.com`;

    // ── Step 1: fill Solum checkout form ─────────────────────────────────────
    await page.goto('/checkout?kit=ritual');
    await page.waitForLoadState('networkidle');
    await fillCheckoutForm(page, testEmail);
    await page.locator('button.co-submit').click();

    // ── Step 2: land on Stripe hosted checkout ────────────────────────────────
    // Use domcontentloaded — Stripe's page never reaches networkidle (background polling)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2_000);

    // ── Step 3: fill shipping address ─────────────────────────────────────────
    // Full name
    await page.locator('input[placeholder="Full name"]').fill('Stripe Test');

    // "Enter address manually" bypasses Google Places autocomplete entirely
    await page.getByText('Enter address manually').click();
    await page.waitForTimeout(500);

    // Address line 1
    await page.locator(
      'input[autocomplete*="address-line1"], input[placeholder*="Address line 1"], input[placeholder*="Street"]'
    ).first().fill('10 Downing Street');

    // City
    const cityInput = page.locator(
      'input[autocomplete*="address-level2"], input[placeholder*="City"], input[placeholder*="Town"]'
    ).first();
    if (await cityInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cityInput.fill('London');
    }

    // Postcode
    await page.locator(
      'input[autocomplete*="postal-code"], input[placeholder*="Postcode"], input[placeholder*="ZIP"]'
    ).first().fill('SW1A 2AA');

    await page.waitForTimeout(500);

    // ── Step 4: select Card payment method ────────────────────────────────────
    // Stripe's accordion button uses position:fixed expanded click areas that sit
    // outside the viewport in Playwright's coordinate space — use JS to trigger it.
    await page.evaluate(() => {
      (document.querySelector('[data-testid="card-accordion-item-button"]') as HTMLElement)?.click();
    });
    await page.waitForTimeout(1_500); // allow card fields to animate in

    // ── Step 5: fill card details ─────────────────────────────────────────────
    // Take a debug screenshot so iframe names are visible on failure
    await page.screenshot({ path: path.join('test-results', 'stripe-before-card.png'), fullPage: true });

    // Log all iframes for diagnostics
    const iframeEls = await page.locator('iframe').all();
    console.log(`\n=== ${iframeEls.length} iframes on Stripe page ===`);
    for (const el of iframeEls) {
      const n = await el.getAttribute('name').catch(() => '');
      const a = await el.getAttribute('allow').catch(() => '');
      const t = await el.getAttribute('title').catch(() => '');
      console.log(`  name="${n}" allow="${a}" title="${t}"`);
    }

    // Try iframe selectors in order — Stripe's naming varies by version
    const cardFrameSelectors = [
      'iframe[name*="card"]',
      'iframe[allow*="payment"]',
      'iframe[allowpaymentrequest]',
      'iframe[name*="__privateStripeFrame"]',
      'iframe[title*="card" i]',
      'iframe[title*="Card" i]',
      'iframe[name*="stripe"]',
    ];

    let cardFilled = false;
    for (const sel of cardFrameSelectors) {
      try {
        const frame = page.frameLocator(sel).first();
        const cardNum = frame.locator(
          'input[placeholder*="1234"], input[name="cardnumber"], input[autocomplete="cc-number"]'
        );
        await cardNum.waitFor({ timeout: 2_000 });
        await cardNum.fill(STRIPE_TEST_CARD);
        await frame.locator(
          'input[placeholder*="MM"], input[name="exp-date"], input[autocomplete="cc-exp"]'
        ).fill('1230');
        await frame.locator(
          'input[placeholder*="CVC"], input[placeholder*="CVV"], input[name="cvc"], input[autocomplete="cc-csc"]'
        ).fill('123');
        console.log(`Card filled via frame: ${sel}`);
        cardFilled = true;
        break;
      } catch { /* try next */ }
    }

    if (!cardFilled) {
      // Last resort: card inputs may be direct elements on Stripe's own domain
      try {
        const cardNum = page.locator(
          'input[placeholder*="1234"], input[autocomplete="cc-number"]'
        ).first();
        await cardNum.waitFor({ timeout: 3_000 });
        await cardNum.fill(STRIPE_TEST_CARD);
        await page.locator('input[autocomplete="cc-exp"], input[placeholder*="MM"]').first().fill('1230');
        await page.locator('input[autocomplete="cc-csc"], input[placeholder*="CVC"]').first().fill('123');
        cardFilled = true;
        console.log('Card filled via direct page inputs');
      } catch { /* give up */ }
    }

    if (!cardFilled) {
      await page.screenshot({ path: path.join('test-results', 'stripe-card-not-found.png'), fullPage: true });
      throw new Error(
        'Could not locate Stripe card inputs — check stripe-before-card.png and the iframe list above.'
      );
    }

    // ── Step 6: submit ────────────────────────────────────────────────────────
    // Multiple "Pay with X" buttons exist — target the actual submit button by testid
    await page.locator('[data-testid="hosted-payment-submit-button"]').click();

    // ── Step 7: wait for /success redirect ───────────────────────────────────
    await page.waitForURL(/\/success/, { timeout: 30_000 });
    await expect(page.locator('.su-eyebrow')).toBeVisible({ timeout: 10_000 });

    // ── Step 8: verify stripe-webhook wrote a paid order to Supabase ─────────
    const order = await waitForOrder(testEmail);
    expect(order, 'Expected a paid first_box order in orders table after Stripe checkout').not.toBeNull();
    expect(order!.kit_id).toBe('ritual');
    expect(order!.status).toBe('paid');
    expect(order!.order_type).toBe('first_box');
  });
});
