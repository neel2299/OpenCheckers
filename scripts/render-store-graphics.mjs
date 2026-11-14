import { chromium } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('publish/graphics', { recursive: true });
await mkdir('publish/screenshots/phone', { recursive: true });
await mkdir('publish/screenshots/tablet-7in', { recursive: true });
await mkdir('publish/screenshots/tablet-10in', { recursive: true });

// 1. Copy 512x512 Google Play icon and 1024x1024 high-res icon
await copyFile('assets/splash-icon.png', 'publish/graphics/icon-512x512.png');
await copyFile('assets/icon.png', 'publish/graphics/icon-1024x1024.png');

// 2. Copy curated native 1080x2400 phone screenshots (9:20 aspect ratio, well within Google Play's 320-3840px requirement)
const phoneScreenshots = [
  ['artifacts/opencheckers-android-1.0.0.png', 'publish/screenshots/phone/01-play-board-and-opponents.png'],
  ['artifacts/saved-analysis-native.png', 'publish/screenshots/phone/02-full-game-computer-analysis.png'],
  ['artifacts/saved-analysis-library-native.png', 'publish/screenshots/phone/03-saved-analysis-library.png'],
  ['artifacts/computer-analysis-native.png', 'publish/screenshots/phone/04-evaluation-graph-and-variations.png'],
  ['artifacts/native-1.6.2-launch-1.png', 'publish/screenshots/phone/05-club-room-and-gameplay.png'],
  ['artifacts/native-1.6.2-sound-preview.png', 'publish/screenshots/phone/06-personalization-and-sound-settings.png'],
];

for (const [src, dest] of phoneScreenshots) {
  await copyFile(src, dest);
}

// 3. Render 1024x500 Feature Graphic (24-bit RGB PNG, no alpha) and high-res 16:10 tablet screenshots
const logoBase64 = (await readFile('assets/logo.png')).toString('base64');
const tabletPlayBase64 = (await readFile('artifacts/dark-green-room-desktop.png')).toString('base64');
const tabletAnalysisBase64 = (await readFile('artifacts/computer-analysis-desktop.png')).toString('base64');
const tabletVariationsBase64 = (await readFile('artifacts/saved-analysis-variation-desktop.png')).toString('base64');
const tabletPersonalizeBase64 = (await readFile('artifacts/personalization-desktop.png')).toString('base64');

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            width: 1024px;
            height: 500px;
            overflow: hidden;
            background: radial-gradient(circle at 20% 20%, #274730 0%, #172B1C 68%, #101F14 100%);
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
            color: #F8F7F2;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 44px 54px;
            position: relative;
          }
          .dots {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(248, 247, 242, 0.09) 1.5px, transparent 1.5px);
            background-size: 24px 24px;
            pointer-events: none;
          }
          .left {
            position: relative;
            z-index: 2;
            max-width: 590px;
            display: flex;
            flex-direction: column;
            gap: 18px;
          }
          .brand-row {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .logo-card {
            width: 96px;
            height: 96px;
            border-radius: 22px;
            background: #FFFFFF;
            padding: 6px;
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .logo-card img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            border-radius: 16px;
          }
          .eyebrow {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #B9D4B5;
            background: rgba(185, 212, 181, 0.14);
            border: 1px solid rgba(185, 212, 181, 0.3);
            padding: 5px 11px;
            border-radius: 999px;
            margin-bottom: 6px;
          }
          h1 {
            font-size: 50px;
            font-weight: 800;
            letter-spacing: -0.02em;
            line-height: 1.05;
            color: #FFFFFF;
          }
          .subtitle {
            font-size: 19px;
            line-height: 1.45;
            color: #DCE6D9;
            font-weight: 500;
          }
          .pills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 4px;
          }
          .pill {
            background: rgba(248, 247, 242, 0.11);
            border: 1px solid rgba(248, 247, 242, 0.24);
            color: #F8F7F2;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
          }
          .right {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .board-frame {
            width: 312px;
            height: 312px;
            background: #D9CFC1;
            border-radius: 22px;
            padding: 14px;
            box-shadow: 0 22px 48px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.6);
            transform: rotate(3deg);
          }
          .board-grid {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 1fr);
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #4A5D44;
          }
          .sq {
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          }
          .light { background: #EFECE4; }
          .dark { background: #5B7353; }
          .disc {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 20px;
          }
          .ivory {
            background: radial-gradient(circle at 35% 30%, #FFFFFF, #E5DEC9);
            border: 3px solid #C5BBA2;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            color: #6B5B35;
          }
          .coral {
            background: radial-gradient(circle at 35% 30%, #D96B52, #AE4E3D);
            border: 3px solid #823426;
            box-shadow: 0 4px 8px rgba(0,0,0,0.35);
            color: #FFE6DF;
          }
        </style>
      </head>
      <body>
        <div class="dots"></div>
        <div class="left">
          <div class="brand-row">
            <div class="logo-card">
              <img src="data:image/png;base64,${logoBase64}" alt="OpenCheckers" />
            </div>
            <div>
              <span class="eyebrow">Offline Board &amp; Strategy Club</span>
              <h1>OpenCheckers</h1>
            </div>
          </div>
          <p class="subtitle">
            Play English, International 10×10, Russian &amp; Brazilian draughts against 6 AI personalities—with full-game computer analysis &amp; 37 tactical puzzles.
          </p>
          <div class="pills">
            <span class="pill">4 Rule Variants</span>
            <span class="pill">6 AI Opponents (400–2400 Elo)</span>
            <span class="pill">Full-Game Analysis</span>
            <span class="pill">37 Offline Puzzles</span>
            <span class="pill">100% Offline &amp; Ad-Free</span>
          </div>
        </div>
        <div class="right">
          <div class="board-frame">
            <div class="board-grid">
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc coral">♛</div></div>
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc coral"></div></div>
              <div class="sq dark"><div class="disc coral"></div></div>
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc ivory">♛</div></div>
              <div class="sq light"></div>
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc ivory"></div></div>
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc coral"></div></div>
              <div class="sq dark"><div class="disc ivory"></div></div>
              <div class="sq light"></div>
              <div class="sq dark"><div class="disc ivory"></div></div>
              <div class="sq light"></div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: 'publish/graphics/feature-graphic-1024x500.png', omitBackground: false });

  // Render 16:10 tablet screenshots at 1600x1000 (for both 7-inch and 10-inch tablet slots in Google Play Console)
  const tabletShots = [
    ['01-tablet-club-play.png', tabletPlayBase64],
    ['02-tablet-computer-analysis.png', tabletAnalysisBase64],
    ['03-tablet-variation-explorer.png', tabletVariationsBase64],
    ['04-tablet-club-personalization.png', tabletPersonalizeBase64],
  ];
  for (const [name, b64] of tabletShots) {
    const dataUrl = await page.evaluate(async raw => {
      const img = new Image();
      img.src = `data:image/png;base64,${raw}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1D3322';
      ctx.fillRect(0, 0, 1600, 1000);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const offsetX = Math.round((1600 - img.naturalWidth) / 2);
      const offsetY = Math.round((1000 - img.naturalHeight) / 2);
      ctx.drawImage(img, offsetX, offsetY);
      return canvas.toDataURL('image/png').split(',')[1];
    }, b64);
    const buf = Buffer.from(dataUrl, 'base64');
    await writeFile(`publish/screenshots/tablet-7in/${name}`, buf);
    await writeFile(`publish/screenshots/tablet-10in/${name}`, buf);
  }
} finally {
  await browser.close();
}
console.log('Store graphics and screenshots generated.');

