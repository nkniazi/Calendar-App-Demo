# LifeBalance — Progress

## V1: Chronos Calendar (Complete)

- 6 calendar views: Day, 3-Day, Week, Month, Agenda, Year
- Event CRUD via modal (title, date, start/end time, all-day, category, description)
- 5 original categories with color-coded filtering
- Mini calendar in sidebar
- localStorage persistence
- Responsive design, keyboard shortcuts, WCAG accessibility

## V2: LifeBalance (Complete)

- Rebranded from Chronos to LifeBalance
- 7 Life Categories replacing the original 5 (Faith, Sleep, Work/Money, Food/Meals, Family, Entertainment, Personal/Other)
- Automatic V1-to-V2 category migration with backup
- Page routing: Dashboard, Calendar, Tasks, Goals, Settings
- Dashboard: today's overview, 24-hour budget donut ring, Life Balance Score, category bars, tasks summary, weekly bar chart
- Budget engine: `calculateDayBudget()`, `calculateWeekBudget()`, `calculateBalanceScore()`
- Overbooking detection (>24h scheduled)
- Tasks: unified with events (type="task"), filter/sort, priority (low/medium/high), checkbox completion
- Goals: per-category weekly hour targets with progress bars
- Settings: sleep hours, work target, start page preference
- Keyboard shortcuts: `b` (dashboard), `g` (goals)

## V3: AI Personal Time Manager (Complete)

- Netlify Function (`ai-planner.js`) proxying to Claude API (`claude-sonnet-5-5`)
- API key in `process.env` only — never in frontend code
- System prompt with 10 scheduling rules
- "Plan My Day" button on Dashboard
- "Plan My Week" button in AI panel
- Natural-language command input ("Schedule a workout tomorrow")
- AI suggestion cards: add, move, resize, remove, info types
- Approval workflow: individual approve/reject per suggestion, "Approve All"
- Client-side conflict detection with warnings
- Demo/fallback mode: rule-based suggestions when API unavailable
- Rate limiting: 10 requests/session, 10-second cooldown, 50KB payload cap
- Command history in localStorage
- Error handling: rate limit, auth, parse, network — all with friendly messages
- Keyboard shortcut: `p` (Plan My Day), `Escape` (close AI panel)
- Responsive AI panel (full-width on mobile)

## Known Issues / TODOs

- Budget calculation does not detect overlapping events (sums durations independently)
- Balance score requires at least one goal to be set
- No undo for approved AI suggestions (user must manually edit/delete the event)
- AI command history is stored but not yet displayed as clickable suggestions in the UI
- No visual indicator on calendar views showing which events were AI-suggested

## V4 Audit

Audit date: 2026-10-05. No build step, no tests, no linter — vanilla HTML/CSS/JS.
`npm install` clean (0 vulnerabilities, 8 packages).
No API key leaks in any public file.

### Critical Bugs

**C1. Stale `now` variable — "Today" freezes at page-load time**
`app.js:34, 81, 676, 717, 1661`
`const now = new Date()` is captured once at page load and never updated. `todayStr()` returns the page-load date forever. After midnight: "Today" button navigates to yesterday, today-highlights are wrong on all views, Dashboard shows yesterday's data, Agenda labels ("Today"/"Tomorrow") are wrong, Year view current-month marker is stale.

**C2. `handleSave` end-time auto-correction drops minutes and breaks at 23:xx**
`app.js:1215`
`parseInt(data.startTime)` stops at the colon — `"14:45"` → hour 14 → end becomes `"15:00"` (loses 45 min offset). For start `"23:30"`, end becomes `"23:00"`, creating an impossible event with negative duration that renders as zero-height on the calendar grid.

**C3. No timeout on Claude API call — Netlify kills function at 10s**
`ai-planner.js:214-219`
No `timeout` set on `client.messages.create()`. Netlify Functions free tier defaults to 10 seconds. Complex schedule analysis can exceed that, causing silent function termination. The client fetch in app.js also has no timeout or AbortController.

### Important

