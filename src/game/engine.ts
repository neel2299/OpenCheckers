import { opposite, VARIANTS, type Side, type VariantId } from './variants.ts';

export interface Piece { side: Side; king: boolean }
export interface Position {
  board: (Piece | null)[];
  turn: Side;
  variant: VariantId;
  quietPly: number;
  stablePly: number;
  ply: number;
}
export interface Move {
  from: number;
  to: number;
  path: number[];
  captures: number[];
  king: boolean;
  id: string;
}
export interface Outcome { winner: Side | null; reason: string }
export interface SideMaterial { men: number; kings: number; total: number; captured: number; advantage: number }
const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export function materialSummary(position: Position): Record<Side, SideMaterial> {
  const rules = VARIANTS[position.variant];
  const initial = (rules.size * rules.rows) / 2;
  let wMen = 0, wKings = 0, bMen = 0, bKings = 0;
  for (const p of position.board) {
    if (!p) continue;
    if (p.side === 'white') { if (p.king) wKings++; else wMen++; }
    else { if (p.king) bKings++; else bMen++; }
  }
  const wTotal = wMen + wKings, bTotal = bMen + bKings;
  const wPoints = wMen + wKings * 2, bPoints = bMen + bKings * 2;
  return {
    white: { men: wMen, kings: wKings, total: wTotal, captured: Math.max(0, initial - bTotal), advantage: Math.max(0, wPoints - bPoints) },
    black: { men: bMen, kings: bKings, total: bTotal, captured: Math.max(0, initial - wTotal), advantage: Math.max(0, bPoints - wPoints) },
  };
}

export function createPosition(variant: VariantId = 'english'): Position {
  const rules = VARIANTS[variant];
  const board: Position['board'] = Array(rules.size ** 2).fill(null);
  for (let row = 0; row < rules.size; row++) {
    for (let col = 0; col < rules.size; col++) {
      if ((row + col) % 2 === 1 && (row < rules.rows || row >= rules.size - rules.rows)) {
        board[row * rules.size + col] = { side: row < rules.rows ? 'black' : 'white', king: false };
      }
    }
  }
  return { board, turn: rules.first, variant, quietPly: 0, stablePly: 0, ply: 0 };
}

export function squareNumber(index: number, size: number): number {
  return Math.floor(index / size) * (size / 2) + Math.floor((index % size) / 2) + 1;
}

export function squareIndex(number: number, size: number): number {
  const row = Math.floor((number - 1) / (size / 2));
  return row * size + ((number - 1) % (size / 2)) * 2 + (row % 2 === 0 ? 1 : 0);
}

export function coordinate(index: number, size: number): string {
  return String.fromCharCode(97 + index % size) + (size - Math.floor(index / size));
}

export function notation(move: Move, size: number): string {
  return move.path.map(i => coordinate(i, size)).join(move.captures.length ? 'x' : '-');
}

function makeMove(path: number[], captures: number[], king: boolean): Move {
  return { from: path[0], to: path[path.length - 1], path, captures, king, id: path.join('.') };
}

