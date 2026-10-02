// Constants
const STORAGE_KEY = 'calendarEvents';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;
const CATEGORIES = {
  default:  { label: 'General',  color: '#4a90d9' },
  work:     { label: 'Work',     color: '#e67e22' },
  personal: { label: 'Personal', color: '#9b59b6' },
  health:   { label: 'Health',   color: '#27ae60' },
  social:   { label: 'Social',   color: '#e74c8b' }
};

// State
const today = new Date();
const state = {
  currentYear: today.getFullYear(),
  currentMonth: today.getMonth(),
  events: [],
  editingEventId: null,
  activeFilters: new Set(Object.keys(CATEGORIES))
};

// DOM Elements
const monthYearEl = document.getElementById('current-month-year');
const gridEl = document.getElementById('calendar-grid');
const weekdayLabelsEl = document.getElementById('weekday-labels');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const eventForm = document.getElementById('event-form');
const titleInput = document.getElementById('event-title');
const dateInput = document.getElementById('event-date');
const timeInput = document.getElementById('event-time');
const descInput = document.getElementById('event-description');
const titleError = document.getElementById('title-error');
const dateError = document.getElementById('date-error');
const categoryInput = document.getElementById('event-category');
const categoryFiltersEl = document.getElementById('category-filters');
const deleteBtn = document.getElementById('delete-btn');

// ── localStorage ──

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events));
  } catch {
    console.warn('Could not save to localStorage');
  }
}

// ── Helpers ──

function padTwo(n) {
  return String(n).padStart(2, '0');
}

function formatDateString(year, month, day) {
  return `${year}-${padTwo(month + 1)}-${padTwo(day)}`;
}

function getEventsForDate(dateStr) {
  return state.events
    .filter(e => e.date === dateStr && state.activeFilters.has(e.category || 'default'))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

// ── Weekday Labels ──

function renderWeekdayLabels() {
  weekdayLabelsEl.innerHTML = '';
  DAY_NAMES_SHORT.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = 'weekday-label';
    el.textContent = name;
    el.setAttribute('aria-label', DAY_NAMES_FULL[i]);
    weekdayLabelsEl.appendChild(el);
  });
}

// ── Calendar Rendering ──

function renderCalendar() {
  gridEl.innerHTML = '';
  monthYearEl.textContent = `${MONTH_NAMES[state.currentMonth]} ${state.currentYear}`;

  const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(state.currentYear, state.currentMonth, 0).getDate();

  const todayStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

  // Leading days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = state.currentMonth - 1;
    const prevYear = prevMonth < 0 ? state.currentYear - 1 : state.currentYear;
    const adjustedMonth = prevMonth < 0 ? 11 : prevMonth;
    createDayCell(prevYear, adjustedMonth, day, false, todayStr);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    createDayCell(state.currentYear, state.currentMonth, day, true, todayStr);
  }

  // Trailing days to fill 42 cells
  const totalCells = gridEl.children.length;
  const remaining = 42 - totalCells;
  for (let day = 1; day <= remaining; day++) {
    const nextMonth = state.currentMonth + 1;
    const nextYear = nextMonth > 11 ? state.currentYear + 1 : state.currentYear;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
    createDayCell(nextYear, adjustedMonth, day, false, todayStr);
  }
}

function createDayCell(year, month, day, isCurrentMonth, todayStr) {
  const dateStr = formatDateString(year, month, day);
  const cell = document.createElement('div');
  cell.className = 'day-cell';

  if (!isCurrentMonth) cell.classList.add('outside-month');
  if (dateStr === todayStr) cell.classList.add('today');

  const dayNum = document.createElement('div');
  dayNum.className = 'day-number';
  dayNum.textContent = day;
  cell.appendChild(dayNum);

  const events = getEventsForDate(dateStr);
  const visible = events.slice(0, MAX_VISIBLE_EVENTS);
  const overflow = events.length - MAX_VISIBLE_EVENTS;

  visible.forEach(evt => {
    const pill = document.createElement('div');
    pill.className = 'event-pill';
    const cat = CATEGORIES[evt.category] || CATEGORIES.default;
    pill.style.background = cat.color;
    pill.textContent = evt.time ? `${evt.time} ${evt.title}` : evt.title;
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(evt.date, evt.id);
    });
    cell.appendChild(pill);
  });

  if (overflow > 0) {
    const more = document.createElement('div');
    more.className = 'event-more';
    more.textContent = `+${overflow} more`;
    cell.appendChild(more);
  }

  cell.addEventListener('click', () => openModal(dateStr));
  gridEl.appendChild(cell);
}

