import { describe, it, expect, beforeEach } from 'vitest';

const app = require('../app.js');
const { calculateDayBudget, calculateWeekBudget, calculateBalanceScore, state, seedDefaultCategories, rebuildCategories } = app;

beforeEach(() => {
  state.categories = seedDefaultCategories();
  rebuildCategories();
  state.events = [];
  state.goals = [];
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
});

describe('calculateDayBudget', () => {
  it('returns 1440 free minutes for empty day', () => {
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.freeMinutes).toBe(1440);
    expect(budget.scheduledMinutes).toBe(0);
    expect(budget.overbooked).toBe(false);
  });

  it('calculates single event duration', () => {
    state.events = [
      { id: 'e1', title: 'Work', date: '2026-10-05', startTime: '09:00', endTime: '11:00', allDay: false, category: 'work-money', type: 'event' },
    ];
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.scheduledMinutes).toBe(120);
    expect(budget.freeMinutes).toBe(1320);
    expect(budget.categoryTotals['work-money']).toBe(120);
  });

  it('sums multiple events', () => {
    state.events = [
      { id: 'e1', title: 'Work', date: '2026-10-05', startTime: '09:00', endTime: '11:00', allDay: false, category: 'work-money', type: 'event' },
      { id: 'e2', title: 'Lunch', date: '2026-10-05', startTime: '12:00', endTime: '13:00', allDay: false, category: 'food-meals', type: 'event' },
    ];
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.scheduledMinutes).toBe(180);
    expect(budget.categoryTotals['work-money']).toBe(120);
    expect(budget.categoryTotals['food-meals']).toBe(60);
  });

  it('uses sleepHours for all-day sleep events', () => {
    state.events = [
      { id: 'e1', title: 'Sleep', date: '2026-10-05', allDay: true, category: 'sleep', type: 'event' },
    ];
    state.preferences.sleepHours = 8;
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.categoryTotals['sleep']).toBe(480);
  });

  it('uses workHoursTarget for all-day work events', () => {
    state.events = [
      { id: 'e1', title: 'Work', date: '2026-10-05', allDay: true, category: 'work-money', type: 'event' },
    ];
    state.preferences.workHoursTarget = 6;
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.categoryTotals['work-money']).toBe(360);
  });

  it('detects overbooking', () => {
    state.events = [
      { id: 'e1', title: 'A', date: '2026-10-05', startTime: '00:00', endTime: '12:00', allDay: false, category: 'work-money', type: 'event' },
      { id: 'e2', title: 'B', date: '2026-10-05', startTime: '12:00', endTime: '23:59', allDay: false, category: 'work-money', type: 'event' },
      { id: 'e3', title: 'C', date: '2026-10-05', startTime: '23:00', endTime: '23:59', allDay: false, category: 'work-money', type: 'event' },
    ];
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.overbooked).toBe(true);
  });

  it('excludes tasks from budget', () => {
    state.events = [
      { id: 't1', title: 'Task', date: '2026-10-05', category: 'work-money', type: 'task', completed: false },
      { id: 'e1', title: 'Work', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'event' },
    ];
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.scheduledMinutes).toBe(60);
  });

  it('ignores events on other dates', () => {
    state.events = [
      { id: 'e1', title: 'Work', date: '2026-10-06', startTime: '09:00', endTime: '17:00', allDay: false, category: 'work-money', type: 'event' },
    ];
    const budget = calculateDayBudget('2026-10-05');
    expect(budget.scheduledMinutes).toBe(0);
  });
});

describe('calculateWeekBudget', () => {
  it('sums across a week', () => {
    state.events = [
      { id: 'e1', title: 'Mon', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'event' },
      { id: 'e2', title: 'Tue', date: '2026-10-06', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'event' },
    ];
    const budget = calculateWeekBudget(new Date(2026, 9, 5));
    expect(budget.categoryTotals['work-money']).toBe(120);
    expect(budget.totalScheduledMinutes).toBe(120);
  });
});

describe('calculateBalanceScore', () => {
  it('returns null when no goals', () => {
    const score = calculateBalanceScore(new Date(2026, 9, 5));
    expect(score).toBeNull();
  });

  it('returns 100 when perfectly balanced', () => {
    state.goals = [{ id: 'g1', category: 'work-money', targetHoursPerWeek: 1, active: true }];
    state.events = [
      { id: 'e1', title: 'Work', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', type: 'event' },
    ];
    const score = calculateBalanceScore(new Date(2026, 9, 5));
    expect(score).toBe(100);
  });

  it('returns 0 when no time spent on goals', () => {
    state.goals = [{ id: 'g1', category: 'work-money', targetHoursPerWeek: 10, active: true }];
    const score = calculateBalanceScore(new Date(2026, 9, 5));
    expect(score).toBe(0);
  });

  it('ignores inactive goals', () => {
    state.goals = [{ id: 'g1', category: 'work-money', targetHoursPerWeek: 10, active: false }];
    const score = calculateBalanceScore(new Date(2026, 9, 5));
    expect(score).toBeNull();
  });
});
