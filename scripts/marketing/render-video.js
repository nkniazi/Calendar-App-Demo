// Renders marketing/tiles/video.html frame-by-frame → marketing/etsy-video/lifebalance-etsy-15s.mp4
// Usage: node scripts/marketing/render-video.js   (needs marketing/.tools with ffmpeg-static)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = 'file:///' + path.join(ROOT, 'marketing', 'tiles', 'video.html').replace(/\\/g, '/');
const FRAMES = path.join(ROOT, 'marketing', '.frames');
const OUT_DIR = path.join(ROOT, 'marketing', 'etsy-video');
const FFMPEG = require(path.join(ROOT, 'marketing', '.tools', 'node_modules', 'ffmpeg-static'));
const FPS = 30, SECONDS = 15;

fs.rmSync(FRAMES, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(SRC, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const total = FPS * SECONDS;
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => renderAt(t), f / FPS);
    await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  await browser.close();

  const out = path.join(OUT_DIR, 'lifebalance-etsy-15s.mp4');
  execFileSync(FFMPEG, ['-y', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: 'ignore' });
  fs.rmSync(FRAMES, { recursive: true, force: true });
  console.log('saved', out, (fs.statSync(out).size / 1024 / 1024).toFixed(1) + ' MB');
})();
