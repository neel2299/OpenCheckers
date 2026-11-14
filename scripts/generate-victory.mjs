import { writeFile } from 'node:fs/promises';

// Original bell synthesis, dedicated to the public domain under CC0-1.0.
// No recordings, samples, or third-party assets. Rebuild with this script.
const rate = 44100;
const duration = 1.65;
const count = Math.ceil(duration * rate);
const wav = Buffer.alloc(44 + count * 2);
wav.write('RIFF'); wav.writeUInt32LE(36 + count * 2, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
const bell = (time, frequency) => {
  if (time <= 0) return 0;
  const attack = Math.min(1, time / 0.004);
  return attack * (Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time * 3.7)
    + 0.28 * Math.sin(2 * Math.PI * frequency * 2.76 * time) * Math.exp(-time * 6.5)
    + 0.09 * Math.sin(2 * Math.PI * frequency * 5.4 * time) * Math.exp(-time * 12));
};
for (let i = 0; i < count; i++) {
  const time = i / rate;
  const sample = (bell(time, 783.99) + bell(time - 0.16, 987.77) + bell(time - 0.32, 1174.66)) * 0.27;
  const fade = Math.min(1, (count - i - 1) / (rate * 0.05));
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * fade)) * 32767), 44 + i * 2);
}
await writeFile('assets/sounds/victory.wav', wav);
console.log(`Created original CC0 victory bell: ${wav.length} bytes`);