export function legalMoves(position: Position): Move[] {
  const rules = VARIANTS[position.variant];
  const size = rules.size;
  const board = position.board.slice();
  const captures: Move[] = [];
  const quiet: Move[] = [];
  const inside = (row: number, col: number) => row >= 0 && row < size && col >= 0 && col < size;
  const crowned = (index: number, side: Side) => Math.floor(index / size) === (side === 'white' ? 0 : size - 1);

  // Captured pieces remain blockers until the complete sequence has finished.
  const jump = (index: number, piece: Piece, path: number[], taken: number[]) => {
    let extended = false;
    const row = Math.floor(index / size), col = index % size;
    const directions = piece.king || rules.backwardCapture ? DIAGONALS : DIAGONALS.filter(d => d[0] === (piece.side === 'white' ? -1 : 1));
    for (const [dr, dc] of directions) {
      let r = row + dr, c = col + dc;
      if (piece.king && rules.flyingKings) {
        while (inside(r, c) && !board[r * size + c]) { r += dr; c += dc; }
      }
      if (!inside(r, c)) continue;
      const victim = r * size + c;
      if (!board[victim] || board[victim]!.side === piece.side || taken.includes(victim)) continue;
      r += dr; c += dc;
      while (inside(r, c) && !board[r * size + c]) {
        const to = r * size + c;
        extended = true;
        const newPath = [...path, to], newTaken = [...taken, victim];
        const promotes = !piece.king && crowned(to, piece.side);
        const nextPiece = { ...piece, king: piece.king || (promotes && rules.promotion === 'continue') };
        board[index] = null;
        board[to] = nextPiece;
        if (promotes && rules.promotion === 'stop') captures.push(makeMove(newPath, newTaken, true));
        else jump(to, nextPiece, newPath, newTaken);
        board[to] = null;
        board[index] = piece;
        if (!(piece.king && rules.flyingKings)) break;
        r += dr; c += dc;
      }
    }
    if (!extended && taken.length) captures.push(makeMove(path, taken, piece.king || crowned(index, piece.side)));
  };

  for (let index = 0; index < board.length; index++) {
    const piece = board[index];
    if (!piece || piece.side !== position.turn) continue;
    jump(index, piece, [index], []);
  }
  if (captures.length) {
    const maximum = Math.max(...captures.map(move => move.captures.length));
    return rules.maximumCapture ? captures.filter(move => move.captures.length === maximum) : captures;
  }
  for (let index = 0; index < board.length; index++) {
    const piece = board[index];
    if (!piece || piece.side !== position.turn) continue;
    const row = Math.floor(index / size), col = index % size;
    const directions = piece.king ? DIAGONALS : DIAGONALS.filter(d => d[0] === (piece.side === 'white' ? -1 : 1));
    for (const [dr, dc] of directions) {
      let r = row + dr, c = col + dc;
      while (inside(r, c) && !board[r * size + c]) {
        const to = r * size + c;
        quiet.push(makeMove([index, to], [], piece.king || crowned(to, piece.side)));
        if (!(piece.king && rules.flyingKings)) break;
        r += dr; c += dc;
      }
    }
  }
  return quiet;
}

/** Apply a move returned by legalMoves; callers accepting untrusted moves must validate first. */
export function applyMove(position: Position, move: Move): Position {
  const piece = position.board[move.from];
  if (!piece || piece.side !== position.turn) throw new Error('No moving piece on that square.');
  const board = position.board.slice();
  board[move.from] = null;
  for (const index of move.captures) board[index] = null;
  board[move.to] = { ...piece, king: move.king };
  return {
    ...position, board, turn: opposite(position.turn), ply: position.ply + 1,
    quietPly: !piece.king || move.captures.length ? 0 : position.quietPly + 1,
    stablePly: move.captures.length || (!piece.king && move.king) ? 0 : position.stablePly + 1,
  };
}

export function positionKey(position: Position): string {
  return position.variant + position.turn + position.board.map(p => p ? (p.side === 'white' ? (p.king ? 'W' : 'w') : (p.king ? 'B' : 'b')) : '.').join('');
}

