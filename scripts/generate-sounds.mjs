import { mkdir, writeFile } from 'node:fs/promises';

// Original, deterministic synthesis: no downloaded or licensed sound recordings.
const rate = 22050;
const tau = 2 * Math.PI;
let seed = 0x51a9;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x80000000 - 1; };
const tap = (t, frequency = 560) => t < 0 ? 0 : Math.exp(-t * 52) * (Math.sin(tau * frequency * t) * 0.7 + Math.sin(tau * frequency * 2.7 * t) * 0.2 + noise() * 0.1) * Math.min(1, t / 0.0015);
const bell = (t, frequency) => t < 0 ? 0 : Math.sin(tau * frequency * t) * Math.exp(-t * 8) * Math.min(1, t / 0.006);
const sounds = {
  select: [0.065, t => tap(t, 960) * 0.32],
  move: [0.15, t => tap(t, 540) * 0.75],
  capture: [0.24, t => tap(t, 310) * 0.65 + tap(t - 0.065, 440) * 0.45],
  promotion: [0.65, t => bell(t, 660) * 0.26 + bell(t - 0.09, 830.61) * 0.25 + bell(t - 0.18, 987.77) * 0.3],
  start: [0.4, t => bell(t, 440) * 0.24 + bell(t - 0.09, 660) * 0.3],
  finish: [0.85, t => bell(t, 523.25) * 0.23 + bell(t - 0.12, 659.25) * 0.23 + bell(t - 0.24, 783.99) * 0.3],
};
await mkdir('assets/sounds', { recursive: true });
for (const [name, [duration, sample]] of Object.entries(sounds)) {
  const count = Math.ceil(duration * rate), data = Buffer.alloc(44 + count * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + count * 2, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, (count - i - 1) / (rate * 0.02));
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample(i / rate) * fade)) * 32700), 44 + i * 2);
  }
  await writeFile(`assets/sounds/${name}.wav`, data);
  console.log(`${name}.wav: ${data.length} bytes`);
}
