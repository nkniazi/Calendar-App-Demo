# LifeBalance AI — V6 Implementation Plan

> **Vision:** "Recurring Life, Habits & Intelligent Time Management"
>
> LifeBalance AI helps users manage the recurring commitments, habits, routines
> and priorities that make up their real life.

---

## 1. Current Architecture

**Stack:** Vanilla HTML/CSS/JS (no framework, no build step). Single `app.js` (2434 lines), `index.html` (195 lines), `style.css` (2280 lines).

**Persistence:** localStorage with 7 keys:
- `chronosEvents` — events + tasks (type: "event"|"task")
- `chronosGoals` — per-category weekly hour targets
- `chronosPreferences` — sleep hours, work target, start page, lastBackupDate
- `chronosDataVersion` — migration version (currently 3)
- `chronosCategories` — dynamic category objects with id, label, color, status, order
- `chronosAIHistory` — command history array
- `chronosView` — last selected calendar view

**AI Backend:** Netlify Function (`ai-planner.js`, 329 lines) proxying to Claude `claude-sonnet-5-5`.

**Event model:**
```
{ id, title, date, startTime, endTime, allDay, category, description, type, completed, priority }
```

**Categories:** Dynamic, stored as array of objects with stable IDs. Sleep is system-protected. Max 15 active.

**Views/Pages:** dashboard, calendar (day/3day/week/month/agenda/year), tasks, goals, settings, categories.

**Tests:** Vitest, 6 files, 111 tests. Setup mocks localStorage + DOM.

**Exports:** Functions exported behind `typeof module` guard.

---

## 2. Existing Reusable Components

| Component | Location | Reuse in V6 |
|-----------|----------|-------------|
| `calculateDayBudget()` | app.js:241 | Extend to include recurring event occurrences |
| `calculateWeekBudget()` | app.js:261 | Same — feed generated occurrences |
| `calculateBalanceScore()` | app.js:276 | Add habit completion data |
| `showToast()` | app.js:2069 | Reuse for habit/recurrence notifications |
| `safeSave()` | app.js:2106 | Reuse for new localStorage keys |
| `gatherAllData()` | app.js:2134 | Extend to include habits + recurrence rules |
| `validateBackupFile()` | app.js:2164 | Extend for V6 fields |
| `generateICS()` | app.js:2248 | Extend with RRULE support |
| `openModal()` | app.js:1454 | Extend with recurrence UI |
| `buildAIContext()` | app.js:1639 | Extend with habits + recurring data |
| Category system | app.js:176-238 | Habits reference categories by stable ID |
| `esc()` | app.js:2311 | Reuse for all innerHTML |
| `catStyle()` | app.js:111 | Reuse for habit rendering |
| `detectConflicts()` | app.js:1825 | Extend for recurring conflicts |

---

## 3. Proposed V6 Data Model

### Recurrence Rule (on existing event)
```
Event (extended):
{
  ...existing fields,
  recurrence: {                    // null for non-recurring
    freq: "daily"|"weekdays"|"weekly"|"monthly"|"yearly",
    interval: number,              // every N (e.g., 2 = every 2 weeks)
    daysOfWeek: number[],          // 0=Mon..6=Sun, for weekly/selected-days
    endDate: string|null,          // YYYY-MM-DD or null (no end)
    seriesId: string,              // stable ID for the series
  } | null,
  seriesId: string|null,           // links to parent series
  isException: boolean,            // true if this is an exception to a series
  excludedDates: string[],         // YYYY-MM-DD dates to skip (on parent only)
}
```

**Design decisions:**
- Recurring events store ONE parent record with the `recurrence` rule.
- Occurrences are generated at render time (`generateOccurrences()`).
- Exceptions (edited single occurrences) are stored as separate events with `isException: true` + `seriesId` pointing to the parent.
- Deleted single occurrences add the date to `excludedDates` on the parent.
- "This and future" creates a new series starting at that date and ends the old one.

