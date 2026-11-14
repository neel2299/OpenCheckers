import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, createPosition, fromFen, legalMoves, materialSummary, notation, outcome, positionKey, squareIndex, squareNumber, toFen, type Position } from '../src/game/engine.ts';
import { exportPdn, importPdn, importPositionOrPdn } from '../src/game/pdn.ts';
import { PUZZLES, checkPuzzleMove, getPuzzlePosition, getPuzzleSolutionMoves } from '../src/game/puzzles.ts';
import { positionalBreakdown, search } from '../src/game/ai.ts';
import { VARIANTS, type Side, type VariantId } from '../src/game/variants.ts';

function setup(variant: VariantId, turn: Side, pieces: Record<string, string>): Position {
  const p = createPosition(variant); p.board.fill(null); p.turn = turn;
  for (const [square, token] of Object.entries(pieces)) {
    const col = square.charCodeAt(0) - 97, row = VARIANTS[variant].size - Number(square.slice(1));
    p.board[row * VARIANTS[variant].size + col] = { side: token.toLowerCase() === 'w' ? 'white' : 'black', king: token === token.toUpperCase() };
  }
  return p;
}
const coord = (index: number, size: number) => String.fromCharCode(97 + index % size) + (size - Math.floor(index / size));
const route = (p: Position) => legalMoves(p).map(m => m.path.map(i => coord(i, VARIANTS[p.variant].size)).join('-'));

