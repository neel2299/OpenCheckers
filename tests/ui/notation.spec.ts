import { test, expect, type Page } from './fixtures';

const square = (page: Page, coordinate: string) => page.getByRole('button', { name: new RegExp(`^${coordinate},`) });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game settings', exact: true })).toBeVisible();
});

test('legacy numeric games display and share coordinates in every variant and engine line', async ({ page }) => {
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  for (const [type, numericMove] of [[21, '22-18'], [20, '37-32'], [25, '22-18'], [26, '22-18']] as const) {
    await page.getByRole('button', { name: 'Import or export position', exact: true }).click();
    await page.getByRole('textbox', { name: 'Draughts FEN position' }).fill(`[GameType "${type}"]\n[FEN "W:WKc3:BKa7"]\n1. ${numericMove} *`);
    await page.getByRole('button', { name: 'Load position', exact: true }).click();
    await page.getByRole('button', { name: 'Move history', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Go to move 1, c3-d4', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close move history', exact: true }).click();
    await page.getByRole('button', { name: 'Engine', exact: true }).click();
    const candidate = page.getByRole('button', { name: /^Play candidate 1:/ });
    await expect(candidate).toHaveAttribute('aria-label', /^Play candidate 1: [a-j]\d{1,2}(?:[-x][a-j]\d{1,2})+$/);
    if (type === 20) await page.screenshot({ path: `artifacts/coordinate-analysis-${test.info().project.name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Close engine analysis', exact: true }).click();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as typeof window & { copiedGame?: string }).copiedGame = value; } } });
    });
    await page.getByRole('button', { name: 'Import or export position', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Draughts FEN position' })).toHaveValue('B:WKd4:BKa7');
    await page.getByRole('button', { name: 'Copy game as PDN', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { copiedGame?: string }).copiedGame)).toContain('1. c3-d4 *');
    await page.getByRole('button', { name: 'Close import & share', exact: true }).click();
  }
});

test('game hints and move history use coordinates with square numbers enabled or the board flipped', async ({ page }) => {
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Number the squares', exact: true }).click();
  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'New game settings', exact: true }).click();
  await page.getByRole('button', { name: '2 players', exact: true }).click();
  await page.getByRole('radio', { name: 'Play as Ivory', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new game', exact: true }).click();
  await expect(square(page, 'a1').getByText('a', { exact: true })).toBeVisible();
  await expect(square(page, 'a1').getByText('29', { exact: true })).toBeVisible();
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await page.getByRole('button', { name: 'Get a hint', exact: true }).click();
  await expect(page.getByText(/^Try [a-j]\d{1,2}[-x][a-j]\d/)).toBeVisible();
  await page.getByRole('button', { name: 'Flip board', exact: true }).click();
  await page.getByRole('button', { name: 'Move history', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Go to move 1, b6-a5', exact: true })).toBeVisible();
});

test('puzzle hints, wrong-move feedback, and full solution paths use coordinates', async ({ page }) => {
  await page.goto('/puzzle?id=english-double-choice');
  await square(page, 'c3').click(); await square(page, 'a5').click();
  await expect(page.getByText('c3xa5 misses the combination. Try a different move.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Puzzle hint', exact: true }).click();
  await expect(page.getByText('Look to the right diagonal (c3xe5xg7) rather than capturing toward the left edge.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Another hint', exact: true }).click();
  await page.getByRole('button', { name: 'Another hint', exact: true }).click();
  await expect(page.getByText(/^Play c3xe5xg7:/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to the board', exact: true }).click();
  await page.getByRole('button', { name: 'Show puzzle solution', exact: true }).click();
  await page.getByRole('button', { name: 'Next solution move', exact: true }).click();
  await expect(page.getByText('c3xe5xg7', { exact: true })).toBeVisible();
});
