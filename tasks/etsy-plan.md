# LifeBalance Planner — Etsy Edition Plan

## Overview

Turn the LifeBalance web app into a sellable Etsy digital download: one self-contained HTML file + companion files. The existing web/SaaS edition must continue working unchanged.

**Product name:** LifeBalance Planner
**Promise:** "The planner that tells you if your life plan is realistic — and helps you balance it."
**Architecture:** Single codebase, edition flag `LB_EDITION = "etsy" | "web"`.

---

## Phase 1: Architecture — Edition Flag & Build Script

- [x] **1.1** Add `LB_EDITION` constant at top of app.js (default: `"web"`)
- [x] **1.2** Create `scripts/build-etsy.js`:
  - Read index.html, app.js, style.css
  - Inline all CSS/JS into single HTML
  - Replace Google Fonts `<link>` with system font stack
  - Set `LB_EDITION = "etsy"` in inlined JS
  - Strip/disable: fetch to `/api/ai-planner`, Netlify URLs, API key refs
  - Strip skip-link to `#calendar-view` (still works, just ensure no network)
  - Output to `dist/etsy/LifeBalance-Planner.html`
  - Target < 3 MB
- [x] **1.3** Add `npm run build:etsy` script to package.json
- [x] **1.4** Verify built HTML: zero network requests, works from `file://`

## Phase 2: New Features — ADHD-Friendly Tools

- [x] **2.1** Brain Dump page
  - Quick text input → list of captured thoughts
  - Each item has "→ Task" button to convert to a task (opens task modal pre-filled)
  - localStorage key: `chronosBrainDump`
  - Add nav entry in sidebar
- [x] **2.2** Subtasks / checklists for tasks
  - Add `subtasks` array to task events: `[{id, text, done}]`
  - Render as checklist in task view and event modal
  - Progress shown as "2/5 steps done"
- [x] **2.3** Focus Timer (Pomodoro)
  - Page with adjustable work/break intervals (default 25/5)
  - Start/pause/reset, audible beep (inline base64 or Web Audio)
  - Shows current task name if one is selected
  - Fully offline, no dependencies
  - Add nav entry in sidebar
- [x] **2.4** "One Thing Now" focus mode
  - Shows ONLY the current/next task + time until next commitment
  - Minimal distraction-free UI, large text
  - Button on dashboard + accessible from Focus Timer page
- [x] **2.5** Energy/Mood quick log
  - 1-tap per entry: energy (1-5) and mood (1-5) with emoji buttons
  - Stored in `chronosEnergyLog` per date
  - Shown as small indicators on day view header and dashboard

## Phase 3: New Features — Lifestyle Tools

- [x] **3.1** Simple Budget tracker
  - Monthly income/expense list with categories
  - Add/edit/delete line items
  - Totals: income, expenses, balance
  - localStorage key: `chronosBudget`
  - Add nav entry in sidebar (under divider, "Life Tools" section)
- [x] **3.2** Weekly Meal Planner + auto grocery list
  - 7-day grid: breakfast, lunch, dinner, snacks per day
  - Each slot: text input for meal name
  - "Ingredients" field per meal (comma-separated)
  - Auto grocery list: aggregates all ingredients, deduped
  - Copy grocery list to clipboard
  - localStorage key: `chronosMealPlan`
  - Add nav entry in sidebar
- [x] **3.3** Journal: daily gratitude/notes + weekly review
  - Daily: gratitude (3 things), free-form notes
  - Weekly review: auto-populated with balance score, habits completed, what went well/improve
  - localStorage key: `chronosJournal`
  - Add nav entry in sidebar

## Phase 4: Goal Hierarchy

- [x] **4.1** Extend goals with yearly/quarterly → monthly steps
  - Add `goalType`: "weekly" (existing) | "yearly" | "quarterly"
  - Yearly goals have quarterly milestones
  - Quarterly goals break into monthly action steps
  - Each step is a simple text + done checkbox
  - Render in goals view as expandable sections

## Phase 5: Habit Enhancements

- [x] **5.1** "Skip without breaking streak" messaging
  - When marking a habit as "skipped", show encouraging message
  - "Rest days don't break streaks — just keep going tomorrow"
  - Streak logic: skip ≠ break (already handled — skipped ≠ missed)

