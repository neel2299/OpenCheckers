import { applyMove, legalMoves, positionKey, type Move, type Position } from './engine.ts';
import { LEVELS, VARIANTS, type Side } from './variants.ts';

export interface Line { move: Move; score: number; pv: Move[] }
export interface SearchResult { move: Move | null; score: number; depth: number; nodes: number; timeMs?: number; nps?: number; lines: Line[] }
export interface SearchOptions { elo?: number; analysis?: boolean; signal?: AbortSignal; random?: () => number; history?: Position[] }
export interface SidePositionalStats { men: number; kings: number; tempo: number; center: number; backRank: number }
interface Entry { depth: number; score: number; flag: 'exact' | 'lower' | 'upper'; best?: string }

export function positionalBreakdown(position: Position): Record<Side, SidePositionalStats> {
  const size = VARIANTS[position.variant].size;
  const stats: Record<Side, SidePositionalStats> = {
    white: { men: 0, kings: 0, tempo: 0, center: 0, backRank: 0 },
    black: { men: 0, kings: 0, tempo: 0, center: 0, backRank: 0 },
  };
  for (let i = 0; i < position.board.length; i++) {
    const piece = position.board[i];
    if (!piece) continue;
    const row = Math.floor(i / size), col = i % size;
    const progress = piece.side === 'white' ? size - 1 - row : row;
    const sideStats = stats[piece.side];
    if (piece.king) sideStats.kings++;
    else {
      sideStats.men++;
      sideStats.tempo += progress;
      if (progress === 0) sideStats.backRank++;
    }
    if (row >= 2 && row < size - 2 && col >= 2 && col < size - 2) sideStats.center++;
  }
  return stats;
}

/** Scores are in hundredths of a man, positive for Ivory. */
export function evaluate(position: Position): number {
  const rules = VARIANTS[position.variant];
  const size = rules.size;
  let score = position.turn === 'white' ? 3 : -3;
  for (let i = 0; i < position.board.length; i++) {
    const piece = position.board[i];
    if (!piece) continue;
    const row = Math.floor(i / size), col = i % size;
    const forward = piece.side === 'white' ? -1 : 1;
    const progress = piece.side === 'white' ? size - 1 - row : row;
    const distToCrown = size - 1 - progress;
    const center = size / 2 - Math.abs(col - (size - 1) / 2);
    const centerRow = size / 2 - Math.abs(row - (size - 1) / 2);
    let value = piece.king ? (rules.flyingKings ? 280 : 185) : 100 + progress * 3.5;
    value += center * (piece.king ? 2.5 : 2);
    if (piece.king) {
      value += centerRow * 1.5;
      if (rules.flyingKings && row + col === size - 1) value += 6;
    } else {
      if (progress === 0) value += 9;
      if (col === 0 || col === size - 1) value += 3;
      const backRow = row - forward;
      if (backRow >= 0 && backRow < size) {
        if ((col > 0 && position.board[backRow * size + col - 1]?.side === piece.side) ||
            (col + 1 < size && position.board[backRow * size + col + 1]?.side === piece.side)) {
          value += 4;
        }
      }
      if (distToCrown > 0 && distToCrown <= 2) {
        const nextRow = row + forward;
        const clearLeft = col > 0 && !position.board[nextRow * size + col - 1];
        const clearRight = col + 1 < size && !position.board[nextRow * size + col + 1];
        if (clearLeft || clearRight) value += (3 - distToCrown) * 6;
      }
    }
    score += value * (piece.side === 'white' ? 1 : -1);
  }
  return Math.round(score);
}

