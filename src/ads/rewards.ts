import type { Personalization } from '../personalization/model.ts';

export const REWARDS_STORAGE_KEY = 'draughts-club-rewards-v1';
export type Rewards = { royalClub: boolean };
export function restoreRewards(value: unknown): Rewards {
  return { royalClub: !!value && typeof value === 'object' && (value as Rewards).royalClub === true };
}
export const ROYAL_PALETTE = { dark: '#214F40', light: '#F7ECD2', frame: '#BA995B', last: '#C4D68D' };
export function applyRoyalClub(current: Personalization): Personalization {
  return { ...current, board: { palette: { ...ROYAL_PALETTE }, texture: 'royal', textureOpacity: 0.5, images: {} } };
}
