import { applyMove, coordinate, fromFen, legalMoves, notation, type Move, type Position } from './engine.ts';
import { VARIANTS, type VariantId } from './variants.ts';
import puzzlePack from './puzzlePack.ts';

export interface SolutionBranch { reply?: string; next?: SolutionNode }
export interface SolutionNode { [route: string]: SolutionBranch }
export const PUZZLE_LEVELS = [
  { level: 1, name: 'First combinations', description: 'Find captures, traps, and a way forward.' },
  { level: 2, name: 'Tactical vision', description: 'Sacrifice a little. Win back much more.' },
  { level: 3, name: 'Think ahead', description: 'Quiet moves and carefully timed crowns.' },
  { level: 4, name: 'Deep calculation', description: 'Read the replies and finish the combination.' },
  { level: 5, name: 'Master class', description: 'Subtle decoys and demanding endgames.' },
] as const;

export interface Puzzle {
  id: string;
  title: string;
  variant: VariantId;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  fen: string;
  objective: string;
  hint: string;
  solutionRoutes: string[];
  level: number;
  theme: string;
  explanation: string;
  solution: SolutionNode;
  source: { name: string; url?: string; license: string };
}

const LESSONS: Omit<Puzzle, 'level' | 'theme' | 'explanation' | 'solution' | 'source'>[] = [
  {
    id: 'english-double-choice',
    title: 'The greedy diagonal',
    variant: 'english',
    difficulty: 'Beginner',
    fen: 'W:Wc3,g3:Bb4,d4,f6',
    objective: 'Ivory to move. English rules allow any full capture path—find the jump that wins two pieces instead of one.',
    hint: 'Look to the right diagonal (c3xe5xg7) rather than capturing toward the left edge.',
    solutionRoutes: ['c3-e5-g7'],
  },
  {
    id: 'russian-crown-sweep',
    title: 'Coronation flight',
    variant: 'russian',
    difficulty: 'Intermediate',
    fen: 'W:Wb6:Bc5,c7,f6',
    objective: 'Ivory to move. Use Russian mid-capture promotion to crown on d8 and immediately sweep a second piece as a flying king.',
    hint: 'Jump forward onto the crowning rank (b6xd8) to unlock flying king range on the same turn.',
    solutionRoutes: ['b6-d8-g5', 'b6-d8-h4'],
  },
  {
    id: 'brazilian-edge-lock',
    title: 'Silent blockade',
    variant: 'brazilian',
    difficulty: 'Intermediate',
    fen: 'W:Wb6,c7,d6:Bb8',
    objective: 'Ivory to move. Find the quiet move that seals every escape square and wins on the spot by blockade.',
    hint: 'Reinforce the left edge so Coral at b8 can neither step nor jump.',
    solutionRoutes: ['b6-a7'],
  },
  {
    id: 'international-king-trap',
    title: 'Long diagonal ambush',
    variant: 'international',
    difficulty: 'Advanced',
    fen: 'W:WKb2,h2:Be5,h4',
    objective: 'Ivory to move on the 10 × 10 board. Pivot on f6 with the flying king to sweep both e5 and h4, landing on i3 to control the center.',
    hint: 'Jump over e5 to f6, then turn to capture h4 and stop on i3 (b2xf6xi3).',
    solutionRoutes: ['b2-f6-i3'],
  },
];

