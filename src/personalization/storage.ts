import { Directory, File, Paths } from 'expo-file-system';
import type { MediaAsset } from './model';

const folder = () => new Directory(Paths.document, 'personalization');
export async function mediaBytes(uri: string): Promise<number> { return new File(uri).size; }
export function releaseUnusedMedia(_keep: string[]): void { /* Native image/audio caches manage their own memory. */ }
export async function saveMedia(uri: string, asset: MediaAsset): Promise<number> {
  const directory = folder();
  await directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, asset.id);
  await new File(uri).copy(destination);
  return destination.size;
}
export async function resolveMedia(asset: MediaAsset): Promise<string | null> {
  const file = new File(folder(), asset.id);
  return file.exists ? file.uri : null;
}
export async function cleanUnusedMedia(keep: string[]): Promise<number> {
  const directory = folder();
  if (!directory.exists) return 0;
  const unused = directory.list().filter(file => file instanceof File && /^media-[a-z0-9-]+\.[a-z0-9]+$/.test(file.name) && !keep.includes(file.name));
  await Promise.all(unused.map(file => file.delete()));
  return unused.length;
}
