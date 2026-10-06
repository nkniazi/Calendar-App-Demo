#!/usr/bin/env node
const { PDFDocument, StandardFonts, rgb, PageSizes } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist', 'etsy');
fs.mkdirSync(DIST, { recursive: true });

const BLUE = rgb(0.24, 0.35, 0.67);
const DARK = rgb(0.15, 0.15, 0.15);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const WHITE = rgb(1, 1, 1);

function drawLine(page, x1, y1, x2, y2, color = LIGHT_GRAY) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color });
}

// ─── Start Here Guide ───
async function buildGuide() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = PageSizes.Letter;
  const SCREENSHOTS = path.resolve(__dirname, '..', 'dist', 'etsy', 'screenshots');
  const hasScreenshots = fs.existsSync(path.join(SCREENSHOTS, '01-dashboard.png'));

  async function embedImg(name) {
    const p = path.join(SCREENSHOTS, name);
    if (!fs.existsSync(p)) return null;
    return await doc.embedPng(fs.readFileSync(p));
  }

  function addPage(title) {
    const page = doc.addPage(PageSizes.Letter);
    page.drawText('LifeBalance Planner  - Start Here Guide', { x: 50, y: H - 40, size: 10, font, color: GRAY });
    if (title) page.drawText(title, { x: 50, y: H - 70, size: 20, font: fontBold, color: BLUE });
    return page;
  }

  function writeLines(page, lines, startY, size = 11, lineHeight = 16) {
    let y = startY;
    for (const line of lines) {
      if (y < 60) { page = addPage(null); y = H - 80; }
      page.drawText(line, { x: 50, y, size, font, color: DARK, maxWidth: W - 100 });
      y -= lineHeight;
    }
    return y;
  }

  function drawImg(page, img, y, maxW, maxH) {
    if (!img) return y;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * scale, h = img.height * scale;
    page.drawImage(img, { x: 50, y: y - h, width: w, height: h });
    return y - h - 10;
  }

  // Cover
  let p = addPage(null);
  p.drawText('LifeBalance Planner', { x: 50, y: H - 200, size: 36, font: fontBold, color: BLUE });
  p.drawText('Start Here Guide', { x: 50, y: H - 240, size: 24, font, color: DARK });
  p.drawText('The planner that tells you if your life plan is realistic.', { x: 50, y: H - 280, size: 13, font, color: GRAY });
  if (hasScreenshots) {
    const dashImg = await embedImg('01-dashboard.png');
    drawImg(p, dashImg, H - 320, W - 100, 340);
  }

  // Getting Started
  p = addPage('Getting Started');
  let y = writeLines(p, [
    '1. Open the file LifeBalance-Planner.html in your browser.',
    '   (Right-click > Open with > Chrome, Edge, or Firefox)',
    '',
    '2. Bookmark the page so you can find it again easily.',
    '   (Ctrl+D on Windows, Cmd+D on Mac)',
    '',
    '3. Start adding your events, tasks, habits, and goals.',
    '',
    '4. Your data is saved automatically in your browser.',
    '   It stays on your device  - nothing is sent anywhere.',
    '',
    'IMPORTANT: Export a backup regularly from Settings!',
  ], H - 100);
  if (hasScreenshots) {
    const calImg = await embedImg('02-calendar-week.png');
    drawImg(p, calImg, y - 10, W - 100, 280);
  }

  // First Setup
  p = addPage('Your First Setup');
  y = writeLines(p, [
    '1. The planner opens to the Dashboard with your daily overview.',
    '',
    '2. Click "+ Event" to add your first commitment.',
    '   Choose a category (Faith, Sleep, Work, Food, Family, etc.)',
    '',
    '3. Set your weekly goals under the Goals page.',
    '   This powers the Balance Score that tracks your progress.',
    '',
    '4. Add habits you want to build in the Habits page.',
    '   Track streaks and see weekly completion rates.',
  ], H - 100);
  if (hasScreenshots) {
    const goalsImg = await embedImg('05-goals.png');
    drawImg(p, goalsImg, y - 10, W - 100, 280);
  }

  // Browsers
  p = addPage('Browser Support');
  writeLines(p, [
    'Tested and recommended:',
    '  Google Chrome (Windows, Mac)',
    '  Microsoft Edge (Windows)',
    '',
    'Also works:',
    '  Mozilla Firefox (Windows, Mac)',
    '  Safari (Mac)',
    '',
    'For iPad / iPhone:',
    '  Use the GoodNotes Companion PDF included in your download.',
    '  The PDF planner is designed for handwriting and annotation.',
    '',
    'Not recommended:',
    '  Internet Explorer (not supported)',
    '  Very old browser versions',
  ], H - 100);

  // Backup & Restore
  p = addPage('Backup & Restore');
  y = writeLines(p, [
    'Your data lives in your browser\'s local storage.',
    'It does NOT travel with the HTML file.',
    '',
    'To backup:',
    '  Settings > Export Backup > Save the .json file',
    '',
    'To restore:',
    '  Settings > Import Backup > Select your .json file',
    '',
    'When to backup:',
    '  - At least once a week',
    '  - Before clearing browser data',
    '  - Before moving to a new computer',
    '',
    'Moving to a new computer:',
    '  1. Export backup on old computer',
    '  2. Copy the HTML file + backup to new computer',
    '  3. Open the HTML file in browser',
    '  4. Import your backup',
  ], H - 100);
  if (hasScreenshots) {
    const settingsImg = await embedImg('15-settings-backup.png');
    drawImg(p, settingsImg, y - 5, W - 100, 200);
  }

  // Using Copy for AI
  p = addPage('Using Copy for AI');
  y = writeLines(p, [
    'LifeBalance Planner is AI-Ready  - not AI-powered.',
    'Your data never leaves your device.',
    '',
    'How it works:',
    '  1. Click the AI button in the sidebar.',
    '  2. Choose a prompt type (Plan My Week, Fix Habits, etc.)',
    '  3. Click "Copy for AI"  - your schedule data is copied.',
    '  4. Paste into ChatGPT, Claude, or any AI assistant.',
    '  5. Get personalized advice based on YOUR real schedule.',
    '',
    'Bonus: See the AI Prompt Pack PDF for 33 ready-to-use prompts.',
  ], H - 100);
  if (hasScreenshots) {
    const aiImg = await embedImg('12-ai-panel.png');
    drawImg(p, aiImg, y - 10, W - 100, 300);
  }

  // Troubleshooting
  p = addPage('Troubleshooting');
  writeLines(p, [
    'Q: My planner is empty!',
    'A: You may have moved the file, changed browsers, or cleared',
    '   browser data. Import your last backup from Settings.',
    '',
    'Q: Can I use this on my phone?',
    'A: The HTML planner works best on a computer browser.',
    '   For iPad, use the GoodNotes Companion PDF.',
    '',
    'Q: Can I sync between devices?',
    'A: Not automatically. Export a backup on one device and',
    '   import it on the other.',
    '',
    'Q: How do I print my planner?',
    'A: Use your browser\'s Print function (Ctrl+P / Cmd+P).',
    '   The planner has print-friendly styles built in.',
    '',
    'Q: Is my data private?',
    'A: Yes. Everything stays in your browser. No accounts,',
    '   no servers, no tracking.',
    '',
    'Need more help? Contact us via Etsy messages.',
  ], H - 100);

  // Features
  p = addPage('Features Overview');
  y = writeLines(p, [
    'Calendar: Day, 3-day, week, month, agenda, and year views.',
    'Tasks: Create tasks with priorities, subtasks, and due dates.',
    'Habits: Track daily habits with streaks.',
    'Goals: Weekly hour goals + yearly/quarterly/monthly goals.',
    'Brain Dump: Quick capture for scattered thoughts.',
    'Focus Timer: Pomodoro timer for deep work.',
    'Budget: Simple monthly income/expense tracking.',
    'Meal Plan: Weekly meal planner with grocery lists.',
    'Journal: Daily gratitude + weekly review.',
    'Balance Score: See if your schedule matches your goals.',
    'AI-Ready: Copy prompts for ChatGPT or Claude.',
    'Themes: 5 color themes + dark mode.',
    'Templates: 5 pre-built schedule templates.',
    'Export: .ics for Google/Apple/Outlook Calendar.',
    '',
    'Works any year  - undated and flexible.',
    'No internet required  - everything runs offline.',
  ], H - 100);
  if (hasScreenshots) {
    const darkImg = await embedImg('14-dashboard-dark.png');
    drawImg(p, darkImg, y - 10, W - 100, 200);
  }

  const bytes = await doc.save();
  const outPath = path.join(DIST, 'Start-Here-Guide.pdf');
  fs.writeFileSync(outPath, bytes);
  const sizeMB = (bytes.length / 1024 / 1024).toFixed(2);
  console.log(`Guide: ${outPath} (${sizeMB} MB, ${doc.getPageCount()} pages)`);
}

