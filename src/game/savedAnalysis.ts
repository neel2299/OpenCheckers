import { analysisKeys, type AnalysisCache, type AnalysisNode, type AnalysisTree, type GameEvaluation } from './analysis.ts';

export const SAVED_ANALYSIS_LIMIT = 5;
export interface AnalysisGameSource {
  kind: 'completed-game' | 'pdn';
  title: string;
  mainLine: number[];
}
export interface StudyTree extends AnalysisTree { gameSource?: AnalysisGameSource }
export interface SavedAnalysis {
  id: string;
  requestedAt: string;
  title: string;
  tree: StudyTree;
  mainLine: number[];
  cache: AnalysisCache;
  status: 'running' | 'paused' | 'complete';
}
export interface AnalysisWorkspace { draft: StudyTree; items: SavedAnalysis[]; activeId: string | null }

export function mainLineIds(tree: AnalysisTree): number[] {
  const ids: number[] = [];
  let node = tree.nodes[0];
  while (node) { ids.push(node.id); node = tree.nodes[node.children[0]]; }
  return ids;
}
export function validMainLine(tree: AnalysisTree, ids: number[]): boolean {
  return Array.isArray(ids) && ids.length > 1 && ids[0] === 0 && ids.every((id, index) => tree.nodes[id]?.id === id && (index === 0 || tree.nodes[id].parent === ids[index - 1]));
}
export function fullGameStudy(tree: StudyTree, kind: AnalysisGameSource['kind'], title: string): StudyTree {
  return { ...tree, gameSource: { kind, title, mainLine: mainLineIds(tree) } };
}
export function canSaveAnalysis(tree: StudyTree): boolean {
  return Boolean(tree.gameSource && (tree.gameSource.kind === 'completed-game' || tree.gameSource.kind === 'pdn') && validMainLine(tree, tree.gameSource.mainLine));
}
export const currentStudy = (workspace: AnalysisWorkspace): StudyTree => workspace.items.find(item => item.id === workspace.activeId)?.tree ?? workspace.draft;
export const activeSavedAnalysis = (workspace: AnalysisWorkspace) => workspace.items.find(item => item.id === workspace.activeId) ?? null;

function pauseActive(workspace: AnalysisWorkspace) {
  return workspace.items.map(item => item.id === workspace.activeId && item.status === 'running' ? { ...item, status: 'paused' as const } : item);
}
export function startStudy(workspace: AnalysisWorkspace, tree: StudyTree): AnalysisWorkspace {
  return { draft: tree, items: pauseActive(workspace), activeId: null };
}
export function selectSavedAnalysis(workspace: AnalysisWorkspace, id: string): AnalysisWorkspace {
  if (workspace.activeId === id || !workspace.items.some(item => item.id === id)) return workspace;
  return { ...workspace, items: pauseActive(workspace), activeId: id };
}
export function updateStudy(workspace: AnalysisWorkspace, update: StudyTree | ((tree: StudyTree) => StudyTree)): AnalysisWorkspace {
  const tree = currentStudy(workspace);
  const next = typeof update === 'function' ? update(tree) : update;
  if (next === tree) return workspace;
  return workspace.activeId
    ? { ...workspace, items: workspace.items.map(item => item.id === workspace.activeId ? { ...item, tree: next } : item) }
    : { ...workspace, draft: next };
}
/** A new request is a new item, including Run again on the same game. */
export function requestSavedAnalysis(workspace: AnalysisWorkspace, id: string, requestedAt: string): AnalysisWorkspace {
  const tree = currentStudy(workspace);
  if (!canSaveAnalysis(tree)) return workspace;
  const item: SavedAnalysis = { id, requestedAt, title: tree.gameSource!.title, tree, mainLine: [...tree.gameSource!.mainLine], cache: { version: 1, points: {} }, status: 'running' };
  return { ...workspace, activeId: id, items: [item, ...pauseActive(workspace)].slice(0, SAVED_ANALYSIS_LIMIT) };
}
export function updateSavedEvaluation(workspace: AnalysisWorkspace, id: string, nodeId: number, point: GameEvaluation): AnalysisWorkspace {
  const item = workspace.items.find(entry => entry.id === id);
  if (!item || item.status !== 'running' || !item.mainLine.includes(nodeId)) return workspace;
  const keys = analysisKeys(item.mainLine.map(node => item.tree.nodes[node]));
  if (point.key !== keys[item.mainLine.indexOf(nodeId)]) return workspace;
  const points = { ...item.cache.points, [nodeId]: point };
  const complete = item.mainLine.every((node, index) => points[node]?.key === keys[index]);
  return { ...workspace, items: workspace.items.map(entry => entry.id === id ? { ...entry, cache: { version: 1, points }, status: complete ? 'complete' : 'running' } : entry) };
}
export function setAnalysisRunning(workspace: AnalysisWorkspace, id: string, running: boolean): AnalysisWorkspace {
  return { ...workspace, items: workspace.items.map(item => item.id === id && item.status !== 'complete' ? { ...item, status: running ? 'running' : 'paused' } : item) };
}

