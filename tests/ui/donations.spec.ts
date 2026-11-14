import { test, expect } from './fixtures';

test.beforeEach(async ({ page }, info) => {
  if (!info.title.includes('tutorial')) await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.describe('selected launches', () => {
  test.use({ donationRoll: 0.1, timezoneId: 'Europe/London' });
  test('launch prompt dismisses and never repeats on navigation or a foreground event', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toBeVisible();
    await expect(page.getByTestId('donation-upi-qr')).toHaveCount(0);
    await page.screenshot({ path: `artifacts/donation-international-${test.info().project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Maybe later', exact: true }).click();
    await page.getByRole('tab', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Play', exact: true }).click();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('personalized-background')).toHaveCSS('background-color', 'rgb(23, 61, 48)');
    await page.screenshot({ path: `artifacts/dark-green-room-${test.info().project.name}.png`, fullPage: true });
  });
  test('the launch donation waits for the tutorial to close', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Close opencheckers guide', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close opencheckers guide', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toBeVisible();
  });
});

test.describe('India time zone', () => {
  test.use({ donationRoll: 0.1, timezoneId: 'Asia/Kolkata' });
  test('the developer QR loads by default and both payment options remain accessible', async ({ page }) => {
    await page.goto('/');
    const qr = page.getByTestId('donation-upi-qr');
    await expect(qr).toBeVisible();
    await expect(qr.locator('img')).toHaveJSProperty('naturalWidth', 912);
    await expect(qr.locator('img')).toHaveJSProperty('naturalHeight', 899);
    await expect(page.getByText('suhaas1@ptyes', { exact: true })).toBeVisible();
    const imageBounds = await qr.boundingBox();
    const donateBounds = await page.getByRole('button', { name: 'Donate with Buy Me a Coffee', exact: true }).boundingBox();
    expect(imageBounds!.height).toBeLessThan(300);
    expect(imageBounds!.y + imageBounds!.height).toBeLessThan(donateBounds!.y);
    await page.screenshot({ path: `artifacts/donation-india-${test.info().project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Hide UPI QR code', exact: true }).click();
    await expect(qr).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Donate with Buy Me a Coffee', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Donate with UPI instead', exact: true }).click();
    await expect(qr).toBeVisible();
    await page.getByRole('button', { name: 'Maybe later', exact: true }).click();
    await expect(qr).toHaveCount(0);
  });
});

test.describe('unselected launches', () => {
  test.use({ donationRoll: 0.9, timezoneId: 'Europe/London' });
  test('skips the launch prompt and opens the supplied donation page only on request', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Donate to the developer', exact: true }).click();
    await page.evaluate(() => {
      window.open = ((url?: string | URL) => { (window as typeof window & { donationUrl?: string }).donationUrl = String(url); return null; }) as typeof window.open;
    });
    await page.getByRole('button', { name: 'Donate with Buy Me a Coffee', exact: true }).click();
    expect(await page.evaluate(() => (window as typeof window & { donationUrl?: string }).donationUrl)).toBe('https://buymeacoffee.com/nitruspeed');
    await page.getByRole('button', { name: 'Close support the developer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toHaveCount(0);
  });
});
