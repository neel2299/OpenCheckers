import type { FeedbackCue } from '../feedback/events.ts';
import type { Side } from '../game/variants.ts';

export const THEMES = {
  sage: { dark: '#779183', light: '#E7EBDA', frame: '#E2E5D7', last: '#B7C58B' },
  walnut: { dark: '#A88668', light: '#F0E4D0', frame: '#E8D9C0', last: '#D0BA7F' },
  slate: { dark: '#7D8B9C', light: '#E6E9ED', frame: '#DCE1E7', last: '#ABBDA7' },
  tournament: { dark: '#4E7A5B', light: '#F3EFE2', frame: '#D9E2D6', last: '#B5CE89' },
};
export type BoardPalette = { dark: string; light: string; frame: string; last: string };
export type BoardSurface = 'dark' | 'light' | 'frame';
export const TEXTURES = ['none', 'wood', 'linen', 'marble', 'dots'] as const;
export const DEFAULT_BACKGROUND_COLOR = '#173D30';
export type Texture = typeof TEXTURES[number] | 'royal';
export const SOUND_EVENTS: { id: FeedbackCue; name: string; description: string }[] = [
  { id: 'select', name: 'Selection', description: 'Picking up a piece' },
  { id: 'move', name: 'Move', description: 'Landing on a new square' },
  { id: 'capture', name: 'Capture', description: 'Taking an opponent’s piece' },
  { id: 'promotion', name: 'Promotion', description: 'Crowning a new king' },
  { id: 'start', name: 'Game start', description: 'A fresh board' },
  { id: 'finish', name: 'Game finish', description: 'A completed game' },
  { id: 'victory', name: 'Victory', description: 'A win or a solved puzzle' },
  { id: 'undo', name: 'Undo', description: 'Taking back a move' },
];
export type BuiltinSound = Exclude<FeedbackCue, 'undo'>;
export const BUILTIN_SOUNDS = SOUND_EVENTS.filter(event => event.id !== 'undo') as { id: BuiltinSound; name: string; description: string }[];
export interface MediaAsset { id: string; name: string; kind: 'image' | 'audio'; bytes: number }
export interface SoundChoice { source: 'default' | 'mute' | 'custom' | BuiltinSound; volume: number; asset?: MediaAsset }
export interface Personalization {
  version: 2;
  background: { color: string; texture: Texture; imageOpacity: number; image?: MediaAsset };
  board: { palette?: BoardPalette; texture: Texture; textureOpacity: number; images: Partial<Record<BoardSurface, MediaAsset>> };
  pieces: { white: string; black: string; texture: Texture; images: Partial<Record<Side, MediaAsset>> };
  sounds: Record<FeedbackCue, SoundChoice>;
}
export const defaultPersonalization = (): Personalization => ({
  version: 2,
  background: { color: DEFAULT_BACKGROUND_COLOR, texture: 'dots', imageOpacity: 0.5 },
  board: { texture: 'none', textureOpacity: 0.5, images: {} },
  pieces: { white: '#FAF6E9', black: '#CC785F', texture: 'none', images: {} },
  sounds: Object.fromEntries(SOUND_EVENTS.map(event => [event.id, { source: 'default', volume: 1 }])) as Personalization['sounds'],
});
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const fraction = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const texture = (value: unknown, fallback: Texture = 'none'): Texture => value === 'royal' || (TEXTURES as readonly unknown[]).includes(value) ? value as Texture : fallback;
export function restoreMediaAsset(value: unknown, kind: MediaAsset['kind']): MediaAsset | undefined {
  const asset = object(value);
  if (asset.kind !== kind || typeof asset.id !== 'string' || !/^media-[a-z0-9-]+\.(jpg|png|webp|mp3|m4a|wav|ogg|aac)$/.test(asset.id) || typeof asset.name !== 'string' || typeof asset.bytes !== 'number' || !Number.isFinite(asset.bytes) || asset.bytes <= 0 || asset.bytes > (kind === 'image' ? 12 : 5) * 1024 * 1024) return;
  if (!(kind === 'image' ? /\.(jpg|png|webp)$/ : /\.(mp3|m4a|wav|ogg|aac)$/).test(asset.id)) return;
  return { id: asset.id, kind, name: asset.name.slice(0, 120), bytes: asset.bytes };
}
export function restorePersonalization(value: unknown): Personalization {
  const input = object(value), defaults = defaultPersonalization();
  const background = object(input.background), board = object(input.board), pieces = object(input.pieces), sounds = object(input.sounds);
  const palette = object(board.palette);
  // Bring untouched rooms forward while keeping custom colors, textures, and photos.
  const oldDefaultRoom = input.version !== 2 && background.color === '#F3F5F1' && background.texture === 'none' && !background.image;
  return {
    version: 2,
    background: { color: !oldDefaultRoom && isHexColor(background.color) ? background.color : defaults.background.color, texture: oldDefaultRoom ? defaults.background.texture : texture(background.texture, defaults.background.texture), imageOpacity: fraction(background.imageOpacity, 0.5), image: restoreMediaAsset(background.image, 'image') },
    board: {
      palette: ['dark', 'light', 'frame', 'last'].every(key => isHexColor(palette[key])) ? palette as BoardPalette : undefined,
      texture: texture(board.texture), textureOpacity: fraction(board.textureOpacity, 0.5),
      images: Object.fromEntries((['dark', 'light', 'frame'] as const).map(key => [key, restoreMediaAsset(object(board.images)[key], 'image')])),
    },
    pieces: { white: isHexColor(pieces.white) ? pieces.white : defaults.pieces.white, black: isHexColor(pieces.black) ? pieces.black : defaults.pieces.black, texture: texture(pieces.texture), images: { white: restoreMediaAsset(object(pieces.images).white, 'image'), black: restoreMediaAsset(object(pieces.images).black, 'image') } },
    sounds: Object.fromEntries(SOUND_EVENTS.map(({ id }) => {
      const sound = object(sounds[id]);
      const asset = restoreMediaAsset(sound.asset, 'audio');
      const allowed = ['default', 'mute', 'custom', ...BUILTIN_SOUNDS.map(event => event.id)];
      const source = allowed.includes(sound.source as string) && (sound.source !== 'custom' || asset) ? sound.source as SoundChoice['source'] : 'default';
      return [id, { source, volume: fraction(sound.volume, 1), ...(asset ? { asset } : {}) }];
    })) as Personalization['sounds'],
  };
}
export function personalizationAssets(value: Personalization): MediaAsset[] {
  const assets = [value.background.image, ...Object.values(value.board.images), ...Object.values(value.pieces.images), ...Object.values(value.sounds).map(sound => sound.asset)];
  return [...new Map(assets.filter((asset): asset is MediaAsset => Boolean(asset)).map(asset => [asset.id, asset])).values()];
}
export function validateImport(name: string, kind: MediaAsset['kind'], bytes: number): string {
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
  const allowed = kind === 'image' ? ['jpg', 'jpeg', 'png', 'webp'] : ['mp3', 'm4a', 'wav', 'ogg', 'aac'];
  const limit = (kind === 'image' ? 12 : 5) * 1024 * 1024;
  if (!allowed.includes(extension)) throw new Error(kind === 'image' ? 'Choose a JPG, PNG, or WebP image.' : 'Choose an MP3, M4A, WAV, OGG, or AAC sound.');
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > limit) throw new Error(`Choose a ${kind === 'image' ? 'picture under 12 MB' : 'sound under 5 MB'}.`);
  return extension === 'jpeg' ? 'jpg' : extension;
}
