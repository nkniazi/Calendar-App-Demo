// Captures raw screenshots of the Etsy planner (dist/etsy) for listing images + video.
// Usage: node scripts/marketing/capture.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = 'file:///' + path.join(ROOT, 'dist', 'etsy', 'LifeBalance-Planner.html').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'marketing', 'raw');
const FIXED_NOW = new Date('2026-10-16T10:20:00'); // a Friday mid-morning
const SEED_DATE = new Date('2026-09-28T06:00:00'); // recurring routines start earlier so every day is filled

fs.mkdirSync(OUT, { recursive: true });

// Rich, realistic sample data layered on top of the app's own loadDemoData().
function seed(anchorISO) {
  state.preferences.onboardingComplete = true;
  state.preferences.lastBackupDate = new Date().toISOString();
  savePreferences();
  document.querySelectorAll('.welcome-overlay, .onboarding-overlay').forEach(el => el.remove());
  window.confirm = () => true;
  loadDemoData(); // recurring demo events start on the (earlier) seed date

  const today = new Date(anchorISO);
  state.events.forEach(e => { if (e.id === 'demo_task1') e.date = dateStr(today); if (e.id === 'demo_task2') e.date = dateStr(addDays(today, 1)); if (e.id === 'demo_task3') e.date = dateStr(addDays(today, 2)); });
  // Habit history for streaks + weekly %
  const pattern = { demo_h1: [1,0,1,0,1,0,1,1,0,1,0,1,0,1], demo_h2: [1,1,1,1,0,1,1,1,1,1,1,1,1,1], demo_h3: [1,1,1,1,1,1,1,1,1,1,1,1,1,1], demo_h4: [1,1,0,1,1,1,2,1,1,1,1,0,1,1] };
  Object.entries(pattern).forEach(([id, days]) => {
    days.forEach((v, i) => {
      const ds = dateStr(addDays(today, -(days.length - i)));
      if (v === 1) logHabitCompletion(id, ds, 'completed');
      else if (v === 2) logHabitCompletion(id, ds, 'skipped');
    });
  });
  logHabitCompletion('demo_h3', dateStr(today), 'completed');
  logHabitCompletion('demo_h4', dateStr(today), 'completed');
  [-4, -2].forEach(o => logHabitCompletion('demo_h1', dateStr(addDays(today, o)), 'completed')); // Mon + Wed workouts this week

  // A few extra events to make the week view rich
  const mk = (id, title, dOff, s, e, cat, flex) => ({ id: 'demo_' + id, title, date: dateStr(addDays(today, dOff)), startTime: s, endTime: e, allDay: false, category: cat, description: '', type: 'event', completed: false, recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: flex || 'flexible' });
  state.events.push(
    mk('kids', 'School pickup', 0, '15:30', '16:00', 'family', 'protected'),
    mk('call', 'Call Mom', 1, '19:45', '20:15', 'family'),
    mk('course', 'AI course lesson', -1, '20:00', '21:00', 'personal-other'),
    mk('market', 'Farmers market', 3, '10:00', '11:30', 'food-meals'),
    mk('movie', 'Movie night', 2, '20:00', '22:00', 'entertainment'),
  );
  saveEvents();

  const m = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  [['income','Salary',4200],['income','Etsy shop',640],['expense','Rent',1450],['expense','Groceries',520],['expense','Utilities',210],['expense','Car & fuel',260],['expense','Savings transfer',600],['expense','Family outing',95]]
    .forEach(([t, d, a]) => addBudgetItem(m, t, d, a));

  const wk = dateStr(getMonday(today));
  const meals = [
    ['Oatmeal & berries','oats, berries, milk','Chicken salad','chicken, lettuce, tomato','Salmon & rice','salmon, rice, broccoli'],
    ['Greek yogurt','yogurt, honey, granola','Lentil soup','lentils, carrots, onion','Pasta primavera','pasta, zucchini, tomato'],
    ['Eggs & toast','eggs, bread','Leftover pasta','','Chicken curry','chicken, rice, onion, yogurt'],
    ['Smoothie','banana, berries, milk','Tuna wrap','tuna, tortilla, lettuce','Tacos','tortilla, beef, tomato, lettuce'],
    ['Oatmeal & berries','oats, berries, milk','Quinoa bowl','quinoa, chickpeas, cucumber','Pizza night','dough, cheese, tomato'],
    ['Pancakes','flour, eggs, milk','Family brunch','','BBQ','chicken, corn, salad'],
    ['Eggs & toast','eggs, bread','Soup & bread','lentils, bread','Roast veggies','potatoes, carrots, broccoli'],
  ];
  meals.forEach((d, i) => {
    const day = dateStr(addDays(getMonday(today), i));
    setMeal(wk, day, 'breakfast', d[0], d[1]); setMeal(wk, day, 'lunch', d[2], d[3]); setMeal(wk, day, 'dinner', d[4], d[5]);
  });

  ['Renew car insurance', 'Idea: Sunday meal prep', 'Email teacher about field trip', 'Fix the leaking tap', 'Gift for Sara\'s birthday', 'Read chapter 4 of AI book']
    .forEach(t => addBrainDumpItem(t));

  for (let i = 6; i >= 0; i--) logEnergy(dateStr(addDays(today, -i)), [3,4,2,4,5,3,4][6 - i], [4,4,3,4,5,4,5][6 - i]);
  setJournalEntry(dateStr(today), { gratitude: ['Morning walk with the kids', 'Finished the report early', 'A calm prayer before work'], notes: 'Felt focused today. Protecting my deep-work block really helped.', review: '', improve: '' });
  updateGoalHierarchy('yearly', 'Run a 10K â€¢ Save $6,000 â€¢ Read 24 books');
  updateGoalHierarchy('quarterly', 'Train 3x per week â€¢ Build emergency fund to $2,000');
  updateGoalHierarchy('monthly', 'Finish AI course â€¢ 12 workouts â€¢ No-spend weekends');
}

