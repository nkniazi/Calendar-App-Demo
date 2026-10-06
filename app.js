// ── Edition ──
const LB_EDITION = typeof __LB_EDITION__ !== 'undefined' ? __LB_EDITION__ : 'web';

// ── Constants ──
const STORAGE_KEY = 'chronosEvents';
const GOALS_KEY = 'chronosGoals';
const PREFS_KEY = 'chronosPreferences';
const DATA_VERSION_KEY = 'chronosDataVersion';
const CATEGORIES_KEY = 'chronosCategories';
const HABITS_KEY = 'chronosHabits';
const HABIT_LOG_KEY = 'chronosHabitLog';
const BRAIN_DUMP_KEY = 'chronosBrainDump';
const ENERGY_LOG_KEY = 'chronosEnergyLog';
const BUDGET_KEY = 'chronosBudget';
const MEAL_PLAN_KEY = 'chronosMealPlan';
const JOURNAL_KEY = 'chronosJournal';
const GOAL_HIERARCHY_KEY = 'chronosGoalHierarchy';
const CURRENT_DATA_VERSION = 4;
const MAX_ACTIVE_CATEGORIES = 15;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_MINI = ['M','T','W','T','F','S','S'];
const HOUR_H = 60;
const MAX_MONTH_EVENTS = 3;

const DEFAULT_CATEGORIES = {
  'faith':          { label: 'Faith',                      color: '#8b5cf6', light: 'rgba(139,92,246,0.13)',  dark: '#6d28d9' },
  'sleep':          { label: 'Sleep',                      color: '#64748b', light: 'rgba(100,116,139,0.13)', dark: '#475569' },
  'work-money':     { label: 'Work / Money',               color: '#6366f1', light: 'rgba(99,102,241,0.13)',  dark: '#4338ca' },
  'food-meals':     { label: 'Food / Meals',               color: '#f59e0b', light: 'rgba(245,158,11,0.13)',  dark: '#b45309' },
  'family':         { label: 'Family / Relationships',     color: '#ec4899', light: 'rgba(236,72,153,0.13)',  dark: '#be185d' },
  'entertainment':  { label: 'Entertainment / Recreation', color: '#10b981', light: 'rgba(16,185,129,0.13)',  dark: '#047857' },
  'personal-other': { label: 'Personal / Other',           color: '#06b6d4', light: 'rgba(6,182,212,0.13)',   dark: '#0e7490' },
};
let CATEGORIES = { ...DEFAULT_CATEGORIES };

const CATEGORY_MIGRATION = {
  work: 'work-money',
  personal: 'personal-other',
  health: 'personal-other',
  social: 'family',
  learning: 'work-money',
  general: 'personal-other',
};

// ── State ──
const state = {
  categories: [],
  currentDate: new Date(),
  currentPage: 'dashboard',
  currentView: localStorage.getItem('chronosView') || 'week',
  events: [],
  goals: [],
  preferences: { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' },
  editingEventId: null,
  editingType: 'event',
  activeCategories: new Set(Object.keys(CATEGORIES)),
  sidebarOpen: false,
  miniCalDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedCategory: 'personal-other',
  taskFilter: 'incomplete',
  taskSort: 'date',
  habits: [],
  habitLog: [],
  darkMode: false,
  brainDump: [],
  energyLog: [],
  budgetItems: [],
  mealPlan: {},
  journal: {},
  goalHierarchy: {},
  focusTimer: { running: false, remaining: 0, mode: 'work', workMin: 25, breakMin: 5 },
};

// ── DOM ──
const $ = id => document.getElementById(id);
const viewEl       = $('calendar-view');
const headingEl    = $('date-heading');
const sidebarEl    = $('sidebar');
const overlayEl    = $('sidebar-overlay');
const miniGridEl   = $('mini-cal-grid');
const miniWdEl     = $('mini-cal-weekdays');
const miniLabelEl  = $('mini-month-year');
const calListEl    = $('calendar-list');
const modalEl      = $('modal-overlay');
const modalTitleEl = $('modal-title');
const formEl       = $('event-form');
const fTitle       = $('event-title');
const fDate        = $('event-date');
const fStart       = $('event-start');
const fEnd         = $('event-end');
const fAllDay      = $('event-allday');
const fDesc        = $('event-desc');
const fTimeRow     = $('time-row');
const errTitle     = $('title-error');
const errDate      = $('date-error');
const deleteBtn    = $('delete-btn');
const catPicker    = $('category-picker');

// ── Utilities ──
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function dateStr(d) { return fmtDate(d.getFullYear(), d.getMonth(), d.getDate()); }
function todayStr() { return dateStr(new Date()); }
function timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function getMonday(d) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hr} ${p}` : `${hr}:${pad(m)} ${p}`;
}

function catStyle(cat) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  const archived = state.categories.find(c => c.id === cat && c.status === 'archived');
  if (archived) return { label: archived.label, color: '#94a3b8', light: 'rgba(148,163,184,0.13)', dark: '#64748b' };
  return CATEGORIES['personal-other'] || { label: 'Other', color: '#94a3b8', light: 'rgba(148,163,184,0.13)', dark: '#64748b' };
}

// ── Storage ──
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const version = parseInt(localStorage.getItem(DATA_VERSION_KEY)) || 1;
    const events = JSON.parse(raw).map(e => {
      if (e.time && !e.startTime) {
        e.startTime = e.time;
        const [h] = e.time.split(':').map(Number);
        e.endTime = `${pad(Math.min(h + 1, 23))}:00`;
        delete e.time;
      }
      if (!e.startTime) { e.startTime = '09:00'; e.endTime = '10:00'; }
      if (!e.endTime) { const [h] = e.startTime.split(':').map(Number); e.endTime = `${pad(Math.min(h+1,23))}:00`; }
      if (e.allDay === undefined) e.allDay = false;
      if (!e.type) e.type = 'event';
      if (e.type === 'task' && e.completed === undefined) e.completed = false;
      if (version < 2 && e.category && CATEGORY_MIGRATION[e.category]) {
        e.category = CATEGORY_MIGRATION[e.category];
      }
      if (!e.category || !categoryExists(e.category)) e.category = 'personal-other';
      if (e.recurrence === undefined) e.recurrence = null;
      if (e.seriesId === undefined) e.seriesId = null;
      if (e.isException === undefined) e.isException = false;
      if (!e.excludedDates) e.excludedDates = [];
      if (!e.flexibility) {
        if (e.category === 'sleep') e.flexibility = 'fixed';
        else if (e.category === 'work-money' || e.category === 'faith') e.flexibility = 'protected';
        else e.flexibility = 'flexible';
      }
      return e;
    });
    if (version < CURRENT_DATA_VERSION) {
      localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION));
      localStorage.setItem(STORAGE_KEY + '_v1_backup', raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
    return events;
  } catch { return []; }
}
function saveEvents() {
  safeSave(STORAGE_KEY, state.events);
}

function loadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveGoals() {
  safeSave(GOALS_KEY, state.goals);
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const defaults = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' }; }
}
function savePreferences() {
  safeSave(PREFS_KEY, state.preferences);
}

// ── Categories ──
function seedDefaultCategories() {
  const now = new Date().toISOString();
  let order = 0;
  return Object.entries(DEFAULT_CATEGORIES).map(([id, cat]) => ({
    id, label: cat.label, color: cat.color, light: cat.light, dark: cat.dark,
    type: id === 'sleep' ? 'system' : 'user',
    status: 'active', order: order++, createdAt: now, archivedAt: null,
  }));
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedDefaultCategories();
}

function saveCategories() {
  safeSave(CATEGORIES_KEY, state.categories);
}

function rebuildCategories() {
  CATEGORIES = {};
  state.categories
    .filter(c => c.status === 'active')
    .sort((a, b) => a.order - b.order)
    .forEach(c => {
      CATEGORIES[c.id] = { label: c.label, color: c.color, light: c.light, dark: c.dark };
    });
}

function getAllCategories() {
  return [...state.categories].sort((a, b) => a.order - b.order);
}

function categoryExists(id) {
  return state.categories.some(c => c.id === id);
}

function generateColorVariants(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const light = `rgba(${r},${g},${b},0.13)`;
  const dr = Math.max(0, Math.floor(r * 0.7));
  const dg = Math.max(0, Math.floor(g * 0.7));
  const db = Math.max(0, Math.floor(b * 0.7));
  const dark = `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
  return { light, dark };
}

function toKebabCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueCategoryId(base) {
  let id = toKebabCase(base);
  if (!id) id = 'category';
  let candidate = id, n = 2;
  while (state.categories.some(c => c.id === candidate)) { candidate = `${id}-${n++}`; }
  return candidate;
}

// ── Habits Storage ──
function loadHabits() {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHabits() { safeSave(HABITS_KEY, state.habits); }

function loadHabitLog() {
  try {
    const raw = localStorage.getItem(HABIT_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    const cutoff = dateStr(addDays(new Date(), -365));
    return log.filter(e => e.date >= cutoff);
  } catch { return []; }
}
function saveHabitLog() { safeSave(HABIT_LOG_KEY, state.habitLog); }

function getHabitStreak(habitId) {
  const entries = state.habitLog
    .filter(e => e.habitId === habitId && e.status === 'completed')
    .map(e => e.date)
    .sort()
    .reverse();
  if (!entries.length) return 0;
  let streak = 0;
  let check = todayStr();
  if (entries[0] !== check) {
    const yesterday = dateStr(addDays(new Date(), -1));
    if (entries[0] !== yesterday) return 0;
    check = yesterday;
  }
  for (let i = 0; i < entries.length; i++) {
    if (entries[i] === check) {
      streak++;
      check = dateStr(addDays(new Date(check + 'T00:00:00'), -1));
    } else if (entries[i] < check) {
      break;
    }
  }
  return streak;
}

function getHabitWeeklyCompletion(habitId, weekStart) {
  let completed = 0, expected = 0;
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) return { completed: 0, expected: 0, rate: 0 };
  for (let i = 0; i < 7; i++) {
    const ds = dateStr(addDays(weekStart, i));
    if (isHabitDueOnDate(habit, ds)) {
      expected++;
      if (state.habitLog.some(e => e.habitId === habitId && e.date === ds && e.status === 'completed')) {
        completed++;
      }
    }
  }
  return { completed, expected, rate: expected > 0 ? Math.round(completed / expected * 100) : 0 };
}

function isHabitDueOnDate(habit, ds) {
  if (habit.status !== 'active') return false;
  if (ds < habit.startDate) return false;
  if (habit.endDate && ds > habit.endDate) return false;
  const d = new Date(ds + 'T00:00:00');
  const dayOfWeek = (d.getDay() + 6) % 7;
  const freq = habit.targetFrequency;
  if (freq.type === 'daily') return true;
  if (freq.type === 'weekdays') return dayOfWeek < 5;
  if (freq.type === 'weekly' || freq.type === 'custom') {
    return (freq.daysOfWeek || []).includes(dayOfWeek);
  }
  return false;
}

function getTodayHabits() {
  const ds = todayStr();
  return state.habits.filter(h => isHabitDueOnDate(h, ds));
}

function getHabitLogEntry(habitId, ds) {
  return state.habitLog.find(e => e.habitId === habitId && e.date === ds);
}

function logHabitCompletion(habitId, ds, status, notes) {
  const existing = state.habitLog.findIndex(e => e.habitId === habitId && e.date === ds);
  if (existing !== -1) {
    state.habitLog[existing].status = status;
    if (notes !== undefined) state.habitLog[existing].notes = notes;
  } else {
    state.habitLog.push({ habitId, date: ds, status, notes: notes || '' });
  }
  saveHabitLog();
}

// ── Recurrence Engine ──
function generateOccurrences(event, rangeStart, rangeEnd) {
  if (!event.recurrence) return [];
  const rule = event.recurrence;
  const excluded = new Set(event.excludedDates || []);
  const occurrences = [];
  const startDate = new Date(event.date + 'T00:00:00');
  const endBound = rule.endDate ? new Date(rule.endDate + 'T00:00:00') : new Date(rangeEnd + 'T00:00:00');
  const rangeBound = new Date(rangeEnd + 'T00:00:00');
  const end = endBound < rangeBound ? endBound : rangeBound;
  const rangeStartDate = new Date(rangeStart + 'T00:00:00');
  const interval = rule.interval || 1;
  const MAX_OCC = 366;

  let cursor = new Date(startDate);
  let count = 0;

  while (cursor <= end && count < MAX_OCC) {
    const ds = dateStr(cursor);
    if (ds >= rangeStart && !excluded.has(ds)) {
      const dayOfWeek = (cursor.getDay() + 6) % 7;
      let include = false;

      if (rule.freq === 'daily') {
        const dayDiff = Math.round((cursor - startDate) / 86400000);
        include = dayDiff % interval === 0;
      } else if (rule.freq === 'weekdays') {
        include = dayOfWeek < 5;
      } else if (rule.freq === 'weekly') {
        const dayDiff = Math.round((cursor - startDate) / 86400000);
        const weekDiff = Math.floor(dayDiff / 7);
        if (weekDiff % interval === 0) {
          include = (rule.daysOfWeek || [dayOfWeek]).includes(dayOfWeek);
        }
      } else if (rule.freq === 'monthly') {
        if (cursor.getDate() === startDate.getDate()) {
          const monthDiff = (cursor.getFullYear() - startDate.getFullYear()) * 12 + cursor.getMonth() - startDate.getMonth();
          include = monthDiff >= 0 && monthDiff % interval === 0;
        }
      } else if (rule.freq === 'yearly') {
        if (cursor.getMonth() === startDate.getMonth() && cursor.getDate() === startDate.getDate()) {
          const yearDiff = cursor.getFullYear() - startDate.getFullYear();
          include = yearDiff >= 0 && yearDiff % interval === 0;
        }
      }

      if (include) {
        occurrences.push({
          ...event,
          date: ds,
          _generated: true,
          _parentId: event.id,
        });
        count++;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return occurrences;
}

function getEventsWithRecurrences(rangeStart, rangeEnd) {
  const result = [];
  const exceptionsBySeriesDate = {};

  state.events.forEach(e => {
    if (e.isException && e.seriesId) {
      const key = e.seriesId + ':' + e.date;
      exceptionsBySeriesDate[key] = e;
    }
  });

  state.events.forEach(e => {
    if (e.isException) return;
    if (e.recurrence) {
      const occs = generateOccurrences(e, rangeStart, rangeEnd);
      occs.forEach(occ => {
        const excKey = e.id + ':' + occ.date;
        if (exceptionsBySeriesDate[excKey]) {
          result.push(exceptionsBySeriesDate[excKey]);
        } else {
          result.push(occ);
        }
      });
    } else {
      if (e.date >= rangeStart && e.date <= rangeEnd) {
        result.push(e);
      }
    }
  });
  return result;
}

function editRecurringSingle(parentId, occDate, changes) {
  const parent = state.events.find(e => e.id === parentId);
  if (!parent) return;
  if (!parent.excludedDates) parent.excludedDates = [];
  parent.excludedDates.push(occDate);
  const exception = {
    ...parent,
    ...changes,
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    date: occDate,
    seriesId: parentId,
    isException: true,
    recurrence: null,
    excludedDates: [],
  };
  state.events.push(exception);
  saveEvents();
}

function editRecurringFuture(parentId, fromDate, changes) {
  const parent = state.events.find(e => e.id === parentId);
  if (!parent || !parent.recurrence) return;
  const oldEnd = parent.recurrence.endDate;
  parent.recurrence.endDate = dateStr(addDays(new Date(fromDate + 'T00:00:00'), -1));
  const newSeries = {
    ...parent,
    ...changes,
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    date: fromDate,
    recurrence: { ...parent.recurrence, ...changes.recurrence, endDate: oldEnd },
    seriesId: null,
    isException: false,
    excludedDates: [],
  };
  if (!newSeries.recurrence.endDate) newSeries.recurrence.endDate = oldEnd;
  state.events.push(newSeries);
  saveEvents();
}

function editRecurringAll(parentId, changes) {
  const parent = state.events.find(e => e.id === parentId);
  if (!parent) return;
  Object.assign(parent, changes);
  state.events = state.events.filter(e => !(e.isException && e.seriesId === parentId));
  parent.excludedDates = [];
  saveEvents();
}

function deleteRecurringSingle(parentId, occDate) {
  const parent = state.events.find(e => e.id === parentId);
  if (!parent) return;
  if (!parent.excludedDates) parent.excludedDates = [];
  parent.excludedDates.push(occDate);
  state.events = state.events.filter(e => !(e.isException && e.seriesId === parentId && e.date === occDate));
  saveEvents();
}

function deleteRecurringFuture(parentId, fromDate) {
  const parent = state.events.find(e => e.id === parentId);
  if (!parent || !parent.recurrence) return;
  parent.recurrence.endDate = dateStr(addDays(new Date(fromDate + 'T00:00:00'), -1));
  state.events = state.events.filter(e => !(e.isException && e.seriesId === parentId && e.date >= fromDate));
  saveEvents();
}

function deleteRecurringAll(parentId) {
  state.events = state.events.filter(e => e.id !== parentId && !(e.isException && e.seriesId === parentId));
  saveEvents();
}

// ── Brain Dump ──
function loadBrainDump() { try { return JSON.parse(localStorage.getItem(BRAIN_DUMP_KEY) || '[]'); } catch { return []; } }
function saveBrainDump() { safeSave(BRAIN_DUMP_KEY, state.brainDump); }

function addBrainDumpItem(text) {
  if (!text.trim()) return;
  state.brainDump.push({ id: 'bd_' + Date.now() + '_' + Math.random().toString(36).slice(2,5), text: text.trim(), createdAt: new Date().toISOString() });
  saveBrainDump();
}

function removeBrainDumpItem(id) {
  state.brainDump = state.brainDump.filter(i => i.id !== id);
  saveBrainDump();
}

function brainDumpToTask(item) {
  openModal(todayStr(), null, null, false, 'task');
  setTimeout(() => { if (fTitle) fTitle.value = item.text; }, 50);
  removeBrainDumpItem(item.id);
}

// ── Energy / Mood Log ──
function loadEnergyLog() { try { return JSON.parse(localStorage.getItem(ENERGY_LOG_KEY) || '[]'); } catch { return []; } }
function saveEnergyLog() { safeSave(ENERGY_LOG_KEY, state.energyLog); }

function logEnergy(ds, energy, mood) {
  const existing = state.energyLog.findIndex(e => e.date === ds);
  if (existing !== -1) { state.energyLog[existing] = { date: ds, energy, mood }; }
  else { state.energyLog.push({ date: ds, energy, mood }); }
  saveEnergyLog();
}

function getEnergyForDate(ds) { return state.energyLog.find(e => e.date === ds) || null; }

// ── Simple Budget Tracker ──
function loadBudgetItems() { try { return JSON.parse(localStorage.getItem(BUDGET_KEY) || '[]'); } catch { return []; } }
function saveBudgetItems() { safeSave(BUDGET_KEY, state.budgetItems); }

function addBudgetItem(month, type, description, amount, category) {
  state.budgetItems.push({
    id: 'bgt_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    month, type, description: description.trim(), amount: Math.round(amount * 100) / 100, category: category || 'personal-other',
  });
  saveBudgetItems();
}

function removeBudgetItem(id) { state.budgetItems = state.budgetItems.filter(i => i.id !== id); saveBudgetItems(); }

function getBudgetTotals(month) {
  const items = state.budgetItems.filter(i => i.month === month);
  const income = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const expenses = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  return { income: Math.round(income * 100) / 100, expenses: Math.round(expenses * 100) / 100, balance: Math.round((income - expenses) * 100) / 100, items };
}

// ── Meal Planner ──
function loadMealPlan() { try { return JSON.parse(localStorage.getItem(MEAL_PLAN_KEY) || '{}'); } catch { return {}; } }
function saveMealPlan() { safeSave(MEAL_PLAN_KEY, state.mealPlan); }

function setMeal(weekKey, day, slot, meal, ingredients) {
  if (!state.mealPlan[weekKey]) state.mealPlan[weekKey] = {};
  if (!state.mealPlan[weekKey][day]) state.mealPlan[weekKey][day] = {};
  state.mealPlan[weekKey][day][slot] = { meal: meal.trim(), ingredients: ingredients.trim() };
  saveMealPlan();
}

function getGroceryList(weekKey) {
  const week = state.mealPlan[weekKey];
  if (!week) return [];
  const items = {};
  Object.values(week).forEach(day => {
    Object.values(day).forEach(slot => {
      if (slot.ingredients) {
        slot.ingredients.split(',').forEach(ing => {
          const t = ing.trim().toLowerCase();
          if (t) items[t] = (items[t] || 0) + 1;
        });
      }
    });
  });
  return Object.entries(items).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}

// ── Journal ──
function loadJournal() { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}'); } catch { return {}; } }
function saveJournal() { safeSave(JOURNAL_KEY, state.journal); }

function getJournalEntry(ds) { return state.journal[ds] || { gratitude: ['', '', ''], notes: '' }; }
function setJournalEntry(ds, entry) { state.journal[ds] = entry; saveJournal(); }

// ── Goal Hierarchy ──
function loadGoalHierarchy() { try { return JSON.parse(localStorage.getItem(GOAL_HIERARCHY_KEY) || '{}'); } catch { return {}; } }
function saveGoalHierarchy() { safeSave(GOAL_HIERARCHY_KEY, state.goalHierarchy); }
function updateGoalHierarchy(level, text) { state.goalHierarchy[level] = text; saveGoalHierarchy(); }

// ── Focus Timer Logic ──
let focusTimerInterval = null;

function startFocusTimer() {
  if (state.focusTimer.running) return;
  if (state.focusTimer.remaining <= 0) {
    state.focusTimer.remaining = state.focusTimer.mode === 'work' ? state.focusTimer.workMin * 60 : state.focusTimer.breakMin * 60;
  }
  state.focusTimer.running = true;
  focusTimerInterval = setInterval(() => {
    state.focusTimer.remaining--;
    if (state.focusTimer.remaining <= 0) {
      state.focusTimer.running = false;
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
      playTimerBeep();
      state.focusTimer.mode = state.focusTimer.mode === 'work' ? 'break' : 'work';
      state.focusTimer.remaining = 0;
      if (state.currentPage === 'focus') renderView();
    }
    if (state.currentPage === 'focus') updateTimerDisplay();
  }, 1000);
}

function pauseFocusTimer() {
  state.focusTimer.running = false;
  clearInterval(focusTimerInterval);
  focusTimerInterval = null;
}

function resetFocusTimer() {
  pauseFocusTimer();
  state.focusTimer.remaining = state.focusTimer.mode === 'work' ? state.focusTimer.workMin * 60 : state.focusTimer.breakMin * 60;
}

function updateTimerDisplay() {
  const el = document.getElementById('focus-timer-display');
  if (el) {
    const m = Math.floor(state.focusTimer.remaining / 60);
    const s = state.focusTimer.remaining % 60;
    el.textContent = `${pad(m)}:${pad(s)}`;
  }
}

function playTimerBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; gain.gain.value = 0.3;
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

// ── Subtasks ──
let _subtaskCounter = 0;
function addSubtask(eventId, text) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev) return;
  if (!ev.subtasks) ev.subtasks = [];
  ev.subtasks.push({ id: 'st_' + Date.now() + '_' + (++_subtaskCounter), text: text.trim(), done: false });
  saveEvents();
}

function toggleSubtask(eventId, subtaskId) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev || !ev.subtasks) return;
  const st = ev.subtasks.find(s => s.id === subtaskId);
  if (st) st.done = !st.done;
  saveEvents();
}

