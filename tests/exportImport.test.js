import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore } from './setup.js';

const app = require('../app.js');
const { gatherAllData, validateBackupFile, generateICS, icsEscape, state, seedDefaultCategories, rebuildCategories } = app;

beforeEach(() => {
  state.categories = seedDefaultCategories();
  rebuildCategories();
  state.goals = [];
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
  state.events = [
    { id: 'e1', title: 'Meeting', date: '2026-10-05', startTime: '09:00', endTime: '10:00', allDay: false, category: 'work-money', description: 'Team sync', type: 'event' },
    { id: 'e2', title: 'Lunch', date: '2026-10-05', startTime: '12:00', endTime: '13:00', allDay: false, category: 'food-meals', description: '', type: 'event' },
    { id: 't1', title: 'Buy groceries', date: '2026-10-05', startTime: '', endTime: '', allDay: false, category: 'food-meals', description: '', type: 'task', completed: false, priority: 'medium' },
  ];
});

describe('gatherAllData', () => {
  it('returns object with version 6', () => {
    const data = gatherAllData();
    expect(data.version).toBe(6);
  });

  it('includes exportedAt timestamp', () => {
    const data = gatherAllData();
    expect(data.exportedAt).toBeTruthy();
    expect(new Date(data.exportedAt).getFullYear()).toBeGreaterThan(2020);
  });

  it('includes all events', () => {
    const data = gatherAllData();
    expect(data.events).toHaveLength(3);
  });

  it('includes categories', () => {
    const data = gatherAllData();
    expect(data.categories).toHaveLength(7);
  });

  it('includes preferences', () => {
    const data = gatherAllData();
    expect(data.preferences.sleepHours).toBe(7);
  });
});

describe('validateBackupFile', () => {
  it('returns null for valid backup', () => {
    const data = gatherAllData();
    expect(validateBackupFile(data)).toBeNull();
  });

  it('rejects null', () => {
    expect(validateBackupFile(null)).toBeTruthy();
  });

  it('rejects missing version', () => {
    expect(validateBackupFile({ events: [] })).toMatch(/version/i);
  });

  it('rejects missing events', () => {
    expect(validateBackupFile({ version: 5 })).toMatch(/events/i);
  });

  it('rejects events without required fields', () => {
    expect(validateBackupFile({ version: 5, events: [{ id: 'x' }] })).toMatch(/missing required/i);
  });

  it('accepts events with all required fields', () => {
    const data = { version: 5, events: [{ id: 'a', title: 'Test', date: '2026-01-01' }] };
    expect(validateBackupFile(data)).toBeNull();
  });
});

describe('round-trip', () => {
  it('exported data passes validation', () => {
    const data = gatherAllData();
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    expect(validateBackupFile(parsed)).toBeNull();
  });

  it('exported data preserves event details', () => {
    const data = gatherAllData();
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    const meeting = parsed.events.find(e => e.id === 'e1');
    expect(meeting.title).toBe('Meeting');
    expect(meeting.startTime).toBe('09:00');
    expect(meeting.category).toBe('work-money');
  });
});

describe('icsEscape', () => {
  it('escapes semicolons', () => { expect(icsEscape('a;b')).toBe('a\\;b'); });
  it('escapes commas', () => { expect(icsEscape('a,b')).toBe('a\\,b'); });
  it('escapes newlines', () => { expect(icsEscape('a\nb')).toBe('a\\nb'); });
  it('escapes backslashes', () => { expect(icsEscape('a\\b')).toBe('a\\\\b'); });
  it('handles empty', () => { expect(icsEscape('')).toBe(''); });
});

describe('backup does not contain secrets', () => {
  it('has no API key fields', () => {
    const data = gatherAllData();
    const json = JSON.stringify(data);
    expect(json).not.toContain('sk-ant');
    expect(json).not.toContain('ANTHROPIC_API_KEY');
    expect(json).not.toContain('password');
    expect(json).not.toContain('token');
  });

  it('only contains expected top-level keys', () => {
    const data = gatherAllData();
    const keys = Object.keys(data).sort();
    expect(keys).toEqual(['aiHistory', 'brainDump', 'budgetItems', 'categories', 'energyLog', 'events', 'exportedAt', 'goalHierarchy', 'goals', 'habitLog', 'habits', 'journal', 'mealPlan', 'preferences', 'version'].sort());
  });
});

describe('pre-import backup safety', () => {
  beforeEach(() => { resetStore(); });

  it('stores pre-import backup in localStorage before applying', () => {
    const importData = {
      version: 5,
      events: [{ id: 'imp1', title: 'Imported', date: '2026-01-01' }],
      goals: [],
      preferences: { sleepHours: 9 },
      categories: seedDefaultCategories(),
    };
    app.applyImport(importData);
    const backup = localStorage.getItem('chronosPreImportBackup');
    expect(backup).toBeTruthy();
    const parsed = JSON.parse(backup);
    expect(parsed.version).toBe(6);
    expect(Array.isArray(parsed.events)).toBe(true);
  });
});

describe('category ID stability through rename', () => {
  it('category ID remains stable when label changes', () => {
    const cat = state.categories.find(c => c.id === 'work-money');
    const originalId = cat.id;
    cat.label = 'Career & Finance';
    rebuildCategories();
    expect(cat.id).toBe(originalId);
    const event = { id: 'e1', title: 'Work', date: '2026-10-05', category: 'work-money', type: 'event' };
    state.events = [event];
    expect(state.events[0].category).toBe('work-money');
    const data = gatherAllData();
    const exported = data.events.find(e => e.id === 'e1');
    expect(exported.category).toBe('work-money');
  });
});

describe('generateICS', () => {
  it('produces valid iCalendar wrapper', () => {
    const ics = generateICS();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//LifeBalance//EN');
  });

  it('includes events but not tasks', () => {
    const ics = generateICS();
    expect(ics).toContain('SUMMARY:Meeting');
    expect(ics).toContain('SUMMARY:Lunch');
    expect(ics).not.toContain('Buy groceries');
  });

  it('formats timed events correctly', () => {
    const ics = generateICS();
    expect(ics).toContain('DTSTART:20261005T090000');
    expect(ics).toContain('DTEND:20261005T100000');
  });

  it('includes category', () => {
    const ics = generateICS();
    expect(ics).toContain('CATEGORIES:Work / Money');
  });

  it('handles all-day events', () => {
    state.events = [{ id: 'ad1', title: 'Holiday', date: '2026-12-25', allDay: true, category: 'personal-other', type: 'event' }];
    const ics = generateICS();
    expect(ics).toContain('DTSTART;VALUE=DATE:20261225');
    expect(ics).toContain('DTEND;VALUE=DATE:20261226');
  });

  it('includes description when present', () => {
    const ics = generateICS();
    expect(ics).toContain('DESCRIPTION:Team sync');
  });

  it('includes UID per event', () => {
    const ics = generateICS();
    expect(ics).toContain('UID:e1@lifebalance');
    expect(ics).toContain('UID:e2@lifebalance');
  });

  it('escapes special characters in titles', () => {
    state.events = [{ id: 'sp1', title: 'Team; All-Hands, Q4', date: '2026-10-05', startTime: '10:00', endTime: '11:00', allDay: false, category: 'work-money', type: 'event' }];
    const ics = generateICS();
    expect(ics).toContain('SUMMARY:Team\\; All-Hands\\, Q4');
  });

  it('handles empty event list', () => {
    state.events = [];
    const ics = generateICS();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('uses CRLF line endings', () => {
    const ics = generateICS();
    expect(ics).toContain('\r\n');
  });
});
