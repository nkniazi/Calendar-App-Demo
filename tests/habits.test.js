import { describe, it, expect, beforeEach, vi } from 'vitest';

const app = require('../app.js');
const {
  isHabitDueOnDate, getHabitStreak, getHabitWeeklyCompletion,
  logHabitCompletion, getHabitLogEntry,
  loadHabits, saveHabits, loadHabitLog, saveHabitLog,
  state, seedDefaultCategories, rebuildCategories,
} = app;

function makeHabit(overrides = {}) {
  return {
    id: 'hab_1', name: 'Exercise', category: 'personal-other',
    targetFrequency: { type: 'daily', timesPerWeek: 7, daysOfWeek: [] },
    preferredTime: '07:00', duration: 30,
    priority: 'medium', status: 'active',
    startDate: '2026-01-01', endDate: null,
    notes: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  state.categories = seedDefaultCategories();
  rebuildCategories();
  state.events = [];
  state.habits = [];
  state.habitLog = [];
  state.goals = [];
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
  localStorage.clear();
});

describe('isHabitDueOnDate', () => {
  it('returns true for daily habit on any date after start', () => {
    const h = makeHabit();
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(true);
  });

  it('returns false for inactive habit', () => {
    const h = makeHabit({ status: 'inactive' });
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(false);
  });

  it('returns false before start date', () => {
    const h = makeHabit({ startDate: '2026-12-01' });
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(false);
  });

  it('returns false after end date', () => {
    const h = makeHabit({ endDate: '2026-09-30' });
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(false);
  });

  it('weekday habit only on Mon-Fri', () => {
    const h = makeHabit({ targetFrequency: { type: 'weekdays', timesPerWeek: 5, daysOfWeek: [] } });
    expect(isHabitDueOnDate(h, '2026-10-05')).toBe(true);
    expect(isHabitDueOnDate(h, '2026-10-10')).toBe(false);
  });

  it('custom days habit on selected days only', () => {
    const h = makeHabit({ targetFrequency: { type: 'custom', timesPerWeek: 3, daysOfWeek: [0, 2, 4] } });
    expect(isHabitDueOnDate(h, '2026-10-05')).toBe(true);
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(false);
    expect(isHabitDueOnDate(h, '2026-10-07')).toBe(true);
  });

  it('weekly habit on selected days', () => {
    const h = makeHabit({ targetFrequency: { type: 'weekly', timesPerWeek: 2, daysOfWeek: [0, 4] } });
    expect(isHabitDueOnDate(h, '2026-10-05')).toBe(true);
    expect(isHabitDueOnDate(h, '2026-10-09')).toBe(true);
    expect(isHabitDueOnDate(h, '2026-10-06')).toBe(false);
  });
});

describe('logHabitCompletion', () => {
  it('adds a new log entry', () => {
    state.habits = [makeHabit()];
    logHabitCompletion('hab_1', '2026-10-06', 'completed', 'Ran 5k');
    const entry = getHabitLogEntry('hab_1', '2026-10-06');
    expect(entry).toBeTruthy();
    expect(entry.status).toBe('completed');
    expect(entry.notes).toBe('Ran 5k');
  });

  it('updates existing log entry', () => {
    state.habits = [makeHabit()];
    logHabitCompletion('hab_1', '2026-10-06', 'completed', '');
    logHabitCompletion('hab_1', '2026-10-06', 'skipped', 'Too tired');
    const entry = getHabitLogEntry('hab_1', '2026-10-06');
    expect(entry.status).toBe('skipped');
    expect(entry.notes).toBe('Too tired');
    expect(state.habitLog.filter(e => e.habitId === 'hab_1' && e.date === '2026-10-06').length).toBe(1);
  });
});

