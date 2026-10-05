import { describe, it, expect, beforeEach } from 'vitest';

const app = require('../app.js');
const { seedDefaultCategories, generateColorVariants, toKebabCase, categoryExists, rebuildCategories, getAllCategories, state, DEFAULT_CATEGORIES } = app;

beforeEach(() => {
  state.categories = seedDefaultCategories();
  rebuildCategories();
});

describe('seedDefaultCategories', () => {
  it('returns 7 categories', () => {
    const cats = seedDefaultCategories();
    expect(cats).toHaveLength(7);
  });

  it('each category has required fields', () => {
    const cats = seedDefaultCategories();
    cats.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('label');
      expect(c).toHaveProperty('color');
      expect(c).toHaveProperty('light');
      expect(c).toHaveProperty('dark');
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('status');
      expect(c).toHaveProperty('order');
    });
  });

  it('sleep is system type', () => {
    const cats = seedDefaultCategories();
    const sleep = cats.find(c => c.id === 'sleep');
    expect(sleep.type).toBe('system');
  });

  it('non-sleep categories are user type', () => {
    const cats = seedDefaultCategories();
    cats.filter(c => c.id !== 'sleep').forEach(c => {
      expect(c.type).toBe('user');
    });
  });

  it('all categories are active', () => {
    const cats = seedDefaultCategories();
    cats.forEach(c => expect(c.status).toBe('active'));
  });

  it('categories match DEFAULT_CATEGORIES keys', () => {
    const cats = seedDefaultCategories();
    const ids = cats.map(c => c.id).sort();
    const expected = Object.keys(DEFAULT_CATEGORIES).sort();
    expect(ids).toEqual(expected);
  });
});

describe('generateColorVariants', () => {
  it('produces light rgba string', () => {
    const { light } = generateColorVariants('#6366f1');
    expect(light).toMatch(/^rgba\(\d+,\d+,\d+,0\.13\)$/);
  });

  it('produces dark hex string', () => {
    const { dark } = generateColorVariants('#6366f1');
    expect(dark).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('dark is darker than original', () => {
    const hex = '#ffffff';
    const { dark } = generateColorVariants(hex);
    expect(dark).not.toBe(hex);
    const r = parseInt(dark.slice(1, 3), 16);
    expect(r).toBeLessThan(255);
  });
});

describe('toKebabCase', () => {
  it('converts spaces', () => { expect(toKebabCase('Work Money')).toBe('work-money'); });
  it('handles special chars', () => { expect(toKebabCase('Faith & Prayer')).toBe('faith-prayer'); });
  it('strips leading/trailing dashes', () => { expect(toKebabCase('--hello--')).toBe('hello'); });
  it('lowercases', () => { expect(toKebabCase('MyCategory')).toBe('mycategory'); });
});

describe('categoryExists', () => {
  it('returns true for active category', () => {
    expect(categoryExists('sleep')).toBe(true);
  });

  it('returns true for archived category', () => {
    const cat = state.categories.find(c => c.id === 'faith');
    cat.status = 'archived';
    expect(categoryExists('faith')).toBe(true);
  });

  it('returns false for unknown category', () => {
    expect(categoryExists('nonexistent')).toBe(false);
  });
});

describe('rebuildCategories', () => {
  it('builds CATEGORIES with only active items', () => {
    const cat = state.categories.find(c => c.id === 'faith');
    cat.status = 'archived';
    rebuildCategories();
    const cats = app.getActiveCategories();
    expect(Object.keys(cats)).not.toContain('faith');
    expect(Object.keys(cats)).toContain('sleep');
  });
});

describe('getAllCategories', () => {
  it('returns all categories including archived', () => {
    const cat = state.categories.find(c => c.id === 'faith');
    cat.status = 'archived';
    const all = getAllCategories();
    expect(all.find(c => c.id === 'faith')).toBeTruthy();
    expect(all).toHaveLength(7);
  });

  it('returns sorted by order', () => {
    const all = getAllCategories();
    for (let i = 1; i < all.length; i++) {
      expect(all[i].order).toBeGreaterThanOrEqual(all[i - 1].order);
    }
  });
});