export const PUZZLES: Puzzle[] = [
  ...LESSONS.map((puzzle, index): Puzzle => ({
    ...puzzle, level: [1, 2, 2, 4][index], theme: ['Capture choice', 'Crown sweep', 'Blockade', 'Flying kings'][index],
    explanation: puzzle.hint,
    solution: Object.fromEntries(puzzle.solutionRoutes.map(route => [route, {}])),
    source: { name: 'OpenCheckers lessons', license: 'Original' },
  })),
  ...puzzlePack.map((item): Puzzle => ({
    id: `shadow-${item.id}`, title: item.title, variant: item.variant as VariantId, fen: item.fen,
    difficulty: item.difficulty <= 2 ? 'Beginner' : item.difficulty === 3 ? 'Intermediate' : 'Advanced',
    level: item.difficulty, theme: item.theme,
    objective: item.goal === 'win' ? 'Find the sequence that leaves your opponent without a legal move.' : `Find the combination that gains at least ${item.gain} points of material.`,
    hint: themeHint(item.theme),
    explanation: item.goal === 'win' ? 'The final position wins: the opponent has no legal move. Look back at how each move took away an escape.' : `The ${item.theme} gains at least ${item.gain} points after the exchanges. Men count as 1; kings count as ${item.variant === 'english' ? '1.5' : '2.5'} in this collection.`,
    solutionRoutes: Object.keys(item.solution), solution: item.solution as SolutionNode,
    source: { name: 'Shadow Checkers · Shadowfetch', url: 'https://github.com/ShadowfetchStudio/shadow-checkers', license: 'MIT' },
  })),
].sort((a, b) => a.level - b.level);

function themeHint(theme: string): string {
  const hints: Record<string, string> = {
    'king trap': 'Restrict the king’s escape squares. A quiet move can force it onto your capture route.',
    'two-for-one': 'Offer one piece to line up a double capture on your next turn.',
    'three-for-one': 'Look for a sacrifice that draws the pieces into a long capture chain.',
    breakthrough: 'Clear a diagonal to the far row. Remember that captures are compulsory.',
    'clean sweep': 'Offer a target, then use the forced reply to remove the last defender.',
    'quiet move': 'Start with a quiet move. Think about where you want the opponent to stand two turns from now.',
    'crowning race': 'The timing of a crown matters. Check the capture you can prepare while the other side advances.',
    sacrifice: 'A piece can be a decoy. Draw a defender away before taking the open diagonal.',
    'flying king': 'Use the king’s full diagonal range, then change direction for the next capture.',
    'no way out': 'Take away the last safe square. A blockade wins without capturing every piece.',
  };
  return hints[theme] ?? 'Visualize the opponent’s compulsory reply before choosing your move.';
}

export function moveRoute(move: Move, size: number): string {
  return move.path.map(sq => coordinate(sq, size)).join('-');
}

export function getPuzzlePosition(puzzle: Puzzle): Position {
  return fromFen(puzzle.fen, puzzle.variant);
}

export function getPuzzleSolutionMoves(puzzle: Puzzle, pos = getPuzzlePosition(puzzle), solution = puzzle.solution): Move[] {
  const size = VARIANTS[puzzle.variant].size;
  return legalMoves(pos).filter(m => Object.hasOwn(solution, moveRoute(m, size)));
}

/** A deterministic walkthrough; every listed route has already been verified. */
export function puzzleLine(puzzle: Puzzle): { position: Position; move: Move | null }[] {
  let position = getPuzzlePosition(puzzle);
  let node = puzzle.solution;
  const line: { position: Position; move: Move | null }[] = [{ position, move: null }];
  while (Object.keys(node).length) {
    const move = getPuzzleSolutionMoves(puzzle, position, node)[0];
    if (!move) throw new Error(`Invalid puzzle solution: ${puzzle.id}`);
    const branch = node[moveRoute(move, VARIANTS[puzzle.variant].size)];
    position = applyMove(position, move); line.push({ position, move });
    if (branch.reply) {
      const reply = legalMoves(position).find(move => moveRoute(move, VARIANTS[puzzle.variant].size) === branch.reply);
      if (!reply) throw new Error(`Invalid puzzle reply: ${puzzle.id}`);
      position = applyMove(position, reply); line.push({ position, move: reply });
    }
    node = branch.next ?? {};
  }
  return line;
}

export function checkPuzzleMove(puzzle: Puzzle, move: Move): { correct: boolean; message: string; nextPosition: Position } {
  const pos = getPuzzlePosition(puzzle);
  const size = VARIANTS[puzzle.variant].size;
  const nextPosition = applyMove(pos, move);
  const correct = puzzle.solutionRoutes.includes(moveRoute(move, size));
  return {
    correct,
    message: correct
      ? `Solved! ${notation(move, size)} is the winning continuation.`
      : `${notation(move, size)} misses the best tactical continuation. Try again or use the hint.`,
    nextPosition,
  };
}