### Habit
```
{
  id: string,                      // stable, e.g. "hab_1234_xxxx"
  name: string,
  category: string,                // category ID (stable)
  targetFrequency: {
    type: "daily"|"weekdays"|"weekly"|"custom",
    timesPerWeek: number,          // for weekly: target count
    daysOfWeek: number[],          // for custom: 0=Mon..6=Sun
  },
  preferredTime: string|null,      // HH:MM or null
  duration: number,                // minutes
  priority: "low"|"medium"|"high",
  status: "active"|"inactive",
  startDate: string,               // YYYY-MM-DD
  endDate: string|null,
  notes: string,
  createdAt: string,               // ISO
  updatedAt: string,               // ISO
}
```

**Stored in:** `chronosHabits` (new localStorage key)

### Habit Completion Log
```
{
  habitId: string,
  date: string,                    // YYYY-MM-DD
  status: "completed"|"skipped"|"partial",
  notes: string,
}
```

**Stored in:** `chronosHabitLog` (new localStorage key)

### Event Flexibility (Feature 11)
```
Event (extended):
{
  ...existing fields,
  flexibility: "fixed"|"protected"|"flexible",  // default: "flexible"
}
```

### Data Version
Bump `CURRENT_DATA_VERSION` from 3 → 4. Migration: add `recurrence: null`, `seriesId: null`, `isException: false`, `excludedDates: []`, `flexibility: 'flexible'` to existing events.

---

## 4. UI Changes

### Modal — Recurrence Section (Feature 1–3)
- Add recurrence toggle below date field in `#event-form`
- When enabled: show freq picker (daily/weekdays/weekly/monthly/yearly), interval input, day-of-week checkboxes (for weekly), end date (optional)
- When editing a recurring event: show dialog asking "This occurrence / This and future / Entire series" before opening the modal
- Delete dialog: same three options

### Habits Page (Feature 4–5)
- New nav item "Habits" in sidebar (between Tasks and Goals)
- Habits page shows: today's habits (completable), streaks, weekly summary
- Add/edit habit modal (or inline form)
- Quick-complete: checkbox/tap to mark done, long-press for skip/partial

### Dashboard Enhancements (Features 7, 13, 14)
- "Today's Habits" card showing due habits with completion checkboxes
- Time intelligence card: Available / Allocated / Free / Overcommitted
- Weekly insight text (AI-generated or rule-based)

### Settings
- Dark mode toggle (Feature 19)

### Calendar Views
- Recurring events rendered with a small recurrence icon (↻)
- Recurring conflict indicators

---

## 5. AI Changes (Features 6, 8, 9, 10, 12)

### System Prompt Updates
- Add habit data to context (habits list, completion rates, streaks)
- Add recurring commitment summary
- Add flexibility levels for events
- Add "What should I do now?" action type

### New AI Actions
- `action: "what-now"` — "What should I do now?" with time available
- `action: "habit-advice"` — reason about habits

### Context Payload Extensions
```
{
  ...existing,
  habits: [...],
  habitCompletionRates: {...},
  recurringCommitments: [...],
  availableTime: number,
  currentTime: "HH:MM",
}
```

### Server-Side
- Extend `buildUserMessage()` to include habits, recurring events, flexibility
- Extend `buildSystemPrompt()` with habit-aware rules

### Safety
- AI NEVER auto-modifies habits, events, or preferences
- All suggestions go through existing approval workflow

---

## 6. Storage Changes

| Key | Status | Content |
|-----|--------|---------|
| `chronosEvents` | Modified | Events now have recurrence, seriesId, isException, excludedDates, flexibility fields |
| `chronosHabits` | New | Array of habit objects |
| `chronosHabitLog` | New | Array of habit completion records |
| `chronosDataVersion` | Modified | 3 → 4 |
| All others | Unchanged | Goals, preferences, categories, AI history |

---

## 7. Test Plan

### Recurrence Tests (`tests/recurrence.test.js`)
- generateOccurrences: daily, weekly, monthly, yearly, weekdays, selected days
- generateOccurrences with interval (every 2 weeks)
- generateOccurrences with end date
- generateOccurrences respects excludedDates
- Exception events override parent occurrence
- Edit single occurrence → creates exception
- Edit future → splits series
- Edit entire → updates parent
- Delete single → adds to excludedDates
- Delete future → sets endDate on parent
- Delete entire → removes parent + exceptions

