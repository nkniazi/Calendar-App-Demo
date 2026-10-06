#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '..', 'dist', 'etsy', 'LifeBalance-Planner.html');
const OUT_DIR = path.resolve(__dirname, '..', 'dist', 'etsy', 'screenshots');

fs.mkdirSync(OUT_DIR, { recursive: true });

const DEMO_EVENTS = [
  { id: 'e1', title: 'Morning Prayer', date: '2026-10-05', startTime: '05:30', endTime: '06:00', allDay: false, category: 'faith', type: 'event' },
  { id: 'e2', title: 'Sleep', date: '2026-10-05', startTime: '22:00', endTime: '06:00', allDay: true, category: 'sleep', type: 'event' },
  { id: 'e3', title: 'Client Meeting', date: '2026-10-05', startTime: '09:00', endTime: '10:30', allDay: false, category: 'work-money', type: 'event' },
  { id: 'e4', title: 'Deep Work - Project Alpha', date: '2026-10-05', startTime: '10:30', endTime: '12:30', allDay: false, category: 'work-money', type: 'event' },
  { id: 'e5', title: 'Lunch Break', date: '2026-10-05', startTime: '12:30', endTime: '13:00', allDay: false, category: 'food-meals', type: 'event' },
  { id: 'e6', title: 'Team Standup', date: '2026-10-05', startTime: '14:00', endTime: '14:30', allDay: false, category: 'work-money', type: 'event' },
  { id: 'e7', title: 'Pick up kids', date: '2026-10-05', startTime: '15:30', endTime: '16:00', allDay: false, category: 'family', type: 'event' },
  { id: 'e8', title: 'Family Dinner', date: '2026-10-05', startTime: '18:00', endTime: '19:00', allDay: false, category: 'food-meals', type: 'event' },
  { id: 'e9', title: 'Reading Time', date: '2026-10-05', startTime: '20:00', endTime: '21:00', allDay: false, category: 'entertainment', type: 'event' },
  { id: 't1', title: 'Review Q4 budget', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'task', priority: 'high' },
  { id: 't2', title: 'Grocery shopping list', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'food-meals', type: 'task', priority: 'medium' },
  { id: 't3', title: 'Schedule dentist appointment', date: '2026-10-06', startTime: '09:00', endTime: '10:00', allDay: false, category: 'personal-other', type: 'task', priority: 'low' },
  { id: 'e10', title: 'Gym - Strength Training', date: '2026-10-06', startTime: '06:00', endTime: '07:00', allDay: false, category: 'personal-other', type: 'event' },
  { id: 'e11', title: 'Project Beta Sprint', date: '2026-10-06', startTime: '09:00', endTime: '12:00', allDay: false, category: 'work-money', type: 'event' },
  { id: 'e12', title: 'Evening Walk', date: '2026-10-06', startTime: '17:00', endTime: '17:30', allDay: false, category: 'personal-other', type: 'event' },
];

const DEMO_GOALS = [
  { id: 'g1', title: 'Faith', category: 'faith', targetHoursPerWeek: 7, active: true },
  { id: 'g2', title: 'Sleep', category: 'sleep', targetHoursPerWeek: 56, active: true },
  { id: 'g3', title: 'Work', category: 'work-money', targetHoursPerWeek: 40, active: true },
  { id: 'g4', title: 'Food', category: 'food-meals', targetHoursPerWeek: 10.5, active: true },
  { id: 'g5', title: 'Family', category: 'family', targetHoursPerWeek: 21, active: true },
  { id: 'g6', title: 'Entertainment', category: 'entertainment', targetHoursPerWeek: 14, active: true },
  { id: 'g7', title: 'Personal', category: 'personal-other', targetHoursPerWeek: 19.5, active: true },
];

