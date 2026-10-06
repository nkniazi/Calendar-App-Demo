import { describe, it, expect, beforeEach } from 'vitest';

const app = require('../app.js');
const {
  generateOccurrences, getEventsWithRecurrences,
  editRecurringSingle, editRecurringFuture, editRecurringAll,
  deleteRecurringSingle, deleteRecurringFuture, deleteRecurringAll,
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
  state.goals = [];
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
});

describe('generateOccurrences', () => {
  it('generates daily occurrences within range', () => {
    const ev = makeRecurring();
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-09');
    expect(occs.length).toBe(5);
    expect(occs[0].date).toBe('2026-10-05');
    expect(occs[4].date).toBe('2026-10-09');
    expect(occs[0]._generated).toBe(true);
    expect(occs[0]._parentId).toBe('rec1');
  });

  it('generates weekly occurrences', () => {
    const ev = makeRecurring({ recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0], endDate: null } });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-26');
    expect(occs.length).toBe(4);
    occs.forEach(o => {
      const d = new Date(o.date + 'T00:00:00');
      expect((d.getDay() + 6) % 7).toBe(0);
    });
  });

  it('generates monthly occurrences', () => {
    const ev = makeRecurring({
      date: '2026-01-15',
      recurrence: { freq: 'monthly', interval: 1, daysOfWeek: [], endDate: null },
    });
    const occs = generateOccurrences(ev, '2026-01-01', '2026-06-30');
    expect(occs.length).toBe(6);
    expect(occs[0].date).toBe('2026-01-15');
    expect(occs[5].date).toBe('2026-06-15');
  });

  it('generates yearly occurrences', () => {
    const ev = makeRecurring({
      date: '2026-03-10',
      recurrence: { freq: 'yearly', interval: 1, daysOfWeek: [], endDate: null },
    });
    const occs = generateOccurrences(ev, '2026-01-01', '2029-12-31');
    expect(occs.length).toBe(4);
    expect(occs.map(o => o.date)).toEqual(['2026-03-10', '2027-03-10', '2028-03-10', '2029-03-10']);
  });

  it('generates weekday-only occurrences', () => {
    const ev = makeRecurring({ recurrence: { freq: 'weekdays', interval: 1, daysOfWeek: [], endDate: null } });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-11');
    occs.forEach(o => {
      const d = new Date(o.date + 'T00:00:00');
      const dow = (d.getDay() + 6) % 7;
      expect(dow).toBeLessThan(5);
    });
    expect(occs.length).toBe(5);
  });

  it('respects interval (every 2 weeks)', () => {
    const ev = makeRecurring({
      recurrence: { freq: 'weekly', interval: 2, daysOfWeek: [0], endDate: null },
    });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-11-30');
    expect(occs.length).toBe(5);
    expect(occs[0].date).toBe('2026-10-05');
    expect(occs[1].date).toBe('2026-10-19');
    expect(occs[2].date).toBe('2026-11-02');
  });

  it('respects endDate', () => {
    const ev = makeRecurring({
      recurrence: { freq: 'daily', interval: 1, daysOfWeek: [], endDate: '2026-10-07' },
    });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-20');
    expect(occs.length).toBe(3);
    expect(occs[2].date).toBe('2026-10-07');
  });

  it('respects excludedDates', () => {
    const ev = makeRecurring({ excludedDates: ['2026-10-06', '2026-10-08'] });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-09');
    expect(occs.length).toBe(3);
    expect(occs.map(o => o.date)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09']);
  });

  it('returns empty for non-recurring event', () => {
    const ev = { ...makeRecurring(), recurrence: null };
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-09');
    expect(occs.length).toBe(0);
  });

  it('caps at 366 occurrences', () => {
    const ev = makeRecurring();
    const occs = generateOccurrences(ev, '2026-10-05', '2028-10-05');
    expect(occs.length).toBeLessThanOrEqual(366);
  });

  it('generates selected days of week', () => {
    const ev = makeRecurring({
      recurrence: { freq: 'weekly', interval: 1, daysOfWeek: [0, 2, 4], endDate: null },
    });
    const occs = generateOccurrences(ev, '2026-10-05', '2026-10-11');
    expect(occs.length).toBe(3);
  });
});