function removeSubtask(eventId, subtaskId) {
  const ev = state.events.find(e => e.id === eventId);
  if (!ev || !ev.subtasks) return;
  ev.subtasks = ev.subtasks.filter(s => s.id !== subtaskId);
  saveEvents();
}

function getSubtaskProgress(ev) {
  if (!ev.subtasks || ev.subtasks.length === 0) return null;
  const done = ev.subtasks.filter(s => s.done).length;
  return { done, total: ev.subtasks.length };
}

// ── AI Prompt Builder (Etsy "Copy for AI") ──
function buildAIPrompt(action) {
  const ds = todayStr();
  const budget = calculateDayBudget(ds);
  const weekStart = getMonday(new Date());
  const weekBudget = calculateWeekBudget(weekStart);
  const score = calculateBalanceScore(weekStart);

  let prompt = `I use LifeBalance Planner to manage my time across life categories.\n\n`;
  prompt += `## My Life Categories & Weekly Goals\n`;
  const activeGoals = state.goals.filter(g => g.active);
  if (activeGoals.length) {
    activeGoals.forEach(g => {
      const actual = Math.round((weekBudget.categoryTotals[g.category] || 0) / 60 * 10) / 10;
      prompt += `- ${CATEGORIES[g.category]?.label || g.category}: ${actual}h actual / ${g.targetHoursPerWeek}h goal\n`;
    });
  } else {
    prompt += `(No goals set yet)\n`;
  }
  if (score !== null) prompt += `\nLife Balance Score: ${score}/100\n`;

  prompt += `\n## Today's Schedule (${ds})\n`;
  const dayEvents = getEventsWithRecurrences(ds, ds).filter(e => e.type !== 'task');
  if (dayEvents.length) {
    dayEvents.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
    dayEvents.forEach(e => {
      const time = e.allDay ? 'All day' : `${formatTime12(e.startTime)}-${formatTime12(e.endTime)}`;
      prompt += `- ${time}: ${e.title} [${CATEGORIES[e.category]?.label || e.category}]\n`;
    });
  } else {
    prompt += `No events scheduled.\n`;
  }

  const tasks = state.events.filter(e => e.type === 'task' && !e.completed);
  if (tasks.length) {
    prompt += `\n## Pending Tasks\n`;
    tasks.slice(0, 10).forEach(t => {
      prompt += `- ${t.title} (${t.priority || 'medium'} priority, due ${t.date}) [${CATEGORIES[t.category]?.label || t.category}]\n`;
    });
  }

  const activeHabits = state.habits.filter(h => h.status === 'active');
  if (activeHabits.length) {
    prompt += `\n## Habits\n`;
    activeHabits.forEach(h => {
      const streak = getHabitStreak(h.id);
      const entry = getHabitLogEntry(h.id, ds);
      const status = entry?.status === 'completed' ? 'done today' : 'not done';
      prompt += `- ${h.name}: ${h.targetFrequency.type}, ${h.duration}min, streak ${streak}d, ${status}\n`;
    });
  }

  if (action === 'plan-week') {
    prompt += `\n## Request\nPlease analyze my week and suggest specific schedule improvements to better match my goals. For each suggestion, explain what to change and why.\n`;
  } else if (action === 'fix-habits') {
    prompt += `\n## Request\nLook at my habits and schedule. Where am I struggling? Suggest specific time slots and strategies to build consistency.\n`;
  } else if (action === 'rebalance') {
    prompt += `\n## Request\nMy balance score is ${score !== null ? score : 'unknown'}/100. Which life areas need more time? Suggest specific events to add or rearrange this week.\n`;
  } else {
    const now = new Date();
    prompt += `\n## Request\nIt's ${formatTime12(pad(now.getHours()) + ':' + pad(now.getMinutes()))} right now. What should I do next? Consider my schedule, pending tasks, and incomplete habits.\n`;
  }

  return prompt;
}

function copyAIPrompt(action) {
  const prompt = buildAIPrompt(action);
  navigator.clipboard.writeText(prompt).then(() => {
    showToast('Prompt copied! Paste it into ChatGPT or Claude.', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = prompt; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Prompt copied! Paste it into ChatGPT or Claude.', 'success');
  });
}

// ── Budget & Balance Calculations ──
function calculateDayBudget(ds) {
  const allEvents = getEventsWithRecurrences(ds, ds);
  const dayEvents = allEvents.filter(e => e.date === ds && e.type !== 'task');
  const totals = {};
  for (const key of Object.keys(CATEGORIES)) totals[key] = 0;
  let scheduledMin = 0;
  dayEvents.forEach(e => {
    let dur;
    if (e.allDay) {
      if (e.category === 'sleep') dur = (state.preferences.sleepHours || 7) * 60;
      else if (e.category === 'work-money') dur = (state.preferences.workHoursTarget || 8) * 60;
      else dur = 480;
    } else {
      dur = Math.max(0, timeToMin(e.endTime) - timeToMin(e.startTime));
    }
    totals[e.category] = (totals[e.category] || 0) + dur;
    scheduledMin += dur;
  });
  return { categoryTotals: totals, scheduledMinutes: scheduledMin, freeMinutes: Math.max(0, 1440 - scheduledMin), overbooked: scheduledMin > 1440 };
}

function calculateWeekBudget(weekStartDate) {
  const result = {};
  for (const key of Object.keys(CATEGORIES)) result[key] = 0;
  let totalScheduled = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStartDate, i);
    const budget = calculateDayBudget(dateStr(d));
    for (const key of Object.keys(budget.categoryTotals)) {
      result[key] = (result[key] || 0) + budget.categoryTotals[key];
    }
    totalScheduled += budget.scheduledMinutes;
  }
  return { categoryTotals: result, totalScheduledMinutes: totalScheduled };
}

function calculateBalanceScore(weekStartDate) {
  if (!state.goals.length) return null;
  const weekBudget = calculateWeekBudget(weekStartDate);
  let totalScore = 0, count = 0;
  state.goals.filter(g => g.active).forEach(g => {
    const actualMin = weekBudget.categoryTotals[g.category] || 0;
    const targetMin = g.targetHoursPerWeek * 60;
    if (targetMin > 0) {
      totalScore += Math.min(1, actualMin / targetMin) * 100;
      count++;
    }
  });
  return count > 0 ? Math.round(totalScore / count) : null;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTasksForDate(ds) {
  return state.events.filter(e => e.type === 'task' && e.date === ds);
}

function eventsForDate(ds) {
  const all = getEventsWithRecurrences(ds, ds);
  return all
    .filter(e => e.date === ds && state.activeCategories.has(e.category))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return timeToMin(a.startTime) - timeToMin(b.startTime);
    });
}

// ── Overlap Layout ──
function layoutColumns(events) {
  const timed = events.filter(e => !e.allDay);
  if (!timed.length) return [];
  timed.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime) || timeToMin(b.endTime) - timeToMin(a.endTime));
  const groups = [];
  let g = [timed[0]], gEnd = timeToMin(timed[0].endTime);
  for (let i = 1; i < timed.length; i++) {
    if (timeToMin(timed[i].startTime) < gEnd) {
      g.push(timed[i]);
      gEnd = Math.max(gEnd, timeToMin(timed[i].endTime));
    } else {
      groups.push(g);
      g = [timed[i]];
      gEnd = timeToMin(timed[i].endTime);
    }
  }
  groups.push(g);
  groups.forEach(group => {
    const cols = [];
    group.forEach(ev => {
      let c = 0;
      while (c < cols.length && timeToMin(cols[c].endTime) > timeToMin(ev.startTime)) c++;
      if (c === cols.length) cols.push(null);
      cols[c] = ev;
      ev._col = c;
    });
    group.forEach(ev => { ev._numCols = cols.length; });
  });
  return timed;
}

// ── Mini Calendar ──
function renderMiniCal() {
  const y = state.miniCalDate.getFullYear(), m = state.miniCalDate.getMonth();
  miniLabelEl.textContent = `${MONTHS_SHORT[m]} ${y}`;
  miniWdEl.innerHTML = '';
  DAYS_MINI.forEach(d => {
    const el = document.createElement('div');
    el.className = 'mini-cal-wd';
    el.textContent = d;
    miniWdEl.appendChild(el);
  });
  miniGridEl.innerHTML = '';
  const first = new Date(y, m, 1);
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
  const dim = daysInMonth(y, m);
  const prevDim = daysInMonth(y, m - 1);
  const todayS = todayStr();
  const selS = dateStr(state.currentDate);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDim - i;
    const pm = m - 1 < 0 ? 11 : m - 1;
    const py = m - 1 < 0 ? y - 1 : y;
    addMiniDay(py, pm, d, true, todayS, selS);
  }
  for (let d = 1; d <= dim; d++) addMiniDay(y, m, d, false, todayS, selS);
  const total = miniGridEl.children.length;
  const rem = (Math.ceil(total / 7) * 7) - total;
  for (let d = 1; d <= rem; d++) {
    const nm = m + 1 > 11 ? 0 : m + 1;
    const ny = m + 1 > 11 ? y + 1 : y;
    addMiniDay(ny, nm, d, true, todayS, selS);
  }
}

function addMiniDay(y, m, d, outside, todayS, selS) {
  const ds = fmtDate(y, m, d);
  const el = document.createElement('div');
  el.className = 'mini-cal-day';
  if (outside) el.classList.add('outside');
  if (ds === todayS) el.classList.add('today');
  if (ds === selS && ds !== todayS) el.classList.add('selected');
  if (getEventsWithRecurrences(ds, ds).some(e => e.date === ds)) el.classList.add('has-events');
  el.textContent = d;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `${MONTHS[m]} ${d}`);
  const nav = () => { state.currentDate = new Date(y, m, d); renderAll(); };
  el.addEventListener('click', nav);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(); } });
  miniGridEl.appendChild(el);
}

// ── Calendar List ──
function renderCalList() {
  calListEl.innerHTML = '';
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const el = document.createElement('div');
    const active = state.activeCategories.has(key);
    el.className = 'cal-item' + (active ? ' active' : '');
    el.setAttribute('role', 'checkbox');
    el.setAttribute('aria-checked', String(active));
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${cat.label} calendar`);
    el.innerHTML = `<div class="cal-check" style="border-color:${cat.color};color:${cat.color}"></div><span class="cal-item-label">${esc(cat.label)}</span>`;
    const toggle = () => {
      if (state.activeCategories.has(key)) {
        if (state.activeCategories.size > 1) state.activeCategories.delete(key);
      } else {
        state.activeCategories.add(key);
      }
      renderCalList();
      renderView();
      renderMiniCal();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    calListEl.appendChild(el);
  }
  const manageLink = document.createElement('button');
  manageLink.className = 'cal-manage-link';
  manageLink.textContent = 'Manage Categories';
  manageLink.addEventListener('click', () => switchPage('categories'));
  calListEl.appendChild(manageLink);
}

// ── Date Heading ──
function updateHeading() {
  const d = state.currentDate;
  if (state.currentPage === 'dashboard') { headingEl.textContent = 'Dashboard'; return; }
  if (state.currentPage === 'tasks') { headingEl.textContent = 'Tasks'; return; }
  if (state.currentPage === 'goals') { headingEl.textContent = 'Goals'; return; }
  if (state.currentPage === 'habits') { headingEl.textContent = 'Habits'; return; }
  if (state.currentPage === 'braindump') { headingEl.textContent = 'Brain Dump'; return; }
  if (state.currentPage === 'focus') { headingEl.textContent = 'Focus Timer'; return; }
  if (state.currentPage === 'budget') { headingEl.textContent = 'Budget'; return; }
  if (state.currentPage === 'mealplan') { headingEl.textContent = 'Meal Plan'; return; }
  if (state.currentPage === 'journal') { headingEl.textContent = 'Journal'; return; }
  if (state.currentPage === 'about') { headingEl.textContent = 'About'; return; }
  if (state.currentPage === 'settings') { headingEl.textContent = 'Settings'; return; }
  if (state.currentPage === 'categories') { headingEl.textContent = 'Manage Categories'; return; }
  switch (state.currentView) {
    case 'day':
      headingEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      break;
    case '3day': {
      const end = addDays(d, 2);
      headingEl.textContent = d.getMonth() === end.getMonth()
        ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} – ${end.getDate()}, ${d.getFullYear()}`
        : `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      break;
    }
    case 'week': {
      const ws = getMonday(d), we = addDays(ws, 6);
      headingEl.textContent = ws.getMonth() === we.getMonth()
        ? `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`
        : `${MONTHS_SHORT[ws.getMonth()]} ${ws.getDate()} – ${MONTHS_SHORT[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
      break;
    }
    case 'month':
    case 'agenda':
      headingEl.textContent = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      break;
    case 'year':
      headingEl.textContent = String(d.getFullYear());
      break;
  }
}

// ── Page Router ──
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => {
    const isActive = n.dataset.page === page;
    n.classList.toggle('active', isActive);
  });
  const toolbar = document.querySelector('.toolbar');
  const viewSwitcher = document.getElementById('view-switcher');
  const navArrows = document.querySelector('.nav-arrows');
  const todayBtn = document.getElementById('today-btn');
  if (page === 'calendar') {
    toolbar.style.display = '';
    viewSwitcher.style.display = '';
    navArrows.style.display = '';
    todayBtn.style.display = '';
  } else {
    toolbar.style.display = page === 'dashboard' ? 'none' : '';
    viewSwitcher.style.display = 'none';
    navArrows.style.display = 'none';
    todayBtn.style.display = 'none';
  }
  renderView();
  renderMiniCal();
}

// ── View Router ──
function renderView() {
  viewEl.innerHTML = '';
  switch (state.currentPage) {
    case 'dashboard': renderDashboard(); break;
    case 'tasks': renderTasksView(); break;
    case 'habits': renderHabitsView(); break;
    case 'goals': renderGoalsView(); break;
    case 'braindump': renderBrainDumpView(); break;
    case 'focus': renderFocusView(); break;
    case 'budget': renderBudgetView(); break;
    case 'mealplan': renderMealPlanView(); break;
    case 'journal': renderJournalView(); break;
    case 'about': renderAboutView(); break;
    case 'settings': renderSettingsView(); break;
    case 'categories': renderCategoriesView(); break;
    case 'calendar':
    default:
      switch (state.currentView) {
        case 'day': renderTimeView(1); break;
        case '3day': renderTimeView(3); break;
        case 'week': renderTimeView(7); break;
        case 'month': renderMonthView(); break;
        case 'agenda': renderAgendaView(); break;
        case 'year': renderYearView(); break;
      }
      break;
  }
}

