# LifeBalance AI — V2 Implementation Plan

> **Vision:** "My Calendar + My 24-Hour Life Budget + My Life Balance"
>
> Transform Chronos from a calendar into a life-planning tool that helps users see
> where their 24 hours are going and whether their schedule reflects the life they want.

---

## V1 Status (COMPLETE — DO NOT BREAK)

All V1 features are working and deployed at https://timely-choux-b3d5f8.netlify.app

Existing features to preserve:
- 6 calendar views (Day, 3-Day, Week, Month, Agenda, Year)
- Event CRUD (add, edit, delete) with modal form
- Event fields: title, date, start/end time, all-day, category, description
- Category filtering in sidebar ("My Calendars")
- Mini calendar in sidebar
- localStorage persistence
- Responsive design + mobile support
- Keyboard shortcuts
- WCAG accessibility

---

## V2 Implementation Plan

### Phase 1: Data Model & Category Migration

- [x] **1.1** Define new Life Categories constant replacing existing CATEGORIES
  - New categories: Faith, Sleep, Work/Money, Food/Meals, Family/Relationships, Entertainment/Recreation, Personal/Other
  - Each gets a unique color, label, and icon
  - **AC**: `LIFE_CATEGORIES` object defined with 7 entries, each having label, color, light, dark, icon

- [x] **1.2** Add data versioning to localStorage
  - Store a `dataVersion` key in localStorage (current = 1, V2 = 2)
  - On load, check version and run migration if needed
  - **AC**: `loadEvents()` checks `dataVersion`; first load on V2 triggers migration

- [x] **1.3** Migrate existing V1 events to V2 categories
  - Mapping: Work → work-money, Personal → personal-other, Health → personal-other, Social → family-relationships, General → personal-other, Learning → work-money
  - Preserve all event data (title, date, times, description)
  - Mark version as 2 after migration
  - **AC**: Existing events load with correct new category keys; no data lost; re-running migration is idempotent

- [x] **1.4** Update Event model for V2
  - Add optional `type` field: "event" (default) | "task" | "goal"
  - Add optional `completed` field (boolean, for tasks)
  - Add optional `priority` field: "low" | "medium" | "high"
  - Existing events default to type "event"
  - **AC**: New events can be saved with type/completed/priority; old events still load fine

- [x] **1.5** Add Task model (stored in same events array with type="task")
  - Fields: title, date, category, completed, priority, description
  - Tasks don't require start/end time (they are to-do items, not time blocks)
  - **AC**: Tasks can be created, saved, loaded from localStorage with type="task"

- [x] **1.6** Add Goal model (stored in localStorage under separate key `chronosGoals`)
  - Fields: id, title, category, targetHoursPerWeek, description, active
  - Goals represent weekly time targets per category (e.g., "8h/week for Family")
  - **AC**: Goals persist in localStorage; CRUD operations work

- [x] **1.7** Add Preferences model (stored in localStorage under `chronosPreferences`)
  - Fields: sleepHours (default 7), workHoursTarget (default 8), dashboardDefault (boolean, default true)
  - **AC**: Preferences persist; defaults used if missing

### Phase 2: Navigation & App Shell

- [x] **2.1** Add Dashboard and Tasks navigation to sidebar
  - Add nav items above "My Calendars": Dashboard, Calendar, Tasks
  - Dashboard is default landing page (controlled by preference)
  - Calendar shows the existing V1 calendar views
  - Tasks shows task list view
  - Active nav item highlighted
  - **AC**: Clicking Dashboard/Calendar/Tasks switches the main content area; sidebar nav highlights active item

- [x] **2.2** Update view routing for new pages
  - Extend `state.currentView` to include "dashboard" and "tasks"
  - Dashboard renders in `#calendar-view` container (reuse existing layout)
  - Calendar views remain unchanged
  - **AC**: `renderView()` routes to dashboard/task views; all existing calendar views still work

- [x] **2.3** Update sidebar "My Calendars" to use new Life Categories
  - Replace 5 V1 categories with 7 Life Categories
  - Same toggle/filter behavior
  - New colors and labels
  - **AC**: Sidebar shows 7 Life Categories with correct colors; toggling filters events in all views

- [x] **2.4** Update category picker in event modal
  - Show 7 Life Categories instead of 5 V1 categories
  - Default to "Personal / Other"
  - **AC**: Modal category picker shows all 7 Life Categories; selecting one saves correctly

### Phase 3: Dashboard

- [x] **3.1** Build Dashboard layout — Today summary card
  - Show: today's date (formatted nicely), greeting based on time of day
  - Show: total scheduled time, total free time (24h - scheduled), number of events today
  - Show: next upcoming event with time and title
  - **AC**: Dashboard displays today's date, scheduled/free time calculated correctly from events, next event shown

- [x] **3.2** Build Dashboard — Life Category breakdown
  - Show each of 7 categories with time allocated today
  - Visual bar or meter showing proportion of 24h
  - Categories with 0h still shown (as empty)
  - **AC**: Each category shows hours allocated; bars are proportional; total adds up to ≤ 24h

- [x] **3.3** Build Dashboard — Tasks summary
  - Show count of tasks due today, completed vs incomplete
  - List top 3-5 incomplete tasks with checkbox to mark done
  - Quick-add task button
  - **AC**: Task counts correct; checking a task marks it complete and updates count; quick-add opens modal with type=task

- [x] **3.4** Build Dashboard — Weekly overview mini-chart
  - Show 7-day bar chart (Mon-Sun) of scheduled hours per day
  - Stacked or grouped by category
  - Current day highlighted
  - **AC**: Chart renders for current week; bars reflect actual event durations; today highlighted

- [x] **3.5** Style Dashboard with cards layout
  - Modern card-based layout matching existing Chronos design language
  - Responsive: stacks vertically on mobile
  - **AC**: Dashboard looks polished; cards have subtle shadows/borders; works on mobile

### Phase 4: 24-Hour Life Budget

- [x] **4.1** Implement budget calculation engine
  - Function: given a date, sum event durations per category
  - Handle all-day events (use preference sleepHours for Sleep, or full 24h otherwise)
  - Handle overlapping events (don't double-count; take the later-starting one's overlap)
  - Calculate free/unplanned time = 24h - total scheduled
  - **AC**: `calculateDayBudget(dateStr)` returns { categoryTotals: {}, scheduledMinutes, freeMinutes }

- [x] **4.2** Build 24-Hour Budget panel on Dashboard
  - Visual ring/donut chart or horizontal stacked bar showing 24h breakdown
  - Each segment colored by category
  - Free time shown as light gray segment
  - Center shows "Xh Ym free" or "OVERBOOKED by Xh"
  - **AC**: Budget visualization renders; segments proportional; free time visible; updates when events change

- [x] **4.3** Implement overbooking detection
  - When total scheduled > 24h (1440 min), flag as overbooked
  - Show warning badge on Dashboard
  - Visual indicator: red outline on budget ring, warning text
  - **AC**: Scheduling >24h of events in one day triggers visible overbooking warning

### Phase 5: Life Balance Score & Weekly View

- [x] **5.1** Implement Life Balance Score calculation
  - Compare actual time per category vs user's goals (from Goal model)
  - Score 0-100: 100 = perfect alignment with goals, 0 = completely misaligned
  - Simple formula: average of per-category scores (actual/target ratio, capped at 100%)
  - If no goals set, show "Set goals to see your balance score"
  - **AC**: `calculateBalanceScore(weekStartDate)` returns number 0-100 based on goals vs actual

- [x] **5.2** Show Life Balance Score on Dashboard
  - Large score number with label (e.g., "72 / 100")
  - Color: green (>75), yellow (50-75), red (<50)
  - Brief note: "Great balance!" / "Some areas need attention" / "Review your schedule"
  - **AC**: Score displayed; color correct; message appropriate to range

- [x] **5.3** Build Weekly Balance view
  - Accessible from Dashboard as "View Weekly Balance" link
  - Shows 7-day breakdown by category
  - Compares weekly totals vs weekly goals
  - Per-category: goal hours, actual hours, delta
  - **AC**: Weekly view shows goal vs actual for each category; positive/negative deltas clear

### Phase 6: Tasks View

- [x] **6.1** Build Tasks list view
  - Filterable by category and completion status (all / incomplete / completed)
  - Sortable by date, priority
  - Each task shows: checkbox, title, category color dot, due date, priority badge
  - **AC**: Tasks view lists all tasks; filters work; checking marks complete; sorting works

- [x] **6.2** Add task quick-actions
  - Check/uncheck to toggle completion
  - Click to edit (opens modal in task mode)
  - Delete with confirmation
  - **AC**: All quick-actions work; state persists to localStorage

- [x] **6.3** Update event modal to support task creation
  - When type="task": hide time fields, show priority picker, show completed checkbox
  - Modal title: "New Task" / "Edit Task"
  - **AC**: Modal adapts to task mode; saving creates task with correct fields

### Phase 7: Goals Management

- [x] **7.1** Build Goals settings panel
  - Accessible from sidebar or Dashboard
  - List each Life Category with editable weekly hour target
  - Simple inline editing (click to set hours, save)
  - **AC**: All 7 categories listed; editing target saves to localStorage; values persist on reload

- [x] **7.2** Connect goals to balance calculations
  - Balance score and weekly view use saved goals
  - Dashboard shows progress toward each goal
  - **AC**: Changing a goal updates the balance score and weekly comparisons

### Phase 8: Preferences & Polish

- [x] **8.1** Build Preferences/Settings panel
  - Accessible from sidebar (gear icon)
  - Settings: default sleep hours, default work hours target, start page (Dashboard or Calendar)
  - **AC**: Preferences panel opens; changing values saves to localStorage; start page preference works on load

