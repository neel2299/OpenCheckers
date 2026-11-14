import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve('dist');
const videoTempDir = path.resolve('.cache/video-recording');
const outputDir = path.resolve('publish/video');
const promoOnly = process.argv.includes('--promo-only');

const portraitMp4 = path.join(outputDir, 'opencheckers-playstore-portrait-1080x1920.mp4');
const portraitPromoMp4 = path.join(outputDir, 'opencheckers-playstore-portrait-promo-1080x1920.mp4');
const landscapeMp4 = path.join(outputDir, 'opencheckers-playstore-landscape-1920x1080.mp4');

if (!promoOnly) {
  await rm(videoTempDir, { recursive: true, force: true });
}
await mkdir(videoTempDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

if (!promoOnly) {

// 1. Start static server for dist/
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
};

const server = http.createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + requested);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if (!path.extname(file)) file = requested === '/' ? path.join(root, 'index.html') : file + '.html';
    if (!(await stat(file)).isFile()) throw new Error('Not found');
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
console.log(`Serving dist/ at ${baseUrl}`);

// Track sound events with millisecond offsets so we can mix real game audio in ffmpeg
const soundEvents = [];
let recordingStartMs = Date.now();
const cue = (type, extraDelayMs = 0) => {
  const offsetMs = Math.max(0, Date.now() - recordingStartMs + extraDelayMs);
  soundEvents.push({ type, offsetMs });
};

