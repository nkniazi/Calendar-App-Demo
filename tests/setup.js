import { vi } from 'vitest';

const store = {};
const mockLocalStorage = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn(key => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn(i => Object.keys(store)[i] ?? null),
};
global.localStorage = mockLocalStorage;

function makeEl(id) {
  const _children = [];
  return {
    id,
    innerHTML: '',
    textContent: '',
    className: '',
    value: '',
    tagName: 'DIV',
    dataset: {},
    style: {},
    children: _children,
    childNodes: _children,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c);
        } else {
          force ? this._classes.add(c) : this._classes.delete(c);
        }
      },
      contains(c) { return this._classes.has(c); },
    },
    addEventListener: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(() => null),
    appendChild: vi.fn(child => { _children.push(child); }),
    querySelectorAll: vi.fn(() => []),
    querySelector: vi.fn(() => makeEl('anon')),
    remove: vi.fn(),
    focus: vi.fn(),
    reset: vi.fn(),
    checked: false,
  };
}

const elements = {};
global.document = {
  getElementById: vi.fn(id => {
    if (!elements[id]) elements[id] = makeEl(id);
    return elements[id];
  }),
  createElement: vi.fn(tag => makeEl(tag)),
  addEventListener: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  querySelector: vi.fn(() => makeEl('queried')),
  body: { appendChild: vi.fn(), removeChild: vi.fn() },
  activeElement: null,
};

global.window = { addEventListener: vi.fn() };
global.URL = { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() };
global.Blob = class Blob { constructor(parts, opts) { this.parts = parts; this.type = opts?.type; } };
global.requestAnimationFrame = vi.fn(cb => cb());
global.setTimeout = vi.fn((cb) => cb());
global.setInterval = vi.fn();

export function resetStore() {
  Object.keys(store).forEach(k => delete store[k]);
}
