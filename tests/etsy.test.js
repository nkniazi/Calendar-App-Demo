import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from './setup.js';

const app = require('../app.js');
const {
  addBrainDumpItem, removeBrainDumpItem, loadBrainDump, saveBrainDump,
  logEnergy, getEnergyForDate, loadEnergyLog, saveEnergyLog,
  addBudgetItem, removeBudgetItem, getBudgetTotals, loadBudgetItems, saveBudgetItems,
  setMeal, getGroceryList, loadMealPlan, saveMealPlan,
  getJournalEntry, setJournalEntry, loadJournal, saveJournal,
  addSubtask, toggleSubtask, removeSubtask, getSubtaskProgress,
  buildAIPrompt,
  state, seedDefaultCategories, rebuildCategories,
} = app;

beforeEach(() => {
  resetStore();
  state.categories = seedDefaultCategories();
  rebuildCategories();
  state.events = [];
  state.goals = [];
  state.habits = [];
  state.habitLog = [];
  state.brainDump = [];
  state.energyLog = [];
  state.budgetItems = [];
  state.mealPlan = {};
  state.journal = {};
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
});

describe('Brain Dump', () => {
  it('adds items', () => {
    addBrainDumpItem('Buy milk');
    addBrainDumpItem('Call dentist');
    expect(state.brainDump).toHaveLength(2);
    expect(state.brainDump[0].text).toBe('Buy milk');
    expect(state.brainDump[1].text).toBe('Call dentist');
  });

  it('ignores empty text', () => {
    addBrainDumpItem('');
    addBrainDumpItem('   ');
    expect(state.brainDump).toHaveLength(0);
  });

  it('removes items by id', () => {
    addBrainDumpItem('Test item');
    const id = state.brainDump[0].id;
    removeBrainDumpItem(id);
    expect(state.brainDump).toHaveLength(0);
  });

  it('items have id and createdAt', () => {
    addBrainDumpItem('Test');
    expect(state.brainDump[0].id).toBeTruthy();
    expect(state.brainDump[0].createdAt).toBeTruthy();
  });
});

describe('Energy / Mood Log', () => {
  it('logs energy and mood', () => {
    logEnergy('2026-10-06', 4, 3);
    const entry = getEnergyForDate('2026-10-06');
    expect(entry.energy).toBe(4);
    expect(entry.mood).toBe(3);
  });

  it('updates existing entry', () => {
    logEnergy('2026-10-06', 3, 3);
    logEnergy('2026-10-06', 5, 5);
    expect(state.energyLog).toHaveLength(1);
    expect(getEnergyForDate('2026-10-06').energy).toBe(5);
  });

  it('returns null for missing date', () => {
    expect(getEnergyForDate('2099-01-01')).toBeNull();
  });
});

describe('Budget Tracker', () => {
  it('adds income and expense', () => {
    addBudgetItem('2026-10', 'income', 'Salary', 5000);
    addBudgetItem('2026-10', 'expense', 'Rent', 1500);
    expect(state.budgetItems).toHaveLength(2);
  });

  it('calculates totals correctly', () => {
    addBudgetItem('2026-10', 'income', 'Salary', 5000);
    addBudgetItem('2026-10', 'income', 'Side gig', 500);
    addBudgetItem('2026-10', 'expense', 'Rent', 1500);
    addBudgetItem('2026-10', 'expense', 'Food', 400.50);
    const totals = getBudgetTotals('2026-10');
    expect(totals.income).toBe(5500);
    expect(totals.expenses).toBe(1900.50);
    expect(totals.balance).toBe(3599.50);
  });

  it('separates months', () => {
    addBudgetItem('2026-10', 'income', 'Oct', 100);
    addBudgetItem('2026-11', 'income', 'Nov', 200);
    expect(getBudgetTotals('2026-10').income).toBe(100);
    expect(getBudgetTotals('2026-11').income).toBe(200);
  });

  it('removes items', () => {
    addBudgetItem('2026-10', 'income', 'Test', 100);
    const id = state.budgetItems[0].id;
    removeBudgetItem(id);
    expect(state.budgetItems).toHaveLength(0);
  });

  it('rounds amounts to 2 decimals', () => {
    addBudgetItem('2026-10', 'income', 'Test', 99.999);
    expect(state.budgetItems[0].amount).toBe(100);
  });
});