// Helper to play a legal move for a given side ('Coral' or 'Ivory')
async function playLegalMove(page, sideLabel, preferredFrom = null) {
  if (preferredFrom) {
    const preferred = page.getByRole('button', { name: new RegExp(`^${preferredFrom},.*${sideLabel}`) });
    if ((await preferred.count()) > 0) {
      await preferred.first().click();
      cue('select');
      await page.waitForTimeout(220);
      const dest = page.getByRole('button', { name: /, legal destination$/ });
      if ((await dest.count()) > 0) {
        await dest.first().click();
        cue('move');
        return true;
      }
    }
  }

  const pieces = page.getByRole('button', { name: new RegExp(`, ${sideLabel} (man|king)$`) });
  const count = await pieces.count();
  for (let i = 0; i < count; i++) {
    const piece = pieces.nth(i);
    if (await piece.isDisabled()) continue;
    await piece.click();
    await page.waitForTimeout(160);
    const dest = page.getByRole('button', { name: /, legal destination$/ });
    if ((await dest.count()) > 0) {
      cue('select', -150);
      await page.waitForTimeout(180);
      while ((await dest.count()) > 0) {
        await dest.first().click();
        cue('move');
        await page.waitForTimeout(220);
      }
      return true;
    }
  }
  return false;
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  // Record at 540x960 (9:16) matching recordVideo.size 1:1 so the app fills 100% of the frame with zero border
  const context = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: videoTempDir,
      size: { width: 540, height: 960 },
    },
  });

  // Skip first-launch tutorial modal and random donation prompt so the video starts right on the club board
  await context.addInitScript(() => {
    window.localStorage.setItem('draughts-club-tutorial-count', '3');
    const origRandom = Math.random;
    let calls = 0;
    Math.random = () => {
      calls += 1;
      return calls <= 3 ? 0.95 : origRandom();
    };
  });

  const page = await context.newPage();
  recordingStartMs = Date.now();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'New game settings' }).waitFor({ timeout: 30000 });
  cue('start');
  await page.waitForTimeout(1000);

  // --- SCENE 1: Play English Checkers against Jasper (~1200 Elo) ---
  console.log('Scene 1: Playing live moves on the English 8x8 board...');
  await playLegalMove(page, 'Coral', 'b6');
  await page.waitForTimeout(1300); // Wait for Jasper's AI reply
  cue('move', -450);

  await playLegalMove(page, 'Coral', 'd6');
  await page.waitForTimeout(1300); // Wait for Jasper's AI reply
  cue('capture', -450);

  await playLegalMove(page, 'Coral');
  await page.waitForTimeout(1200);
  cue('move', -400);

  // --- SCENE 2: New Game Setup (4 Variants, Time Controls, 6 AI Personalities) ---
  console.log('Scene 2: Showcasing 4 Variants, Time Controls & 6 Club AI Opponents...');
  await page.getByRole('button', { name: 'New game settings' }).click();
  cue('select');
  await page.waitForTimeout(900);

  await page.getByRole('radio', { name: /Russian, 8 by 8/ }).click();
  cue('select');
  await page.waitForTimeout(650);

  await page.getByRole('radio', { name: /Brazilian, 8 by 8/ }).click();
  cue('select');
  await page.waitForTimeout(650);

  await page.getByRole('radio', { name: /International, 10 by 10/ }).click();
  cue('select');
  await page.waitForTimeout(750);

  await page.getByRole('radio', { name: 'Time control 5 min' }).click();
  cue('select');
  await page.waitForTimeout(650);

  await page.getByRole('radio', { name: /Computer level 1600 Elo, Vera/ }).click();
  cue('select');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'Start a new game' }).click();
  cue('start');
  await page.waitForTimeout(1100);

  // Make an opening move on the 10x10 International board (Vera plays Ivory first, or if user is Coral, switch/play)
  await page.waitForTimeout(900);

  // --- SCENE 3: Full-Game Computer Analysis, Evaluation Graph & Variations ---
  console.log('Scene 3: Full-Game Computer Analysis & Saved Analysis Library...');
  await page.getByRole('tab', { name: 'Analysis', exact: true }).click();
  cue('select');
  await page.waitForTimeout(900);

  await page.getByRole('button', { name: 'New analysis' }).click();
  cue('select');
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'Import PDN game' }).click();
  cue('select');
  await page.waitForTimeout(700);

  const samplePdn = '1. b6-a5 a3-b4 2. a7-b6 b4-c5 3. b6xd4 c3xe5 4. d6xf4 e3xg5 5. f6xh4 g3-f4 6. b8-a7 f4-e5';
  const fenInput = page.getByLabel('Draughts FEN position');
  await fenInput.fill(samplePdn);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Load position' }).click();
  cue('start');
  await page.waitForTimeout(900);

  // Run full-game computer analysis
  const runAnalysisBtn = page.getByRole('button', { name: 'Run computer analysis' });
  await runAnalysisBtn.click();
  cue('select');
  // Wait for the evaluation graph to complete and render points
  await page.waitForTimeout(3500);

  // Step backward through analysed moves to show the evaluation graph cursor & move review
  const prevAnalysed = page.getByRole('button', { name: 'Previous analysed move' });
  for (let i = 0; i < 4; i++) {
    if ((await prevAnalysed.count()) > 0 && !(await prevAnalysed.isDisabled())) {
      await prevAnalysed.click();
      cue('move');
      await page.waitForTimeout(550);
    }
  }

  // Play an alternative move on the board to create a Variation while preserving the plot
  await playLegalMove(page, 'Coral');
  await page.waitForTimeout(1000);

  // Open New Analysis sheet to show the Saved Analysis slot (1 / 5)
  await page.getByRole('button', { name: 'New analysis' }).click();
  cue('select');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Close new analysis' }).click();
  await page.waitForTimeout(600);

  // --- SCENE 4: The Practice Room (37 Tactical Puzzles) ---
  console.log('Scene 4: Solving a tactical puzzle in The Practice Room...');
  await page.getByRole('tab', { name: 'Learn', exact: true }).click();
  cue('select');
  await page.waitForTimeout(900);

  await page.getByRole('button', { name: 'Open tactical puzzles' }).click();
  cue('select');
  await page.waitForTimeout(1000);

  // Open "The greedy diagonal" (c3-e5-g7 double capture)
  await page.getByRole('button', { name: /Open puzzle: The greedy diagonal/ }).click();
  cue('start');
  await page.waitForTimeout(1000);

  // Select c3, jump to e5, jump to g7
  await page.getByRole('button', { name: /^c3,.*Ivory man/ }).click();
  cue('select');
  await page.waitForTimeout(450);
  await page.getByRole('button', { name: /^e5,.*legal destination/ }).click();
  cue('capture');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /^g7,.*legal destination/ }).click();
  cue('victory');
  await page.waitForTimeout(1500);

  // --- SCENE 5: Personalization & Board Themes ---
  console.log('Scene 5: Board Themes & Club Personalization...');
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  cue('select');
  await page.waitForTimeout(900);

  await page.getByRole('radio', { name: 'walnut board theme' }).click();
  cue('select');
  await page.waitForTimeout(650);

  await page.getByRole('radio', { name: 'tournament board theme' }).click();
  cue('select');
  await page.waitForTimeout(650);

  await page.getByRole('button', { name: 'Open personalization' }).click();
  cue('select');
  await page.waitForTimeout(1000);

  await page.getByRole('tab', { name: 'Customize board' }).click();
  cue('select');
  await page.waitForTimeout(800);

  await page.getByRole('radio', { name: 'Board texture wood' }).click();
  cue('select');
  await page.waitForTimeout(750);

  await page.getByRole('radio', { name: 'Board texture royal' }).click();
  cue('promotion');
  await page.waitForTimeout(900);

  await page.getByRole('tab', { name: 'Personalization Sounds' }).click();
  cue('select');
  await page.waitForTimeout(1100);

  await context.close();
} finally {
  await browser.close();
  server.close();
}