export function stripLegacyAnalysis(tree: StudyTree): StudyTree {
  const copy = { ...tree } as StudyTree & { computerAnalysis?: unknown };
  delete copy.computerAnalysis;
  return copy;
}
/** Running jobs restore paused. Only the five request records are retained. */
export function restoreAnalysisWorkspace(draft: StudyTree, rawItems: unknown[], activeId: unknown): AnalysisWorkspace {
  const items: SavedAnalysis[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as SavedAnalysis;
    if (typeof item.id !== 'string' || !item.id || items.some(other => other.id === item.id) || typeof item.title !== 'string' || !Number.isFinite(Date.parse(item.requestedAt)) || !item.tree?.nodes?.[item.tree.current] || !canSaveAnalysis(item.tree) || !Array.isArray(item.mainLine) || !validMainLine(item.tree, item.mainLine) || item.cache?.version !== 1 || !item.cache.points) continue;
    const keys = analysisKeys(item.mainLine.map(id => item.tree.nodes[id]));
    const points: Record<number, GameEvaluation> = {};
    item.mainLine.forEach((id, index) => {
      const point = item.cache.points[id];
      if (point?.key === keys[index] && Number.isFinite(point.score) && Number.isFinite(point.depth) && point.moveScores && typeof point.moveScores === 'object') points[id] = point;
    });
    items.push({ ...item, tree: stripLegacyAnalysis(item.tree), cache: { version: 1, points }, status: Object.keys(points).length === item.mainLine.length ? 'complete' : 'paused' });
    if (items.length === SAVED_ANALYSIS_LIMIT) break;
  }
  return { draft: stripLegacyAnalysis(draft), items, activeId: typeof activeId === 'string' && items.some(item => item.id === activeId) ? activeId : null };
}

/** Every variation remains selectable from controls attached to the board. */
export function studyLines(tree: StudyTree, mainLine: number[]) {
  const leaves = tree.nodes.filter(node => !node.children.length);
  const mainLeaf = mainLine[mainLine.length - 1] ?? 0;
  return [{ leaf: mainLeaf, label: 'Main line' }, ...leaves.filter(node => node.id !== mainLeaf).map((node, index) => ({ leaf: node.id, label: `Variation ${index + 1}` }))];
}

export function selectStudyLine(tree: StudyTree, leaf: number): StudyTree {
  const pathTo = (id: number) => {
    const path: number[] = [];
    let node: AnalysisNode | undefined = tree.nodes[id];
    while (node) { path.unshift(node.id); node = node.parent === null ? undefined : tree.nodes[node.parent]; }
    return path;
  };
  const path = pathTo(leaf);
  if (!path.length) return tree;
  const previous = pathTo(tree.current);
  let current = path[Math.min(previous.length - 1, path.length - 1)];
  if (current === tree.current) current = path.find(id => !previous.includes(id)) ?? current;
  return { ...tree, current, reviewLeaf: leaf };
}
