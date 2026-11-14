import { computerLevel, type Side, type VariantId } from './variants.ts';

export interface CompletedGame {
  id: string;
  date: string;
  variant: VariantId;
  mode: 'computer' | 'friend';
  elo: number;
  opponentName?: string;
  userSide: Side;
  winner: Side | null;
  reason: string;
  moves: number;
  pdn: string;
  timeControl?: number;
  ratingBefore?: number;
  ratingAfter?: number;
  ratingChange?: number;
}
export interface PlayerStats { played: number; wins: number; draws: number; losses: number; streak: number; bestElo: number }
export interface Rating { value: number; games: number; peak: number }
export type Ratings = Record<VariantId, Rating>;
export interface GameRecord { archive: CompletedGame[]; stats: PlayerStats; ratings: Ratings }
export const DEFAULT_STATS: PlayerStats = { played: 0, wins: 0, draws: 0, losses: 0, streak: 0, bestElo: 0 };
export const initialRatings = (): Ratings => Object.fromEntries(['english', 'international', 'russian', 'brazilian'].map(id => [id, { value: 1200, games: 0, peak: 1200 }])) as Ratings;
export const initialRecord = (): GameRecord => ({ archive: [], stats: { ...DEFAULT_STATS }, ratings: initialRatings() });

/** Local computer rating: standard Elo, K=32, starting at 1200 per variant. */
export function calculateRating(player: number, opponent: number, score: 0 | 0.5 | 1) {
  const expected = 1 / (1 + 10 ** ((opponent - player) / 400));
  const after = Math.max(100, Math.round(player + 32 * (score - expected)));
  return { before: player, after, change: after - player };
}
export const gameScore = (entry: CompletedGame): 0 | 0.5 | 1 => entry.winner === null ? 0.5 : entry.winner === entry.userSide ? 1 : 0;

/** One state transition keeps the rating, totals, and archived result together. */
export function appendResult(record: GameRecord, result: CompletedGame): GameRecord {
  if (record.archive.some(entry => entry.id === result.id)) return record;
  if (result.mode === 'friend') return { ...record, archive: [result, ...record.archive] };
  const score = gameScore(result);
  const rating = record.ratings[result.variant];
  const next = calculateRating(rating.value, result.elo, score);
  const entry: CompletedGame = { ...result, opponentName: result.opponentName ?? computerLevel(result.elo).name, ratingBefore: next.before, ratingAfter: next.after, ratingChange: next.change };
  const stats = record.stats;
  return {
    archive: [entry, ...record.archive],
    ratings: { ...record.ratings, [result.variant]: { value: next.after, games: rating.games + 1, peak: Math.max(rating.peak, next.after) } },
    stats: { played: stats.played + 1, wins: stats.wins + Number(score === 1), draws: stats.draws + Number(score === 0.5), losses: stats.losses + Number(score === 0), streak: score === 1 ? stats.streak + 1 : 0, bestElo: score === 1 ? Math.max(stats.bestElo, result.elo) : stats.bestElo },
  };
}

/** Replay the retained legacy archive once, so old results get rating calculations too. */
export function restoreRecord(saved: { archive?: CompletedGame[]; stats?: PlayerStats; ratings?: Ratings }): GameRecord {
  const archive = Array.isArray(saved.archive) ? saved.archive : [];
  if (!saved.ratings) return archive.slice().reverse().reduce(appendResult, initialRecord());
  const ratings = initialRatings();
  for (const id of Object.keys(ratings) as VariantId[]) {
    const rating = saved.ratings[id];
    if (rating && Number.isFinite(rating.value) && Number.isFinite(rating.games) && Number.isFinite(rating.peak)) ratings[id] = rating;
  }
  return { archive, ratings, stats: { ...DEFAULT_STATS, ...saved.stats } };
}

export function levelRecord(archive: CompletedGame[], variant: VariantId, elo: number) {
  const games = archive.filter(entry => entry.mode === 'computer' && entry.variant === variant && entry.elo === elo);
  const wins = games.filter(entry => gameScore(entry) === 1).length;
  const draws = games.filter(entry => gameScore(entry) === 0.5).length;
  return { played: games.length, wins, draws, losses: games.length - wins - draws };
}
