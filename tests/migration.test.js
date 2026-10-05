import { describe, it, expect } from 'vitest';

const app = require('../app.js');
const { CATEGORY_MIGRATION, categoryExists, state, seedDefaultCategories, rebuildCategories } = app;

describe('V1 → V2 category migration map', () => {
  it('maps all V1 categories', () => {
    expect(CATEGORY_MIGRATION.work).toBe('work-money');
    expect(CATEGORY_MIGRATION.personal).toBe('personal-other');
    expect(CATEGORY_MIGRATION.health).toBe('personal-other');
    expect(CATEGORY_MIGRATION.social).toBe('family');
    expect(CATEGORY_MIGRATION.learning).toBe('work-money');
    expect(CATEGORY_MIGRATION.general).toBe('personal-other');
  });

  it('all target categories exist in defaults', () => {
    state.categories = seedDefaultCategories();
    rebuildCategories();
    Object.values(CATEGORY_MIGRATION).forEach(target => {
      expect(categoryExists(target)).toBe(true);
    });
  });
});

describe('V2 → V3 migration', () => {
  it('seedDefaultCategories produces correct structure for migration', () => {
    const cats = seedDefaultCategories();
    expect(cats).toHaveLength(7);
    expect(cats.every(c => c.status === 'active')).toBe(true);
    expect(cats.find(c => c.id === 'sleep').type).toBe('system');
  });
});

describe('migration idempotency', () => {
  it('seeding twice produces the same set of IDs', () => {
    const first = seedDefaultCategories().map(c => c.id).sort();
    const second = seedDefaultCategories().map(c => c.id).sort();
    expect(first).toEqual(second);
  });
});

describe('unknown category fallback', () => {
  it('categoryExists returns false for removed V1 categories', () => {
    state.categories = seedDefaultCategories();
    expect(categoryExists('work')).toBe(false);
    expect(categoryExists('health')).toBe(false);
    expect(categoryExists('social')).toBe(false);
  });
});
