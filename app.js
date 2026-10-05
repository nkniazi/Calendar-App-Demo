// ── Constants ──
const STORAGE_KEY = 'chronosEvents';
const GOALS_KEY = 'chronosGoals';
const PREFS_KEY = 'chronosPreferences';
const DATA_VERSION_KEY = 'chronosDataVersion';
const CATEGORIES_KEY = 'chronosCategories';
const CURRENT_DATA_VERSION = 3;
const MAX_ACTIVE_CATEGORIES = 15;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_MINI = ['M','T','W','T','F','S','S'];
const HOUR_H = 60;
const MAX_MONTH_EVENTS = 3;

const DEFAULT_CATEGORIES = {
  'faith':          { label: 'Faith',                      color: '#8b5cf6', light: 'rgba(139,92,246,0.13)',  dark: '#6d28d9' },
  'sleep':          { label: 'Sleep',                      color: '#64748b', light: 'rgba(100,116,139,0.13)', dark: '#475569' },
  'work-money':     { label: 'Work / Money',               color: '#6366f1', light: 'rgba(99,102,241,0.13)',  dark: '#4338ca' },
  'food-meals':     { label: 'Food / Meals',               color: '#f59e0b', light: 'rgba(245,158,11,0.13)',  dark: '#b45309' },
  'family':         { label: 'Family / Relationships',     color: '#ec4899', light: 'rgba(236,72,153,0.13)',  dark: '#be185d' },
  'entertainment':  { label: 'Entertainment / Recreation', color: '#10b981', light: 'rgba(16,185,129,0.13)',  dark: '#047857' },
  'personal-other': { label: 'Personal / Other',           color: '#06b6d4', light: 'rgba(6,182,212,0.13)',   dark: '#0e7490' },
};
let CATEGORIES = { ...DEFAULT_CATEGORIES };

const CATEGORY_MIGRATION = {
  work: 'work-money',
  personal: 'personal-other',
  health: 'personal-other',
  social: 'family',
  learning: 'work-money',
  general: 'personal-other',
};

// ── State ──
const state = {
  categories: [],
  currentDate: new Date(),
  currentPage: 'dashboard',
  currentView: localStorage.getItem('chronosView') || 'week',
  events: [],
  goals: [],
  preferences: { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' },
  editingEventId: null,
  editingType: 'event',
  activeCategories: new Set(Object.keys(CATEGORIES)),
  sidebarOpen: false,
  miniCalDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedCategory: 'personal-other',
  taskFilter: 'incomplete',
  taskSort: 'date',
};

// ── DOM ──
const $ = id => document.getElementById(id);
const viewEl       = $('calendar-view');
const headingEl    = $('date-heading');
const sidebarEl    = $('sidebar');
const overlayEl    = $('sidebar-overlay');
const miniGridEl   = $('mini-cal-grid');
const miniWdEl     = $('mini-cal-weekdays');
const miniLabelEl  = $('mini-month-year');
const calListEl    = $('calendar-list');
const modalEl      = $('modal-overlay');
const modalTitleEl = $('modal-title');
const formEl       = $('event-form');
const fTitle       = $('event-title');
const fDate        = $('event-date');
const fStart       = $('event-start');
const fEnd         = $('event-end');
const fAllDay      = $('event-allday');
const fDesc        = $('event-desc');
const fTimeRow     = $('time-row');
const errTitle     = $('title-error');
const errDate      = $('date-error');
const deleteBtn    = $('delete-btn');
const catPicker    = $('category-picker');

// ── Utilities ──
function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function dateStr(d) { return fmtDate(d.getFullYear(), d.getMonth(), d.getDate()); }
function todayStr() { return dateStr(new Date()); }
function timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function getMonday(d) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return h + ' AM';
  if (h === 12) return '12 PM';
  return (h - 12) + ' PM';
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hr} ${p}` : `${hr}:${pad(m)} ${p}`;
}

function catStyle(cat) {
  if (CATEGORIES[cat]) return CATEGORIES[cat];
  const archived = state.categories.find(c => c.id === cat && c.status === 'archived');
  if (archived) return { label: archived.label, color: '#94a3b8', light: 'rgba(148,163,184,0.13)', dark: '#64748b' };
  return CATEGORIES['personal-other'] || { label: 'Other', color: '#94a3b8', light: 'rgba(148,163,184,0.13)', dark: '#64748b' };
}

// ── Storage ──
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const version = parseInt(localStorage.getItem(DATA_VERSION_KEY)) || 1;
    const events = JSON.parse(raw).map(e => {
      if (e.time && !e.startTime) {
        e.startTime = e.time;
        const [h] = e.time.split(':').map(Number);
        e.endTime = `${pad(Math.min(h + 1, 23))}:00`;
        delete e.time;
      }
      if (!e.startTime) { e.startTime = '09:00'; e.endTime = '10:00'; }
      if (!e.endTime) { const [h] = e.startTime.split(':').map(Number); e.endTime = `${pad(Math.min(h+1,23))}:00`; }
      if (e.allDay === undefined) e.allDay = false;
      if (!e.type) e.type = 'event';
      if (e.type === 'task' && e.completed === undefined) e.completed = false;
      if (version < 2 && e.category && CATEGORY_MIGRATION[e.category]) {
        e.category = CATEGORY_MIGRATION[e.category];
      }
      if (!e.category || !categoryExists(e.category)) e.category = 'personal-other';
      return e;
    });
    if (version < CURRENT_DATA_VERSION) {
      localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_DATA_VERSION));
      localStorage.setItem(STORAGE_KEY + '_v1_backup', raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }
    return events;
  } catch { return []; }
}
function saveEvents() {
  safeSave(STORAGE_KEY, state.events);
}

function loadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveGoals() {
  safeSave(GOALS_KEY, state.goals);
}

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const defaults = { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch { return { sleepHours: 7, workHoursTarget: 8, startPage: 'dashboard' }; }
}
function savePreferences() {
  safeSave(PREFS_KEY, state.preferences);
}

// ── Categories ──
function seedDefaultCategories() {
  const now = new Date().toISOString();
  let order = 0;
  return Object.entries(DEFAULT_CATEGORIES).map(([id, cat]) => ({
    id, label: cat.label, color: cat.color, light: cat.light, dark: cat.dark,
    type: id === 'sleep' ? 'system' : 'user',
    status: 'active', order: order++, createdAt: now, archivedAt: null,
  }));
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedDefaultCategories();
}

function saveCategories() {
  safeSave(CATEGORIES_KEY, state.categories);
}

function rebuildCategories() {
  CATEGORIES = {};
  state.categories
    .filter(c => c.status === 'active')
    .sort((a, b) => a.order - b.order)
    .forEach(c => {
      CATEGORIES[c.id] = { label: c.label, color: c.color, light: c.light, dark: c.dark };
    });
}

function getAllCategories() {
  return [...state.categories].sort((a, b) => a.order - b.order);
}

function categoryExists(id) {
  return state.categories.some(c => c.id === id);
}

function generateColorVariants(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const light = `rgba(${r},${g},${b},0.13)`;
  const dr = Math.max(0, Math.floor(r * 0.7));
  const dg = Math.max(0, Math.floor(g * 0.7));
  const db = Math.max(0, Math.floor(b * 0.7));
  const dark = `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
  return { light, dark };
}

function toKebabCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueCategoryId(base) {
  let id = toKebabCase(base);
  if (!id) id = 'category';
  let candidate = id, n = 2;
  while (state.categories.some(c => c.id === candidate)) { candidate = `${id}-${n++}`; }
  return candidate;
}

// ── Budget & Balance Calculations ──
function calculateDayBudget(ds) {
  const dayEvents = state.events.filter(e => e.date === ds && e.type !== 'task');
  const totals = {};
  for (const key of Object.keys(CATEGORIES)) totals[key] = 0;
  let scheduledMin = 0;
  dayEvents.forEach(e => {
    let dur;
    if (e.allDay) {
      if (e.category === 'sleep') dur = (state.preferences.sleepHours || 7) * 60;
      else if (e.category === 'work-money') dur = (state.preferences.workHoursTarget || 8) * 60;
      else dur = 480;
    } else {
      dur = Math.max(0, timeToMin(e.endTime) - timeToMin(e.startTime));
    }
    totals[e.category] = (totals[e.category] || 0) + dur;
    scheduledMin += dur;
  });
  return { categoryTotals: totals, scheduledMinutes: scheduledMin, freeMinutes: Math.max(0, 1440 - scheduledMin), overbooked: scheduledMin > 1440 };
}

function calculateWeekBudget(weekStartDate) {
  const result = {};
  for (const key of Object.keys(CATEGORIES)) result[key] = 0;
  let totalScheduled = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStartDate, i);
    const budget = calculateDayBudget(dateStr(d));
    for (const key of Object.keys(budget.categoryTotals)) {
      result[key] = (result[key] || 0) + budget.categoryTotals[key];
    }
    totalScheduled += budget.scheduledMinutes;
  }
  return { categoryTotals: result, totalScheduledMinutes: totalScheduled };
}

function calculateBalanceScore(weekStartDate) {
  if (!state.goals.length) return null;
  const weekBudget = calculateWeekBudget(weekStartDate);
  let totalScore = 0, count = 0;
  state.goals.filter(g => g.active).forEach(g => {
    const actualMin = weekBudget.categoryTotals[g.category] || 0;
    const targetMin = g.targetHoursPerWeek * 60;
    if (targetMin > 0) {
      totalScore += Math.min(1, actualMin / targetMin) * 100;
      count++;
    }
  });
  return count > 0 ? Math.round(totalScore / count) : null;
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTasksForDate(ds) {
  return state.events.filter(e => e.type === 'task' && e.date === ds);
}

function eventsForDate(ds) {
  return state.events
    .filter(e => e.date === ds && state.activeCategories.has(e.category))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return timeToMin(a.startTime) - timeToMin(b.startTime);
    });
}

// ── Overlap Layout ──
function layoutColumns(events) {
  const timed = events.filter(e => !e.allDay);
  if (!timed.length) return [];
  timed.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime) || timeToMin(b.endTime) - timeToMin(a.endTime));
  const groups = [];
  let g = [timed[0]], gEnd = timeToMin(timed[0].endTime);
  for (let i = 1; i < timed.length; i++) {
    if (timeToMin(timed[i].startTime) < gEnd) {
      g.push(timed[i]);
      gEnd = Math.max(gEnd, timeToMin(timed[i].endTime));
    } else {
      groups.push(g);
      g = [timed[i]];
      gEnd = timeToMin(timed[i].endTime);
    }
  }
  groups.push(g);
  groups.forEach(group => {
    const cols = [];
    group.forEach(ev => {
      let c = 0;
      while (c < cols.length && timeToMin(cols[c].endTime) > timeToMin(ev.startTime)) c++;
      if (c === cols.length) cols.push(null);
      cols[c] = ev;
      ev._col = c;
    });
    group.forEach(ev => { ev._numCols = cols.length; });
  });
  return timed;
}