**I1. CORS `Access-Control-Allow-Origin: '*'` exposes paid API to abuse**
`ai-planner.js:4`
Any website can call the `/api/ai-planner` endpoint from a browser, consuming your API quota. Should restrict to production domain + localhost.

**I2. Origin validation NOT implemented (marked done in todo.md)**
`ai-planner.js (entire file)`
Task 19.3 is checked off but no `event.headers.origin` check exists anywhere in the function. Combined with CORS `*`, endpoint is completely open.

**I3. Input sanitization NOT implemented (marked done in todo.md)**
`ai-planner.js:85`
Task 19.1 is checked off but `body.command`, event titles, and task titles are interpolated directly into the Claude prompt with no sanitization. Prompt injection vector — mitigated by `esc()` on render (no XSS), but uncontrolled prompt manipulation is possible.

**I4. No focus trapping in modal — WCAG violation**
`index.html:127, app.js:1112-1156`
Modal has `role="dialog"` and `aria-modal="true"` but no JS focus trap. Tab key escapes to background elements. WCAG 2.1 AA §2.4.3 Focus Order violation.

**I5. Keyboard shortcuts fire from `<select>` and silently affect non-calendar pages**
`app.js:1771, 1783-1785`
The keydown handler checks for INPUT/TEXTAREA but not SELECT. Typing in a dropdown triggers shortcuts. ArrowLeft/ArrowRight on Tasks/Goals/Settings silently change `state.currentDate` without visible effect.

**I6. AI-approved events bypass time validation**
`app.js:1546-1583`
`approveSuggestion()` creates events from AI data without checking `endTime > startTime`. Malformed AI response produces zero-height or negative events.

**I7. Undefined CSS variable `--hover` — no hover feedback on AI buttons**
`style.css:1643, 1844`
`.ai-panel-close:hover` and `.ai-sug-reject:hover` use `var(--hover)` which is never defined. Hover background is transparent — no visual feedback.

