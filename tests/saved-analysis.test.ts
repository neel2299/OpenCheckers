import assert from 'node:assert/strict';
import test from 'node:test';
import { applyMove, createPosition, legalMoves } from '../src/game/engine.ts';
import { analysisKeys, displayLine, type AnalysisNode, type GameEvaluation } from '../src/game/analysis.ts';
import { canSaveAnalysis, currentStudy, fullGameStudy, requestSavedAnalysis, restoreAnalysisWorkspace, selectSavedAnalysis, selectStudyLine, setAnalysisRunning, startStudy, studyLines, updateSavedEvaluation, updateStudy, type AnalysisWorkspace, type StudyTree } from '../src/game/savedAnalysis.ts';

function game(): StudyTree {
  const nodes: AnalysisNode[] = [{ id: 0, parent: null, children: [], position: createPosition(), move: null }];
  for (let id = 1; id <= 3; id++) {
    const parent = nodes[id - 1], move = legalMoves(parent.position)[0];
    parent.children.push(id);
    nodes.push({ id, parent: id - 1, children: [], position: applyMove(parent.position, move), move });
  }
  return { nodes, current: 1 };
}
const initial = (): AnalysisWorkspace => ({ draft: fullGameStudy(game(), 'pdn', 'Imported game'), items: [], activeId: null });
const request = (workspace: AnalysisWorkspace, id: number) => requestSavedAnalysis(workspace, `request-${id}`, `2026-10-30T12:00:0${id}.000Z`);
const pointFor = (workspace: AnalysisWorkspace, nodeId: number): GameEvaluation => {
  const item = workspace.items.find(item => item.id === workspace.activeId)!;
  const keys = analysisKeys(item.mainLine.map(id => item.tree.nodes[id]));
  return { key: keys[item.mainLine.indexOf(nodeId)], score: nodeId * 10, depth: 6, bestMove: null, moveScores: {} };
};

test('only a completed game or imported PDN can create a saved request', () => {
  const workspace = { ...initial(), draft: game() };
  assert.equal(canSaveAnalysis(workspace.draft), false);
  assert.equal(request(workspace, 1), workspace);
  assert.equal(canSaveAnalysis(fullGameStudy(game(), 'completed-game', 'Finished game')), true);
  assert.equal(canSaveAnalysis(initial().draft), true);
  const position = { nodes: [game().nodes[0]], current: 0 };
  assert.equal(canSaveAnalysis(position), false);
});

test('the five slots count new requests, including the same game, and opening or resuming does not reorder them', () => {
  let workspace = initial();
  for (let index = 1; index <= 6; index++) workspace = request(workspace, index);
  assert.deepEqual(workspace.items.map(item => item.id), ['request-6', 'request-5', 'request-4', 'request-3', 'request-2']);
  assert.equal(workspace.activeId, 'request-6');
  workspace = selectSavedAnalysis(workspace, 'request-3');
  workspace = setAnalysisRunning(workspace, 'request-3', true);
  assert.deepEqual(workspace.items.map(item => item.id), ['request-6', 'request-5', 'request-4', 'request-3', 'request-2']);
  assert.equal(workspace.items[0].status, 'paused');
});

test('a variation never resets the original plot or the running full-game request', () => {
  let workspace = request(initial(), 1);
  workspace = updateSavedEvaluation(workspace, 'request-1', 0, pointFor(workspace, 0));
  const originalKey = workspace.items[0].cache.points[0].key;
  workspace = updateStudy(workspace, tree => {
    const move = legalMoves(tree.nodes[0].position)[1];
    return { ...tree, nodes: [...tree.nodes.map(node => node.id === 0 ? { ...node, children: [...node.children, 4] } : node), { id: 4, parent: 0, children: [], position: applyMove(tree.nodes[0].position, move), move }], current: 4, reviewLeaf: 4 };
  });
  assert.equal(workspace.activeId, 'request-1');
  assert.deepEqual(workspace.items[0].mainLine, [0, 1, 2, 3]);
  assert.equal(workspace.items[0].cache.points[0].key, originalKey);
  for (const id of [1, 2, 3]) workspace = updateSavedEvaluation(workspace, 'request-1', id, pointFor(workspace, id));
  assert.equal(workspace.items[0].status, 'complete');
  assert.equal(workspace.items[0].tree.current, 4);
  assert.equal(studyLines(currentStudy(workspace), workspace.items[0].mainLine).length, 2);
  const main = selectStudyLine(currentStudy(workspace), 3);
  assert.equal(main.current, 1);
  const variation = selectStudyLine(main, 4);
  assert.equal(variation.current, 4);
  assert.equal(workspace.items.length, 1);
});

test('starting a new board and reopening an analysis preserve each request and its variations', () => {
  let workspace = request(initial(), 1);
  workspace = updateSavedEvaluation(workspace, 'request-1', 0, pointFor(workspace, 0));
  const saved = workspace.items[0];
  workspace = startStudy(workspace, { nodes: [game().nodes[0]], current: 0 });
  assert.equal(workspace.activeId, null);
  assert.equal(workspace.items[0].cache, saved.cache);
  workspace = selectSavedAnalysis(workspace, saved.id);
  assert.equal(currentStudy(workspace), saved.tree);
  assert.equal(workspace.items.length, 1);
});

test('late results for paused or evicted requests cannot update the active analysis', () => {
  let workspace = request(initial(), 1);
  const stale = pointFor(workspace, 0);
  workspace = request(workspace, 2);
  assert.equal(updateSavedEvaluation(workspace, 'request-1', 0, stale), workspace);
  for (let index = 3; index <= 6; index++) workspace = request(workspace, index);
  assert.equal(updateSavedEvaluation(workspace, 'request-1', 0, stale), workspace);
  assert.equal(Object.keys(workspace.items[0].cache.points).length, 0);
});

test('restore bounds the library, pauses unfinished work, validates cached positions, and strips generic caches', () => {
  let workspace = initial();
  for (let index = 1; index <= 6; index++) workspace = request(workspace, index);
  workspace = updateSavedEvaluation(workspace, 'request-6', 0, pointFor(workspace, 0));
  const raw = JSON.parse(JSON.stringify(workspace.items));
  raw[0].cache.points[1] = { ...raw[0].cache.points[0], key: 'stale-position' };
  const restored = restoreAnalysisWorkspace({ ...game(), computerAnalysis: { version: 1 } } as StudyTree, [...raw, { id: 'broken' }], workspace.activeId);
  assert.equal(restored.items.length, 5);
  assert.equal(restored.items[0].status, 'paused');
  assert.deepEqual(Object.keys(restored.items[0].cache.points), ['0']);
  assert.equal('computerAnalysis' in restored.draft, false);
  assert.equal(restoreAnalysisWorkspace(game(), raw, 'missing').activeId, null);
});

test('the original game endpoint stays selectable after adding moves beyond it', () => {
  const tree = game();
  const move = legalMoves(tree.nodes[3].position)[0];
  tree.nodes[3].children = [4];
  tree.nodes.push({ id: 4, parent: 3, children: [], position: applyMove(tree.nodes[3].position, move), move });
  assert.deepEqual(displayLine({ ...tree, current: 1, reviewLeaf: 3 }).map(node => node.id), [0, 1, 2, 3]);
  assert.deepEqual(displayLine({ ...tree, current: 4, reviewLeaf: 4 }).map(node => node.id), [0, 1, 2, 3, 4]);
});
