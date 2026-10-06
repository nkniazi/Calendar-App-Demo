// Renders marketing/tiles/tiles.html → marketing/etsy-images/*.jpg at 3000x2250 (Etsy 4:3).
// Usage: node scripts/marketing/render-tiles.js   (run capture.js first)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = 'file:///' + path.join(ROOT, 'marketing', 'tiles', 'tiles.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'marketing', 'etsy-images');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const ids = await page.$$eval('section.tile', els => els.map(e => e.id));
  for (const id of ids) {
    const file = path.join(OUT, id + '.jpg');
    await page.locator('#' + id).screenshot({ path: file, type: 'jpeg', quality: 92 });
    console.log('saved', path.basename(file), Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  await browser.close();
})();
