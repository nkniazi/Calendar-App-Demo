import { describe, it, expect, beforeEach } from 'vitest';

const app = require('../app.js');
const {
  calculateDayBudget, calculateWeekBudget,
  generateOccurrences, getEventsWithRecurrences,
  buildICSRRule, generateICS, gatherAllData, validateBackupFile,
  state, seedDefaultCategories, rebuildCategories,
} = app;

function makeRecurring(overrides = {}) {
  return {
    id: 'rec1', title: 'Standup', date: '2026-10-05',
    startTime: '09:00', endTime: '09:30', allDay: false,
    category: 'work-money', type: 'event',
    recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null },
    seriesId: null, isException: false, excludedDates: [],
    flexibility: 'protected',
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
});

describe('calculateDayBudget with recurrence', () => {
  it('includes recurring event occurrences in budget', () => {
    state.events = [makeRecurring()];
    const budget = calculateDayBudget('2026-10-06');
    expect(budget.scheduledMinutes).toBe(30);
    expect(budget.categoryTotals['work-money']).toBe(30);
  });

  it('includes both recurring and one-off events', () => {
    state.events = [
      makeRecurring(),
      { id: 'e2', title: 'Lunch', date: '2026-10-06', startTime: '12:00', endTime: '13:00', allDay: false, category: 'food-meals', type: 'event', recurrence: null, isException: false },
    ];
    const budget = calculateDayBudget('2026-10-06');
    expect(budget.scheduledMinutes).toBe(90);
    expect(budget.categoryTotals['work-money']).toBe(30);
    expect(budget.categoryTotals['food-meals']).toBe(60);
  });

  it('excludes skipped recurring occurrence', () => {
    state.events = [makeRecurring({ excludedDates: ['2026-10-06'] })];
    const budget = calculateDayBudget('2026-10-06');
    expect(budget.scheduledMinutes).toBe(0);
  });
});

describe('calculateWeekBudget with recurrence', () => {
  it('sums daily recurring event across the week', () => {
    state.events = [makeRecurring()];
    const budget = calculateWeekBudget(new Date(2026, 9, 5));
    expect(budget.categoryTotals['work-money']).toBe(210);
    expect(budget.totalScheduledMinutes).toBe(210);
  });
});

describe('flexibility defaults', () => {
  it('uses protected for work events by default', () => {
    const ev = makeRecurring();
    expect(ev.flexibility).toBe('protected');
  });
});

describe('buildICSRRule', () => {
  it('builds daily RRULE', () => {
    const rule = { freq: 'daily', interval: 1, daysOfWeek: [], endDate: null };
    const rrule = buildICSRRule(rule);
    expect(rrule).toContain('FREQ=DAILY');
  });

  it('builds weekly RRULE with days', () => {
    const rule = { freq: 'weekly', interval: 2, daysOfWeek: [0, 4], endDate: null };
    const rrule = buildICSRRule(rule);
    expect(rrule).toContain('FREQ=WEEKLY');
    expect(rrule).toContain('INTERVAL=2');
    expect(rrule).toContain('BYDAY=');
  });

  it('builds RRULE with UNTIL', () => {
    const rule = { freq: 'daily', interval: 1, daysOfWeek: [], endDate: '2026-12-31' };
    const rrule = buildICSRRule(rule);
    expect(rrule).toContain('UNTIL=20261231');
  });

  it('builds monthly RRULE', () => {
    const rule = { freq: 'monthly', interval: 1, daysOfWeek: [], endDate: null };
    const rrule = buildICSRRule(rule);
    expect(rrule).toContain('FREQ=MONTHLY');
  });

  it('builds weekdays as weekly with BYDAY', () => {
    const rule = { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null };
    const rrule = buildICSRRule(rule);
    expect(rrule).toContain('FREQ=WEEKLY');
    expect(rrule).toContain('MO');
    expect(rrule).toContain('FR');
  });
});

describe('generateICS with recurrence', () => {
  it('includes RRULE for recurring events', () => {
    state.events = [makeRecurring()];
    const ics = generateICS();
    expect(ics).toContain('RRULE:');
    expect(ics).toContain('FREQ=DAILY');
  });

  it('includes EXDATE for excluded dates', () => {
    state.events = [makeRecurring({ excludedDates: ['2026-10-07'] })];
    const ics = generateICS();
    expect(ics).toContain('EXDATE');
    expect(ics).toContain('20261007');
  });
});

describe('gatherAllData V6', () => {
  it('includes habits and habitLog', () => {
    state.habits = [{ id: 'h1', name: 'Test', category: 'personal-other', targetFrequency: { type: 'daily' }, status: 'active', startDate: '2026-01-01' }];
    state.habitLog = [{ habitId: 'h1', date: '2026-10-06', status: 'completed', notes: '' }];
    const data = gatherAllData();
    expect(data.habits).toEqual(state.habits);
    expect(data.habitLog).toEqual(state.habitLog);
    expect(data.version).toBe(6);
  });
});

describe('validateBackupFile with V6 data', () => {
  it('accepts valid V6 backup (returns null = no error)', () => {
    const backup = {
      version: 6,
      events: [],
      goals: [],
      preferences: { sleepHours: 7 },
      exportedAt: new Date().toISOString(),
      habits: [],
      habitLog: [],
    };
    const result = validateBackupFile(backup);
    expect(result).toBeNull();
  });
});
