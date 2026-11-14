import { applyMove, positionKey, type Move, type Piece, type Position } from './engine.ts';

export interface BoardTransition {
  path: number[];
  piece: Piece;
  promotes: boolean;
  captured: { square: number; piece: Piece }[];
}

/** Describe visual movement without changing the authoritative game position. */
export function boardTransition(before: Position, after: Position, move?: Move | null, preview = false): BoardTransition | null {
  if (before.variant !== after.variant || after.ply < before.ply || after.ply > before.ply + 1) return null;
  if (after.ply === before.ply + 1 && move && before.board[move.from]) {
    // A restored game can replace the default board with a different side to
    // move. Its last move did not originate from this visual snapshot.
    if (before.board[move.from]!.side !== before.turn) return null;
    if (positionKey(applyMove(before, move)) !== positionKey(after)) return null;
    const piece = before.board[move.from]!;
    return { path: move.path, piece, promotes: !piece.king && move.king, captured: move.captures.flatMap(square => before.board[square] ? [{ square, piece: before.board[square]! }] : []) };
  }
  if (!preview && after.ply === before.ply) return null;
  // A manually entered multi-jump can already be midway through its route.
  const from = before.board.flatMap((p, i) => p?.side === before.turn && after.board[i]?.side !== before.turn ? [i] : []);
  const to = after.board.flatMap((p, i) => p?.side === before.turn && before.board[i]?.side !== before.turn ? [i] : []);
  if (from.length !== 1 || to.length !== 1) return null;
  const piece = before.board[from[0]]!;
  const captured = before.board.flatMap((p, square) => p && p.side !== piece.side && !after.board[square] ? [{ square, piece: p }] : []);
  return { path: [from[0], to[0]], piece, promotes: !piece.king && Boolean(after.board[to[0]]?.king), captured };
}