// ── Mini Calendar ──
function renderMiniCal() {
  const y = state.miniCalDate.getFullYear(), m = state.miniCalDate.getMonth();
  miniLabelEl.textContent = `${MONTHS_SHORT[m]} ${y}`;
  miniWdEl.innerHTML = '';
  DAYS_MINI.forEach(d => {
    const el = document.createElement('div');
    el.className = 'mini-cal-wd';
    el.textContent = d;
    miniWdEl.appendChild(el);
  });
  miniGridEl.innerHTML = '';
  const first = new Date(y, m, 1);
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
  const dim = daysInMonth(y, m);
  const prevDim = daysInMonth(y, m - 1);
  const todayS = todayStr();
  const selS = dateStr(state.currentDate);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDim - i;
    const pm = m - 1 < 0 ? 11 : m - 1;
    const py = m - 1 < 0 ? y - 1 : y;
    addMiniDay(py, pm, d, true, todayS, selS);
  }
  for (let d = 1; d <= dim; d++) addMiniDay(y, m, d, false, todayS, selS);
  const total = miniGridEl.children.length;
  const rem = (Math.ceil(total / 7) * 7) - total;
  for (let d = 1; d <= rem; d++) {
    const nm = m + 1 > 11 ? 0 : m + 1;
    const ny = m + 1 > 11 ? y + 1 : y;
    addMiniDay(ny, nm, d, true, todayS, selS);
  }
}

function addMiniDay(y, m, d, outside, todayS, selS) {
  const ds = fmtDate(y, m, d);
  const el = document.createElement('div');
  el.className = 'mini-cal-day';
  if (outside) el.classList.add('outside');
  if (ds === todayS) el.classList.add('today');
  if (ds === selS && ds !== todayS) el.classList.add('selected');
  if (state.events.some(e => e.date === ds)) el.classList.add('has-events');
  el.textContent = d;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `${MONTHS[m]} ${d}`);
  const nav = () => { state.currentDate = new Date(y, m, d); renderAll(); };
  el.addEventListener('click', nav);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nav(); } });
  miniGridEl.appendChild(el);
}

// ── Calendar List ──
function renderCalList() {
  calListEl.innerHTML = '';
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const el = document.createElement('div');
    const active = state.activeCategories.has(key);
    el.className = 'cal-item' + (active ? ' active' : '');
    el.setAttribute('role', 'checkbox');
    el.setAttribute('aria-checked', String(active));
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${cat.label} calendar`);
    el.innerHTML = `<div class="cal-check" style="border-color:${cat.color};color:${cat.color}"></div><span class="cal-item-label">${cat.label}</span>`;
    const toggle = () => {
      if (state.activeCategories.has(key)) {
        if (state.activeCategories.size > 1) state.activeCategories.delete(key);
      } else {
        state.activeCategories.add(key);
      }
      renderCalList();
      renderView();
      renderMiniCal();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    calListEl.appendChild(el);
  }
  const manageLink = document.createElement('button');
  manageLink.className = 'cal-manage-link';
  manageLink.textContent = 'Manage Categories';
  manageLink.addEventListener('click', () => switchPage('categories'));
  calListEl.appendChild(manageLink);
}

// ── Date Heading ──
function updateHeading() {
  const d = state.currentDate;
  if (state.currentPage === 'dashboard') { headingEl.textContent = 'Dashboard'; return; }
  if (state.currentPage === 'tasks') { headingEl.textContent = 'Tasks'; return; }
  if (state.currentPage === 'goals') { headingEl.textContent = 'Goals'; return; }
  if (state.currentPage === 'settings') { headingEl.textContent = 'Settings'; return; }
  if (state.currentPage === 'categories') { headingEl.textContent = 'Manage Categories'; return; }
  switch (state.currentView) {
    case 'day':
      headingEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      break;
    case '3day': {
      const end = addDays(d, 2);
      headingEl.textContent = d.getMonth() === end.getMonth()
        ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} – ${end.getDate()}, ${d.getFullYear()}`
        : `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
      break;
    }
    case 'week': {
      const ws = getMonday(d), we = addDays(ws, 6);
      headingEl.textContent = ws.getMonth() === we.getMonth()
        ? `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`
        : `${MONTHS_SHORT[ws.getMonth()]} ${ws.getDate()} – ${MONTHS_SHORT[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
      break;
    }
    case 'month':
    case 'agenda':
      headingEl.textContent = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      break;
    case 'year':
      headingEl.textContent = String(d.getFullYear());
      break;
  }
}

// ── Page Router ──
function switchPage(page) {
  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => {
    const isActive = n.dataset.page === page;
    n.classList.toggle('active', isActive);
  });
  const toolbar = document.querySelector('.toolbar');
  const viewSwitcher = document.getElementById('view-switcher');
  const navArrows = document.querySelector('.nav-arrows');
  const todayBtn = document.getElementById('today-btn');
  if (page === 'calendar') {
    toolbar.style.display = '';
    viewSwitcher.style.display = '';
    navArrows.style.display = '';
    todayBtn.style.display = '';
  } else {
    toolbar.style.display = page === 'dashboard' ? 'none' : '';
    viewSwitcher.style.display = 'none';
    navArrows.style.display = 'none';
    todayBtn.style.display = 'none';
  }
  renderView();
  renderMiniCal();
}

// ── View Router ──
function renderView() {
  viewEl.innerHTML = '';
  switch (state.currentPage) {
    case 'dashboard': renderDashboard(); break;
    case 'tasks': renderTasksView(); break;
    case 'goals': renderGoalsView(); break;
    case 'settings': renderSettingsView(); break;
    case 'categories': renderCategoriesView(); break;
    case 'calendar':
    default:
      switch (state.currentView) {
        case 'day': renderTimeView(1); break;
        case '3day': renderTimeView(3); break;
        case 'week': renderTimeView(7); break;
        case 'month': renderMonthView(); break;
        case 'agenda': renderAgendaView(); break;
        case 'year': renderYearView(); break;
      }
      break;
  }
}

