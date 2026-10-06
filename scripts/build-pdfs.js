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

  // Cover
  let p = addPage(null);
  p.drawText('LifeBalance Planner', { x: 50, y: H - 200, size: 36, font: fontBold, color: BLUE });
  p.drawText('Start Here Guide', { x: 50, y: H - 240, size: 24, font, color: DARK });
  p.drawText('The planner that tells you if your life plan is realistic.', { x: 50, y: H - 280, size: 13, font, color: GRAY });

  // Getting Started
  p = addPage('Getting Started');
  writeLines(p, [
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

  // Browsers
  p = addPage('Browser Support');
  writeLines(p, [
    'Recommended:',
    '  Google Chrome (best experience)',
    '  Microsoft Edge',
    '',
    'Also works:',
    '  Mozilla Firefox',
    '  Safari (Mac/iPad)',
    '',
    'Not recommended:',
    '  Internet Explorer (not supported)',
    '  Very old browser versions',
    '',
    'Tip: For iPad, open in Safari and use "Add to Home Screen"',
    'for an app-like experience.',
  ], H - 100);

  // Backup & Restore
  p = addPage('Backup & Restore');
  writeLines(p, [
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

  // Troubleshooting
  p = addPage('Troubleshooting');
  writeLines(p, [
    'Q: My planner is empty!',
    'A: You may have moved the file, changed browsers, or cleared',
    '   browser data. Import your last backup from Settings.',
    '',
    'Q: Can I use this on my phone?',
    'A: Yes, but it works best on a tablet or desktop.',
    '   Open the HTML file in Chrome and bookmark it.',
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

  // FAQ
  p = addPage('Features Overview');
  writeLines(p, [
    'Calendar: Day, 3-day, week, month, agenda, and year views.',
    'Tasks: Create tasks with priorities and due dates.',
    'Habits: Track daily habits with streaks.',
    'Goals: Set weekly hour goals for each life category.',
    'Brain Dump: Quick capture for scattered thoughts.',
    'Focus Timer: Pomodoro timer for deep work.',
    'Budget: Simple monthly income/expense tracking.',
    'Meal Plan: Weekly meal planner with grocery lists.',
    'Journal: Daily gratitude + weekly review.',
    'Balance Score: See if your schedule matches your goals.',
    'AI-Ready: Copy prompts for ChatGPT or Claude.',
    'Themes: 5 color themes + dark mode.',
    'Templates: Import pre-built schedules.',
    'Export: .ics for Google/Apple/Outlook Calendar.',
    '',
    'Works any year  - undated and flexible.',
    'No internet required  - everything runs offline.',
  ], H - 100);

  const bytes = await doc.save();
  const outPath = path.join(DIST, 'Start-Here-Guide.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log(`Guide: ${outPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
}

// ─── GoodNotes Companion Planner ───
async function buildGoodNotes() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = PageSizes.Letter;

  const pageRefs = {};
  const sections = [
    'Index', 'Monthly Overview', 'Weekly Time-Blocking', 'Daily Planner',
    '24-Hour Life Budget', 'Habit Tracker', 'Balance Wheel',
    'Weekly Review', 'Brain Dump', 'Budget Tracker', 'Meal Planner'
  ];

  // Helper: create a page and store its ref
  function makePage(name) {
    const page = doc.addPage(PageSizes.Letter);
    pageRefs[name] = doc.getPageCount() - 1;
    page.drawText('LifeBalance Planner', { x: 50, y: H - 30, size: 9, font, color: GRAY });
    return page;
  }

  // Index page
  let p = makePage('Index');
  p.drawText('LifeBalance Planner', { x: 50, y: H - 100, size: 28, font: fontBold, color: BLUE });
  p.drawText('Companion Planner for GoodNotes', { x: 50, y: H - 130, size: 14, font, color: GRAY });
  let indexY = H - 180;
  sections.forEach((name, i) => {
    p.drawText(`${i + 1}. ${name}`, { x: 70, y: indexY, size: 13, font, color: DARK });
    indexY -= 24;
  });

  // Monthly Overview (one page with grid)
  p = makePage('Monthly Overview');
  p.drawText('Monthly Overview', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Month: _______________    Year: _______', { x: 50, y: H - 90, size: 11, font, color: DARK });
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cellW = (W - 100) / 7;
  const cellH = 70;
  days.forEach((d, i) => {
    p.drawText(d, { x: 55 + i * cellW, y: H - 120, size: 10, font: fontBold, color: DARK });
  });
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const x = 50 + col * cellW;
      const y = H - 140 - row * cellH;
      p.drawRectangle({ x, y, width: cellW, height: cellH, borderColor: LIGHT_GRAY, borderWidth: 0.5, color: WHITE });
    }
  }

  // Weekly Time-Blocking
  p = makePage('Weekly Time-Blocking');
  p.drawText('Weekly Time-Blocking', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Week of: _______________', { x: 50, y: H - 85, size: 11, font, color: DARK });
  const colW = (W - 100) / 7;
  days.forEach((d, i) => {
    p.drawText(d, { x: 55 + i * colW, y: H - 110, size: 9, font: fontBold, color: DARK });
  });
  for (let hr = 6; hr <= 22; hr++) {
    const y = H - 130 - (hr - 6) * 28;
    p.drawText(`${hr}:00`, { x: 20, y: y + 8, size: 7, font, color: GRAY });
    drawLine(p, 50, y, W - 50, y);
  }

  // Daily Planner
  p = makePage('Daily Planner');
  p.drawText('Daily Planner', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Date: _______________', { x: 50, y: H - 85, size: 11, font, color: DARK });
  p.drawText('Top 3 Priorities:', { x: 50, y: H - 115, size: 12, font: fontBold, color: DARK });
  for (let i = 0; i < 3; i++) {
    const y = H - 140 - i * 22;
    p.drawText(`${i+1}. `, { x: 60, y, size: 11, font, color: DARK });
    drawLine(p, 80, y - 2, W - 50, y - 2);
  }
  p.drawText('Schedule:', { x: 50, y: H - 210, size: 12, font: fontBold, color: DARK });
  for (let hr = 6; hr <= 21; hr++) {
    const y = H - 235 - (hr - 6) * 28;
    p.drawText(`${hr}:00`, { x: 55, y: y + 8, size: 9, font, color: GRAY });
    drawLine(p, 90, y, W - 50, y);
  }

  // 24-Hour Life Budget
  p = makePage('24-Hour Life Budget');
  p.drawText('24-Hour Life Budget', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  const cats = ['Faith', 'Sleep', 'Work / Money', 'Food / Meals', 'Family', 'Entertainment', 'Personal'];
  p.drawText('Category', { x: 60, y: H - 100, size: 10, font: fontBold, color: DARK });
  p.drawText('Goal (hrs)', { x: 220, y: H - 100, size: 10, font: fontBold, color: DARK });
  p.drawText('Actual (hrs)', { x: 340, y: H - 100, size: 10, font: fontBold, color: DARK });
  p.drawText('Difference', { x: 460, y: H - 100, size: 10, font: fontBold, color: DARK });
  cats.forEach((c, i) => {
    const y = H - 125 - i * 28;
    p.drawText(c, { x: 60, y, size: 11, font, color: DARK });
    drawLine(p, 220, y - 5, 300, y - 5);
    drawLine(p, 340, y - 5, 420, y - 5);
    drawLine(p, 460, y - 5, 540, y - 5);
  });
  p.drawText('Total: 24 hours', { x: 60, y: H - 125 - cats.length * 28 - 10, size: 11, font: fontBold, color: DARK });

  // Habit Tracker
  p = makePage('Habit Tracker');
  p.drawText('Habit Tracker', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Month: _______________', { x: 50, y: H - 85, size: 11, font, color: DARK });
  p.drawText('Habit', { x: 60, y: H - 115, size: 10, font: fontBold, color: DARK });
  for (let d = 1; d <= 31; d++) {
    p.drawText(String(d), { x: 148 + (d - 1) * 13, y: H - 115, size: 7, font, color: GRAY });
  }
  for (let row = 0; row < 10; row++) {
    const y = H - 135 - row * 20;
    drawLine(p, 50, y, W - 30, y);
  }

  // Balance Wheel
  p = makePage('Balance Wheel');
  p.drawText('Life Balance Wheel', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Rate each area 1-10. Color in the segments.', { x: 50, y: H - 85, size: 11, font, color: GRAY });
  const cx = W / 2, cy = H / 2 - 20, radius = 150;
  p.drawCircle({ x: cx, y: cy, size: radius, borderColor: LIGHT_GRAY, borderWidth: 1, color: WHITE });
  for (let r = 1; r <= 4; r++) {
    p.drawCircle({ x: cx, y: cy, size: radius * (r / 5), borderColor: LIGHT_GRAY, borderWidth: 0.5 });
  }
  cats.forEach((c, i) => {
    const angle = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
    const lx = cx + Math.cos(angle) * (radius + 15);
    const ly = cy + Math.sin(angle) * (radius + 15);
    p.drawText(c, { x: lx - 20, y: ly, size: 8, font, color: DARK });
  });

  // Weekly Review
  p = makePage('Weekly Review');
  p.drawText('Weekly Review', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Week of: _______________', { x: 50, y: H - 85, size: 11, font, color: DARK });
  const reviewSections = [
    { label: 'Balance Score: _____ / 100', y: -110 },
    { label: 'What went well:', y: -140 },
    { label: 'What to improve:', y: -280 },
    { label: 'Goals for next week:', y: -420 },
  ];
  reviewSections.forEach(s => {
    p.drawText(s.label, { x: 50, y: H + s.y, size: 12, font: fontBold, color: DARK });
    for (let i = 0; i < 5; i++) drawLine(p, 50, H + s.y - 20 - i * 22, W - 50, H + s.y - 20 - i * 22);
  });

  // Brain Dump
  p = makePage('Brain Dump');
  p.drawText('Brain Dump', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Write it all down. Sort later.', { x: 50, y: H - 85, size: 11, font, color: GRAY });
  for (let i = 0; i < 25; i++) drawLine(p, 50, H - 110 - i * 24, W - 50, H - 110 - i * 24);

  // Budget Tracker
  p = makePage('Budget Tracker');
  p.drawText('Monthly Budget', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  p.drawText('Month: _______________', { x: 50, y: H - 85, size: 11, font, color: DARK });
  ['Income', 'Expenses'].forEach((section, si) => {
    const startY = H - 120 - si * 280;
    p.drawText(section, { x: 50, y: startY, size: 14, font: fontBold, color: DARK });
    p.drawText('Description', { x: 60, y: startY - 20, size: 9, font: fontBold, color: GRAY });
    p.drawText('Amount', { x: 400, y: startY - 20, size: 9, font: fontBold, color: GRAY });
    for (let i = 0; i < 10; i++) drawLine(p, 50, startY - 40 - i * 22, W - 50, startY - 40 - i * 22);
    p.drawText(`Total ${section}: $________`, { x: 350, y: startY - 40 - 10 * 22, size: 11, font: fontBold, color: DARK });
  });

  // Meal Planner
  p = makePage('Meal Planner');
  p.drawText('Weekly Meal Plan', { x: 50, y: H - 60, size: 20, font: fontBold, color: BLUE });
  const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const mColW = (W - 120) / 7;
  days.forEach((d, i) => p.drawText(d, { x: 80 + i * mColW, y: H - 100, size: 9, font: fontBold, color: DARK }));
  meals.forEach((m, mi) => {
    const y = H - 120 - mi * 130;
    p.drawText(m, { x: 20, y: y + 40, size: 9, font: fontBold, color: DARK });
    for (let col = 0; col < 7; col++) {
      p.drawRectangle({
        x: 75 + col * mColW, y, width: mColW - 4, height: 120,
        borderColor: LIGHT_GRAY, borderWidth: 0.5, color: WHITE
      });
    }
  });

  // Add hyperlinks from Index to each section
  const indexPage = doc.getPage(0);
  sections.forEach((name, i) => {
    const targetPageIndex = pageRefs[name];
    if (targetPageIndex !== undefined) {
      const targetPage = doc.getPage(targetPageIndex);
      const y = H - 180 + (-i * 24);
      indexPage.node.set(
        indexPage.node.context.obj('Annots'),
        indexPage.node.context.obj([])
      );
    }
  });

  const bytes = await doc.save();
  const outPath = path.join(DIST, 'GoodNotes-Companion-Planner.pdf');
  fs.writeFileSync(outPath, bytes);
  console.log(`GoodNotes: ${outPath} (${(bytes.length / 1024).toFixed(1)} KB)`);
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