// Find the recorded .webm file
const files = await readdir(videoTempDir);
const webmFile = files.find(f => f.endsWith('.webm'));
if (!webmFile) throw new Error('Playwright did not produce a .webm recording');
const rawWebmPath = path.join(videoTempDir, webmFile);
console.log('Recorded raw WebM:', rawWebmPath, 'with', soundEvents.length, 'audio cues.');

// 2. Build FFmpeg filter to mix real app sound effects into an audio track
const soundFiles = {
  select: path.resolve('assets/sounds/select.wav'),
  move: path.resolve('assets/sounds/move.wav'),
  capture: path.resolve('assets/sounds/capture.wav'),
  promotion: path.resolve('assets/sounds/promotion.wav'),
  start: path.resolve('assets/sounds/start.wav'),
  victory: path.resolve('assets/sounds/victory.wav'),
};

// Construct ffmpeg inputs and adelay filter graph for all recorded cues
const inputArgs = ['-y', '-i', rawWebmPath];
const filterParts = [];
const mixLabels = [];

soundEvents.forEach((ev, idx) => {
  const wav = soundFiles[ev.type] || soundFiles.select;
  inputArgs.push('-i', wav);
  const inputIdx = idx + 1;
  const label = `s${idx}`;
  filterParts.push(`[${inputIdx}:a]adelay=${ev.offsetMs}|${ev.offsetMs},volume=0.85[${label}]`);
  mixLabels.push(`[${label}]`);
});

const audioFilter =
  soundEvents.length > 0
    ? `${filterParts.join(';')};${mixLabels.join('')}amix=inputs=${soundEvents.length}:normalize=0,alimiter=limit=0.95[aout]`
    : 'anullsrc=r=44100:cl=stereo:d=30[aout]';

console.log('Encoding 1080x1920 Portrait MP4 (H.264 + AAC)...');
execFileSync(
  'ffmpeg',
  [
    ...inputArgs,
    '-filter_complex',
    `[0:v]fps=30,scale=1080:1920:flags=lanczos,format=yuv420p[vout];${audioFilter}`,
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    '44100',
    '-ac',
    '2',
    '-shortest',
    '-movflags',
    '+faststart',
    portraitMp4,
  ],
  { stdio: 'inherit' }
);
}