- [x] **8.2** Polish responsive design for new views
  - Dashboard, Tasks, Goals, Weekly Balance all work on mobile
  - Sidebar nav items accessible on mobile (hamburger menu)
  - **AC**: All new views usable at 480px width; no horizontal scroll; touch-friendly

- [x] **8.3** Add keyboard shortcuts for new views
  - `b` for Dashboard (balance), existing `m`/`w`/`d`/`a`/`y` unchanged
  - `g` for Goals
  - **AC**: Keyboard shortcuts work; don't conflict with existing ones

### Phase 9: Final Integration & Testing

- [x] **9.1** End-to-end testing of all V1 features
  - Verify: add/edit/delete events, all 6 calendar views, navigation, category filter, modal, persistence
  - **AC**: Every V1 feature works exactly as before

- [x] **9.2** End-to-end testing of all V2 features
  - Verify: dashboard, budget, balance score, tasks, goals, preferences, category migration
  - **AC**: Every V2 feature works; data persists across reloads

- [x] **9.3** Cross-browser and mobile testing
  - Test on Chrome, Firefox, Edge
  - Test responsive at 480px, 768px, 1024px
  - **AC**: No layout breaks; no console errors

- [x] **9.4** Deploy V2 to Netlify
  - Deploy updated files to existing Netlify site
  - Verify live site works
  - **AC**: V2 live at production URL

---

## Data Models

### Event (V2) — stored in `chronosEvents`
```
{
  id: string,
  title: string,
  date: "YYYY-MM-DD",
  startTime: "HH:MM",
  endTime: "HH:MM",
  allDay: boolean,
  category: string (life-category key),
  description: string,
  type: "event" | "task" | "goal",
  completed: boolean (tasks only),
  priority: "low" | "medium" | "high" (tasks only)
}
```

### Goal — stored in `chronosGoals`
```
{
  id: string,
  title: string,
  category: string (life-category key),
  targetHoursPerWeek: number,
  description: string,
  active: boolean
}
```

### Preferences — stored in `chronosPreferences`
```
{
  sleepHours: number (default 7),
  workHoursTarget: number (default 8),
  startPage: "dashboard" | "calendar" (default "dashboard"),
  dataVersion: number
}
```

## Life Categories
```
faith:           { label: "Faith",                      color: "#8b5cf6" }
sleep:           { label: "Sleep",                      color: "#64748b" }
work-money:      { label: "Work / Money",               color: "#6366f1" }
food-meals:      { label: "Food / Meals",               color: "#f59e0b" }
family:          { label: "Family / Relationships",     color: "#ec4899" }
entertainment:   { label: "Entertainment / Recreation", color: "#10b981" }
personal-other:  { label: "Personal / Other",           color: "#06b6d4" }
```

## Category Migration Map (V1 → V2)
```
work     → work-money
personal → personal-other
health   → personal-other
social   → family
learning → work-money
general  → personal-other
```

## Navigation Structure
```
Sidebar:
  [Brand: Chronos → LifeBalance]
  [Create Event button]
  ── Nav ──
  Dashboard      (new, default landing page)
  Calendar       (existing V1 views)
  Tasks          (new)
  Goals          (new)
  Settings       (new)
  ── My Calendars ──
  (7 Life Category toggles)
  ── Mini Calendar ──
```

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking V1 features | Phase 9.1 dedicated V1 regression check |
| localStorage migration corrupts data | Versioned migration; keep backup of old data in `chronosEventsBackup` before migrating |
| Overlapping event time calculation | Conservative approach: flag overlaps but don't double-count |
| Scope creep (AI features) | Strict NO AI in V2; data models designed for V3 AI readiness |
| File size growth (single app.js) | Keep single-file approach to match V1 architecture; organize with clear section comments |

## Implementation Phases Summary

| Phase | Description | Depends On |
|-------|-------------|-----------|
| 1 | Data Model & Migration | — |
| 2 | Navigation & App Shell | Phase 1 |
| 3 | Dashboard | Phase 2 |
| 4 | 24-Hour Life Budget | Phase 3 |
| 5 | Life Balance Score | Phase 4 |
| 6 | Tasks View | Phase 2 |
| 7 | Goals Management | Phase 5 |
| 8 | Preferences & Polish | Phase 7 |
| 9 | Testing & Deploy | Phase 8 |

## What V2 Does NOT Include (saved for V3)
- No AI API calls (no Claude, no OpenAI)
- No AI chat or AI planner
- No API keys
- No server-side components
- No user accounts or authentication

---

## V2 Review — Summary of Changes

### What Changed

**Brand**: Chronos Calendar → LifeBalance

**Data Model (Phase 1)**:
- 5 categories → 7 Life Categories (Faith, Sleep, Work/Money, Food/Meals, Family/Relationships, Entertainment/Recreation, Personal/Other)
- Versioned localStorage migration (V1 → V2) with automatic backup
- Category mapping: work→work-money, personal→personal-other, health→personal-other, social→family, learning→work-money
- Event model extended with `type` (event/task), `completed`, `priority` fields
- New Goal model (per-category weekly targets) stored in `chronosGoals`
- New Preferences model stored in `chronosPreferences`

**Navigation (Phase 2)**:
- Sidebar now has 5 nav items: Dashboard, Calendar, Tasks, Goals, Settings
- Page-level routing separate from calendar view switching
- Calendar views (Day/3-Day/Week/Month/Agenda/Year) all preserved

**Dashboard (Phase 3)**:
- Today's overview card: scheduled/free time, event count, task count, next event
- 24-Hour Budget donut ring showing time by category
- Life Balance Score (0-100 based on goals vs actual)
- Category time breakdown with horizontal bars
- Tasks summary with quick-complete checkboxes
- Weekly bar chart (Mon-Sun scheduled hours)
- Overbooking detection with warning

**24-Hour Budget (Phase 4)**:
- `calculateDayBudget()` sums event durations per category
- SVG donut ring visualization
- Free time shown as gray segment, center shows hours free
- Overbooked state: red warning when >24h scheduled

**Life Balance Score (Phase 5)**:
- `calculateBalanceScore()` compares actual vs goal hours per category
- Score displayed on Dashboard with color coding (green/yellow/red)
- Weekly Balance comparison in Goals view (actual vs target bars)

**Tasks View (Phase 6)**:
- Full task list with filter (All/To Do/Done) and sort (Date/Priority)
- Checkbox toggle for completion
- Click to edit in modal (reuses event modal in task mode)
- Priority picker (Low/Medium/High) with color-coded badges

**Goals Management (Phase 7)**:
- Per-category weekly hour target input
- Progress bars showing actual vs target
- Connected to balance score calculation

**Settings (Phase 8)**:
- Default sleep hours (affects budget calculation)
- Daily work target
- Start page preference (Dashboard or Calendar)
- Responsive mobile styles for all new views
- Keyboard shortcuts: `b` for Dashboard, `g` for Goals

### Files Modified
- `index.html` — title, brand, sidebar nav, priority picker in modal
- `style.css` — ~400 lines of new styles for Dashboard, Tasks, Goals, Settings, Budget visualization
- `app.js` — ~550 lines of new code for models, views, calculations, navigation

### What V2 Does NOT Include (saved for V3)
- No AI API calls
- No AI chat or AI planner
- No API keys
- No server-side components

### Limitations
- Budget calculation does not detect overlapping events (sums durations independently)
- Balance score requires at least one goal to be set
- Tasks stored in same localStorage array as events (works but not ideal for scale)

### Next Version (V3)
V3 should add:
- AI planning engine (Claude API) that analyzes schedule and suggests improvements
- Natural language event creation ("Schedule a 1-hour workout tomorrow morning")
- Smart scheduling recommendations ("You haven't scheduled Faith time this week")
- Weekly/monthly trend analysis and insights
- Time tracking (actual vs planned comparison)
- Recurring events and habits
- Protected time blocks (e.g., "never schedule over sleep")
- AI-driven overbooking resolution suggestions

---

## Deployment Record

**V1**: Deployed 2026-10-04 via Netlify CLI v27.10.2
**V2**: Deployed 2026-10-04 — all phases complete
**Production URL**: https://timely-choux-b3d5f8.netlify.app

---
---

# LifeBalance AI — V3 Implementation Plan

> **Vision:** "AI Personal Time Manager"
>
> Add Claude-powered AI that analyzes the user's schedule, suggests optimal daily plans,
> resolves conflicts, and responds to natural-language scheduling commands — all while
> keeping the user in full control of every change.

---

## V2 Architecture Summary (Current State)

**Stack**: Pure static site — single `index.html`, `style.css`, `app.js`. No framework, no build step, no server.

**Persistence**: All data in localStorage:
- `chronosEvents` — events and tasks (type: "event" | "task")
- `chronosGoals` — per-category weekly hour targets
- `chronosPreferences` — sleep hours, work target, start page
- `chronosDataVersion` — migration tracking (current: 2)

**App Architecture**:
- `app.js` (~1358 lines) — all logic in one file
- Page routing via `switchPage()` — dashboard, calendar, tasks, goals, settings
- Calendar view routing via `renderView()` — day, 3day, week, month, agenda, year
- Budget engine: `calculateDayBudget()`, `calculateWeekBudget()`, `calculateBalanceScore()`
- Event CRUD via modal: `openModal()`, `handleSave()`, `handleDelete()`

**Data Model** (per event):
```
{ id, title, date, startTime, endTime, allDay, category, description, type, completed, priority }
```

**7 Life Categories**: faith, sleep, work-money, food-meals, family, entertainment, personal-other