// ─── GoodNotes Companion Planner (Landscape 1366x1024) ───
async function buildGoodNotes() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);
  const W = 1366, H = 1024;
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const CATS = ['Faith','Sleep','Work / Money','Food / Meals','Family','Entertainment','Personal'];
  const CAT_COLORS = [rgb(0.55,0.36,0.96), rgb(0.38,0.45,0.96), rgb(0.04,0.52,0.55), rgb(0.96,0.62,0.04), rgb(0.07,0.72,0.51), rgb(0.95,0.26,0.21), rgb(0.39,0.47,0.61)];
  const ACCENT = rgb(0.24, 0.35, 0.67);
  const ACCENT_LIGHT = rgb(0.91, 0.93, 0.97);
  const ACCENT_DARK = rgb(0.12, 0.14, 0.22);
  const BG_WARM = rgb(0.98, 0.97, 0.95);
  const BG_DARK = rgb(0.11, 0.12, 0.14);

  const TAB_W = 80, TAB_H = 52;
  const CONTENT_X = TAB_W + 20;
  const CONTENT_W = W - CONTENT_X - 40;

  const tabs = [
    { short: 'Index', key: 'index' },
    { short: 'Year', key: 'year' },
    { short: 'Jan', key: 'month-0' }, { short: 'Feb', key: 'month-1' }, { short: 'Mar', key: 'month-2' },
    { short: 'Apr', key: 'month-3' }, { short: 'May', key: 'month-4' }, { short: 'Jun', key: 'month-5' },
    { short: 'Jul', key: 'month-6' }, { short: 'Aug', key: 'month-7' }, { short: 'Sep', key: 'month-8' },
    { short: 'Oct', key: 'month-9' }, { short: 'Nov', key: 'month-10' }, { short: 'Dec', key: 'month-11' },
    { short: 'Weekly', key: 'weekly' },
    { short: 'Daily', key: 'daily' },
    { short: 'Budget', key: 'budget' },
    { short: 'Habits', key: 'habits' },
    { short: 'Wheel', key: 'wheel' },
    { short: 'Review', key: 'review' },
    { short: 'Dump', key: 'dump' },
    { short: '$$$', key: 'money' },
    { short: 'Meals', key: 'meals' },
    { short: 'Notes', key: 'notes' },
  ];

  const pageIndex = {};
  const allPages = [];

  function addLinkAnnotation(fromPage, rect, toPageIdx) {
    const context = fromPage.node.context;
    const destPage = doc.getPage(toPageIdx);
    const annot = context.obj({
      Type: 'Annot', Subtype: 'Link',
      Rect: [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h],
      Border: [0, 0, 0],
      Dest: [destPage.ref, 'Fit'],
    });
    const existing = fromPage.node.lookup(fromPage.node.context.obj('Annots'));
    if (existing) {
      existing.push(annot);
    } else {
      const arr = context.obj([annot]);
      fromPage.node.set(context.obj('Annots'), arr);
    }
  }

  function makePage(key, isDark = false) {
    const page = doc.addPage([W, H]);
    const idx = doc.getPageCount() - 1;
    if (!pageIndex[key]) pageIndex[key] = idx;
    allPages.push({ page, key, idx, isDark });
    return page;
  }

  function drawSideTabs(page, activeKey, isDark) {
    const bg = isDark ? BG_DARK : BG_WARM;
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    const sidebarBg = isDark ? rgb(0.15, 0.16, 0.2) : rgb(0.94, 0.95, 0.97);
    page.drawRectangle({ x: 0, y: 0, width: TAB_W, height: H, color: sidebarBg });
    const totalTabs = tabs.length;
    const gap = 2;
    const availH = H - 20;
    const tabH = Math.min(TAB_H, Math.floor((availH - (totalTabs - 1) * gap) / totalTabs));
    const startY = H - 10;
    tabs.forEach((t, i) => {
      const y = startY - (i + 1) * (tabH + gap);
      const isActive = t.key === activeKey;
      const tabColor = isActive ? ACCENT : (isDark ? rgb(0.2, 0.22, 0.28) : rgb(0.88, 0.89, 0.92));
      const textColor = isActive ? WHITE : (isDark ? rgb(0.7, 0.72, 0.76) : GRAY);
      page.drawRectangle({ x: 2, y, width: TAB_W - 4, height: tabH, color: tabColor, borderColor: isDark ? rgb(0.25, 0.27, 0.32) : rgb(0.82, 0.83, 0.86), borderWidth: 0.5 });
      const tw = font.widthOfTextAtSize(t.short, 8);
      page.drawText(t.short, { x: 2 + (TAB_W - 4 - tw) / 2, y: y + (tabH - 8) / 2, size: 8, font: isActive ? fontBold : font, color: textColor });
    });
  }

  function drawPageTitle(page, title, isDark) {
    const color = isDark ? rgb(0.9, 0.92, 0.96) : ACCENT;
    page.drawText(title, { x: CONTENT_X, y: H - 50, size: 22, font: fontBold, color });
    page.drawLine({ start: { x: CONTENT_X, y: H - 58 }, end: { x: CONTENT_X + CONTENT_W, y: H - 58 }, thickness: 1.5, color: isDark ? rgb(0.3, 0.35, 0.5) : ACCENT });
  }

  // ── Light Cover ──
  let p = makePage('cover-light');
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG_WARM });
  p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: ACCENT });
  p.drawText('LifeBalance', { x: W / 2 - 200, y: H / 2 + 80, size: 52, font: fontBold, color: ACCENT });
  p.drawText('Planner', { x: W / 2 - 200, y: H / 2 + 30, size: 40, font, color: DARK });
  p.drawLine({ start: { x: W / 2 - 200, y: H / 2 + 20 }, end: { x: W / 2 + 200, y: H / 2 + 20 }, thickness: 2, color: ACCENT });
  p.drawText('Undated Digital Planner for GoodNotes & PDF Readers', { x: W / 2 - 200, y: H / 2 - 10, size: 14, font: fontOblique, color: GRAY });
  p.drawText('1366 x 1024 pt  |  Landscape  |  Hyperlinked  |  Works Any Year', { x: W / 2 - 200, y: H / 2 - 35, size: 11, font, color: GRAY });
  CATS.forEach((c, i) => {
    const x = W / 2 - 200 + i * 58;
    p.drawCircle({ x: x + 10, y: H / 2 - 80, size: 8, color: CAT_COLORS[i] });
    p.drawText(c.split(' ')[0], { x: x - 5, y: H / 2 - 100, size: 7, font, color: GRAY });
  });

  // ── Dark Cover ──
  p = makePage('cover-dark');
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BG_DARK });
  p.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: rgb(0.45, 0.55, 0.95) });
  p.drawText('LifeBalance', { x: W / 2 - 200, y: H / 2 + 80, size: 52, font: fontBold, color: rgb(0.7, 0.78, 0.95) });
  p.drawText('Planner', { x: W / 2 - 200, y: H / 2 + 30, size: 40, font, color: rgb(0.85, 0.87, 0.92) });
  p.drawLine({ start: { x: W / 2 - 200, y: H / 2 + 20 }, end: { x: W / 2 + 200, y: H / 2 + 20 }, thickness: 2, color: rgb(0.45, 0.55, 0.95) });
  p.drawText('Undated Digital Planner for GoodNotes & PDF Readers', { x: W / 2 - 200, y: H / 2 - 10, size: 14, font: fontOblique, color: rgb(0.55, 0.58, 0.65) });
  p.drawText('1366 x 1024 pt  |  Landscape  |  Hyperlinked  |  Works Any Year', { x: W / 2 - 200, y: H / 2 - 35, size: 11, font, color: rgb(0.55, 0.58, 0.65) });
  CATS.forEach((c, i) => {
    const x = W / 2 - 200 + i * 58;
    p.drawCircle({ x: x + 10, y: H / 2 - 80, size: 8, color: CAT_COLORS[i] });
    p.drawText(c.split(' ')[0], { x: x - 5, y: H / 2 - 100, size: 7, font, color: rgb(0.55, 0.58, 0.65) });
  });

  // ── Index ──
  p = makePage('index');
  drawSideTabs(p, 'index', false);
  drawPageTitle(p, 'LifeBalance Planner', false);
  const indexSections = [
    { label: 'Year at a Glance', key: 'year' },
    ...MONTHS.map((m, i) => ({ label: m, key: `month-${i}` })),
    { label: 'Weekly Time-Blocking', key: 'weekly' },
    { label: 'Daily Planner', key: 'daily' },
    { label: '24-Hour Life Budget', key: 'budget' },
    { label: 'Habit Tracker', key: 'habits' },
    { label: 'Life Balance Wheel', key: 'wheel' },
    { label: 'Weekly Review', key: 'review' },
    { label: 'Brain Dump', key: 'dump' },
    { label: 'Budget Tracker', key: 'money' },
    { label: 'Meal Planner', key: 'meals' },
    { label: 'Notes', key: 'notes' },
  ];
  const col1 = indexSections.slice(0, 13);
  const col2 = indexSections.slice(13);
  col1.forEach((s, i) => {
    const y = H - 90 - i * 56;
    p.drawRectangle({ x: CONTENT_X, y, width: 520, height: 48, color: i % 2 === 0 ? ACCENT_LIGHT : WHITE, borderColor: LIGHT_GRAY, borderWidth: 0.5 });
    p.drawText(s.label, { x: CONTENT_X + 16, y: y + 17, size: 14, font: fontBold, color: ACCENT });
  });
  col2.forEach((s, i) => {
    const y = H - 90 - i * 56;
    p.drawRectangle({ x: CONTENT_X + 540, y, width: 520, height: 48, color: i % 2 === 0 ? ACCENT_LIGHT : WHITE, borderColor: LIGHT_GRAY, borderWidth: 0.5 });
    p.drawText(s.label, { x: CONTENT_X + 556, y: y + 17, size: 14, font: fontBold, color: ACCENT });
  });

  // ── Year at a Glance ──
  p = makePage('year');
  drawSideTabs(p, 'year', false);
  drawPageTitle(p, 'Year at a Glance', false);
  const miniMonthW = 280, miniMonthH = 210;
  MONTHS.forEach((m, mi) => {
    const col = mi % 4;
    const row = Math.floor(mi / 4);
    const x = CONTENT_X + col * (miniMonthW + 15);
    const y = H - 80 - (row + 1) * (miniMonthH + 10);
    p.drawRectangle({ x, y, width: miniMonthW, height: miniMonthH, color: WHITE, borderColor: LIGHT_GRAY, borderWidth: 0.5 });
    const tw = fontBold.widthOfTextAtSize(m, 12);
    p.drawText(m, { x: x + (miniMonthW - tw) / 2, y: y + miniMonthH - 20, size: 12, font: fontBold, color: ACCENT });
    DAYS.forEach((d, di) => {
      p.drawText(d[0], { x: x + 10 + di * 38, y: y + miniMonthH - 38, size: 8, font, color: GRAY });
    });
    for (let wk = 0; wk < 6; wk++) {
      for (let d = 0; d < 7; d++) {
        p.drawRectangle({ x: x + 6 + d * 38, y: y + miniMonthH - 55 - wk * 25, width: 36, height: 23, borderColor: rgb(0.92, 0.93, 0.94), borderWidth: 0.3 });
      }
    }
  });

  // ── 12 Monthly Pages ──
  MONTHS.forEach((month, mi) => {
    p = makePage(`month-${mi}`);
    drawSideTabs(p, `month-${mi}`, false);
    drawPageTitle(p, month, false);
    p.drawText('Tap Weekly or Daily tab for templates', { x: CONTENT_X + CONTENT_W - 260, y: H - 50, size: 10, font: fontOblique, color: GRAY });
    const gridX = CONTENT_X, gridY = H - 80;
    const cellW = Math.floor(CONTENT_W / 7);
    const cellH = 120;
    DAYS.forEach((d, di) => {
      const cx = gridX + di * cellW + cellW / 2;
      p.drawText(d, { x: cx - fontBold.widthOfTextAtSize(d, 11) / 2, y: gridY - 5, size: 11, font: fontBold, color: ACCENT });
    });
    for (let wk = 0; wk < 6; wk++) {
      for (let d = 0; d < 7; d++) {
        const x = gridX + d * cellW;
        const y = gridY - 22 - (wk + 1) * cellH;
        p.drawRectangle({ x, y, width: cellW, height: cellH, borderColor: LIGHT_GRAY, borderWidth: 0.5, color: wk % 2 === 0 ? WHITE : rgb(0.98, 0.98, 0.99) });
      }
    }
    p.drawText('Goals this month:', { x: CONTENT_X, y: gridY - 22 - 6 * cellH - 20, size: 11, font: fontBold, color: DARK });
    for (let i = 0; i < 3; i++) {
      drawLine(p, CONTENT_X + 130, gridY - 22 - 6 * cellH - 20 - i * 18, CONTENT_X + 500, gridY - 22 - 6 * cellH - 20 - i * 18);
    }
  });

  // ── Weekly Time-Blocking ──
  p = makePage('weekly');
  drawSideTabs(p, 'weekly', false);
  drawPageTitle(p, 'Weekly Time-Blocking', false);
  p.drawText('Week of: _______________', { x: CONTENT_X + CONTENT_W - 220, y: H - 50, size: 11, font, color: DARK });
  const weekColW = Math.floor(CONTENT_W / 7);
  DAYS.forEach((d, i) => {
    const cx = CONTENT_X + i * weekColW + weekColW / 2;
    p.drawText(d, { x: cx - fontBold.widthOfTextAtSize(d, 10) / 2, y: H - 78, size: 10, font: fontBold, color: ACCENT });
  });
  for (let hr = 6; hr <= 22; hr++) {
    const y = H - 95 - (hr - 6) * 52;
    p.drawText(`${hr}:00`, { x: CONTENT_X - 6, y: y + 16, size: 8, font, color: GRAY });
    for (let d = 0; d < 7; d++) {
      p.drawRectangle({ x: CONTENT_X + d * weekColW, y, width: weekColW, height: 50, borderColor: LIGHT_GRAY, borderWidth: 0.3, color: hr % 2 === 0 ? WHITE : rgb(0.98, 0.98, 0.99) });
    }
  }

  // ── Daily Planner ──
  p = makePage('daily');
  drawSideTabs(p, 'daily', false);
  drawPageTitle(p, 'Daily Planner', false);
  p.drawText('Date: _______________', { x: CONTENT_X + CONTENT_W - 200, y: H - 50, size: 11, font, color: DARK });
  // Left column: schedule
  const schedX = CONTENT_X, schedW = Math.floor(CONTENT_W * 0.55);
  p.drawText('Schedule', { x: schedX, y: H - 80, size: 13, font: fontBold, color: ACCENT });
  for (let hr = 6; hr <= 22; hr++) {
    const y = H - 100 - (hr - 6) * 50;
    p.drawText(`${hr}:00`, { x: schedX, y: y + 16, size: 9, font, color: GRAY });
    p.drawRectangle({ x: schedX + 45, y, width: schedW - 50, height: 48, borderColor: LIGHT_GRAY, borderWidth: 0.3, color: hr % 2 === 0 ? WHITE : rgb(0.98, 0.98, 0.99) });
  }
  // Right column: priorities + notes
  const rightX = schedX + schedW + 20;
  p.drawText('Top 3 Priorities', { x: rightX, y: H - 80, size: 13, font: fontBold, color: ACCENT });
  for (let i = 0; i < 3; i++) {
    const y = H - 108 - i * 40;
    p.drawRectangle({ x: rightX, y, width: CONTENT_W - schedW - 20, height: 36, borderColor: LIGHT_GRAY, borderWidth: 0.5, color: WHITE });
    p.drawText(`${i + 1}.`, { x: rightX + 8, y: y + 12, size: 11, font: fontBold, color: GRAY });
  }
  p.drawText('Gratitude', { x: rightX, y: H - 250, size: 13, font: fontBold, color: ACCENT });
  for (let i = 0; i < 3; i++) drawLine(p, rightX, H - 270 - i * 24, rightX + CONTENT_W - schedW - 20, H - 270 - i * 24);
  p.drawText('Notes', { x: rightX, y: H - 360, size: 13, font: fontBold, color: ACCENT });
  for (let i = 0; i < 12; i++) drawLine(p, rightX, H - 380 - i * 24, rightX + CONTENT_W - schedW - 20, H - 380 - i * 24);
  p.drawText('Energy / Mood', { x: rightX, y: H - 690, size: 11, font: fontBold, color: ACCENT });
  p.drawText('Energy:  1  2  3  4  5', { x: rightX, y: H - 710, size: 10, font, color: DARK });
  p.drawText('Mood:    1  2  3  4  5', { x: rightX, y: H - 728, size: 10, font, color: DARK });

  // ── 24-Hour Life Budget ──
  p = makePage('budget');
  drawSideTabs(p, 'budget', false);
  drawPageTitle(p, '24-Hour Life Budget', false);
  p.drawText('Your 24 hours must add up. How will you spend them?', { x: CONTENT_X, y: H - 80, size: 12, font: fontOblique, color: GRAY });
  const budgetColW = Math.floor(CONTENT_W / 4);
  ['Category', 'Goal (hrs)', 'Actual (hrs)', 'Difference'].forEach((h, i) => {
    p.drawText(h, { x: CONTENT_X + i * budgetColW, y: H - 110, size: 11, font: fontBold, color: ACCENT });
  });
  CATS.forEach((c, i) => {
    const y = H - 140 - i * 55;
    p.drawRectangle({ x: CONTENT_X, y, width: CONTENT_W, height: 48, color: i % 2 === 0 ? WHITE : ACCENT_LIGHT, borderColor: LIGHT_GRAY, borderWidth: 0.3 });
    p.drawCircle({ x: CONTENT_X + 15, y: y + 24, size: 7, color: CAT_COLORS[i] });
    p.drawText(c, { x: CONTENT_X + 30, y: y + 17, size: 12, font: fontBold, color: DARK });
    drawLine(p, CONTENT_X + budgetColW + 10, y + 10, CONTENT_X + budgetColW + 100, y + 10);
    drawLine(p, CONTENT_X + budgetColW * 2 + 10, y + 10, CONTENT_X + budgetColW * 2 + 100, y + 10);
    drawLine(p, CONTENT_X + budgetColW * 3 + 10, y + 10, CONTENT_X + budgetColW * 3 + 100, y + 10);
  });
  const totalY = H - 140 - CATS.length * 55 - 10;
  p.drawText('Total: 24 hours', { x: CONTENT_X, y: totalY, size: 13, font: fontBold, color: ACCENT });
  p.drawText('Balance Score: _____ / 100', { x: CONTENT_X + budgetColW * 2, y: totalY, size: 13, font: fontBold, color: ACCENT });

  // ── Habit Tracker ──
  p = makePage('habits');
  drawSideTabs(p, 'habits', false);
  drawPageTitle(p, 'Habit Tracker', false);
  p.drawText('Month: _______________', { x: CONTENT_X + CONTENT_W - 200, y: H - 50, size: 11, font, color: DARK });
  p.drawText('Habit', { x: CONTENT_X, y: H - 85, size: 10, font: fontBold, color: ACCENT });
  p.drawText('Cat', { x: CONTENT_X + 200, y: H - 85, size: 10, font: fontBold, color: ACCENT });
  for (let d = 1; d <= 31; d++) {
    p.drawText(String(d), { x: CONTENT_X + 240 + (d - 1) * 30, y: H - 85, size: 8, font: fontBold, color: GRAY });
  }
  for (let row = 0; row < 12; row++) {
    const y = H - 105 - row * 60;
    p.drawRectangle({ x: CONTENT_X, y, width: CONTENT_W, height: 55, color: row % 2 === 0 ? WHITE : ACCENT_LIGHT, borderColor: LIGHT_GRAY, borderWidth: 0.3 });
    drawLine(p, CONTENT_X, y + 20, CONTENT_X + 195, y + 20);
    for (let d = 0; d < 31; d++) {
      p.drawRectangle({ x: CONTENT_X + 235 + d * 30, y: y + 15, width: 25, height: 25, borderColor: LIGHT_GRAY, borderWidth: 0.3 });
    }
  }

  // ── Balance Wheel ──
  p = makePage('wheel');
  drawSideTabs(p, 'wheel', false);
  drawPageTitle(p, 'Life Balance Wheel', false);
  p.drawText('Rate each area 1-10 and color in the segments.', { x: CONTENT_X, y: H - 80, size: 12, font: fontOblique, color: GRAY });
  const cx = CONTENT_X + CONTENT_W / 2, cy = H / 2 - 30, radius = 280;
  for (let r = 1; r <= 5; r++) {
    p.drawCircle({ x: cx, y: cy, size: radius * (r / 5), borderColor: r === 5 ? ACCENT : LIGHT_GRAY, borderWidth: r === 5 ? 1 : 0.5 });
    p.drawText(String(r * 2), { x: cx + 4, y: cy + radius * (r / 5) + 3, size: 7, font, color: GRAY });
  }
  CATS.forEach((c, i) => {
    const angle = (i / CATS.length) * Math.PI * 2 - Math.PI / 2;
    const ex = cx + Math.cos(angle) * radius;
    const ey = cy + Math.sin(angle) * radius;
    p.drawLine({ start: { x: cx, y: cy }, end: { x: ex, y: ey }, thickness: 0.5, color: LIGHT_GRAY });
    const lx = cx + Math.cos(angle) * (radius + 25);
    const ly = cy + Math.sin(angle) * (radius + 25);
    const tw = fontBold.widthOfTextAtSize(c, 10);
    p.drawCircle({ x: lx - tw / 2 - 12, y: ly + 3, size: 5, color: CAT_COLORS[i] });
    p.drawText(c, { x: lx - tw / 2, y: ly - 2, size: 10, font: fontBold, color: DARK });
  });

  // ── Weekly Review ──
  p = makePage('review');
  drawSideTabs(p, 'review', false);
  drawPageTitle(p, 'Weekly Review', false);
  p.drawText('Week of: _______________', { x: CONTENT_X + CONTENT_W - 220, y: H - 50, size: 11, font, color: DARK });
  const revSections = [
    { label: 'Balance Score: _____ / 100', y: H - 90 },
    { label: 'What went well this week?', y: H - 130, lines: 5 },
    { label: 'What could be better?', y: H - 340, lines: 5 },
    { label: 'Goals for next week:', y: H - 550, lines: 5 },
    { label: 'One thing I\'m grateful for:', y: H - 760, lines: 2 },
  ];
  revSections.forEach(s => {
    p.drawText(s.label, { x: CONTENT_X, y: s.y, size: 13, font: fontBold, color: ACCENT });
    if (s.lines) {
      for (let i = 0; i < s.lines; i++) drawLine(p, CONTENT_X, s.y - 22 - i * 32, CONTENT_X + CONTENT_W, s.y - 22 - i * 32);
    }
  });

  // ── Brain Dump ──
  p = makePage('dump');
  drawSideTabs(p, 'dump', false);
  drawPageTitle(p, 'Brain Dump', false);
  p.drawText('Get it out of your head. Sort it later.', { x: CONTENT_X, y: H - 80, size: 12, font: fontOblique, color: GRAY });
  const dumpColW = Math.floor(CONTENT_W / 2) - 10;
  for (let col = 0; col < 2; col++) {
    const x = CONTENT_X + col * (dumpColW + 20);
    for (let i = 0; i < 28; i++) {
      drawLine(p, x, H - 110 - i * 30, x + dumpColW, H - 110 - i * 30);
    }
  }

  // ── Budget Tracker ──
  p = makePage('money');
  drawSideTabs(p, 'money', false);
  drawPageTitle(p, 'Monthly Budget', false);
  p.drawText('Month: _______________', { x: CONTENT_X + CONTENT_W - 200, y: H - 50, size: 11, font, color: DARK });
  const halfW = Math.floor(CONTENT_W / 2) - 15;
  ['Income', 'Expenses'].forEach((section, si) => {
    const sx = CONTENT_X + si * (halfW + 30);
    p.drawRectangle({ x: sx, y: H - 100, width: halfW, height: 28, color: ACCENT, borderColor: ACCENT, borderWidth: 0 });
    p.drawText(section, { x: sx + 10, y: H - 93, size: 12, font: fontBold, color: WHITE });
    p.drawText('Description', { x: sx + 10, y: H - 130, size: 9, font: fontBold, color: GRAY });
    p.drawText('Amount', { x: sx + halfW - 70, y: H - 130, size: 9, font: fontBold, color: GRAY });
    for (let i = 0; i < 15; i++) {
      const y = H - 150 - i * 38;
      p.drawRectangle({ x: sx, y, width: halfW, height: 35, borderColor: LIGHT_GRAY, borderWidth: 0.3, color: i % 2 === 0 ? WHITE : ACCENT_LIGHT });
    }
    p.drawText(`Total ${section}: $________`, { x: sx, y: H - 150 - 15 * 38 - 10, size: 12, font: fontBold, color: ACCENT });
  });
  p.drawText('Net: $________', { x: CONTENT_X, y: 60, size: 14, font: fontBold, color: ACCENT });

  // ── Meal Planner ──
  p = makePage('meals');
  drawSideTabs(p, 'meals', false);
  drawPageTitle(p, 'Weekly Meal Plan', false);
  const mealRows = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const mColW = Math.floor(CONTENT_W / 7);
  DAYS.forEach((d, i) => {
    const cx2 = CONTENT_X + i * mColW + mColW / 2;
    p.drawText(d, { x: cx2 - fontBold.widthOfTextAtSize(d, 10) / 2, y: H - 80, size: 10, font: fontBold, color: ACCENT });
  });
  mealRows.forEach((m, mi) => {
    const y = H - 100 - (mi + 1) * 155;
    p.drawText(m, { x: CONTENT_X - 70, y: y + 70, size: 9, font: fontBold, color: DARK });
    for (let d = 0; d < 7; d++) {
      p.drawRectangle({ x: CONTENT_X + d * mColW, y, width: mColW - 3, height: 148, borderColor: LIGHT_GRAY, borderWidth: 0.5, color: mi % 2 === 0 ? WHITE : ACCENT_LIGHT });
    }
  });
  p.drawText('Grocery List:', { x: CONTENT_X, y: 100, size: 13, font: fontBold, color: ACCENT });
  for (let i = 0; i < 3; i++) drawLine(p, CONTENT_X + 110 + i * 360, 80, CONTENT_X + 110 + i * 360 + 320, 80);

  // ── Notes ──
  p = makePage('notes');
  drawSideTabs(p, 'notes', false);
  drawPageTitle(p, 'Notes', false);
  for (let i = 0; i < 30; i++) {
    drawLine(p, CONTENT_X, H - 80 - i * 28, CONTENT_X + CONTENT_W, H - 80 - i * 28);
  }

  // ── Add link annotations on every page ──
  // First pass: collect all tab rects per page
  allPages.forEach(({ page, key, idx, isDark }) => {
    if (key === 'cover-light' || key === 'cover-dark') return;
    const totalTabs = tabs.length;
    const gap = 2;
    const availH = H - 20;
    const tabH = Math.min(TAB_H, Math.floor((availH - (totalTabs - 1) * gap) / totalTabs));
    const startY = H - 10;
    tabs.forEach((t, i) => {
      const y = startY - (i + 1) * (tabH + gap);
      const targetIdx = pageIndex[t.key];
      if (targetIdx !== undefined && targetIdx !== idx) {
        addLinkAnnotation(page, { x: 2, y, w: TAB_W - 4, h: tabH }, targetIdx);
      }
    });
  });

  // Index page links to sections
  const idxPage = doc.getPage(pageIndex['index']);
  const col1Items = indexSections.slice(0, 13);
  const col2Items = indexSections.slice(13);
  col1Items.forEach((s, i) => {
    const targetIdx = pageIndex[s.key];
    if (targetIdx !== undefined) {
      const y = H - 90 - i * 56;
      addLinkAnnotation(idxPage, { x: CONTENT_X, y, w: 520, h: 48 }, targetIdx);
    }
  });
  col2Items.forEach((s, i) => {
    const targetIdx = pageIndex[s.key];
    if (targetIdx !== undefined) {
      const y = H - 90 - i * 56;
      addLinkAnnotation(idxPage, { x: CONTENT_X + 540, y, w: 520, h: 48 }, targetIdx);
    }
  });

  // Year page links to months
  const yearPage = doc.getPage(pageIndex['year']);
  MONTHS.forEach((m, mi) => {
    const col = mi % 4;
    const row = Math.floor(mi / 4);
    const x = CONTENT_X + col * (miniMonthW + 15);
    const y = H - 80 - (row + 1) * (miniMonthH + 10);
    const targetIdx = pageIndex[`month-${mi}`];
    if (targetIdx !== undefined) {
      addLinkAnnotation(yearPage, { x, y, w: miniMonthW, h: miniMonthH }, targetIdx);
    }
  });

  const bytes = await doc.save();
  const outPath = path.join(DIST, 'GoodNotes-Companion-Planner.pdf');
  fs.writeFileSync(outPath, bytes);
  const sizeMB = (bytes.length / 1024 / 1024).toFixed(2);
  console.log(`GoodNotes: ${outPath} (${sizeMB} MB, ${doc.getPageCount()} pages)`);
}