const DEMO_HABITS = [
  { id: 'h1', name: 'Morning Prayer', category: 'faith', frequency: 'daily', daysOfWeek: [0,1,2,3,4,5,6], duration: 20, preferredTime: '05:30', status: 'active' },
  { id: 'h2', name: 'Exercise', category: 'personal-other', frequency: 'daily', daysOfWeek: [0,1,2,3,4], duration: 45, preferredTime: '06:00', status: 'active' },
  { id: 'h3', name: 'Read 30 min', category: 'entertainment', frequency: 'daily', daysOfWeek: [0,1,2,3,4,5,6], duration: 30, preferredTime: '20:00', status: 'active' },
  { id: 'h4', name: 'Meal Prep', category: 'food-meals', frequency: 'weekly', daysOfWeek: [6], duration: 60, preferredTime: '10:00', status: 'active' },
  { id: 'h5', name: 'Family Game Night', category: 'family', frequency: 'weekly', daysOfWeek: [4], duration: 60, preferredTime: '19:00', status: 'active' },
];

const DEMO_HABIT_LOG = [];
for (let d = 1; d <= 5; d++) {
  const ds = `2026-10-0${d}`;
  DEMO_HABIT_LOG.push({ habitId: 'h1', date: ds, status: 'completed' });
  if (d <= 4) DEMO_HABIT_LOG.push({ habitId: 'h2', date: ds, status: 'completed' });
  DEMO_HABIT_LOG.push({ habitId: 'h3', date: ds, status: d === 3 ? 'skipped' : 'completed' });
}

const DEMO_BRAIN_DUMP = [
  { id: 'bd1', text: 'Research meal prep services', createdAt: '2026-10-05T08:00:00Z' },
  { id: 'bd2', text: 'Call mom about weekend plans', createdAt: '2026-10-05T09:30:00Z' },
  { id: 'bd3', text: 'Look into new gym membership', createdAt: '2026-10-05T10:00:00Z' },
  { id: 'bd4', text: 'Buy birthday gift for Sarah', createdAt: '2026-10-05T11:00:00Z' },
];

const DEMO_BUDGET = [
  { id: 'bi1', description: 'Salary', amount: 5200, type: 'income', category: 'work-money', month: '2026-10' },
  { id: 'bi2', description: 'Freelance', amount: 800, type: 'income', category: 'work-money', month: '2026-10' },
  { id: 'bi3', description: 'Rent', amount: 1500, type: 'expense', category: 'personal-other', month: '2026-10' },
  { id: 'bi4', description: 'Groceries', amount: 400, type: 'expense', category: 'food-meals', month: '2026-10' },
  { id: 'bi5', description: 'Utilities', amount: 150, type: 'expense', category: 'personal-other', month: '2026-10' },
  { id: 'bi6', description: 'Gas', amount: 120, type: 'expense', category: 'personal-other', month: '2026-10' },
];

const DEMO_MEAL_PLAN = {
  monday: { breakfast: 'Oatmeal with berries', lunch: 'Chicken salad wrap', dinner: 'Grilled salmon & veggies', snacks: 'Apple, almonds' },
  tuesday: { breakfast: 'Eggs & toast', lunch: 'Leftover salmon bowl', dinner: 'Pasta primavera', snacks: 'Yogurt, banana' },
  wednesday: { breakfast: 'Smoothie bowl', lunch: 'Turkey sandwich', dinner: 'Chicken stir-fry', snacks: 'Trail mix' },
  thursday: { breakfast: 'Oatmeal with berries', lunch: 'Soup & bread', dinner: 'Tacos', snacks: 'Cheese & crackers' },
  friday: { breakfast: 'Eggs & avocado', lunch: 'Leftover tacos', dinner: 'Pizza night', snacks: 'Fruit salad' },
};