describe('getHabitStreak', () => {
  it('returns 0 when no completions', () => {
    state.habits = [makeHabit()];
    expect(getHabitStreak('hab_1')).toBe(0);
  });

  it('counts consecutive completed days ending today', () => {
    state.habits = [makeHabit()];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const ydStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dbStr = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth()+1).padStart(2,'0')}-${String(dayBefore.getDate()).padStart(2,'0')}`;

    state.habitLog = [
      { habitId: 'hab_1', date: todayStr, status: 'completed', notes: '' },
      { habitId: 'hab_1', date: ydStr, status: 'completed', notes: '' },
      { habitId: 'hab_1', date: dbStr, status: 'completed', notes: '' },
    ];
    expect(getHabitStreak('hab_1')).toBe(3);
  });

  it('streak starts from yesterday if not done today', () => {
    state.habits = [makeHabit()];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const ydStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dbStr = `${dayBefore.getFullYear()}-${String(dayBefore.getMonth()+1).padStart(2,'0')}-${String(dayBefore.getDate()).padStart(2,'0')}`;

    state.habitLog = [
      { habitId: 'hab_1', date: ydStr, status: 'completed', notes: '' },
      { habitId: 'hab_1', date: dbStr, status: 'completed', notes: '' },
    ];
    expect(getHabitStreak('hab_1')).toBe(2);
  });

  it('breaks streak on skipped day', () => {
    state.habits = [makeHabit()];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const dayBefore2 = new Date(today);
    dayBefore2.setDate(dayBefore2.getDate() - 2);
    const db2Str = `${dayBefore2.getFullYear()}-${String(dayBefore2.getMonth()+1).padStart(2,'0')}-${String(dayBefore2.getDate()).padStart(2,'0')}`;

    state.habitLog = [
      { habitId: 'hab_1', date: todayStr, status: 'completed', notes: '' },
      { habitId: 'hab_1', date: db2Str, status: 'completed', notes: '' },
    ];
    expect(getHabitStreak('hab_1')).toBe(1);
  });
});

describe('getHabitWeeklyCompletion', () => {
  it('calculates rate for a daily habit', () => {
    state.habits = [makeHabit()];
    const weekStart = new Date('2026-10-05T00:00:00');
    state.habitLog = [
      { habitId: 'hab_1', date: '2026-10-05', status: 'completed', notes: '' },
      { habitId: 'hab_1', date: '2026-10-06', status: 'completed', notes: '' },
      { habitId: 'hab_1', date: '2026-10-07', status: 'completed', notes: '' },
    ];
    const result = getHabitWeeklyCompletion('hab_1', weekStart);
    expect(result.expected).toBe(7);
    expect(result.completed).toBe(3);
    expect(result.rate).toBe(43);
  });

  it('returns zero for nonexistent habit', () => {
    const result = getHabitWeeklyCompletion('nonexistent', new Date('2026-10-05T00:00:00'));
    expect(result).toEqual({ completed: 0, expected: 0, rate: 0 });
  });

  it('counts only completed, not skipped', () => {
    state.habits = [makeHabit()];
    state.habitLog = [
      { habitId: 'hab_1', date: '2026-10-05', status: 'completed', notes: '' },
      { habitId: 'hab_1', date: '2026-10-06', status: 'skipped', notes: '' },
    ];
    const result = getHabitWeeklyCompletion('hab_1', new Date('2026-10-05T00:00:00'));
    expect(result.completed).toBe(1);
  });
});

describe('habit storage', () => {
  it('saves and loads habits', () => {
    state.habits = [makeHabit()];
    saveHabits();
    state.habits = [];
    state.habits = loadHabits();
    expect(state.habits.length).toBe(1);
    expect(state.habits[0].name).toBe('Exercise');
  });

  it('saves and loads habit log', () => {
    state.habitLog = [{ habitId: 'hab_1', date: '2026-10-06', status: 'completed', notes: '' }];
    saveHabitLog();
    state.habitLog = [];
    state.habitLog = loadHabitLog();
    expect(state.habitLog.length).toBe(1);
    expect(state.habitLog[0].status).toBe('completed');
  });
});