// ─── AI Prompt Pack ───
async function buildPromptPack() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = PageSizes.Letter;

  function addPage(title, subtitle) {
    const page = doc.addPage(PageSizes.Letter);
    page.drawText('LifeBalance Planner  - AI Prompt Pack', { x: 50, y: H - 30, size: 9, font, color: GRAY });
    if (title) page.drawText(title, { x: 50, y: H - 65, size: 18, font: fontBold, color: BLUE });
    if (subtitle) page.drawText(subtitle, { x: 50, y: H - 85, size: 11, font, color: GRAY });
    return page;
  }

  function writePrompts(page, prompts, startY) {
    let y = startY;
    prompts.forEach((p, i) => {
      if (y < 80) { page = addPage(null); y = H - 70; }
      page.drawText(`${i + 1}. ${p.title}`, { x: 55, y, size: 11, font: fontBold, color: DARK });
      y -= 16;
      const lines = p.prompt.split('\n');
      lines.forEach(line => {
        if (y < 60) { page = addPage(null); y = H - 70; }
        page.drawText(line, { x: 65, y, size: 9, font, color: GRAY, maxWidth: W - 120 });
        y -= 12;
      });
      y -= 10;
    });
    return y;
  }

  // Cover
  let p = addPage(null);
  p.drawText('AI Prompt Pack', { x: 50, y: H - 200, size: 32, font: fontBold, color: BLUE });
  p.drawText('30+ ready-to-use prompts for ChatGPT & Claude', { x: 50, y: H - 235, size: 14, font, color: GRAY });
  p.drawText('Use with LifeBalance Planner\'s "Copy for AI" feature', { x: 50, y: H - 260, size: 12, font, color: DARK });

  // Scheduling
  p = addPage('Scheduling & Time Management', 'Optimize your daily and weekly schedule');
  writePrompts(p, [
    { title: 'Plan My Perfect Day', prompt: 'Here is my schedule, tasks, and goals for today. Suggest the ideal order\nfor my tasks, when to take breaks, and which tasks to defer if needed.' },
    { title: 'Weekly Schedule Review', prompt: 'Review my weekly schedule. Where am I over-committed? Where do I have\ngaps? Suggest 3 specific changes to better match my hour goals.' },
    { title: 'Time-Block My Week', prompt: 'Based on my goals and recurring events, create a time-blocked schedule\nfor this week. Respect my fixed commitments and sleep hours.' },
    { title: 'Rescue a Busy Day', prompt: 'I\'m overbooked today. Here\'s my schedule. What can I move, shorten,\nor delegate? Prioritize by importance, not urgency.' },
    { title: 'Build a Morning Routine', prompt: 'I want to start my day before [time]. Design a morning routine that\nincludes [activities]. Keep it under [X] minutes.' },
  ], H - 110);

  // Habits
  p = addPage('Habit Building', 'Build consistency and break bad patterns');
  writePrompts(p, [
    { title: 'Fix My Failing Habit', prompt: 'I keep missing [habit]. My schedule shows [context]. Suggest 3 strategies\nto make it stick, including the best time slot and accountability ideas.' },
    { title: 'Habit Stack Designer', prompt: 'I want to add [new habit]. What existing habits can I stack it with?\nDesign a sequence that takes under 30 minutes.' },
    { title: 'Streak Recovery', prompt: 'I broke my [habit] streak after [X] days. How should I restart without\nfeeling defeated? Give me a 7-day restart plan.' },
    { title: '30-Day Challenge', prompt: 'Create a 30-day challenge for [goal]. Start easy, increase gradually.\nInclude rest days and milestone celebrations.' },
    { title: 'Minimize Decision Fatigue', prompt: 'I have too many habits to track. Which 3-5 are highest impact?\nSuggest which to automate, batch, or pause.' },
  ], H - 110);

  // Goals
  p = addPage('Goal Planning', 'Break big dreams into actionable steps');
  writePrompts(p, [
    { title: 'Quarterly Goal Breakdown', prompt: 'My goal for this quarter is [goal]. Break it into monthly milestones\nand weekly action items. Include success metrics.' },
    { title: 'Rebalance My Life', prompt: 'My balance score is [X]/100. These categories are behind: [list].\nSuggest specific schedule changes to improve balance.' },
    { title: 'Annual Vision to Weekly Plan', prompt: 'My top 3 goals this year are [goals]. Translate them into this week\'s\nschedule. What should I do this week to make progress?' },
    { title: 'Goal Conflict Resolution', prompt: 'These goals seem to conflict: [A] and [B]. How can I pursue both?\nSuggest a schedule that gives each enough time.' },
    { title: 'Mid-Year Review', prompt: 'It\'s mid-year. Here are my goals and progress. Which should I\naccelerate, adjust, or drop? Be honest.' },
  ], H - 110);

  // Productivity
  p = addPage('Productivity & Focus', 'Get more done with less stress');
  writePrompts(p, [
    { title: 'Task Priority Matrix', prompt: 'Here are my tasks. Categorize each as urgent/important, important/not urgent,\nurgent/not important, or neither. Then suggest the order to tackle them.' },
    { title: 'Deep Work Schedule', prompt: 'I need [X] hours of deep work this week. My calendar shows [events].\nFind the best blocks for uninterrupted focus time.' },
    { title: 'Energy Management', prompt: 'My energy levels: morning [X/5], afternoon [Y/5], evening [Z/5].\nReorganize my tasks to match my energy patterns.' },
    { title: 'Procrastination Buster', prompt: 'I\'ve been avoiding [task] for [X] days. Break it into the smallest\npossible first step (under 5 minutes). Then give me steps 2-5.' },
    { title: 'Meeting Audit', prompt: 'Here are my meetings this week. Which could be emails? Which could\nbe shorter? Suggest a leaner meeting schedule.' },
  ], H - 110);

  // Wellness
  p = addPage('Wellness & Self-Care', 'Balance achievement with wellbeing');
  writePrompts(p, [
    { title: 'Sleep Optimization', prompt: 'I sleep [X] hours but want [Y]. My evening schedule is [events].\nDesign a wind-down routine and suggest schedule changes.' },
    { title: 'Stress Check', prompt: 'My schedule this week is [description]. On a scale of 1-10, how\nsustainable is this? Suggest what to cut if it\'s above 7.' },
    { title: 'Weekend Recovery Plan', prompt: 'I\'m burned out from the work week. Design a restorative weekend\nthat includes rest, fun, and gentle preparation for Monday.' },
    { title: 'Meal Planning Helper', prompt: 'Plan 5 weeknight dinners for a family of [X]. Budget: $[Y]/week.\nInclude a combined grocery list sorted by store section.' },
    { title: 'Exercise Integration', prompt: 'I want to exercise [X] times per week but keep skipping it.\nFind windows in my schedule and suggest the right type of\nexercise for each time slot.' },
  ], H - 110);

  // Faith & Relationships
  p = addPage('Faith & Relationships', 'Nurture what matters most');
  writePrompts(p, [
    { title: 'Prayer Time Optimization', prompt: 'I have [prayer times] daily. My work schedule is [hours]. Help me\nprotect these times without work conflicts.' },
    { title: 'Family Time Audit', prompt: 'I want [X] hours of quality family time per week. Currently getting [Y].\nSuggest specific activities and time slots to close the gap.' },
    { title: 'Date Night Ideas', prompt: 'We have [day] free from [time] to [time]. Budget: $[X].\nSuggest 3 date ideas that match our interests: [interests].' },
    { title: 'Community Service Plan', prompt: 'I want to volunteer [X] hours/month. My free time is [windows].\nSuggest types of service that fit my schedule and skills.' },
    { title: 'Digital Detox Schedule', prompt: 'I spend too much time on screens. Design a realistic digital\ndetox plan for evenings and weekends. Include alternatives.' },
  ], H - 110);

  // Budget
  p = addPage('Financial Planning', 'Simple budget prompts');
  writePrompts(p, [
    { title: 'Monthly Budget Review', prompt: 'Income: $[X]. Expenses: $[Y]. Categories: [list with amounts].\nWhere am I overspending? Suggest 3 cuts that won\'t hurt.' },
    { title: 'Savings Goal Calculator', prompt: 'I want to save $[X] in [Y] months. My current monthly surplus is $[Z].\nIs this realistic? If not, what needs to change?' },
    { title: 'Subscription Audit', prompt: 'Here are my subscriptions: [list with costs]. Which should I cancel,\ndowngrade, or keep? Calculate annual savings from cuts.' },
  ], H - 110);

  const bytes = await doc.save();
  const outPath = path.join(DIST, 'AI-Prompt-Pack.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log(`Prompts: ${outPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  await buildGuide();
  await buildGoodNotes();
  await buildPromptPack();
  console.log('\nAll PDFs built successfully.');
}

main().catch(e => { console.error(e); process.exit(1); });