async function seedData(page) {
  await page.evaluate(({ events, goals, habits, habitLog, brainDump, budget, mealPlan }) => {
    localStorage.setItem('chronosEvents', JSON.stringify(events));
    localStorage.setItem('chronosGoals', JSON.stringify(goals));
    localStorage.setItem('chronosHabits', JSON.stringify(habits));
    localStorage.setItem('chronosHabitLog', JSON.stringify(habitLog));
    localStorage.setItem('chronosBrainDump', JSON.stringify(brainDump));
    localStorage.setItem('chronosBudget', JSON.stringify(budget));
    localStorage.setItem('chronosMealPlan', JSON.stringify(mealPlan));
    localStorage.setItem('chronosPreferences', JSON.stringify({
      sleepHours: 8, workHoursTarget: 8, startPage: 'dashboard', onboardingComplete: true
    }));
  }, {
    events: DEMO_EVENTS, goals: DEMO_GOALS, habits: DEMO_HABITS,
    habitLog: DEMO_HABIT_LOG, brainDump: DEMO_BRAIN_DUMP,
    budget: DEMO_BUDGET, mealPlan: DEMO_MEAL_PLAN
  });
  await page.reload();
  await page.waitForTimeout(500);
}

async function capture(page, name, opts = {}) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, ...opts });
  console.log(`  ${name}.png`);
  return p;
}

async function main() {
  console.log('Capturing screenshots from LifeBalance Planner...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`file:///${HTML_PATH.replace(/\\/g, '/')}`);
  await page.waitForTimeout(500);

  // Dismiss welcome if showing
  const welcomeBtn = await page.$('.welcome-start-btn');
  if (welcomeBtn) await welcomeBtn.click();
  await page.waitForTimeout(300);

  await seedData(page);

  // Dashboard
  await page.click('[data-page="dashboard"]');
  await page.waitForTimeout(400);
  await capture(page, '01-dashboard');

  // Calendar week view
  await page.click('[data-page="calendar"]');
  await page.waitForTimeout(400);
  await capture(page, '02-calendar-week');

  // Tasks
  await page.click('[data-page="tasks"]');
  await page.waitForTimeout(300);
  await capture(page, '03-tasks');

  // Habits
  await page.click('[data-page="habits"]');
  await page.waitForTimeout(300);
  await capture(page, '04-habits');

  // Goals
  await page.click('[data-page="goals"]');
  await page.waitForTimeout(300);
  await capture(page, '05-goals');

  // Brain Dump
  await page.click('[data-page="braindump"]');
  await page.waitForTimeout(300);
  await capture(page, '06-braindump');

  // Focus Timer
  await page.click('[data-page="focus"]');
  await page.waitForTimeout(300);
  await capture(page, '07-focus-timer');

  // Budget
  await page.click('[data-page="budget"]');
  await page.waitForTimeout(300);
  await capture(page, '08-budget');

  // Meal Plan
  await page.click('[data-page="mealplan"]');
  await page.waitForTimeout(300);
  await capture(page, '09-mealplan');

  // Journal
  await page.click('[data-page="journal"]');
  await page.waitForTimeout(300);
  await capture(page, '10-journal');

  // Settings
  await page.click('[data-page="settings"]');
  await page.waitForTimeout(300);
  await capture(page, '11-settings');

  // AI Panel
  await page.click('#nav-ai');
  await page.waitForTimeout(400);
  await capture(page, '12-ai-panel');
  await page.click('#ai-panel-close');
  await page.waitForTimeout(200);

  // About
  await page.click('[data-page="about"]');
  await page.waitForTimeout(300);
  await capture(page, '13-about');

  // Dark mode
  await page.click('[data-page="settings"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('dark-mode-toggle').click(); });
  await page.waitForTimeout(300);
  await page.click('[data-page="dashboard"]');
  await page.waitForTimeout(400);
  await capture(page, '14-dashboard-dark');

  // Back to light
  await page.click('[data-page="settings"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => { document.getElementById('dark-mode-toggle').click(); });
  await page.waitForTimeout(200);

  // Export backup screenshot
  await capture(page, '15-settings-backup');

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}`);
}

module.exports = { main, seedData, DEMO_EVENTS, DEMO_GOALS, DEMO_HABITS, DEMO_HABIT_LOG, DEMO_BRAIN_DUMP, DEMO_BUDGET, DEMO_MEAL_PLAN };

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
