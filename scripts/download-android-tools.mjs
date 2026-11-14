import { mkdir } from 'node:fs/promises';
import { downloadVerified } from './range-download.mjs';

await mkdir('.cache/toolchain', { recursive: true });
const downloads = [
  { name: 'zulu-jdk.zip', url: 'https://cdn.azul.com/zulu/bin/zulu21.54.107-ca-jdk21.0.13-win_x64.zip', checksum: '69e9fd7afafe0d70235884f8d9ab15cf8a4b43215b27900d710841e1fb3c7126' },
  { name: 'android-cli.zip', url: 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip', checksum: '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a' },
];
for (const file of downloads) {
  const destination = `.cache/toolchain/${file.name}`;
  await downloadVerified(file.url, destination, file.checksum, { chunkSize: 262144, concurrency: 16 });
}
