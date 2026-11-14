import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Keep the supplied artwork as the source for every app surface. Resizing is
// deterministic; the original design and white background are preserved.
const source = await readFile(new URL('../assets/logo.png', import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const outputs = await page.evaluate(async data => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    if (image.naturalWidth !== image.naturalHeight) throw new Error('The logo must be square.');

    const render = (size, scale = 1) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, size, size);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      const inset = size * (1 - scale) / 2;
      context.drawImage(image, inset, inset, size * scale, size * scale);
      return canvas.toDataURL('image/png').split(',')[1];
    };
    return {
      'icon.png': render(1024),
      'splash-icon.png': render(512),
      'brand.png': render(128),
      'favicon.png': render(64),
      // Additional padding keeps the complete mark inside Android's adaptive
      // icon safe zone, including launchers that apply a circular mask.
      'android-icon-foreground.png': render(1024, 0.76),
    };
  }, source.toString('base64'));
  for (const [name, data] of Object.entries(outputs)) {
    await writeFile(new URL(`../assets/${name}`, import.meta.url), Buffer.from(data, 'base64'));
    console.log(`Updated assets/${name}`);
  }
} finally {
  await browser.close();
}