describe('getEventsWithRecurrences', () => {
  it('returns non-recurring events in range', () => {
    state.events = [
      { id: 'e1', title: 'One-off', date: '2026-10-06', startTime: '10:00', endTime: '11:00', allDay: false, category: 'work-money', type: 'event', recurrence: null, isException: false },
    ];
    const res = getEventsWithRecurrences('2026-10-05', '2026-10-07');
    expect(res.length).toBe(1);
    expect(res[0].title).toBe('One-off');
  });

  it('generates recurring occurrences', () => {
    state.events = [makeRecurring()];
    const res = getEventsWithRecurrences('2026-10-05', '2026-10-07');
    expect(res.length).toBe(3);
  });

  it('replaces occurrence with exception', () => {
    state.events = [
      makeRecurring(),
      {
        id: 'exc1', title: 'Late Standup', date: '2026-10-06',
        startTime: '10:00', endTime: '10:30', allDay: false,
        category: 'work-money', type: 'event',
        recurrence: null, seriesId: 'rec1', isException: true,
        excludedDates: [],
      },
    ];
    const res = getEventsWithRecurrences('2026-10-05', '2026-10-07');
    const oct6 = res.filter(e => e.date === '2026-10-06');
    expect(oct6.length).toBe(1);
    expect(oct6[0].title).toBe('Late Standup');
    expect(oct6[0].startTime).toBe('10:00');
  });
});

describe('editRecurringSingle', () => {
  it('creates exception and adds excluded date', () => {
    state.events = [makeRecurring()];
    editRecurringSingle('rec1', '2026-10-07', { title: 'Edited Standup' });
    const parent = state.events.find(e => e.id === 'rec1');
    expect(parent.excludedDates).toContain('2026-10-07');
    const exc = state.events.find(e => e.isException && e.seriesId === 'rec1');
    expect(exc).toBeTruthy();
    expect(exc.title).toBe('Edited Standup');
    expect(exc.date).toBe('2026-10-07');
  });
});

describe('editRecurringFuture', () => {
  it('splits series at the given date', () => {
    state.events = [makeRecurring()];
    editRecurringFuture('rec1', '2026-10-08', { title: 'New Standup' });
    const parent = state.events.find(e => e.id === 'rec1');
    expect(parent.recurrence.endDate).toBe('2026-10-07');
    const newSeries = state.events.find(e => e.title === 'New Standup' && e.recurrence);
    expect(newSeries).toBeTruthy();
    expect(newSeries.date).toBe('2026-10-08');
    expect(newSeries.isException).toBe(false);
  });
});

describe('editRecurringAll', () => {
  it('updates parent and removes exceptions', () => {
    state.events = [
      makeRecurring(),
      { id: 'exc1', title: 'Exception', date: '2026-10-07', seriesId: 'rec1', isException: true, recurrence: null, excludedDates: [], startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', type: 'event' },
    ];
    editRecurringAll('rec1', { title: 'All Updated' });
    expect(state.events.length).toBe(1);
    expect(state.events[0].title).toBe('All Updated');
    expect(state.events[0].excludedDates).toEqual([]);
  });
});

describe('deleteRecurringSingle', () => {
  it('adds date to excludedDates', () => {
    state.events = [makeRecurring()];
    deleteRecurringSingle('rec1', '2026-10-07');
    const parent = state.events.find(e => e.id === 'rec1');
    expect(parent.excludedDates).toContain('2026-10-07');
  });

  it('removes exception for that date', () => {
    state.events = [
      makeRecurring(),
      { id: 'exc1', title: 'Exception', date: '2026-10-07', seriesId: 'rec1', isException: true, recurrence: null, excludedDates: [], startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', type: 'event' },
    ];
    deleteRecurringSingle('rec1', '2026-10-07');
    expect(state.events.find(e => e.id === 'exc1')).toBeUndefined();
  });
});

describe('deleteRecurringFuture', () => {
  it('sets endDate to day before fromDate', () => {
    state.events = [makeRecurring()];
    deleteRecurringFuture('rec1', '2026-10-10');
    const parent = state.events.find(e => e.id === 'rec1');
    expect(parent.recurrence.endDate).toBe('2026-10-09');
  });

  it('removes future exceptions', () => {
    state.events = [
      makeRecurring(),
      { id: 'exc1', title: 'Exc', date: '2026-10-12', seriesId: 'rec1', isException: true, recurrence: null, excludedDates: [], startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', type: 'event' },
      { id: 'exc2', title: 'Exc2', date: '2026-10-08', seriesId: 'rec1', isException: true, recurrence: null, excludedDates: [], startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', type: 'event' },
    ];
    deleteRecurringFuture('rec1', '2026-10-10');
    expect(state.events.find(e => e.id === 'exc1')).toBeUndefined();
    expect(state.events.find(e => e.id === 'exc2')).toBeTruthy();
  });
});

describe('deleteRecurringAll', () => {
  it('removes parent and all exceptions', () => {
    state.events = [
      makeRecurring(),
      { id: 'exc1', title: 'Exc', date: '2026-10-07', seriesId: 'rec1', isException: true, recurrence: null, excludedDates: [], startTime: '09:00', endTime: '09:30', allDay: false, category: 'work-money', type: 'event' },
    ];
    deleteRecurringAll('rec1');
    expect(state.events.length).toBe(0);
  });
});