describe('Meal Planner & Grocery List', () => {
  it('sets meals', () => {
    setMeal('2026-10-05', '2026-10-05', 'breakfast', 'Oatmeal', 'oats, milk, honey');
    expect(state.mealPlan['2026-10-05']['2026-10-05']['breakfast'].meal).toBe('Oatmeal');
  });

  it('aggregates grocery list', () => {
    setMeal('wk1', 'mon', 'breakfast', 'Oatmeal', 'oats, milk, honey');
    setMeal('wk1', 'tue', 'breakfast', 'Oatmeal', 'oats, milk, berries');
    const list = getGroceryList('wk1');
    expect(list.find(i => i.name === 'oats').count).toBe(2);
    expect(list.find(i => i.name === 'milk').count).toBe(2);
    expect(list.find(i => i.name === 'honey').count).toBe(1);
    expect(list.find(i => i.name === 'berries').count).toBe(1);
  });

  it('dedupes case-insensitive', () => {
    setMeal('wk1', 'mon', 'lunch', 'Salad', 'Lettuce, Tomato');
    setMeal('wk1', 'tue', 'lunch', 'Salad', 'lettuce, cucumber');
    const list = getGroceryList('wk1');
    expect(list.find(i => i.name === 'lettuce').count).toBe(2);
  });

  it('empty grocery list for no meals', () => {
    expect(getGroceryList('empty-week')).toEqual([]);
  });
});

describe('Journal', () => {
  it('gets default entry', () => {
    const entry = getJournalEntry('2026-10-06');
    expect(entry.gratitude).toEqual(['', '', '']);
    expect(entry.notes).toBe('');
  });

  it('sets and retrieves entry', () => {
    setJournalEntry('2026-10-06', { gratitude: ['sun', 'coffee', 'family'], notes: 'Good day' });
    const entry = getJournalEntry('2026-10-06');
    expect(entry.gratitude[0]).toBe('sun');
    expect(entry.notes).toBe('Good day');
  });
});

describe('Subtasks', () => {
  beforeEach(() => {
    state.events = [{ id: 't1', title: 'Task', date: '2026-10-06', type: 'task', completed: false, category: 'work-money', startTime: '09:00', endTime: '10:00', allDay: false }];
  });

  it('adds subtasks', () => {
    addSubtask('t1', 'Step 1');
    addSubtask('t1', 'Step 2');
    expect(state.events[0].subtasks).toHaveLength(2);
  });

  it('toggles subtask completion', () => {
    addSubtask('t1', 'Step 1');
    const stId = state.events[0].subtasks[0].id;
    toggleSubtask('t1', stId);
    expect(state.events[0].subtasks[0].done).toBe(true);
    toggleSubtask('t1', stId);
    expect(state.events[0].subtasks[0].done).toBe(false);
  });

  it('removes subtask', () => {
    addSubtask('t1', 'Step 1');
    addSubtask('t1', 'Step 2');
    const stId = state.events[0].subtasks[0].id;
    removeSubtask('t1', stId);
    expect(state.events[0].subtasks).toHaveLength(1);
  });

  it('calculates progress', () => {
    addSubtask('t1', 'A');
    addSubtask('t1', 'B');
    addSubtask('t1', 'C');
    toggleSubtask('t1', state.events[0].subtasks[0].id);
    const progress = getSubtaskProgress(state.events[0]);
    expect(progress.done).toBe(1);
    expect(progress.total).toBe(3);
  });

  it('returns null for no subtasks', () => {
    expect(getSubtaskProgress(state.events[0])).toBeNull();
  });
});

describe('AI Prompt Builder', () => {
  it('builds a prompt string', () => {
    const prompt = buildAIPrompt('plan-week');
    expect(prompt).toContain('LifeBalance Planner');
    expect(prompt).toContain('Request');
  });

  it('includes events in prompt', () => {
    const today = new Date().toISOString().slice(0, 10);
    state.events = [{ id: 'e1', title: 'Meeting', date: today, startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'event', recurrence: null, seriesId: null, isException: false, excludedDates: [], flexibility: 'protected' }];
    const prompt = buildAIPrompt('plan-week');
    expect(prompt).toContain('Meeting');
  });

  it('includes habits in prompt', () => {
    const today = new Date().toISOString().slice(0, 10);
    state.habits = [{ id: 'h1', name: 'Exercise', category: 'personal-other', targetFrequency: { type: 'daily', daysOfWeek: [0,1,2,3,4,5,6] }, duration: 30, priority: 'high', status: 'active', startDate: today }];
    const prompt = buildAIPrompt('what-now');
    expect(prompt).toContain('Exercise');
  });

  it('fix-habits action includes specific text', () => {
    const prompt = buildAIPrompt('fix-habits');
    expect(prompt).toContain('habits');
    expect(prompt).toContain('strategies');
  });
});

describe('Edition Flag', () => {
  it('LB_EDITION is defined', () => {
    expect(typeof globalThis.__LB_EDITION__).not.toBe(undefined);
  });
});