// ── Time View (Day / 3-Day / Week) ──
function renderTimeView(numDays) {
  const startDate = numDays === 7 ? getMonday(state.currentDate) : new Date(state.currentDate);
  const dates = [];
  for (let i = 0; i < numDays; i++) dates.push(addDays(startDate, i));
  const todayS = todayStr();

  const wrap = document.createElement('div');
  wrap.className = 'time-view';

  // Header
  const header = document.createElement('div');
  header.className = 'tv-header';
  header.innerHTML = '<div class="tv-gutter"></div>';
  const hCols = document.createElement('div');
  hCols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const col = document.createElement('div');
    col.className = 'tv-col-header' + (ds === todayS ? ' today' : '');
    col.innerHTML = `<div class="tv-day-name">${DAYS_SHORT[(d.getDay() + 6) % 7]}</div><div class="tv-day-num">${d.getDate()}</div>`;
    hCols.appendChild(col);
  });
  header.appendChild(hCols);
  wrap.appendChild(header);

  // All-day
  const allday = document.createElement('div');
  allday.className = 'tv-allday';
  allday.innerHTML = '<div class="tv-gutter">all-day</div>';
  const adCols = document.createElement('div');
  adCols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const cell = document.createElement('div');
    cell.className = 'tv-allday-cell';
    eventsForDate(ds).filter(e => e.allDay).forEach(e => {
      const chip = document.createElement('div');
      chip.className = 'allday-chip';
      const s = catStyle(e.category);
      chip.style.background = s.light;
      chip.style.color = s.dark;
      chip.textContent = e.title;
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', `${e.title}, all day, ${CATEGORIES[e.category]?.label || 'Work'}`);
      chip.addEventListener('click', ev => { ev.stopPropagation(); openModal(ds, e.id); });
      chip.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); openModal(ds, e.id); } });
      cell.appendChild(chip);
    });
    cell.addEventListener('click', () => openModal(ds, null, null, true));
    adCols.appendChild(cell);
  });
  allday.appendChild(adCols);
  wrap.appendChild(allday);

  // Scrollable body
  const scroll = document.createElement('div');
  scroll.className = 'tv-scroll';
  const body = document.createElement('div');
  body.className = 'tv-body';

  // Gutter
  const gutter = document.createElement('div');
  gutter.className = 'tv-gutter';
  for (let h = 0; h < 24; h++) {
    const lbl = document.createElement('div');
    lbl.className = 'tv-time-label';
    lbl.style.top = (h * HOUR_H) + 'px';
    lbl.textContent = formatHour(h);
    gutter.appendChild(lbl);
  }
  body.appendChild(gutter);

  // Day columns
  const cols = document.createElement('div');
  cols.className = 'tv-columns';
  dates.forEach(d => {
    const ds = dateStr(d);
    const col = document.createElement('div');
    col.className = 'tv-day-col' + (ds === todayS ? ' today-col' : '');
    for (let h = 0; h < 24; h++) {
      const slot = document.createElement('div');
      slot.className = 'tv-hour-slot';
      col.appendChild(slot);
    }
    col.addEventListener('click', e => {
      if (e.target.closest('.event-block')) return;
      const rect = col.getBoundingClientRect();
      const y = e.clientY - rect.top + scroll.scrollTop;
      const totalMin = Math.round((y / HOUR_H) * 60 / 15) * 15;
      const h = Math.min(23, Math.floor(totalMin / 60));
      const m = totalMin % 60;
      openModal(ds, null, `${pad(h)}:${pad(m)}`);
    });

    // Render events
    const timedEvents = eventsForDate(ds).filter(e => !e.allDay);
    layoutColumns(timedEvents);
    timedEvents.forEach(ev => {
      const s = catStyle(ev.category);
      const startMin = timeToMin(ev.startTime);
      const endMin = timeToMin(ev.endTime);
      const top = (startMin / 60) * HOUR_H;
      const height = Math.max(((endMin - startMin) / 60) * HOUR_H, HOUR_H / 3);
      const numCols = ev._numCols || 1;
      const c = ev._col || 0;
      const block = document.createElement('div');
      block.className = 'event-block';
      block.style.cssText = `top:${top}px;height:${height}px;left:calc(${c}/${numCols}*100% + 3px);width:calc(${1/numCols}*100% - 6px);background:${s.light};border-left-color:${s.color};color:${s.dark}`;
      block.setAttribute('role', 'button');
      block.setAttribute('tabindex', '0');
      block.setAttribute('aria-label', `${ev.title}, ${formatTime12(ev.startTime)} to ${formatTime12(ev.endTime)}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
      block.innerHTML = `<div class="eb-title">${esc(ev.title)}</div><div class="eb-time">${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}</div>`;
      block.addEventListener('click', e => { e.stopPropagation(); openModal(ds, ev.id); });
      block.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openModal(ds, ev.id); } });
      col.appendChild(block);
    });
    cols.appendChild(col);
  });

  // Hour lines
  for (let h = 1; h < 24; h++) {
    const line = document.createElement('div');
    line.className = 'tv-hour-line';
    line.style.top = (h * HOUR_H) + 'px';
    cols.appendChild(line);
  }

  body.appendChild(cols);

  // Now indicator
  const nowDate = new Date();
  const nowDs = dateStr(nowDate);
  if (dates.some(d => dateStr(d) === nowDs)) {
    const mins = nowDate.getHours() * 60 + nowDate.getMinutes();
    const top = (mins / 60) * HOUR_H;
    const indicator = document.createElement('div');
    indicator.className = 'now-indicator';
    indicator.id = 'now-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.style.top = top + 'px';
    indicator.innerHTML = '<div class="now-dot"></div><div class="now-line"></div>';
    body.appendChild(indicator);
  }

  scroll.appendChild(body);
  wrap.appendChild(scroll);
  viewEl.appendChild(wrap);

  // Scroll to current time or 8 AM
  requestAnimationFrame(() => {
    const target = dates.some(d => dateStr(d) === nowDs)
      ? Math.max(0, (nowDate.getHours() - 1) * HOUR_H)
      : 8 * HOUR_H;
    scroll.scrollTop = target;
  });
}

// ── Month View ──
function renderMonthView() {
  const y = state.currentDate.getFullYear(), m = state.currentDate.getMonth();
  const wrap = document.createElement('div');
  wrap.className = 'month-view';

  const wdRow = document.createElement('div');
  wdRow.className = 'mv-weekdays';
  DAYS_SHORT.forEach(d => {
    const el = document.createElement('div');
    el.className = 'mv-wd';
    el.textContent = d;
    wdRow.appendChild(el);
  });
  wrap.appendChild(wdRow);

  const grid = document.createElement('div');
  grid.className = 'mv-grid';
  const first = new Date(y, m, 1);
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
  const dim = daysInMonth(y, m);
  const prevDim = daysInMonth(y, m - 1);
  const todayS = todayStr();
  const totalCells = Math.ceil((startDay + dim) / 7) * 7;
  grid.style.gridTemplateRows = `repeat(${totalCells / 7}, 1fr)`;

  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevDim - i;
    const pm = m - 1 < 0 ? 11 : m - 1, py = m - 1 < 0 ? y - 1 : y;
    addMonthCell(grid, py, pm, d, true, todayS);
  }
  for (let d = 1; d <= dim; d++) addMonthCell(grid, y, m, d, false, todayS);
  const rem = totalCells - grid.children.length;
  for (let d = 1; d <= rem; d++) {
    const nm = m + 1 > 11 ? 0 : m + 1, ny = m + 1 > 11 ? y + 1 : y;
    addMonthCell(grid, ny, nm, d, true, todayS);
  }
  wrap.appendChild(grid);
  viewEl.appendChild(wrap);
}

function addMonthCell(grid, y, m, d, outside, todayS) {
  const ds = fmtDate(y, m, d);
  const cell = document.createElement('div');
  cell.className = 'mv-cell' + (outside ? ' outside' : '') + (ds === todayS ? ' today' : '');
  const num = document.createElement('div');
  num.className = 'mv-day-num';
  num.textContent = d;
  cell.appendChild(num);

  const events = eventsForDate(ds);
  events.slice(0, MAX_MONTH_EVENTS).forEach(ev => {
    const s = catStyle(ev.category);
    const pill = document.createElement('div');
    pill.className = 'mv-event';
    pill.style.cssText = `background:${s.light};color:${s.dark};border-left-color:${s.color}`;
    pill.textContent = ev.allDay ? ev.title : `${formatTime12(ev.startTime)} ${ev.title}`;
    pill.setAttribute('role', 'button');
    pill.setAttribute('tabindex', '0');
    pill.setAttribute('aria-label', `${ev.title}${ev.allDay ? ', all day' : `, ${formatTime12(ev.startTime)}`}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
    pill.addEventListener('click', e => { e.stopPropagation(); openModal(ds, ev.id); });
    pill.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openModal(ds, ev.id); } });
    cell.appendChild(pill);
  });
  if (events.length > MAX_MONTH_EVENTS) {
    const more = document.createElement('div');
    more.className = 'mv-more';
    more.textContent = `+${events.length - MAX_MONTH_EVENTS} more`;
    cell.appendChild(more);
  }
  cell.addEventListener('click', () => openModal(ds));
  grid.appendChild(cell);
}

// ── Agenda View ──
function renderAgendaView() {
  const wrap = document.createElement('div');
  wrap.className = 'agenda-view';
  const todayS = todayStr();
  let found = false;
  for (let i = 0; i < 60; i++) {
    const d = addDays(state.currentDate, i);
    const ds = dateStr(d);
    const events = eventsForDate(ds);
    if (!events.length) continue;
    found = true;
    const section = document.createElement('div');
    section.className = 'agenda-day';
    const isToday = ds === todayS;
    const label = isToday ? 'Today' : ds === dateStr(addDays(new Date(), 1)) ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dateEl = document.createElement('div');
    dateEl.className = 'agenda-date' + (isToday ? ' today-label' : '');
    dateEl.textContent = label;
    section.appendChild(dateEl);

    events.forEach(ev => {
      const s = catStyle(ev.category);
      const row = document.createElement('div');
      row.className = 'agenda-event';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `${ev.title}, ${ev.allDay ? 'all day' : `${formatTime12(ev.startTime)} to ${formatTime12(ev.endTime)}`}, ${CATEGORIES[ev.category]?.label || 'Work'}`);
      row.innerHTML = `
        <div class="agenda-time">${ev.allDay ? 'All day' : `${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}`}</div>
        <div class="agenda-dot" style="background:${s.color}"></div>
        <div class="agenda-info">
          <div class="agenda-title">${esc(ev.title)}</div>
          ${ev.description ? `<div class="agenda-desc">${esc(ev.description)}</div>` : ''}
        </div>`;
      row.addEventListener('click', () => openModal(ds, ev.id));
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(ds, ev.id); } });
      section.appendChild(row);
    });
    wrap.appendChild(section);
  }
  if (!found) {
    wrap.innerHTML = '<div class="agenda-empty">No upcoming events in the next 60 days</div>';
  }
  viewEl.appendChild(wrap);
}

