import { test, expect, type Page } from './fixtures';
import { readFileSync } from 'node:fs';

const settings = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('draughts-club-v1')!).preferences);
const square = (page: Page, coordinate: string) => page.getByRole('button', { name: new RegExp(`^${coordinate},`) });
async function upload(page: Page, button: string, name: string, mimeType: string, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button, exact: true }).click();
  await (await chooser).setFiles({ name, mimeType, buffer });
}
async function editColor(page: Page, label: string, color: string) {
  await page.getByRole('button', { name: `Edit ${label}`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Hex color', exact: true }).fill(color);
  await page.getByRole('button', { name: 'Apply color', exact: true }).click();
}
const image = readFileSync('assets/favicon.png');
const sound = readFileSync('assets/sounds/victory.wav');
const errors = new WeakMap<Page, string[]>();
function longWav(): Buffer {
  const bytes = 8000 * 16 * 2;
  const buffer = Buffer.alloc(44 + bytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + bytes, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(bytes, 40);
  return buffer;
}

test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', error => errors.get(page)!.push(error.message));
  await page.addInitScript(() => localStorage.setItem('draughts-club-tutorial-count', '3'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Open personalization', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Settings', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

test('sounds preview repeatedly after finishing and after changing the selected source', async ({ page }) => {
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const state = window as typeof window & { previewCount?: number; previewAudio?: HTMLMediaElement };
      state.previewCount = (state.previewCount ?? 0) + 1;
      state.previewAudio = this;
      return original.call(this);
    };
  });
  await page.getByRole('tab', { name: 'Personalization Sounds', exact: true }).click();
  await page.getByRole('button', { name: 'Customize Selection sound', exact: true }).click();
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.getByRole('button', { name: 'Preview selected Selection sound', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as typeof window & { previewCount?: number }).previewCount)).toBe(attempt);
    await page.waitForFunction(() => (window as typeof window & { previewAudio?: HTMLMediaElement }).previewAudio?.ended);
  }
  await page.getByRole('radio', { name: 'Use Capture for Selection', exact: true }).click();
  await page.getByRole('button', { name: 'Preview selected Selection sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { previewCount?: number }).previewCount)).toBe(4);
  await expect(page.getByText(/could not be played|Try Preview again/)).toHaveCount(0);
});

test('room, board, and piece choices preview immediately, persist, and reset independently', async ({ page }) => {
  await page.getByRole('radio', { name: 'Background texture linen', exact: true }).click();
  await editColor(page, 'background color', '#EEE7F4');
  await page.getByRole('tab', { name: 'Customize board', exact: true }).click();
  await page.getByRole('radio', { name: 'Board texture wood', exact: true }).click();
  await editColor(page, 'dark squares color', '#354D68');
  await page.getByRole('tab', { name: 'Customize pieces', exact: true }).click();
  await page.getByRole('radio', { name: 'Piece texture marble', exact: true }).click();
  await editColor(page, 'coral piece color', '#805878');
  await expect.poll(async () => (await settings(page)).personalization.pieces.black).toBe('#805878');
  await page.reload();
  await expect.poll(async () => (await settings(page)).personalization.board.palette.dark).toBe('#354D68');
  await page.screenshot({ path: `artifacts/personalization-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('tab', { name: 'Customize pieces', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Piece texture marble', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Reset pieces', exact: true }).click();
  await expect.poll(async () => (await settings(page)).personalization.pieces.black).toBe('#CC785F');
  expect((await settings(page)).personalization.background.color).toBe('#EEE7F4');
  await page.getByRole('button', { name: 'Back to Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'walnut board theme', exact: true }).click();
  await expect.poll(async () => (await settings(page)).personalization.board.palette).toBeUndefined();
  await page.getByRole('button', { name: 'Open personalization', exact: true }).click();
  await page.getByRole('tab', { name: 'Customize board', exact: true }).click();
  await page.getByRole('button', { name: 'Reset board', exact: true }).click();
  await expect.poll(async () => (await settings(page)).theme).toBe('sage');
  await page.getByRole('tab', { name: 'Play', exact: true }).click();
  await square(page, 'b6').click(); await square(page, 'a5').click();
  await expect(square(page, 'a5')).toHaveAccessibleName(/Coral man/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
});

test('custom backgrounds, board textures, and piece images remain available after reload', async ({ page }) => {
  await upload(page, 'Import Background image', 'my-room.png', 'image/png', image);
  await expect(page.getByTestId('custom-background-image')).toBeVisible();
  await page.getByRole('tab', { name: 'Customize board', exact: true }).click();
  await upload(page, 'Import Dark squares texture', 'my-board.png', 'image/png', image);
  await expect(page.getByTestId('custom-dark-texture')).toBeAttached();
  await page.getByRole('tab', { name: 'Customize pieces', exact: true }).click();
  await upload(page, 'Import Coral piece image', 'my-piece.png', 'image/png', image);
  await expect(page.getByRole('button', { name: 'Remove Coral piece image', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('custom-background-image')).toBeVisible();
  await expect(page.getByTestId('custom-dark-texture')).toBeAttached();
  const saved = (await settings(page)).personalization;
  expect(saved.background.image.name).toBe('my-room.png');
  expect(saved.board.images.dark.name).toBe('my-board.png');
  expect(saved.pieces.images.black.name).toBe('my-piece.png');
  expect(JSON.stringify(saved).length).toBeLessThan(4000);
  await page.getByRole('tab', { name: 'Personalization Files', exact: true }).click();
  await expect(page.getByText(/3 saved files/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset all personalization', exact: true }).click();
  await page.getByRole('button', { name: 'Restore defaults', exact: true }).click();
  await expect(page.getByTestId('custom-background-image')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove unused imports', exact: true }).click();
  await expect(page.getByText('Removed 3 unused imports.', { exact: true })).toBeVisible();
});

test('every sound can be customized, with custom playback, mute, per-event volume, and durable audio', async ({ page }) => {
  await page.evaluate(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as typeof window & { personalizationAudio?: HTMLMediaElement }).personalizationAudio = this;
      return original.call(this);
    };
  });
  await page.getByRole('tab', { name: 'Personalization Sounds', exact: true }).click();
  for (const name of ['Selection', 'Move', 'Capture', 'Promotion', 'Game start', 'Game finish', 'Victory', 'Undo']) await expect(page.getByRole('button', { name: `Customize ${name} sound`, exact: true })).toHaveCount(1);
  await page.getByRole('radio', { name: 'Master volume 75%', exact: true }).click();
  await page.getByRole('button', { name: 'Customize Move sound', exact: true }).click();
  await page.getByRole('radio', { name: 'Use Capture for Move', exact: true }).click();
  await page.getByRole('radio', { name: 'Move volume 50%', exact: true }).click();
  await upload(page, 'Import Move audio', 'my-move.wav', 'audio/wav', sound);
  await expect(page.getByRole('radio', { name: 'Use imported Move audio', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: `artifacts/personalization-sound-${test.info().project.name}.png`, fullPage: true });
  await expect.poll(async () => {
    await page.getByRole('button', { name: 'Preview selected Move sound', exact: true }).click();
    return page.evaluate(() => (window as typeof window & { personalizationAudio?: HTMLMediaElement }).personalizationAudio?.src ?? '');
  }).toMatch(/^blob:/);
  expect(await page.evaluate(() => (window as typeof window & { personalizationAudio?: HTMLMediaElement }).personalizationAudio?.volume)).toBeCloseTo(0.375, 3);
  await page.getByRole('radio', { name: 'Move sound mute', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview selected Move sound', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Use imported Move audio', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Customize Undo sound', exact: true }).click();
  await page.getByRole('radio', { name: 'Use Selection for Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Personalization Sounds', exact: true }).click();
  await page.getByRole('button', { name: 'Customize Move sound', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Use imported Move audio', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: 'Move volume 50%', exact: true })).toHaveAttribute('aria-checked', 'true');
  expect((await settings(page)).personalization.sounds.undo.source).toBe('select');
});

test('invalid imports preserve the existing choice and long audio clips are rejected', async ({ page }) => {
  await upload(page, 'Import Background image', 'notes.txt', 'text/plain', Buffer.from('not an image'));
  await expect(page.getByText('Choose a JPG, PNG, or WebP image.', { exact: true })).toBeVisible();
  expect((await settings(page)).personalization.background.image).toBeUndefined();
  await page.getByRole('tab', { name: 'Personalization Sounds', exact: true }).click();
  await page.getByRole('button', { name: 'Customize Capture sound', exact: true }).click();
  await upload(page, 'Import Capture audio', 'too-long.wav', 'audio/wav', longWav());
  await expect(page.getByRole('dialog').getByText('Use a sound clip between 0 and 15 seconds long.', { exact: true })).toBeVisible();
  expect((await settings(page)).personalization.sounds.capture.source).toBe('default');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    await expect(page.getByRole('tab', { name: 'Personalization Files', exact: true })).toBeVisible();
  }
});
