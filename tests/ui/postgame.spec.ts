import { test, expect, type Page } from './fixtures';
import { createPosition, fromFen, type Position } from '../../src/game/engine';
import { LEVELS } from '../../src/game/variants';
import { DEFAULT_PREFERENCES } from '../../src/state/preferences';

const square = (page: Page, coord: string) => page.getByRole('button', { name: new RegExp(`^${coord},`) });

async function seedGame(page: Page, position: Position, mode: 'computer' | 'friend' = 'computer', clocks?: { white: number; black: number }) {
  await page.evaluate(({ position, mode, clocks, preferences }) => {
    localStorage.setItem('draughts-club-v1', JSON.stringify({
      version: 1,
      gameId: `postgame-${mode}`,
      config: { variant: position.variant, elo: 1200, mode, side: clocks ? 'black' : 'white', timeControl: clocks ? 3 : 0 },
      game: { nodes: [{ id: 0, parent: null, children: [], position, move: null }], current: 0 },
      preferences, archive: [], solvedPuzzles: [], recorded: false, clocks,
    }));
  }, { position, mode, clocks, preferences: DEFAULT_PREFERENCES });
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game settings', exact: true })).toBeVisible();
});

test('each computer has its own avatar in setup and beside the board', async ({ page }) => {
  for (const level of LEVELS) {
    await page.getByRole('button', { name: 'New game settings', exact: true }).click();
    for (const opponent of LEVELS) {
      await expect(page.getByRole('radio', { name: `Computer level ${opponent.elo} Elo, ${opponent.name}`, exact: true }).getByRole('img', { name: `${opponent.name} AI avatar` })).toHaveCount(1);
    }
    await page.getByRole('radio', { name: `Computer level ${level.elo} Elo, ${level.name}`, exact: true }).click();
    await page.getByRole('radio', { name: 'Play as Coral', exact: true }).click();
    await page.getByRole('button', { name: 'Start a new game', exact: true }).click();
    await expect(page.getByRole('img', { name: `${level.name} AI avatar`, exact: true })).toBeVisible();
    await expect(square(page, 'b6')).toBeEnabled();
  }
});

test('post-game analysis keeps the entire game when the board is reviewing an earlier move', async ({ page }) => {
  await seedGame(page, fromFen('W:Wc3:Bd4,f6', 'english'));
  await square(page, 'c3').click(); await square(page, 'e5').click(); await square(page, 'g7').click();
  await expect(page.getByTestId('game-result-rating')).toContainText('1200 → 1216');
  await page.getByRole('button', { name: 'Back to board', exact: true }).click();
  await page.getByRole('button', { name: 'Move history', exact: true }).click();
  await page.getByRole('button', { name: 'First position', exact: true }).click();
  await page.getByRole('button', { name: 'Close move history', exact: true }).click();
  await page.getByRole('button', { name: 'View game result', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze this game', exact: true }).click();
  await expect(page).toHaveURL(/\/analysis$/);
  await expect(square(page, 'g7')).toHaveAccessibleName(/Ivory man/);
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 1');
  await expect(page.getByText('Game over', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run computer analysis', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Run computer analysis', exact: true }).click();
  await expect(page.getByText(/1 half-moves analysed/)).toBeVisible({ timeout: 20_000 });
});

test('a draw shows zero rating change and links to puzzles, a new opponent, and a rematch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedGame(page, { ...fromFen('W:WKc3:BKf6', 'english'), quietPly: 80 });
  await expect(page.getByText(/Game drawn/).last()).toBeVisible();
  await expect(page.getByTestId('game-result-rating')).toContainText('+0 Elo');
  await page.screenshot({ path: `artifacts/postgame-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Puzzles', exact: true }).click();
  await expect(page).toHaveURL(/\/puzzles$/);
  await expect(page.getByText('Train your eye.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('radio', { name: /^Computer level 2400 Elo/ }).click();
  await page.getByRole('radio', { name: 'Play as Coral', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new game', exact: true }).click();
  await expect(page.getByText('Game over', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Atlas AI avatar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resign game', exact: true }).click();
  await page.getByRole('button', { name: 'Resign', exact: true }).click();
  await expect(page.getByText('Game over', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play rematch', exact: true }).click();
  await expect(page.getByText('Game over', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Atlas AI avatar', exact: true })).toBeVisible();
  await expect(square(page, 'b6')).toBeEnabled();
});

test('two-player results show an unchanged rating and open the matching history', async ({ page }) => {
  await seedGame(page, fromFen('B:Wg7:B', 'russian'), 'friend');
  await expect(page.getByRole('button', { name: 'Close game over', exact: true })).toBeVisible();
  await expect(page.getByTestId('game-result-rating')).toContainText('1200');
  await expect(page.getByTestId('game-result-rating')).toContainText('Rating unchanged · Two-player game');
  await expect(page.getByRole('img', { name: /AI avatar/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Game history', exact: true }).click();
  await expect(page).toHaveURL(/\/history\?.*variant=russian.*mode=friend/);
  await expect(page.getByRole('button', { name: 'Review game', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'History variant Russian', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('running out of time opens the result with the saved rating loss', async ({ page }) => {
  await seedGame(page, createPosition('english'), 'computer', { white: 180, black: 1 });
  await expect(page.getByText('Game over', { exact: true })).toBeVisible();
  await expect(page.getByText(/Ivory wins on time/).last()).toBeVisible();
  await expect(page.getByTestId('game-result-rating')).toContainText('1200 → 1184');
  await expect(page.getByTestId('game-result-rating')).toContainText('-16 Elo');
});
