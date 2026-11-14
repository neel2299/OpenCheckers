import { test, expect, type Page } from './fixtures';

const square = (page: Page, coordinate: string) => page.getByRole('button', { name: new RegExp(`^${coordinate},`) });
const openSetup = async (page: Page) => {
  const mobile = page.getByRole('button', { name: 'New game settings', exact: true });
  await mobile.click();
};
const start = async (page: Page, variant = 'English', elo = 400, mode = 'Computer') => {
  await openSetup(page);
  await page.getByRole('radio', { name: new RegExp(`^${variant},`) }).last().click();
  await page.getByRole('button', { name: mode, exact: true }).last().click();
  if (mode === 'Computer') await page.getByRole('radio', { name: new RegExp(`^Computer level ${elo} Elo`) }).last().click();
  await page.getByRole('radio', { name: 'Play as Coral' }).last().click();
  await page.getByRole('button', { name: 'Start a new game' }).last().click();
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('tutorial-test-seeded')) {
      localStorage.setItem('draughts-club-tutorial-count', '3');
      sessionStorage.setItem('tutorial-test-seeded', '1');
    }
  });
  await page.goto('/');
  const closeGuide = page.getByRole('button', { name: 'Close opencheckers guide', exact: true });
  if (await closeGuide.count()) {
    await page.evaluate(() => window.localStorage.setItem('draughts-club-tutorial-count', '3'));
    await closeGuide.click();
  }
  await expect(page.getByText('Play checkers', { exact: true })).toBeVisible();
});
test('play a move, receive an engine reply, take back, and persist the game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await square(page, 'b6').click();
  await expect(square(page, 'a5')).toHaveAccessibleName(/legal destination/);
  await square(page, 'a5').click();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 2');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 2');
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  await page.getByRole('button', { name: 'Take back move' }).click();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 0');
  await expect(square(page, 'b6')).toHaveAccessibleName(/Coral man/);
  expect(errors).toEqual([]);
});
test('all variants and strength controls configure a real game', async ({ page }) => {
  for (const [variant, elo, count] of [['English', 400, 32], ['International', 800, 50], ['Russian', 1600, 32], ['Brazilian', 2400, 32]] as const) {
    await start(page, variant, elo, '2 players');
    await expect(page.getByText(`${variant} checkers`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /square \d+/ })).toHaveCount(count);
  }
  await start(page, 'English', 2400);
  await expect(page.getByText(/~2400/).first()).toBeVisible();
  await square(page, 'b6').click();
  await square(page, 'a5').click();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 2');
});
test('analysis imports positions, evaluates, explores branches, and edits the board', async ({ page }) => {
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  await expect(page.getByText('Analysis board', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Import or export position' }).click();
  await page.getByRole('textbox', { name: 'Draughts FEN position' }).fill('W:WK22:BK10');
  await page.getByRole('button', { name: 'Load position', exact: true }).click();
  await expect(square(page, 'c3')).toHaveAccessibleName(/Ivory king/);
  await page.getByRole('button', { name: 'Engine', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Play candidate 1/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close engine analysis', exact: true }).click();
  await square(page, 'c3').click();
  await square(page, 'b4').click();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 1');
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await square(page, 'c3').click();
  await square(page, 'd4').click();
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await page.getByRole('button', { name: 'Move history', exact: true }).click();
  await expect(page.getByText('Variations from here').last()).toBeVisible();
  await page.getByRole('button', { name: 'Close move history', exact: true }).click();
  await page.getByRole('button', { name: 'Set up position', exact: true }).click();
  await page.getByRole('button', { name: 'Place Ivory king', exact: true }).click();
  await square(page, 'a1').click();
  await page.getByRole('button', { name: 'Use position', exact: true }).click();
  await expect(square(page, 'a1')).toHaveAccessibleName(/Ivory king/);
});
test('phone and desktop layouts fit the screen, and preferences persist', async ({ page }) => {
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'walnut board theme' }).click();
  await page.getByRole('switch', { name: 'Number the squares' }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'walnut board theme' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('switch', { name: 'Number the squares' })).toBeChecked();
  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await expect(page.getByText('Play checkers', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

test('Sound, haptics, and motion controls persist and sound playback works', async ({ page }) => {
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as typeof window & { playedAudio?: HTMLMediaElement }).playedAudio = this;
      return original.call(this);
    };
  });
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked();
  await page.getByRole('button', { name: 'Preview sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => ((window as typeof window & { playedAudio?: HTMLMediaElement }).playedAudio?.currentTime ?? 0) > 0)).toBeTruthy();
  await page.getByRole('switch', { name: 'Sound effects' }).click();
  await expect(page.getByRole('button', { name: 'Preview sound', exact: true })).toBeDisabled();
  await page.getByRole('switch', { name: 'Haptic feedback' }).click();
  await page.getByRole('switch', { name: 'Piece animations' }).click();
  await page.reload();
  for (const name of ['Sound effects', 'Haptic feedback', 'Piece animations']) await expect(page.getByRole('switch', { name })).not.toBeChecked();
});

test('Reduced motion still allows immediate board play and analysis', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page, 'English', 400, '2 players');
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  await expect(square(page, 'a5')).toBeEnabled();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Your device’s Reduce Motion setting is on.')).toBeVisible();
});

test('A piece move animates and returns board control when it lands', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await start(page, 'English', 400, '2 players');
  await page.evaluate(() => {
    const tracker = window as typeof window & { animatedMoves?: number };
    tracker.animatedMoves = 0;
    new MutationObserver(records => {
      for (const record of records) for (const added of record.addedNodes) {
        if (added instanceof Element && (added.matches('[data-testid="piece-move-animation"]') || added.querySelector('[data-testid="piece-move-animation"]'))) tracker.animatedMoves = (tracker.animatedMoves ?? 0) + 1;
      }
    }).observe(document.body, { childList: true, subtree: true });
  });
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { animatedMoves?: number }).animatedMoves ?? 0)).toBeGreaterThan(0);
  await expect(page.getByTestId('piece-move-animation')).toHaveCount(0);
  await expect(square(page, 'a5')).toBeEnabled();
});

