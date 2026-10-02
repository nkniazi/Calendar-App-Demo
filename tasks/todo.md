# Calendar App - Task Checklist

## Setup
- [x] Create project file structure (index.html, style.css, app.js, tasks/todo.md)
  - **AC**: All files exist and index.html loads in a browser without errors

## HTML Structure
- [x] Build page layout with header, weekday labels, calendar grid container, and modal
  - **AC**: Opening index.html shows a header with month/year, nav buttons, and an empty grid area
- [x] Build event modal with form fields (title, date, category, time, description) and action buttons
  - **AC**: Modal HTML is present in DOM (hidden by default); form has all required fields with labels

## CSS Styling
- [x] Style calendar header and navigation
  - **AC**: Month/year is centered, prev/next buttons are on either side, Today button is visible
- [x] Style calendar grid and day cells
  - **AC**: 7-column grid displays; day numbers visible in cells; today's date has a distinct highlight
- [x] Style outside-month days
  - **AC**: Days from previous/next month appear visually muted (lighter text color)
- [x] Style event indicators (pills) inside day cells
  - **AC**: Events on a day show as color-coded tags with truncated titles
- [x] Style modal overlay and form
  - **AC**: Modal covers viewport with semi-transparent backdrop; form is centered, readable, has clear inputs
- [x] Style validation error messages
  - **AC**: Error messages appear in red below the relevant field
- [x] Add responsive styles for mobile
  - **AC**: At 768px width, calendar remains usable; at 480px, layout adapts (smaller cells, abbreviated labels)

## JavaScript - Calendar Rendering
- [x] Implement month calculation and grid rendering
  - **AC**: Grid shows correct number of days for any month; leading/trailing days from adjacent months fill the row; always 42 cells (6 rows)
- [x] Implement month navigation (prev, next, today)
  - **AC**: Clicking prev/next changes the displayed month; clicking Today returns to current month; year rolls over correctly (Dec -> Jan, Jan -> Dec)
- [x] Highlight today's date
  - **AC**: The cell for today's date has the `.today` class applied; navigating away and back preserves it

## JavaScript - Event CRUD
- [x] Implement Add Event (create new event, save to localStorage)
  - **AC**: Clicking a day cell opens the modal with that date pre-filled; submitting saves the event; event appears on the calendar; localStorage contains the event after page reload
- [x] Implement Edit Event (load existing event into modal, update on save)
  - **AC**: Clicking an event pill opens the modal with all fields populated; changing fields and saving updates the event in localStorage and on the grid
- [x] Implement Delete Event (remove event, confirm before deleting)
  - **AC**: Delete button visible only in edit mode; clicking it shows a confirmation; confirming removes the event from localStorage and the grid
- [x] Render event indicators on day cells
  - **AC**: Days with events show pill-shaped indicators; max 3 shown with "+N more" for overflow

## JavaScript - Modal & Validation
- [x] Implement modal open/close behavior
  - **AC**: Modal opens on day click and event click; closes on Cancel, Escape key, and overlay click; form resets on close
- [x] Implement form validation
  - **AC**: Submitting with empty title shows "Title is required"; empty date shows "Date is required"; fixing a field clears its error; valid form submits successfully

## JavaScript - localStorage Persistence
- [x] Implement load/save functions for localStorage
  - **AC**: Events survive page reload; corrupted/missing localStorage gracefully returns empty array

## Event Colors & Categories
- [x] Add category dropdown to event modal (General, Work, Personal, Health, Social)
  - **AC**: Category select appears in the modal; defaults to "General"; saved with the event
- [x] Color-code event pills by category
  - **AC**: Each category has a distinct color; pills on the calendar reflect the event's category color
- [x] Add category filter bar below header
  - **AC**: Colored filter chips appear for each category; clicking a chip toggles it; filtered-out events are hidden from the grid; at least one filter must remain active

## Final Verification
- [x] Cross-check all features work end-to-end
  - **AC**: Can add, edit, delete events; navigate months; events persist across reloads; category colors display correctly; filter bar works; responsive layout works; no console errors