// ── Time View (Day / 3-Day / Week) ──
function renderTimeView(numDays) {
  const startDate = numDays === 7 ? getMonday(state.currentDate) : new Date(state.currentDate);
  const dates = [];
  for (let i = 0; i < numDays; i++) dates.push(addDays(startDate, i));
  const todayS = todayStr();

  const wrap = document.createElement('div');
  wrap.className = 'time-view';

  // Header
  const header = document.createElement('div');
  header.className = 'tv-header';
  header.innerHTML = '<div class="tv-gutter"></div>';
  const hCols = document.createElement('div');
  hCols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const col = document.createElement('div');
    col.className = 'tv-col-header' + (ds === todayS ? ' today' : '');
    col.innerHTML = `<div class="tv-day-name">${DAYS_SHORT[(d.getDay() + 6) % 7]}</div><div class="tv-day-num">${d.getDate()}</div>`;
    hCols.appendChild(col);
  });
  header.appendChild(hCols);
  wrap.appendChild(header);

  // All-day
  const allday = document.createElement('div');
  allday.className = 'tv-allday';
  allday.innerHTML = '<div class="tv-gutter">all-day</div>';
  const adCols = document.createElement('div');
  adCols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const cell = document.createElement('div');
    cell.className = 'tv-allday-cell';
    eventsForDate(ds).filter(e => e.allDay).forEach(e => {
      const chip = document.createElement('div');
      chip.className = 'allday-chip';
      const s = catStyle(e.category);
      chip.style.background = s.light;
      chip.style.color = s.dark;
      chip.textContent = e.title;
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', `${e.title}, all day, ${CATEGORIES[e.category]?.label || 'Work'}`);
      chip.addEventListener('click', ev => { ev.stopPropagation(); openModal(ds, e.id); });
      chip.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); openModal(ds, e.id); } });
      cell.appendChild(chip);
    });
    cell.addEventListener('click', () => openModal(ds, null, null, true));
    adCols.appendChild(cell);
  });
  allday.appendChild(adCols);
  wrap.appendChild(allday);

  // Scrollable body
  const scroll = document.createElement('div');
  scroll.className = 'tv-scroll';
  const body = document.createElement('div');
  body.className = 'tv-body';

  // Gutter
  const gutter = document.createElement('div');
  gutter.className = 'tv-gutter';
  for (let h = 0; h < 24; h++) {
    const lbl = document.createElement('div');
    lbl.className = 'tv-time-label';
    lbl.style.top = (h * HOUR_H) + 'px';
    lbl.textContent = formatHour(h);
    gutter.appendChild(lbl);
  }
  body.appendChild(gutter);

  // Day columns
  const cols = document.createElement('div');
  cols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const col = document.createElement('div');
    col.className = 'tv-day-col' + (ds === todayS ? ' today-col' : '');
    for (let h = 0; h < 24; h++) {
      const slot = document.createElement('div');
      slot.className = 'tv-hour-slot';
      col.appendChild(slot);
    }
    col.addEventListener('click', e => {
      if (e.target.closest('.event-block')) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top + scroll.scrollTop;
      const totalMin = Math.round((y / HOUR_H) * 60 / 15) * 15;
      const h = Math.min(23, Math.floor(totalMin / 60));
      const m = totalMin % 60;
      openModal(ds, null, `${pad(h)}:${pad(m)}`);
    });

    // Render events
    const timedEvents = eventsForDate(ds).filter(e => !e.allDay);
    layoutColumns(timedEvents);
    timedEvents.forEach(ev => {
      const s = catStyle(ev.category);
      const startMin = timeToMin(ev.startTime);
      const endMin = timeToMin(ev.endTime);
      const top = (startMin / 60) * HOUR_H;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_H, HOUR_H / 3);
      const numCols = ev._numCols || 1;
      const c = ev._col || 0;
      const block = document.createElement('div');
      block.className = 'event-block';
      block.style.cssText = `top:${top}px;height:${height}px;left:calc(${c}/${numCols}*100% + 3px);width:calc(${1/numCols}*100% - 6px);background:${s.light};border-left-color:${s.color};color:${s.dark}`;
      block.setAttribute('role', 'button');
      block.setAttribute('tabindex', '0');
      block.setAttribute('aria-label', `${ev.title}, ${formatTime12(ev.startTime)} to ${formatTime12(ev.endTime)}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
      block.innerHTML = `<div class="eb-title">${esc(ev.title)}</div><div class="eb-time">${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}</div>`;
      block.addEventListener('click', e => { e.stopPropagation(); openModal(ds, ev.id); });
      block.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openModal(ds, ev.id); } });
      col.appendChild(block);
    });
    cols.appendChild(col);
  });

  // Hour lines
  for (let h = 1; h < 24; h++) {
    const line = document.createElement('div');
    line.className = 'tv-hour-line';
    line.style.top = (h * HOUR_H) + 'px';
    cols.appendChild(line);
  }

  body.appendChild(cols);

  // Now indicator
  const nowDate = new Date();
  const nowDs = dateStr(nowDate);
  if (dates.some(d => dateStr(d) === nowDs)) {
    const mins = nowDate.getHours() * 60 + nowDate.getMinutes();
    const top = (mins / 60) * HOUR_H;
    const indicator = document.createElement('div');
    indicator.className = 'now-indicator';
    indicator.id = 'now-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.top = top + 'px';
    indicator.innerHTML = '<div class="now-dot"></div><div class="now-line"></div>';
    body.appendChild(indicator);
  }

  scroll.appendChild(body);
  wrap.appendChild(scroll);
  viewEl.appendChild(wrap);

  // Scroll to current time or 8 AM
  requestAnimationFrame(() => {
    const target = dates.some(d => dateStr(d) === nowDs)
      ? Math.max(0, (nowDate.getHours() - 1) * HOUR_H)
      : 8 * HOUR_H;
    scroll.scrollTop = target;
  });
}

// ── Month View ──
function renderMonthView() {
  const y = state.currentDate.getFullYear(), m = state.currentDate.getMonth();
  const wrap = document.createElement('div');
  wrap.className = 'month-view';

  const wdRow = document.createElement('div');
  wdRow.className = 'mv-weekdays';
  DAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'mv-wd';
    el.textContent = d;
    wdRow.appendChild(el);
  });
  wrap.appendChild(wdRow);

  const grid = document.createElement('div');
  grid.className = 'mv-grid';
  const first = new Date(y, m, 1);
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
  const dim = daysInMonth(y, m);
  const prevDim = daysInMonth(y, m - 1);
  const todayS = todayStr();
  const totalCells = Math.ceil((startDay + dim) / 7) * 7;
  grid.style.gridTemplateRows = `repeat(${totalCells / 7}, 1fr)`;

  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDim - i;
    const pm = m - 1 < 0 ? 11 : m - 1, py = m - 1 < 0 ? y - 1 : y;
    addMonthCell(grid, py, pm, d, true, todayS);
  }
  for (let d = 1; d <= dim; d++) addMonthCell(grid, y, m, d, false, todayS);
  const rem = totalCells - grid.children.length;
  for (let d = 1; d <= rem; d++) {
    const nm = m + 1 > 11 ? 0 : m + 1, ny = m + 1 > 11 ? y + 1 : y;
    addMonthCell(grid, ny, nm, d, true, todayS);
  }
  wrap.appendChild(grid);
  viewEl.appendChild(wrap);
}

function addMonthCell(grid, y, m, d, outside, todayS) {
  const ds = fmtDate(y, m, d);
  const cell = document.createElement('div');
  cell.className = 'mv-cell' + (outside ? ' outside' : '') + (ds === todayS ? ' today' : '');
  const num = document.createElement('div');
  num.className = 'mv-day-num';
  num.textContent = d;
  cell.appendChild(num);

  const events = eventsForDate(ds);
  events.slice(0, MAX_MONTH_EVENTS).forEach(ev => {
    const s = catStyle(ev.category);
    const pill = document.createElement('div');
    pill.className = 'mv-event';
    pill.style.cssText = `background:${s.light};color:${s.dark};border-left-color:${s.color}`;
    pill.textContent = ev.allDay ? ev.title : `${formatTime12(ev.startTime)} ${ev.title}`;
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('aria-label', `${ev.title}${ev.allDay ? ', all day' : `, ${formatTime12(ev.startTime)}`}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
    pill.addEventListener('click', e => { e.stopPropagation(); openModal(ds, ev.id); });
    pill.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openModal(ds, ev.id); } });
    cell.appendChild(pill);
  });
  if (events.length > MAX_MONTH_EVENTS) {
    const more = document.createElement('div');
    more.className = 'mv-more';
    more.textContent = `+${events.length - MAX_MONTH_EVENTS} more`;
    cell.appendChild(more);
  }
  cell.addEventListener('click', () => openModal(ds));
  grid.appendChild(cell);
}

// ── Agenda View ──
function renderAgendaView() {
  const wrap = document.createElement('div');
  wrap.className = 'agenda-view';
  const todayS = todayStr();
  let found = false;
  for (let i = 0; i < 60; i++) {
    const d = addDays(state.currentDate, i);
    const ds = dateStr(d);
    const events = eventsForDate(ds);
    if (!events.length) continue;
    found = true;
    const section = document.createElement('div');
    section.className = 'agenda-day';
    const isToday = ds === todayS;
    const label = isToday ? 'Today' : ds === dateStr(addDays(new Date(), 1)) ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateEl = document.createElement('div');
    dateEl.className = 'agenda-date' + (isToday ? ' today-label' : '');
    dateEl.textContent = label;
    section.appendChild(dateEl);

    events.forEach(ev => {
      const s = catStyle(ev.category);
      const row = document.createElement('div');
      row.className = 'agenda-event';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `${ev.title}, ${ev.allDay ? 'all day' : `${formatTime12(ev.startTime)} to ${formatTime12(ev.endTime)}`}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
      row.innerHTML = `
        <div class="agenda-time">${ev.allDay ? 'All day' : `${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}`}</div>
        <div class="agenda-dot" style="background:${s.color}"></div>
        <div class="agenda-info">
          <div class="agenda-title">${esc(ev.title)}</div>
          ${ev.description ? `<div class="agenda-desc">${esc(ev.description)}</div>` : ''}
        </div>`;
      row.addEventListener('click', () => openModal(ds, ev.id));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(ds, ev.id); } });
      section.appendChild(row);
    });
    wrap.appendChild(section);
  }
  if (!found) {
    wrap.innerHTML = '<div class="agenda-empty">No upcoming events in the next 60 days</div>';
  }
  viewEl.appendChild(wrap);
}

// ── Year View ──
function renderYearView() {
  const year = state.currentDate.getFullYear();
  const wrap = document.createElement('div');
  wrap.className = 'year-view';
  const todayS = todayStr();

  for (let m = 0; m < 12; m++) {
    const card = document.createElement('div');
    const today = new Date();
    card.className = 'yv-month' + (m === today.getMonth() && year === today.getFullYear() ? ' current' : '');
    card.innerHTML = `<div class="yv-month-name">${MONTHS[m]}</div>`;
    const grid = document.createElement('div');
    grid.className = 'yv-grid';
    DAYS_MINI.forEach(d => {
      const wd = document.createElement('div');
      wd.className = 'yv-wd';
      wd.textContent = d;
      grid.appendChild(wd);
    });
    const first = new Date(year, m, 1);
    let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
    const dim = daysInMonth(year, m);
    for (let i = 0; i < startDay; i++) {
      const el = document.createElement('div');
      el.className = 'yv-day outside';
      grid.appendChild(el);
    }
    for (let d = 1; d <= dim; d++) {
      const ds = fmtDate(year, m, d);
      const el = document.createElement('div');
      el.className = 'yv-day' + (ds === todayS ? ' today' : '') + (getEventsWithRecurrences(ds, ds).some(e => e.date === ds) ? ' has-events' : '');
      el.textContent = d;
      grid.appendChild(el);
    }
    card.appendChild(grid);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${MONTHS[m]} ${year}`);
    const navToMonth = () => { state.currentDate = new Date(year, m, 1); switchView('month'); };
    card.addEventListener('click', navToMonth);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navToMonth(); } });
    wrap.appendChild(card);
  }
  viewEl.appendChild(wrap);
}

