#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '..', 'dist', 'etsy', 'LifeBalance-Planner.html');
const OUT_DIR = path.resolve(__dirname, '..', 'marketing', 'etsy-images');
const { seedData } = require('./capture-screenshots.js');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  console.log('Recording demo video...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 900 } }
  });
  const page = await context.newPage();
  await page.goto(`file:///${HTML_PATH.replace(/\\/g, '/')}`);
  await page.waitForTimeout(500);

  const welcomeBtn = await page.$('.welcome-start-btn');
  if (welcomeBtn) await welcomeBtn.click();
  await page.waitForTimeout(300);

  await seedData(page);

  // Dashboard
  await page.click('[data-page="dashboard"]');
  await page.waitForTimeout(1200);

  // Calendar
  await page.click('[data-page="calendar"]');
  await page.waitForTimeout(1200);

  // Habits
  await page.click('[data-page="habits"]');
  await page.waitForTimeout(1000);

  // Goals
  await page.click('[data-page="goals"]');
  await page.waitForTimeout(1000);

  // Brain Dump
  await page.click('[data-page="braindump"]');
  await page.waitForTimeout(800);

  // Focus Timer
  await page.click('[data-page="focus"]');
  await page.waitForTimeout(800);

  // Budget
  await page.click('[data-page="budget"]');
  await page.waitForTimeout(800);

  // Meal Plan
  await page.click('[data-page="mealplan"]');
  await page.waitForTimeout(800);

  // AI Panel
  await page.click('#nav-ai');
  await page.waitForTimeout(1000);
  await page.click('#ai-panel-close');
  await page.waitForTimeout(300);

  // Dark mode
  await page.click('[data-page="settings"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('dark-mode-toggle').click(); });
  await page.waitForTimeout(300);
  await page.click('[data-page="dashboard"]');
  await page.waitForTimeout(1200);

  // Back to light
  await page.click('[data-page="settings"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('dark-mode-toggle').click(); });
  await page.waitForTimeout(300);

  // End on dashboard
  await page.click('[data-page="dashboard"]');
  await page.waitForTimeout(800);

  await page.close();
  await context.close();
  await browser.close();

  // Rename the video file
  const videos = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  if (videos.length > 0) {
    const src = path.join(OUT_DIR, videos[videos.length - 1]);
    const dest = path.join(OUT_DIR, 'demo-video.webm');
    fs.renameSync(src, dest);
    const size = fs.statSync(dest).size;
    console.log(`Demo video: ${dest} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('Note: Convert to MP4 with: ffmpeg -i demo-video.webm demo-video.mp4');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