## Phase 6: Themes

- [x] **6.1** Add 5 aesthetic color themes
  - Neutral (current light), Sage, Blush Pink, Ocean, Minimal Black
  - Each theme: CSS custom properties on `:root[data-theme="name"]`
  - Theme picker in Settings
  - Persist via `state.preferences.theme`
  - Dark mode becomes a toggle independent of theme

## Phase 7: "Copy for AI" Feature

- [x] **7.1** AI prompt builder
  - Functions that build text prompts from user's data
  - 4 actions: "Plan my week", "Fix my habits", "Rebalance my life", "What now"
  - Each builds a clear, detailed prompt with schedule/habits/goals/budget
  - Copy to clipboard with one click
- [x] **7.2** AI panel adaptation for Etsy edition
  - When `LB_EDITION === "etsy"`: hide API command bar, show "Copy for AI" buttons instead
  - Remove "Demo" badge, replace with "AI-Ready" label
  - Add "Paste AI answer" textarea (optional, nice-to-have)
  - Keep fallback rule-based suggestions

## Phase 8: Print CSS

- [x] **8.1** Print stylesheet
  - `@media print` rules for: day, week, month views, habit tracker, budget, meal plan
  - Clean layout: no sidebar, no toolbar, headers only
  - Page breaks between sections
  - Works for "Save as PDF" (iPad → GoodNotes workflow)
- [x] **8.2** "Print / PDF" button in toolbar for relevant views

## Phase 9: Starter Templates

- [x] **9.1** Create 5 template JSON files
  - ADHD-friendly week, Student, Working Parent, Faith/Prayer, Fitness
  - Each uses existing import validation format
  - Realistic events, goals, habits for the persona
- [x] **9.2** In-app template browser (Etsy edition)
  - Settings or onboarding: "Start with a template" option
  - Loads template JSON via import system

## Phase 10: Onboarding & Safety Adaptations

- [x] **10.1** Adapt onboarding for Etsy edition
  - Change messaging: "Your data stays on this computer"
  - "Export a backup weekly" guidance
  - Remove "AI-powered" language, use "AI-ready"
- [x] **10.2** Backup safety for offline use
  - Prominent "Export Backup" in header/toolbar menu
  - Empty state message: "Moved the file or changed browser? Import your backup"
  - Backup reminder more aggressive for Etsy edition (every 3 days)
- [x] **10.3** Calendar export relabeling
  - Change ".ics export" label to "Add to Google / Apple / Outlook Calendar"

## Phase 11: About / Help Page

- [x] **11.1** "About / Help" page in sidebar nav
  - Version info, how saving works (localStorage)
  - How to back up and restore
  - Browser compatibility
  - Support: "Contact via Etsy messages"
  - NO links to websites, SaaS, or off-Etsy purchases

## Phase 12: Companion Files

- [x] **12.1** `scripts/build-guide-pdf.js` — generates Start-Here-Guide.pdf
  - Uses `pdf-lib` (npm package, build-time only)
  - Content: open file, bookmark it, supported browsers, backup/restore, move to new computer, troubleshooting, FAQ
  - Simple English, clean layout
- [x] **12.2** `scripts/build-goodnotes-pdf.js` — generates GoodNotes-Companion-Planner.pdf
  - Hyperlinked undated PDF: index, monthly, weekly time-blocking, daily, 24-hour budget, habit tracker, balance wheel, weekly review, brain dump, budget, meal plan
  - Tabs/links between sections
  - Target < 10 MB
- [x] **12.3** `scripts/build-ai-prompts-pdf.js` — generates AI-Prompt-Pack.pdf
  - 30+ prompts organized by goal/page
  - Matches planner pages
- [x] **12.4** `scripts/build-templates-zip.js` — generates Starter-Templates.zip
  - Bundles the 5 template JSONs + short readme.txt
  - Uses `archiver` or `jszip` npm package

## Phase 13: Testing