// ── Dashboard View ──
function renderDashboard() {
  const todayS = todayStr();
  const budget = calculateDayBudget(todayS);
  const todayEvents = eventsForDate(todayS);
  const incompleteTasks = state.events.filter(e => e.type === 'task' && !e.completed);
  const nowDate = new Date();
  const hour = nowDate.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const nextEvent = todayEvents.filter(e => !e.allDay && e.type !== 'task' && timeToMin(e.startTime) > nowDate.getHours() * 60 + nowDate.getMinutes())[0];

  const weekStart = getMonday(state.currentDate);
  const balanceScore = calculateBalanceScore(weekStart);

  const wrap = document.createElement('div');
  wrap.className = 'dashboard-view';

  // Header
  wrap.innerHTML = `
    <div class="dash-header">
      <div>
        <h1 class="dash-greeting">${greeting}</h1>
        <p class="dash-date">${nowDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <div class="dash-ai-buttons">
        <button class="dash-ai-btn" onclick="handleWhatNow()">What Now?</button>
        <button class="dash-ai-btn dash-ai-btn-secondary" onclick="handlePlanDay()">Plan My Day</button>
      </div>
    </div>
    <div class="dash-grid">
      <div class="dash-card dash-summary">
        <h3 class="dash-card-title">Today's Overview</h3>
        <div class="dash-stats">
          <div class="dash-stat">
            <span class="dash-stat-value">${formatMinutes(budget.scheduledMinutes)}</span>
            <span class="dash-stat-label">Scheduled</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${formatMinutes(budget.freeMinutes)}</span>
            <span class="dash-stat-label">Free</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${todayEvents.filter(e => e.type !== 'task').length}</span>
            <span class="dash-stat-label">Events</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${incompleteTasks.length}</span>
            <span class="dash-stat-label">Tasks</span>
          </div>
        </div>
        ${budget.overbooked ? '<div class="dash-overbooked">⚠ Overbooked! Scheduled time exceeds 24 hours.</div>' : ''}
        ${nextEvent ? `<div class="dash-next">Next: <strong>${esc(nextEvent.title)}</strong> at ${formatTime12(nextEvent.startTime)}</div>` : '<div class="dash-next dash-next-free">No more events today</div>'}
      </div>

      <div class="dash-card dash-budget">
        <h3 class="dash-card-title">24-Hour Budget</h3>
        <div class="dash-budget-ring" id="budget-ring"></div>
      </div>

      ${balanceScore !== null ? `
      <div class="dash-card dash-balance">
        <h3 class="dash-card-title">Life Balance Score</h3>
        <div class="dash-score ${balanceScore >= 75 ? 'score-good' : balanceScore >= 50 ? 'score-ok' : 'score-low'}">
          <span class="dash-score-num">${balanceScore}</span>
          <span class="dash-score-max">/ 100</span>
        </div>
        <p class="dash-score-msg">${balanceScore >= 75 ? 'Great balance!' : balanceScore >= 50 ? 'Some areas need attention' : 'Review your schedule'}</p>
        <p class="dash-score-explain">Measures how closely your scheduled time matches your weekly goals across all life categories.</p>
        <button class="btn btn-ghost btn-sm" onclick="switchPage('goals')">View Goals</button>
      </div>` : `
      <div class="dash-card dash-balance">
        <h3 class="dash-card-title">Life Balance Score</h3>
        <p class="dash-score-msg" style="margin:16px 0">Set weekly hour goals for each life area to track how well your schedule matches your priorities.</p>
        <button class="btn btn-ghost btn-sm" onclick="switchPage('goals')">Set Goals</button>
      </div>`}

      <div class="dash-card dash-categories">
        <h3 class="dash-card-title">Time by Category</h3>
        <div class="dash-cat-bars">
          ${Object.entries(CATEGORIES).map(([key, cat]) => {
            const min = budget.categoryTotals[key] || 0;
            const pct = Math.min(100, (min / 1440) * 100);
            return `<div class="dash-cat-row">
              <span class="dash-cat-dot" style="background:${cat.color}"></span>
              <span class="dash-cat-label">${esc(cat.label)}</span>
              <div class="dash-cat-bar-track"><div class="dash-cat-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
              <span class="dash-cat-time">${min > 0 ? formatMinutes(min) : '—'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      ${(() => {
        const todayHabs = getTodayHabits();
        if (!todayHabs.length) return '';
        const ds = todayStr();
        return `<div class="dash-card dash-habits-card">
          <h3 class="dash-card-title">Today's Habits <span class="dash-tasks-count">${todayHabs.filter(h => !getHabitLogEntry(h.id, ds) || getHabitLogEntry(h.id, ds).status === 'pending').length} remaining</span></h3>
          <div class="habits-today-list">
          ${todayHabs.map(h => {
            const entry = getHabitLogEntry(h.id, ds);
            const st = entry?.status || 'pending';
            const cat = catStyle(h.category);
            return `<div class="habit-today-row ${st !== 'pending' ? 'habit-done' : ''}">
              <button class="habit-check-btn ${st === 'completed' ? 'checked' : ''}" onclick="quickLogHabit('${h.id}','${ds}','completed')">
                ${st === 'completed' ? '✓' : '○'}
              </button>
              <span class="habit-today-name">${esc(h.name)}</span>
              <span class="task-cat-dot" style="background:${cat.color}"></span>
            </div>`;
          }).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="switchPage('habits')">View All Habits</button>
        </div>`;
      })()}

      <div class="dash-card dash-tasks-card">
        <h3 class="dash-card-title">Tasks <span class="dash-tasks-count">${incompleteTasks.length} pending</span></h3>
        <div class="dash-tasks-list">
          ${incompleteTasks.slice(0, 5).map(t => `
            <div class="dash-task-item" data-id="${t.id}">
              <label class="dash-task-check">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')">
                <span class="dash-task-checkmark"></span>
              </label>
              <span class="dash-task-title">${esc(t.title)}</span>
              <span class="dash-cat-dot" style="background:${catStyle(t.category).color}" title="${esc(CATEGORIES[t.category]?.label || '')}"></span>
            </div>
          `).join('')}
          ${incompleteTasks.length === 0 ? '<p class="dash-empty">No pending tasks</p>' : ''}
          ${incompleteTasks.length > 5 ? `<p class="dash-more" onclick="switchPage('tasks')">+${incompleteTasks.length - 5} more tasks</p>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="openTaskModal()">+ Add Task</button>
      </div>

      <div class="dash-card dash-week-chart">
        <h3 class="dash-card-title">This Week</h3>
        <div class="dash-week-bars" id="week-chart"></div>
      </div>
    </div>
  `;

  viewEl.appendChild(wrap);
  renderBudgetRing(budget);
  renderWeekChart();
}

function renderBudgetRing(budget) {
  const el = document.getElementById('budget-ring');
  if (!el) return;
  const size = 180, stroke = 20, radius = (size - stroke) / 2, circ = 2 * Math.PI * radius;
  let segments = '';
  let offset = 0;
  const entries = Object.entries(budget.categoryTotals).filter(([, v]) => v > 0);
  const total = Math.max(budget.scheduledMinutes, 1);

  const totalForRing = Math.max(budget.scheduledMinutes, 1440);
  entries.forEach(([key]) => {
    const min = budget.categoryTotals[key];
    const pct = min / totalForRing;
    const len = pct * circ;
    const cat = CATEGORIES[key];
    segments += `<circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${cat.color}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" />`;
    offset += len;
  });

  const freePct = budget.freeMinutes / 1440;
  if (freePct > 0 && !budget.overbooked) {
    const len = freePct * circ;
    segments += `<circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" />`;
  }

  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" />
      ${segments}
    </svg>
    <div class="budget-ring-center ${budget.overbooked ? 'overbooked' : ''}">
      <span class="budget-ring-value">${budget.overbooked ? '+' + formatMinutes(budget.scheduledMinutes - 1440) : formatMinutes(budget.freeMinutes)}</span>
      <span class="budget-ring-label">${budget.overbooked ? 'OVER' : 'free'}</span>
    </div>
  `;
}

function renderWeekChart() {
  const el = document.getElementById('week-chart');
  if (!el) return;
  const weekStart = getMonday(state.currentDate);
  const todayS = todayStr();
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const ds = dateStr(d);
    const budget = calculateDayBudget(ds);
    const pct = Math.min(100, (budget.scheduledMinutes / 1440) * 100);
    const isToday = ds === todayS;
    html += `<div class="week-bar-col ${isToday ? 'today-col' : ''}">
      <div class="week-bar-track"><div class="week-bar-fill ${budget.overbooked ? 'overbooked' : ''}" style="height:${pct}%"></div></div>
      <span class="week-bar-label">${DAYS_MINI[i]}</span>
      <span class="week-bar-hours">${formatMinutes(budget.scheduledMinutes)}</span>
    </div>`;
  }
  el.innerHTML = html;
}

function toggleTask(id) {
  const task = state.events.find(e => e.id === id);
  if (task) {
    task.completed = !task.completed;
    saveEvents();
    renderView();
  }
}

function openTaskModal() {
  openModal(dateStr(state.currentDate), null, null, false, 'task');
}

// ── Tasks View ──
function renderTasksView() {
  const wrap = document.createElement('div');
  wrap.className = 'tasks-view';

  let tasks = state.events.filter(e => e.type === 'task');
  if (state.taskFilter === 'incomplete') tasks = tasks.filter(t => !t.completed);
  else if (state.taskFilter === 'completed') tasks = tasks.filter(t => t.completed);

  if (state.taskSort === 'date') tasks.sort((a, b) => a.date.localeCompare(b.date));
  else if (state.taskSort === 'priority') {
    const p = { high: 0, medium: 1, low: 2, undefined: 3 };
    tasks.sort((a, b) => (p[a.priority] ?? 3) - (p[b.priority] ?? 3));
  }

  wrap.innerHTML = `
    <div class="tasks-header">
      <h2 class="tasks-title">Tasks</h2>
      <button class="btn btn-primary btn-sm" onclick="openTaskModal()">+ New Task</button>
    </div>
    <div class="tasks-toolbar">
      <div class="tasks-filters">
        <button class="task-filter-btn ${state.taskFilter === 'all' ? 'active' : ''}" onclick="setTaskFilter('all')">All</button>
        <button class="task-filter-btn ${state.taskFilter === 'incomplete' ? 'active' : ''}" onclick="setTaskFilter('incomplete')">To Do</button>
        <button class="task-filter-btn ${state.taskFilter === 'completed' ? 'active' : ''}" onclick="setTaskFilter('completed')">Done</button>
      </div>
      <div class="tasks-sort">
        <select onchange="setTaskSort(this.value)">
          <option value="date" ${state.taskSort === 'date' ? 'selected' : ''}>Sort by Date</option>
          <option value="priority" ${state.taskSort === 'priority' ? 'selected' : ''}>Sort by Priority</option>
        </select>
      </div>
    </div>
    <div class="tasks-list">
      ${tasks.length === 0 ? '<div class="tasks-empty">No tasks found</div>' : ''}
      ${tasks.map(t => {
        const cat = catStyle(t.category);
        const prioClass = t.priority === 'high' ? 'prio-high' : t.priority === 'medium' ? 'prio-med' : 'prio-low';
        const stProg = getSubtaskProgress(t.id);
        return `<div class="task-row ${t.completed ? 'completed' : ''}">
          <label class="task-check-label">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')">
            <span class="task-checkmark"></span>
          </label>
          <div class="task-info" onclick="openModal('${t.date}', '${t.id}')">
            <span class="task-title">${esc(t.title)}</span>
            <span class="task-meta">
              <span class="task-cat-dot" style="background:${cat.color}"></span>
              ${t.date}
              ${t.priority ? `<span class="task-prio ${prioClass}">${t.priority}</span>` : ''}
              ${stProg ? `<span class="subtask-badge">${stProg.done}/${stProg.total}</span>` : ''}
            </span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
  viewEl.appendChild(wrap);
}

function setTaskFilter(f) { state.taskFilter = f; renderView(); }
function setTaskSort(s) { state.taskSort = s; renderView(); }

// ── Goals View ──
function renderGoalsView() {
  const wrap = document.createElement('div');
  wrap.className = 'goals-view';

  const weekStart = getMonday(state.currentDate);
  const weekBudget = calculateWeekBudget(weekStart);
  const score = calculateBalanceScore(weekStart);

  wrap.innerHTML = `
    <div class="goals-header">
      <h2 class="goals-title">Weekly Goals</h2>
      ${score !== null ? `<div class="goals-score ${score >= 75 ? 'score-good' : score >= 50 ? 'score-ok' : 'score-low'}">Score: ${score}/100</div>` : ''}
    </div>
    <p class="goals-desc">Set target hours per week for each life category. Your balance score measures how well your schedule matches these goals.</p>
    <div class="goals-list">
      ${Object.entries(CATEGORIES).map(([key, cat]) => {
        const goal = state.goals.find(g => g.category === key);
        const target = goal ? goal.targetHoursPerWeek : 0;
        const actualMin = weekBudget.categoryTotals[key] || 0;
        const actualH = Math.round(actualMin / 6) / 10;
        const pct = target > 0 ? Math.min(100, (actualMin / (target * 60)) * 100) : 0;
        return `<div class="goal-row">
          <div class="goal-cat">
            <span class="goal-dot" style="background:${cat.color}"></span>
            <span class="goal-label">${esc(cat.label)}</span>
          </div>
          <div class="goal-progress">
            <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
            <span class="goal-actual">${actualH}h / ${target}h</span>
          </div>
          <div class="goal-input-wrap">
            <input type="number" class="goal-input" min="0" max="168" step="0.5" value="${target}" data-cat="${key}" onchange="updateGoal('${key}', this.value)" placeholder="0">
            <span class="goal-unit">h/wk</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <h3 class="goals-subtitle">Big Picture Goals</h3>
    <p class="goals-desc">Write your top goals at each level. Monthly goals should support quarterly, which support yearly.</p>
    <div class="goal-hierarchy">
      <div class="goal-tier">
        <label class="goal-tier-label">Yearly Goals</label>
        <textarea class="goal-tier-input" placeholder="What do you want to accomplish this year?" onchange="updateGoalHierarchy('yearly',this.value)">${esc(state.goalHierarchy.yearly || '')}</textarea>
      </div>
      <div class="goal-tier">
        <label class="goal-tier-label">This Quarter</label>
        <textarea class="goal-tier-input" placeholder="Top 3 priorities this quarter..." onchange="updateGoalHierarchy('quarterly',this.value)">${esc(state.goalHierarchy.quarterly || '')}</textarea>
      </div>
      <div class="goal-tier">
        <label class="goal-tier-label">This Month</label>
        <textarea class="goal-tier-input" placeholder="Key actions for this month..." onchange="updateGoalHierarchy('monthly',this.value)">${esc(state.goalHierarchy.monthly || '')}</textarea>
      </div>
    </div>
  `;
  viewEl.appendChild(wrap);
}

function updateGoal(category, hours) {
  const h = parseFloat(hours) || 0;
  let goal = state.goals.find(g => g.category === category);
  if (goal) {
    goal.targetHoursPerWeek = h;
  } else {
    state.goals.push({
      id: 'goal_' + Date.now(),
      title: CATEGORIES[category]?.label || category,
      category,
      targetHoursPerWeek: h,
      description: '',
      active: true,
    });
  }
  saveGoals();
  renderView();
}

// ── Categories View ──
const COLOR_PRESETS = ['#8b5cf6','#6366f1','#3b82f6','#06b6d4','#10b981','#22c55e','#f59e0b','#f97316','#ef4444','#ec4899','#d946ef','#64748b','#78716c','#0ea5e9','#14b8a6','#a855f7'];

function renderCategoriesView() {
  const active = getAllCategories().filter(c => c.status === 'active');
  const archived = getAllCategories().filter(c => c.status === 'archived');
  const wrap = document.createElement('div');
  wrap.className = 'categories-view';

  let html = `
    <div class="cat-mgmt-header">
      <h2 class="cat-mgmt-title">Categories</h2>
      <button class="btn btn-primary btn-sm" id="cat-add-btn" ${active.length >= MAX_ACTIVE_CATEGORIES ? 'disabled title="Maximum ' + MAX_ACTIVE_CATEGORIES + ' categories"' : ''}>+ Add Category</button>
    </div>
    <p class="cat-mgmt-desc">Customize your life categories. Drag order, rename, or archive categories you no longer need.</p>
    <div class="cat-mgmt-list" id="cat-mgmt-list">`;

  active.forEach((c, i) => {
    html += `<div class="cat-mgmt-row" data-id="${c.id}">
      <div class="cat-mgmt-reorder">
        <button class="cat-reorder-btn" onclick="moveCategoryUp('${c.id}')" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&#9650;</button>
        <button class="cat-reorder-btn" onclick="moveCategoryDown('${c.id}')" ${i === active.length - 1 ? 'disabled' : ''} aria-label="Move down">&#9660;</button>
      </div>
      <span class="cat-mgmt-dot" style="background:${c.color}"></span>
      <span class="cat-mgmt-label">${esc(c.label)}</span>
      ${c.type === 'system' ? '<span class="cat-mgmt-badge">System</span>' : ''}
      <div class="cat-mgmt-actions">
        <button class="btn btn-ghost btn-xs" onclick="openCategoryEditor('${c.id}')">Edit</button>
        ${c.type !== 'system' ? `<button class="btn btn-ghost btn-xs cat-archive-btn" onclick="archiveCategory('${c.id}')">Archive</button>` : ''}
      </div>
    </div>`;
  });

  html += `</div>`;

  if (archived.length > 0) {
    html += `
    <div class="cat-mgmt-archived">
      <button class="cat-archived-toggle" id="cat-archived-toggle" onclick="document.getElementById('cat-archived-list').classList.toggle('hidden');this.classList.toggle('expanded')">
        Archived (${archived.length})
      </button>
      <div class="cat-archived-list hidden" id="cat-archived-list">`;
    archived.forEach(c => {
      html += `<div class="cat-mgmt-row archived">
        <span class="cat-mgmt-dot" style="background:#94a3b8"></span>
        <span class="cat-mgmt-label">${esc(c.label)}</span>
        <div class="cat-mgmt-actions">
          <button class="btn btn-ghost btn-xs" onclick="restoreCategory('${c.id}')" ${active.length >= MAX_ACTIVE_CATEGORIES ? 'disabled title="Max categories reached"' : ''}>Restore</button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="cat-editor-area hidden" id="cat-editor-area"></div>`;

  wrap.innerHTML = html;
  viewEl.appendChild(wrap);

  document.getElementById('cat-add-btn').addEventListener('click', () => openCategoryEditor(null));
}

function openCategoryEditor(editId) {
  const area = document.getElementById('cat-editor-area');
  if (!area) return;
  const existing = editId ? state.categories.find(c => c.id === editId) : null;
  const title = existing ? 'Edit Category' : 'Add Category';
  const name = existing ? existing.label : '';
  const color = existing ? existing.color : COLOR_PRESETS.find(c => !state.categories.some(cat => cat.color === c)) || COLOR_PRESETS[0];

  area.classList.remove('hidden');
  area.innerHTML = `
    <div class="cat-editor">
      <h3 class="cat-editor-title">${title}</h3>
      <div class="form-group">
        <label for="cat-edit-name">Name</label>
        <input type="text" id="cat-edit-name" value="${esc(name)}" maxlength="40" placeholder="e.g. Learning">
        <span class="error-msg" id="cat-name-error"></span>
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="cat-color-grid" id="cat-color-grid">
          ${COLOR_PRESETS.map(c => `<button type="button" class="cat-color-swatch ${c === color ? 'selected' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}
        </div>
        <div class="cat-color-custom">
          <label for="cat-edit-hex">Custom:</label>
          <input type="text" id="cat-edit-hex" value="${color}" maxlength="7" placeholder="#hex" class="cat-hex-input">
        </div>
      </div>
      <div class="cat-editor-footer">
        <button class="btn btn-ghost" onclick="closeCategoryEditor()">Cancel</button>
        <button class="btn btn-primary" id="cat-save-btn">Save</button>
      </div>
    </div>
  `;

  let selectedColor = color;
  area.querySelectorAll('.cat-color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      area.querySelectorAll('.cat-color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = sw.dataset.color;
      document.getElementById('cat-edit-hex').value = selectedColor;
    });
  });
  document.getElementById('cat-edit-hex').addEventListener('input', (e) => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      selectedColor = v;
      area.querySelectorAll('.cat-color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === v));
    }
  });
  document.getElementById('cat-save-btn').addEventListener('click', () => {
    const nameVal = document.getElementById('cat-edit-name').value.trim();
    const err = document.getElementById('cat-name-error');
    if (!nameVal) { err.textContent = 'Name is required'; return; }
    if (state.categories.some(c => c.label.toLowerCase() === nameVal.toLowerCase() && c.id !== editId && c.status === 'active')) {
      err.textContent = 'A category with that name already exists'; return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(selectedColor)) { err.textContent = 'Invalid hex color'; return; }
    saveCategory(editId, nameVal, selectedColor);
  });
  document.getElementById('cat-edit-name').focus();
}

function closeCategoryEditor() {
  const area = document.getElementById('cat-editor-area');
  if (area) area.classList.add('hidden');
}

function saveCategory(editId, label, color) {
  const variants = generateColorVariants(color);
  if (editId) {
    const cat = state.categories.find(c => c.id === editId);
    if (cat) {
      cat.label = label;
      cat.color = color;
      cat.light = variants.light;
      cat.dark = variants.dark;
    }
  } else {
    const id = uniqueCategoryId(label);
    const maxOrder = Math.max(-1, ...state.categories.map(c => c.order));
    state.categories.push({
      id, label, color, light: variants.light, dark: variants.dark,
      type: 'user', status: 'active', order: maxOrder + 1,
      createdAt: new Date().toISOString(), archivedAt: null,
    });
    state.activeCategories.add(id);
  }
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function archiveCategory(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat || cat.type === 'system') return;
  const activeCount = state.categories.filter(c => c.status === 'active').length;
  if (activeCount <= 1) return;
  if (!confirm(`Archive "${cat.label}"? Events in this category will be preserved but the category won't appear in the picker or goals.`)) return;
  cat.status = 'archived';
  cat.archivedAt = new Date().toISOString();
  state.activeCategories.delete(id);
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function restoreCategory(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const activeCount = state.categories.filter(c => c.status === 'active').length;
  if (activeCount >= MAX_ACTIVE_CATEGORIES) { alert(`Maximum ${MAX_ACTIVE_CATEGORIES} active categories.`); return; }
  cat.status = 'active';
  cat.archivedAt = null;
  state.activeCategories.add(id);
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function moveCategoryUp(id) {
  const active = getAllCategories().filter(c => c.status === 'active');
  const idx = active.findIndex(c => c.id === id);
  if (idx <= 0) return;
  const prev = active[idx - 1];
  const curr = active[idx];
  const tmpOrder = curr.order;
  curr.order = prev.order;
  prev.order = tmpOrder;
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function moveCategoryDown(id) {
  const active = getAllCategories().filter(c => c.status === 'active');
  const idx = active.findIndex(c => c.id === id);
  if (idx < 0 || idx >= active.length - 1) return;
  const next = active[idx + 1];
  const curr = active[idx];
  const tmpOrder = curr.order;
  curr.order = next.order;
  next.order = tmpOrder;
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

// ── Habits View ──
function renderHabitsView() {
  const wrap = document.createElement('div');
  wrap.className = 'habits-view';
  const ds = todayStr();
  const weekStart = getMonday(state.currentDate);
  const todayHabits = getTodayHabits();
  const activeHabits = state.habits.filter(h => h.status === 'active');

  let html = `<div class="habits-header">
    <h2 class="habits-title">Habits</h2>
    <button class="btn btn-primary btn-sm" id="habit-add-btn">+ New Habit</button>
  </div>`;

  if (todayHabits.length > 0) {
    html += `<div class="dash-card habits-today-card"><h3 class="dash-card-title">Today's Habits</h3><div class="habits-today-list">`;
    todayHabits.forEach(h => {
      const entry = getHabitLogEntry(h.id, ds);
      const status = entry?.status || 'pending';
      const cat = catStyle(h.category);
      const streak = getHabitStreak(h.id);
      html += `<div class="habit-today-row ${status !== 'pending' ? 'habit-done' : ''}">
        <button class="habit-check-btn ${status === 'completed' ? 'checked' : ''}" onclick="quickLogHabit('${h.id}','${ds}','completed')" title="Mark complete">
          ${status === 'completed' ? '✓' : '○'}
        </button>
        <div class="habit-today-info">
          <span class="habit-today-name">${esc(h.name)}</span>
          <span class="habit-today-meta">
            <span class="task-cat-dot" style="background:${cat.color}"></span>
            ${h.duration}min${h.preferredTime ? ' · ' + formatTime12(h.preferredTime) : ''}
            ${streak > 0 ? ` · <span class="habit-streak">${streak}d streak</span>` : ''}
          </span>
        </div>
        <div class="habit-today-actions">
          ${status === 'pending' ? `<button class="btn btn-ghost btn-xs" onclick="quickLogHabit('${h.id}','${ds}','skipped')" title="Skip without breaking your streak">Skip</button>` : `<span class="habit-status-badge habit-status-${status}">${status === 'skipped' ? 'skipped (streak safe)' : status}</span>`}
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  if (activeHabits.length > 0) {
    html += `<div class="dash-card"><h3 class="dash-card-title">Weekly Progress</h3><div class="habits-weekly-list">`;
    activeHabits.forEach(h => {
      const wk = getHabitWeeklyCompletion(h.id, weekStart);
      const cat = catStyle(h.category);
      const streak = getHabitStreak(h.id);
      html += `<div class="habit-weekly-row" onclick="openHabitEditor('${h.id}')">
        <span class="task-cat-dot" style="background:${cat.color}"></span>
        <span class="habit-weekly-name">${esc(h.name)}</span>
        <div class="habit-weekly-bar"><div class="habit-weekly-fill" style="width:${wk.rate}%;background:${cat.color}"></div></div>
        <span class="habit-weekly-stat">${wk.completed}/${wk.expected}</span>
        ${streak > 0 ? `<span class="habit-streak">${streak}d</span>` : ''}
      </div>`;
    });
    html += `</div></div>`;
  }

  if (activeHabits.length === 0) {
    html += `<div class="dash-card"><p style="padding:16px;color:var(--text-muted)">No habits yet. Create your first habit to start tracking.</p></div>`;
  }

  const inactive = state.habits.filter(h => h.status === 'inactive');
  if (inactive.length > 0) {
    html += `<div class="dash-card"><h3 class="dash-card-title">Inactive Habits</h3>`;
    inactive.forEach(h => {
      const cat = catStyle(h.category);
      html += `<div class="habit-weekly-row" onclick="openHabitEditor('${h.id}')">
        <span class="task-cat-dot" style="background:${cat.color}"></span>
        <span class="habit-weekly-name" style="opacity:0.6">${esc(h.name)}</span>
        <span class="habit-status-badge">inactive</span>
      </div>`;
    });
    html += `</div>`;
  }

  wrap.innerHTML = html;
  viewEl.appendChild(wrap);
  document.getElementById('habit-add-btn')?.addEventListener('click', () => openHabitEditor(null));
}

function quickLogHabit(habitId, ds, status) {
  logHabitCompletion(habitId, ds, status);
  if (status === 'skipped') {
    const streak = getHabitStreak(habitId);
    showToast(streak > 0 ? `Skipped - your ${streak}-day streak is safe!` : 'Skipped - rest days are part of the plan.');
  }
  renderView();
}

function openHabitEditor(editId) {
  const existing = editId ? state.habits.find(h => h.id === editId) : null;
  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  const title = existing ? 'Edit Habit' : 'New Habit';
  const name = existing?.name || '';
  const cat = existing?.category || 'personal-other';
  const duration = existing?.duration || 30;
  const priority = existing?.priority || 'medium';
  const prefTime = existing?.preferredTime || '';
  const freqType = existing?.targetFrequency?.type || 'daily';
  const freqDays = existing?.targetFrequency?.daysOfWeek || [];
  const freqTimes = existing?.targetFrequency?.timesPerWeek || 3;
  const notes = existing?.notes || '';
  const habitStatus = existing?.status || 'active';
  const endDate = existing?.endDate || '';

  let html = `<div class="import-preview-modal habit-editor-modal">
    <h3>${title}</h3>
    <div class="form-group"><label>Name</label><input type="text" id="habit-name" value="${esc(name)}" maxlength="60" placeholder="e.g., Exercise" class="setting-input" style="width:100%"></div>
    <div class="form-group"><label>Category</label><select id="habit-cat" class="setting-input" style="width:100%">
      ${Object.entries(CATEGORIES).map(([k,c]) => `<option value="${k}" ${k===cat?'selected':''}>${esc(c.label)}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Duration (minutes)</label><input type="number" id="habit-duration" min="5" max="480" value="${duration}" class="setting-input" style="width:80px"></div>
    <div class="form-group"><label>Preferred time</label><input type="time" id="habit-time" value="${prefTime}" class="setting-input" style="width:auto"></div>
    <div class="form-group"><label>Frequency</label><select id="habit-freq" class="setting-input" style="width:auto">
      <option value="daily" ${freqType==='daily'?'selected':''}>Every day</option>
      <option value="weekdays" ${freqType==='weekdays'?'selected':''}>Weekdays</option>
      <option value="custom" ${freqType==='custom'?'selected':''}>Custom days</option>
    </select></div>
    <div id="habit-days-area" class="${freqType==='custom'?'':'hidden'}">
      <div class="rec-days">${DAYS_SHORT.map((d,i) =>
        `<button type="button" class="rec-day-btn ${freqDays.includes(i)?'selected':''}" data-day="${i}">${d}</button>`
      ).join('')}</div>
    </div>
    <div class="form-group"><label>Priority</label><select id="habit-priority" class="setting-input" style="width:auto">
      <option value="low" ${priority==='low'?'selected':''}>Low</option>
      <option value="medium" ${priority==='medium'?'selected':''}>Medium</option>
      <option value="high" ${priority==='high'?'selected':''}>High</option>
    </select></div>
    <div class="form-group"><label>Notes</label><textarea id="habit-notes" rows="2" class="setting-input" style="width:100%">${esc(notes)}</textarea></div>
    ${existing ? `<div class="form-group"><label>Status</label><select id="habit-status" class="setting-input" style="width:auto">
      <option value="active" ${habitStatus==='active'?'selected':''}>Active</option>
      <option value="inactive" ${habitStatus==='inactive'?'selected':''}>Inactive</option>
    </select></div>` : ''}
    <div class="form-group"><label>End date (optional)</label><input type="date" id="habit-end" value="${endDate}" class="setting-input" style="width:auto"></div>
    <div class="import-preview-actions">
      ${existing ? `<button class="btn btn-danger btn-sm" id="habit-delete">Delete</button>` : '<span></span>'}
      <div><button class="btn btn-ghost" id="habit-cancel">Cancel</button>
      <button class="btn btn-primary" id="habit-save">Save</button></div>
    </div>
  </div>`;
  overlay.innerHTML = html;
  document.body.appendChild(overlay);

  let selectedDays = [...freqDays];
  overlay.querySelectorAll('.rec-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.day);
      const idx = selectedDays.indexOf(d);
      if (idx !== -1) selectedDays.splice(idx, 1); else selectedDays.push(d);
      btn.classList.toggle('selected');
    });
  });
  overlay.querySelector('#habit-freq').addEventListener('change', (e) => {
    document.getElementById('habit-days-area').classList.toggle('hidden', e.target.value !== 'custom');
  });
  overlay.querySelector('#habit-cancel').addEventListener('click', () => overlay.remove());
  const delBtn = overlay.querySelector('#habit-delete');
  if (delBtn) delBtn.addEventListener('click', () => {
    if (!confirm('Delete this habit and its history?')) return;
    state.habits = state.habits.filter(h => h.id !== editId);
    state.habitLog = state.habitLog.filter(l => l.habitId !== editId);
    saveHabits(); saveHabitLog();
    overlay.remove(); renderView();
  });
  overlay.querySelector('#habit-save').addEventListener('click', () => {
    const nameVal = document.getElementById('habit-name').value.trim();
    if (!nameVal) { showToast('Habit name is required', 'error'); return; }
    const freqVal = document.getElementById('habit-freq').value;
    const freq = {
      type: freqVal,
      timesPerWeek: freqVal === 'daily' ? 7 : freqVal === 'weekdays' ? 5 : selectedDays.length,
      daysOfWeek: freqVal === 'custom' ? selectedDays.sort() : freqVal === 'weekdays' ? [0,1,2,3,4] : [0,1,2,3,4,5,6],
    };
    const now = new Date().toISOString();
    if (existing) {
      existing.name = nameVal;
      existing.category = document.getElementById('habit-cat').value;
      existing.duration = parseInt(document.getElementById('habit-duration').value) || 30;
      existing.preferredTime = document.getElementById('habit-time').value || null;
      existing.targetFrequency = freq;
      existing.priority = document.getElementById('habit-priority').value;
      existing.notes = document.getElementById('habit-notes').value;
      existing.endDate = document.getElementById('habit-end').value || null;
      existing.status = document.getElementById('habit-status')?.value || 'active';
      existing.updatedAt = now;
    } else {
      state.habits.push({
        id: 'hab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: nameVal,
        category: document.getElementById('habit-cat').value,
        targetFrequency: freq,
        preferredTime: document.getElementById('habit-time').value || null,
        duration: parseInt(document.getElementById('habit-duration').value) || 30,
        priority: document.getElementById('habit-priority').value,
        status: 'active',
        startDate: todayStr(),
        endDate: document.getElementById('habit-end').value || null,
        notes: document.getElementById('habit-notes').value,
        createdAt: now,
        updatedAt: now,
      });
    }
    saveHabits();
    overlay.remove();
    renderView();
  });
}

// ── Brain Dump View ──
function renderBrainDumpView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  let html = `<div class="habits-header"><h2 class="habits-title">Brain Dump</h2></div>
    <p class="dash-score-explain">Capture every thought. Turn the important ones into tasks.</p>
    <div class="brain-dump-input-row">
      <input type="text" id="brain-dump-input" class="setting-input" style="flex:1" placeholder="What's on your mind?" maxlength="200">
      <button class="btn btn-primary btn-sm" id="brain-dump-add">Add</button>
    </div>
    <div class="brain-dump-list">`;
  state.brainDump.forEach(item => {
    html += `<div class="brain-dump-item">
      <span class="brain-dump-text">${esc(item.text)}</span>
      <div class="brain-dump-actions">
        <button class="btn btn-ghost btn-xs" onclick="brainDumpToTask(state.brainDump.find(i=>i.id==='${item.id}'))">→ Task</button>
        <button class="btn btn-ghost btn-xs" onclick="removeBrainDumpItem('${item.id}');renderView()">✕</button>
      </div>
    </div>`;
  });
  if (!state.brainDump.length) html += '<p class="dash-empty">Empty mind? Add thoughts above.</p>';
  html += '</div>';
  wrap.innerHTML = html;
  viewEl.appendChild(wrap);
  const input = document.getElementById('brain-dump-input');
  const addBtn = document.getElementById('brain-dump-add');
  const doAdd = () => { addBrainDumpItem(input.value); input.value = ''; renderView(); };
  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  input.focus();
}

// ── Focus Timer View ──
function renderFocusView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  const remaining = state.focusTimer.remaining || (state.focusTimer.mode === 'work' ? state.focusTimer.workMin * 60 : state.focusTimer.breakMin * 60);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const modeLabel = state.focusTimer.mode === 'work' ? 'Focus Time' : 'Break Time';

  const nextEvent = getEventsWithRecurrences(todayStr(), todayStr())
    .filter(e => e.type !== 'task' && !e.allDay && timeToMin(e.startTime) > timeToMin(pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())))
    .sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime))[0];

  let html = `<div class="focus-timer-page">
    <h2 class="habits-title">${modeLabel}</h2>
    <div class="focus-timer-circle"><span id="focus-timer-display" class="focus-timer-display">${pad(m)}:${pad(s)}</span></div>
    <div class="focus-timer-controls">
      ${state.focusTimer.running
        ? '<button class="btn btn-primary" onclick="pauseFocusTimer();renderView()">Pause</button>'
        : '<button class="btn btn-primary" onclick="startFocusTimer();renderView()">Start</button>'}
      <button class="btn btn-ghost" onclick="resetFocusTimer();renderView()">Reset</button>
      <button class="btn btn-ghost" onclick="state.focusTimer.mode=state.focusTimer.mode==='work'?'break':'work';resetFocusTimer();renderView()">${state.focusTimer.mode === 'work' ? 'Switch to Break' : 'Switch to Focus'}</button>
    </div>
    <div class="focus-timer-settings">
      <label>Focus: <input type="number" min="1" max="120" value="${state.focusTimer.workMin}" class="setting-input" style="width:60px" onchange="state.focusTimer.workMin=parseInt(this.value)||25;resetFocusTimer();renderView()"> min</label>
      <label>Break: <input type="number" min="1" max="60" value="${state.focusTimer.breakMin}" class="setting-input" style="width:60px" onchange="state.focusTimer.breakMin=parseInt(this.value)||5;resetFocusTimer();renderView()"> min</label>
    </div>`;
  if (nextEvent) {
    const minsUntil = timeToMin(nextEvent.startTime) - timeToMin(pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()));
    html += `<div class="focus-next-event"><strong>Next:</strong> ${esc(nextEvent.title)} in ${minsUntil} min (${formatTime12(nextEvent.startTime)})</div>`;
  }
  html += `<button class="btn btn-ghost btn-sm" style="margin-top:16px" onclick="renderOneThingNow()">One Thing Now</button>`;
  html += `</div>`;
  wrap.innerHTML = html;
  viewEl.appendChild(wrap);
}

function renderOneThingNow() {
  viewEl.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'settings-view one-thing-now';
  const ds = todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const currentEvents = getEventsWithRecurrences(ds, ds).filter(e =>
    e.type !== 'task' && !e.allDay && timeToMin(e.startTime) <= nowMin && timeToMin(e.endTime) > nowMin
  );
  const nextEvents = getEventsWithRecurrences(ds, ds).filter(e =>
    e.type !== 'task' && !e.allDay && timeToMin(e.startTime) > nowMin
  ).sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

  const pendingTasks = state.events.filter(e => e.type === 'task' && !e.completed).sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] || 1) - (prio[b.priority] || 1);
  });

  let html = '<div class="one-thing-container">';
  if (currentEvents.length) {
    html += `<div class="one-thing-current"><span class="one-thing-label">Right now</span><h1 class="one-thing-title">${esc(currentEvents[0].title)}</h1><p>${formatTime12(currentEvents[0].startTime)} – ${formatTime12(currentEvents[0].endTime)}</p></div>`;
  } else if (pendingTasks.length) {
    html += `<div class="one-thing-current"><span class="one-thing-label">Focus on</span><h1 class="one-thing-title">${esc(pendingTasks[0].title)}</h1><p>${pendingTasks[0].priority} priority</p></div>`;
  } else {
    html += `<div class="one-thing-current"><span class="one-thing-label">You're free</span><h1 class="one-thing-title">No tasks right now</h1></div>`;
  }
  if (nextEvents.length) {
    const minsUntil = timeToMin(nextEvents[0].startTime) - nowMin;
    html += `<div class="one-thing-next"><strong>Next:</strong> ${esc(nextEvents[0].title)} in ${minsUntil} min</div>`;
  }
  html += `<button class="btn btn-ghost" style="margin-top:24px" onclick="switchPage('focus')">Back to Timer</button>`;
  html += '</div>';
  wrap.innerHTML = html;
  viewEl.appendChild(wrap);
}

// ── Budget View ──
function renderBudgetView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const selectedMonth = state._budgetMonth || currentMonth;
  const totals = getBudgetTotals(selectedMonth);

  let html = `<div class="habits-header"><h2 class="habits-title">Budget</h2>
    <input type="month" class="setting-input" value="${selectedMonth}" onchange="state._budgetMonth=this.value;renderView()">
  </div>
  <div class="budget-summary">
    <div class="budget-summary-item budget-income"><span>Income</span><strong>$${totals.income.toFixed(2)}</strong></div>
    <div class="budget-summary-item budget-expense"><span>Expenses</span><strong>$${totals.expenses.toFixed(2)}</strong></div>
    <div class="budget-summary-item ${totals.balance >= 0 ? 'budget-positive' : 'budget-negative'}"><span>Balance</span><strong>$${totals.balance.toFixed(2)}</strong></div>
  </div>
  <div class="budget-add-row">
    <select id="budget-type" class="setting-input"><option value="income">Income</option><option value="expense">Expense</option></select>
    <input type="text" id="budget-desc" class="setting-input" placeholder="Description" maxlength="100" style="flex:1">
    <input type="number" id="budget-amount" class="setting-input" placeholder="Amount" min="0" step="0.01" style="width:100px">
    <button class="btn btn-primary btn-sm" id="budget-add-btn">Add</button>
  </div>
  <div class="budget-list">`;
  totals.items.forEach(item => {
    const sign = item.type === 'income' ? '+' : '-';
    html += `<div class="budget-item ${item.type}">
      <span class="budget-item-desc">${esc(item.description)}</span>
      <span class="budget-item-amount">${sign}$${item.amount.toFixed(2)}</span>
      <button class="btn btn-ghost btn-xs" onclick="removeBudgetItem('${item.id}');renderView()">✕</button>
    </div>`;
  });
  if (!totals.items.length) html += '<p class="dash-empty">No entries for this month.</p>';
  html += '</div>';
  wrap.innerHTML = html;
  viewEl.appendChild(wrap);

  document.getElementById('budget-add-btn').addEventListener('click', () => {
    const desc = document.getElementById('budget-desc').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);
    const type = document.getElementById('budget-type').value;
    if (!desc.trim() || isNaN(amount) || amount <= 0) { showToast('Enter description and amount', 'error'); return; }
    addBudgetItem(selectedMonth, type, desc, amount);
    renderView();
  });
}

// ── Meal Planner View ──
function renderMealPlanView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  const weekStart = getMonday(state.currentDate);
  const weekKey = dateStr(weekStart);
  const slots = ['breakfast', 'lunch', 'dinner', 'snack'];

  let html = `<div class="habits-header"><h2 class="habits-title">Meal Plan</h2>
    <span class="dash-date">${dateStr(weekStart)} – ${dateStr(addDays(weekStart, 6))}</span>
  </div>
  <div class="meal-plan-grid"><table class="meal-table"><thead><tr><th></th>`;
  for (let i = 0; i < 7; i++) html += `<th>${DAYS_SHORT[i]}</th>`;
  html += '</tr></thead><tbody>';
  slots.forEach(slot => {
    html += `<tr><td class="meal-slot-label">${slot.charAt(0).toUpperCase() + slot.slice(1)}</td>`;
    for (let i = 0; i < 7; i++) {
      const day = dateStr(addDays(weekStart, i));
      const meal = state.mealPlan[weekKey]?.[day]?.[slot] || { meal: '', ingredients: '' };
      html += `<td><input class="meal-input" data-week="${weekKey}" data-day="${day}" data-slot="${slot}" data-field="meal" value="${esc(meal.meal)}" placeholder="Meal"><input class="meal-input meal-ing" data-week="${weekKey}" data-day="${day}" data-slot="${slot}" data-field="ingredients" value="${esc(meal.ingredients)}" placeholder="Ingredients"></td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  const groceries = getGroceryList(weekKey);
  html += `<div class="dash-card" style="margin-top:16px"><h3 class="dash-card-title">Grocery List <button class="btn btn-ghost btn-xs" id="copy-grocery">Copy</button></h3><div class="grocery-list">`;
  if (groceries.length) {
    groceries.forEach(g => { html += `<div class="grocery-item"><span>${esc(g.name)}</span>${g.count > 1 ? `<span class="grocery-count">×${g.count}</span>` : ''}</div>`; });
  } else {
    html += '<p class="dash-empty">Add ingredients to meals above.</p>';
  }
  html += '</div></div>';
  wrap.innerHTML = html;
  viewEl.appendChild(wrap);

  wrap.querySelectorAll('.meal-input').forEach(input => {
    input.addEventListener('change', () => {
      const { week, day, slot, field } = input.dataset;
      const current = state.mealPlan[week]?.[day]?.[slot] || { meal: '', ingredients: '' };
      current[field] = input.value;
      setMeal(week, day, slot, current.meal, current.ingredients);
      renderView();
    });
  });

  const copyBtn = document.getElementById('copy-grocery');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    const text = groceries.map(g => `${g.name}${g.count > 1 ? ' ×' + g.count : ''}`).join('\n');
    navigator.clipboard.writeText(text).then(() => showToast('Grocery list copied!', 'success')).catch(() => showToast('Copy failed', 'error'));
  });
}

// ── Journal View ──
function renderJournalView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  const ds = dateStr(state.currentDate);
  const entry = getJournalEntry(ds);

  let html = `<div class="habits-header"><h2 class="habits-title">Journal</h2><span class="dash-date">${ds}</span></div>
    <div class="dash-card"><h3 class="dash-card-title">Gratitude</h3>
      <p class="dash-score-explain">Three things you're grateful for today.</p>
      <input class="setting-input journal-gratitude" data-idx="0" value="${esc(entry.gratitude[0] || '')}" placeholder="1. " style="width:100%;margin-bottom:6px">
      <input class="setting-input journal-gratitude" data-idx="1" value="${esc(entry.gratitude[1] || '')}" placeholder="2. " style="width:100%;margin-bottom:6px">
      <input class="setting-input journal-gratitude" data-idx="2" value="${esc(entry.gratitude[2] || '')}" placeholder="3. " style="width:100%">
    </div>
    <div class="dash-card"><h3 class="dash-card-title">Notes</h3>
      <textarea class="setting-input journal-notes" rows="5" placeholder="How was your day?" style="width:100%">${esc(entry.notes || '')}</textarea>
    </div>`;

  const dayOfWeek = new Date(ds + 'T00:00:00').getDay();
  if (dayOfWeek === 0) {
    const weekStart = getMonday(addDays(new Date(ds + 'T00:00:00'), -1));
    const score = calculateBalanceScore(weekStart);
    const habitsCompleted = state.habitLog.filter(l => l.date >= dateStr(weekStart) && l.date <= ds && l.status === 'completed').length;
    html += `<div class="dash-card"><h3 class="dash-card-title">Weekly Review</h3>
      <p>Balance Score: <strong>${score !== null ? score + '/100' : 'N/A'}</strong></p>
      <p>Habits completed this week: <strong>${habitsCompleted}</strong></p>
      <textarea class="setting-input journal-review" rows="3" placeholder="What went well?" style="width:100%;margin-bottom:6px">${esc(entry.review || '')}</textarea>
      <textarea class="setting-input journal-improve" rows="3" placeholder="What to improve?" style="width:100%">${esc(entry.improve || '')}</textarea>
    </div>`;
  }

  html += `<div class="dash-card"><h3 class="dash-card-title">Energy & Mood</h3>
    <div class="energy-mood-row">`;
  const eLog = getEnergyForDate(ds);
  const curEnergy = eLog?.energy || 0;
  const curMood = eLog?.mood || 0;
  const energyEmoji = ['', '😴', '🙁', '😐', '😊', '⚡'];
  const moodEmoji = ['', '😢', '😕', '😐', '🙂', '😄'];
  html += `<div class="energy-picker"><span>Energy:</span><div class="emoji-row">`;
  for (let i = 1; i <= 5; i++) html += `<button class="emoji-btn ${curEnergy===i?'selected':''}" onclick="logEnergy('${ds}',${i},${curMood||3});renderView()">${energyEmoji[i]}</button>`;
  html += `</div></div><div class="energy-picker"><span>Mood:</span><div class="emoji-row">`;
  for (let i = 1; i <= 5; i++) html += `<button class="emoji-btn ${curMood===i?'selected':''}" onclick="logEnergy('${ds}',${curEnergy||3},${i});renderView()">${moodEmoji[i]}</button>`;
  html += `</div></div></div></div>`;

  wrap.innerHTML = html;
  viewEl.appendChild(wrap);

  const saveJournalDebounced = () => {
    const gratitude = Array.from(wrap.querySelectorAll('.journal-gratitude')).map(el => el.value);
    const notes = wrap.querySelector('.journal-notes')?.value || '';
    const review = wrap.querySelector('.journal-review')?.value || '';
    const improve = wrap.querySelector('.journal-improve')?.value || '';
    setJournalEntry(ds, { gratitude, notes, review, improve });
  };
  wrap.querySelectorAll('.journal-gratitude, .journal-notes, .journal-review, .journal-improve').forEach(el => {
    el.addEventListener('input', saveJournalDebounced);
  });
}

// ── About / Help Page ──
function renderAboutView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  const isEtsy = LB_EDITION === 'etsy';
  wrap.innerHTML = `
    <h2 class="settings-title">About LifeBalance Planner</h2>
    <div class="settings-list">
      <div class="setting-row"><div class="setting-info"><span class="setting-label">Version</span></div><span>7.0.0</span></div>
      <div class="setting-row"><div class="setting-info">
        <span class="setting-label">How Your Data Is Saved</span>
        <span class="setting-desc">All data is stored in your browser's local storage. It stays on your device — nothing is sent to any server.${isEtsy ? ' If you move the file, switch browsers, or clear browser data, your data won\'t carry over. Export backups regularly!' : ''}</span>
      </div></div>
      <div class="setting-row"><div class="setting-info">
        <span class="setting-label">How to Back Up</span>
        <span class="setting-desc">Go to Settings → Export Backup. Save the .json file somewhere safe. To restore, use Settings → Import Backup.</span>
      </div></div>
      <div class="setting-row"><div class="setting-info">
        <span class="setting-label">Browser Support</span>
        <span class="setting-desc">Chrome, Edge, Firefox, Safari. Best on desktop. Works on tablets too.</span>
      </div></div>
      ${isEtsy ? `<div class="setting-row"><div class="setting-info">
        <span class="setting-label">Need Help?</span>
        <span class="setting-desc">Contact us via Etsy messages for support.</span>
      </div></div>` : ''}
    </div>`;
  viewEl.appendChild(wrap);
}

// ── Settings View ──
function renderSettingsView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  wrap.innerHTML = `
    <h2 class="settings-title">Settings</h2>
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Default Sleep Hours</span>
          <span class="setting-desc">Used for all-day sleep events in budget calculations</span>
        </div>
        <input type="number" class="setting-input" min="0" max="24" step="0.5" value="${state.preferences.sleepHours}" onchange="updatePref('sleepHours', this.value)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Daily Work Target</span>
          <span class="setting-desc">Target work hours per day for reference</span>
        </div>
        <input type="number" class="setting-input" min="0" max="24" step="0.5" value="${state.preferences.workHoursTarget}" onchange="updatePref('workHoursTarget', this.value)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Start Page</span>
          <span class="setting-desc">Which page to show when the app loads</span>
        </div>
        <select class="setting-input" onchange="updatePref('startPage', this.value)">
          <option value="dashboard" ${state.preferences.startPage === 'dashboard' ? 'selected' : ''}>Dashboard</option>
          <option value="calendar" ${state.preferences.startPage === 'calendar' ? 'selected' : ''}>Calendar</option>
        </select>
      </div>
    </div>
    <h3 class="settings-subtitle">Appearance</h3>
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Dark Mode</span>
          <span class="setting-desc">Use dark theme</span>
        </div>
        <label class="toggle-label"><input type="checkbox" id="dark-mode-toggle" ${state.darkMode ? 'checked' : ''}><span class="toggle-switch"></span></label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Color Theme</span>
          <span class="setting-desc">Choose an aesthetic color scheme</span>
        </div>
        <select class="setting-input" id="theme-select" onchange="setColorTheme(this.value)">
          <option value="default" ${(state.preferences.colorTheme||'default')==='default'?'selected':''}>Default</option>
          <option value="sage" ${state.preferences.colorTheme==='sage'?'selected':''}>Sage</option>
          <option value="blush" ${state.preferences.colorTheme==='blush'?'selected':''}>Blush Pink</option>
          <option value="ocean" ${state.preferences.colorTheme==='ocean'?'selected':''}>Ocean</option>
          <option value="minimal" ${state.preferences.colorTheme==='minimal'?'selected':''}>Minimal Black</option>
        </select>
      </div>
    </div>
    <h3 class="settings-subtitle">Data Management</h3>
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Export Backup</span>
          <span class="setting-desc">Download all your data as a JSON file</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="exportBackup()">Export Backup</button>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Import Backup</span>
          <span class="setting-desc">Restore data from a previously exported backup file</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('import-file-input').click()">Import Backup</button>
        <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="if(this.files[0]) importBackup(this.files[0]); this.value='';">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Add to Google / Apple / Outlook Calendar</span>
          <span class="setting-desc">Export events as .ics file for import into other calendar apps</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="exportICS()">Export .ics</button>
      </div>
      ${state.preferences.hasDemoData ? `<div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Sample Data</span>
          <span class="setting-desc">Remove the sample events, goals, and habits loaded during onboarding</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="clearDemoData()">Clear Sample Data</button>
      </div>` : `<div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Sample Data</span>
          <span class="setting-desc">Load example events, goals, and habits to explore the app</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="loadDemoData();renderView();showToast('Sample data loaded!','success')">Load Sample Data</button>
      </div>`}
    </div>
    ${LB_EDITION === 'etsy' ? `
    <h3 class="settings-subtitle">Starter Templates</h3>
    <p class="setting-desc" style="margin-bottom:8px">Load a pre-built schedule template. Your existing data is kept.</p>
    <div class="settings-list">
      <div class="setting-row"><div class="setting-info"><span class="setting-label">ADHD-Friendly</span><span class="setting-desc">Short blocks, transitions, and brain dump routine</span></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-file-input').click();document.getElementById('template-file-input').dataset.hint='adhd'">Load</button></div>
      <div class="setting-row"><div class="setting-info"><span class="setting-label">Student</span><span class="setting-desc">Class blocks, study sessions, and campus life</span></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-file-input').click()">Load</button></div>
      <div class="setting-row"><div class="setting-info"><span class="setting-label">Working Parent</span><span class="setting-desc">Work-life balance with family routines</span></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-file-input').click()">Load</button></div>
      <div class="setting-row"><div class="setting-info"><span class="setting-label">Faith & Prayer</span><span class="setting-desc">Prayer times, study, and community</span></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-file-input').click()">Load</button></div>
      <div class="setting-row"><div class="setting-info"><span class="setting-label">Fitness</span><span class="setting-desc">Training schedule, meal prep, and recovery</span></div><button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-file-input').click()">Load</button></div>
    </div>
    <p class="setting-desc" style="margin-top:4px">Or import any .json template file from the Starter-Templates.zip included in your download.</p>
    <input type="file" id="template-file-input" accept=".json" style="display:none" onchange="if(this.files[0]) importBackup(this.files[0]); this.value='';">
    ` : ''}
  `;
  viewEl.appendChild(wrap);
  const dmToggle = document.getElementById('dark-mode-toggle');
  if (dmToggle) dmToggle.addEventListener('change', () => toggleDarkMode(dmToggle.checked));
}

function toggleDarkMode(on) {
  state.darkMode = on;
  state.preferences.darkMode = on;
  savePreferences();
  applyThemeAttributes();
}

function setColorTheme(theme) {
  state.preferences.colorTheme = theme;
  savePreferences();
  applyThemeAttributes();
}

function applyThemeAttributes() {
  try {
    const el = document.documentElement;
    if (el && el.setAttribute) {
      el.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
      el.setAttribute('data-color-theme', state.preferences.colorTheme || 'default');
    }
  } catch {}
}

function updatePref(key, value) {
  if (key === 'sleepHours' || key === 'workHoursTarget') value = parseFloat(value) || 0;
  state.preferences[key] = value;
  savePreferences();
}

// ── Modal ──
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const modal = document.querySelector('.modal');
  const focusable = modal.querySelectorAll('input, textarea, select, button, [tabindex="0"]');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openModal(ds, eventId, startTime, allDay, type) {
  clearErrors();
  formEl.reset();
  state.selectedCategory = 'personal-other';
  state.editingType = 'event';
  state.selectedPriority = 'medium';

  state.editingRecurrence = null;
  state.editingRecurrenceScope = null;
  state.editingFlexibility = 'flexible';
  state.editingOrigDate = null;
  state.editingParentId = null;

  if (eventId) {
    let ev = state.events.find(e => e.id === eventId);
    if (!ev) {
      const gen = getEventsWithRecurrences(ds, ds).find(e => e._parentId === eventId && e.date === ds);
      if (gen) { ev = gen; eventId = gen._parentId; }
    }
    if (!ev) return;

    if (ev._generated && ev._parentId) {
      state.editingParentId = ev._parentId;
      state.editingOrigDate = ev.date;
    }

    state.editingEventId = ev._generated ? ev._parentId : eventId;
    modalTitleEl.textContent = 'Edit Event';
    fTitle.value = ev.title;
    fDate.value = ev.date;
    fStart.value = ev.startTime || '09:00';
    fEnd.value = ev.endTime || '10:00';
    fAllDay.checked = ev.allDay;
    fDesc.value = ev.description || '';
    state.selectedCategory = ev.category || 'personal-other';
    state.editingType = ev.type || 'event';
    state.selectedPriority = ev.priority || 'medium';
    state.editingFlexibility = ev.flexibility || 'flexible';
    const parent = state.events.find(e => e.id === state.editingEventId);
    state.editingRecurrence = parent?.recurrence ? { ...parent.recurrence } : null;
    deleteBtn.classList.remove('hidden');
  } else {
    state.editingEventId = null;
    state.editingType = type || 'event';
    modalTitleEl.textContent = state.editingType === 'task' ? 'New Task' : 'New Event';
    fDate.value = ds || dateStr(state.currentDate);
    fStart.value = startTime || '09:00';
    const [h] = (startTime || '09:00').split(':').map(Number);
    fEnd.value = `${pad(Math.min(h + 1, 23))}:00`;
    fAllDay.checked = !!allDay;
    deleteBtn.classList.add('hidden');
  }
  const isTask = state.editingType === 'task';
  fTimeRow.style.display = (fAllDay.checked || isTask) ? 'none' : '';
  document.getElementById('priority-row').style.display = isTask ? '' : 'none';
  if (isTask) {
    modalTitleEl.textContent = state.editingEventId ? 'Edit Task' : 'New Task';
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('selected', b.dataset.prio === (state.selectedPriority || 'medium')));
  }
  renderCatPicker();
  renderRecurrenceUI();
  renderFlexibilityUI();
  renderSubtasksUI();
  modalEl.classList.remove('hidden');
  document.addEventListener('keydown', trapFocus);
  fTitle.focus();
}

function renderRecurrenceUI() {
  let area = document.getElementById('recurrence-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'recurrence-area';
    area.className = 'form-group';
    const descGroup = document.getElementById('event-desc').parentElement;
    descGroup.parentElement.insertBefore(area, descGroup);
  }
  if (state.editingType === 'task') { area.innerHTML = ''; return; }
  const rec = state.editingRecurrence;
  const checked = !!rec;
  let html = `<label class="toggle-label"><input type="checkbox" id="recurrence-toggle" ${checked ? 'checked' : ''}><span class="toggle-switch"></span>Repeat</label>`;
  if (checked) {
    html += `<div class="recurrence-options">
      <div class="form-row"><select id="rec-freq" class="setting-input" style="width:auto">
        <option value="daily" ${rec.freq==='daily'?'selected':''}>Daily</option>
        <option value="weekdays" ${rec.freq==='weekdays'?'selected':''}>Weekdays</option>
        <option value="weekly" ${rec.freq==='weekly'?'selected':''}>Weekly</option>
        <option value="monthly" ${rec.freq==='monthly'?'selected':''}>Monthly</option>
        <option value="yearly" ${rec.freq==='yearly'?'selected':''}>Yearly</option>
      </select>
      <label style="margin-left:8px">every <input type="number" id="rec-interval" min="1" max="52" value="${rec.interval||1}" class="setting-input" style="width:60px"> ${rec.freq==='weekly'?'week(s)':rec.freq==='monthly'?'month(s)':rec.freq==='yearly'?'year(s)':'day(s)'}</label></div>`;
    if (rec.freq === 'weekly') {
      const days = rec.daysOfWeek || [];
      html += `<div class="rec-days">${DAYS_SHORT.map((d,i) =>
        `<button type="button" class="rec-day-btn ${days.includes(i)?'selected':''}" data-day="${i}">${d}</button>`
      ).join('')}</div>`;
    }
    html += `<div class="form-row" style="margin-top:8px"><label>End date <input type="date" id="rec-end" value="${rec.endDate||''}" class="setting-input" style="width:auto"></label></div>`;
    html += `</div>`;
  }
  area.innerHTML = html;
  const toggle = document.getElementById('recurrence-toggle');
  if (toggle) toggle.addEventListener('change', () => {
    if (toggle.checked) {
      state.editingRecurrence = { freq: 'weekly', interval: 1, daysOfWeek: [(new Date(fDate.value+'T00:00:00').getDay()+6)%7], endDate: null, seriesId: 'ser_' + Date.now() };
    } else {
      state.editingRecurrence = null;
    }
    renderRecurrenceUI();
  });
  const freqSel = document.getElementById('rec-freq');
  if (freqSel) freqSel.addEventListener('change', () => {
    state.editingRecurrence.freq = freqSel.value;
    if (freqSel.value === 'weekly' && !state.editingRecurrence.daysOfWeek?.length) {
      state.editingRecurrence.daysOfWeek = [(new Date(fDate.value+'T00:00:00').getDay()+6)%7];
    }
    renderRecurrenceUI();
  });
  const intInput = document.getElementById('rec-interval');
  if (intInput) intInput.addEventListener('change', () => { state.editingRecurrence.interval = parseInt(intInput.value) || 1; });
  const endInput = document.getElementById('rec-end');
  if (endInput) endInput.addEventListener('change', () => { state.editingRecurrence.endDate = endInput.value || null; });
  area.querySelectorAll('.rec-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = parseInt(btn.dataset.day);
      const days = state.editingRecurrence.daysOfWeek || [];
      const idx = days.indexOf(d);
      if (idx !== -1) { if (days.length > 1) days.splice(idx, 1); }
      else days.push(d);
      state.editingRecurrence.daysOfWeek = days;
      renderRecurrenceUI();
    });
  });
}

function renderFlexibilityUI() {
  let area = document.getElementById('flexibility-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'flexibility-area';
    area.className = 'form-group';
    const descGroup = document.getElementById('event-desc').parentElement;
    descGroup.parentElement.insertBefore(area, descGroup);
  }
  if (state.editingType === 'task') { area.innerHTML = ''; return; }
  const flex = state.editingFlexibility || 'flexible';
  area.innerHTML = `<label>Can this move?</label>
    <div class="flexibility-picker">
      <button type="button" class="flex-btn ${flex==='fixed'?'selected':''}" data-flex="fixed" title="Cannot be moved or changed">No, never</button>
      <button type="button" class="flex-btn ${flex==='protected'?'selected':''}" data-flex="protected" title="Only move with good reason">If needed</button>
      <button type="button" class="flex-btn ${flex==='flexible'?'selected':''}" data-flex="flexible" title="Can be freely rearranged">Yes, anytime</button>
    </div>`;
  area.querySelectorAll('.flex-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.editingFlexibility = btn.dataset.flex;
      renderFlexibilityUI();
    });
  });
}

function renderSubtasksUI() {
  let area = document.getElementById('subtasks-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'subtasks-area';
    area.className = 'form-group';
    const descGroup = document.getElementById('event-desc').parentElement;
    descGroup.parentElement.insertBefore(area, descGroup.nextSibling);
  }
  if (state.editingType !== 'task') { area.innerHTML = ''; return; }
  const evId = state.editingEventId;
  const ev = evId ? state.events.find(e => e.id === evId) : null;
  const subs = ev?.subtasks || [];
  area.innerHTML = `<label>Subtasks</label>
    <div class="subtask-list">
      ${subs.map(s => `<div class="subtask-item">
        <label class="subtask-check"><input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtask('${evId}','${s.id}');renderSubtasksUI()"><span class="task-checkmark"></span></label>
        <span class="subtask-text ${s.done ? 'done' : ''}">${esc(s.text)}</span>
        <button type="button" class="subtask-remove" onclick="removeSubtask('${evId}','${s.id}');renderSubtasksUI()">&times;</button>
      </div>`).join('')}
    </div>
    <div class="subtask-add">
      <input type="text" id="subtask-input" placeholder="Add subtask..." class="setting-input" style="flex:1">
      <button type="button" class="btn btn-sm" onclick="const inp=document.getElementById('subtask-input');if(inp.value.trim()){addSubtask('${evId}',inp.value);inp.value='';renderSubtasksUI()}">Add</button>
    </div>`;
  const inp = document.getElementById('subtask-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (inp.value.trim()) { addSubtask(evId, inp.value); inp.value = ''; renderSubtasksUI(); } } });
}

function closeModal() {
  modalEl.classList.add('hidden');
  document.removeEventListener('keydown', trapFocus);
  state.editingEventId = null;
  formEl.reset();
  clearErrors();
}

function renderCatPicker() {
  catPicker.innerHTML = '';
  catPicker.setAttribute('role', 'radiogroup');
  catPicker.setAttribute('aria-label', 'Event category');
  const entries = Object.entries(CATEGORIES);
  if (state.selectedCategory && !CATEGORIES[state.selectedCategory]) {
    const arc = state.categories.find(c => c.id === state.selectedCategory);
    if (arc) entries.push([arc.id, { label: arc.label + ' (archived)', color: '#94a3b8', light: arc.light, dark: '#64748b' }]);
  }
  for (const [key, cat] of entries) {
    const el = document.createElement('div');
    const isSel = state.selectedCategory === key;
    el.className = 'cat-option' + (isSel ? ' selected' : '');
    el.style.color = cat.color;
    el.setAttribute('role', 'radio');
    el.setAttribute('aria-checked', String(isSel));
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${cat.label} category`);
    el.innerHTML = `<span class="cat-dot" style="background:${cat.color}"></span>${esc(cat.label)}`;
    el.addEventListener('click', () => { state.selectedCategory = key; renderCatPicker(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.selectedCategory = key; renderCatPicker(); } });
    catPicker.appendChild(el);
  }
}

function clearErrors() { errTitle.textContent = ''; errDate.textContent = ''; }

function validateForm() {
  clearErrors();
  let ok = true;
  if (!fTitle.value.trim()) { errTitle.textContent = 'Title is required'; ok = false; }
  if (!fDate.value) { errDate.textContent = 'Date is required'; ok = false; }
  return ok;
}

function handleSave(e) {
  e.preventDefault();
  if (!validateForm()) return;
  const isAllDay = fAllDay.checked;
  const isTask = state.editingType === 'task';
  const data = {
    title: fTitle.value.trim(),
    date: fDate.value,
    startTime: (isAllDay || isTask) ? '00:00' : (fStart.value || '09:00'),
    endTime: (isAllDay || isTask) ? '23:59' : (fEnd.value || '10:00'),
    allDay: isAllDay,
    category: state.selectedCategory,
    description: fDesc.value.trim(),
    type: state.editingType,
    flexibility: state.editingFlexibility || 'flexible',
  };
  if (isTask) {
    data.priority = state.selectedPriority || 'medium';
    if (!state.editingEventId) data.completed = false;
  }
  if (!isAllDay && !isTask && timeToMin(data.endTime) <= timeToMin(data.startTime)) {
    const corrected = Math.min(timeToMin(data.startTime) + 60, 1439);
    data.endTime = `${pad(Math.floor(corrected / 60))}:${pad(corrected % 60)}`;
  }

  const parent = state.editingEventId ? state.events.find(ev => ev.id === state.editingEventId) : null;
  const isRecurringParent = parent?.recurrence && !parent.isException;

  if (state.editingEventId && isRecurringParent && state.editingParentId) {
    showRecurringEditDialog(data);
    return;
  }

  if (isTask) {
    data.recurrence = null;
    data.seriesId = null;
    data.isException = false;
    data.excludedDates = [];
  } else {
    data.recurrence = state.editingRecurrence;
    if (!state.editingEventId && data.recurrence) {
      data.seriesId = null;
      data.isException = false;
      data.excludedDates = [];
    }
  }

  if (state.editingEventId) {
    const idx = state.events.findIndex(ev => ev.id === state.editingEventId);
    if (idx !== -1) {
      const kept = state.events[idx];
      state.events[idx] = { ...kept, ...data, recurrence: data.recurrence !== undefined ? data.recurrence : kept.recurrence };
    }
  } else {
    data.id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    if (!data.recurrence) { data.recurrence = null; data.seriesId = null; data.isException = false; data.excludedDates = []; }
    state.events.push(data);
  }
  saveEvents();
  closeModal();
  renderAll();
}

function showRecurringEditDialog(data) {
  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  overlay.innerHTML = `<div class="import-preview-modal">
    <h3>Edit Recurring Event</h3>
    <p>This event is part of a series. What would you like to change?</p>
    <div class="rec-edit-actions">
      <button class="btn btn-ghost" id="rec-edit-single">This occurrence</button>
      <button class="btn btn-ghost" id="rec-edit-future">This &amp; future</button>
      <button class="btn btn-primary" id="rec-edit-all">Entire series</button>
    </div>
    <button class="btn btn-ghost" id="rec-edit-cancel" style="margin-top:8px">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('rec-edit-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('rec-edit-single').addEventListener('click', () => {
    editRecurringSingle(state.editingEventId, state.editingOrigDate, data);
    overlay.remove(); closeModal(); renderAll();
  });
  document.getElementById('rec-edit-future').addEventListener('click', () => {
    editRecurringFuture(state.editingEventId, state.editingOrigDate, data);
    overlay.remove(); closeModal(); renderAll();
  });
  document.getElementById('rec-edit-all').addEventListener('click', () => {
    editRecurringAll(state.editingEventId, data);
    overlay.remove(); closeModal(); renderAll();
  });
}

function handleDelete() {
  if (!state.editingEventId) return;
  const ev = state.events.find(e => e.id === state.editingEventId);
  if (ev?.recurrence && !ev.isException) {
    showRecurringDeleteDialog();
    return;
  }
  if (state.editingParentId) {
    if (!confirm('Delete this occurrence?')) return;
    deleteRecurringSingle(state.editingParentId, state.editingOrigDate);
    closeModal(); renderAll(); return;
  }
  if (!confirm('Delete this event?')) return;
  state.events = state.events.filter(e => e.id !== state.editingEventId);
  saveEvents();
  closeModal();
  renderAll();
}

function showRecurringDeleteDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  overlay.innerHTML = `<div class="import-preview-modal">
    <h3>Delete Recurring Event</h3>
    <p>This event is part of a series. What would you like to delete?</p>
    <div class="rec-edit-actions">
      <button class="btn btn-ghost" id="rec-del-single">This occurrence</button>
      <button class="btn btn-ghost" id="rec-del-future">This &amp; future</button>
      <button class="btn btn-danger" id="rec-del-all">Entire series</button>
    </div>
    <button class="btn btn-ghost" id="rec-del-cancel" style="margin-top:8px">Cancel</button>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('rec-del-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('rec-del-single').addEventListener('click', () => {
    deleteRecurringSingle(state.editingEventId, state.editingOrigDate || fDate.value);
    overlay.remove(); closeModal(); renderAll();
  });
  document.getElementById('rec-del-future').addEventListener('click', () => {
    deleteRecurringFuture(state.editingEventId, state.editingOrigDate || fDate.value);
    overlay.remove(); closeModal(); renderAll();
  });
  document.getElementById('rec-del-all').addEventListener('click', () => {
    if (!confirm('Delete all occurrences of this event? This cannot be undone.')) return;
    deleteRecurringAll(state.editingEventId);
    overlay.remove(); closeModal(); renderAll();
  });
}

// ── AI Planner ──
const AI_MAX_REQUESTS = 10;
const AI_COOLDOWN_MS = 10000;
const aiState = {
  requestCount: 0,
  lastRequestTime: 0,
  panelOpen: false,
  loading: false,
  suggestions: [],
  demoMode: false,
  commandHistory: [],
};

function openAIPanel() {
  const panel = $('ai-panel');
  if (LB_EDITION === 'etsy') {
    const actions = panel.querySelector('.ai-actions');
    const cmdBar = panel.querySelector('.ai-command-bar');
    if (cmdBar) cmdBar.style.display = 'none';
    if (actions) {
      actions.innerHTML = `
        <button class="ai-action-btn" onclick="handlePlanDay()">Plan My Day</button>
        <button class="ai-action-btn" onclick="handleWhatNow()">What Now?</button>
        <div class="ai-divider"></div>
        <p class="ai-copy-label">Copy a prompt to paste into ChatGPT or Claude:</p>
        <button class="ai-action-btn ai-copy-btn" onclick="copyAIPrompt('plan-week')">Plan My Week</button>
        <button class="ai-action-btn ai-copy-btn" onclick="copyAIPrompt('fix-habits')">Fix My Habits</button>
        <button class="ai-action-btn ai-copy-btn" onclick="copyAIPrompt('rebalance')">Rebalance My Life</button>
        <button class="ai-action-btn ai-copy-btn" onclick="copyAIPrompt('what-now')">What Now? (AI)</button>`;
    }
    const badge = $('ai-mode-badge');
    if (badge) { badge.textContent = 'AI-Ready'; badge.classList.remove('hidden'); }
    const title = panel.querySelector('.ai-panel-title-row h3');
    if (title) title.textContent = 'LifeBalance Planner';
  }
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => panel.classList.add('open'));
  aiState.panelOpen = true;
  updateAIRateLimit();
}

function closeAIPanel() {
  const panel = $('ai-panel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  setTimeout(() => { if (!aiState.panelOpen) panel.classList.add('hidden'); }, 250);
  aiState.panelOpen = false;
}

function updateAIRateLimit() {
  const el = $('ai-rate-limit');
  if (!el) return;
  if (aiState.requestCount >= AI_MAX_REQUESTS) {
    el.textContent = 'Request limit reached for this session';
  } else if (aiState.requestCount > 0) {
    el.textContent = `${aiState.requestCount} of ${AI_MAX_REQUESTS} AI requests used`;
  } else {
    el.textContent = '';
  }
}

function canMakeAIRequest() {
  if (aiState.requestCount >= AI_MAX_REQUESTS) return { ok: false, reason: 'Request limit reached for this session. Refresh the page to reset.' };
  const elapsed = Date.now() - aiState.lastRequestTime;
  if (elapsed < AI_COOLDOWN_MS) {
    const wait = Math.ceil((AI_COOLDOWN_MS - elapsed) / 1000);
    return { ok: false, reason: `Please wait ${wait} seconds before the next request.` };
  }
  return { ok: true };
}

function buildAIContext(action, targetDate, command) {
  const ds = targetDate || todayStr();
  const budget = calculateDayBudget(ds);
  const weekStart = getMonday(new Date(ds + 'T00:00:00'));
  const balanceScore = calculateBalanceScore(weekStart);

  let events = [];
  if (action === 'plan-week') {
    const weekEnd = dateStr(addDays(weekStart, 6));
    events = getEventsWithRecurrences(dateStr(weekStart), weekEnd).filter(e => e.type !== 'task');
  } else {
    events = getEventsWithRecurrences(ds, ds).filter(e => e.type !== 'task');
  }

  const tasks = state.events.filter(e => e.type === 'task' && !e.completed);

  const goals = {};
  state.goals.filter(g => g.active).forEach(g => {
    goals[g.category] = g.targetHoursPerWeek;
  });

  const activeHabits = state.habits.filter(h => h.status === 'active');
  const habitSummary = activeHabits.map(h => {
    const wk = getHabitWeeklyCompletion(h.id, getMonday(new Date(ds + 'T00:00:00')));
    const streak = getHabitStreak(h.id);
    return { name: h.name, category: h.category, duration: h.duration, frequency: h.targetFrequency.type, weeklyRate: wk.rate, streak, priority: h.priority };
  });

  const recurringEvents = state.events.filter(e => e.recurrence && !e.isException).map(e => ({
    title: e.title, category: e.category, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay,
    frequency: e.recurrence.freq, flexibility: e.flexibility || 'flexible',
  }));

  return {
    action,
    date: ds,
    events: events.map(e => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay, category: e.category, type: e.type, flexibility: e.flexibility || 'flexible' })),
    tasks: tasks.map(t => ({ id: t.id, title: t.title, date: t.date, category: t.category, priority: t.priority || 'medium' })),
    goals,
    preferences: { sleepHours: state.preferences.sleepHours, workHoursTarget: state.preferences.workHoursTarget },
    balanceScore: balanceScore !== null ? balanceScore : undefined,
    budgetSummary: budget.categoryTotals,
    command: command || undefined,
    categories: Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label })),
    habits: habitSummary,
    recurringCommitments: recurringEvents,
    currentTime: `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`,
  };
}