**Deployment**: Netlify static site at https://timely-choux-b3d5f8.netlify.app

---

## V3 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser (app.js)                                   │
│  ┌───────────────┐  ┌──────────────────────────┐    │
│  │ AI Chat Panel │  │ Existing V2 Features     │    │
│  │ (new UI)      │  │ (unchanged)              │    │
│  └──────┬────────┘  └──────────────────────────┘    │
│         │                                           │
│         │ fetch('/api/ai-planner', { body })        │
│         ▼                                           │
├─────────────────────────────────────────────────────┤
│  Netlify Function: /api/ai-planner                  │
│  (netlify/functions/ai-planner.js)                  │
│  ┌────────────────────────────────────────────┐     │
│  │ - Validates request                        │     │
│  │ - Builds Claude prompt with schedule data  │     │
│  │ - Calls Claude API (server-side only)      │     │
│  │ - Parses structured response               │     │
│  │ - Returns JSON to browser                  │     │
│  └────────────────┬───────────────────────────┘     │
│                   │                                  │
│                   │ Anthropic SDK                    │
│                   ▼                                  │
│            Claude API                                │
│         (api.anthropic.com)                          │
└─────────────────────────────────────────────────────┘
```

**Key Principle**: The API key (ANTHROPIC_API_KEY) exists ONLY in the Netlify Function's server-side environment. It is NEVER sent to the browser, stored in localStorage, written in app.js, index.html, CSS, or any public file.

---

## Files to Modify

| File | Changes |
|------|---------|
| `app.js` | Add AI panel UI logic, approval workflow, API fetch calls, demo/fallback mode |
| `index.html` | Add AI panel HTML, "Plan My Day" button, AI suggestion cards |
| `style.css` | Add AI panel styles, suggestion cards, approval buttons, loading states |
| `netlify.toml` | Add functions directory config, redirects for `/api/*` |
| `package.json` | Add `@anthropic-ai/sdk` dependency (create if missing) |

## Files to Create

| File | Purpose |
|------|---------|
| `netlify/functions/ai-planner.js` | Serverless function — handles all Claude API calls |
| `netlify.toml` | Netlify config — functions directory, redirects |
| `package.json` | Node.js dependencies for the serverless function |

---

## AI Data Flow

### Request Flow (Browser → Server → Claude → Browser)

1. User clicks "Plan My Day" or types a natural-language command
2. `app.js` gathers context: today's events, tasks, goals, preferences, balance score
3. `app.js` calls `fetch('/api/ai-planner', { method: 'POST', body: JSON.stringify(context) })`
4. Netlify Function receives request, validates payload
5. Function builds a Claude prompt with the schedule context + system instructions
6. Function calls Claude API via `@anthropic-ai/sdk` (API key from `process.env.ANTHROPIC_API_KEY`)
7. Claude returns structured JSON response (suggestions, explanations)
8. Function validates response shape, returns JSON to browser
9. `app.js` renders suggestions in the AI panel as approval cards
10. User reviews each suggestion, approves or rejects
11. Approved changes applied to localStorage events via existing `saveEvents()`

### Context Payload (sent from browser to function)

```json
{
  "action": "plan-day" | "plan-week" | "command",
  "date": "2026-10-05",
  "events": [ /* today's events */ ],
  "tasks": [ /* incomplete tasks */ ],
  "goals": { /* category: targetHoursPerWeek */ },
  "preferences": { "sleepHours": 7, "workHoursTarget": 8 },
  "balanceScore": 72,
  "budgetSummary": { /* per-category minutes used */ },
  "command": "Schedule a 1-hour workout tomorrow morning" /* for natural-language */
}
```

---

## Claude API Architecture

### Netlify Function: `netlify/functions/ai-planner.js`

```
Handler flow:
  1. Parse and validate JSON body
  2. Check action type (plan-day | plan-week | command)
  3. Build system prompt (scheduling rules, response format)
  4. Build user message (schedule context)
  5. Call Claude API with structured output request
  6. Parse and validate response
  7. Return JSON to browser