// 3. Render a 1920x1080 Landscape backdrop PNG so we can composite the 9:16 video onto a 16:9 Play Store YouTube canvas
const backdropPath = path.join(videoTempDir, 'landscape-backdrop-1920x1080.png');
const logoBase64 = (await readFile('assets/logo.png')).toString('base64');
const browser2 = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const bgPage = await browser2.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await bgPage.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1920px;
            height: 1080px;
            overflow: hidden;
            background: radial-gradient(circle at 22% 25%, #274730 0%, #172B1C 68%, #0E1B11 100%);
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #F8F7F2;
            display: flex;
            align-items: center;
            padding: 80px 110px;
            position: relative;
          }
          .dots {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(248, 247, 242, 0.08) 2px, transparent 2px);
            background-size: 32px 32px;
          }
          .left {
            position: relative;
            z-index: 2;
            width: 980px;
            display: flex;
            flex-direction: column;
            gap: 28px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 26px;
          }
          .logo-box {
            width: 124px;
            height: 124px;
            border-radius: 28px;
            background: #FFFFFF;
            padding: 8px;
            box-shadow: 0 18px 40px rgba(0,0,0,0.4);
          }
          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 20px;
          }
          .pill {
            display: inline-block;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #C7E3BD;
            background: rgba(199, 227, 189, 0.14);
            border: 1px solid rgba(199, 227, 189, 0.32);
            padding: 7px 16px;
            border-radius: 999px;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 74px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.04;
            color: #FFFFFF;
          }
          .subtitle {
            font-size: 28px;
            line-height: 1.45;
            color: #DCE6D9;
            font-weight: 500;
            max-width: 900px;
          }
          .features {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-top: 8px;
          }
          .card {
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            padding: 20px 24px;
          }
          .card-title {
            font-size: 22px;
            font-weight: 700;
            color: #E2F1DC;
            margin-bottom: 6px;
          }
          .card-desc {
            font-size: 17px;
            color: #C5D4C1;
            line-height: 1.4;
          }
          .phone-frame-shadow {
            position: absolute;
            left: 1195px;
            top: 52px;
            width: 556px;
            height: 976px;
            border-radius: 24px;
            background: #0A140D;
            border: 8px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 32px 80px rgba(0, 0, 0, 0.65);
          }
        </style>
      </head>
      <body>
        <div class="dots"></div>
        <div class="left">
          <div class="brand">
            <div class="logo-box"><img src="data:image/png;base64,${logoBase64}" /></div>
            <div>
              <div class="pill">100% Offline · No Ads · Private</div>
              <h1>OpenCheckers</h1>
            </div>
          </div>
          <div class="subtitle">
            Play 4 world draughts &amp; checkers variants against 6 club AI personalities, analyze full games, and solve tactical puzzles.
          </div>
          <div class="features">
            <div class="card">
              <div class="card-title">4 Rules Variants</div>
              <div class="card-desc">English (8×8), International (10×10), Russian &amp; Brazilian Draughts</div>
            </div>
            <div class="card">
              <div class="card-title">6 Club AI Rivals</div>
              <div class="card-desc">From Pip (~400 Elo) to Atlas (~2400 Elo) + 2-Player Pass &amp; Play</div>
            </div>
            <div class="card">
              <div class="card-title">Computer Analysis</div>
              <div class="card-desc">Full-game evaluation graph, variations, PDN import &amp; 5 saved slots</div>
            </div>
            <div class="card">
              <div class="card-title">37 Tactical Puzzles</div>
              <div class="card-desc">5 difficulty levels plus custom board themes, textures &amp; sounds</div>
            </div>
          </div>
        </div>
        <div class="phone-frame-shadow"></div>
      </body>
    </html>
  `);
  await bgPage.screenshot({ path: backdropPath, type: 'png' });

  const portraitBackdropPath = path.join(videoTempDir, 'portrait-backdrop-1080x1920.png');
  const pPage = await browser2.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await pPage.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1080px;
            height: 1920px;
            overflow: hidden;
            background: radial-gradient(circle at 50% 12%, #274730 0%, #172B1C 68%, #0E1B11 100%);
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #F8F7F2;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 42px 56px 0 56px;
            position: relative;
          }
          .dots {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(248, 247, 242, 0.08) 2px, transparent 2px);
            background-size: 28px 28px;
          }
          .header {
            position: relative;
            z-index: 2;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 14px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .logo-box {
            width: 88px;
            height: 88px;
            border-radius: 22px;
            background: #FFFFFF;
            padding: 6px;
            box-shadow: 0 14px 32px rgba(0,0,0,0.4);
          }
          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 16px;
          }
          .title-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .pill {
            display: inline-block;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #C7E3BD;
            background: rgba(199, 227, 189, 0.14);
            border: 1px solid rgba(199, 227, 189, 0.32);
            padding: 5px 13px;
            border-radius: 999px;
            margin-bottom: 6px;
          }
          h1 {
            font-size: 56px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.02;
            color: #FFFFFF;
          }
          .subtitle {
            font-size: 21px;
            line-height: 1.38;
            color: #DCE6D9;
            font-weight: 500;
            max-width: 920px;
          }
          .badges {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 2px;
          }
          .badge {
            font-size: 15px;
            font-weight: 600;
            color: #E2F1DC;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            padding: 7px 14px;
            border-radius: 999px;
          }
          .phone-frame-shadow {
            position: absolute;
            left: 109px;
            top: 344px;
            width: 862px;
            height: 1520px;
            border-radius: 26px;
            background: #0A140D;
            border: 8px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
          }
        </style>
      </head>
      <body>
        <div class="dots"></div>
        <div class="header">
          <div class="brand">
            <div class="logo-box"><img src="data:image/png;base64,${logoBase64}" /></div>
            <div class="title-col">
              <div class="pill">100% Offline · No Ads · Private</div>
              <h1>OpenCheckers</h1>
            </div>
          </div>
          <div class="subtitle">
            4 Checkers &amp; Draughts Variants · 6 Club AI Opponents · Full-Game Analysis · 37 Puzzles
          </div>
          <div class="badges">
            <div class="badge">English · Intl 10×10 · Russian · Brazilian</div>
            <div class="badge">Evaluation Graph &amp; 5 Saved Slots</div>
            <div class="badge">Custom Boards &amp; Sounds</div>
          </div>
        </div>
        <div class="phone-frame-shadow"></div>
      </body>
    </html>
  `);
  await pPage.screenshot({ path: portraitBackdropPath, type: 'png' });
} finally {
  await browser2.close();
}

