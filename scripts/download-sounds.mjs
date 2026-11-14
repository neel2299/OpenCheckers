import { mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';

/**
 * Rebuilds assets/sounds/*.wav from Kenney's "Interface Sounds" pack (CC0 1.0, public domain),
 * via the Calinou/kenney-interface-sounds mirror. Requires network access and ffmpeg on PATH.
 * See assets/sounds/LICENSE.md for the cue mapping and licence text.
 */
const base = 'https://raw.githubusercontent.com/Calinou/kenney-interface-sounds/HEAD/addons/kenney_interface_sounds/';
const sources = ['select_002', 'drop_002', 'drop_003', 'confirmation_001', 'confirmation_004', 'maximize_006'];
const temp = 'assets/sounds_temp';
const mono = (input, output, extra = []) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...input, ...extra, '-ar', '44100', '-ac', '1', output], { stdio: 'inherit' });

await mkdir(temp, { recursive: true });
try {
  const licence = await fetch(`${base}LICENSE.txt`).then(r => r.text());
  if (!/Creative Commons Zero, CC0/.test(licence)) throw new Error('Upstream licence is no longer CC0 — stop and review before shipping.');
  for (const name of sources) {
    const res = await fetch(`${base}${name}.wav`);
    if (!res.ok) throw new Error(`Failed to fetch ${name}.wav: ${res.status}`);
    await writeFile(`${temp}/${name}.wav`, Buffer.from(await res.arrayBuffer()));
  }
  const src = name => ['-i', `${temp}/${name}.wav`];
  mono(src('select_002'), 'assets/sounds/select.wav');
  mono(src('drop_003'), 'assets/sounds/move.wav');
  // Capture = two staggered drops, so it reads as a "double clack" distinct from a plain move.
  mono([...src('drop_002'), ...src('drop_003')], 'assets/sounds/capture.wav', ['-filter_complex',
    '[0:a]aformat=channel_layouts=mono[a];[1:a]aformat=channel_layouts=mono,adelay=70[b];[a][b]amix=inputs=2:duration=longest:normalize=0,volume=0.75']);
  mono(src('confirmation_001'), 'assets/sounds/promotion.wav');
  mono(src('maximize_006'), 'assets/sounds/start.wav');
  mono(src('confirmation_004'), 'assets/sounds/finish.wav');
  console.log('assets/sounds rebuilt from Kenney Interface Sounds (CC0).');
} finally {
  await rm(temp, { recursive: true, force: true });
}