for (const variant of Object.keys(VARIANTS) as VariantId[]) {
  test(`${variant}: correct setup, side to move, opening moves, notation round-trip`, () => {
    const p = createPosition(variant), rules = VARIANTS[variant];
    assert.equal(p.board.filter(piece => piece?.side === 'white').length, rules.size * rules.rows / 2);
    assert.equal(p.turn, rules.first);
    assert.equal(legalMoves(p).length, rules.size - 1);
    assert.equal(toFen(fromFen(toFen(p), variant)), toFen(p));
    for (let n = 1; n <= rules.size ** 2 / 2; n++) assert.equal(squareNumber(squareIndex(n, rules.size), rules.size), n);
  });
  test(`${variant}: an available capture forbids a quiet move`, () => {
    const p = setup(variant, 'white', { c3: 'w', d4: 'b', a3: 'w' });
    assert.equal(legalMoves(p).length, 1);
    assert.equal(legalMoves(p)[0].captures.length, 1);
    const next = applyMove(p, legalMoves(p)[0]);
    assert.equal(next.board.filter(Boolean).length, 2);
    assert.equal(next.turn, 'black');
    assert.equal(p.board.filter(Boolean).length, 3, 'parent position is immutable');
  });
}
test('English men cannot capture backward; Russian men can', () => {
  const p = setup('english', 'white', { e5: 'w', d4: 'b' });
  assert.ok(legalMoves(p).every(m => !m.captures.length));
  assert.deepEqual(route({ ...p, variant: 'russian' }), ['e5-c3']);
});
test('English accepts either capture length; Brazilian requires the longest', () => {
  const p = setup('english', 'white', { c3: 'w', b4: 'b', d4: 'b', f6: 'b' });
  assert.deepEqual(route(p).sort(), ['c3-a5', 'c3-e5-g7']);
  assert.deepEqual(route({ ...p, variant: 'brazilian' }), ['c3-e5-g7']);
});
test('English crowning ends the capture', () => {
  const p = setup('english', 'white', { b6: 'w', c7: 'b', e7: 'b' });
  const moves = legalMoves(p);
  assert.deepEqual(route(p), ['b6-d8']);
  assert.ok(moves[0].king);
  assert.equal(applyMove(p, moves[0]).board.filter(Boolean).length, 2);
});
test('Russian mid-capture promotion continues as a flying king', () => {
  const p = setup('russian', 'white', { b6: 'w', c7: 'b', f6: 'b' });
  assert.deepEqual(route(p).sort(), ['b6-d8-g5', 'b6-d8-h4']);
  assert.ok(legalMoves(p).every(m => m.king && m.captures.length === 2));
});
test('Brazilian man stops and crowns if only a flying king could continue', () => {
  const p = setup('brazilian', 'white', { b6: 'w', c7: 'b', f6: 'b' });
  assert.deepEqual(route(p), ['b6-d8']);
  assert.ok(legalMoves(p)[0].king);
});
test('Brazilian man continues backward as a man and is not crowned off last row', () => {
  const p = setup('brazilian', 'white', { b6: 'w', c7: 'b', e7: 'b' });
  assert.deepEqual(route(p), ['b6-d8-f6']);
  assert.equal(legalMoves(p)[0].king, false);
});
test('International kings fly and can choose any landing behind a capture', () => {
  const p = setup('international', 'white', { b2: 'W', e5: 'b' });
  assert.deepEqual(route(p).sort(), ['b2-f6', 'b2-g7', 'b2-h8', 'b2-i9', 'b2-j10']);
});
test('Captured pieces remain blockers; a flying king cannot reverse through its victim', () => {
  const p = setup('russian', 'white', { d4: 'W', e5: 'b', c3: 'b' });
  assert.ok(legalMoves(p).every(m => m.captures.length === 1));
});
test('Blocked or captured-out side loses; quiet-limit and threefold positions draw', () => {
  const p = setup('english', 'white', { a7: 'w', b8: 'b' });
  assert.equal(outcome(p)?.winner, 'black');
  const initial = createPosition();
  assert.equal(outcome(initial, [initial, initial, initial])?.winner, null);
  assert.match(outcome({ ...initial, quietPly: 80 })!.reason, /No progress/);
});
test('FEN validates ranges, duplicate squares, kings, and board bounds', () => {
  assert.equal(toFen(fromFen(' W:W21-24,K25:B1-4,K8 ', 'english')), 'W:W21,22,23,24,K25:B1,2,3,4,K8');
  assert.throws(() => fromFen('W:W21,21:B1', 'english'), /twice/);
  assert.throws(() => fromFen('W:W33:B1', 'english'), /between/);
  assert.throws(() => fromFen('W:W1:B8', 'english'), /promotion row/);
  assert.throws(() => fromFen('hello', 'english'), /position/);
  assert.throws(() => fromFen('W:WKa2:BKh8', 'russian'), /playable square/);
  assert.equal(toFen(fromFen('W:BKa1:WKh8.', 'russian')), 'W:WK4:BK29');
  assert.equal(outcome(fromFen('B:WK22:B', 'english'))?.winner, 'white');
});
test('PDN import and export round-trip games across all variants', () => {
  for (const variant of Object.keys(VARIANTS) as VariantId[]) {
    let p = createPosition(variant);
    const line: { position: Position; move: ReturnType<typeof legalMoves>[number] | null }[] = [{ position: p, move: null }];
    for (let step = 0; step < 4; step++) {
      const m = legalMoves(p)[0];
      p = applyMove(p, m);
      line.push({ position: p, move: m });
    }
    const pdn = exportPdn(line);
    const imported = importPdn(pdn, variant);
    assert.equal(imported.length, line.length);
    assert.equal(positionKey(imported[imported.length - 1].position), positionKey(p));
    const autoImported = importPositionOrPdn(pdn, variant);
    assert.equal(autoImported.length, line.length);
  }
});
test('Material summary and positional breakdown track tempo, center, and back-rank guards', () => {
  const p = fromFen('W:W22,30,K25:B2,10', 'english');
  const summary = materialSummary(p);
  assert.equal(summary.white.men, 2);
  assert.equal(summary.white.kings, 1);
  assert.equal(summary.white.total, 3);
  assert.equal(summary.black.total, 2);
  assert.ok(summary.white.advantage > 0);
  const posStats = positionalBreakdown(p);
  assert.equal(posStats.white.backRank, 1);
  assert.equal(posStats.black.backRank, 1);
  assert.ok(posStats.white.tempo > 0);
});
test('All tactical puzzles have valid positions and verified winning solutions', () => {
  for (const puzzle of PUZZLES) {
    const pos = getPuzzlePosition(puzzle);
    const solutions = getPuzzleSolutionMoves(puzzle);
    assert.ok(solutions.length >= 1, `Puzzle ${puzzle.id} should have at least one legal solution move`);
    const check = checkPuzzleMove(puzzle, solutions[0]);
    assert.equal(check.correct, true);
    assert.notEqual(positionKey(check.nextPosition), positionKey(pos));
  }
});
test('PDN exports coordinate moves and declares their notation for every variant', () => {
  for (const variant of Object.keys(VARIANTS) as VariantId[]) {
    const p = createPosition(variant), move = legalMoves(p)[0];
    const text = exportPdn([{ position: p, move: null }, { position: applyMove(p, move), move }]);
    assert.match(text, /\[SetUp "1"\]/);
    const fen = /\[FEN "([^"]+)"\]/.exec(text)![1];
    assert.equal(positionKey(fromFen(fen, variant)), positionKey(p));
    assert.match(text, /\[GameType "\d+,[WB],(?:8,8|10,10),A0,0"\]/);
    assert.match(text, /1\. [a-j]\d{1,2}-[a-j]\d{1,2} \*/);
    assert.equal(importPdn(text, 'english')[0].position.variant, variant);
  }
});

