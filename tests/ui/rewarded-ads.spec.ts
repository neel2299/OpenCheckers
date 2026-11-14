import { test, expect, type Page } from './fixtures';

const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).preferences.personalization);
async function openBoard(page: Page) {
  await page.getByRole('button', { name: 'Open personalization', exact: true }).click();
  await page.getByRole('tab', { name: 'Customize board', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/settings');
});
test('Royal Club and all textures are free without an earned reward or ad placement', async ({ page }) => {
  await expect(page.getByText('Ad privacy', { exact: true })).toHaveCount(0);
  await openBoard(page);
  await expect(page.getByText('AVAILABLE TO EVERYONE', { exact: true })).toBeVisible();
  await expect(page.getByText('OPTIONAL REWARDED AD', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: 'Board texture royal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply Royal Club', exact: true }).click();
  await expect.poll(async () => (await saved(page)).board.texture).toBe('royal');
  await page.getByRole('tab', { name: 'Customize pieces', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Piece texture royal', exact: true })).toBeVisible();
});
test('the free finish survives reload and remains available after resetting preferences', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openBoard(page);
  await page.getByRole('button', { name: 'Apply Royal Club', exact: true }).click();
  await expect.poll(async () => (await saved(page)).board.texture).toBe('royal');
  await page.reload();
  await expect.poll(async () => (await saved(page)).board.palette?.dark).toBe('#214F40');
  await page.getByRole('tab', { name: 'Personalization Files', exact: true }).click();
  await page.getByRole('button', { name: 'Reset all personalization', exact: true }).click();
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await expect.poll(async () => (await saved(page)).board.texture).toBe('none');
  await expect.poll(async () => (await saved(page)).background).toMatchObject({ color: '#173D30', texture: 'dots' });
  await page.getByRole('tab', { name: 'Personalization Appearance', exact: true }).click();
  await page.getByRole('tab', { name: 'Customize board', exact: true }).click();
  await page.getByRole('button', { name: 'Apply Royal Club', exact: true }).click();
  await expect.poll(async () => (await saved(page)).board.texture).toBe('royal');
  await page.screenshot({ path: `artifacts/royal-club-free-${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
});