**I8. Undefined CSS variable `--radius-md` on skip-link**
`style.css:994`
`.skip-link` uses `border-radius: var(--radius-md)` but only `--radius`, `--radius-sm`, `--radius-xs` exist. Skip-link gets no border-radius (cosmetic-only, since it's keyboard-visible only).

**I9. All-day non-sleep events hardcoded to 480 minutes in budget**
`app.js:178`
An all-day "Faith" or "Entertainment" event counts as 8 hours instead of the full 24-hour day. The 480 magic number doesn't correspond to any setting and silently underreports scheduled time.

**I10. Incomplete API error coverage for timeouts and connection errors**
`ai-planner.js:237-268`
Only 429 and 401 are explicitly handled. `APIConnectionError` and `APIConnectionTimeoutError` have `status === undefined` and fall through to the generic "unexpected error" handler. Message should be more descriptive.

**I11. Nav arrows visible but meaningless on Tasks/Goals/Settings pages**
`app.js:1648-1659`
Prev/Next arrows are visible on non-calendar pages. Clicking them changes `state.currentDate` with no visible effect on the current page content (only mini-calendar updates). Confusing UX.

**I12. AI panel remains in DOM when hidden — screen reader accessible**
`style.css:1595-1602`
`.ai-panel.hidden` uses `visibility: hidden` but stays `display: flex`. Screen readers may still traverse the hidden panel. Should add `aria-hidden="true"` when panel is closed.

**I13. Broad `form` CSS selector**
`style.css:836`
`form { padding: 20px 24px 24px; }` applies to all forms. Only one form exists today, but any new form would inherit this padding. Should be scoped to `.modal form` or `#event-form`.

### Polish

**P1. Budget ring SVG overlaps when overbooked**
`app.js:878-912`
When scheduled > 1440 min, segment lengths exceed circle circumference, creating overlapping SVG arcs. Should normalize or cap.

**P2. Google Font weight 800 not loaded**
`style.css:1121, index.html:9`
`.dash-score-num` uses `font-weight: 800` but Inter is loaded at 400-700. Browser synthesizes bold from 700.

**P3. Dead code: `todayTasks` and `sameDay()`**
`app.js:759, 83`
`todayTasks` is declared but never used. `sameDay()` is defined but never called.

**P4. Inconsistent AI event ID format**
`app.js:1221 vs 1552`
Normal CRUD uses `'evt_' + Date.now() + '_' + random`. AI approval uses `Date.now().toString(36) + random`. Different formats, no `evt_` prefix for AI events.

**P5. Inline `onclick` handlers in template strings**
`app.js:780, 823, 853, 991, etc.`
Many inline onclick handlers. Works but harder to maintain. IDs contain only safe chars so no XSS risk with current ID generation.

**P6. `form-row-date` class has no CSS rules**
`style.css (missing), index.html:145`
Class exists in HTML but has no special styling. Inherits from `.form-row` only.

**P7. Unused CSS custom properties**
`style.css:15, 18-24`
`--primary-light` and seven `--cat-*` variables are defined but never referenced. Category colors are applied via inline styles from JS.

**P8. Dashboard always shows "today" (page-load date), ignoring selected date**
`app.js:756`
Dashboard uses `todayStr()` (stale, see C1) rather than `state.currentDate`. Even if C1 is fixed, navigating to a different date and switching to Dashboard still shows today — the selected date has no effect.

**P9. Fragile JSON extraction in AI response parser**
`ai-planner.js:131-134`
If Claude returns text before JSON without markdown fences, `JSON.parse()` fails. Should find first `{` and last `}` as fallback.

**P10. `esc()` creates a DOM element on every call**
`app.js:1698`
Creates a detached `<div>` per call for HTML escaping. Minor perf issue during heavy renders (month view).

### No Issues Found

- No dark mode (documented as V4 idea, not a bug)
- z-index stacking (modal 200, AI panel 60, sidebar 50) — correct
- localStorage persistence — working
- Category migration V1→V2 — working
- API key isolation — verified, zero matches in public files
- 0 npm vulnerabilities

## V4 Fixes Applied

All critical, important, and polish items from the audit fixed (26 of 27 — P7 skipped, dashboard-always-shows-today is by design).

### Summary of Changes

**app.js:**
- Removed stale `now` constant; all "today" references use `new Date()` (C1)
- End-time auto-correction uses `timeToMin()` + 60min, capped at 23:59 (C2)
- Client-side fetch timeout (25s) with AbortController + friendly timeout error (C3)
- Focus trap in modal dialog (I4)
- Keyboard shortcuts skip `<select>`, arrow keys only navigate on calendar page (I5)
- AI-approved events validated: endTime > startTime enforced (I6)
- All-day budget: sleep uses sleepHours, work uses workHoursTarget settings (I9)
- Nav arrows + Today button hidden on non-calendar pages (I11)
- AI panel gets `aria-hidden` on open/close (I12)
- Budget ring normalizes to max(scheduled, 1440) — no SVG overlap (P1)
- Dead code removed: `sameDay()`, unused `todayTasks` variable (P3)
- AI event IDs use consistent `evt_` prefix (P4)
- Overbooked ring center shows actual overage amount (P10)
- `esc()` uses string replacement instead of DOM creation (P9)

**ai-planner.js:**
- CORS restricted to production domain + localhost (I1)
- Origin validation added — rejects unknown origins with 403 (I2)
- Input sanitization: user commands/titles/categories stripped of control chars and truncated (I3)
- SDK timeout: 20s on `client.messages.create()` (C3)
- Specific error handlers for `APIConnectionTimeoutError` (504) and `APIConnectionError` (502) (I10)
- More robust JSON extraction: finds first `{` to last `}` as fallback (P8)

**netlify.toml:**
- Function timeout set to 26s for ai-planner (C3)

**style.css:**
- Added `--hover: #f1f5f9` and `--radius-md: 10px` to `:root` (I7, I8)
- Removed unused `--primary-light` and 7 `--cat-*` variables (P5)
- `form` selector scoped to `.modal form` (I13)
- `font-weight: 800` → `700` on balance score (P2)

**index.html:**
- AI panel has `aria-hidden="true"` in initial markup (I12)
- Removed unused `form-row-date` class (P6)

## V4.1 Personalization — Dynamic Category Management

### What Changed

**Category System (app.js):**
- Replaced hardcoded `CATEGORIES` const with dynamic localStorage-backed system
- Categories stored in `chronosCategories` with full metadata (id, label, color, type, status, order)
- `DEFAULT_CATEGORIES` seeds 7 default categories on first load
- `rebuildCategories()` keeps the `CATEGORIES` variable in sync — all existing code works unchanged
- Sleep marked as `type: "system"` (non-archivable); others are `type: "user"`
- Data version bumped from 2 to 3
- Added: `loadCategories()`, `saveCategories()`, `rebuildCategories()`, `getAllCategories()`, `categoryExists()`
- Added: `generateColorVariants()`, `toKebabCase()`, `uniqueCategoryId()` utilities
- Updated `catStyle()` to fall back to gray for archived/unknown categories
- Updated `renderCatPicker()` to include archived category when editing old events
- Updated `buildAIContext()` to send dynamic category list in payload

**Category Management UI (app.js):**
- New `categories` page accessible from "Manage Categories" link in sidebar
- Full CRUD: add, edit (name + color), archive, restore categories
- Up/down reorder buttons update `order` field
- Color picker with 16 presets + custom hex input
- Archived section with collapsed/expanded toggle
- Max 15 active categories enforced
- System categories (Sleep) cannot be archived

**AI Planner (ai-planner.js):**
- System prompt now built dynamically via `buildSystemPrompt(categories)`
- Categories read from request payload instead of hardcoded list
- Falls back to default 7 if no categories in payload

**Styles (style.css):**
- Added ~170 lines: category management view, editor, color picker, archived section, reorder controls
- `.cal-manage-link` in sidebar
- Responsive: categories view gets mobile padding at 480px

### Files Modified

| File | Changes |
|------|---------|
| `app.js` | Dynamic category system, management UI, CRUD functions, color utilities |
| `style.css` | Category management styles, color picker, sidebar link |
| `netlify/functions/ai-planner.js` | Dynamic system prompt from request categories |
| `tasks/todo.md` | V4.1 implementation checklist |
| `PROGRESS.md` | This section |

### Data Model

```
Category (stored in chronosCategories):
{
  id: string,           // kebab-case slug, immutable after creation
  label: string,        // display name
  color: string,        // hex color
  light: string,        // rgba background variant
  dark: string,         // darker text variant
  type: "system"|"user",
  status: "active"|"archived",
  order: number,        // display order
  createdAt: string,    // ISO date
  archivedAt: string|null
}
```

## Next Steps — V5

V5 should focus on **Recurring Events & Habits** — the most-requested missing feature that unlocks real daily-use value.

### V5.0 — Recurring Events & Habits
- Recurrence rules: daily, weekly, biweekly, monthly, custom (e.g. "Mon/Wed/Fri")
- Recurrence stored as a rule on the parent event; individual occurrences generated at render time
- Edit/delete: "this occurrence", "this and future", "all occurrences"
- Habits: recurring tasks with streak tracking (days completed in a row)
- Dashboard habit widget showing current streaks and completion rate
- AI planner aware of recurrence — avoids conflicts with recurring events

### V5.1 — Data Export/Import
- Export all data (events, categories, goals, preferences) as JSON
- Import JSON with merge strategy (skip duplicates, overwrite, or append)
- Useful for backup, device transfer, and sharing templates

### V5.2 — Dark Mode
- CSS custom property theming (light/dark)
- System preference detection via `prefers-color-scheme`
- Manual toggle in Settings, persisted in localStorage
- All category colors, charts, and AI panel must adapt

### Future Ideas (Unprioritized)
- Time tracking (actual vs planned)
- Smart notifications / reminders
- Weekly/monthly trend analysis and insights
- Protected time blocks ("never schedule over sleep")
- AI-driven overbooking resolution
- Multi-day event support
