// Check the compiled APK, not just ProGuard configuration: these constructors
// are invoked reflectively by AndroidX Startup before the first app screen.
// DEX layout: https://source.android.com/docs/core/runtime/dex-format
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const apk = readFileSync(process.argv[2]);
const required = new Map([
  ['Landroidx/work/impl/WorkDatabase_Impl;', false],
  ['Landroidx/work/OverwritingInputMerger;', false],
  ['Landroidx/work/ArrayCreatingInputMerger;', false],
]);
let workManagerBundled = false;
function* startupFiles(zip) {
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || zip.readUInt32LE(end) !== 0x06054b50) throw new Error('Missing APK ZIP directory.');
  let at = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error('Invalid APK ZIP entry.');
    const nameLength = zip.readUInt16LE(at + 28);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    if (/^classes\d*\.dex$/.test(name) || name === 'AndroidManifest.xml') {
      const local = zip.readUInt32LE(at + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const compressed = zip.subarray(start, start + zip.readUInt32LE(at + 20));
      const method = zip.readUInt16LE(at + 10);
      if (method !== 0 && method !== 8) throw new Error('Unsupported startup-file compression.');
      yield { name, data: method === 8 ? inflateRawSync(compressed) : compressed };
    }
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
}
function inspect(dex) {
  if (dex.toString('ascii', 0, 4) !== 'dex\n') throw new Error('Invalid DEX header.');
  const strings = dex.readUInt32LE(60), types = dex.readUInt32LE(68), protos = dex.readUInt32LE(76), methods = dex.readUInt32LE(92);
  const classes = dex.readUInt32LE(100), count = dex.readUInt32LE(96);
  function uleb(cursor) {
    let value = 0, shift = 0, byte;
    do { byte = dex[cursor.at++]; value |= (byte & 127) << shift; shift += 7; } while (byte & 128);
    return value >>> 0;
  }
  function string(index) {
    const cursor = { at: dex.readUInt32LE(strings + index * 4) };
    uleb(cursor); // UTF-16 length; descriptors and method names below are ASCII.
    return dex.toString('utf8', cursor.at, dex.indexOf(0, cursor.at));
  }
  for (let n = 0; n < count; n++) {
    const at = classes + n * 32;
    const classIndex = dex.readUInt32LE(at);
    const descriptor = string(dex.readUInt32LE(types + classIndex * 4));
    if (descriptor.startsWith('Landroidx/work/')) workManagerBundled = true;
    if (!required.has(descriptor)) continue;
    const cursor = { at: dex.readUInt32LE(at + 24) };
    if (!cursor.at) continue;
    const staticFields = uleb(cursor), instanceFields = uleb(cursor), directMethods = uleb(cursor);
    uleb(cursor); // virtual methods cannot contain constructors.
    for (let f = 0; f < staticFields + instanceFields; f++) { uleb(cursor); uleb(cursor); }
    let methodIndex = 0;
    for (let m = 0; m < directMethods; m++) {
      methodIndex += uleb(cursor);
      const access = uleb(cursor), code = uleb(cursor);
      const methodAt = methods + methodIndex * 8;
      const proto = protos + dex.readUInt16LE(methodAt + 2) * 12;
      const parameters = dex.readUInt32LE(proto + 8);
      if (dex.readUInt16LE(methodAt) === classIndex && string(dex.readUInt32LE(methodAt + 4)) === '<init>' && (!parameters || dex.readUInt32LE(parameters) === 0) && (access & 1) && code) required.set(descriptor, true);
    }
  }
}
for (const { name, data } of startupFiles(apk)) {
  if (name !== 'AndroidManifest.xml') inspect(data);
  // A manifest reference must also trigger verification if R8 stripped every
  // implementation class. Android binary XML may use UTF-8 or UTF-16 strings.
  else if (['utf8', 'utf16le'].some(encoding => data.includes(Buffer.from('androidx.work.', encoding)))) workManagerBundled = true;
}
// Removing the ad SDK removes WorkManager entirely. In that case there is no
// WorkManager initializer and no reflection-only constructors to preserve.
const missing = workManagerBundled ? [...required].filter(([, present]) => !present).map(([name]) => name) : [];
if (missing.length) throw new Error(`APK will fail Android startup: public no-argument constructors missing for ${missing.join(', ')}`);
console.log(JSON.stringify({ workManagerBundled, startupConstructorsVerified: [...required].filter(([, present]) => present).map(([name]) => name) }));
