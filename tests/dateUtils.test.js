import { describe, it, expect } from 'vitest';

const app = require('../app.js');
const { pad, fmtDate, dateStr, timeToMin, getMonday, addDays, daysInMonth, formatHour, formatMinutes, formatTime12 } = app;

describe('pad', () => {
  it('pads single digit', () => { expect(pad(5)).toBe('05'); });
  it('leaves double digit', () => { expect(pad(12)).toBe('12'); });
  it('pads zero', () => { expect(pad(0)).toBe('00'); });
});

describe('fmtDate', () => {
  it('formats year-month-day correctly', () => { expect(fmtDate(2026, 0, 5)).toBe('2026-01-05'); });
  it('handles December', () => { expect(fmtDate(2026, 11, 25)).toBe('2026-12-25'); });
});

describe('dateStr', () => {
  it('formats a Date object', () => {
    expect(dateStr(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
});

describe('timeToMin', () => {
  it('converts time string to minutes', () => { expect(timeToMin('09:30')).toBe(570); });
  it('handles midnight', () => { expect(timeToMin('00:00')).toBe(0); });
  it('handles end of day', () => { expect(timeToMin('23:59')).toBe(1439); });
  it('returns 0 for falsy input', () => { expect(timeToMin('')).toBe(0); });
  it('returns 0 for null', () => { expect(timeToMin(null)).toBe(0); });
});

describe('getMonday', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 9, 7); // Wed Oct 7 2026
    const mon = getMonday(wed);
    expect(mon.getDay()).toBe(1);
    expect(dateStr(mon)).toBe('2026-10-05');
  });
  it('returns same day for a Monday', () => {
    const mon = new Date(2026, 9, 5);
    expect(dateStr(getMonday(mon))).toBe('2026-10-05');
  });
  it('handles Sunday (goes back to previous Monday)', () => {
    const sun = new Date(2026, 9, 11);
    expect(dateStr(getMonday(sun))).toBe('2026-10-05');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date(2026, 9, 5);
    expect(dateStr(addDays(d, 3))).toBe('2026-10-08');
  });
  it('adds negative days', () => {
    const d = new Date(2026, 9, 5);
    expect(dateStr(addDays(d, -5))).toBe('2026-09-30');
  });
  it('crosses month boundary', () => {
    const d = new Date(2026, 0, 30);
    expect(dateStr(addDays(d, 3))).toBe('2026-02-02');
  });
});

describe('daysInMonth', () => {
  it('returns 31 for January', () => { expect(daysInMonth(2026, 0)).toBe(31); });
  it('returns 28 for Feb non-leap', () => { expect(daysInMonth(2026, 1)).toBe(28); });
  it('returns 29 for Feb leap year', () => { expect(daysInMonth(2024, 1)).toBe(29); });
  it('returns 30 for April', () => { expect(daysInMonth(2026, 3)).toBe(30); });
});

describe('formatHour', () => {
  it('formats midnight', () => { expect(formatHour(0)).toBe('12 AM'); });
  it('formats noon', () => { expect(formatHour(12)).toBe('12 PM'); });
  it('formats morning', () => { expect(formatHour(9)).toBe('9 AM'); });
  it('formats afternoon', () => { expect(formatHour(15)).toBe('3 PM'); });
});

describe('formatMinutes', () => {
  it('formats hours only', () => { expect(formatMinutes(120)).toBe('2h'); });
  it('formats minutes only', () => { expect(formatMinutes(45)).toBe('45m'); });
  it('formats mixed', () => { expect(formatMinutes(90)).toBe('1h 30m'); });
  it('formats zero', () => { expect(formatMinutes(0)).toBe('0m'); });
});

describe('formatTime12', () => {
  it('formats morning time', () => { expect(formatTime12('09:00')).toBe('9 AM'); });
  it('formats afternoon with minutes', () => { expect(formatTime12('14:30')).toBe('2:30 PM'); });
  it('formats midnight', () => { expect(formatTime12('00:00')).toBe('12 AM'); });
  it('returns empty for falsy', () => { expect(formatTime12('')).toBe(''); });
});