- [x] **13.1** Tests for budget tracker (totals, add/remove items)
- [x] **13.2** Tests for grocery list aggregation
- [x] **13.3** Tests for focus timer logic (countdown, state transitions)
- [x] **13.4** Tests for brain dump → task conversion
- [x] **13.5** Tests for subtask progress calculation
- [x] **13.6** Tests for template import validation
- [x] **13.7** Tests for edition flag behavior
- [x] **13.8** Tests for AI prompt builder output
- [x] **13.9** Tests for energy/mood log
- [x] **13.10** Tests for goal hierarchy
- [x] **13.11** All 165 existing tests must still pass

## Phase 14: Build Verification

- [x] **14.1** Build `dist/etsy/` — all 5 files
- [x] **14.2** Verify LifeBalance-Planner.html:
  - Opens from `file://` in Chrome and Edge
  - Zero network requests (DevTools Network tab)
  - No API key or Netlify URL in file
  - Data persists after close/reopen
  - Backup export/import works
  - All features functional
- [x] **14.3** Verify PDF hyperlinks work
- [x] **14.4** Check file sizes (total < 20 MB, HTML < 3 MB)
- [x] **14.5** Web edition regression: `netlify dev` still works, all tests pass

## Phase 15: Documentation & Listing

- [x] **15.1** Write ETSY_VERIFICATION_REPORT.md
- [x] **15.2** Write ETSY_LISTING.md (title, tags, description, FAQ, image ideas)
- [x] **15.3** Commit and tag `etsy-v1.0`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| HTML > 3 MB | Minify CSS/JS in build script, remove comments |
| PDF generation complexity | Use pdf-lib for simple layouts, no complex typography |
| Feature bloat slows planner | Keep new features lazy-rendered, efficient DOM |
| localStorage limits (~5-10 MB) | Backup reminder, storage usage check already exists |
| GoodNotes PDF lag | Keep pages minimal, avoid heavy graphics |
| Breaking web edition | Edition flag isolates changes, full test suite |

## Implementation Order

1. Edition flag + build script (foundation)
2. Brain Dump, Subtasks, Focus Timer, One Thing Now, Energy log (ADHD tools)
3. Budget, Meal Planner, Journal (lifestyle tools)
4. Goal hierarchy, Habit skip messaging
5. Themes (5 color themes)
6. Copy for AI feature
7. Print CSS
8. Onboarding/safety/help adaptations
9. Starter templates
10. Tests for all new features
11. Build script finalization + companion file generators
12. Verification + listing docs

---

## Review (2026-10-06)

All phases complete. Summary of changes:

### Files Modified
- **app.js**: ~4100 lines. Added edition flag, 8 new feature modules (Brain Dump, Focus Timer, Energy/Mood, Budget, Meal Planner, Journal, Subtasks, Goal Hierarchy), AI prompt builder, about/help page, color theme system, backup toolbar button, template browser, habit skip messaging, expanded backup/restore for all new data stores.
- **index.html**: Added "Life Tools" sidebar section with nav items for Brain Dump, Focus Timer, Budget, Meal Plan, Journal, About/Help.
- **style.css**: ~2800 lines. Added styles for all new features, 5 color themes with dark mode variants, print CSS, subtask UI, goal hierarchy.
- **package.json**: Version 7.1.0, added build scripts and pdf-lib dependency.

### Files Created
- `scripts/build-etsy.js` — Inlines CSS/JS into single HTML, security checks
- `scripts/build-pdfs.js` — Generates 3 companion PDFs (Start Here Guide, GoodNotes Companion, AI Prompt Pack)
- `scripts/build-templates.js` — Generates 5 template JSONs + zip
- `tests/etsy.test.js` — 28 new tests for Etsy features
- `templates/` — 5 JSON template files + README.txt
- `ETSY_VERIFICATION_REPORT.md` — Evidence-based verification
- `ETSY_LISTING.md` — Title, tags, description, FAQ, image ideas

### Build Output (dist/etsy/)
1. LifeBalance-Planner.html — 261 KB
2. Start-Here-Guide.pdf — 6.0 KB
3. GoodNotes-Companion-Planner.pdf — 9.8 KB
4. AI-Prompt-Pack.pdf — 9.0 KB
5. Starter-Templates.zip — 5.1 KB
**Total: 300 KB (limit: 20 MB)**

### Test Results
- 193 tests, all passing
- 10 test files (1 new for Etsy features)
- No regressions in existing tests
