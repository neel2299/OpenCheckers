import type { Move, Position } from '../game/engine.ts';

export type FeedbackCue = 'select' | 'move' | 'capture' | 'promotion' | 'start' | 'finish' | 'victory' | 'undo';

export function moveCue(position: Position, move: Move): FeedbackCue {
  if (move.king && !position.board[move.from]?.king) return 'promotion';
  return move.captures.length ? 'capture' : 'move';
}