async function callAIPlanner(context) {
  if (LB_EDITION === 'etsy') {
    return generateFallbackSuggestions(context);
  }

  const check = canMakeAIRequest();
  if (!check.ok) {
    renderAIError(check.reason);
    return null;
  }

  aiState.loading = true;
  aiState.requestCount++;
  aiState.lastRequestTime = Date.now();
  updateAIRateLimit();
  renderAILoading();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const resp = await fetch('/api/ai-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await resp.json();

    if (data.error) {
      if (data.code === 'NO_API_KEY' || data.code === 'AUTH_ERROR' || resp.status >= 500) {
        aiState.demoMode = true;
        const badge = $('ai-mode-badge');
        if (badge) badge.classList.remove('hidden');
        return generateFallbackSuggestions(context);
      }
      throw new Error(data.message || 'AI request failed');
    }

    aiState.demoMode = false;
    const badge = $('ai-mode-badge');
    if (badge) badge.classList.add('hidden');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      renderAIError('Request timed out. The AI is taking too long — please try again.');
      return null;
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      aiState.demoMode = true;
      const badge = $('ai-mode-badge');
      if (badge) badge.classList.remove('hidden');
      return generateFallbackSuggestions(context);
    }
    renderAIError(err.message || 'Something went wrong. Please try again.');
    return null;
  } finally {
    aiState.loading = false;
  }
}

