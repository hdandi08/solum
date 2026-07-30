import { expect, test } from '@playwright/test';

test.describe('Ritual carousel media', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('defers media until the section is near the mobile viewport', async ({ page }) => {
    const trackingRequests: string[] = [];
    const trackingHosts = [
      'posthog.com',
      'facebook.net',
      'googletagmanager.com',
      'tiktok.com',
      'dwin1.com',
    ];
    page.on('request', (request) => {
      const hostname = new URL(request.url()).hostname;
      if (trackingHosts.some((host) => hostname.endsWith(host))) {
        trackingRequests.push(hostname);
      }
    });

    await page.goto('/');

    const ritual = page.locator('#ritual');
    await expect(ritual.locator('video, img')).toHaveCount(0);

    await ritual.scrollIntoViewIfNeeded();

    const activeCard = ritual.locator('.ria-card.active');
    await expect(activeCard.locator('img')).toHaveAttribute('src', '/products/04/use-1.webp');

    const bodyWash = ritual.getByRole('button', { name: 'Play Body Wash' });
    await bodyWash.press('Enter');
    await expect(bodyWash).toHaveClass(/active/);
    await expect(bodyWash.locator('video')).toHaveAttribute('poster', '/products/01/poster.jpg');
    expect(trackingRequests).toEqual([]);
  });
});
