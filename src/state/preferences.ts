import { defaultPersonalization, restorePersonalization, type Personalization } from '../personalization/model.ts';

export interface Preferences {
  hints: boolean;
  numbers: boolean;
  theme: 'sage' | 'walnut' | 'slate' | 'tournament';
  animations: boolean;
  sound: boolean;
  haptics: boolean;
  volume: number;
  personalization: Personalization;
}

export const DEFAULT_PREFERENCES: Preferences = {
  hints: true, numbers: false, theme: 'sage',
  animations: true, sound: true, haptics: true, volume: 0.5,
  personalization: defaultPersonalization(),
};

/** Merge older saves without changing an existing user's choices. */
export function restorePreferences(value: unknown): Preferences {
  const input = value && typeof value === 'object' ? value as Partial<Preferences> : {};
  const result = { ...DEFAULT_PREFERENCES };
  for (const key of ['hints', 'numbers', 'animations', 'sound', 'haptics'] as const) {
    if (typeof input[key] === 'boolean') result[key] = input[key];
  }
  if (input.theme && ['sage', 'walnut', 'slate', 'tournament'].includes(input.theme)) result.theme = input.theme;
  if (typeof input.volume === 'number' && Number.isFinite(input.volume)) result.volume = Math.max(0, Math.min(1, input.volume));
  result.personalization = input.personalization ? restorePersonalization(input.personalization) : defaultPersonalization();
  return result;
}