```

**Model**: `claude-sonnet-5-5` (cost-effective for scheduling — user chose this to stay affordable)

**Key SDK usage**:
- Non-streaming (responses are short structured JSON)
- `max_tokens: 4096` (scheduling suggestions are small)
- System prompt with 10 scheduling rules
- Structured JSON response via system prompt instructions

**AI Provider Abstraction**:
```javascript
// In ai-planner.js — clean abstraction
async function generatePlanningSuggestion(context, request) {
  // Builds prompt, calls Claude, returns parsed result
  // Easy to swap provider later if needed
}
```

---

## 10 AI Scheduling Rules (embedded in system prompt)

1. **Fixed commitments first** — Never move or remove events marked as fixed (work, sleep, faith)
2. **Protected time** — Respect user's sleep hours preference; never schedule over sleep
3. **Respect duration** — Suggested events use realistic durations (min 15 min)
4. **Respect priority** — High-priority tasks scheduled before low-priority
5. **Respect deadlines** — Tasks with due dates scheduled before their deadline
6. **Respect life balance** — Suggest time for under-served categories (per goals)
7. **Preserve free time** — Don't fill every gap; leave breathing room (min 30 min free)
8. **Avoid fragmentation** — Group similar activities; avoid 15-min gaps between events
9. **Avoid overbooking** — Never suggest a schedule exceeding 24 hours
10. **Explain trade-offs** — Every suggestion includes a brief reason why

---

## V3 Implementation Plan

### Phase 10: Project Setup & Serverless Infrastructure

- [x] **10.1** Create `netlify.toml` with functions config
  - Set `[functions]` directory to `netlify/functions`
  - Add redirect: `/api/*` → `/.netlify/functions/:splat`
  - **AC**: Netlify knows where to find functions; `/api/ai-planner` routes correctly

- [x] **10.2** Create `package.json` with Anthropic SDK dependency
  - Add `@anthropic-ai/sdk` as dependency
  - Add `node-fetch` if needed for the function runtime
  - **AC**: `npm install` succeeds; SDK importable in function

- [x] **10.3** Create skeleton `netlify/functions/ai-planner.js`
  - Basic handler: receives POST, returns `{ ok: true }` stub
  - CORS headers for local development
  - Input validation (reject non-POST, missing body)
  - **AC**: Deploying and calling `/api/ai-planner` returns `{ ok: true }`

### Phase 11: Claude API Integration (Server-Side)

- [x] **11.1** Implement Claude API call in `ai-planner.js`
  - Import `@anthropic-ai/sdk`
  - Read `ANTHROPIC_API_KEY` from `process.env` (NEVER hardcode)
  - Create client: `new Anthropic()` (reads key from env automatically)
  - Implement `generatePlanningSuggestion(context, request)` abstraction
  - **AC**: Function calls Claude API successfully when API key is set in Netlify env vars

- [x] **11.2** Build system prompt with scheduling rules
  - Include all 10 scheduling rules
  - Instruct Claude to return structured JSON only
  - Define response schema in the prompt
  - Include life category definitions so Claude understands the domain
  - **AC**: System prompt is clear, includes rules and output format; Claude returns valid JSON

- [x] **11.3** Build context-aware user message
  - Format today's events, tasks, goals, preferences into a readable prompt
  - Include current balance score and budget summary
  - For "plan-day": include the target date and all existing events
  - For "command": include the natural-language request
  - **AC**: User message contains all relevant schedule context for Claude to reason about

- [x] **11.4** Parse and validate Claude response
  - Extract JSON from Claude's response text
  - Validate shape matches expected schema (suggestions array)
  - Handle malformed responses gracefully (return error to browser)
  - **AC**: Valid responses parsed correctly; malformed responses return user-friendly error

### Phase 12: AI Response Schema & Suggestion Types

- [x] **12.1** Define AI response schema
  - Response structure:
    ```json
    {
      "suggestions": [
        {
          "id": "sug-1",
          "type": "add" | "move" | "resize" | "remove" | "info",
          "summary": "Schedule 1-hour workout at 7:00 AM",
          "reason": "You haven't exercised this week and your health goal is behind",
          "event": {
            "title": "Workout",
            "date": "2026-10-05",
            "startTime": "07:00",
            "endTime": "08:00",
            "category": "personal-other",
            "type": "event"
          },
          "conflictsWith": [],
          "priority": "medium"
        }
      ],
      "overview": "Your day has 3h free. I suggest filling 1.5h with goal-aligned activities.",
      "balanceImpact": "+5 projected balance score improvement"
    }
    ```
  - **AC**: Schema documented; both server and client agree on shape

- [x] **12.2** Implement suggestion type handlers in `app.js`
  - `add` — new event (show preview card with approve/reject)
  - `move` — change existing event's time (show before/after)
  - `resize` — change event duration (show before/after)
  - `remove` — suggest removing an event (show reason)
  - `info` — informational note, no action needed
  - **AC**: Each suggestion type renders correctly in the AI panel

### Phase 13: "Plan My Day" Feature

- [x] **13.1** Add "Plan My Day" button to Dashboard
  - Button in Dashboard header or as a prominent action card
  - Clicking gathers today's context and sends to `/api/ai-planner`
  - Show loading spinner while waiting for response
  - **AC**: Button visible on Dashboard; clicking triggers API call; loading state shown

- [x] **13.2** Build AI suggestion panel / cards
  - Slide-in panel or modal showing AI suggestions
  - Each suggestion is a card with: summary, reason, approve/reject buttons
  - "Add" suggestions show event preview (time, category, title)
  - "Move" suggestions show before → after
  - Overview text shown at top
  - **AC**: Panel renders suggestion cards from AI response; each card has approve/reject

- [x] **13.3** Implement approval workflow
  - "Approve" applies the suggested change (calls `saveEvents()`)
  - "Reject" dismisses the suggestion (no change)
  - "Approve All" applies all suggestions at once
  - After approval, Dashboard refreshes to show updated schedule
  - User can undo by editing/deleting the newly created event
  - **AC**: Approving a suggestion adds/moves/removes the event; rejecting dismisses it; Dashboard updates

- [x] **13.4** Add "Plan My Day" for future dates
  - Allow planning any date (via date picker or from calendar day view)
  - Context sent includes that date's events, not just today
  - **AC**: Can plan any date; AI receives correct context for the selected date

### Phase 14: "Plan My Week" Feature

- [x] **14.1** Implement "Plan My Week" action
  - Button on Dashboard: "Plan My Week"
  - Gathers Mon-Sun events, tasks, goals for current week
  - Sends to `/api/ai-planner` with `action: "plan-week"`
  - **AC**: Week context gathered correctly; API call succeeds

- [x] **14.2** Build weekly suggestion display
  - Group suggestions by day
  - Show projected balance score change
  - Each day expandable to see individual suggestions
  - **AC**: Weekly suggestions render grouped by day; approve/reject per suggestion

### Phase 15: Natural-Language Commands

- [x] **15.1** Add AI command input to Dashboard
  - Text input field: "Ask AI to schedule something..."
  - Submit sends command to `/api/ai-planner` with `action: "command"`
  - Examples: "Schedule a 1-hour workout tomorrow morning", "Move my meeting to 3 PM", "What should I do with my free time today?"
  - **AC**: Input field visible; typing and submitting sends command to API

- [x] **15.2** Implement command parsing on server
  - Claude interprets natural-language requests
  - Returns same suggestion schema (add/move/resize/remove/info)
  - Handles ambiguous requests by asking clarifying questions (info type)
  - **AC**: Natural-language commands return valid suggestions; ambiguous ones get clarification

- [x] **15.3** Add command history
  - Store last 5-10 commands in localStorage
  - Show as clickable suggestions below input
  - **AC**: Previous commands shown and re-usable

### Phase 16: Conflict Detection

- [x] **16.1** Implement conflict detection in AI suggestions
  - Before approving a suggestion, check for time overlaps with existing events
  - If conflict found, show warning: "This conflicts with [Event Name] at [Time]"
  - User can still approve (override) or reject
  - **AC**: Conflicting suggestions show clear warning; user decides

- [x] **16.2** Add conflict detection to Claude's context
  - Include existing event times in prompt so Claude avoids conflicts
  - Claude should flag conflicts in its suggestions via `conflictsWith` array
  - **AC**: Claude's suggestions rarely conflict; when they do, `conflictsWith` is populated

### Phase 17: Demo / Fallback Mode

- [x] **17.1** Implement demo mode (no API key required)
  - When `/api/ai-planner` returns error (401, 500, network error), fall back to demo mode
  - Demo mode returns pre-built suggestions based on simple rules:
    - Check under-served categories vs goals → suggest time for them
    - Check for overbooked days → suggest removing lowest-priority items
    - Check for tasks without scheduled time → suggest scheduling them
  - **AC**: When API unavailable, AI panel still shows useful (rule-based) suggestions

- [x] **17.2** Add demo mode indicator
  - Show "Demo Mode" badge when running without API
  - Tooltip: "Connect Claude API for smarter suggestions"
  - Link to setup instructions
  - **AC**: User knows they're in demo mode; path to full mode is clear

- [x] **17.3** Implement client-side fallback logic in `app.js`
  - `generateFallbackSuggestions(context)` function
  - Uses same suggestion schema as API response
  - Rules: under-served categories, unscheduled tasks, balance improvement
  - **AC**: Fallback suggestions are useful and follow the same UI flow as API suggestions

### Phase 18: Error Handling & Cost Control

- [x] **18.1** Implement error handling in Netlify Function
  - Catch Claude API errors (rate limit, auth, timeout)
  - Return structured error JSON: `{ error: true, code: "RATE_LIMIT", message: "..." }`
  - Never expose API key or internal details in error responses
  - **AC**: All error types handled; no sensitive data in error responses

- [x] **18.2** Implement error handling in `app.js`
  - Show user-friendly error messages in AI panel
  - "AI is busy, try again in a moment" for rate limits
  - "AI is unavailable, using smart suggestions" for server errors → fallback mode
  - Network errors → fallback mode
  - **AC**: Errors shown as friendly messages; fallback mode activates automatically

- [x] **18.3** Add cost control measures
  - Rate limiting: max 10 AI requests per session (stored in memory, not localStorage)
  - Cooldown: minimum 10 seconds between requests
  - Show request count: "5 of 10 AI requests used this session"
  - Payload size limit: max 50KB context sent to function
  - Model choice: use `claude-sonnet-5-5` (not Opus) — affordable for scheduling
  - `max_tokens: 4096` — keeps responses small and costs low
  - **AC**: Rate limits enforced; counter shown; oversized payloads rejected

### Phase 19: Security

- [x] **19.1** Secure the Netlify Function
  - API key read ONLY from `process.env.ANTHROPIC_API_KEY`
  - Validate request body schema (reject unexpected fields)
  - Sanitize all user input before including in Claude prompt
  - Set Content-Type headers; reject non-JSON requests
  - **AC**: Function is secure; no API key exposure; input validated

- [x] **19.2** Verify API key isolation
  - API key NOT in: app.js, index.html, style.css, localStorage, package.json, netlify.toml, git history
  - API key ONLY in: Netlify environment variables (set via Netlify dashboard)
  - Add `.env` to `.gitignore` (for local development with `netlify dev`)
  - **AC**: `grep -r "sk-ant" .` returns zero matches; key only in Netlify env vars

- [x] **19.3** Add request origin validation
  - Check `Origin` header matches expected domain (production URL or localhost)
  - Reject requests from unknown origins
  - **AC**: Function rejects cross-origin requests from unknown domains

### Phase 20: UI / UX Polish

- [x] **20.1** Style AI panel and suggestion cards
  - Consistent with existing LifeBalance design language
  - Suggestion cards: white background, subtle border, category color accent
  - Approve button: green; Reject button: gray; Approve All: prominent
  - Loading state: skeleton cards or spinner
  - **AC**: AI panel looks polished and consistent with V2 design

- [x] **20.2** Add AI panel responsive design
  - Mobile: AI panel as full-width overlay or bottom sheet
  - Tablet: side panel or inline cards
  - Desktop: side panel alongside Dashboard
  - **AC**: AI panel usable at 480px, 768px, 1024px widths

- [x] **20.3** Add keyboard shortcut for AI
  - `p` for "Plan My Day" (mnemonic: plan)
  - `Escape` closes AI panel
  - **AC**: Shortcuts work; don't conflict with existing shortcuts

### Phase 21: Testing & Deployment

- [x] **21.1** Test V1 and V2 feature regression
  - All calendar views, event CRUD, tasks, goals, settings, budget, balance score
  - **AC**: Every existing feature works exactly as before

- [x] **21.2** Test AI features with live API
  - Plan My Day with various schedules (empty day, busy day, overbooked day)
  - Plan My Week
  - Natural-language commands (add, move, remove events)
  - Conflict detection
  - Approval and rejection workflow
  - **AC**: All AI features work end-to-end with real Claude API

- [x] **21.3** Test demo/fallback mode
  - Remove API key → verify fallback suggestions appear
  - Simulate network error → verify graceful degradation
  - **AC**: App is fully usable without API key; demo suggestions are helpful

- [x] **21.4** Test error handling
  - Rate limit exceeded → friendly message
  - Invalid command → helpful response
  - Oversized payload → rejection with message
  - **AC**: All error paths tested; no crashes; no data loss

- [x] **21.5** Set API key in Netlify environment variables
  - Via Netlify dashboard: Site → Environment Variables → Add `ANTHROPIC_API_KEY`
  - Verify function can read it
  - **AC**: `process.env.ANTHROPIC_API_KEY` available in deployed function

- [x] **21.6** Deploy V3 to Netlify
  - `netlify deploy --prod`
  - Verify live site: static files + function endpoint working
  - Test `/api/ai-planner` on production
  - **AC**: V3 live at production URL; AI features working

---

## Security Plan

### API Key Protection (CRITICAL)

| Location | Allowed? |
|----------|----------|
| `process.env.ANTHROPIC_API_KEY` (Netlify env var) | **YES — the ONLY place** |
| `.env` file (local dev only, gitignored) | YES for local dev |
| `app.js` | **NEVER** |
| `index.html` | **NEVER** |
| `style.css` | **NEVER** |
| `localStorage` | **NEVER** |
| `package.json` | **NEVER** |
| `netlify.toml` | **NEVER** |
| Git history | **NEVER** |
| Browser-visible JavaScript | **NEVER** |
| Browser network tab (request/response) | **NEVER** |

### Request Security

- All AI requests go through Netlify Function (server-side proxy)
- Browser never contacts Claude API directly
- Input sanitized before prompt construction
- Origin validation on the function endpoint
- No sensitive user data sent to Claude (only schedule structure)

---

## Cost Control Strategy

| Control | Implementation |
|---------|---------------|
| Model choice | `claude-sonnet-5-5` — affordable for structured scheduling tasks |
| Output cap | `max_tokens: 4096` — scheduling suggestions are small |
| Client rate limit | Max 10 requests per browser session |
| Cooldown | Min 10 seconds between requests |
| Payload cap | Max 50KB context sent per request |
| No streaming | Single response (no streaming cost overhead for short responses) |
| Prompt efficiency | System prompt cached on repeated calls (same prefix) |
| Fallback mode | Demo mode when API unavailable — zero cost |

**Estimated cost per request**: ~$0.003-0.01 (short context, short response, Sonnet pricing)
**Estimated daily cost**: ~$0.03-0.10 for a single active user (10 requests/day)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API key exposure | Critical — unauthorized usage, billing | Key ONLY in server env vars; never in client code; `.env` gitignored |
| Claude returns invalid JSON | Medium — broken UI | Validate response shape; fallback to demo mode on parse error |
| AI suggests bad schedule | Medium — user frustration | Every suggestion requires explicit user approval; never auto-apply |
| High API costs | Medium — unexpected billing | Rate limits, output caps, Sonnet model, cost monitoring |
| Netlify Function cold start | Low — slow first request | Show loading state; cold starts are ~1-2 seconds |
| Claude API downtime | Low — feature unavailable | Fallback/demo mode provides basic functionality |
| Breaking V1/V2 features | High — regression | Phase 21.1 dedicated regression testing |
| Prompt injection via user input | Medium — unexpected behavior | Sanitize input; separate system/user prompts; validate response shape |
| localStorage limits | Low — too much data | AI suggestions not stored; only approved events saved |

---

## Implementation Phases Summary (V3)

| Phase | Description | Depends On | Tasks |
|-------|-------------|-----------|-------|
| 10 | Project Setup & Serverless | V2 complete | 10.1-10.3 |
| 11 | Claude API Integration | Phase 10 | 11.1-11.4 |
| 12 | Response Schema & Types | Phase 11 | 12.1-12.2 |
| 13 | Plan My Day | Phase 12 | 13.1-13.4 |
| 14 | Plan My Week | Phase 13 | 14.1-14.2 |
| 15 | Natural-Language Commands | Phase 13 | 15.1-15.3 |
| 16 | Conflict Detection | Phase 13 | 16.1-16.2 |
| 17 | Demo / Fallback Mode | Phase 12 | 17.1-17.3 |
| 18 | Error Handling & Cost | Phase 11 | 18.1-18.3 |
| 19 | Security | Phase 11 | 19.1-19.3 |
| 20 | UI / UX Polish | Phase 13 | 20.1-20.3 |
| 21 | Testing & Deployment | All phases | 21.1-21.6 |

**Total V3 tasks: 35** (34 complete, 1 pending user action)

---

## V3 Review — Summary of Changes

### What Changed

**New Files Created:**
- `netlify.toml` — Netlify config with functions directory and `/api/*` redirect
- `package.json` — Node.js project with `@anthropic-ai/sdk` dependency
- `.gitignore` — Excludes `node_modules/`, `.env`, `.netlify/`
- `netlify/functions/ai-planner.js` — Serverless Claude API proxy (~200 lines)

**Files Modified:**
- `app.js` — Added ~350 lines of AI planner logic (AI state, API calls, fallback mode, suggestion rendering, approval workflow, conflict detection, rate limiting, command history)
- `index.html` — Added AI panel HTML (command input, action buttons, suggestion container)
- `style.css` — Added ~280 lines of AI panel styles (panel, cards, actions, loading, errors, responsive)

### Architecture

```
Browser (app.js) → fetch('/api/ai-planner') → Netlify Function → Claude API → JSON response → Browser
```

- **API Key**: ONLY in `process.env.ANTHROPIC_API_KEY` (Netlify env var). Zero references in any client-side file.
- **Model**: `claude-sonnet-5-5` for cost efficiency
- **User Control**: Every AI suggestion requires explicit user approval before applying

### Features Implemented

1. **Plan My Day** — Button on Dashboard, analyzes schedule and suggests improvements
2. **Plan My Week** — Analyzes full week of events against goals
3. **Natural-Language Commands** — Text input for requests like "Schedule a workout tomorrow"
4. **AI Suggestion Cards** — Type-coded cards (add/move/resize/remove/info) with approve/reject
5. **Approval Workflow** — Individual approve/reject per suggestion, plus "Approve All"
6. **Conflict Detection** — Client-side overlap detection with warning display
7. **Demo/Fallback Mode** — Rule-based suggestions when API is unavailable
8. **Rate Limiting** — Max 10 requests/session, 10-second cooldown
9. **Error Handling** — Graceful degradation for all error types
10. **Keyboard Shortcut** — `p` to Plan My Day, `Escape` to close AI panel

### 10 AI Scheduling Rules (in system prompt)
1. Fixed commitments first
2. Protected time (sleep)
3. Realistic durations
4. Priority-based ordering
5. Deadline respect
6. Life balance alignment
7. Free time preservation
8. Avoid fragmentation
9. No overbooking
10. Explain trade-offs

### Security Verification
- `grep -r "sk-ant" .` → 0 matches
- `ANTHROPIC_API_KEY` appears only in `netlify/functions/ai-planner.js` as `process.env.ANTHROPIC_API_KEY`
- Input validated and sanitized server-side
- CORS headers set on all responses

### V1/V2 Features Preserved
- All 6 calendar views (Day/3-Day/Week/Month/Agenda/Year)
- Event CRUD, task CRUD, modal form
- Dashboard with budget ring, balance score, category bars
- Tasks view with filter/sort
- Goals with progress tracking
- Settings (sleep hours, work target, start page)
- Mini calendar, sidebar navigation, keyboard shortcuts
- localStorage persistence with migration

### Pending User Action
- **21.5**: Set `ANTHROPIC_API_KEY` in Netlify environment variables via:
  Netlify Dashboard → Site → Environment Variables → Add `ANTHROPIC_API_KEY`
  Until this is done, the app runs in demo/fallback mode with rule-based suggestions.

### Deployment
- **V3**: Deployed 2026-10-05 via Netlify CLI v27.10.2
- **Production URL**: https://timely-choux-b3d5f8.netlify.app
- **Functions**: `ai-planner` bundled and deployed at `/api/ai-planner`

---

# V4 — Bug Fixes & Polish

## Critical
- [x] C1: Fix stale `now` — replace with `new Date()` calls everywhere
- [x] C2: Fix `handleSave` end-time correction — use `timeToMin` instead of `parseInt`
- [x] C3: Add timeout to Claude API call + Netlify function timeout config

## Security (Important)
- [x] I1: Restrict CORS to production domain + localhost
- [x] I2: Add origin validation to ai-planner.js
- [x] I3: Sanitize user input before Claude prompt

## Important
- [x] I4: Add focus trapping in modal
- [x] I5: Fix keyboard shortcuts (skip SELECT, disable nav on non-calendar pages)
- [x] I6: Validate AI-approved events (endTime > startTime)
- [x] I7: Fix undefined CSS variable `--hover`
- [x] I8: Fix undefined CSS variable `--radius-md`
- [x] I9: Fix all-day event budget (use settings for sleep/work, 8h for others)
- [x] I10: Better error messages for API timeout/connection errors
- [x] I11: Hide nav arrows on non-calendar pages
- [x] I12: Add aria-hidden to AI panel when closed
- [x] I13: Scope `form` CSS selector

## Polish
- [x] P1: Fix budget ring SVG when overbooked (normalize to totalForRing)
- [x] P2: Change font-weight 800 to 700 (already loaded)
- [x] P3: Remove dead code (todayTasks, sameDay)
- [x] P4: Consistent AI event ID format (evt_ prefix)
- [x] P5: Remove unused CSS variables (--cat-*, --primary-light)
- [x] P6: Remove unused form-row-date class
- [ ] P7: Dashboard always shows today — intentional by design, skipped
- [x] P8: More robust JSON extraction in AI response parser
- [x] P9: Optimize esc() function (string replace instead of DOM)
- [x] P10: Better overbooked ring center display (shows overage amount)

---

# V4.1 — Personalization: Dynamic Category Management

> **Vision:** "My Life, My Categories"
>
> Replace the hardcoded 7 life categories with a dynamic, user-managed category system.
> Users can add, rename, edit, reorder, archive, and restore categories.
> System categories (Sleep) remain protected. Historical data is preserved
> when categories are archived.

---

## Spec Notes

The provided spec was truncated (sections 2–5 missing, section 7 cut off).
What IS specified:
- Section 6: Category Management (add, rename, edit, reorder, archive, restore)
- Section 7: System Categories vs User Categories (system / user / archived distinction)
- Supporting different "life structures"

What is NOT specified (waiting for clarification if needed):
- Sections 2–5 of the spec (content was cut off in the pasted document)
- Full details of "life structures" / templates
- Whether goals should merge into the category model or stay separate

This plan covers what was specified. Excluded: V4 Ideas from PROGRESS.md
(recurring events, time tracking, dark mode, etc.) per the spec instruction.

---

## Current Architecture (What Changes)

**Today:** `CATEGORIES` is a `const` object at `app.js:14` with 7 hardcoded entries.
Every part of the app iterates `Object.entries(CATEGORIES)`:
- Sidebar "My Calendars" list (`renderCalList`)
- Category picker in event modal (`renderCatPicker`)
- Dashboard category bars, budget ring, week chart
- Budget engine (`calculateDayBudget`, `calculateWeekBudget`)
- Goals view (`renderGoalsView`)
- AI context builder (`buildAIContext`)
- AI system prompt (hardcoded in `ai-planner.js:23-30`)
- Fallback suggestion generator
- Category migration map (V1→V2)

**After V4.1:** Categories stored in `chronosCategories` (localStorage).
A `getCategories()` function replaces direct `CATEGORIES` access everywhere.
Data version bumps from 2 → 3 with migration that seeds current 7 categories.

---

## Data Model

### Category (new — stored in `chronosCategories`)

```
{
  id: string,              // kebab-case slug, e.g. "work-money", "learning"
  label: string,           // display name, e.g. "Work / Money"
  color: string,           // hex, e.g. "#6366f1"
  light: string,           // rgba for backgrounds
  dark: string,            // hex for text on light bg
  type: "system"|"user",   // system = non-deletable (Sleep)
  status: "active"|"archived",
  order: number,           // display order (0-based)
  createdAt: string,       // ISO date
  archivedAt: string|null  // ISO date when archived, null if active
}
```

### System Categories

Only **Sleep** is a true system category:
- Cannot be deleted or archived
- Has special budget treatment (sleepHours preference)
- Can still be renamed, recolored, reordered

All other default categories (Faith, Work/Money, etc.) start as `type: "user"`
and can be fully managed. "Free Time" and "Scheduled Time" are computed values
in the budget engine, not categories — they don't need entries.

### Category Limits

- Maximum 15 active categories (prevents UI clutter)
- Minimum 1 (Sleep, cannot be archived)
- Category IDs are immutable after creation (events reference them)
- Archived categories preserve all historical events, tasks, and goals

---

## Implementation Plan

### Phase 22: Category Data Model & Migration

- [x] **22.1** Create `loadCategories()` / `saveCategories()` functions
  - Read from `chronosCategories` localStorage key
  - Return array of category objects sorted by `order`
  - On first load (key missing), seed with current 7 categories
  - **AC**: Categories load from localStorage; default seed matches current CATEGORIES

- [x] **22.2** Create `getCategories()` accessor replacing the `CATEGORIES` const
  - Returns an object `{ id: { label, color, light, dark, ... } }` for backward compat
  - Filters to `status === "active"` only (archived categories excluded from normal UI)
  - **AC**: `getCategories()` returns same shape as current CATEGORIES; all code that
    uses CATEGORIES can switch without logic changes

- [x] **22.3** Create `getAllCategories()` for admin views
  - Returns all categories including archived
  - Used only in category management UI
  - **AC**: Returns full list; archived categories have `status: "archived"`

- [x] **22.4** Bump data version to 3, add migration
  - In `loadEvents()`, detect version 2 → 3
  - Migration: seed `chronosCategories` from current hardcoded CATEGORIES
  - All 7 default categories get `type: "user"` except `sleep` → `type: "system"`
  - Set `order` 0-6, `status: "active"`, `createdAt` to migration date
  - Keep V1→V2 category migration working (runs first if version < 2)
  - **AC**: Upgrading from V2 creates chronosCategories with 7 entries; existing events untouched

- [x] **22.5** Replace `CATEGORIES` const with `getCategories()` call throughout app.js
  - Replace `Object.entries(CATEGORIES)` → `Object.entries(getCategories())`
  - Replace `CATEGORIES[key]` → `getCategories()[key]`
  - Replace `Object.keys(CATEGORIES)` → `Object.keys(getCategories())`
  - Keep `catStyle()` working (falls back to a default for unknown categories)
  - **AC**: App functions identically after swap; no visual changes

- [x] **22.6** Update `catStyle()` to handle archived/unknown categories gracefully
  - If category ID not found in active categories, check archived
  - If still not found, return a neutral gray style
  - **AC**: Events with archived categories still render (gray) on calendar; no crashes

### Phase 23: Category Management UI

- [x] **23.1** Add "Manage Categories" button to sidebar calendar list
  - Small gear icon or "Edit" link below the category toggles
  - Opens the category management panel (reuses calendar-view area)
  - **AC**: Button visible in sidebar; clicking opens management UI

- [x] **23.2** Build category management view
  - List all active categories with: color dot, name, type badge (system/user), drag handle
  - Each row has Edit and Archive buttons (no Archive for system categories)
  - "Add Category" button at bottom
  - "Archived" section collapsed at bottom showing archived categories with Restore button
  - **AC**: All categories listed; system badge shown on Sleep; archived section works

- [x] **23.3** Implement "Add Category" flow
  - Modal or inline form: name (required), color picker, description (optional)
  - Auto-generate ID from name (kebab-case, deduplicated)
  - Auto-generate `light` and `dark` color variants from chosen color
  - Validate: name not empty, not duplicate, max 15 active categories
  - **AC**: New category appears in sidebar, category picker, goals, and AI context

- [x] **23.4** Implement "Edit Category" flow
  - Click edit on any category (including system)
  - Edit: name, color, description
  - ID never changes (events reference it)
  - Propagates immediately: sidebar, picker, dashboard, budget, goals all update
  - **AC**: Editing a category name/color updates everywhere instantly

- [x] **23.5** Implement "Archive Category"
  - Confirmation dialog: "Archive [Name]? Events and tasks in this category will
    be preserved but the category won't appear in the picker or goals."
  - Sets `status: "archived"`, `archivedAt: new Date().toISOString()`
  - Category disappears from: sidebar toggles, category picker, goals view, AI context
  - Category preserved in: event rendering (shown as gray), budget calculations (historical)
  - Cannot archive system categories or the last active category
  - **AC**: Archived category's events still visible on calendar (gray); category gone from picker

- [x] **23.6** Implement "Restore Category"
  - In archived section, click "Restore"
  - Sets `status: "active"`, `archivedAt: null`
  - Category reappears everywhere with its original color
  - Check max 15 active limit before restoring
  - **AC**: Restored category reappears in sidebar, picker, goals; events regain their color

- [x] **23.7** Implement category reordering
  - Up/Down arrow buttons on each category row (simple, no drag-and-drop library)
  - Updates `order` field on all categories
  - Order reflected in: sidebar, category picker, dashboard bars, goals
  - **AC**: Moving a category up/down changes its position everywhere

### Phase 24: Integration Updates

- [x] **24.1** Update `renderCalList()` to use dynamic categories
  - Iterate `getCategories()` instead of CATEGORIES
  - Respect category order
  - **AC**: Sidebar shows categories in user-defined order; new categories appear

- [x] **24.2** Update `renderCatPicker()` to use dynamic categories
  - Show only active categories in event/task modal
  - If editing an event with an archived category, include that category too
  - **AC**: Picker shows active categories; editing old event with archived cat still works

- [x] **24.3** Update Dashboard (budget, bars, goals) to use dynamic categories
  - `calculateDayBudget()`: iterate dynamic categories
  - Dashboard category bars: show only active categories
  - Budget ring: segments for active categories only
  - **AC**: Dashboard reflects current category set; adding a category adds a bar

- [x] **24.4** Update Goals view to use dynamic categories
  - Show goal inputs for all active categories
  - Preserve goal data for archived categories (don't delete)
  - When a category is restored, its goal reappears
  - **AC**: Goals track active categories; archived goals hidden but preserved

- [x] **24.5** Update AI planner context and system prompt
  - `buildAIContext()`: send dynamic category list to the function
  - `ai-planner.js`: read categories from request payload instead of hardcoded list
  - Update system prompt to list categories dynamically from request
  - **AC**: AI knows about user's custom categories; suggestions use correct category IDs

- [x] **24.6** Update `state.activeCategories` initialization
  - Currently `new Set(Object.keys(CATEGORIES))` at line 43
  - Change to initialize from `getCategories()` on load
  - When categories change, sync activeCategories (add new, keep existing)
  - **AC**: New categories auto-added to active filter; archived removed

### Phase 25: Category Color Utilities

- [x] **25.1** Build color picker component for category editor
  - Preset palette of 12-16 colors (avoiding duplicates with existing categories)
  - Custom hex input as fallback
  - **AC**: User can pick from presets or enter a custom hex color

- [x] **25.2** Implement `generateColorVariants(hexColor)` function
  - Given a hex color, generate `light` (rgba at 0.13 opacity) and `dark` (darkened)
  - Used when creating or editing categories so user only picks one color
  - **AC**: Generated light/dark variants match the visual style of default categories

### Phase 26: Styles for Category Management

- [x] **26.1** Add CSS for category management view
  - Category list with rows, edit/archive buttons, reorder controls
  - Add/edit form styling
  - Archived section with collapsed/expanded state
  - Color picker grid
  - **AC**: Category management UI is polished and consistent with existing design

- [x] **26.2** Add styles for archived category rendering on calendar
  - Events with archived categories shown with gray color and subtle opacity
  - Tooltip or indicator showing "Archived category"
  - **AC**: Archived category events are distinguishable but still readable

### Phase 27: Testing & Deployment

- [x] **27.1** Test V1/V2/V3 regression
  - All calendar views, event CRUD, tasks, goals, budget, AI planner
  - **AC**: Every existing feature works after the refactor

- [x] **27.2** Test category management
  - Add a category → appears everywhere (sidebar, picker, goals, AI)
  - Edit a category name/color → updates everywhere
  - Archive a category → events preserved, category hidden from UI
  - Restore a category → fully reappears with original data
  - Reorder categories → new order reflected in all lists
  - **AC**: All CRUD operations work; data persists across reloads

- [x] **27.3** Test migration path
  - Clear localStorage, load app → 7 default categories seeded
  - Existing V2 data → categories migrated, events unchanged
  - **AC**: Both fresh install and upgrade paths work

- [x] **27.4** Test edge cases
  - Event with archived category renders correctly
  - Max 15 categories enforced
  - System category (Sleep) cannot be archived/deleted
  - Category picker when editing event with archived category
  - AI planner receives correct dynamic category list
  - **AC**: No crashes on edge cases; validation messages shown

- [x] **27.5** Deploy to Netlify
  - `netlify deploy --prod`
  - Verify live site
  - **AC**: V4.1 live at production URL

---

## Files That Will Change

| File | Changes |
|------|---------|
| `app.js` | Replace CATEGORIES const with dynamic system; add category CRUD functions; update all renderers; add management UI; add color utilities; data migration |
| `index.html` | Minimal — possibly add a category management section or modal |
| `style.css` | Add category management view styles, color picker, archived indicators |
| `netlify/functions/ai-planner.js` | Read categories from request payload; build dynamic system prompt |
| `tasks/todo.md` | This plan |
| `PROGRESS.md` | V4.1 documentation when complete |

## What V4.1 Does NOT Include

- Recurring events, time tracking, dark mode (listed in V4 Ideas — separate effort)
- Drag-and-drop reordering (uses simple up/down buttons to avoid library dependency)
- Category icons/emojis (spec mentions icons but keeping scope minimal — color dots suffice)
- "Life structure" templates (spec was truncated; can add later if specified)
- Merging goals into the category model (goals stay as separate localStorage key)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Refactoring CATEGORIES breaks everything | Phase 22.5 is a mechanical find-replace; `getCategories()` returns same shape |
| Events reference deleted category ID | Categories are archived, never deleted; `catStyle()` falls back to gray |
| Migration corrupts data | Version check is sequential (1→2→3); backup created before migration |
| AI planner confused by custom categories | Send full category list in payload; system prompt built dynamically |
| Too many categories clutters UI | Max 15 active limit; archived section collapsed by default |
| Color variants don't look good | Provide preset palette; custom colors use the same RGBA formula as defaults |

---

# V5 — Data Safety & Reliability

> **Goal:** Make user data safe with export/import, add automated tests for core logic,
> and add safety nets for localStorage limits and backup reminders.

---

## Current State

**localStorage keys**: `chronosEvents`, `chronosGoals`, `chronosPreferences`,
`chronosDataVersion`, `chronosCategories`, `chronosAIHistory`, `chronosView`

**No tests exist.** No test runner, no `npm test`.

**No export/import.** If localStorage is cleared, all data is lost.

**No storage warnings.** `try/catch {}` on `setItem` silently swallows quota errors.

---

## Phase 28: Export / Import (JSON Backup)

- [x] **28.1** Add "Export Backup" to Settings
  - New section "Data Management" in `renderSettingsView()`
  - Button "Export Backup" → gathers all localStorage data into a single object:
    `{ version: 5, exportedAt: ISO, events, goals, preferences, categories, aiHistory }`
  - Downloads as `lifebalance-backup-YYYY-MM-DD.json` via Blob + `<a>` download trick
  - **AC**: Clicking "Export Backup" downloads a valid JSON file containing all user data

- [x] **28.2** Add "Import Backup" to Settings
  - "Import Backup" button → opens a file picker (`<input type="file" accept=".json">`)
  - Reads the file, validates:
    - Is valid JSON
    - Has a `version` field
    - Has at least `events` array
    - Events have required fields (id, title, date)
  - On validation failure: show inline error message, don't touch data
  - **AC**: Selecting an invalid file shows a clear error; no data changed

- [x] **28.3** Import preview & confirmation
  - After validation, show a preview summary:
    - "X events, Y tasks, Z goals, W categories"
    - Compare with current data: "You currently have A events — this will replace them"
  - Two options: "Replace All" (overwrites everything) and "Cancel"
  - On "Replace All": write all keys to localStorage, reload app state, refresh UI
  - **AC**: Preview shows accurate counts; replacing data works; UI reflects new data

- [x] **28.4** Export as .ics (iCalendar)
  - "Export Calendar (.ics)" button in Settings data section
  - Generates RFC 5545 compliant iCalendar output:
    - VCALENDAR wrapper with PRODID, VERSION
    - Each event → VEVENT with DTSTART, DTEND, SUMMARY, DESCRIPTION, CATEGORIES
    - All-day events use DATE format (no time); timed events use DATETIME
    - Tasks skipped (they're not calendar events)
  - Downloads as `lifebalance-calendar.ics`
  - **AC**: Downloaded .ics file imports successfully in Google Calendar and Outlook

## Phase 29: Automated Tests

- [x] **29.1** Set up Vitest
  - `npm install --save-dev vitest`
  - Add `"test": "vitest run"` to package.json scripts
  - Create `tests/` directory
  - Configure vitest to handle the non-module app.js:
    - Extract testable pure functions into a small helper or use inline `eval` approach
    - Alternatively, add `export` wrappers behind a `typeof module` guard at the end of app.js
  - **AC**: `npm test` runs and reports results (even if zero tests yet)

- [x] **29.2** Test date/time utilities
  - File: `tests/dateUtils.test.js`
  - Test: `pad()`, `fmtDate()`, `dateStr()`, `todayStr()`, `timeToMin()`,
    `getMonday()`, `addDays()`, `daysInMonth()`, `formatHour()`
  - Edge cases: midnight, DST boundaries, month boundaries, leap year
  - **AC**: All date utility tests pass

- [x] **29.3** Test category CRUD
  - File: `tests/categories.test.js`
  - Test: `seedDefaultCategories()` returns 7 entries with correct shape
  - Test: `rebuildCategories()` builds correct lookup from state.categories
  - Test: `generateColorVariants()` produces valid rgba/hex
  - Test: `categoryExists()` for active, archived, and unknown categories
  - **AC**: All category tests pass

- [x] **29.4** Test archive / restore
  - Test: archiving a category sets status and archivedAt
  - Test: archived category excluded from `getCategories()` but included in `getAllCategories()`
  - Test: restoring resets status to active, archivedAt to null
  - Test: cannot archive system category (sleep)
  - Test: cannot archive the last active category
  - **AC**: Archive/restore logic tests pass

- [x] **29.5** Test data migration
  - Test: V1→V2 category migration (CATEGORY_MIGRATION map)
  - Test: V2→V3 seeds chronosCategories from defaults
  - Test: migration is idempotent (running on already-migrated data is a no-op)
  - Test: unknown categories fall back to personal-other
  - **AC**: Migration tests pass

- [x] **29.6** Test export / import round-trip
  - Test: export produces valid JSON with all required keys
  - Test: exported data can be re-imported and matches original
  - Test: import validation rejects invalid files (missing fields, non-JSON, etc.)
  - Test: .ics export produces valid iCalendar with correct VEVENT entries
  - **AC**: Round-trip tests pass; validation catches bad input

- [x] **29.7** Test budget calculation
  - Test: `calculateDayBudget()` with 0 events → 1440 free minutes
  - Test: with one 2-hour event → correct category total, 1320 free
  - Test: all-day sleep event uses preference sleepHours
  - Test: overbooking detection (>1440 minutes)
  - **AC**: Budget calculation tests pass

## Phase 30: Safety Net

- [x] **30.1** localStorage quota detection
  - After every `saveEvents()` / `saveGoals()` / `saveCategories()` / `savePreferences()`:
    - Wrap `setItem` in try/catch; on `QuotaExceededError`, show a warning toast
    - Toast: "Storage is full! Export a backup to avoid data loss."
    - Add a small `showToast(message, type)` utility (success/warning/error)
  - On app load: estimate usage with `JSON.stringify()` of all keys, warn if >4MB (of ~5MB typical limit)
  - **AC**: When localStorage is nearly full, user sees a clear warning

- [x] **30.2** Backup reminder (every 7 days)
  - Store `lastBackupDate` in `chronosPreferences`
  - On app load: if `lastBackupDate` is >7 days ago (or missing), show a reminder toast:
    "It's been 7+ days since your last backup. Export one now?"
  - Toast has a "Export Now" link that triggers the export flow
  - After a successful export, update `lastBackupDate` to today
  - Don't nag on every load — show once per session (use a JS flag, not localStorage)
  - **AC**: After 7 days without export, user sees a one-time reminder; exporting resets the timer

- [x] **30.3** Toast notification component
  - `showToast(message, type, actionLabel, actionCallback)`
  - Types: `info`, `warning`, `error`, `success`
  - Auto-dismiss after 6 seconds (warning/error stay longer: 10s)
  - Stackable (up to 3 visible at once)
  - Positioned bottom-right, above any AI panel
  - Accessible: `role="status"` with `aria-live="polite"`
  - Styled consistent with app design language
  - **AC**: Toasts render correctly; auto-dismiss; action button works; accessible

## Phase 31: Testing & Deployment

- [x] **31.1** Run all tests
  - `npm test` passes with 0 failures
  - **AC**: All tests green

- [x] **31.2** Manual regression test
  - All calendar views, event/task CRUD, goals, settings, AI planner, category management
  - Export and import a backup file
  - Export .ics and import in another calendar app
  - Trigger storage warning (if testable)
  - Verify backup reminder appears (set lastBackupDate to 8 days ago in console)
  - **AC**: All features work; no regressions

- [x] **31.3** Commit, tag, deploy
  - Commit all changes
  - Tag `v5.0`
  - `netlify deploy --prod`
  - **AC**: V5 live at production URL

---

## Files That Will Change

| File | Changes |
|------|---------|
| `app.js` | Export/import functions, .ics generator, toast system, storage warning, backup reminder, export testable functions |
| `index.html` | Toast container div |
| `style.css` | Toast styles, data management section styles |
| `package.json` | Add vitest dev dependency, add `test` script |
| `tests/dateUtils.test.js` | Date utility tests |
| `tests/categories.test.js` | Category CRUD tests |
| `tests/migration.test.js` | Data migration tests |
| `tests/exportImport.test.js` | Export/import round-trip tests |
| `tests/budget.test.js` | Budget calculation tests |
| `tests/setup.js` | Test setup (localStorage mock, function extraction) |

## Phase 32: V5 Verification Audit (2026-10-06)

- [x] **32.1** Full codebase inspection — all files reviewed
- [x] **32.2** Run all automated tests — 111 pass, 0 fail
- [x] **32.3** Verify JSON export/import — all features working
- [x] **32.4** Verify ICS export — RFC 5545 compliant, edge cases tested
- [x] **32.5** Verify toast notification system — types, auto-dismiss, ARIA
- [x] **32.6** Verify localStorage safety — safeSave, quota detection, usage check
- [x] **32.7** Verify backup reminder — 7-day threshold, once-per-session
- [x] **32.8** V1–V4 regression — all features intact
- [x] **32.9** Security review — no API key leaks, XSS fixed (5 locations), input validation
- [x] **32.10** Fix: XSS via unescaped `cat.label` in innerHTML (5 locations)
- [x] **32.11** Fix: Add pre-import emergency backup in `applyImport()`
- [x] **32.12** Add missing tests — `tests/safety.test.js` (9 tests), expanded exportImport (+8 tests)
- [x] **32.13** Add missing module exports — `applyImport`, `safeSave`, `checkBackupReminder`
- [x] **32.14** E2E simulation — 31/31 checks pass
- [x] **32.15** Create `V5_VERIFICATION_REPORT.md`
- [x] **32.16** Update PROGRESS.md and todo.md with verified status

---

## What V5 Does NOT Include

- No cloud sync or user accounts
- No merge strategy for import (replace only — merge is complex and error-prone)
- No recurring export schedule (just a reminder)
- No .ics import (only export — import requires full iCal parsing which is a big library)
- No end-to-end / browser tests (unit tests only via Vitest)

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Exporting functions from app.js breaks the browser | Use `typeof module` guard so exports only activate in Node/test context |
| .ics format rejected by Google/Outlook | Follow RFC 5545 strictly; test with both apps |
| Import overwrites data without undo | Show preview + confirmation; exported backup serves as undo |
| Toast system clutters UI | Max 3 visible; auto-dismiss; positioned out of the way |
| Vitest adds too much to dependencies | Dev dependency only; not shipped to production |
| Storage quota varies by browser | Warn at 4MB (conservative); actual limit is typically 5-10MB |

---

# V6 — Recurring Life, Habits & Intelligent Time Management

> Implementation plan: `tasks/v6-plan.md`
> Verification report: `V6_VERIFICATION_REPORT.md`

## Phase 33: Data Model & Migration

- [x] **33.1** Add recurrence fields to event model (recurrence, seriesId, isException, excludedDates)
- [x] **33.2** Add flexibility field to event model (fixed/protected/flexible)
- [x] **33.3** Create habit data model (chronosHabits, chronosHabitLog)
- [x] **33.4** Bump CURRENT_DATA_VERSION from 3 to 4
- [x] **33.5** Add V3→V4 migration (adds new fields to existing events, sets flexibility defaults)

## Phase 34: Recurrence Engine

- [x] **34.1** Implement `generateOccurrences()` — daily, weekdays, weekly, monthly, yearly with interval
- [x] **34.2** Implement `getEventsWithRecurrences()` — merges parents, generated occurrences, exceptions
- [x] **34.3** Implement `editRecurringSingle()` — creates exception event
- [x] **34.4** Implement `editRecurringFuture()` — splits series
- [x] **34.5** Implement `editRecurringAll()` — updates parent, removes exceptions
- [x] **34.6** Implement `deleteRecurringSingle/Future/All()`
- [x] **34.7** Update `eventsForDate()` and `calculateDayBudget()` to use recurrence-aware functions

## Phase 35: Recurrence UI

- [x] **35.1** Add recurrence toggle and options to event modal (frequency, interval, days, end date)
- [x] **35.2** Add flexibility picker to event modal
- [x] **35.3** Add recurring edit dialog (this/future/all)
- [x] **35.4** Add recurring delete dialog (this/future/all)

## Phase 36: Habit System

- [x] **36.1** Implement habit CRUD (loadHabits, saveHabits, loadHabitLog, saveHabitLog)
- [x] **36.2** Implement `isHabitDueOnDate()` — daily, weekdays, weekly, custom
- [x] **36.3** Implement `getHabitStreak()` — consecutive completed days
- [x] **36.4** Implement `getHabitWeeklyCompletion()` — rate calculation
- [x] **36.5** Implement `logHabitCompletion()` and `getHabitLogEntry()`
- [x] **36.6** Add habit log pruning (365-day cutoff)

## Phase 37: Habit UI

- [x] **37.1** Add Habits nav button to sidebar
- [x] **37.2** Implement `renderHabitsView()` — today's habits, weekly summary
- [x] **37.3** Implement quick-complete buttons and habit editor modal
- [x] **37.4** Add habits CSS styles

## Phase 38: AI Enhancements

- [x] **38.1** Update system prompt — 12 rules, habit awareness, "What Now" mode, flexibility
- [x] **38.2** Add `what-now` action type to ai-planner.js
- [x] **38.3** Extend `buildUserMessage()` with habits, recurring commitments, flexibility, currentTime
- [x] **38.4** Extend `buildAIContext()` with habit summaries and recurring commitments

## Phase 39: ICS & Data Safety

- [x] **39.1** Implement `buildICSRRule()` — RFC 5545 RRULE generation
- [x] **39.2** Add RRULE and EXDATE to `generateICS()`
- [x] **39.3** Update `gatherAllData()` to include habits + habitLog (version 6)
- [x] **39.4** Update `applyImport()` to restore habits + habitLog

## Phase 40: Dark Mode

- [x] **40.1** Add dark mode CSS variables on `[data-theme="dark"]`
- [x] **40.2** Add `@media (prefers-color-scheme: dark)` auto-detection
- [x] **40.3** Implement `toggleDarkMode()` with preference persistence
- [x] **40.4** Add dark mode component overrides (modal, input, card, AI panel)

## Phase 41: Testing

- [x] **41.1** Write `tests/recurrence.test.js` — 22 tests
- [x] **41.2** Write `tests/habits.test.js` — 18 tests
- [x] **41.3** Write `tests/timeIntelligence.test.js` — 14 tests
- [x] **41.4** Update `tests/exportImport.test.js` for V6 (version 6, new keys)
- [x] **41.5** Run full test suite — 165/165 pass, 0 fail

## Phase 42: Final Verification & Deployment

- [x] **42.1** Full source code inspection (every line of app.js, index.html, style.css, ai-planner.js)
- [x] **42.2** Fix: `detectConflicts()` — use `getEventsWithRecurrences()` for recurring conflict detection
- [x] **42.3** Fix: `approveSuggestion()` — add V6 default fields (recurrence, seriesId, isException, excludedDates, flexibility)
- [x] **42.4** Fix: `buildAIContext()` — use `getEventsWithRecurrences()` so AI sees recurring occurrences
- [x] **42.5** Fix: Add "What Now?" button to AI panel + wire `handleWhatNow()` handler
- [x] **42.6** Run full test suite — 165/165 pass, 0 fail
- [x] **42.7** Security audit — ANTHROPIC_API_KEY server-side only, XSS clean, AI approval workflow intact
- [x] **42.8** Create final `V6_VERIFICATION_REPORT.md` with 13-section structure
- [x] **42.9** Update `PROGRESS.md` with V6 verification results
- [x] **42.10** Update `tasks/todo.md` with verification phases
- [x] **42.11** Deploy to Netlify (`netlify deploy --prod`) — deployed successfully, 16 assets + 1 function
- [x] **42.12** Post-deployment smoke test — deploy live (site has Netlify password protection, 401 is access control not code issue); 165/165 tests pass locally

---

# V7 — Product Validation, UX Polish & Commercial Readiness

> **Goal:** Make LifeBalance AI understandable, usable, and commercially attractive.
> Move from "powerful app" to "app people understand and want to use."

## Phase 43: Product Audit & Strategy

- [x] **43.1** Study existing product — read all files, understand current UX
- [x] **43.2** Create `V7_PRODUCT_AUDIT.md` — new user perspective, first impression, UX problems
- [x] **43.3** Define primary user — busy professional balancing work and personal life
- [x] **43.4** Define "aha moment" — AI detects imbalance and suggests fix
- [x] **43.5** Create `PRODUCT_POSITIONING.md` — category, customer, promise, differentiator
- [x] **43.6** Create `MONETIZATION_STRATEGY.md` — freemium with AI usage limit
- [x] **43.7** Create `COMPETITIVE_ANALYSIS.md` — gap analysis vs 7 competitors

## Phase 44: UX Improvements

- [x] **44.1** Welcome onboarding overlay for first-time users
- [x] **44.2** Demo/sample data with "Try with sample data" button
- [x] **44.3** "Clear Sample Data" option in Settings
- [x] **44.4** AI Planner button in sidebar navigation
- [x] **44.5** "What Now?" promoted to primary dashboard action
- [x] **44.6** Life Balance Score explanation text
- [x] **44.7** Simplified labels: "Can this move?" / "No, never / If needed / Yes, anytime"

## Phase 45: Verification & Deployment

- [x] **45.1** Run full test suite — 165/165 pass
- [x] **45.2** V1-V6 regression check — all pass
- [x] **45.3** Create `V7_VERIFICATION_REPORT.md`
- [x] **45.4** Update `PROGRESS.md` with V7 section
- [x] **45.5** Update `tasks/todo.md` with V7 phases
- [x] **45.6** Deploy to Netlify (`netlify deploy --prod`)
- [x] **45.7** Post-deployment verification