function generateFallbackSuggestions(context) {
  const suggestions = [];
  let sugId = 1;
  const ds = context.date;

  const goals = context.goals || {};
  const weekStart = getMonday(new Date(ds + 'T00:00:00'));
  const weekBudget = calculateWeekBudget(weekStart);

  Object.entries(goals).forEach(([cat, targetHours]) => {
    const actualMin = weekBudget.categoryTotals[cat] || 0;
    const targetMin = targetHours * 60;
    if (actualMin < targetMin * 0.5) {
      const catLabel = CATEGORIES[cat]?.label || cat;
      const deficit = formatMinutes(targetMin - actualMin);
      suggestions.push({
        id: `sug-${sugId++}`,
        type: 'info',
        summary: `${catLabel} is behind schedule`,
        reason: `You've used ${formatMinutes(actualMin)} of your ${targetHours}h weekly goal. Consider scheduling ${deficit} more this week.`,
        event: null,
        conflictsWith: [],
        priority: 'medium',
      });
    }
  });

  const unscheduledTasks = (context.tasks || []).slice(0, 3);
  unscheduledTasks.forEach(t => {
    const dayEvents = state.events.filter(e => e.date === ds && e.type !== 'task' && !e.allDay);
    let freeStart = '09:00';
    dayEvents.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
    for (const ev of dayEvents) {
      if (timeToMin(freeStart) + 60 <= timeToMin(ev.startTime)) break;
      freeStart = ev.endTime;
    }
    const startMin = timeToMin(freeStart);
    if (startMin < 1200) {
      const endMin = Math.min(startMin + 60, 1440);
      suggestions.push({
        id: `sug-${sugId++}`,
        type: 'add',
        summary: `Schedule task: ${t.title}`,
        reason: `This ${t.priority}-priority task is incomplete. Suggested time slot is available.`,
        event: {
          title: t.title,
          date: ds,
          startTime: `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
          endTime: `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`,
          category: t.category || 'personal-other',
          type: 'event',
          allDay: false,
        },
        conflictsWith: [],
        priority: t.priority || 'medium',
      });
    }
  });

  const budget = calculateDayBudget(ds);
  if (budget.overbooked) {
    suggestions.push({
      id: `sug-${sugId++}`,
      type: 'info',
      summary: 'Day is overbooked',
      reason: `You have ${formatMinutes(budget.scheduledMinutes)} scheduled, exceeding 24 hours by ${formatMinutes(budget.scheduledMinutes - 1440)}. Consider removing or shortening some events.`,
      event: null,
      conflictsWith: [],
      priority: 'high',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: `sug-${sugId}`,
      type: 'info',
      summary: 'Schedule looks good!',
      reason: 'No immediate suggestions. Your day is balanced and your goals are on track.',
      event: null,
      conflictsWith: [],
      priority: 'low',
    });
  }

  return {
    suggestions,
    overview: 'Smart suggestions based on your schedule and goals (demo mode — connect Claude API for advanced planning).',
    balanceImpact: '',
  };
}

function detectConflicts(suggestion) {
  if (!suggestion.event || suggestion.type === 'info' || suggestion.type === 'remove') return [];
  const ev = suggestion.event;
  if (ev.allDay) return [];
  const newStart = timeToMin(ev.startTime);
  const newEnd = timeToMin(ev.endTime);
  const dayEvents = getEventsWithRecurrences(ev.date, ev.date);
  return dayEvents.filter(e =>
    e.type !== 'task' && !e.allDay &&
    timeToMin(e.startTime) < newEnd && timeToMin(e.endTime) > newStart
  ).map(e => ({ id: e.id || e._parentId, title: e.title, time: `${formatTime12(e.startTime)}-${formatTime12(e.endTime)}` }));
}

function renderAILoading() {
  const el = $('ai-content');
  el.innerHTML = `<div class="ai-loading"><div class="ai-spinner"></div><span class="ai-loading-text">Analyzing your schedule...</span></div>`;
}

function renderAIError(msg) {
  const el = $('ai-content');
  el.innerHTML = `<div class="ai-error">${esc(msg)}</div>`;
}

function renderAISuggestions(result) {
  if (!result) return;
  aiState.suggestions = result.suggestions.map(s => ({ ...s, status: null }));
  const el = $('ai-content');
  let html = '';

  if (result.overview) {
    html += `<div class="ai-overview"><strong>AI Analysis:</strong> ${esc(result.overview)}`;
    if (result.balanceImpact) {
      html += `<div class="ai-balance-impact">${esc(result.balanceImpact)}</div>`;
    }
    html += `</div>`;
  }

  const actionable = result.suggestions.filter(s => s.type !== 'info');
  if (actionable.length > 1) {
    html += `<button class="ai-approve-all" onclick="approveAllSuggestions()">Approve All (${actionable.length} changes)</button>`;
  }

  result.suggestions.forEach((s, i) => {
    const conflicts = detectConflicts(s);
    const typeClass = `ai-sug-type-${s.type}`;
    html += `<div class="ai-suggestion-card" id="ai-sug-${i}">
      <div class="ai-sug-body">
        <div class="ai-sug-header">
          <span class="ai-sug-type ${typeClass}">${s.type}</span>
          <span class="ai-sug-summary">${esc(s.summary)}</span>
        </div>
        <div class="ai-sug-reason">${esc(s.reason)}</div>`;

    if (s.event) {
      const cat = catStyle(s.event.category);
      const timeStr = s.event.allDay ? 'All day' : `${formatTime12(s.event.startTime)} - ${formatTime12(s.event.endTime)}`;
      html += `<div class="ai-sug-event-preview">
        <span class="ai-sug-event-dot" style="background:${cat.color}"></span>
        <span class="ai-sug-event-time">${timeStr}</span>
        <span class="ai-sug-event-title">${esc(s.event.title)}</span>
      </div>`;
    }

    if (conflicts.length > 0) {
      html += `<div class="ai-sug-conflict">Conflicts with: ${conflicts.map(c => esc(c.title) + ' (' + c.time + ')').join(', ')}</div>`;
    }

    html += `</div>`;

    if (s.type !== 'info') {
      html += `<div class="ai-sug-actions">
        <button class="ai-sug-approve" onclick="approveSuggestion(${i})">Approve</button>
        <button class="ai-sug-reject" onclick="rejectSuggestion(${i})">Reject</button>
      </div>`;
    }

    html += `</div>`;
  });

  el.innerHTML = html;
}

function approveSuggestion(index) {
  const s = aiState.suggestions[index];
  if (!s || s.status) return;

  if (s.event && !s.event.allDay && s.event.startTime && s.event.endTime) {
    if (timeToMin(s.event.endTime) <= timeToMin(s.event.startTime)) {
      const corrected = Math.min(timeToMin(s.event.startTime) + 60, 1439);
      s.event.endTime = `${pad(Math.floor(corrected / 60))}:${pad(corrected % 60)}`;
    }
  }

  if (s.type === 'add' && s.event) {
    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: s.event.title,
      date: s.event.date,
      startTime: s.event.startTime || '09:00',
      endTime: s.event.endTime || '10:00',
      allDay: s.event.allDay || false,
      category: s.event.category || 'personal-other',
      description: '',
      type: s.event.type || 'event',
      completed: false,
      recurrence: null,
      seriesId: null,
      isException: false,
      excludedDates: [],
      flexibility: 'flexible',
    };
    state.events.push(newEvent);
    saveEvents();
  } else if (s.type === 'move' && s.targetEventId && s.event) {
    const existing = state.events.find(e => e.id === s.targetEventId);
    if (existing) {
      existing.date = s.event.date || existing.date;
      existing.startTime = s.event.startTime || existing.startTime;
      existing.endTime = s.event.endTime || existing.endTime;
      saveEvents();
    }
  } else if (s.type === 'resize' && s.targetEventId && s.event) {
    const existing = state.events.find(e => e.id === s.targetEventId);
    if (existing) {
      existing.startTime = s.event.startTime || existing.startTime;
      existing.endTime = s.event.endTime || existing.endTime;
      saveEvents();
    }
  } else if (s.type === 'remove' && s.targetEventId) {
    state.events = state.events.filter(e => e.id !== s.targetEventId);
    saveEvents();
  }

  s.status = 'approved';
  markSuggestionDone(index, 'approved');
  renderView();
}

function rejectSuggestion(index) {
  const s = aiState.suggestions[index];
  if (!s || s.status) return;
  s.status = 'rejected';
  markSuggestionDone(index, 'rejected');
}

function markSuggestionDone(index, status) {
  const card = document.getElementById(`ai-sug-${index}`);
  if (!card) return;
  card.classList.add('ai-sug-done');
  const actions = card.querySelector('.ai-sug-actions');
  if (actions) {
    actions.innerHTML = `<div class="ai-sug-status ai-sug-status-${status}">${status}</div>`;
  }
}

function approveAllSuggestions() {
  aiState.suggestions.forEach((s, i) => {
    if (!s.status && s.type !== 'info') {
      approveSuggestion(i);
    }
  });
}

async function handlePlanDay(targetDate) {
  if (aiState.loading) return;
  openAIPanel();
  const context = buildAIContext('plan-day', targetDate);
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

async function handlePlanWeek() {
  if (aiState.loading) return;
  openAIPanel();
  const context = buildAIContext('plan-week');
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

async function handleWhatNow() {
  if (aiState.loading) return;
  openAIPanel();
  const context = buildAIContext('what-now');
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

async function handleAICommand(command) {
  if (aiState.loading || !command.trim()) return;
  aiState.commandHistory = [command, ...aiState.commandHistory.filter(c => c !== command)].slice(0, 10);
  try { localStorage.setItem('chronosAIHistory', JSON.stringify(aiState.commandHistory)); } catch {}
  const context = buildAIContext('command', todayStr(), command.trim());
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

function loadCommandHistory() {
  try {
    const raw = localStorage.getItem('chronosAIHistory');
    aiState.commandHistory = raw ? JSON.parse(raw) : [];
  } catch { aiState.commandHistory = []; }
}

// ── Navigation ──
function navigate(dir) {
  const d = state.currentDate;
  switch (state.currentView) {
    case 'day': d.setDate(d.getDate() + dir); break;
    case '3day': d.setDate(d.getDate() + dir * 3); break;
    case 'week': d.setDate(d.getDate() + dir * 7); break;
    case 'month': d.setMonth(d.getMonth() + dir); break;
    case 'agenda': d.setMonth(d.getMonth() + dir); break;
    case 'year': d.setFullYear(d.getFullYear() + dir); break;
  }
  renderAll();
}

function goToday() {
  state.currentDate = new Date();
  renderAll();
}

function switchView(v) {
  state.currentView = v;
  localStorage.setItem('chronosView', v);
  document.querySelectorAll('.view-switcher button').forEach(b => {
    const isActive = b.dataset.view === v;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', String(isActive));
  });
  if (state.currentPage !== 'calendar') {
    switchPage('calendar');
  } else {
    renderAll();
  }
}

// ── Sidebar ──
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  sidebarEl.classList.toggle('open', state.sidebarOpen);
  overlayEl.classList.toggle('active', state.sidebarOpen);
}

// ── Now Indicator Update ──
function updateNowIndicator() {
  const el = document.getElementById('now-indicator');
  if (!el) return;
  const n = new Date();
  const mins = n.getHours() * 60 + n.getMinutes();
  el.style.top = (mins / 60) * HOUR_H + 'px';
}

// ── Toast Notifications ──
let toastQueue = [];
const MAX_TOASTS = 3;
const TOAST_DURATIONS = { info: 6000, success: 6000, warning: 10000, error: 10000 };

function showToast(message, type = 'info', actionLabel, actionCallback) {
  const container = $('toast-container');
  if (!container) return;
  const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = id;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  const icons = { info: '\u2139\uFE0F', success: '\u2705', warning: '\u26A0\uFE0F', error: '\u274C' };
  let html = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${esc(message)}</span>`;
  if (actionLabel && actionCallback) {
    html += `<button class="toast-action" data-toast-action="true">${esc(actionLabel)}</button>`;
  }
  html += `<button class="toast-close" aria-label="Dismiss">&times;</button>`;
  toast.innerHTML = html;
  const actionBtn = toast.querySelector('[data-toast-action]');
  if (actionBtn) actionBtn.addEventListener('click', () => { actionCallback(); dismissToast(id); });
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(id));
  toastQueue.push(id);
  while (toastQueue.length > MAX_TOASTS) dismissToast(toastQueue[0]);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  const duration = TOAST_DURATIONS[type] || 6000;
  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toastQueue = toastQueue.filter(t => t !== id);
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  setTimeout(() => toast.remove(), 300);
}

// ── Storage Safety ──
function safeSave(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      showToast('Storage is full! Export a backup to avoid data loss.', 'error', 'Export Now', exportBackup);
    }
    return false;
  }
}

function checkStorageUsage() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chronos')) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    if (total > 4 * 1024 * 1024) {
      showToast('Storage is nearly full (' + Math.round(total / 1024 / 1024 * 10) / 10 + 'MB). Export a backup soon.', 'warning', 'Export Now', exportBackup);
    }
  } catch {}
}

