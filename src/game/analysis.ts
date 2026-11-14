import { outcome, positionKey, type Move, type Position } from './engine.ts';
import { search, type SearchOptions, type SearchResult } from './ai.ts';

export interface AnalysisNode { id: number; parent: number | null; children: number[]; position: Position; move: Move | null }
export interface AnalysisTree { nodes: AnalysisNode[]; current: number; reviewLeaf?: number }
export interface GameEvaluation {
  key: string;
  score: number;
  depth: number;
  bestMove: string | null;
  moveScores: Record<string, number>;
}
export interface AnalysisCache { version: 1; points: Record<number, GameEvaluation> }
export type MoveQuality = 'Inaccuracy' | 'Mistake' | 'Blunder';

/** Keep the chosen variation when reviewing an earlier point on its graph. */
export function displayLine<T extends AnalysisNode>(tree: { nodes: T[]; current: number; reviewLeaf?: number }): T[] {
  const pathTo = (id: number) => {
    const path: T[] = [];
    let node: T | undefined = tree.nodes[id];
    while (node) { path.unshift(node); node = node.parent === null ? undefined : tree.nodes[node.parent]; }
    return path;
  };
  const preferred = tree.reviewLeaf === undefined ? [] : pathTo(tree.reviewLeaf);
  if (preferred.some(node => node.id === tree.current)) return preferred;
  const path = pathTo(tree.current);
  let node = path[path.length - 1];
  while (node?.children.length) { node = tree.nodes[node.children[0]]; path.push(node); }
  return path;
}

// Include the full move history: identical boards can have different draw
// evaluations. Navigation does not change these keys; imports and edits do.
export function analysisKeys(line: AnalysisNode[]): string[] {
  let key = '';
  return line.map((node, index) => {
    key = index === 0 ? `${positionKey(node.position)}:${node.position.quietPly}:${node.position.stablePly}` : `${key}/${node.move?.id}`;
    return key;
  });
}

export function reviewedMove(line: AnalysisNode[], index: number, points: (GameEvaluation | undefined)[]) {
  const previous = points[index - 1];
  const move = line[index]?.move;
  if (!previous || !move) return null;
  const playedScore = previous.moveScores[move.id];
  if (playedScore === undefined) return null;
  const loss = Math.max(0, Math.round((previous.score - playedScore) * (line[index - 1].position.turn === 'white' ? 1 : -1)));
  const quality: MoveQuality | null = loss >= 200 ? 'Blunder' : loss >= 100 ? 'Mistake' : loss >= 50 ? 'Inaccuracy' : null;
  return { loss, quality };
}

type Searcher = (position: Position, options: SearchOptions) => Promise<SearchResult>;
export async function analyzeGameLine(line: AnalysisNode[], cache: AnalysisCache | undefined, options: {
  signal: AbortSignal;
  onResult: (id: number, result: GameEvaluation) => void;
  searcher?: Searcher;
}): Promise<void> {
  const keys = analysisKeys(line);
  const history: Position[] = [];
  for (let index = 0; index < line.length; index++) {
    if (options.signal.aborted) return;
    const node = line[index];
    history.push(node.position);
    if (cache?.version === 1 && cache.points[node.id]?.key === keys[index]) continue;
    const finished = outcome(node.position, history);
    let point: GameEvaluation;
    if (finished) {
      point = { key: keys[index], score: finished.winner === null ? 0 : finished.winner === 'white' ? 10000 : -10000, depth: 0, bestMove: null, moveScores: {} };
    } else {
      const result = await (options.searcher ?? search)(node.position, { analysis: true, signal: options.signal, history: history.slice() });
      if (options.signal.aborted) return;
      if (result.depth === 0) throw new Error('The engine could not finish this position. Resume analysis to try again.');
      point = { key: keys[index], score: result.score, depth: result.depth, bestMove: result.move?.id ?? null, moveScores: Object.fromEntries(result.lines.map(candidate => [candidate.move.id, candidate.score])) };
    }
    if (!options.signal.aborted) options.onResult(node.id, point);
  }
}
