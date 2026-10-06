#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '..', 'dist', 'etsy', 'LifeBalance-Planner.html');
const OUT_DIR = path.resolve(__dirname, '..', 'marketing', 'etsy-images');
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'dist', 'etsy', 'screenshots');

fs.mkdirSync(OUT_DIR, { recursive: true });

const { seedData } = require('./capture-screenshots.js');

const IMG_W = 3000, IMG_H = 2250;

function overlayHTML(screenshotFile, headline, subtext, opts = {}) {
  const bgColor = opts.dark ? '#1a1b1e' : '#f8f7f5';
  const textColor = opts.dark ? '#e8eaf0' : '#1a1b2e';
  const accentColor = opts.dark ? '#7b8fd4' : '#3d59ab';
  const imgPath = `file:///${screenshotFile.replace(/\\/g, '/')}`;
  const imgWidth = opts.imgWidth || 65;
  const imgAlign = opts.imgRight ? 'right' : 'left';
  const textAlign = opts.imgRight ? 'left' : 'right';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${IMG_W}px; height:${IMG_H}px; background:${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; overflow:hidden; }
.img-side { width:${imgWidth}%; height:100%; display:flex; align-items:center; justify-content:center; padding:60px; order:${opts.imgRight ? 2 : 1}; }
.img-side img { max-width:100%; max-height:100%; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,${opts.dark ? '0.5' : '0.15'}); }
.text-side { width:${100 - imgWidth}%; height:100%; display:flex; flex-direction:column; justify-content:center; padding:80px 60px; order:${opts.imgRight ? 1 : 2}; }
h1 { font-size:${opts.headSize || 72}px; font-weight:800; color:${textColor}; line-height:1.15; margin-bottom:24px; }
h1 span { color:${accentColor}; }
p { font-size:${opts.subSize || 32}px; color:${opts.dark ? '#8b8fa0' : '#666'}; line-height:1.5; }
.badge { display:inline-block; background:${accentColor}; color:#fff; padding:8px 24px; border-radius:40px; font-size:24px; font-weight:600; margin-top:20px; }
.dots { display:flex; gap:12px; margin-top:30px; }
.dot { width:20px; height:20px; border-radius:50%; }
</style></head><body>
<div class="img-side"><img src="${imgPath}"></div>
<div class="text-side">
  <h1>${headline}</h1>
  <p>${subtext}</p>
  ${opts.badge ? `<div class="badge">${opts.badge}</div>` : ''}
  ${opts.dots ? `<div class="dots">${opts.dots.map(c => `<div class="dot" style="background:${c}"></div>`).join('')}</div>` : ''}
</div>
</body></html>`;
}

function gridHTML(screenshots, headline, subtext) {
  const imgs = screenshots.map(s => `file:///${path.join(SCREENSHOT_DIR, s).replace(/\\/g, '/')}`);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${IMG_W}px; height:${IMG_H}px; background:#f8f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; flex-direction:column; padding:60px 80px; overflow:hidden; }
h1 { font-size:64px; font-weight:800; color:#1a1b2e; text-align:center; margin-bottom:8px; }
h1 span { color:#3d59ab; }
p { font-size:28px; color:#666; text-align:center; margin-bottom:40px; }
.grid { display:grid; grid-template-columns:repeat(${Math.min(imgs.length, 3)},1fr); gap:30px; flex:1; }
.grid img { width:100%; height:100%; object-fit:cover; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.1); }
</style></head><body>
<h1>${headline}</h1>
<p>${subtext}</p>
<div class="grid">${imgs.map(i => `<img src="${i}">`).join('')}</div>
</body></html>`;
}

function filesIncludedHTML() {
  const files = [
    { name: 'LifeBalance-Planner.html', desc: 'Full planner app', icon: '{}' },
    { name: 'Start-Here-Guide.pdf', desc: 'Setup instructions', icon: 'i' },
    { name: 'GoodNotes Companion.pdf', desc: '26-page planner', icon: 'G' },
    { name: 'AI Prompt Pack.pdf', desc: '33 AI prompts', icon: 'AI' },
    { name: 'Starter Templates.zip', desc: '5 life templates', icon: 'T' },
  ];
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${IMG_W}px; height:${IMG_H}px; background:#f8f7f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px; overflow:hidden; }
h1 { font-size:72px; font-weight:800; color:#1a1b2e; margin-bottom:16px; }
h1 span { color:#3d59ab; }
p { font-size:28px; color:#666; margin-bottom:60px; }
.files { display:flex; gap:40px; }
.file { width:460px; background:#fff; border-radius:20px; padding:40px 30px; text-align:center; box-shadow:0 8px 30px rgba(0,0,0,0.08); }
.file-icon { width:80px; height:80px; border-radius:50%; background:#3d59ab; color:#fff; font-size:28px; font-weight:700; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; }
.file h3 { font-size:24px; color:#1a1b2e; margin-bottom:8px; }
.file p { font-size:20px; color:#888; margin-bottom:0; }
</style></head><body>
<h1><span>5 Files</span> Included</h1>
<p>Everything you need to plan your life</p>
<div class="files">
${files.map(f => `<div class="file"><div class="file-icon">${f.icon}</div><h3>${f.name}</h3><p>${f.desc}</p></div>`).join('')}
</div>
</body></html>`;
}

function compatHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { width:${IMG_W}px; height:${IMG_H}px; background:#1a1b2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px; color:#e8eaf0; overflow:hidden; }
h1 { font-size:72px; font-weight:800; margin-bottom:16px; }
h1 span { color:#7b8fd4; }
p.sub { font-size:28px; color:#8b8fa0; margin-bottom:60px; }
.row { display:flex; gap:60px; margin-bottom:40px; }
.item { text-align:center; width:360px; }
.item .label { font-size:32px; font-weight:700; margin-bottom:8px; }
.item .detail { font-size:22px; color:#8b8fa0; }
.divider { width:600px; height:2px; background:#333; margin:30px 0; }
.note { font-size:24px; color:#8b8fa0; margin-top:20px; }
</style></head><body>
<h1>Works on <span>Your Device</span></h1>
<p class="sub">No app to install. No account to create. No subscription.</p>
<div class="row">
  <div class="item"><div class="label">Windows</div><div class="detail">Chrome or Edge browser</div></div>
  <div class="item"><div class="label">Mac</div><div class="detail">Chrome, Safari, or Firefox</div></div>
  <div class="item"><div class="label">iPad / iPhone</div><div class="detail">GoodNotes companion PDF</div></div>
</div>
<div class="divider"></div>
<div class="row">
  <div class="item"><div class="label">100% Offline</div><div class="detail">No internet needed after download</div></div>
  <div class="item"><div class="label">Your Data, Your Device</div><div class="detail">Nothing is sent anywhere</div></div>
  <div class="item"><div class="label">Works Any Year</div><div class="detail">Completely undated</div></div>
</div>
</body></html>`;
}

async function main() {
  console.log('Generating Etsy listing images (3000x2250)...');

  if (!fs.existsSync(path.join(SCREENSHOT_DIR, '01-dashboard.png'))) {
    console.log('Screenshots not found. Run capture-screenshots.js first.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: IMG_W, height: IMG_H }, deviceScaleFactor: 1 });

  async function renderHTML(html, name) {
    const pg = await context.newPage();
    await pg.setContent(html, { waitUntil: 'load' });
    await pg.waitForTimeout(300);
    const outPath = path.join(OUT_DIR, `${name}.png`);
    await pg.screenshot({ path: outPath, type: 'png' });
    await pg.close();
    console.log(`  ${name}.png`);
    return outPath;
  }

  // 1. Dashboard with Balance Score
  await renderHTML(overlayHTML(
    path.join(SCREENSHOT_DIR, '01-dashboard.png'),
    'Is Your <span>Life Plan</span> Realistic?',
    'Track your 24 hours across 7 life categories. See your Balance Score. Know if your plan actually works.',
    { badge: 'Balance Score: See It Instantly' }
  ), '01-dashboard-hero');

  // 2. 24-Hour Budget
  await renderHTML(overlayHTML(
    path.join(SCREENSHOT_DIR, '05-goals.png'),
    'Your Day Has <span>24 Hours</span>',
    'Set goals for each life area. See exactly where your time goes. No more guessing.',
    { imgRight: true, dots: ['#8b5cf6','#6366f1','#06b6d4','#f59e0b','#10b981','#ef4444','#64748b'] }
  ), '02-budget-goals');

  // 3. Habits
  await renderHTML(overlayHTML(
    path.join(SCREENSHOT_DIR, '04-habits.png'),
    'Build <span>Habits</span> That Stick',
    'Track streaks. Skip days without guilt. See weekly progress at a glance.',
    { badge: 'Streak-Safe Skipping' }
  ), '03-habits');

  // 4. ADHD Tools grid
  await renderHTML(gridHTML(
    ['06-braindump.png', '07-focus-timer.png', '01-dashboard.png'],
    'ADHD-Friendly <span>Focus Tools</span>',
    'Brain Dump + Pomodoro Timer + One Thing Now mode'
  ), '04-adhd-tools');

  // 5. Budget + Meals
  await renderHTML(gridHTML(
    ['08-budget.png', '09-mealplan.png'],
    'Budget + <span>Meal Planning</span>',
    'Simple monthly budget tracker + weekly meal planner with auto grocery list'
  ), '05-budget-meals');

  // 6. Themes grid (show light + dark dashboards side by side)
  await renderHTML(gridHTML(
    ['01-dashboard.png', '14-dashboard-dark.png', '11-settings.png'],
    '5 Color Themes + <span>Dark Mode</span>',
    'Default, Sage, Blush Pink, Ocean, Minimal Black'
  ), '06-themes');

  // 7. What's included
  await renderHTML(filesIncludedHTML(), '07-whats-included');

  // 8. Copy for AI
  await renderHTML(overlayHTML(
    path.join(SCREENSHOT_DIR, '12-ai-panel.png'),
    '<span>AI-Ready</span> Prompts',
    'Copy your schedule data as a prompt for ChatGPT or Claude. Get personalized advice without sharing your data with us.',
    { badge: 'Your Data Stays on Your Device', imgRight: true }
  ), '08-copy-for-ai');

  // 9. Compatibility
  await renderHTML(compatHTML(), '09-compatibility');

  // 10. Journal + Review
  await renderHTML(overlayHTML(
    path.join(SCREENSHOT_DIR, '10-journal.png'),
    'Reflect & <span>Review</span>',
    'Daily gratitude journal. Weekly review with your Balance Score. Know what\'s working.',
    { dark: false }
  ), '10-journal-review');

  await browser.close();
  console.log(`\nAll listing images saved to ${OUT_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