// ── Year View ──
function renderYearView() {
  const year = state.currentDate.getFullYear();
  const wrap = document.createElement('div');
  wrap.className = 'year-view';
  const todayS = todayStr();

  for (let m = 0; m < 12; m++) {
    const card = document.createElement('div');
    const today = new Date();
    card.className = 'yv-month' + (m === today.getMonth() && year === today.getFullYear() ? ' current' : '');
    card.innerHTML = `<div class="yv-month-name">${MONTHS[m]}</div>`;
    const grid = document.createElement('div');
    grid.className = 'yv-grid';
    DAYS_MINI.forEach(d => {
      const wd = document.createElement('div');
      wd.className = 'yv-wd';
      wd.textContent = d;
      grid.appendChild(wd);
    });
    const first = new Date(year, m, 1);
    let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
    const dim = daysInMonth(year, m);
    for (let i = 0; i < startDay; i++) {
      const el = document.createElement('div');
      el.className = 'yv-day outside';
      grid.appendChild(el);
    }
    for (let d = 1; d <= dim; d++) {
      const ds = fmtDate(year, m, d);
      const el = document.createElement('div');
      el.className = 'yv-day' + (ds === todayS ? ' today' : '') + (state.events.some(e => e.date === ds) ? ' has-events' : '');
      el.textContent = d;
      grid.appendChild(el);
    }
    card.appendChild(grid);
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${MONTHS[m]} ${year}`);
    const navToMonth = () => { state.currentDate = new Date(year, m, 1); switchView('month'); };
    card.addEventListener('click', navToMonth);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navToMonth(); } });
    wrap.appendChild(card);
  }
  viewEl.appendChild(wrap);
}

// ── Dashboard View ──
function renderDashboard() {
  const todayS = todayStr();
  const budget = calculateDayBudget(todayS);
  const todayEvents = eventsForDate(todayS);
  const incompleteTasks = state.events.filter(e => e.type === 'task' && !e.completed);
  const nowDate = new Date();
  const hour = nowDate.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const nextEvent = todayEvents.filter(e => !e.allDay && e.type !== 'task' && timeToMin(e.startTime) > nowDate.getHours() * 60 + nowDate.getMinutes())[0];

  const weekStart = getMonday(state.currentDate);
  const balanceScore = calculateBalanceScore(weekStart);

  const wrap = document.createElement('div');
  wrap.className = 'dashboard-view';

  // Header
  wrap.innerHTML = `
    <div class="dash-header">
      <div>
        <h1 class="dash-greeting">${greeting}</h1>
        <p class="dash-date">${nowDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
      <button class="dash-ai-btn" onclick="handlePlanDay()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 014 4v1a2 2 0 012 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2V6a4 4 0 014-4z"/><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 14v4"/></svg>
        Plan My Day
      </button>
    </div>
    <div class="dash-grid">
      <div class="dash-card dash-summary">
        <h3 class="dash-card-title">Today's Overview</h3>
        <div class="dash-stats">
          <div class="dash-stat">
            <span class="dash-stat-value">${formatMinutes(budget.scheduledMinutes)}</span>
            <span class="dash-stat-label">Scheduled</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${formatMinutes(budget.freeMinutes)}</span>
            <span class="dash-stat-label">Free</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${todayEvents.filter(e => e.type !== 'task').length}</span>
            <span class="dash-stat-label">Events</span>
          </div>
          <div class="dash-stat">
            <span class="dash-stat-value">${incompleteTasks.length}</span>
            <span class="dash-stat-label">Tasks</span>
          </div>
        </div>
        ${budget.overbooked ? '<div class="dash-overbooked">⚠ Overbooked! Scheduled time exceeds 24 hours.</div>' : ''}
        ${nextEvent ? `<div class="dash-next">Next: <strong>${esc(nextEvent.title)}</strong> at ${formatTime12(nextEvent.startTime)}</div>` : '<div class="dash-next dash-next-free">No more events today</div>'}
      </div>

      <div class="dash-card dash-budget">
        <h3 class="dash-card-title">24-Hour Budget</h3>
        <div class="dash-budget-ring" id="budget-ring"></div>
      </div>

      ${balanceScore !== null ? `
      <div class="dash-card dash-balance">
        <h3 class="dash-card-title">Life Balance Score</h3>
        <div class="dash-score ${balanceScore >= 75 ? 'score-good' : balanceScore >= 50 ? 'score-ok' : 'score-low'}">
          <span class="dash-score-num">${balanceScore}</span>
          <span class="dash-score-max">/ 100</span>
        </div>
        <p class="dash-score-msg">${balanceScore >= 75 ? 'Great balance!' : balanceScore >= 50 ? 'Some areas need attention' : 'Review your schedule'}</p>
        <button class="btn btn-ghost btn-sm" onclick="switchPage('goals')">View Goals</button>
      </div>` : `
      <div class="dash-card dash-balance">
        <h3 class="dash-card-title">Life Balance Score</h3>
        <p class="dash-score-msg" style="margin:16px 0">Set weekly goals to see your balance score</p>
        <button class="btn btn-ghost btn-sm" onclick="switchPage('goals')">Set Goals</button>
      </div>`}

      <div class="dash-card dash-categories">
        <h3 class="dash-card-title">Time by Category</h3>
        <div class="dash-cat-bars">
          ${Object.entries(CATEGORIES).map(([key, cat]) => {
            const min = budget.categoryTotals[key] || 0;
            const pct = Math.min(100, (min / 1440) * 100);
            return `<div class="dash-cat-row">
              <span class="dash-cat-dot" style="background:${cat.color}"></span>
              <span class="dash-cat-label">${cat.label}</span>
              <div class="dash-cat-bar-track"><div class="dash-cat-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
              <span class="dash-cat-time">${min > 0 ? formatMinutes(min) : '—'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="dash-card dash-tasks-card">
        <h3 class="dash-card-title">Tasks <span class="dash-tasks-count">${incompleteTasks.length} pending</span></h3>
        <div class="dash-tasks-list">
          ${incompleteTasks.slice(0, 5).map(t => `
            <div class="dash-task-item" data-id="${t.id}">
              <label class="dash-task-check">
                <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')">
                <span class="dash-task-checkmark"></span>
              </label>
              <span class="dash-task-title">${esc(t.title)}</span>
              <span class="dash-cat-dot" style="background:${catStyle(t.category).color}" title="${CATEGORIES[t.category]?.label || ''}"></span>
            </div>
          `).join('')}
          ${incompleteTasks.length === 0 ? '<p class="dash-empty">No pending tasks</p>' : ''}
          ${incompleteTasks.length > 5 ? `<p class="dash-more" onclick="switchPage('tasks')">+${incompleteTasks.length - 5} more tasks</p>` : ''}
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="openTaskModal()">+ Add Task</button>
      </div>

      <div class="dash-card dash-week-chart">
        <h3 class="dash-card-title">This Week</h3>
        <div class="dash-week-bars" id="week-chart"></div>
      </div>
    </div>
  `;

  viewEl.appendChild(wrap);
  renderBudgetRing(budget);
  renderWeekChart();
}

function renderBudgetRing(budget) {
  const el = document.getElementById('budget-ring');
  if (!el) return;
  const size = 180, stroke = 20, radius = (size - stroke) / 2, circ = 2 * Math.PI * radius;
  let segments = '';
  let offset = 0;
  const entries = Object.entries(budget.categoryTotals).filter(([, v]) => v > 0);
  const total = Math.max(budget.scheduledMinutes, 1);

  const totalForRing = Math.max(budget.scheduledMinutes, 1440);
  entries.forEach(([key]) => {
    const min = budget.categoryTotals[key];
    const pct = min / totalForRing;
    const len = pct * circ;
    const cat = CATEGORIES[key];
    segments += `<circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="${cat.color}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" />`;
    offset += len;
  });

  const freePct = budget.freeMinutes / 1440;
  if (freePct > 0 && !budget.overbooked) {
    const len = freePct * circ;
    segments += `<circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size/2} ${size/2})" />`;
  }

  el.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" />
      ${segments}
    </svg>
    <div class="budget-ring-center ${budget.overbooked ? 'overbooked' : ''}">
      <span class="budget-ring-value">${budget.overbooked ? '+' + formatMinutes(budget.scheduledMinutes - 1440) : formatMinutes(budget.freeMinutes)}</span>
      <span class="budget-ring-label">${budget.overbooked ? 'OVER' : 'free'}</span>
    </div>
  `;
}

function renderWeekChart() {
  const el = document.getElementById('week-chart');
  if (!el) return;
  const weekStart = getMonday(state.currentDate);
  const todayS = todayStr();
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const ds = dateStr(d);
    const budget = calculateDayBudget(ds);
    const pct = Math.min(100, (budget.scheduledMinutes / 1440) * 100);
    const isToday = ds === todayS;
    html += `<div class="week-bar-col ${isToday ? 'today-col' : ''}">
      <div class="week-bar-track"><div class="week-bar-fill ${budget.overbooked ? 'overbooked' : ''}" style="height:${pct}%"></div></div>
      <span class="week-bar-label">${DAYS_MINI[i]}</span>
      <span class="week-bar-hours">${formatMinutes(budget.scheduledMinutes)}</span>
    </div>`;
  }
  el.innerHTML = html;
}

function toggleTask(id) {
  const task = state.events.find(e => e.id === id);
  if (task) {
    task.completed = !task.completed;
    saveEvents();
    renderView();
  }
}

function openTaskModal() {
  openModal(dateStr(state.currentDate), null, null, false, 'task');
}

// ── Tasks View ──
function renderTasksView() {
  const wrap = document.createElement('div');
  wrap.className = 'tasks-view';

  let tasks = state.events.filter(e => e.type === 'task');
  if (state.taskFilter === 'incomplete') tasks = tasks.filter(t => !t.completed);
  else if (state.taskFilter === 'completed') tasks = tasks.filter(t => t.completed);

  if (state.taskSort === 'date') tasks.sort((a, b) => a.date.localeCompare(b.date));
  else if (state.taskSort === 'priority') {
    const p = { high: 0, medium: 1, low: 2, undefined: 3 };
    tasks.sort((a, b) => (p[a.priority] ?? 3) - (p[b.priority] ?? 3));
  }

  wrap.innerHTML = `
    <div class="tasks-header">
      <h2 class="tasks-title">Tasks</h2>
      <button class="btn btn-primary btn-sm" onclick="openTaskModal()">+ New Task</button>
    </div>
    <div class="tasks-toolbar">
      <div class="tasks-filters">
        <button class="task-filter-btn ${state.taskFilter === 'all' ? 'active' : ''}" onclick="setTaskFilter('all')">All</button>
        <button class="task-filter-btn ${state.taskFilter === 'incomplete' ? 'active' : ''}" onclick="setTaskFilter('incomplete')">To Do</button>
        <button class="task-filter-btn ${state.taskFilter === 'completed' ? 'active' : ''}" onclick="setTaskFilter('completed')">Done</button>
      </div>
      <div class="tasks-sort">
        <select onchange="setTaskSort(this.value)">
          <option value="date" ${state.taskSort === 'date' ? 'selected' : ''}>Sort by Date</option>
          <option value="priority" ${state.taskSort === 'priority' ? 'selected' : ''}>Sort by Priority</option>
        </select>
      </div>
    </div>
    <div class="tasks-list">
      ${tasks.length === 0 ? '<div class="tasks-empty">No tasks found</div>' : ''}
      ${tasks.map(t => {
        const cat = catStyle(t.category);
        const prioClass = t.priority === 'high' ? 'prio-high' : t.priority === 'medium' ? 'prio-med' : 'prio-low';
        return `<div class="task-row ${t.completed ? 'completed' : ''}">
          <label class="task-check-label">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask('${t.id}')">
            <span class="task-checkmark"></span>
          </label>
          <div class="task-info" onclick="openModal('${t.date}', '${t.id}')">
            <span class="task-title">${esc(t.title)}</span>
            <span class="task-meta">
              <span class="task-cat-dot" style="background:${cat.color}"></span>
              ${t.date}
              ${t.priority ? `<span class="task-prio ${prioClass}">${t.priority}</span>` : ''}
            </span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
  viewEl.appendChild(wrap);
}

function setTaskFilter(f) { state.taskFilter = f; renderView(); }
function setTaskSort(s) { state.taskSort = s; renderView(); }

// ── Goals View ──
function renderGoalsView() {
  const wrap = document.createElement('div');
  wrap.className = 'goals-view';

  const weekStart = getMonday(state.currentDate);
  const weekBudget = calculateWeekBudget(weekStart);
  const score = calculateBalanceScore(weekStart);

  wrap.innerHTML = `
    <div class="goals-header">
      <h2 class="goals-title">Weekly Goals</h2>
      ${score !== null ? `<div class="goals-score ${score >= 75 ? 'score-good' : score >= 50 ? 'score-ok' : 'score-low'}">Score: ${score}/100</div>` : ''}
    </div>
    <p class="goals-desc">Set target hours per week for each life category. Your balance score measures how well your schedule matches these goals.</p>
    <div class="goals-list">
      ${Object.entries(CATEGORIES).map(([key, cat]) => {
        const goal = state.goals.find(g => g.category === key);
        const target = goal ? goal.targetHoursPerWeek : 0;
        const actualMin = weekBudget.categoryTotals[key] || 0;
        const actualH = Math.round(actualMin / 6) / 10;
        const pct = target > 0 ? Math.min(100, (actualMin / (target * 60)) * 100) : 0;
        return `<div class="goal-row">
          <div class="goal-cat">
            <span class="goal-dot" style="background:${cat.color}"></span>
            <span class="goal-label">${cat.label}</span>
          </div>
          <div class="goal-progress">
            <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%;background:${cat.color}"></div></div>
            <span class="goal-actual">${actualH}h / ${target}h</span>
          </div>
          <div class="goal-input-wrap">
            <input type="number" class="goal-input" min="0" max="168" step="0.5" value="${target}" data-cat="${key}" onchange="updateGoal('${key}', this.value)" placeholder="0">
            <span class="goal-unit">h/wk</span>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
  viewEl.appendChild(wrap);
}

function updateGoal(category, hours) {
  const h = parseFloat(hours) || 0;
  let goal = state.goals.find(g => g.category === category);
  if (goal) {
    goal.targetHoursPerWeek = h;
  } else {
    state.goals.push({
      id: 'goal_' + Date.now(),
      title: CATEGORIES[category]?.label || category,
      category,
      targetHoursPerWeek: h,
      description: '',
      active: true,
    });
  }
  saveGoals();
  renderView();
}

// ── Categories View ──
const COLOR_PRESETS = ['#8b5cf6','#6366f1','#3b82f6','#06b6d4','#10b981','#22c55e','#f59e0b','#f97316','#ef4444','#ec4899','#d946ef','#64748b','#78716c','#0ea5e9','#14b8a6','#a855f7'];

function renderCategoriesView() {
  const active = getAllCategories().filter(c => c.status === 'active');
  const archived = getAllCategories().filter(c => c.status === 'archived');
  const wrap = document.createElement('div');
  wrap.className = 'categories-view';

  let html = `
    <div class="cat-mgmt-header">
      <h2 class="cat-mgmt-title">Categories</h2>
      <button class="btn btn-primary btn-sm" id="cat-add-btn" ${active.length >= MAX_ACTIVE_CATEGORIES ? 'disabled title="Maximum ' + MAX_ACTIVE_CATEGORIES + ' categories"' : ''}>+ Add Category</button>
    </div>
    <p class="cat-mgmt-desc">Customize your life categories. Drag order, rename, or archive categories you no longer need.</p>
    <div class="cat-mgmt-list" id="cat-mgmt-list">`;

  active.forEach((c, i) => {
    html += `<div class="cat-mgmt-row" data-id="${c.id}">
      <div class="cat-mgmt-reorder">
        <button class="cat-reorder-btn" onclick="moveCategoryUp('${c.id}')" ${i === 0 ? 'disabled' : ''} aria-label="Move up">&#9650;</button>
        <button class="cat-reorder-btn" onclick="moveCategoryDown('${c.id}')" ${i === active.length - 1 ? 'disabled' : ''} aria-label="Move down">&#9660;</button>
      </div>
      <span class="cat-mgmt-dot" style="background:${c.color}"></span>
      <span class="cat-mgmt-label">${esc(c.label)}</span>
      ${c.type === 'system' ? '<span class="cat-mgmt-badge">System</span>' : ''}
      <div class="cat-mgmt-actions">
        <button class="btn btn-ghost btn-xs" onclick="openCategoryEditor('${c.id}')">Edit</button>
        ${c.type !== 'system' ? `<button class="btn btn-ghost btn-xs cat-archive-btn" onclick="archiveCategory('${c.id}')">Archive</button>` : ''}
      </div>
    </div>`;
  });

  html += `</div>`;

  if (archived.length > 0) {
    html += `
    <div class="cat-mgmt-archived">
      <button class="cat-archived-toggle" id="cat-archived-toggle" onclick="document.getElementById('cat-archived-list').classList.toggle('hidden');this.classList.toggle('expanded')">
        Archived (${archived.length})
      </button>
      <div class="cat-archived-list hidden" id="cat-archived-list">`;
    archived.forEach(c => {
      html += `<div class="cat-mgmt-row archived">
        <span class="cat-mgmt-dot" style="background:#94a3b8"></span>
        <span class="cat-mgmt-label">${esc(c.label)}</span>
        <div class="cat-mgmt-actions">
          <button class="btn btn-ghost btn-xs" onclick="restoreCategory('${c.id}')" ${active.length >= MAX_ACTIVE_CATEGORIES ? 'disabled title="Max categories reached"' : ''}>Restore</button>
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="cat-editor-area hidden" id="cat-editor-area"></div>`;

  wrap.innerHTML = html;
  viewEl.appendChild(wrap);

  document.getElementById('cat-add-btn').addEventListener('click', () => openCategoryEditor(null));
}

function openCategoryEditor(editId) {
  const area = document.getElementById('cat-editor-area');
  if (!area) return;
  const existing = editId ? state.categories.find(c => c.id === editId) : null;
  const title = existing ? 'Edit Category' : 'Add Category';
  const name = existing ? existing.label : '';
  const color = existing ? existing.color : COLOR_PRESETS.find(c => !state.categories.some(cat => cat.color === c)) || COLOR_PRESETS[0];

  area.classList.remove('hidden');
  area.innerHTML = `
    <div class="cat-editor">
      <h3 class="cat-editor-title">${title}</h3>
      <div class="form-group">
        <label for="cat-edit-name">Name</label>
        <input type="text" id="cat-edit-name" value="${esc(name)}" maxlength="40" placeholder="e.g. Learning">
        <span class="error-msg" id="cat-name-error"></span>
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="cat-color-grid" id="cat-color-grid">
          ${COLOR_PRESETS.map(c => `<button type="button" class="cat-color-swatch ${c === color ? 'selected' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}
        </div>
        <div class="cat-color-custom">
          <label for="cat-edit-hex">Custom:</label>
          <input type="text" id="cat-edit-hex" value="${color}" maxlength="7" placeholder="#hex" class="cat-hex-input">
        </div>
      </div>
      <div class="cat-editor-footer">
        <button class="btn btn-ghost" onclick="closeCategoryEditor()">Cancel</button>
        <button class="btn btn-primary" id="cat-save-btn">Save</button>
      </div>
    </div>
  `;

  let selectedColor = color;
  area.querySelectorAll('.cat-color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      area.querySelectorAll('.cat-color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = sw.dataset.color;
      document.getElementById('cat-edit-hex').value = selectedColor;
    });
  });
  document.getElementById('cat-edit-hex').addEventListener('input', (e) => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      selectedColor = v;
      area.querySelectorAll('.cat-color-swatch').forEach(s => s.classList.toggle('selected', s.dataset.color === v));
    }
  });
  document.getElementById('cat-save-btn').addEventListener('click', () => {
    const nameVal = document.getElementById('cat-edit-name').value.trim();
    const err = document.getElementById('cat-name-error');
    if (!nameVal) { err.textContent = 'Name is required'; return; }
    if (state.categories.some(c => c.label.toLowerCase() === nameVal.toLowerCase() && c.id !== editId && c.status === 'active')) {
      err.textContent = 'A category with that name already exists'; return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(selectedColor)) { err.textContent = 'Invalid hex color'; return; }
    saveCategory(editId, nameVal, selectedColor);
  });
  document.getElementById('cat-edit-name').focus();
}

function closeCategoryEditor() {
  const area = document.getElementById('cat-editor-area');
  if (area) area.classList.add('hidden');
}

function saveCategory(editId, label, color) {
  const variants = generateColorVariants(color);
  if (editId) {
    const cat = state.categories.find(c => c.id === editId);
    if (cat) {
      cat.label = label;
      cat.color = color;
      cat.light = variants.light;
      cat.dark = variants.dark;
    }
  } else {
    const id = uniqueCategoryId(label);
    const maxOrder = Math.max(-1, ...state.categories.map(c => c.order));
    state.categories.push({
      id, label, color, light: variants.light, dark: variants.dark,
      type: 'user', status: 'active', order: maxOrder + 1,
      createdAt: new Date().toISOString(), archivedAt: null,
    });
    state.activeCategories.add(id);
  }
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function archiveCategory(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat || cat.type === 'system') return;
  const activeCount = state.categories.filter(c => c.status === 'active').length;
  if (activeCount <= 1) return;
  if (!confirm(`Archive "${cat.label}"? Events in this category will be preserved but the category won't appear in the picker or goals.`)) return;
  cat.status = 'archived';
  cat.archivedAt = new Date().toISOString();
  state.activeCategories.delete(id);
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function restoreCategory(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const activeCount = state.categories.filter(c => c.status === 'active').length;
  if (activeCount >= MAX_ACTIVE_CATEGORIES) { alert(`Maximum ${MAX_ACTIVE_CATEGORIES} active categories.`); return; }
  cat.status = 'active';
  cat.archivedAt = null;
  state.activeCategories.add(id);
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function moveCategoryUp(id) {
  const active = getAllCategories().filter(c => c.status === 'active');
  const idx = active.findIndex(c => c.id === id);
  if (idx <= 0) return;
  const prev = active[idx - 1];
  const curr = active[idx];
  const tmpOrder = curr.order;
  curr.order = prev.order;
  prev.order = tmpOrder;
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

function moveCategoryDown(id) {
  const active = getAllCategories().filter(c => c.status === 'active');
  const idx = active.findIndex(c => c.id === id);
  if (idx < 0 || idx >= active.length - 1) return;
  const next = active[idx + 1];
  const curr = active[idx];
  const tmpOrder = curr.order;
  curr.order = next.order;
  next.order = tmpOrder;
  saveCategories();
  rebuildCategories();
  renderCalList();
  renderView();
}

// ── Settings View ──
function renderSettingsView() {
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';
  wrap.innerHTML = `
    <h2 class="settings-title">Settings</h2>
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Default Sleep Hours</span>
          <span class="setting-desc">Used for all-day sleep events in budget calculations</span>
        </div>
        <input type="number" class="setting-input" min="0" max="24" step="0.5" value="${state.preferences.sleepHours}" onchange="updatePref('sleepHours', this.value)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Daily Work Target</span>
          <span class="setting-desc">Target work hours per day for reference</span>
        </div>
        <input type="number" class="setting-input" min="0" max="24" step="0.5" value="${state.preferences.workHoursTarget}" onchange="updatePref('workHoursTarget', this.value)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Start Page</span>
          <span class="setting-desc">Which page to show when the app loads</span>
        </div>
        <select class="setting-input" onchange="updatePref('startPage', this.value)">
          <option value="dashboard" ${state.preferences.startPage === 'dashboard' ? 'selected' : ''}>Dashboard</option>
          <option value="calendar" ${state.preferences.startPage === 'calendar' ? 'selected' : ''}>Calendar</option>
        </select>
      </div>
    </div>
    <h3 class="settings-subtitle">Data Management</h3>
    <div class="settings-list">
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Export Backup</span>
          <span class="setting-desc">Download all your data as a JSON file</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="exportBackup()">Export Backup</button>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Import Backup</span>
          <span class="setting-desc">Restore data from a previously exported backup file</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('import-file-input').click()">Import Backup</button>
        <input type="file" id="import-file-input" accept=".json" style="display:none" onchange="if(this.files[0]) importBackup(this.files[0]); this.value='';">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <span class="setting-label">Export Calendar (.ics)</span>
          <span class="setting-desc">Download events in iCalendar format for Google Calendar / Outlook</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="exportICS()">Export .ics</button>
      </div>
    </div>
  `;
  viewEl.appendChild(wrap);
}

function updatePref(key, value) {
  if (key === 'sleepHours' || key === 'workHoursTarget') value = parseFloat(value) || 0;
  state.preferences[key] = value;
  savePreferences();
}

// ── Modal ──
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const modal = document.querySelector('.modal');
  const focusable = modal.querySelectorAll('input, textarea, select, button, [tabindex="0"]');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openModal(ds, eventId, startTime, allDay, type) {
  clearErrors();
  formEl.reset();
  state.selectedCategory = 'personal-other';
  state.editingType = 'event';
  state.selectedPriority = 'medium';

  if (eventId) {
    const ev = state.events.find(e => e.id === eventId);
    if (!ev) return;
    state.editingEventId = eventId;
    modalTitleEl.textContent = 'Edit Event';
    fTitle.value = ev.title;
    fDate.value = ev.date;
    fStart.value = ev.startTime || '09:00';
    fEnd.value = ev.endTime || '10:00';
    fAllDay.checked = ev.allDay;
    fDesc.value = ev.description || '';
    state.selectedCategory = ev.category || 'personal-other';
    state.editingType = ev.type || 'event';
    state.selectedPriority = ev.priority || 'medium';
    deleteBtn.classList.remove('hidden');
  } else {
    state.editingEventId = null;
    state.editingType = type || 'event';
    modalTitleEl.textContent = state.editingType === 'task' ? 'New Task' : 'New Event';
    fDate.value = ds || dateStr(state.currentDate);
    fStart.value = startTime || '09:00';
    const [h] = (startTime || '09:00').split(':').map(Number);
    fEnd.value = `${pad(Math.min(h + 1, 23))}:00`;
    fAllDay.checked = !!allDay;
    deleteBtn.classList.add('hidden');
  }
  const isTask = state.editingType === 'task';
  fTimeRow.style.display = (fAllDay.checked || isTask) ? 'none' : '';
  document.getElementById('priority-row').style.display = isTask ? '' : 'none';
  if (isTask) {
    modalTitleEl.textContent = state.editingEventId ? 'Edit Task' : 'New Task';
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('selected', b.dataset.prio === (state.selectedPriority || 'medium')));
  }
  renderCatPicker();
  modalEl.classList.remove('hidden');
  document.addEventListener('keydown', trapFocus);
  fTitle.focus();
}

function closeModal() {
  modalEl.classList.add('hidden');
  document.removeEventListener('keydown', trapFocus);
  state.editingEventId = null;
  formEl.reset();
  clearErrors();
}

function renderCatPicker() {
  catPicker.innerHTML = '';
  catPicker.setAttribute('role', 'radiogroup');
  catPicker.setAttribute('aria-label', 'Event category');
  const entries = Object.entries(CATEGORIES);
  if (state.selectedCategory && !CATEGORIES[state.selectedCategory]) {
    const arc = state.categories.find(c => c.id === state.selectedCategory);
    if (arc) entries.push([arc.id, { label: arc.label + ' (archived)', color: '#94a3b8', light: arc.light, dark: '#64748b' }]);
  }
  for (const [key, cat] of entries) {
    const el = document.createElement('div');
    const isSel = state.selectedCategory === key;
    el.className = 'cat-option' + (isSel ? ' selected' : '');
    el.style.color = cat.color;
    el.setAttribute('role', 'radio');
    el.setAttribute('aria-checked', String(isSel));
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${cat.label} category`);
    el.innerHTML = `<span class="cat-dot" style="background:${cat.color}"></span>${cat.label}`;
    el.addEventListener('click', () => { state.selectedCategory = key; renderCatPicker(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.selectedCategory = key; renderCatPicker(); } });
    catPicker.appendChild(el);
  }
}

function clearErrors() { errTitle.textContent = ''; errDate.textContent = ''; }

function validateForm() {
  clearErrors();
  let ok = true;
  if (!fTitle.value.trim()) { errTitle.textContent = 'Title is required'; ok = false; }
  if (!fDate.value) { errDate.textContent = 'Date is required'; ok = false; }
  return ok;
}

function handleSave(e) {
  e.preventDefault();
  if (!validateForm()) return;
  const isAllDay = fAllDay.checked;
  const isTask = state.editingType === 'task';
  const data = {
    title: fTitle.value.trim(),
    date: fDate.value,
    startTime: (isAllDay || isTask) ? '00:00' : (fStart.value || '09:00'),
    endTime: (isAllDay || isTask) ? '23:59' : (fEnd.value || '10:00'),
    allDay: isAllDay,
    category: state.selectedCategory,
    description: fDesc.value.trim(),
    type: state.editingType,
  };
  if (isTask) {
    data.priority = state.selectedPriority || 'medium';
    if (!state.editingEventId) data.completed = false;
  }
  if (!isAllDay && timeToMin(data.endTime) <= timeToMin(data.startTime)) {
    const corrected = Math.min(timeToMin(data.startTime) + 60, 1439);
    data.endTime = `${pad(Math.floor(corrected / 60))}:${pad(corrected % 60)}`;
  }
  if (state.editingEventId) {
    const idx = state.events.findIndex(ev => ev.id === state.editingEventId);
    if (idx !== -1) state.events[idx] = { ...state.events[idx], ...data };
  } else {
    data.id = 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    state.events.push(data);
  }
  saveEvents();
  closeModal();
  renderAll();
}

function handleDelete() {
  if (!state.editingEventId) return;
  if (!confirm('Delete this event?')) return;
  state.events = state.events.filter(e => e.id !== state.editingEventId);
  saveEvents();
  closeModal();
  renderAll();
}

// ── AI Planner ──
const AI_MAX_REQUESTS = 10;
const AI_COOLDOWN_MS = 10000;
const aiState = {
  requestCount: 0,
  lastRequestTime: 0,
  panelOpen: false,
  loading: false,
  suggestions: [],
  demoMode: false,
  commandHistory: [],
};

function openAIPanel() {
  const panel = $('ai-panel');
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => panel.classList.add('open'));
  aiState.panelOpen = true;
  updateAIRateLimit();
}

function closeAIPanel() {
  const panel = $('ai-panel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  setTimeout(() => { if (!aiState.panelOpen) panel.classList.add('hidden'); }, 250);
  aiState.panelOpen = false;
}

function updateAIRateLimit() {
  const el = $('ai-rate-limit');
  if (!el) return;
  if (aiState.requestCount >= AI_MAX_REQUESTS) {
    el.textContent = 'Request limit reached for this session';
  } else if (aiState.requestCount > 0) {
    el.textContent = `${aiState.requestCount} of ${AI_MAX_REQUESTS} AI requests used`;
  } else {
    el.textContent = '';
  }
}

function canMakeAIRequest() {
  if (aiState.requestCount >= AI_MAX_REQUESTS) return { ok: false, reason: 'Request limit reached for this session. Refresh the page to reset.' };
  const elapsed = Date.now() - aiState.lastRequestTime;
  if (elapsed < AI_COOLDOWN_MS) {
    const wait = Math.ceil((AI_COOLDOWN_MS - elapsed) / 1000);
    return { ok: false, reason: `Please wait ${wait} seconds before the next request.` };
  }
  return { ok: true };
}

function buildAIContext(action, targetDate, command) {
  const ds = targetDate || todayStr();
  const budget = calculateDayBudget(ds);
  const weekStart = getMonday(new Date(ds + 'T00:00:00'));
  const balanceScore = calculateBalanceScore(weekStart);

  let events = [];
  if (action === 'plan-week') {
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      events = events.concat(state.events.filter(e => e.date === dateStr(d) && e.type !== 'task'));
    }
  } else {
    events = state.events.filter(e => e.date === ds && e.type !== 'task');
  }

  const tasks = state.events.filter(e => e.type === 'task' && !e.completed);

  const goals = {};
  state.goals.filter(g => g.active).forEach(g => {
    goals[g.category] = g.targetHoursPerWeek;
  });

  return {
    action,
    date: ds,
    events: events.map(e => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, allDay: e.allDay, category: e.category, type: e.type })),
    tasks: tasks.map(t => ({ id: t.id, title: t.title, date: t.date, category: t.category, priority: t.priority || 'medium' })),
    goals,
    preferences: { sleepHours: state.preferences.sleepHours, workHoursTarget: state.preferences.workHoursTarget },
    balanceScore: balanceScore !== null ? balanceScore : undefined,
    budgetSummary: budget.categoryTotals,
    command: command || undefined,
    categories: Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label })),
  };
}

async function callAIPlanner(context) {
  const check = canMakeAIRequest();
  if (!check.ok) {
    renderAIError(check.reason);
    return null;
  }

  aiState.loading = true;
  aiState.requestCount++;
  aiState.lastRequestTime = Date.now();
  updateAIRateLimit();
  renderAILoading();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    const resp = await fetch('/api/ai-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await resp.json();

    if (data.error) {
      if (data.code === 'NO_API_KEY' || data.code === 'AUTH_ERROR' || resp.status >= 500) {
        aiState.demoMode = true;
        const badge = $('ai-mode-badge');
        if (badge) badge.classList.remove('hidden');
        return generateFallbackSuggestions(context);
      }
      throw new Error(data.message || 'AI request failed');
    }

    aiState.demoMode = false;
    const badge = $('ai-mode-badge');
    if (badge) badge.classList.add('hidden');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      renderAIError('Request timed out. The AI is taking too long — please try again.');
      return null;
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      aiState.demoMode = true;
      const badge = $('ai-mode-badge');
      if (badge) badge.classList.remove('hidden');
      return generateFallbackSuggestions(context);
    }
    renderAIError(err.message || 'Something went wrong. Please try again.');
    return null;
  } finally {
    aiState.loading = false;
  }
}

function generateFallbackSuggestions(context) {
  const suggestions = [];
  let sugId = 1;
  const ds = context.date;

  const goals = context.goals || {};
  const weekStart = getMonday(new Date(ds + 'T00:00:00'));
  const weekBudget = calculateWeekBudget(weekStart);

  Object.entries(goals).forEach(([cat, targetHours]) => {
    const actualMin = weekBudget.categoryTotals[cat] || 0;
    const targetMin = targetHours * 60;
    if (actualMin < targetMin * 0.5) {
      const catLabel = CATEGORIES[cat]?.label || cat;
      const deficit = formatMinutes(targetMin - actualMin);
      suggestions.push({
        id: `sug-${sugId++}`,
        type: 'info',
        summary: `${catLabel} is behind schedule`,
        reason: `You've used ${formatMinutes(actualMin)} of your ${targetHours}h weekly goal. Consider scheduling ${deficit} more this week.`,
        event: null,
        conflictsWith: [],
        priority: 'medium',
      });
    }
  });

  const unscheduledTasks = (context.tasks || []).slice(0, 3);
  unscheduledTasks.forEach(t => {
    const dayEvents = state.events.filter(e => e.date === ds && e.type !== 'task' && !e.allDay);
    let freeStart = '09:00';
    dayEvents.sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));
    for (const ev of dayEvents) {
      if (timeToMin(freeStart) + 60 <= timeToMin(ev.startTime)) break;
      freeStart = ev.endTime;
    }
    const startMin = timeToMin(freeStart);
    if (startMin < 1200) {
      const endMin = Math.min(startMin + 60, 1440);
      suggestions.push({
        id: `sug-${sugId++}`,
        type: 'add',
        summary: `Schedule task: ${t.title}`,
        reason: `This ${t.priority}-priority task is incomplete. Suggested time slot is available.`,
        event: {
          title: t.title,
          date: ds,
          startTime: `${pad(Math.floor(startMin / 60))}:${pad(startMin % 60)}`,
          endTime: `${pad(Math.floor(endMin / 60))}:${pad(endMin % 60)}`,
          category: t.category || 'personal-other',
          type: 'event',
          allDay: false,
        },
        conflictsWith: [],
        priority: t.priority || 'medium',
      });
    }
  });

  const budget = calculateDayBudget(ds);
  if (budget.overbooked) {
    suggestions.push({
      id: `sug-${sugId++}`,
      type: 'info',
      summary: 'Day is overbooked',
      reason: `You have ${formatMinutes(budget.scheduledMinutes)} scheduled, exceeding 24 hours by ${formatMinutes(budget.scheduledMinutes - 1440)}. Consider removing or shortening some events.`,
      event: null,
      conflictsWith: [],
      priority: 'high',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: `sug-${sugId}`,
      type: 'info',
      summary: 'Schedule looks good!',
      reason: 'No immediate suggestions. Your day is balanced and your goals are on track.',
      event: null,
      conflictsWith: [],
      priority: 'low',
    });
  }

  return {
    suggestions,
    overview: 'Smart suggestions based on your schedule and goals (demo mode — connect Claude API for advanced planning).',
    balanceImpact: '',
  };
}

function detectConflicts(suggestion) {
  if (!suggestion.event || suggestion.type === 'info' || suggestion.type === 'remove') return [];
  const ev = suggestion.event;
  if (ev.allDay) return [];
  const newStart = timeToMin(ev.startTime);
  const newEnd = timeToMin(ev.endTime);
  return state.events.filter(e =>
    e.date === ev.date && e.type !== 'task' && !e.allDay &&
    timeToMin(e.startTime) < newEnd && timeToMin(e.endTime) > newStart
  ).map(e => ({ id: e.id, title: e.title, time: `${formatTime12(e.startTime)}-${formatTime12(e.endTime)}` }));
}

function renderAILoading() {
  const el = $('ai-content');
  el.innerHTML = `<div class="ai-loading"><div class="ai-spinner"></div><span class="ai-loading-text">Analyzing your schedule...</span></div>`;
}

function renderAIError(msg) {
  const el = $('ai-content');
  el.innerHTML = `<div class="ai-error">${esc(msg)}</div>`;
}

function renderAISuggestions(result) {
  if (!result) return;
  aiState.suggestions = result.suggestions.map(s => ({ ...s, status: null }));
  const el = $('ai-content');
  let html = '';

  if (result.overview) {
    html += `<div class="ai-overview"><strong>AI Analysis:</strong> ${esc(result.overview)}`;
    if (result.balanceImpact) {
      html += `<div class="ai-balance-impact">${esc(result.balanceImpact)}</div>`;
    }
    html += `</div>`;
  }

  const actionable = result.suggestions.filter(s => s.type !== 'info');
  if (actionable.length > 1) {
    html += `<button class="ai-approve-all" onclick="approveAllSuggestions()">Approve All (${actionable.length} changes)</button>`;
  }

  result.suggestions.forEach((s, i) => {
    const conflicts = detectConflicts(s);
    const typeClass = `ai-sug-type-${s.type}`;
    html += `<div class="ai-suggestion-card" id="ai-sug-${i}">
      <div class="ai-sug-body">
        <div class="ai-sug-header">
          <span class="ai-sug-type ${typeClass}">${s.type}</span>
          <span class="ai-sug-summary">${esc(s.summary)}</span>
        </div>
        <div class="ai-sug-reason">${esc(s.reason)}</div>`;

    if (s.event) {
      const cat = catStyle(s.event.category);
      const timeStr = s.event.allDay ? 'All day' : `${formatTime12(s.event.startTime)} - ${formatTime12(s.event.endTime)}`;
      html += `<div class="ai-sug-event-preview">
        <span class="ai-sug-event-dot" style="background:${cat.color}"></span>
        <span class="ai-sug-event-time">${timeStr}</span>
        <span class="ai-sug-event-title">${esc(s.event.title)}</span>
      </div>`;
    }

    if (conflicts.length > 0) {
      html += `<div class="ai-sug-conflict">Conflicts with: ${conflicts.map(c => esc(c.title) + ' (' + c.time + ')').join(', ')}</div>`;
    }

    html += `</div>`;

    if (s.type !== 'info') {
      html += `<div class="ai-sug-actions">
        <button class="ai-sug-approve" onclick="approveSuggestion(${i})">Approve</button>
        <button class="ai-sug-reject" onclick="rejectSuggestion(${i})">Reject</button>
      </div>`;
    }

    html += `</div>`;
  });

  el.innerHTML = html;
}

function approveSuggestion(index) {
  const s = aiState.suggestions[index];
  if (!s || s.status) return;

  if (s.event && !s.event.allDay && s.event.startTime && s.event.endTime) {
    if (timeToMin(s.event.endTime) <= timeToMin(s.event.startTime)) {
      const corrected = Math.min(timeToMin(s.event.startTime) + 60, 1439);
      s.event.endTime = `${pad(Math.floor(corrected / 60))}:${pad(corrected % 60)}`;
    }
  }

  if (s.type === 'add' && s.event) {
    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: s.event.title,
      date: s.event.date,
      startTime: s.event.startTime || '09:00',
      endTime: s.event.endTime || '10:00',
      allDay: s.event.allDay || false,
      category: s.event.category || 'personal-other',
      description: '',
      type: s.event.type || 'event',
      completed: false,
    };
    state.events.push(newEvent);
    saveEvents();
  } else if (s.type === 'move' && s.targetEventId && s.event) {
    const existing = state.events.find(e => e.id === s.targetEventId);
    if (existing) {
      existing.date = s.event.date || existing.date;
      existing.startTime = s.event.startTime || existing.startTime;
      existing.endTime = s.event.endTime || existing.endTime;
      saveEvents();
    }
  } else if (s.type === 'resize' && s.targetEventId && s.event) {
    const existing = state.events.find(e => e.id === s.targetEventId);
    if (existing) {
      existing.startTime = s.event.startTime || existing.startTime;
      existing.endTime = s.event.endTime || existing.endTime;
      saveEvents();
    }
  } else if (s.type === 'remove' && s.targetEventId) {
    state.events = state.events.filter(e => e.id !== s.targetEventId);
    saveEvents();
  }

  s.status = 'approved';
  markSuggestionDone(index, 'approved');
  renderView();
}

function rejectSuggestion(index) {
  const s = aiState.suggestions[index];
  if (!s || s.status) return;
  s.status = 'rejected';
  markSuggestionDone(index, 'rejected');
}

function markSuggestionDone(index, status) {
  const card = document.getElementById(`ai-sug-${index}`);
  if (!card) return;
  card.classList.add('ai-sug-done');
  const actions = card.querySelector('.ai-sug-actions');
  if (actions) {
    actions.innerHTML = `<div class="ai-sug-status ai-sug-status-${status}">${status}</div>`;
  }
}

function approveAllSuggestions() {
  aiState.suggestions.forEach((s, i) => {
    if (!s.status && s.type !== 'info') {
      approveSuggestion(i);
    }
  });
}

async function handlePlanDay(targetDate) {
  if (aiState.loading) return;
  openAIPanel();
  const context = buildAIContext('plan-day', targetDate);
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

async function handlePlanWeek() {
  if (aiState.loading) return;
  openAIPanel();
  const context = buildAIContext('plan-week');
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

async function handleAICommand(command) {
  if (aiState.loading || !command.trim()) return;
  aiState.commandHistory = [command, ...aiState.commandHistory.filter(c => c !== command)].slice(0, 10);
  try { localStorage.setItem('chronosAIHistory', JSON.stringify(aiState.commandHistory)); } catch {}
  const context = buildAIContext('command', todayStr(), command.trim());
  const result = await callAIPlanner(context);
  if (result) renderAISuggestions(result);
}

function loadCommandHistory() {
  try {
    const raw = localStorage.getItem('chronosAIHistory');
    aiState.commandHistory = raw ? JSON.parse(raw) : [];
  } catch { aiState.commandHistory = []; }
}

// ── Navigation ──
function navigate(dir) {
  const d = state.currentDate;
  switch (state.currentView) {
    case 'day': d.setDate(d.getDate() + dir); break;
    case '3day': d.setDate(d.getDate() + dir * 3); break;
    case 'week': d.setDate(d.getDate() + dir * 7); break;
    case 'month': d.setMonth(d.getMonth() + dir); break;
    case 'agenda': d.setMonth(d.getMonth() + dir); break;
    case 'year': d.setFullYear(d.getFullYear() + dir); break;
  }
  renderAll();
}

function goToday() {
  state.currentDate = new Date();
  renderAll();
}

function switchView(v) {
  state.currentView = v;
  localStorage.setItem('chronosView', v);
  document.querySelectorAll('.view-switcher button').forEach(b => {
    const isActive = b.dataset.view === v;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', String(isActive));
  });
  if (state.currentPage !== 'calendar') {
    switchPage('calendar');
  } else {
    renderAll();
  }
}

// ── Sidebar ──
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  sidebarEl.classList.toggle('open', state.sidebarOpen);
  overlayEl.classList.toggle('active', state.sidebarOpen);
}

// ── Now Indicator Update ──
function updateNowIndicator() {
  const el = document.getElementById('now-indicator');
  if (!el) return;
  const n = new Date();
  const mins = n.getHours() * 60 + n.getMinutes();
  el.style.top = (mins / 60) * HOUR_H + 'px';
}

// ── Toast Notifications ──
let toastQueue = [];
const MAX_TOASTS = 3;
const TOAST_DURATIONS = { info: 6000, success: 6000, warning: 10000, error: 10000 };

function showToast(message, type = 'info', actionLabel, actionCallback) {
  const container = $('toast-container');
  if (!container) return;
  const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.id = id;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  const icons = { info: '\u2139\uFE0F', success: '\u2705', warning: '\u26A0\uFE0F', error: '\u274C' };
  let html = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${esc(message)}</span>`;
  if (actionLabel && actionCallback) {
    html += `<button class="toast-action" data-toast-action="true">${esc(actionLabel)}</button>`;
  }
  html += `<button class="toast-close" aria-label="Dismiss">&times;</button>`;
  toast.innerHTML = html;
  const actionBtn = toast.querySelector('[data-toast-action]');
  if (actionBtn) actionBtn.addEventListener('click', () => { actionCallback(); dismissToast(id); });
  toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(id));
  toastQueue.push(id);
  while (toastQueue.length > MAX_TOASTS) dismissToast(toastQueue[0]);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  const duration = TOAST_DURATIONS[type] || 6000;
  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toastQueue = toastQueue.filter(t => t !== id);
  toast.classList.remove('toast-visible');
  toast.classList.add('toast-hiding');
  setTimeout(() => toast.remove(), 300);
}

// ── Storage Safety ──
function safeSave(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      showToast('Storage is full! Export a backup to avoid data loss.', 'error', 'Export Now', exportBackup);
    }
    return false;
  }
}

function checkStorageUsage() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chronos')) {
        total += (localStorage.getItem(key) || '').length;
      }
    }
    if (total > 4 * 1024 * 1024) {
      showToast('Storage is nearly full (' + Math.round(total / 1024 / 1024 * 10) / 10 + 'MB). Export a backup soon.', 'warning', 'Export Now', exportBackup);
    }
  } catch {}
}

// ── Export / Import ──
function gatherAllData() {
  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    events: state.events,
    goals: state.goals,
    preferences: state.preferences,
    categories: state.categories,
    aiHistory: (() => { try { return JSON.parse(localStorage.getItem('chronosAIHistory') || '[]'); } catch { return []; } })(),
  };
}

function exportBackup() {
  const data = gatherAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateSlug = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `lifebalance-backup-${dateSlug}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  state.preferences.lastBackupDate = new Date().toISOString().slice(0, 10);
  savePreferences();
  showToast('Backup exported successfully.', 'success');
}

function validateBackupFile(data) {
  if (!data || typeof data !== 'object') return 'File is not valid JSON.';
  if (!data.version) return 'Missing version field — not a LifeBalance backup.';
  if (!Array.isArray(data.events)) return 'Missing or invalid events array.';
  for (let i = 0; i < data.events.length; i++) {
    const e = data.events[i];
    if (!e.id || !e.title || !e.date) return `Event #${i + 1} is missing required fields (id, title, date).`;
  }
  return null;
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    let data;
    try { data = JSON.parse(e.target.result); } catch { showToast('File is not valid JSON.', 'error'); return; }
    const err = validateBackupFile(data);
    if (err) { showToast(err, 'error'); return; }
    showImportPreview(data);
  };
  reader.readAsText(file);
}

function showImportPreview(data) {
  const events = data.events.filter(e => e.type !== 'task');
  const tasks = data.events.filter(e => e.type === 'task');
  const goals = data.goals ? data.goals.length : 0;
  const cats = data.categories ? data.categories.length : 0;
  const curEvents = state.events.filter(e => e.type !== 'task').length;
  const curTasks = state.events.filter(e => e.type === 'task').length;

  const overlay = document.createElement('div');
  overlay.className = 'import-preview-overlay';
  overlay.innerHTML = `
    <div class="import-preview-modal">
      <h3>Import Backup</h3>
      <div class="import-preview-body">
        <p><strong>File contains:</strong></p>
        <ul>
          <li>${events.length} events</li>
          <li>${tasks.length} tasks</li>
          <li>${goals} goals</li>
          <li>${cats} categories</li>
          ${data.exportedAt ? `<li>Exported on ${data.exportedAt.slice(0, 10)}</li>` : ''}
        </ul>
        <p class="import-warning">This will <strong>replace all current data</strong> (${curEvents} events, ${curTasks} tasks). Consider exporting a backup first.</p>
      </div>
      <div class="import-preview-actions">
        <button class="btn btn-ghost" id="import-cancel">Cancel</button>
        <button class="btn btn-primary" id="import-confirm">Replace All</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('import-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('import-confirm').addEventListener('click', () => {
    applyImport(data);
    overlay.remove();
  });
}

function applyImport(data) {
  state.events = data.events;
  saveEvents();
  if (data.goals) { state.goals = data.goals; saveGoals(); }
  if (data.preferences) {
    state.preferences = { ...state.preferences, ...data.preferences };
    savePreferences();
  }
  if (data.categories && Array.isArray(data.categories) && data.categories.length) {
    state.categories = data.categories;
    saveCategories();
    rebuildCategories();
    state.activeCategories = new Set(Object.keys(CATEGORIES));
  }
  if (data.aiHistory) {
    try { localStorage.setItem('chronosAIHistory', JSON.stringify(data.aiHistory)); } catch {}
  }
  renderAll();
  showToast('Backup imported successfully.', 'success');
}

function generateICS() {
  const events = state.events.filter(e => e.type !== 'task');
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//LifeBalance//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
  events.forEach(e => {
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${e.id}@lifebalance\r\n`;
    const d = e.date.replace(/-/g, '');
    if (e.allDay) {
      ics += `DTSTART;VALUE=DATE:${d}\r\n`;
      const next = addDays(new Date(e.date), 1);
      ics += `DTEND;VALUE=DATE:${dateStr(next).replace(/-/g, '')}\r\n`;
    } else {
      ics += `DTSTART:${d}T${(e.startTime || '09:00').replace(':', '')}00\r\n`;
      ics += `DTEND:${d}T${(e.endTime || '10:00').replace(':', '')}00\r\n`;
    }
    ics += `SUMMARY:${icsEscape(e.title)}\r\n`;
    if (e.description) ics += `DESCRIPTION:${icsEscape(e.description)}\r\n`;
    const cat = catStyle(e.category);
    ics += `CATEGORIES:${icsEscape(cat.label)}\r\n`;
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';
  return ics;
}

function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function exportICS() {
  const ics = generateICS();
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lifebalance-calendar.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Calendar exported as .ics file.', 'success');
}

// ── Backup Reminder ──
let backupReminderShown = false;
function checkBackupReminder() {
  if (backupReminderShown) return;
  const last = state.preferences.lastBackupDate;
  if (!last) {
    backupReminderShown = true;
    showToast("You haven't backed up your data yet. Export a backup to keep it safe.", 'warning', 'Export Now', exportBackup);
    return;
  }
  const lastDate = new Date(last);
  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  if (diffDays >= 7) {
    backupReminderShown = true;
    showToast(`It's been ${diffDays} days since your last backup. Export one now?`, 'warning', 'Export Now', exportBackup);
  }
}

// ── Escape HTML ──
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Render All ──
function renderAll() {
  updateHeading();
  renderView();
  state.miniCalDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  renderMiniCal();
  renderCalList();
}

// ── Event Listeners ──
$('prev-btn').addEventListener('click', () => navigate(-1));
$('next-btn').addEventListener('click', () => navigate(1));
$('today-btn').addEventListener('click', goToday);
$('sidebar-toggle').addEventListener('click', toggleSidebar);
overlayEl.addEventListener('click', toggleSidebar);
$('new-event-btn').addEventListener('click', () => openModal(dateStr(state.currentDate)));
formEl.addEventListener('submit', handleSave);
$('cancel-btn').addEventListener('click', closeModal);
$('modal-close').addEventListener('click', closeModal);
deleteBtn.addEventListener('click', handleDelete);
modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });
$('mini-prev').addEventListener('click', () => { state.miniCalDate.setMonth(state.miniCalDate.getMonth() - 1); renderMiniCal(); });
$('mini-next').addEventListener('click', () => { state.miniCalDate.setMonth(state.miniCalDate.getMonth() + 1); renderMiniCal(); });
fAllDay.addEventListener('change', () => { fTimeRow.style.display = (fAllDay.checked || state.editingType === 'task') ? 'none' : ''; });

// Sidebar Nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

// Priority Picker
document.querySelectorAll('.prio-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.selectedPriority = btn.dataset.prio;
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('selected', b === btn));
  });
});
fTitle.addEventListener('input', () => { errTitle.textContent = ''; });
fDate.addEventListener('input', () => { errDate.textContent = ''; });

