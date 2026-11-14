import { applyMove, coordinate, createPosition, fromFen, legalMoves, notation, squareIndex, toFen, type Move, type Position } from './engine.ts';
import { VARIANTS, type VariantId } from './variants.ts';

const GAME_TYPES: Record<number, VariantId> = { 20: 'international', 21: 'english', 25: 'russian', 26: 'brazilian' };

export function exportPdn(line: { position: Position; move: Move | null }[], resultToken = '*'): string {
  if (!line.length) throw new Error('A starting position is required.');
  const root = line[0].position;
  const rules = VARIANTS[root.variant];
  const type = { international: 20, english: 21, russian: 25, brazilian: 26 }[root.variant];
  // Declare coordinate notation explicitly, including for English and 10x10 games.
  const gameType = `${type},${rules.first === 'white' ? 'W' : 'B'},${rules.size},${rules.size},A0,0`;
  const tags = `[Event "OpenCheckers"]\n[GameType "${gameType}"]\n[SetUp "1"]\n[FEN "${toFen(root, true)}"]\n[Result "${resultToken}"]\n\n`;
  const moves = line.slice(1).map((node, i) => {
    if (!node.move) throw new Error('Missing move in game line.');
    const move = node.move;
    const text = notation(move, rules.size).replaceAll('x', root.variant === 'russian' ? ':' : 'x');
    return (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : '') + text;
  }).join(' ');
  return tags + moves + (moves ? ' ' : '') + resultToken;
}

function parseSquareToken(token: string, size: number): number {
  if (/^\d+$/.test(token)) {
    const n = Number(token);
    if (n < 1 || n > (size * size) / 2) throw new Error(`Square ${token} is out of range.`);
    return squareIndex(n, size);
  }
  const alg = /^([a-j])(\d{1,2})$/i.exec(token);
  if (alg) {
    const col = alg[1].toLowerCase().charCodeAt(0) - 97;
    const row = size - Number(alg[2]);
    if (col < 0 || col >= size || row < 0 || row >= size || (row + col) % 2 !== 1) {
      throw new Error(`Invalid square coordinate: ${token}`);
    }
    return row * size + col;
  }
  throw new Error(`Unrecognized square in move: ${token}`);
}

export function importPdn(input: string, fallbackVariant: VariantId = 'english'): { position: Position; move: Move | null }[] {
  const raw = input.trim();
  if (!raw) throw new Error('Paste a FEN position or PDN game.');
  const typeMatch = /\[GameType\s+"(\d+)(?:,[^"]*)?"\]/i.exec(raw);
  const variant: VariantId = (typeMatch && GAME_TYPES[Number(typeMatch[1])]) || fallbackVariant;
  const size = VARIANTS[variant].size;
  const fenMatch = /\[FEN\s+"([^"]+)"\]/i.exec(raw);
  let current = fenMatch ? fromFen(fenMatch[1], variant) : createPosition(variant);
  const line: { position: Position; move: Move | null }[] = [{ position: current, move: null }];

  const body = raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/;[^\n]*/g, ' ')
    .replace(/\b(1-0|0-1|1\/2-1\/2|2-0|0-2|1-1|\*)\s*$/g, ' ')
    .trim();

  if (!body) return line;

  const tokens = body.split(/\s+/).filter(token => token && !/^\d+\.+$/.test(token) && !/^(1-0|0-1|1\/2-1\/2|2-0|0-2|1-1|\*)$/.test(token));
  for (const rawToken of tokens) {
    const clean = rawToken.replace(/^\d+\.+/, '').replace(/[!?]+$/, '');
    if (!clean) continue;
    const parts = clean.split(/[-–x×:]/i).filter(Boolean);
    if (parts.length < 2) throw new Error(`Invalid PDN move token: ${rawToken}`);
    const steps = parts.map(p => parseSquareToken(p, size));
    const candidates = legalMoves(current);
    const exact = candidates.find(m => m.path.length === steps.length && m.path.every((sq, idx) => sq === steps[idx]));
    const endpoint = !exact && steps.length === 2 ? candidates.find(m => m.from === steps[0] && m.to === steps[1]) : undefined;
    const chosen = exact ?? endpoint;
    if (!chosen) {
      const displayMove = steps.map(sq => coordinate(sq, size)).join(/[x×:]/i.test(clean) ? 'x' : '-');
      throw new Error(`Illegal move "${displayMove}" at ply ${current.ply + 1}.`);
    }
    current = applyMove(current, chosen);
    line.push({ position: current, move: chosen });
  }
  return line;
}

export function importPositionOrPdn(input: string, variant: VariantId): { position: Position; move: Move | null }[] {
  const trimmed = input.trim();
  if (/^[WB]\s*:/i.test(trimmed)) {
    return [{ position: fromFen(trimmed, variant), move: null }];
  }
  if (/\[GameType|\[FEN|\b1\.\s*[a-j0-9]/i.test(trimmed) || /^[a-j0-9]{1,3}[-–x×:][a-j0-9]{1,3}/i.test(trimmed)) {
    return importPdn(trimmed, variant);
  }
  return [{ position: fromFen(trimmed, variant), move: null }];
}