const portraitBackdropPath = path.join(videoTempDir, 'portrait-backdrop-1080x1920.png');
console.log('Encoding 1080x1920 Portrait Promo MP4 (H.264 + AAC)...');
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loop',
    '1',
    '-i',
    portraitBackdropPath,
    '-i',
    portraitMp4,
    '-filter_complex',
    '[1:v]scale=846:1504:flags=lanczos[fg];[0:v][fg]overlay=117:352:shortest=1,format=yuv420p[vout]',
    '-map',
    '[vout]',
    '-map',
    '1:a',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-c:a',
    'copy',
    '-movflags',
    '+faststart',
    portraitPromoMp4,
  ],
  { stdio: 'inherit' }
);

console.log('Encoding 1920x1080 Landscape Play Store Promo MP4 (H.264 + AAC)...');
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-loop',
    '1',
    '-i',
    backdropPath,
    '-i',
    portraitMp4,
    '-filter_complex',
    '[1:v]scale=540:960:flags=lanczos[fg];[0:v][fg]overlay=1203:60:shortest=1,format=yuv420p[vout]',
    '-map',
    '[vout]',
    '-map',
    '1:a',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '20',
    '-c:a',
    'copy',
    '-movflags',
    '+faststart',
    landscapeMp4,
  ],
  { stdio: 'inherit' }
);

console.log('Play Store videos generated successfully in publish/video/');