// ── Export / Import ──
function gatherAllData() {
  return {
    version: 6,
    exportedAt: new Date().toISOString(),
    events: state.events,
    goals: state.goals,
    preferences: state.preferences,
    categories: state.categories,
    habits: state.habits,
    habitLog: state.habitLog,
    aiHistory: (() => { try { return JSON.parse(localStorage.getItem('chronosAIHistory') || '[]'); } catch { return []; } })(),
    brainDump: state.brainDump,
    energyLog: state.energyLog,
    budgetItems: state.budgetItems,
    mealPlan: state.mealPlan,
    journal: state.journal,
    goalHierarchy: state.goalHierarchy,
  };
}

function exportBackup() {
  const data = gatherAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateSlug = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `lifebalance-backup-${dateSlug}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  state.preferences.lastBackupDate = new Date().toISOString().slice(0, 10);
  savePreferences();
  showToast('Backup exported successfully.', 'success');
}

function validateBackupFile(data) {
  if (!data || typeof data !== 'object') return 'File is not valid JSON.';
  if (!data.version) return 'Missing version field — not a LifeBalance backup.';
  if (!Array.isArray(data.events)) return 'Missing or invalid events array.';
  for (let i = 0; i < data.events.length; i++) {
    const e = data.events[i];
    if (!e.id || !e.title || !e.date) return `Event #${i + 1} is missing required fields (id, title, date).`;
  }
  return null;
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    let data;
    try { data = JSON.parse(e.target.result); } catch { showToast('File is not valid JSON.', 'error'); return; }
    const err = validateBackupFile(data);
    if (err) { showToast(err, 'error'); return; }
    showImportPreview(data);
  };
  reader.readAsText(file);
}