const yieldThread = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export async function search(position: Position, options: SearchOptions = {}): Promise<SearchResult> {
  const startedAt = Date.now();
  const level = LEVELS.find(l => l.elo === options.elo) ?? LEVELS[2];
  const budget = options.analysis ? 1100 : level.time;
  const maxDepth = options.analysis ? 10 : level.depth;
  const deadline = startedAt + budget;
  const table = new Map<string, Entry>();
  const killers = new Map<number, string>();
  const repetition = new Map<string, number>();
  for (const p of options.history ?? [position]) { const key = positionKey(p); repetition.set(key, (repetition.get(key) ?? 0) + 1); }
  const stopped = Symbol('stopped');
  let nodes = 0;
  const sideFactor = position.turn === 'white' ? 1 : -1;
  const initialMoves = legalMoves(position);
  const result: SearchResult = { move: initialMoves[0] ?? null, score: evaluate(position), depth: 0, nodes: 0, lines: [] };
  if (!initialMoves.length) return { ...result, score: -10000 * sideFactor };

  const negamax = async (p: Position, depth: number, alpha: number, beta: number, ply: number, q: number): Promise<number> => {
    nodes++;
    if ((nodes & 127) === 0) {
      await yieldThread();
      if (Date.now() >= deadline || options.signal?.aborted) throw stopped;
    }
    const hash = positionKey(p);
    if ((repetition.get(hash) ?? 0) >= 3 || p.quietPly >= VARIANTS[p.variant].quietLimit) return 0;
    const key = hash + ':' + p.quietPly;
    const entry = table.get(key);
    const originalAlpha = alpha;
    if (entry && entry.depth >= depth && depth > 0) {
      if (entry.flag === 'exact') return entry.score;
      if (entry.flag === 'lower') alpha = Math.max(alpha, entry.score);
      if (entry.flag === 'upper') beta = Math.min(beta, entry.score);
      if (alpha >= beta) return entry.score;
    }
    const moves = legalMoves(p);
    if (!moves.length) return -10000 + ply;
    if (depth <= 0 && (!moves[0].captures.length || q <= 0)) return evaluate(p) * (p.turn === 'white' ? 1 : -1);
    const killer = killers.get(ply);
    moves.sort((a, b) => (b.id === entry?.best ? 1000 : 0) + b.captures.length * 10 + (b.id === killer ? 4 : 0) + Number(b.king) - ((a.id === entry?.best ? 1000 : 0) + a.captures.length * 10 + (a.id === killer ? 4 : 0) + Number(a.king)));
    let best = -Infinity, bestId: string | undefined;
    for (const move of moves) {
      const child = applyMove(p, move), childHash = positionKey(child);
      repetition.set(childHash, (repetition.get(childHash) ?? 0) + 1);
      let value: number;
      try { value = -await negamax(child, depth - 1, -beta, -alpha, ply + 1, depth <= 0 ? q - 1 : q); }
      finally { repetition.set(childHash, (repetition.get(childHash) ?? 1) - 1); }
      if (value > best) { best = value; bestId = move.id; }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) {
        if (!move.captures.length) killers.set(ply, move.id);
        break;
      }
    }
    if (depth > 0) table.set(key, { depth, score: best, best: bestId, flag: best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact' });
    return best;
  };

  const pvFor = (move: Move, depth: number) => {
    const pv = [move]; let p = applyMove(position, move);
    for (let i = 1; i < Math.min(depth, 8); i++) {
      const entry = table.get(positionKey(p) + ':' + p.quietPly);
      const next = entry?.best ? legalMoves(p).find(m => m.id === entry.best) : undefined;
      if (!next) break;
      pv.push(next); p = applyMove(p, next);
    }
    return pv;
  };

  for (let depth = 1; depth <= maxDepth; depth++) {
    const lines: Line[] = [];
    const moves = result.lines.length ? result.lines.map(l => l.move) : initialMoves;
    try {
      for (const move of moves) {
        if (options.signal?.aborted || (depth > 1 && Date.now() >= deadline)) throw stopped;
        const child = applyMove(position, move), key = positionKey(child);
        repetition.set(key, (repetition.get(key) ?? 0) + 1);
        let score: number;
        try { score = -await negamax(child, depth - 1, -Infinity, Infinity, 1, 5); }
        finally { repetition.set(key, (repetition.get(key) ?? 1) - 1); }
        lines.push({ move, score, pv: [] });
      }
    } catch (error) { if (error !== stopped) throw error; break; }
    lines.sort((a, b) => b.score - a.score);
    result.lines = lines.map(l => ({ ...l, score: l.score * sideFactor, pv: pvFor(l.move, depth) }));
    result.move = lines[0].move;
    result.score = lines[0].score * sideFactor;
    result.depth = depth;
    await yieldThread();
    if (Date.now() >= deadline) break;
  }
  if (!options.analysis && result.lines.length) {
    const random = options.random ?? Math.random;
    if (random() < level.blunder) result.move = initialMoves[Math.floor(random() * initialMoves.length)];
    else {
      const ranked = result.lines.map(l => ({ ...l, adjusted: l.score * sideFactor + (random() - 0.5) * level.noise })).sort((a, b) => b.adjusted - a.adjusted);
      result.move = ranked[0].move;
    }
  }
  const elapsed = Math.max(1, Date.now() - startedAt);
  result.nodes = nodes;
  result.timeMs = elapsed;
  result.nps = Math.round((nodes * 1000) / elapsed);
  return result;
}
