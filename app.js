// ── Constants ──
const STORAGE_KEY = 'chronosEvents';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAYS_MINI = ['M','T','W','T','F','S','S'];
const HOUR_H = 60;
const MAX_MONTH_EVENTS = 3;

const CATEGORIES = {
  work:     { label: 'Work',     color: '#6366f1', light: 'rgba(99,102,241,0.13)',  dark: '#4338ca' },
  personal: { label: 'Personal', color: '#8b5cf6', light: 'rgba(139,92,246,0.13)',  dark: '#6d28d9' },
  health:   { label: 'Health',   color: '#10b981', light: 'rgba(16,185,129,0.13)',   dark: '#047857' },
  social:   { label: 'Social',   color: '#f59e0b', light: 'rgba(245,158,11,0.13)',  dark: '#b45309' },
  learning: { label: 'Learning', color: '#06b6d4', light: 'rgba(6,182,212,0.13)',   dark: '#0e7490' },
};

// ── State ──
const now = new Date();
const state = {
  currentDate: new Date(now),
  currentView: localStorage.getItem('chronosView') || 'week',
  events: [],
  editingEventId: null,
  activeCategories: new Set(Object.keys(CATEGORIES)),
  sidebarOpen: false,
  miniCalDate: new Date(now.getFullYear(), now.getMonth(), 1),
  selectedCategory: 'work',
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
function todayStr() { return dateStr(now); }
function timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

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

function catStyle(cat) { return CATEGORIES[cat] || CATEGORIES.work; }

// ── Storage ──
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map(e => {
      if (e.time && !e.startTime) {
        e.startTime = e.time;
        const [h] = e.time.split(':').map(Number);
        e.endTime = `${pad(Math.min(h + 1, 23))}:00`;
        delete e.time;
      }
      if (!e.startTime) { e.startTime = '09:00'; e.endTime = '10:00'; }
      if (!e.endTime) { const [h] = e.startTime.split(':').map(Number); e.endTime = `${pad(Math.min(h+1,23))}:00`; }
      if (e.allDay === undefined) e.allDay = false;
      if (!e.category || !CATEGORIES[e.category]) e.category = 'work';
      return e;
    });
  } catch { return []; }
}
function saveEvents() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.events)); } catch {}
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
}

// ── Date Heading ──
function updateHeading() {
  const d = state.currentDate;
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

// ── View Router ──
function renderView() {
  viewEl.innerHTML = '';
  switch (state.currentView) {
    case 'day': renderTimeView(1); break;
    case '3day': renderTimeView(3); break;
    case 'week': renderTimeView(7); break;
    case 'month': renderMonthView(); break;
    case 'agenda': renderAgendaView(); break;
    case 'year': renderYearView(); break;
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
    const label = isToday ? 'Today' : ds === dateStr(addDays(now, 1)) ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
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
    card.className = 'yv-month' + (m === now.getMonth() && year === now.getFullYear() ? ' current' : '');
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

// ── Modal ──
function openModal(ds, eventId, startTime, allDay) {
  clearErrors();
  formEl.reset();
  state.selectedCategory = 'work';

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
    state.selectedCategory = ev.category || 'work';
    deleteBtn.classList.remove('hidden');
  } else {
    state.editingEventId = null;
    modalTitleEl.textContent = 'New Event';
    fDate.value = ds || dateStr(state.currentDate);
    fStart.value = startTime || '09:00';
    const [h] = (startTime || '09:00').split(':').map(Number);
    fEnd.value = `${pad(Math.min(h + 1, 23))}:00`;
    fAllDay.checked = !!allDay;
    deleteBtn.classList.add('hidden');
  }
  fTimeRow.style.display = fAllDay.checked ? 'none' : '';
  renderCatPicker();
  modalEl.classList.remove('hidden');
  fTitle.focus();
}

function closeModal() {
  modalEl.classList.add('hidden');
  state.editingEventId = null;
  formEl.reset();
  clearErrors();
}

function renderCatPicker() {
  catPicker.innerHTML = '';
  catPicker.setAttribute('role', 'radiogroup');
  catPicker.setAttribute('aria-label', 'Event category');
  for (const [key, cat] of Object.entries(CATEGORIES)) {
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
  const data = {
    title: fTitle.value.trim(),
    date: fDate.value,
    startTime: isAllDay ? '00:00' : (fStart.value || '09:00'),
    endTime: isAllDay ? '23:59' : (fEnd.value || '10:00'),
    allDay: isAllDay,
    category: state.selectedCategory,
    description: fDesc.value.trim(),
  };
  if (!isAllDay && timeToMin(data.endTime) <= timeToMin(data.startTime)) {
    data.endTime = `${pad(Math.min(parseInt(data.startTime) + 1, 23))}:00`;
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
  state.currentDate = new Date(now);
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
  renderAll();
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

// ── Escape HTML ──
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ── Render All ──
function renderAll() {
  updateHeading();
  renderView();
  state.miniCalDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  renderMiniCal();
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
fAllDay.addEventListener('change', () => { fTimeRow.style.display = fAllDay.checked ? 'none' : ''; });
fTitle.addEventListener('input', () => { errTitle.textContent = ''; });
fDate.addEventListener('input', () => { errDate.textContent = ''; });

document.querySelectorAll('.view-switcher button').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

document.addEventListener('keydown', e => {
  if (!modalEl.classList.contains('hidden')) {
    if (e.key === 'Escape') closeModal();
    return;
  }
  switch (e.key) {
    case 't': goToday(); break;
    case 'd': switchView('day'); break;
    case 'w': switchView('week'); break;
    case 'm': switchView('month'); break;
    case 'a': switchView('agenda'); break;
    case 'y': switchView('year'); break;
    case 'c': openModal(dateStr(state.currentDate)); break;
    case 'ArrowLeft': navigate(-1); break;
    case 'ArrowRight': navigate(1); break;
  }
});

// ── Init ──
state.events = loadEvents();
document.querySelectorAll('.view-switcher button').forEach(b => b.classList.toggle('active', b.dataset.view === state.currentView));
renderCalList();
renderAll();
setInterval(updateNowIndicator, 60000);