function showImportPreview(data) {
  const events = data.events.filter(e => e.type !== 'task');
  const tasks = data.events.filter(e => e.type === 'task');
  const goals = data.goals ? data.goals.length : 0;
  const cats = data.categories ? data.categories.length : 0;
  const curEvents = state.events.filter(e => e.type !== 'task').length;
  const curTasks = state.events.filter(e => e.type === 'task').length;

  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  overlay.innerHTML = `
    <div class="import-preview-modal">
      <h3>Import Backup</h3>
      <div class="import-preview-body">
        <p><strong>File contains:</strong></p>
        <ul>
          <li>${events.length} events</li>
          <li>${tasks.length} tasks</li>
          <li>${goals} goals</li>
          <li>${cats} categories</li>
          ${data.exportedAt ? `<li>Exported on ${data.exportedAt.slice(0, 10)}</li>` : ''}
        </ul>
        <p class="import-warning">This will <strong>replace all current data</strong> (${curEvents} events, ${curTasks} tasks). Consider exporting a backup first.</p>
      </div>
      <div class="import-preview-actions">
        <button class="btn btn-ghost" id="import-cancel">Cancel</button>
        <button class="btn btn-primary" id="import-confirm">Replace All</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('import-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('import-confirm').addEventListener('click', () => {
    applyImport(data);
    overlay.remove();
  });
}

function applyImport(data) {
  try {
    localStorage.setItem('chronosPreImportBackup', JSON.stringify(gatherAllData()));
  } catch {}
  state.events = data.events;
  saveEvents();
  if (data.goals) { state.goals = data.goals; saveGoals(); }
  if (data.preferences) {
    state.preferences = { ...state.preferences, ...data.preferences };
    savePreferences();
  }
  if (data.categories && Array.isArray(data.categories) && data.categories.length) {
    state.categories = data.categories;
    saveCategories();
    rebuildCategories();
    state.activeCategories = new Set(Object.keys(CATEGORIES));
  }
  if (data.habits && Array.isArray(data.habits)) {
    state.habits = data.habits;
    saveHabits();
  }
  if (data.habitLog && Array.isArray(data.habitLog)) {
    state.habitLog = data.habitLog;
    saveHabitLog();
  }
  if (data.aiHistory) {
    try { localStorage.setItem('chronosAIHistory', JSON.stringify(data.aiHistory)); } catch {}
  }
  if (data.brainDump) { state.brainDump = data.brainDump; saveBrainDump(); }
  if (data.energyLog) { state.energyLog = data.energyLog; saveEnergyLog(); }
  if (data.budgetItems) { state.budgetItems = data.budgetItems; saveBudgetItems(); }
  if (data.mealPlan) { state.mealPlan = data.mealPlan; saveMealPlan(); }
  if (data.journal) { state.journal = data.journal; saveJournal(); }
  if (data.goalHierarchy) { state.goalHierarchy = data.goalHierarchy; saveGoalHierarchy(); }
  renderAll();
  showToast('Backup imported successfully.', 'success');
}

function generateICS() {
  const events = state.events.filter(e => e.type !== 'task' && !e.isException);
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LifeBalance//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
  events.forEach(e => {
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${e.id}@lifebalance\r\n`;
    const d = e.date.replace(/-/g, '');
    if (e.allDay) {
      ics += `DTSTART;VALUE=DATE:${d}\r\n`;
      const next = addDays(new Date(e.date), 1);
      ics += `DTEND;VALUE=DATE:${dateStr(next).replace(/-/g, '')}\r\n`;
    } else {
      ics += `DTSTART:${d}T${(e.startTime || '09:00').replace(':', '')}00\r\n`;
      ics += `DTEND:${d}T${(e.endTime || '10:00').replace(':', '')}00\r\n`;
    }
    if (e.recurrence) {
      ics += buildICSRRule(e.recurrence) + '\r\n';
      if (e.excludedDates?.length) {
        e.excludedDates.forEach(ed => {
          ics += `EXDATE${e.allDay ? ';VALUE=DATE' : ''}:${ed.replace(/-/g, '')}${e.allDay ? '' : 'T' + (e.startTime || '09:00').replace(':', '') + '00'}\r\n`;
        });
      }
    }
    ics += `SUMMARY:${icsEscape(e.title)}\r\n`;
    if (e.description) ics += `DESCRIPTION:${icsEscape(e.description)}\r\n`;
    const cat = catStyle(e.category);
    ics += `CATEGORIES:${icsEscape(cat.label)}\r\n`;
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';
  return ics;
}

function buildICSRRule(rule) {
  const freqMap = { daily: 'DAILY', weekdays: 'WEEKLY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' };
  const dayMap = ['MO','TU','WE','TH','FR','SA','SU'];
  let rrule = `RRULE:FREQ=${freqMap[rule.freq] || 'WEEKLY'}`;
  if (rule.interval && rule.interval > 1) rrule += `;INTERVAL=${rule.interval}`;
  if (rule.freq === 'weekdays') {
    rrule += ';BYDAY=MO,TU,WE,TH,FR';
  } else if (rule.freq === 'weekly' && rule.daysOfWeek?.length) {
    rrule += ';BYDAY=' + rule.daysOfWeek.map(d => dayMap[d]).join(',');
  }
  if (rule.endDate) rrule += `;UNTIL=${rule.endDate.replace(/-/g, '')}T235959`;
  return rrule;
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function exportICS() {
  const ics = generateICS();
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lifebalance-calendar.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Calendar exported as .ics file.', 'success');
}

// ── Backup Reminder ──
let backupReminderShown = false;
function checkBackupReminder() {
  if (backupReminderShown) return;
  const last = state.preferences.lastBackupDate;
  if (!last) {
    backupReminderShown = true;
    showToast("You haven't backed up your data yet. Export a backup to keep it safe.", 'warning', 'Export Now', exportBackup);
    return;
  }
  const lastDate = new Date(last);
  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  if (diffDays >= 7) {
    backupReminderShown = true;
    showToast(`It's been ${diffDays} days since your last backup. Export one now?`, 'warning', 'Export Now', exportBackup);
  }
}

// ── Escape HTML ──
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Render All ──
function renderAll() {
  updateHeading();
  renderView();
  state.miniCalDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  renderMiniCal();
  renderCalList();
}

// ── Event Listeners ──
$('prev-btn').addEventListener('click', () => navigate(-1));
$('next-btn').addEventListener('click', () => navigate(1));
$('today-btn').addEventListener('click', goToday);
$('sidebar-toggle').addEventListener('click', toggleSidebar);
overlayEl.addEventListener('click', toggleSidebar);
$('new-event-btn').addEventListener('click', () => openModal(dateStr(state.currentDate)));
formEl.addEventListener('submit', handleSave);
$('cancel-btn').addEventListener('click', closeModal);
$('modal-close').addEventListener('click', closeModal);
deleteBtn.addEventListener('click', handleDelete);
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
$('mini-prev').addEventListener('click', () => { state.miniCalDate.setMonth(state.miniCalDate.getMonth() - 1); renderMiniCal(); });
$('mini-next').addEventListener('click', () => { state.miniCalDate.setMonth(state.miniCalDate.getMonth() + 1); renderMiniCal(); });
fAllDay.addEventListener('change', () => { fTimeRow.style.display = (fAllDay.checked || state.editingType === 'task') ? 'none' : ''; });

// Sidebar Nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

// Priority Picker
document.querySelectorAll('.prio-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.selectedPriority = btn.dataset.prio;
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });
});
fTitle.addEventListener('input', () => { errTitle.textContent = ''; });
fDate.addEventListener('input', () => { errDate.textContent = ''; });

document.querySelectorAll('.view-switcher button').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// AI Panel
$('ai-panel-close').addEventListener('click', closeAIPanel);
$('ai-plan-day').addEventListener('click', () => handlePlanDay());
$('ai-plan-week').addEventListener('click', () => handlePlanWeek());
$('ai-what-now').addEventListener('click', () => handleWhatNow());
$('ai-command-send').addEventListener('click', () => {
  const input = $('ai-command-input');
  handleAICommand(input.value);
  input.value = '';
});
$('ai-command-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = $('ai-command-input');
    handleAICommand(input.value);
    input.value = '';
  }
});

document.addEventListener('keydown', e => {
  if (!modalEl.classList.contains('hidden')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (aiState.panelOpen && e.key === 'Escape') {
    closeAIPanel();
    return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  switch (e.key) {
    case 't': goToday(); break;
    case 'b': switchPage('dashboard'); break;
    case 'g': switchPage('goals'); break;
    case 'p': handlePlanDay(); break;
    case 'd': switchPage('calendar'); switchView('day'); break;
    case 'w': switchPage('calendar'); switchView('week'); break;
    case 'm': switchPage('calendar'); switchView('month'); break;
    case 'a': switchPage('calendar'); switchView('agenda'); break;
    case 'y': switchPage('calendar'); switchView('year'); break;
    case 'c': openModal(dateStr(state.currentDate)); break;
    case 'ArrowLeft': if (state.currentPage === 'calendar') navigate(-1); break;
    case 'ArrowRight': if (state.currentPage === 'calendar') navigate(1); break;
  }
});

// ── Init ──
state.categories = loadCategories();
rebuildCategories();
state.events = loadEvents();
state.goals = loadGoals();
state.preferences = loadPreferences();
state.habits = loadHabits();
state.habitLog = loadHabitLog();
state.brainDump = loadBrainDump();
state.energyLog = loadEnergyLog();
state.budgetItems = loadBudgetItems();
state.mealPlan = loadMealPlan();
state.journal = loadJournal();
state.goalHierarchy = loadGoalHierarchy();
state.activeCategories = new Set(Object.keys(CATEGORIES));
loadCommandHistory();
state.darkMode = !!state.preferences.darkMode;
if (state.darkMode) document.documentElement.setAttribute('data-theme', 'dark');
else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && state.preferences.darkMode === undefined) {
  state.darkMode = true; document.documentElement.setAttribute('data-theme', 'dark');
}
applyThemeAttributes();
if (LB_EDITION === 'etsy') {
  const toolbarRight = document.querySelector('.toolbar-right');
  if (toolbarRight) {
    const bkBtn = document.createElement('button');
    bkBtn.className = 'btn btn-sm backup-toolbar-btn';
    bkBtn.textContent = 'Export Backup';
    bkBtn.onclick = () => { const d = gatherAllData(); const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lifebalance-backup-${dateStr(new Date())}.json`; a.click(); URL.revokeObjectURL(a.href); showToast('Backup downloaded!'); };
    toolbarRight.insertBefore(bkBtn, toolbarRight.firstChild);
  }
}
state.currentPage = state.preferences.startPage || 'dashboard';
document.querySelectorAll('.view-switcher button').forEach(b => b.classList.toggle('active', b.dataset.view === state.currentView));
renderCalList();
switchPage(state.currentPage);
setInterval(updateNowIndicator, 60000);
checkStorageUsage();
setTimeout(checkBackupReminder, 2000);
setTimeout(showWelcome, 500);

// ── Welcome / Onboarding ──
function showWelcome() {
  if (state.preferences.onboardingComplete) {
    if (LB_EDITION === 'etsy' && state.events.length === 0 && state.habits.length === 0) {
      showToast('Planner is empty. Moved the file or changed browser? Import your backup from Settings.', 'warning', 'Import', () => switchPage('settings'));
    }
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  overlay.id = 'welcome-overlay';
  overlay.innerHTML = `<div class="import-preview-modal welcome-modal">
    <div class="welcome-header">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <h2>Welcome to LifeBalance ${LB_EDITION === 'etsy' ? 'Planner' : 'AI'}</h2>
    </div>
    <p class="welcome-tagline">${LB_EDITION === 'etsy' ? 'The planner that tells you if your life plan is realistic.' : 'Your time. Your priorities. Your life.'}</p>
    <p class="welcome-desc">${LB_EDITION === 'etsy' ? 'LifeBalance Planner helps you plan your time around what matters most. Track time across life categories, set balance goals, build habits, and get AI-ready prompts. Your data stays on this computer — export a backup weekly.' : 'LifeBalance AI helps you plan your time around what matters most. Track how you spend time across life categories, set balance goals, build habits, and let AI suggest a better schedule.'}</p>
    <div class="welcome-steps">
      <div class="welcome-step">
        <span class="welcome-step-num">1</span>
        <div><strong>Add your commitments</strong><br>Create events for work, family, and everything in between.</div>
      </div>
      <div class="welcome-step">
        <span class="welcome-step-num">2</span>
        <div><strong>Set balance goals</strong><br>Choose how many hours per week for each life area.</div>
      </div>
      <div class="welcome-step">
        <span class="welcome-step-num">3</span>
        <div><strong>Ask AI for help</strong><br>Click "Plan My Day" or "What Now?" and let AI optimize your schedule.</div>
      </div>
    </div>
    <div class="welcome-actions">
      <button class="btn btn-ghost" id="welcome-demo">Try with sample data</button>
      <button class="btn btn-primary" id="welcome-start">Get started</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  document.getElementById('welcome-start').addEventListener('click', () => {
    state.preferences.onboardingComplete = true;
    savePreferences();
    overlay.remove();
  });
  document.getElementById('welcome-demo').addEventListener('click', () => {
    loadDemoData();
    state.preferences.onboardingComplete = true;
    savePreferences();
    overlay.remove();
    renderAll();
    showToast('Sample data loaded! Explore the app, then clear it from Settings when ready.', 'success');
  });
}

// ── Demo / Sample Data ──
function loadDemoData() {
  if (state.events.length > 0 || state.habits.length > 0) {
    if (!confirm('This will add sample data alongside your existing data. Continue?')) return;
  }
  const today = todayStr();
  const now = new Date();
  const tomorrow = dateStr(addDays(now, 1));
  const dayAfter = dateStr(addDays(now, 2));
  const prefix = 'demo_';
  const demoEvents = [
    { id: prefix+'sleep', title: 'Sleep', date: today, startTime: '22:00', endTime: '06:00', allDay: true, category: 'sleep', description: '', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
    { id: prefix+'standup', title: 'Team Standup', date: today, startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', description: 'Daily sync', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
    { id: prefix+'focus', title: 'Deep Work', date: today, startTime: '09:30', endTime: '12:00', allDay: false, category: 'work-money', description: 'Focus block', type: 'event', completed: false, recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
    { id: prefix+'lunch', title: 'Lunch', date: today, startTime: '12:00', endTime: '13:00', allDay: false, category: 'food-meals', description: '', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    { id: prefix+'meeting', title: 'Project Review', date: today, startTime: '14:00', endTime: '15:00', allDay: false, category: 'work-money', description: 'Weekly project sync', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [(now.getDay()+6)%7], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
    { id: prefix+'family', title: 'Family Dinner', date: today, startTime: '18:00', endTime: '19:30', allDay: false, category: 'family', description: '', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' },
    { id: prefix+'prayer', title: 'Prayer / Reflection', date: today, startTime: '06:30', endTime: '07:00', allDay: false, category: 'faith', description: '', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'fixed' },
    { id: prefix+'task1', title: 'Review quarterly report', date: today, startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', description: '', type: 'task', completed: false, priority: 'high', recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    { id: prefix+'task2', title: 'Book dentist appointment', date: tomorrow, startTime: '09:00', endTime: '10:00', allDay: false, category: 'personal-other', description: '', type: 'task', completed: false, priority: 'medium', recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    { id: prefix+'task3', title: 'Plan weekend family outing', date: dayAfter, startTime: '09:00', endTime: '10:00', allDay: false, category: 'family', description: '', type: 'task', completed: false, priority: 'medium', recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    { id: prefix+'workout', title: 'Gym / Exercise', date: today, startTime: '07:00', endTime: '08:00', allDay: false, category: 'personal-other', description: '', type: 'event', completed: false, recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0,2,4], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
    { id: prefix+'reading', title: 'Reading Time', date: today, startTime: '21:00', endTime: '21:45', allDay: false, category: 'entertainment', description: '', type: 'event', completed: false, recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null }, seriesId: null, isException: false, excludedDates: [], flexibility: 'flexible' },
  ];
  state.events = state.events.concat(demoEvents);
  saveEvents();
  const demoGoals = [
    { id: prefix+'g1', title: 'Work / Money', category: 'work-money', targetHoursPerWeek: 40, description: '', active: true },
    { id: prefix+'g2', title: 'Family / Relationships', category: 'family', targetHoursPerWeek: 14, description: '', active: true },
    { id: prefix+'g3', title: 'Faith', category: 'faith', targetHoursPerWeek: 7, description: '', active: true },
    { id: prefix+'g4', title: 'Personal / Other', category: 'personal-other', targetHoursPerWeek: 5, description: '', active: true },
    { id: prefix+'g5', title: 'Entertainment / Recreation', category: 'entertainment', targetHoursPerWeek: 7, description: '', active: true },
    { id: prefix+'g6', title: 'Sleep', category: 'sleep', targetHoursPerWeek: 49, description: '', active: true },
  ];
  if (state.goals.length === 0) { state.goals = demoGoals; saveGoals(); }
  const demoHabits = [
    { id: prefix+'h1', name: 'Exercise', category: 'personal-other', targetFrequency: { type: 'custom', timesPerWeek: 3, daysOfWeek: [0,2,4] }, preferredTime: '07:00', duration: 60, priority: 'high', status: 'active', startDate: today, endDate: null, notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: prefix+'h2', name: 'Read 30 minutes', category: 'entertainment', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, preferredTime: '21:00', duration: 30, priority: 'medium', status: 'active', startDate: today, endDate: null, notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: prefix+'h3', name: 'Morning prayer', category: 'faith', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, preferredTime: '06:30', duration: 30, priority: 'high', status: 'active', startDate: today, endDate: null, notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: prefix+'h4', name: 'Drink 8 glasses of water', category: 'personal-other', targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [0,1,2,3,4,5,6] }, preferredTime: null, duration: 5, priority: 'low', status: 'active', startDate: today, endDate: null, notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
  if (state.habits.length === 0) { state.habits = demoHabits; saveHabits(); }
  state.preferences.hasDemoData = true;
  savePreferences();
}

function clearDemoData() {
  if (!confirm('Remove all sample data? Your own data will be kept.')) return;
  state.events = state.events.filter(e => !e.id.startsWith('demo_'));
  state.goals = state.goals.filter(g => !g.id.startsWith('demo_'));
  state.habits = state.habits.filter(h => !h.id.startsWith('demo_'));
  state.habitLog = state.habitLog.filter(l => !l.habitId.startsWith('demo_'));
  saveEvents(); saveGoals(); saveHabits(); saveHabitLog();
  state.preferences.hasDemoData = false;
  savePreferences();
  renderAll();
  showToast('Sample data removed.', 'info');
}

// ── Test Exports ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pad, fmtDate, dateStr, timeToMin, getMonday, addDays, daysInMonth, formatHour,
    formatMinutes, formatTime12,
    seedDefaultCategories, generateColorVariants, toKebabCase, uniqueCategoryId,
    calculateDayBudget, calculateWeekBudget, calculateBalanceScore,
    gatherAllData, validateBackupFile, generateICS, icsEscape, buildICSRRule, applyImport,
    categoryExists, rebuildCategories, getAllCategories,
    safeSave, checkStorageUsage, checkBackupReminder,
    generateOccurrences, getEventsWithRecurrences,
    editRecurringSingle, editRecurringFuture, editRecurringAll,
    deleteRecurringSingle, deleteRecurringFuture, deleteRecurringAll,
    isHabitDueOnDate, getHabitStreak, getHabitWeeklyCompletion, logHabitCompletion, getHabitLogEntry,
    loadHabits, saveHabits, loadHabitLog, saveHabitLog,
    addBrainDumpItem, removeBrainDumpItem, loadBrainDump, saveBrainDump,
    logEnergy, getEnergyForDate, loadEnergyLog, saveEnergyLog,
    addBudgetItem, removeBudgetItem, getBudgetTotals, loadBudgetItems, saveBudgetItems,
    setMeal, getGroceryList, loadMealPlan, saveMealPlan,
    getJournalEntry, setJournalEntry, loadJournal, saveJournal,
    addSubtask, toggleSubtask, removeSubtask, getSubtaskProgress,
    loadGoalHierarchy, saveGoalHierarchy, updateGoalHierarchy,
    startFocusTimer, pauseFocusTimer, resetFocusTimer,
    buildAIPrompt, copyAIPrompt,
    getActiveCategories: () => CATEGORIES,
    CATEGORY_MIGRATION, DEFAULT_CATEGORIES,
    state,
  };
}
