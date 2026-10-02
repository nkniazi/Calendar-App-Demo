# Calendar App Demo

A clean, responsive month-view calendar application built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies — just open `index.html` in a browser and start managing your events.

## Features

### Month View Calendar
- Full month grid with 6 rows (42 cells) for consistent layout
- Navigate between months with previous/next buttons
- Jump back to the current month with the **Today** button
- Today's date is highlighted with a blue circle
- Days from adjacent months are shown in muted styling

### Event Management (CRUD)
- **Add** — Click any day cell to create a new event with the date pre-filled
- **Edit** — Click an event pill to open it in the modal with all fields populated
- **Delete** — Remove an event with a confirmation dialog (only available in edit mode)
- Events display as compact pills inside day cells, showing time and title
- Overflow indicator (`+N more`) when a day has more than 3 events

### Event Categories & Colors
Five color-coded categories to organize your events:

| Category | Color |
|----------|-------|
| General | Blue `#4a90d9` |
| Work | Orange `#e67e22` |
| Personal | Purple `#9b59b6` |
| Health | Green `#27ae60` |
| Social | Pink `#e74c8b` |

- Category selector in the event modal
- Event pills are color-coded by category on the calendar grid
- **Filter bar** below the header — click category chips to show/hide events by type

### Event Modal
A centered modal dialog for creating and editing events with the following fields:

| Field | Type | Required |
|-------|------|----------|
| Title | Text (max 100 chars) | Yes |
| Date | Date picker | Yes |
| Category | Dropdown (5 options) | No (defaults to General) |
| Time | Time picker | No |
| Description | Textarea (max 500 chars) | No |

**Close the modal** via the Cancel button, Escape key, or clicking the backdrop overlay.

### Form Validation
- Title and Date are required fields
- Inline error messages appear in red below each field
- Errors clear automatically as you type
- Empty submissions are prevented

### Data Persistence
- All events are stored in the browser's `localStorage` as JSON
- Events survive page reloads and browser restarts
- Graceful handling of corrupted or missing storage data

### Responsive Design
The app adapts to three breakpoints:

| Breakpoint | Behavior |
|------------|----------|
| Desktop (default) | Full-size grid, 90px+ cell height |
| Tablet (768px) | Reduced cell height, smaller fonts |
| Mobile (480px) | Compact layout, minimal padding, smaller controls |

## Project Structure

```
Calendar_App_Demo/
├── index.html          # Page structure — header, grid, modal
├── style.css           # Responsive layout, theming via CSS custom properties
├── app.js              # Application logic — rendering, CRUD, storage, validation
├── tasks/
│   └── todo.md         # Development checklist with acceptance criteria
└── README.md
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/nkniazi/Calendar-App-Demo.git
   ```

2. **Open the app**
   ```bash
   cd Calendar-App-Demo
   ```
   Open `index.html` in any modern browser — no server required.

## How to Use

1. **Navigate months** — Use the `←` and `→` arrows, or click **Today** to jump back
2. **Add an event** — Click on any day cell, fill in the form, and hit **Save**
3. **Edit an event** — Click on an event pill (colored tag) on the calendar
4. **Delete an event** — Open an event for editing, then click the **Delete** button
5. **Filter by category** — Click the colored chips in the filter bar to toggle categories on/off

## Technical Details

- **Layout**: CSS Grid (7-column) for the calendar, Flexbox for header and modal
- **Theming**: CSS custom properties on `:root` for easy color customization
- **State**: Single JavaScript object managing current month/year, events array, and active filters
- **Storage key**: `calendarEvents` in localStorage
- **Event ID format**: `evt_<timestamp>` for unique identification
- **Date format**: `YYYY-MM-DD` strings for simple comparison and native date input compatibility

## Browser Support

Works in all modern browsers that support:
- CSS Grid and Flexbox
- ES6+ JavaScript (template literals, arrow functions, `const`/`let`, spread operator)
- `localStorage`
- `<input type="date">` and `<input type="time">`

## License

MIT