test('Play controls remain visible above navigation on short and landscape phones', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => {
      const tabs = await page.getByRole('tablist').boundingBox();
      if (!tabs) return false;
      for (const name of ['New game settings', 'Take back move', 'Get a hint', 'Analyze game', 'Move history', 'Flip board', 'Share game and position', 'Resign game']) {
        const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
        if (!bounds || bounds.height < 43 || bounds.x < -1 || bounds.x + bounds.width > viewport.width + 1 || bounds.y < 58 || bounds.y + bounds.height > tabs.y + 1) return false;
      }
      return true;
    }, { message: `All Play actions fit ${viewport.width} × ${viewport.height} without scrolling` }).toBeTruthy();
  }
});

test('Analysis tools and editor controls remain reachable and each panel is accessible', async ({ page }) => {
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const name of ['New analysis', 'Current position evaluation', 'Engine', 'Move history', 'Set up position', 'Import or export position', 'Flip board', 'Share game and position', 'Return to main line', 'Choose analysis variation']) {
      const control = page.getByRole('button', { name, exact: true });
      await control.scrollIntoViewIfNeeded();
      await expect.poll(async () => {
      const tabs = await page.getByRole('tablist').boundingBox();
      if (!tabs) return false;
      const bounds = await control.boundingBox();
      return Boolean(bounds && bounds.height >= 43 && bounds.y + bounds.height <= tabs.y + 1 && bounds.y >= 58);
      }, { message: `${name} is reachable at ${viewport.width} × ${viewport.height}` }).toBeTruthy();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Engine', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Enable engine analysis' })).toBeVisible();
  await page.getByRole('button', { name: 'Close engine analysis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close engine analysis' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Set up position', exact: true }).click();
  for (const name of ['Place Ivory man', 'Place Ivory king', 'Place Coral man', 'Place Coral king', 'Erase piece', 'Clear board', 'Use position']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  const save = await page.getByRole('button', { name: 'Use position', exact: true }).boundingBox();
  const tabs = await page.getByRole('tablist').boundingBox();
  expect(save!.y + save!.height).toBeLessThanOrEqual(tabs!.y);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'New analysis', exact: true }).click();
  await expect(page.getByText('Saved analyses', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New English position', exact: true }).click();
});

test('Setup can be dismissed without replacing a game, and review returns to live play', async ({ page }) => {
  await start(page, 'English', 400, '2 players');
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await openSetup(page);
  await page.getByRole('radio', { name: /^International,/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText('English checkers', { exact: true })).toBeVisible();
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  await page.getByRole('button', { name: 'Move history', exact: true }).click();
  await page.getByRole('button', { name: 'First position', exact: true }).click();
  await page.getByRole('button', { name: 'Close move history', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Return to live game', exact: true })).toBeVisible();
  await expect(square(page, 'b6')).toBeDisabled();
  await page.getByRole('button', { name: 'Return to live game', exact: true }).click();
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  await expect(square(page, 'a5')).toBeEnabled();
});

test('Engine candidates play on the board and the engine can be paused', async ({ page }) => {
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  await page.getByRole('button', { name: 'Engine', exact: true }).click();
  const enabled = page.getByRole('switch', { name: 'Enable engine analysis' });
  await enabled.click();
  await expect(page.getByText('Engine paused', { exact: true }).last()).toBeVisible();
  await enabled.click();
  await page.getByRole('button', { name: /^Play candidate 1:/ }).click();
  await expect(page.getByRole('button', { name: 'Close engine analysis', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 1');
});

test('Tactical puzzles, PDN game import, and timed game setup work end-to-end', async ({ page }) => {
  await page.getByRole('tab', { name: 'Learn', exact: true }).click();
  await expect(page.getByText('Tactical puzzles', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open tactical puzzles', exact: true }).click();
  await page.getByRole('button', { name: 'Open puzzle: The greedy diagonal, English', exact: true }).click();
  await square(page, 'c3').click();
  await square(page, 'e5').click();
  await square(page, 'g7').click();
  await expect(page.getByText('Puzzle solved. Nicely calculated!', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  await page.getByRole('button', { name: 'Import or export position' }).click();
  await page.getByRole('textbox', { name: 'Draughts FEN position' }).fill('[GameType "21"]\n1. 11-15 23-19 *');
  await page.getByRole('button', { name: 'Load position', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move history', exact: true })).toContainText('Moves · 2');

  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await openSetup(page);
  await page.getByRole('radio', { name: 'Time control 3 min' }).last().click();
  await page.getByRole('button', { name: 'Start a new game' }).last().click();
  await expect(page.getByText('3:00').first()).toBeVisible();
});

test('App tutorial pops up on the first 3 visits, explains notation and analyser pointers, and can be reopened later', async ({ page }) => {
  await page.evaluate(() => window.localStorage.removeItem('draughts-club-tutorial-count'));
  for (const visit of [1, 2, 3]) {
    await page.reload();
    await expect(page.getByText('OpenCheckers guide', { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`Welcome guide \\(${visit} of 3 auto-popups\\)`))).toBeVisible();
    if (visit === 1) {
      await page.getByRole('tab', { name: 'Tutorial section: Notation', exact: true }).click();
      await expect(page.getByText('Reading coordinate moves & PDN', { exact: true })).toBeVisible();
      await page.getByRole('tab', { name: 'Tutorial section: Analyser', exact: true }).click();
      await expect(page.getByText('How to read the pro engine analyser', { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Close opencheckers guide', exact: true }).click();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'Close opencheckers guide', exact: true })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Learn', exact: true }).click();
  await page.getByRole('button', { name: 'Open interactive tutorial', exact: true }).click();
  await expect(page.getByText('OpenCheckers guide', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close opencheckers guide', exact: true }).click();
});
