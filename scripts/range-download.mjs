import { open, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

export async function downloadVerified(url, destination, expectedHash, options = {}) {
  const hashFile = async () => {
    if (!(await stat(destination).catch(() => null))?.size) return '';
    const hash = createHash(options.algorithm ?? 'sha256'); await pipeline(createReadStream(destination), hash); return hash.digest('hex');
  };
  if (await hashFile() === expectedHash) { console.log(`${destination}: already verified`); return; }
  const first = await fetch(url, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(30000) });
  if (first.status !== 206) throw new Error(`Range download unavailable: ${first.status}`);
  const total = Number(first.headers.get('content-range')?.split('/')[1]);
  await first.arrayBuffer();
  if (!total) throw new Error('Missing download size');
  const chunkSize = options.chunkSize ?? 1024 * 1024;
  const count = Math.ceil(total / chunkSize);
  const file = await open(destination, 'w');
  await file.truncate(total);
  let next = 0, completed = 0;
  console.log(`${destination}: ${Math.round(total / 1048576)} MB in ${count} chunks`);
  try {
    await Promise.all(Array.from({ length: options.concurrency ?? 12 }, async () => {
      while (next < count) {
        const index = next++, start = index * chunkSize, end = Math.min(total - 1, start + chunkSize - 1);
        let success = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(45000) });
            if (response.status !== 206) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
            const bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length !== end - start + 1) throw new Error('Incomplete chunk');
            await file.write(bytes, 0, bytes.length, start);
            success = true; break;
          } catch (error) { if (attempt === 2) throw error; }
        }
        if (!success) throw new Error('Chunk download failed');
        completed++;
        if (completed % 24 === 0 || completed === count) console.log(`${destination}: ${Math.round(completed / count * 100)}%`);
      }
    }));
  } finally { await file.close(); }
  const actual = await hashFile();
  if (actual !== expectedHash) throw new Error(`SHA-256 mismatch for ${destination}: ${actual}`);
  console.log(`${destination}: ${options.algorithm ?? 'sha256'} verified`);
}
