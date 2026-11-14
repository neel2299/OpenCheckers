import type { MediaAsset } from './model';

const urls = new Map<string, string>();
export function releaseUnusedMedia(keep: string[]): void {
  for (const [id, uri] of urls) if (!keep.includes(id)) { URL.revokeObjectURL(uri); urls.delete(id); }
}
export async function mediaBytes(uri: string): Promise<number> { return (await (await fetch(uri)).blob()).size; }
async function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') throw new Error('Your browser cannot save imported files. Try a regular browser window.');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('draughts-club-personalization', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('media');
    request.onerror = () => reject(new Error('Could not open device storage.'));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function saveMedia(uri: string, asset: MediaAsset): Promise<number> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected file.');
  const blob = await response.blob();
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('media', 'readwrite');
      transaction.objectStore('media').put(blob, asset.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error('Could not save the file. Device storage may be full.'));
    });
  } finally { db.close(); }
  return blob.size;
}
export async function resolveMedia(asset: MediaAsset): Promise<string | null> {
  if (urls.has(asset.id)) return urls.get(asset.id)!;
  const db = await database();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction('media', 'readonly').objectStore('media').get(asset.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!blob) return null;
    // Concurrent readers can share one object URL for the rest of this session.
    if (!urls.has(asset.id)) urls.set(asset.id, URL.createObjectURL(blob));
    return urls.get(asset.id)!;
  } finally { db.close(); }
}
export async function cleanUnusedMedia(keep: string[]): Promise<number> {
  const db = await database();
  try {
    return await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction('media', 'readwrite');
      const store = transaction.objectStore('media');
      const request = store.openKeyCursor();
      let removed = 0;
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const id = String(cursor.key);
        if (!keep.includes(id)) { store.delete(id); if (urls.has(id)) URL.revokeObjectURL(urls.get(id)!); urls.delete(id); removed++; }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(removed);
      transaction.onerror = transaction.onabort = () => reject(new Error('Could not clean up imported files.'));
    });
  } finally { db.close(); }
}