// ── Modal ──

function openModal(dateStr, eventId) {
  clearErrors();
  eventForm.reset();

  if (eventId) {
    const evt = state.events.find(e => e.id === eventId);
    if (!evt) return;
    state.editingEventId = eventId;
    modalTitle.textContent = 'Edit Event';
    titleInput.value = evt.title;
    dateInput.value = evt.date;
    categoryInput.value = evt.category || 'default';
    timeInput.value = evt.time || '';
    descInput.value = evt.description || '';
    deleteBtn.classList.remove('hidden');
  } else {
    state.editingEventId = null;
    modalTitle.textContent = 'Add Event';
    dateInput.value = dateStr;
    deleteBtn.classList.add('hidden');
  }

  modalOverlay.classList.remove('hidden');
  titleInput.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  state.editingEventId = null;
  eventForm.reset();
  clearErrors();
}

// ── Validation ──

function clearErrors() {
  titleError.textContent = '';
  dateError.textContent = '';
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!titleInput.value.trim()) {
    titleError.textContent = 'Title is required';
    valid = false;
  }

  if (!dateInput.value) {
    dateError.textContent = 'Date is required';
    valid = false;
  }

  return valid;
}

// ── CRUD ──

function handleSave(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const eventData = {
    title: titleInput.value.trim(),
    date: dateInput.value,
    category: categoryInput.value,
    time: timeInput.value || '',
    description: descInput.value.trim()
  };

  if (state.editingEventId) {
    const idx = state.events.findIndex(ev => ev.id === state.editingEventId);
    if (idx !== -1) {
      state.events[idx] = { ...state.events[idx], ...eventData };
    }
  } else {
    eventData.id = 'evt_' + Date.now();
    state.events.push(eventData);
  }

  saveEvents();
  renderCalendar();
  closeModal();
}

function handleDelete() {
  if (!state.editingEventId) return;
  if (!confirm('Delete this event?')) return;

  state.events = state.events.filter(e => e.id !== state.editingEventId);
  saveEvents();
  renderCalendar();
  closeModal();
}

// ── Navigation ──

function goToPrevMonth() {
  state.currentMonth--;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear--;
  }
  renderCalendar();
}

function goToNextMonth() {
  state.currentMonth++;
  if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear++;
  }
  renderCalendar();
}

function goToToday() {
  state.currentYear = today.getFullYear();
  state.currentMonth = today.getMonth();
  renderCalendar();
}

// ── Category Filters ──

function renderCategoryFilters() {
  categoryFiltersEl.innerHTML = '';
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    if (!state.activeFilters.has(key)) chip.classList.add('inactive');
    chip.style.background = cat.color;
    chip.innerHTML = `<span class="chip-dot"></span>${cat.label}`;
    chip.addEventListener('click', () => toggleFilter(key));
    categoryFiltersEl.appendChild(chip);
  }
}

function toggleFilter(key) {
  if (state.activeFilters.has(key)) {
    if (state.activeFilters.size === 1) return;
    state.activeFilters.delete(key);
  } else {
    state.activeFilters.add(key);
  }
  renderCategoryFilters();
  renderCalendar();
}

// ── Event Listeners ──

document.getElementById('prev-month').addEventListener('click', goToPrevMonth);
document.getElementById('next-month').addEventListener('click', goToNextMonth);
document.getElementById('today-btn').addEventListener('click', goToToday);
eventForm.addEventListener('submit', handleSave);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
deleteBtn.addEventListener('click', handleDelete);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    closeModal();
  }
});

titleInput.addEventListener('input', () => { titleError.textContent = ''; });
dateInput.addEventListener('input', () => { dateError.textContent = ''; });

// ── Init ──

state.events = loadEvents();
renderWeekdayLabels();
renderCategoryFilters();
renderCalendar();
