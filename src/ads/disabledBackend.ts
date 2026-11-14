import type { RewardedPort } from './RewardedSession';
export const ADS_AVAILABLE = false;
export type AdPrivacy = { required: boolean };
export async function refreshAdPrivacy(): Promise<AdPrivacy> { return { required: false }; }
export async function showAdPrivacy(): Promise<AdPrivacy> { return { required: false }; }
export async function currentAdPrivacy(): Promise<AdPrivacy> { return { required: false }; }
export async function prepareRewardedAds(active: () => boolean): Promise<AdPrivacy> {
  if (!active()) throw new Error('Ad preparation canceled.');
  throw new Error('Ads are currently disabled.');
}
export function createRewardedPort(): RewardedPort { throw new Error('Ads are currently disabled.'); }
