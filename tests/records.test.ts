import assert from 'node:assert/strict';
import test from 'node:test';
import { appendResult, calculateRating, initialRecord, levelRecord, restoreRecord, type CompletedGame } from '../src/game/records.ts';

const result = (overrides: Partial<CompletedGame> = {}): CompletedGame => ({ id: 'test-1', date: '2026-10-29T10:00:00.000Z', variant: 'english', mode: 'computer', elo: 1200, userSide: 'black', winner: 'black', reason: 'No legal moves remaining', moves: 3, pdn: '1. 11-15 *', ...overrides });
test('Elo uses result and opponent strength, including draws and rating floor', () => {
  assert.deepEqual(calculateRating(1200, 1200, 1), { before: 1200, after: 1216, change: 16 });
  assert.equal(calculateRating(1200, 1200, 0).after, 1184);
  assert.equal(calculateRating(1200, 1200, 0.5).after, 1200);
  assert.ok(calculateRating(1200, 2000, 1).change > calculateRating(1200, 800, 1).change);
  assert.ok(calculateRating(1200, 2000, 0.5).change > 0);
  assert.ok(calculateRating(1200, 400, 0.5).change < 0);
  assert.equal(calculateRating(100, 100, 0).after, 100);
});
test('Archived results carry before/after rating and repeated completion is idempotent', () => {
  const record = appendResult(initialRecord(), result());
  assert.equal(record.archive[0].opponentName, 'Jasper');
  assert.equal(record.archive[0].ratingBefore, 1200);
  assert.equal(record.archive[0].ratingAfter, 1216);
  assert.equal(record.archive[0].ratingChange, 16);
  assert.deepEqual(record.stats, { played: 1, wins: 1, draws: 0, losses: 0, bestElo: 1200, streak: 1 });
  assert.equal(appendResult(record, result()), record);
});
test('Both player colors and all difficulty levels keep accurate independent records', () => {
  let record = appendResult(initialRecord(), result({ id: '1', elo: 400, userSide: 'white', winner: 'white' }));
  record = appendResult(record, result({ id: '2', elo: 800, winner: null }));
  record = appendResult(record, result({ id: '3', elo: 2400, winner: 'white' }));
  assert.deepEqual(levelRecord(record.archive, 'english', 400), { played: 1, wins: 1, draws: 0, losses: 0 });
  assert.deepEqual(levelRecord(record.archive, 'english', 800), { played: 1, wins: 0, draws: 1, losses: 0 });
  assert.deepEqual(levelRecord(record.archive, 'english', 2400), { played: 1, wins: 0, draws: 0, losses: 1 });
  assert.equal(record.stats.played, 3);
  assert.equal(record.stats.streak, 0);
});
test('Two-player results are archived without changing CPU stats or variant ratings', () => {
  const initial = initialRecord();
  const local = appendResult(initial, result({ mode: 'friend' }));
  assert.equal(local.archive.length, 1);
  assert.deepEqual(local.ratings, initial.ratings);
  assert.deepEqual(local.stats, initial.stats);
  const russian = appendResult(local, result({ id: 'russian', variant: 'russian' }));
  assert.equal(russian.ratings.russian.value, 1216);
  assert.equal(russian.ratings.english.value, 1200);
});
test('History is retained beyond 20 games and legacy results migrate chronologically once', () => {
  const entries = Array.from({ length: 32 }, (_, i) => result({ id: String(i), elo: i % 2 ? 800 : 1600 }));
  const migrated = restoreRecord({ archive: entries.slice().reverse() });
  assert.equal(migrated.archive.length, 32);
  assert.equal(migrated.ratings.english.games, 32);
  assert.equal(migrated.archive[31].ratingBefore, 1200);
  assert.equal(migrated.archive[0].ratingBefore, migrated.archive[1].ratingAfter);
  assert.deepEqual(restoreRecord(JSON.parse(JSON.stringify(migrated))), migrated);
});
