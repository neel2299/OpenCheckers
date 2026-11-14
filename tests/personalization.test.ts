import assert from 'node:assert/strict';
import test from 'node:test';
import { SOUND_EVENTS, defaultPersonalization, personalizationAssets, restoreMediaAsset, restorePersonalization, validateImport, type MediaAsset } from '../src/personalization/model.ts';
import { restorePreferences } from '../src/state/preferences.ts';

const image: MediaAsset = { id: 'media-picture-123.png', name: 'My board.png', kind: 'image', bytes: 2048 };
const audio: MediaAsset = { id: 'media-sound-123.wav', name: 'My move.wav', kind: 'audio', bytes: 4096 };

test('fresh and untouched legacy rooms use dark green dots while custom rooms survive', () => {
  assert.equal(defaultPersonalization().background.color, '#173D30');
  assert.equal(restorePersonalization({}).background.texture, 'dots');
  const original = { color: '#F3F5F1', texture: 'none', imageOpacity: 0.5 };
  assert.equal(restorePersonalization({ background: original }).background.texture, 'dots');
  assert.equal(restorePersonalization({ background: { ...original, texture: 'linen' } }).background.color, '#F3F5F1');
  assert.equal(restorePersonalization({ background: { ...original, color: '#123456' } }).background.texture, 'none');
  assert.equal(restorePersonalization({ background: { ...original, image } }).background.color, '#F3F5F1');
  const current = defaultPersonalization();
  current.background = { ...original, texture: 'none' };
  assert.equal(restorePersonalization(JSON.parse(JSON.stringify(current))).background.color, '#F3F5F1');
  assert.equal(restorePersonalization(JSON.parse(JSON.stringify(current))).background.texture, 'none');
});

test('legacy preferences gain independent appearance and eight sound choices without losing saved settings', () => {
  const preferences = restorePreferences({ theme: 'walnut', sound: false, numbers: true, volume: 0.75 });
  assert.equal(preferences.theme, 'walnut');
  assert.equal(preferences.sound, false);
  assert.equal(preferences.numbers, true);
  assert.equal(preferences.volume, 0.75);
  assert.deepEqual(Object.keys(preferences.personalization.sounds), SOUND_EVENTS.map(event => event.id));
  const other = defaultPersonalization();
  preferences.personalization.sounds.undo.volume = 0;
  assert.equal(other.sounds.undo.volume, 1);
  assert.equal(preferences.personalization.sounds.move.volume, 1);
});

test('appearance and event sounds survive JSON reloads while file data stays outside preferences', () => {
  const settings = defaultPersonalization();
  settings.background = { color: '#EEE7F4', texture: 'linen', imageOpacity: 0.75, image };
  settings.board = { palette: { dark: '#335544', light: '#FFF6E8', frame: '#DDEEDD', last: '#CCDD88' }, texture: 'wood', textureOpacity: 0.5, images: { dark: image } };
  settings.pieces.images.black = image;
  settings.sounds.move = { source: 'custom', asset: audio, volume: 0.5 };
  settings.sounds.undo = { source: 'mute', asset: audio, volume: 0.25 };
  const restored = restorePersonalization(JSON.parse(JSON.stringify(settings)));
  assert.deepEqual(restored.background, settings.background);
  assert.deepEqual(restored.board.palette, settings.board.palette);
  assert.equal(restored.pieces.images.black?.id, image.id);
  assert.deepEqual(restored.sounds.move, settings.sounds.move);
  assert.deepEqual(restored.sounds.undo, settings.sounds.undo);
  assert.deepEqual(personalizationAssets(restored).map(asset => asset.id), [image.id, audio.id]);
  assert.ok(JSON.stringify(restored).length < 3000);
});

test('corrupt appearance settings and missing custom sounds fall back to safe defaults', () => {
  const restored = restorePersonalization({ background: { color: 'red;url(x)', texture: 'unknown', imageOpacity: 5 }, board: { palette: { dark: '#000000' }, textureOpacity: -2 }, pieces: { white: 'nope' }, sounds: { move: { source: 'custom', volume: Infinity }, undo: { source: 'capture', volume: -1 } } });
  assert.equal(restored.background.color, '#173D30');
  assert.equal(restored.background.texture, 'dots');
  assert.equal(restored.background.imageOpacity, 1);
  assert.equal(restored.board.palette, undefined);
  assert.equal(restored.board.textureOpacity, 0);
  assert.equal(restored.pieces.white, '#FAF6E9');
  assert.equal(restored.sounds.move.source, 'default');
  assert.equal(restored.sounds.move.volume, 1);
  assert.equal(restored.sounds.undo.source, 'capture');
  assert.equal(restored.sounds.undo.volume, 0);
});

test('saved media references accept only app-owned IDs and matching file kinds', () => {
  assert.deepEqual(restoreMediaAsset(image, 'image'), image);
  assert.equal(restoreMediaAsset({ ...image, id: '../../private.png' }, 'image'), undefined);
  assert.equal(restoreMediaAsset({ ...image, id: 'https://example.com/image.png' }, 'image'), undefined);
  assert.equal(restoreMediaAsset({ ...image, id: 'media-wrong.wav' }, 'image'), undefined);
  assert.equal(restoreMediaAsset(audio, 'image'), undefined);
  assert.equal(restoreMediaAsset({ ...audio, bytes: 6 * 1024 * 1024 }, 'audio'), undefined);
});

test('imports enforce supported formats and size limits before decoding or saving files', () => {
  assert.equal(validateImport('Photo.JPEG', 'image', 1024), 'jpg');
  assert.equal(validateImport('clip.M4A', 'audio', 2048), 'm4a');
  assert.throws(() => validateImport('notes.txt', 'image', 100), /JPG, PNG, or WebP/);
  assert.throws(() => validateImport('track.mp3', 'audio', 6 * 1024 * 1024), /under 5 MB/);
  assert.throws(() => validateImport('image.png', 'image', 13 * 1024 * 1024), /under 12 MB/);
  assert.throws(() => validateImport('empty.wav', 'audio', 0), /under 5 MB/);
});
