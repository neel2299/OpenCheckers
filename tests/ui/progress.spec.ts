import { test, expect, type Page } from './fixtures';
import { fromFen } from '../../src/game/engine';
import { DEFAULT_PREFERENCES } from '../../src/state/preferences';

const square = (page: Page, coord: string) => page.getByRole('button', { name: new RegExp(`^${coord},`) });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game settings', exact: true })).toBeVisible();
});

test('puzzle pages support wrong moves, hints, replies, solving, and durable progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('tab', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Open tactical puzzles', exact: true }).click();
  await page.getByRole('button', { name: 'Open puzzle: Trapped!, English', exact: true }).click();
  await square(page, 'd4').click(); await square(page, 'e5').click();
  await expect(page.getByText(/misses the combination/)).toBeVisible();
  await expect(square(page, 'd4')).toHaveAccessibleName(/Coral king/);
  await page.getByRole('button', { name: 'Puzzle hint', exact: true }).click();
  await expect(page.getByText('HINT 1 OF 3', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Another hint', exact: true }).click();
  await expect(page.getByText(/Start with your piece on d4/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to the board', exact: true }).click();
  await square(page, 'd4').click(); await square(page, 'c5').click();
  await expect(square(page, 'd2')).toHaveAccessibleName(/Ivory man/);
  await square(page, 'c3').click(); await square(page, 'e1').click();
  await expect(page.getByText('Puzzle solved. Nicely calculated!', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).solvedPuzzles)).toContain('shadow-en-01');
  await page.reload();
  await page.getByRole('button', { name: 'Back to puzzles', exact: true }).click();
  await expect(page.getByText('1 / 37 solved', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('viewing a solution never awards a solve and puzzle controls fit small and landscape phones', async ({ page }) => {
  await page.goto('/puzzle?id=shadow-en-01');
  await page.getByRole('button', { name: 'Show puzzle solution', exact: true }).click();
  await expect(page.getByText('Solution · step 0 / 3', { exact: true })).toBeVisible();
  for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Next solution move', exact: true }).click();
  await expect(square(page, 'e1')).toHaveAccessibleName(/Coral king/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).solvedPuzzles.length)).toBe(0);
  await page.getByRole('button', { name: 'Try yourself', exact: true }).click();
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const tabs = await page.getByRole('tablist').boundingBox();
      for (const name of ['Puzzle hint', 'Show puzzle solution', 'Restart puzzle', 'Puzzle move list']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        if (!bounds || bounds.height < 43 || bounds.y < 58 || bounds.y + bounds.height > tabs!.y + 1 || bounds.x < 0 || bounds.x + bounds.width > viewport.width + 1) return false;
      }
      return page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    }).toBeTruthy();
  }
});

test('computer victories and resignations save rating changes across Elo levels and reloads', async ({ page }) => {
  const position = fromFen('W:Wc3:Bd4,f6', 'english');
  await page.evaluate(({ position, preferences }) => {
    localStorage.setItem('draughts-club-v1', JSON.stringify({ version: 1, config: { variant: 'english', elo: 1200, mode: 'computer', side: 'white', timeControl: 0 }, game: { nodes: [{ id: 0, parent: null, children: [], position, move: null }], current: 0 }, preferences, archive: [], solvedPuzzles: [], recorded: false }));
  }, { position, preferences: DEFAULT_PREFERENCES });
  await page.reload();
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as typeof window & { lastSound?: HTMLMediaElement }).lastSound = this;
      return original.call(this);
    };
  });
  await square(page, 'c3').click(); await square(page, 'e5').click(); await square(page, 'g7').click();
  await expect(page.getByText(/Ivory wins/).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { lastSound?: HTMLMediaElement }).lastSound?.duration)).toBeCloseTo(1.65, 1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).ratings.english.value)).toBe(1216);
  await expect(page.getByTestId('game-result-rating')).toContainText('1200 → 1216');
  await expect(page.getByTestId('game-result-rating')).toContainText('+16 Elo');
  await page.reload();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).archiveIds.length)).toBe(1);
  await page.getByRole('button', { name: 'Back to board', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View game result', exact: true })).toContainText('1216 Elo');
  await page.getByRole('button', { name: 'New game settings', exact: true }).click();
  await page.getByRole('radio', { name: /^Computer level 800 Elo/ }).click();
  await page.getByRole('button', { name: 'Start a new game', exact: true }).click();
  await page.getByRole('button', { name: 'Resign game', exact: true }).click();
  await page.getByRole('button', { name: 'Resign', exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).archiveIds.length)).toBe(2);
  const saved = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('draughts-club-v1')!);
    return { ...saved, archive: saved.archiveIds.map((id: string) => JSON.parse(localStorage.getItem(`draughts-club-history-${id}`)!)) };
  });
  expect(saved.stats.played).toBe(2);
  expect(saved.archive[0]).toMatchObject({ elo: 800, opponentName: 'Cleo', ratingBefore: 1216 });
  expect(saved.archive[0].ratingAfter).toBeLessThan(1216);
  expect(saved.archive[1]).toMatchObject({ elo: 1200, opponentName: 'Jasper', ratingChange: 16 });
  await page.reload();
  await expect(page.getByTestId('game-result-rating')).toContainText(String(saved.archive[0].ratingAfter));
  await page.getByRole('button', { name: 'Game history', exact: true }).click();
  await page.getByRole('button', { name: 'History against Jasper, 1200 Elo', exact: true }).click();
  await expect(page.getByText('Rating 1200 → 1216', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  await expect(square(page, 'g7')).toHaveAccessibleName(/Ivory man/);
});