test('move labels use coordinates for steps, captures, full multi-jumps, and 10x10 squares', () => {
  for (const variant of Object.keys(VARIANTS) as VariantId[]) {
    const quiet = setup(variant, 'white', { c3: 'w', h8: 'B' });
    assert.ok(legalMoves(quiet).some(move => notation(move, VARIANTS[variant].size) === 'c3-d4'));
    const capture = setup(variant, 'white', { c3: 'w', d4: 'b', f6: 'b' });
    const move = legalMoves(capture)[0];
    assert.equal(notation(move, VARIANTS[variant].size), 'c3xe5xg7');
    const shared = exportPdn([{ position: capture, move: null }, { position: applyMove(capture, move), move }]);
    assert.match(shared, variant === 'russian' ? /c3:e5:g7/ : /c3xe5xg7/);
    assert.equal(positionKey(importPdn(shared, 'english')[1].position), positionKey(applyMove(capture, move)));
  }
  const flying = setup('international', 'white', { b2: 'W', e5: 'b' });
  assert.ok(legalMoves(flying).some(move => notation(move, 10) === 'b2xj10'));
});

test('numeric legacy games import with coordinate labels and export without numeric moves', () => {
  const imported = importPdn('[GameType "21"]\n1. 11-15 23-19 *');
  assert.equal(notation(imported[1].move!, 8), 'f6-e5');
  assert.equal(notation(imported[2].move!, 8), 'e3-f4');
  assert.match(exportPdn(imported), /1\. f6-e5 e3-f4 \*/);
  assert.throws(() => importPdn('1. 11-18 *'), /Illegal move "f6-d4"/);
});
test('All six strengths return legal moves without mutating the position', async () => {
  const p = createPosition(), before = positionKey(p);
  let shallow = 0, deep = 0;
  for (const elo of [400, 800, 1200, 1600, 2000, 2400]) {
    const result = await search(p, { elo, random: () => 0.9 });
    assert.ok(legalMoves(p).some(m => m.id === result.move?.id), `Illegal move at ${elo}`);
    assert.ok(result.depth >= 1);
    if (elo === 400) shallow = result.depth;
    if (elo === 2400) deep = result.depth;
  }
  assert.ok(deep > shallow, 'Higher strength must actually search deeper');
  assert.equal(positionKey(p), before);
});
test('Strong engine chooses a forced win over a quiet king move', async () => {
  const p = setup('english', 'white', { c3: 'W', d4: 'b' });
  const result = await search(p, { elo: 2400, random: () => 1 });
  assert.ok(result.move);
  assert.equal(outcome(applyMove(p, result.move!))?.winner, 'white');
  assert.ok(result.score > 9000);
});
test('Search supports cancellation and returns promptly', async () => {
  const controller = new AbortController(); controller.abort();
  const start = Date.now();
  await search(createPosition('international'), { analysis: true, signal: controller.signal });
  assert.ok(Date.now() - start < 100);
});
test('Random legal playouts preserve piece counts, colors, and dark-square occupancy', () => {
  for (const variant of Object.keys(VARIANTS) as VariantId[]) {
    let p = createPosition(variant);
    for (let ply = 0; ply < 90; ply++) {
      const moves = legalMoves(p); if (!moves.length) break;
      const move = moves[(ply * 17 + 3) % moves.length];
      const before = p.board.filter(Boolean).length;
      const next = applyMove(p, move);
      assert.equal(next.board.filter(Boolean).length, before - move.captures.length);
      next.board.forEach((piece, i) => { if (piece) assert.equal((Math.floor(i / VARIANTS[variant].size) + i % VARIANTS[variant].size) % 2, 1); });
      p = next;
    }
  }
});