async function shot(page, name, opts = {}) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts });
  console.log('saved', name);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(SEED_DATE);
  page.on('dialog', d => d.accept());
  await page.goto(HTML);
  await page.evaluate(seed, FIXED_NOW.toISOString());
  await page.clock.setFixedTime(FIXED_NOW);
  await page.reload();
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));

  const go = async (p, extra) => { await page.evaluate(([p, extra]) => { switchPage(p); if (extra) eval(extra); document.querySelectorAll('.toast').forEach(t => t.remove()); }, [p, extra || null]); };

  await go('dashboard'); await shot(page, 'dashboard');
  await go('calendar', "state.currentView='week'; renderAll(); switchPage('calendar')"); await shot(page, 'week');
  await go('calendar', "state.currentView='day'; renderAll(); switchPage('calendar')"); await shot(page, 'day');
  await go('calendar', "state.currentView='month'; renderAll(); switchPage('calendar')"); await shot(page, 'month');
  for (const p of ['tasks', 'habits', 'goals', 'braindump', 'focus', 'budget', 'mealplan', 'journal', 'settings', 'about']) {
    await go(p); await shot(page, p);
  }

  // Themes + dark mode on the dashboard
  for (const t of ['default', 'sage', 'blush', 'ocean', 'minimal']) {
    await page.evaluate(t => { state.darkMode = false; setColorTheme(t); switchPage('dashboard'); }, t);
    await shot(page, 'theme-' + t);
  }
  await page.evaluate(() => { setColorTheme('default'); toggleDarkMode(true); switchPage('dashboard'); });
  await shot(page, 'dark-dashboard');
  await page.evaluate(() => { state.currentView = 'week'; switchPage('calendar'); });
  await shot(page, 'dark-week');
  await page.evaluate(() => { toggleDarkMode(false); switchPage('dashboard'); });

  // ── Element crops used as floating cards on the listing tiles ──
  const crop = async (name, locator) => {
    const el = page.locator(locator.sel, locator.text ? { hasText: locator.text } : {}).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await el.screenshot({ path: path.join(OUT, 'el-' + name + '.png') });
    console.log('saved el-' + name);
  };
  await go('dashboard');
  await crop('budget', { sel: '.dash-card', text: '24-Hour Budget' });
  await crop('score', { sel: '.dash-card', text: 'Life Balance Score' });
  await crop('categories', { sel: '.dash-card', text: 'Time by Category' });
  await crop('today-habits', { sel: '.dash-card', text: "Today's Habits" });
  await crop('tasks', { sel: '.dash-card', text: 'Tasks' });
  await crop('week-chart', { sel: '.dash-card', text: 'This Week' });
  await crop('overview', { sel: '.dash-card', text: "Today's Overview" });
  await go('habits');
  await crop('habits-today', { sel: '.dash-card', text: "Today's Habits" });
  await crop('habits-week', { sel: '.dash-card', text: 'Weekly Progress' });
  await go('mealplan');
  await crop('grocery', { sel: '.dash-card', text: 'Grocery List' });
  await go('journal');
  await crop('energy', { sel: '.dash-card', text: 'Energy' });
  await crop('gratitude', { sel: '.dash-card', text: 'Gratitude' });
  await go('budget');
  await crop('money', { sel: '.settings-view', text: 'Budget' });
  await go('braindump');
  await crop('braindump', { sel: '#calendar-view > div', text: 'Brain Dump' });
  await go('focus');
  await crop('focus', { sel: '#calendar-view > div', text: 'Focus' });

  // "What Now?" offline suggestion panel
  await go('dashboard');
  await page.evaluate(() => handleWhatNow());
  await page.waitForTimeout(800);
  await shot(page, 'whatnow');
  await page.locator('#ai-panel').screenshot({ path: path.join(OUT, 'el-whatnow.png') });
  await page.evaluate(() => closeAIPanel());

  // Overbooked day: the key "is your day actually possible?" message
  await page.evaluate(() => {
    const t = todayStr();
    const mk = (id, title, s, e, cat) => ({ id: 'demo_ob_' + id, title, date: t, startTime: s, endTime: e, allDay: false, category: cat, description: '', type: 'event', completed: false, recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' });
    state.events.push(mk('a', 'Client workshop', '13:00', '18:00', 'work-money'), mk('b', 'Kids soccer', '16:00', '18:30', 'family'), mk('c', 'Grocery run', '17:00', '18:00', 'food-meals'), mk('d', 'Online course', '19:00', '22:30', 'personal-other'), mk('e', 'Side project', '20:00', '23:30', 'work-money'), mk('f', 'Gym', '05:00', '07:30', 'personal-other'), mk('g', 'Meal prep', '07:00', '09:00', 'food-meals'));
    switchPage('dashboard');
    document.querySelectorAll('.toast').forEach(t => t.remove());
  });
  await crop('budget-over', { sel: '.dash-card', text: '24-Hour Budget' });
  await crop('overview-over', { sel: '.dash-card', text: "Today's Overview" });

  await browser.close();
})();