document.querySelectorAll('.view-switcher button').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// AI Panel
$('ai-panel-close').addEventListener('click', closeAIPanel);
$('ai-plan-day').addEventListener('click', () => handlePlanDay());
$('ai-plan-week').addEventListener('click', () => handlePlanWeek());
$('ai-command-send').addEventListener('click', () => {
  const input = $('ai-command-input');
  handleAICommand(input.value);
  input.value = '';
});
$('ai-command-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = $('ai-command-input');
    handleAICommand(input.value);
    input.value = '';
  }
});

document.addEventListener('keydown', e => {
  if (!modalEl.classList.contains('hidden')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  if (aiState.panelOpen && e.key === 'Escape') {
    closeAIPanel();
    return;
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  switch (e.key) {
    case 't': goToday(); break;
    case 'b': switchPage('dashboard'); break;
    case 'g': switchPage('goals'); break;
    case 'p': handlePlanDay(); break;
    case 'd': switchPage('calendar'); switchView('day'); break;
    case 'w': switchPage('calendar'); switchView('week'); break;
    case 'm': switchPage('calendar'); switchView('month'); break;
    case 'a': switchPage('calendar'); switchView('agenda'); break;
    case 'y': switchPage('calendar'); switchView('year'); break;
    case 'c': openModal(dateStr(state.currentDate)); break;
    case 'ArrowLeft': if (state.currentPage === 'calendar') navigate(-1); break;
    case 'ArrowRight': if (state.currentPage === 'calendar') navigate(1); break;
  }
});

// ── Init ──
state.categories = loadCategories();
rebuildCategories();
state.events = loadEvents();
state.goals = loadGoals();
state.preferences = loadPreferences();
state.activeCategories = new Set(Object.keys(CATEGORIES));
loadCommandHistory();
state.currentPage = state.preferences.startPage || 'dashboard';
document.querySelectorAll('.view-switcher button').forEach(b => b.classList.toggle('active', b.dataset.view === state.currentView));
renderCalList();
switchPage(state.currentPage);
setInterval(updateNowIndicator, 60000);
checkStorageUsage();
setTimeout(checkBackupReminder, 2000);

// ── Test Exports ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pad, fmtDate, dateStr, timeToMin, getMonday, addDays, daysInMonth, formatHour,
    formatMinutes, formatTime12,
    seedDefaultCategories, generateColorVariants, toKebabCase, uniqueCategoryId,
    calculateDayBudget, calculateWeekBudget, calculateBalanceScore,
    gatherAllData, validateBackupFile, generateICS, icsEscape,
    categoryExists, rebuildCategories, getAllCategories,
    getActiveCategories: () => CATEGORIES,
    CATEGORY_MIGRATION, DEFAULT_CATEGORIES,
    state,
  };
}
