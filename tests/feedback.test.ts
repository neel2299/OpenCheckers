import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, createPosition, fromFen, legalMoves } from '../src/game/engine.ts';
import { boardTransition } from '../src/game/transition.ts';
import { moveCue } from '../src/feedback/events.ts';
import { DEFAULT_PREFERENCES, restorePreferences } from '../src/state/preferences.ts';

test('Old preferences gain feedback defaults without losing existing choices', () => {
  const restored = restorePreferences({ hints: false, theme: 'walnut', numbers: true });
  assert.deepEqual(restored, { ...DEFAULT_PREFERENCES, hints: false, theme: 'walnut', numbers: true });
  assert.equal(restorePreferences({ sound: false, haptics: false, animations: false }).sound, false);
  assert.equal(restorePreferences({ volume: 10 }).volume, 1);
  assert.equal(restorePreferences({ volume: NaN, theme: 'unknown' }).theme, 'sage');
  assert.deepEqual(restorePreferences(null), DEFAULT_PREFERENCES);
});
test('A multi-capture animates every jump and preserves the captured pieces for fading', () => {
  const before = fromFen('W:W22:B18,11,1', 'english');
  const move = legalMoves(before)[0];
  assert.equal(move.captures.length, 2);
  const after = applyMove(before, move), plan = boardTransition(before, after, move);
  assert.deepEqual(plan?.path, move.path);
  assert.equal(plan?.captured.length, 2);
  assert.ok(plan?.captured.every(item => item.piece.side === 'black'));
  assert.equal(moveCue(before, move), 'capture');
});
test('Promotion has a distinct cue and crown animation', () => {
  const before = fromFen('W:W9:B6,1', 'english');
  const move = legalMoves(before)[0];
  assert.ok(move.king);
  assert.equal(moveCue(before, move), 'promotion');
  assert.equal(boardTransition(before, applyMove(before, move), move)?.promotes, true);
});
test('Reviewing backward, changing variants, and resetting do not create move animations', () => {
  const before = createPosition(), move = legalMoves(before)[0], after = applyMove(before, move);
  assert.equal(boardTransition(after, before, move), null);
  assert.equal(boardTransition(before, createPosition('international'), move), null);
  assert.equal(boardTransition(before, createPosition(), move), null);
  assert.equal(moveCue(before, move), 'move');
});

test('Restoring a completed game with another side to move cannot animate from the default board', () => {
  const before = createPosition('english');
  const savedStart = fromFen('W:Wc3:Bd4,f6', 'english');
  const move = legalMoves(savedStart)[0];
  const savedEnd = applyMove(savedStart, move);
  assert.equal(boardTransition(before, savedEnd, move), null);
});
