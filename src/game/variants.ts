export type VariantId = 'english' | 'international' | 'russian' | 'brazilian';
export type Side = 'white' | 'black';

export interface Variant {
  id: VariantId;
  name: string;
  subtitle: string;
  size: number;
  rows: number;
  first: Side;
  flyingKings: boolean;
  backwardCapture: boolean;
  maximumCapture: boolean;
  promotion: 'stop' | 'continue' | 'end';
  quietLimit: number;
  description: string;
}

export const VARIANTS: Record<VariantId, Variant> = {
  english: {
    id: 'english', name: 'English', subtitle: 'The familiar classic', size: 8, rows: 3,
    first: 'black', flyingKings: false, backwardCapture: false, maximumCapture: false,
    promotion: 'stop', quietLimit: 80,
    description: 'Also called American checkers. Men move and capture forward. Kings move one square in either direction. Choose any complete capture sequence. Crowning ends your turn. Coral moves first.',
  },
  international: {
    id: 'international', name: 'International', subtitle: 'A bigger board. More possibilities.', size: 10, rows: 4,
    first: 'white', flyingKings: true, backwardCapture: true, maximumCapture: true,
    promotion: 'end', quietLimit: 50,
    description: 'Twenty pieces each on a 10 × 10 board. Men capture in both directions, and kings fly along diagonals. You must capture the greatest number of pieces. Promotion happens at the end of a move. Ivory moves first.',
  },
  russian: {
    id: 'russian', name: 'Russian', subtitle: 'Fast, fluid & full of surprises', size: 8, rows: 3,
    first: 'white', flyingKings: true, backwardCapture: true, maximumCapture: false,
    promotion: 'continue', quietLimit: 30,
    description: 'Men capture in both directions and kings fly. Choose any complete capture sequence. A man reaching the last row during a capture becomes a king immediately and continues capturing as a king. Ivory moves first.',
  },
  brazilian: {
    id: 'brazilian', name: 'Brazilian', subtitle: 'Small board, deep strategy', size: 8, rows: 3,
    first: 'white', flyingKings: true, backwardCapture: true, maximumCapture: true,
    promotion: 'end', quietLimit: 30,
    description: 'International-style play on an 8 × 8 board. Men capture backward, kings fly, and the longest capture is compulsory. A man must finish its turn on the last row to be crowned. Ivory moves first.',
  },
};

export const LEVELS = [
  { elo: 400, name: 'Pip', title: 'The newcomer', personality: 'Curious and impulsive. Always ready for one more game.', depth: 1, time: 45, noise: 180, blunder: 0.55 },
  { elo: 800, name: 'Cleo', title: 'The café regular', personality: 'Easygoing, adventurous, and fond of a cheeky capture.', depth: 2, time: 90, noise: 85, blunder: 0.25 },
  { elo: 1200, name: 'Jasper', title: 'The club captain', personality: 'A friendly rival who makes you earn the center.', depth: 4, time: 180, noise: 30, blunder: 0.08 },
  { elo: 1600, name: 'Vera', title: 'The tactician', personality: 'Patient and observant. Leave a gap and she will find it.', depth: 6, time: 320, noise: 10, blunder: 0 },
  { elo: 2000, name: 'Orion', title: 'The strategist', personality: 'Calm, calculating, and always looking a few moves ahead.', depth: 8, time: 550, noise: 2, blunder: 0 },
  { elo: 2400, name: 'Atlas', title: 'The master', personality: 'Quiet confidence. Every tempo deserves your attention.', depth: 10, time: 800, noise: 0, blunder: 0 },
] as const;

export const computerLevel = (elo: number) => LEVELS.reduce((best, level) => Math.abs(level.elo - elo) < Math.abs(best.elo - elo) ? level : best, LEVELS[0] as typeof LEVELS[number]);

export const sideName = (side: Side) => side === 'white' ? 'Ivory' : 'Coral';
export const opposite = (side: Side): Side => side === 'white' ? 'black' : 'white';
