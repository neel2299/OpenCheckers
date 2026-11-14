import { test, expect, type Page } from './fixtures';
import { applyMove, createPosition, legalMoves } from '../../src/game/engine';
import { analysisKeys, type AnalysisNode } from '../../src/game/analysis';
import { fullGameStudy, type SavedAnalysis } from '../../src/game/savedAnalysis';
import { DEFAULT_PREFERENCES } from '../../src/state/preferences';
import { exportPdn } from '../../src/game/pdn';

const savedAnalysis = async (page: Page): Promise<SavedAnalysis | null> => page.evaluate(() => {
  const manifest = JSON.parse(localStorage.getItem('draughts-club-v1')!);
  const raw = manifest.activeAnalysisId ? localStorage.getItem(`opencheckers-analysis-${manifest.activeAnalysisId}`) : null;
  return raw ? JSON.parse(raw) : null;
});
const progress = async (page: Page) => Object.keys((await savedAnalysis(page))?.cache.points ?? {}).length;
const square = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name},`) });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const nodes: AnalysisNode[] = [{ id: 0, parent: null, children: [], position: createPosition(), move: null }];
  for (let id = 1; id <= 3; id++) {
    const parent = nodes[id - 1], move = legalMoves(parent.position)[0];
    parent.children.push(id);
    nodes.push({ id, parent: id - 1, children: [], position: applyMove(parent.position, move), move });
  }
  const study = fullGameStudy({ nodes, current: 1 }, 'pdn', 'Imported English game');
  await page.addInitScript(({ nodes, study, preferences }) => {
    localStorage.setItem('draughts-club-tutorial-count', '3');
    if (sessionStorage.getItem('analysis-seeded')) return;
    sessionStorage.setItem('analysis-seeded', 'yes');
    localStorage.setItem('draughts-club-v1', JSON.stringify({ version: 1, config: { variant: 'english', mode: 'friend', side: 'white', elo: 1200 }, game: { nodes: [{ ...nodes[0], children: [] }], current: 0 }, study, preferences, archive: [], solvedPuzzles: [] }));
  }, { nodes, study, preferences: DEFAULT_PREFERENCES });
  await page.goto('/analysis');
  await expect(page.getByRole('button', { name: 'New analysis', exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('draughts-club-v1')!).gameId))).toBeTruthy();
});

test('a prominent option below the board analyses the full game and graph taps navigate it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const card = page.getByTestId('computer-analysis');
  await expect(card.getByText('Computer analysis', { exact: true })).toBeVisible();
  const newButton = await page.getByRole('button', { name: 'New analysis', exact: true }).boundingBox();
  const evaluation = page.getByRole('button', { name: 'Current position evaluation', exact: true });
  await expect(evaluation).toContainText(/cp/);
  const evaluationBounds = await evaluation.boundingBox();
  expect(newButton!.x).toBeLessThan(evaluationBounds!.x);
  await expect(page.getByRole('button', { name: 'Change analysis variant', exact: true })).toHaveCount(0);
  const bounds = await card.boundingBox();
  const boardBottom = await page.getByRole('button', { name: /^[a-j]\d+,/ }).evaluateAll(squares => Math.max(...squares.map(square => square.getBoundingClientRect().bottom)));
  expect(bounds!.y).toBeGreaterThanOrEqual(boardBottom);
  await page.screenshot({ path: `artifacts/computer-analysis-entry-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Run computer analysis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop computer analysis', exact: true })).toBeVisible();
  await expect(card.getByText(/3 half-moves analysed/)).toBeVisible({ timeout: 25_000 });
  const graph = page.getByTestId('computer-analysis-graph');
  await graph.scrollIntoViewIfNeeded();
  const plot = await graph.boundingBox();
  await graph.click({ position: { x: plot!.width - 5, y: plot!.height / 2 } });
  await expect(page.getByTestId('move-navigation')).toContainText('3 / 3');
  await page.getByRole('button', { name: 'Previous analysed move', exact: true }).click();
  await expect(page.getByTestId('move-navigation')).toContainText('2 / 3');
  await expect.poll(() => progress(page)).toBe(4);
  await page.screenshot({ path: `artifacts/computer-analysis-${test.info().project.name}.png`, fullPage: true });
  await page.reload();
  await expect(card.getByText(/3 half-moves analysed/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('analysis can stop and resume, and importing a position preserves the saved game', async ({ page }) => {
  await page.getByRole('button', { name: 'Run computer analysis', exact: true }).click();
  await expect.poll(() => progress(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Stop computer analysis', exact: true }).click();
  await expect(page.getByText(/Paused .* Results saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Resume computer analysis', exact: true }).click();
  await expect(page.getByText(/3 half-moves analysed/)).toBeVisible({ timeout: 25_000 });
  await page.getByRole('button', { name: 'Import or export position', exact: true }).click();
  await page.getByRole('textbox', { name: 'Draughts FEN position' }).fill('W:WKc3:BKa7');
  await page.getByRole('button', { name: 'Load position', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run computer analysis', exact: true })).toBeDisabled();
  await expect(page.getByTestId('computer-analysis-graph')).toHaveCount(0);
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await expect(page.getByTestId('saved-analysis-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open saved analysis 1', exact: true }).click();
  await expect(page.getByText(/3 half-moves analysed/)).toBeVisible();
});

test('reimporting the same game while analysis runs cancels the old job', async ({ page }) => {
  const line = await page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).study.nodes) as AnalysisNode[];
  const pdn = exportPdn(line);
  await page.getByRole('button', { name: 'Run computer analysis', exact: true }).click();
  await expect.poll(() => progress(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Import or export position', exact: true }).click();
  await page.getByRole('textbox', { name: 'Draughts FEN position' }).fill(pdn);
  await page.getByRole('button', { name: 'Load position', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run computer analysis', exact: true })).toBeEnabled();
  await expect(page.getByTestId('computer-analysis-graph')).toHaveCount(0);
  await page.waitForTimeout(1400);
  await expect(page.getByTestId('computer-analysis-graph')).toHaveCount(0);
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await expect(page.getByTestId('saved-analysis-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Open saved analysis 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume computer analysis', exact: true })).toBeVisible();
});

test('the original analysis survives a diversion and both lines reopen from board controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Run computer analysis', exact: true }).click();
  await expect.poll(() => progress(page)).toBeGreaterThan(0);
  const originalId = (await savedAnalysis(page))!.id;
  await page.getByRole('button', { name: 'First position', exact: true }).click();
  await square(page, 'b6').click(); await square(page, 'c5').click();
  await expect(page.getByText(/original game analysis is preserved/)).toBeVisible();
  await expect(page.getByTestId('computer-analysis-graph')).toBeVisible();
  await expect(page.getByText(/3 half-moves analysed/)).toBeVisible({ timeout: 25_000 });
  await expect.poll(async () => (await savedAnalysis(page))?.id).toBe(originalId);
  await page.getByRole('button', { name: 'Return to main line', exact: true }).click();
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  await expect(square(page, 'c5')).toHaveAccessibleName(/empty/);
  await page.getByRole('button', { name: 'Choose analysis variation', exact: true }).click();
  await page.getByRole('button', { name: 'Select variation 1', exact: true }).click();
  await expect(square(page, 'c5')).toHaveAccessibleName(/Coral man/);
  await page.reload();
  await expect(square(page, 'c5')).toHaveAccessibleName(/Coral man/);
  await expect(page.getByText(/3 half-moves analysed/)).toBeVisible();
  await page.screenshot({ path: `artifacts/saved-analysis-variation-${test.info().project.name}.png`, fullPage: true });
});

test('a sixth explicit request prunes only the oldest saved analysis and reopening does not reorder the five', async ({ page }) => {
  const tree = await page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).study);
  const keys = analysisKeys(tree.nodes);
  const entries: SavedAnalysis[] = [5, 4, 3, 2, 1].map(number => ({
    id: `seed-${number}`, requestedAt: `2026-10-30T12:00:0${number}.000Z`, title: `Saved game ${number}`, tree,
    mainLine: [0, 1, 2, 3], status: 'complete', cache: { version: 1, points: Object.fromEntries(keys.map((key, index) => [index, { key, score: 0, depth: 4, bestMove: null, moveScores: {} }])) },
  }));
  await page.evaluate(entries => {
    const manifest = JSON.parse(localStorage.getItem('draughts-club-v1')!);
    manifest.analysisIds = entries.map(entry => entry.id); manifest.activeAnalysisId = entries[0].id;
    for (const entry of entries) localStorage.setItem(`opencheckers-analysis-${entry.id}`, JSON.stringify(entry));
    localStorage.setItem('draughts-club-v1', JSON.stringify(manifest));
  }, entries);
  await page.reload();
  await page.getByRole('button', { name: 'Reanalyse game', exact: true }).click();
  await page.getByRole('button', { name: 'Stop computer analysis', exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('opencheckers-analysis-seed-1'))).toBeNull();
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).analysisIds) as string[];
  expect(ids).toHaveLength(5); expect(ids.slice(1)).toEqual(['seed-5', 'seed-4', 'seed-3', 'seed-2']);
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await expect(page.getByTestId('saved-analysis-item')).toHaveCount(5);
  await page.getByRole('button', { name: 'Open saved analysis 3', exact: true }).click();
  await expect.poll(async () => (await savedAnalysis(page))?.id).toBe('seed-4');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).analysisIds)).toEqual(ids);
  await page.reload();
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await expect(page.getByTestId('saved-analysis-item')).toHaveCount(5);
});

test('position boards and unfinished played games do not consume analysis slots', async ({ page }) => {
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await page.getByRole('button', { name: 'New Russian position', exact: true }).click();
  await square(page, 'c3').click(); await square(page, 'd4').click();
  await expect(page.getByRole('button', { name: 'Run computer analysis', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Current position evaluation', exact: true })).toContainText(/cp/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).analysisIds)).toEqual([]);
  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await page.getByRole('button', { name: 'Analyze game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run computer analysis', exact: true })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).analysisIds)).toEqual([]);
});
