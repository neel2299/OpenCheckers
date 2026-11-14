import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeGameLine, analysisKeys, displayLine, reviewedMove, type AnalysisCache, type AnalysisNode, type GameEvaluation } from '../src/game/analysis.ts';
import { applyMove, createPosition, fromFen, legalMoves, type Position } from '../src/game/engine.ts';
import type { SearchResult } from '../src/game/ai.ts';

function game(plies = 3): AnalysisNode[] {
  const nodes: AnalysisNode[] = [{ id: 0, parent: null, children: [], position: createPosition(), move: null }];
  for (let id = 1; id <= plies; id++) {
    const parent = nodes[id - 1], move = legalMoves(parent.position)[0];
    parent.children.push(id);
    nodes.push({ id, parent: id - 1, children: [], position: applyMove(parent.position, move), move });
  }
  return nodes;
}
const resultFor = (position: Position): SearchResult => {
  const moves = legalMoves(position);
  return { move: moves[0], score: position.ply * 10, depth: 4, nodes: 100, lines: moves.map(move => ({ move, score: position.ply * 10, pv: [move] })) };
};

test('full game analysis searches future positions and retains the exact history', async () => {
  const nodes = game();
  const line = displayLine({ nodes, current: 1 });
  const points: GameEvaluation[] = [];
  const histories: Position[][] = [];
  await analyzeGameLine(line, undefined, {
    signal: new AbortController().signal,
    searcher: async (position, options) => { assert.equal(options.analysis, true); histories.push(options.history!); return resultFor(position); },
    onResult: (_, point) => points.push(point),
  });
  assert.equal(points.length, 4);
  assert.deepEqual(points.map(point => point.score), [0, 10, 20, 30]);
  assert.deepEqual(histories.map(history => history.length), [1, 2, 3, 4]);
  assert.equal(histories[3][3], nodes[3].position);
});

test('cancellation publishes no stale result and saved partial analysis resumes without repeating work', async () => {
  const nodes = game();
  const controller = new AbortController();
  const cache: AnalysisCache = { version: 1, points: {} };
  await analyzeGameLine(nodes, undefined, { signal: controller.signal, searcher: async position => resultFor(position), onResult: (id, point) => { cache.points[id] = point; controller.abort(); } });
  assert.deepEqual(Object.keys(cache.points), ['0']);
  let searched = 0;
  await analyzeGameLine(nodes, cache, { signal: new AbortController().signal, searcher: async (position, options) => { searched++; assert.equal(options.history!.length, position.ply + 1); return resultFor(position); }, onResult: (id, point) => { cache.points[id] = point; } });
  assert.equal(searched, 3);
  assert.equal(Object.keys(cache.points).length, 4);
  const stale = new AbortController();
  await analyzeGameLine(nodes, undefined, { signal: stale.signal, searcher: async position => { stale.abort(); return resultFor(position); }, onResult: () => assert.fail('Cancelled search published a point') });
});

test('an imported board, variant or draw history invalidates old evaluations', () => {
  const nodes = game();
  const original = analysisKeys(nodes);
  const changed = nodes.map(node => ({ ...node }));
  changed[0].position = { ...nodes[0].position, stablePly: 59 };
  assert.notDeepEqual(analysisKeys(changed), original);
  changed[0].position = createPosition('russian');
  assert.notDeepEqual(analysisKeys(changed), original);
  assert.equal(analysisKeys(displayLine({ nodes, current: 0 })).at(-1), original.at(-1));
});

test('reviewing a graph preserves its selected variation through earlier moves', () => {
  const nodes = game();
  const move = legalMoves(nodes[1].position)[1];
  nodes[1].children.push(4);
  nodes.push({ id: 4, parent: 1, children: [], position: applyMove(nodes[1].position, move), move });
  assert.deepEqual(displayLine({ nodes, current: 0, reviewLeaf: 4 }).map(node => node.id), [0, 1, 4]);
  assert.deepEqual(displayLine({ nodes, current: 3, reviewLeaf: 4 }).map(node => node.id), [0, 1, 2, 3]);
});

test('move labels compare candidate scores from the same search and respect the moving side', () => {
  const nodes = game();
  const point: GameEvaluation = { key: '', score: -250, depth: 6, bestMove: null, moveScores: { [nodes[1].move!.id]: -30 } };
  assert.deepEqual(reviewedMove(nodes, 1, [point]), { loss: 220, quality: 'Blunder' });
  const whitePoint = { ...point, score: 125, moveScores: { [nodes[2].move!.id]: 10 } };
  assert.deepEqual(reviewedMove(nodes, 2, [undefined, whitePoint]), { loss: 115, quality: 'Mistake' });
  assert.equal(reviewedMove(nodes, 0, []), null);
});

test('the real engine finds a forced win and terminal and drawn scores stay exact', async () => {
  const position = fromFen('W:WKc3:Bd4', 'english');
  const move = legalMoves(position)[0];
  const nodes: AnalysisNode[] = [{ id: 0, parent: null, children: [1], position, move: null }, { id: 1, parent: 0, children: [], position: applyMove(position, move), move }];
  const points: GameEvaluation[] = [];
  await analyzeGameLine(nodes, undefined, { signal: new AbortController().signal, onResult: (_, point) => points.push(point) });
  assert.ok(points[0].score > 9000);
  assert.equal(points[1].score, 10000);
  assert.equal(points[1].depth, 0);
  const draw = { ...nodes[0], position: { ...createPosition(), quietPly: 80 } };
  await analyzeGameLine([draw], undefined, { signal: new AbortController().signal, searcher: async () => { throw new Error('Terminal draw must not search'); }, onResult: (_, point) => assert.equal(point.score, 0) });
});