export function outcome(position: Position, history: Position[] = [position]): Outcome | null {
  if (!legalMoves(position).length) return { winner: opposite(position.turn), reason: 'No legal moves remaining' };
  if (history.filter(p => positionKey(p) === positionKey(position)).length >= 3) return { winner: null, reason: 'Threefold repetition' };
  if (position.quietPly >= VARIANTS[position.variant].quietLimit) return { winner: null, reason: 'No progress: only kings have moved without a capture' };
  if (position.variant !== 'english') {
    const endingLimit = (p: Position): number => {
      const w = p.board.flatMap((piece, index) => piece?.side === 'white' ? [{ ...piece, index }] : []);
      const b = p.board.flatMap((piece, index) => piece?.side === 'black' ? [{ ...piece, index }] : []);
      const lone = w.length === 1 && w[0].king ? w[0] : b.length === 1 && b[0].king ? b[0] : null;
      if (!lone) return Infinity;
      const other = lone.side === 'white' ? b : w;
      if (other.length <= 2) return 10;
      if (position.variant === 'international' && other.length === 3) return 32;
      const size = VARIANTS[p.variant].size;
      const onLongDiagonal = Math.floor(lone.index / size) + lone.index % size === size - 1;
      if (position.variant !== 'international' && other.length === 3 && other.some(piece => piece.king) && onLongDiagonal) return 10;
      if (position.variant !== 'international' && other.filter(p => p?.king).length >= 3) return 30;
      return Infinity;
    };
    const limit = endingLimit(position);
    if (Number.isFinite(limit) && history.length > limit && history.slice(-limit - 1).every(p => endingLimit(p) <= limit)) {
      return { winner: null, reason: 'Endgame move limit reached' };
    }
    if (position.variant !== 'international') {
      const pieces = position.board.filter(Boolean);
      const kingsBothSides = ['white', 'black'].every(side => pieces.some(p => p?.king && p.side === side));
      if (kingsBothSides && ((pieces.length <= 5 && position.stablePly >= 60) || (pieces.length <= 7 && position.stablePly >= 120))) {
        return { winner: null, reason: 'Endgame without a capture or promotion' };
      }
    }
  }
  return null;
}

export function toFen(position: Position, algebraic = false): string {
  const size = VARIANTS[position.variant].size;
  const list = (side: Side) => position.board.flatMap((p, i) => p?.side === side ? [(p.king ? 'K' : '') + (algebraic ? coordinate(i, size) : squareNumber(i, size))] : []).join(',');
  return `${position.turn === 'white' ? 'W' : 'B'}:W${list('white')}:B${list('black')}`;
}

export function fromFen(input: string, variant: VariantId): Position {
  const fen = input.trim().replace(/\s/g, '').replace(/\.$/, '');
  const match = /^([WB]):([WB])([^:]*):([WB])([^:]*)$/i.exec(fen);
  if (!match) throw new Error('Use a position such as W:W21,22,K25:B1,2,K8.');
  if (match[2].toUpperCase() === match[4].toUpperCase()) throw new Error('List Ivory (W) and Coral (B) once each.');
  const size = VARIANTS[variant].size;
  const position: Position = { board: Array(size ** 2).fill(null), variant, turn: match[1].toUpperCase() === 'W' ? 'white' : 'black', quietPly: 0, stablePly: 0, ply: 0 };
  for (const [group, color] of [[match[3], match[2]], [match[5], match[4]]]) {
    const side: Side = color.toUpperCase() === 'W' ? 'white' : 'black';
    if (!group) continue;
    for (const token of group.split(',')) {
      const part = /^(K?)(\d+)(?:-(\d+))?$/i.exec(token);
      const algebraic = /^(K?)([a-j])(\d{1,2})$/i.exec(token);
      if (!part && !algebraic) throw new Error(`Invalid piece: ${token}`);
      const col = algebraic ? algebraic[2].toLowerCase().charCodeAt(0) - 97 : 0;
      const row = algebraic ? size - Number(algebraic[3]) : 0;
      if (algebraic && (col >= size || row < 0 || row >= size || (row + col) % 2 !== 1)) throw new Error(`Invalid playable square: ${token}`);
      const start = part ? Number(part[2]) : squareNumber(row * size + col, size);
      const end = part?.[3] ? Number(part[3]) : start;
      const king = Boolean((part ?? algebraic)![1]);
      if (start < 1 || end > size * size / 2 || start > end) throw new Error(`Squares must be between 1 and ${size * size / 2}.`);
      for (let n = start; n <= end; n++) {
        const index = squareIndex(n, size);
        if (position.board[index]) throw new Error(`Square ${n} is listed twice.`);
        const promotionRow = side === 'white' ? 0 : size - 1;
        if (!king && Math.floor(index / size) === promotionRow) throw new Error(`A piece on its promotion row must be a king: K${n}.`);
        position.board[index] = { side, king };
      }
    }
  }
  if (!position.board.some(Boolean)) throw new Error('Add at least one piece to the board.');
  return position;
}