### Habit Tests (`tests/habits.test.js`)
- Create/edit/delete habit
- Mark habit completed/skipped/partial
- Calculate streak (consecutive completions)
- Weekly completion rate
- Habit-category association survives rename
- Active/inactive toggle

### Time Intelligence Tests (`tests/timeIntelligence.test.js`)
- calculateDayBudget with recurring events
- Conflict detection with recurring events
- Available time calculation
- Overbooking detection with recurring events
- Protected/fixed time respected

### Data Safety Tests
- Backup includes habits + habit log + recurrence
- Restore restores habits + recurrence
- V3 → V4 migration
- ICS export with RRULE

### AI Tests
- Context includes habits and recurring data
- "what-now" action returns valid suggestion
- AI response validation with new fields

---

## 8. Migration Considerations

### V3 → V4 Migration
1. Read existing events from `chronosEvents`
2. Add to each event: `recurrence: null`, `seriesId: null`, `isException: false`, `excludedDates: []`, `flexibility: 'flexible'`
3. Bump `chronosDataVersion` to 4
4. Create empty `chronosHabits` and `chronosHabitLog` if not present
5. Sleep events get `flexibility: 'fixed'`; Work events get `flexibility: 'protected'`

### Backward Compatibility
- Events without recurrence fields treated as non-recurring
- Missing `flexibility` defaults to `'flexible'`
- Import of V5 backups works (migration fills defaults)

---

## 9. Risks

| Risk | Mitigation |
|------|-----------|
| Occurrence generation perf for long ranges | Generate only for visible date range + 60 days max; cap at 366 occurrences |
| Infinite recurrence fills budget | Only include occurrences within the week for budget calc |
| Complex recurrence edit creates data inconsistency | Thorough testing of split/exception logic; immutable seriesId |
| localStorage bloat from habit log | Cap log to 365 days; prune on load |
| Dark mode breaks existing styles | Use CSS custom properties already in :root; only redefine under prefers-color-scheme |
| AI prompt too large with habits + recurring | Summarize recurring commitments; send only active habits |
| Breaking V1–V5 features | Run all 111 existing tests after every change; add regression checks |

---

## 10. Files Expected to Change

| File | Changes |
|------|---------|
| `app.js` | Recurrence engine, occurrence generator, habit system, dark mode toggle, extended modal, habits page, time intelligence, AI context extensions, migration V3→V4, updated exports |
| `index.html` | Habits nav item, recurrence fields in modal, dark mode meta |
| `style.css` | Habits page styles, recurrence UI styles, dark mode variables, recurrence icons |
| `netlify/functions/ai-planner.js` | Extended system prompt, habit-aware context, "what-now" action |
| `package.json` | Version bump to 6.0.0 |
| `tests/recurrence.test.js` | New — recurrence generation + editing tests |
| `tests/habits.test.js` | New — habit CRUD + completion + streak tests |
| `tests/timeIntelligence.test.js` | New — time budget with recurrence + conflicts |
| `tests/setup.js` | Minor — may need additional DOM mocks |

---

## Implementation Order

1. **Data model & migration** — Add fields, bump version, write migration
2. **Recurrence engine** — `generateOccurrences()`, occurrence-aware `eventsForDate()`
3. **Recurrence UI** — Modal fields, edit/delete dialogs
4. **Recurrence tests** — Full coverage
5. **Habit model & storage** — CRUD, localStorage
6. **Habit UI** — Habits page, completion, streaks
7. **Habit tests** — Full coverage
8. **Time intelligence** — Available/allocated/free, recurring budget, conflict detection
9. **AI enhancements** — Habit context, recurring awareness, "what now", weekly insights
10. **Protected time** — Flexibility field, UI controls
11. **ICS with RRULE** — Recurrence export
12. **Dark mode** — CSS custom properties, toggle, persistence
13. **Data safety** — Backup/restore includes V6 data, validation
14. **Full test suite** — Run all tests, regression check
15. **Verification & documentation** — V6_VERIFICATION_REPORT.md, PROGRESS.md update
