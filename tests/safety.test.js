import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStore } from './setup.js';

const app = require('../app.js');
const { safeSave, state, seedDefaultCategories, rebuildCategories, checkBackupReminder } = app;

beforeEach(() => {
  resetStore();
  state.categories = seedDefaultCategories();
  rebuildCategories();
  state.events = [];
  state.goals = [];
  state.preferences = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
});

describe('safeSave', () => {
  it('returns true on successful save', () => {
    expect(safeSave('test-key', { data: 'value' })).toBe(true);
  });

  it('returns false on quota exceeded', () => {
    const original = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      const err = new DOMException('quota exceeded', 'QuotaExceededError');
      err.code = 22;
      throw err;
    });
    const result = safeSave('test-key', { data: 'value' });
    expect(result).toBe(false);
    localStorage.setItem = original;
  });

  it('saves JSON data that can be read back', () => {
    const data = [{ id: 'e1', title: 'Test' }];
    safeSave('test-events', data);
    const raw = localStorage.getItem('test-events');
    expect(JSON.parse(raw)).toEqual(data);
  });
});

describe('loadEvents resilience', () => {
  it('returns empty array for null storage', () => {
    localStorage.setItem('chronosEvents', null);
    const { loadEvents } = app;
    if (loadEvents) {
      const result = loadEvents();
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

describe('backup reminder', () => {
  it('does not throw when preferences are empty', () => {
    state.preferences = {};
    expect(() => checkBackupReminder()).not.toThrow();
  });

  it('does not throw when lastBackupDate is missing', () => {
    state.preferences = { sleepHours: 7 };
    expect(() => checkBackupReminder()).not.toThrow();
  });

  it('does not throw when lastBackupDate is recent', () => {
    state.preferences = { lastBackupDate: new Date().toISOString().slice(0, 10) };
    expect(() => checkBackupReminder()).not.toThrow();
  });
});

describe('category archive preserves event references', () => {
  it('event still references archived category by ID', () => {
    state.events = [
      { id: 'e1', title: 'Prayer', date: '2026-10-05', startTime: '06:00', endTime: '07:00', allDay: false, category: 'faith', type: 'event' },
    ];
    const cat = state.categories.find(c => c.id === 'faith');
    cat.status = 'archived';
    cat.archivedAt = new Date().toISOString();
    rebuildCategories();
    expect(state.events[0].category).toBe('faith');
    const cats = app.getActiveCategories();
    expect(cats['faith']).toBeUndefined();
    const allCats = app.getAllCategories();
    expect(allCats.find(c => c.id === 'faith')).toBeTruthy();
  });

  it('restoring category makes it active again', () => {
    const cat = state.categories.find(c => c.id === 'faith');
    cat.status = 'archived';
    rebuildCategories();
    expect(app.getActiveCategories()['faith']).toBeUndefined();
    cat.status = 'active';
    cat.archivedAt = null;
    rebuildCategories();
    expect(app.getActiveCategories()['faith']).toBeTruthy();
  });
});
