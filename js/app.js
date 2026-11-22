import * as db from './db.js';
import { MOODS, moodById, allMoods, setCustomMoods, customMoods } from './moods.js';
import { icon } from './icons.js';
import { searchTracks, findTrack } from './music.js';
import { readDay, fallbackRead, hasAI } from './ai.js';
import { shrink, thumbDataURL, thumbBlob, paletteOf, loadImage } from './photo.js';
import { createBook } from './book.js';
import { createDecor, DEFAULT_LOOK } from './decor.js';
import { stickersReady } from './stickers.js';
import { openViewer, closeViewer } from './viewer.js';
import { playIntro } from './intro.js';
import { fmtDate, today, esc, plural } from './util.js';

const $ = (s, r = document) => r.querySelector(s);

const state = {
  entries: [],
  folders: [],
  filter: { type: 'all', id: null },
  query: '',
  // the panel folds only on phones; on laptops and wider it is always open
  collapsed: innerWidth < 760,
  loaded: false,
  look: structuredClone(DEFAULT_LOOK),
};
let book = null, decor = null;

// ---------- photo URLs (object URLs cached per blob) ----------
const urlCache = new WeakMap();
const urlOf = blob => { if (!urlCache.has(blob)) urlCache.set(blob, URL.createObjectURL(blob)); return urlCache.get(blob); };
const photoUrls = e => (e.photos || []).map(urlOf);
// the album pages use a light copy of the cover photo (smooth page turns on phones)
const coverOf = e => urlOf(e.thumb || e.photos[0]);

// Makes the light copies that are missing, a few at a time, then redraws the album.
// Also remembers each day's colors: the album prints are tinted with them.
async function makeThumbs() {
  let made = 0;
  for (const e of state.entries) {
    if ((e.thumb && e.palette) || !e.photos?.[0]) continue;
    try {
      e.thumb ||= await thumbBlob(e.photos[0]);
      e.palette ||= await paletteFromBlob(e.thumb);
      await db.put('entries', e);
      made++;
    } catch { /* keep the full photo */ }
    if (made % 6 === 0) book?.refresh();
  }
  if (made) book?.refresh();
}
async function paletteFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  try { return paletteOf(await loadImage(url)); } finally { URL.revokeObjectURL(url); }
}

// Days saved while the music catalog couldn't be reached get their song now,
// picked by mood, so the memory plays with music next time.
async function fillMissingSongs() {
  for (const e of state.entries) {
    if (e.track) continue;
    const t = await findTrack(moodById(e.mood).query).catch(() => null);
    if (!t) return; // still offline: try again on the next visit
    e.track = t; e.trackBy = 'ai';
    await db.put('entries', e).catch(() => {});
  }
}

// ---------- data ----------
const aspectOf = blob => createImageBitmap(blob).then(b => { const a = b.width / b.height; b.close(); return a; }).catch(() => 4 / 3);
const byDate = (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt;
async function load() {
  const [entries, folders, moods, look] = await Promise.all([db.all('entries'), db.all('folders'), db.all('moods'), db.get('meta', 'book')]);
  if (look) { const { bookmark, ...rest } = look; state.look = { ...structuredClone(DEFAULT_LOOK), ...rest }; }
  setCustomMoods(moods.sort((a, b) => a.createdAt - b.createdAt));
  // the example album fills itself the first time it is opened
  if (db.DEMO && !entries.length) {
    const { seedDemo, DEMO_LOOK } = await import('./demo.js');
    const note = document.createElement('div');
    note.className = 'demo-loading glass';
    note.textContent = 'Собираем пример альбома…';
    document.body.appendChild(note);
    try {
      entries.push(...await seedDemo(db.put, (n, total) => { note.textContent = `Собираем пример альбома… ${n} из ${total}`; }));
      if (!look) { state.look = { ...structuredClone(DEFAULT_LOOK), ...structuredClone(DEMO_LOOK) }; await db.put('meta', state.look); }
    } finally { note.remove(); }
  }
  state.entries = entries.sort(byDate);
  // the collage shapes each frame like its photo: remember the cover's proportions
  for (const e of state.entries) {
    if (e.aspect || !e.photos?.[0]) continue;
    e.aspect = await aspectOf(e.photos[0]);
    db.put('entries', e).catch(() => {});
  }
  state.folders = folders.sort((a, b) => a.createdAt - b.createdAt);
  state.loaded = true;
}

function visibleEntries() {
  const q = state.query.trim().toLowerCase();
  return state.entries.filter(e => {
    if (state.filter.type === 'mood' && e.mood !== state.filter.id) return false;
    if (state.filter.type === 'folder' && !(e.folderIds || []).includes(state.filter.id)) return false;
    if (!q) return true;
    return [e.title, e.text, e.caption, e.track?.title, e.track?.artist, moodById(e.mood).name, fmtDate(e.date)]
      .some(v => (v || '').toLowerCase().includes(q));
  });
}

// ---------- shell ----------
function renderShell() {
  $('#app').innerHTML = `
    <aside class="side glass-panel" aria-label="Навигация по дневнику">
      <div class="brand">
        <button class="brand-home" data-act="home" aria-label="Moodmark — все записи">
          <span class="logo-bubble" aria-hidden="true"><span class="logo"></span></span>
          <span class="wordmark">Moodmark</span>
        </button>
      </div>
      <div class="side-actions">
        <button class="btn primary shine new-btn" data-act="new">${icon('plus', 18)}<span>Новая запись</span></button>
        <label class="search">
          ${icon('search', 18)}
          <input type="search" placeholder="Поиск по записям" aria-label="Поиск по записям" value="${esc(state.query)}">
        </label>
      </div>
      <nav class="side-nav"></nav>
      <div class="side-foot">
        <button class="glass-btn icon-btn side-toggle" data-act="collapse" aria-label="Свернуть панель" title="Свернуть панель">${icon('sidebar')}</button>
      </div>
      <div class="side-rail">
        <button class="glass-btn icon-btn" data-act="new" aria-label="Новая запись" title="Новая запись">${icon('plus')}</button>
        <button class="glass-btn icon-btn" data-act="expand-search" aria-label="Поиск" title="Поиск">${icon('search')}</button>
        <button class="glass-btn icon-btn" data-act="new-folder" aria-label="Новая папка" title="Новая папка">${icon('folderPlus')}</button>
        <span class="rail-word" aria-hidden="true">Moodmark</span>
        <button class="glass-btn icon-btn" data-act="collapse" aria-label="Развернуть панель" title="Развернуть панель">${icon('sidebar')}</button>
      </div>
    </aside>
    <main class="main" id="main">
      <section class="album" aria-label="Альбом"></section>
    </main>
    <div class="toasts" role="status" aria-live="polite"></div>`;
  document.body.classList.toggle('is-collapsed', state.collapsed);
  // turning a phone into a wide window opens the panel for good
  addEventListener('resize', () => { if (innerWidth >= 760 && state.collapsed) { state.collapsed = false; document.body.classList.remove('is-collapsed'); } });

  const input = $('.search input');
  input.addEventListener('input', () => { state.query = input.value; renderNav(); renderMain(); });
  document.addEventListener('click', onClick);
}

function renderNav() {
  const nav = $('.side-nav');
  const count = (pred) => state.entries.filter(pred).length;
  const q = state.query.trim().toLowerCase();
  const isActive = (type, id) => state.filter.type === type && state.filter.id === id;

  const folders = state.folders.map(f => `
    <li class="nav-row ${isActive('folder', f.id) ? 'is-active' : ''}">
      <button class="nav-item" data-act="filter" data-type="folder" data-id="${f.id}">
        ${icon('folder', 18)}<span class="nav-label">${esc(f.name)}</span><span class="nav-count">${count(e => (e.folderIds || []).includes(f.id))}</span>
      </button>
      <button class="icon-btn ghost sm nav-more" data-act="folder-menu" data-id="${f.id}" aria-label="Действия с папкой ${esc(f.name)}">${icon('more', 16)}</button>
    </li>`).join('');

  const list = visibleEntries();
  const groups = allMoods().map(m => ({ m, items: (state.filter.type === 'mood' ? list : list.filter(e => e.mood === m.id)).filter(e => e.mood === m.id) }))
    .filter(g => g.items.length);

  nav.innerHTML = `
    <button class="nav-item all ${isActive('all', null) ? 'is-active' : ''}" data-act="filter" data-type="all">
      <span class="nav-label">Все записи</span><span class="nav-count">${state.entries.length}</span>
    </button>

    <div class="nav-section">
      <div class="nav-head"><span>Папки</span>
        <button class="icon-btn ghost sm" data-act="new-folder" aria-label="Создать папку" title="Создать папку">${icon('folderPlus', 16)}</button>
      </div>
      <ul class="nav-list">${folders || '<li class="nav-empty">Соберите записи в папку — например, «Лето 2026»</li>'}</ul>
    </div>

    <div class="nav-section">
      <div class="nav-head"><span>Настроения</span>
        <button class="icon-btn ghost sm" data-act="new-mood" aria-label="Добавить своё настроение" title="Добавить своё настроение">${icon('plus', 16)}</button>
      </div>
      <div class="mood-chips">
        ${allMoods().map(m => {
          const n = count(e => e.mood === m.id);
          const chip = `<button class="chip ${isActive('mood', m.id) ? 'is-active' : ''}" data-act="filter" data-type="mood" data-id="${m.id}" ${n ? '' : 'disabled'}>${esc(m.name)}<span>${n}</span></button>`;
          return m.custom
            ? `<span class="chip-wrap">${chip}<button class="chip-x" data-act="del-mood" data-id="${m.id}" aria-label="Удалить настроение ${esc(m.name)}" title="Удалить настроение">${icon('close', 12)}</button></span>`
            : chip;
        }).join('')}
      </div>
    </div>

    <div class="nav-section">
      <div class="nav-head"><span>Записи${q ? ' · найдено ' + list.length : ''}</span></div>
      ${groups.length ? groups.map(g => `
        <div class="nav-group">
          <p class="nav-group-title">${g.m.name}</p>
          <ul class="nav-list">
            ${g.items.map(e => `
              <li><button class="nav-entry" data-act="open" data-id="${e.id}">
                <span class="nav-entry-date">${fmtDate(e.date)}</span>
                <span class="nav-entry-title">${esc(e.title)}</span>
              </button></li>`).join('')}
          </ul>
        </div>`).join('') : `<p class="nav-empty">${state.entries.length ? 'Ничего не найдено' : 'Здесь появятся ваши дни'}</p>`}
    </div>`;
}

// What the album is narrowed to, if anything (shown in the album bar).
function filterLabel() {
  const parts = [];
  if (state.filter.type === 'mood') parts.push(`Настроение: ${moodById(state.filter.id).name}`);
  if (state.filter.type === 'folder') parts.push(`Папка: ${state.folders.find(f => f.id === state.filter.id)?.name || ''}`);
  if (state.query.trim()) parts.push(`Поиск: «${state.query.trim()}»`);
  return parts.join(' · ');
}

const saveLook = (() => {
  let t;
  return () => { clearTimeout(t); t = setTimeout(() => db.put('meta', state.look).catch(e => console.error(e)), 250); };
})();

function mountBook() {
  book = createBook($('.album'), {
    items: () => [...visibleEntries()].reverse(), // the album reads from the oldest day
    aspect: e => e.aspect || 4 / 3,
    showToday: () => state.filter.type === 'all' && !state.query.trim(),
    demo: db.DEMO,
    isEmpty: () => !state.entries.length,
    urlOf: coverOf,
    look: () => state.look,
    filterLabel,
    onDecorate: () => decor.open(),
  });
  decor = createDecor($('#main'), { look: () => state.look, save: saveLook, book, toast, confirm: confirmDialog });
}

function renderMain() { book?.refresh(); }

const render = () => { renderNav(); renderMain(); };

// ---------- clicks ----------
function onClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b || b.closest('.viewer, .modal-wrap, .menu')) return;
  const { act, id, type } = b.dataset;
  if (act === 'new') openForm();
  else if (act === 'home') { setFilter('all'); book.goHome(); }
  else if (act === 'filter') setFilter(type, id);
  else if (act === 'open') { if (innerWidth < 760 && !state.collapsed) toggleCollapse(true); openEntry(id); }
  else if (act === 'collapse') toggleCollapse();
  else if (act === 'expand-search') { toggleCollapse(false); setTimeout(() => $('.search input').focus(), 260); }
  else if (act === 'new-folder') { if (state.collapsed) toggleCollapse(false); promptFolder(); }
  else if (act === 'folder-menu') folderMenu(b, id);
  else if (act === 'new-mood') promptMood();
  else if (act === 'del-mood') deleteMood(id);
  else if (act === 'entry-menu') entryMenu(b, state.entries.find(x => x.id === id));
}

function setFilter(type, id = null) {
  state.filter = { type, id };
  render();
  if (innerWidth < 760 && !state.collapsed) toggleCollapse(true);
}

function toggleCollapse(force) {
  if (innerWidth >= 760) { state.collapsed = false; document.body.classList.remove('is-collapsed'); return; }
  state.collapsed = typeof force === 'boolean' ? force : !state.collapsed;
  document.body.classList.toggle('is-collapsed', state.collapsed);
}

function openEntry(id, opts) {
  const e = state.entries.find(x => x.id === id);
  if (!e) return;
  book.reveal(id); // after the memory closes, the album lies open on this day
  openViewer(e, photoUrls(e), {
    toast,
    menu: (anchor, entry, v) => entryMenu(anchor, entry, v),
    ...opts,
  });
}

// ---------- toasts ----------
function toast(text) {
  const wrap = $('.toasts');
  const t = document.createElement('div');
  t.className = 'toast glass';
  t.textContent = text;
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ---------- popover menu ----------
function openMenu(anchor, items) {
  document.querySelector('.menu')?.remove();
  const m = document.createElement('div');
  m.className = 'menu glass';
  m.setAttribute('role', 'menu');
  m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `
    <button role="menuitem" class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">
      ${it.icon ? icon(it.icon, 18) : ''}<span>${esc(it.label)}</span>${it.checked ? `<span class="menu-check">${icon('check', 16)}</span>` : ''}
    </button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let x = Math.min(innerWidth - mw - 8, Math.max(8, r.right - mw));
  let y = r.bottom + 8;
  if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 8);
  m.style.left = x + 'px'; m.style.top = y + 'px';
  requestAnimationFrame(() => m.classList.add('is-open'));
  m.querySelector('button')?.focus();

  const close = () => { m.remove(); removeEventListener('pointerdown', outside, true); removeEventListener('keydown', key, true); };
  const outside = ev => { if (!m.contains(ev.target)) close(); };
  const key = ev => {
    if (ev.key === 'Escape') { ev.stopPropagation(); close(); anchor.focus(); }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const bs = [...m.querySelectorAll('button')];
      const i = bs.indexOf(document.activeElement);
      bs[(i + (ev.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus();
    }
  };
  setTimeout(() => { addEventListener('pointerdown', outside, true); addEventListener('keydown', key, true); });
  m.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-i]');
    if (!btn) return;
    const it = items[+btn.dataset.i];
    close();
    it.run();
  });
}

function entryMenu(anchor, entry, viewer) {
  if (!entry) return;
  const items = [
    ...(viewer ? [] : [{ label: 'Открыть', icon: 'play', run: () => openEntry(entry.id) }]),
    { label: 'Редактировать', icon: 'edit', run: () => { viewer?.close(true); openForm(entry); } },
    { label: 'В папку…', icon: 'folder', run: () => folderPicker(anchor, entry) },
    '-',
    { label: 'Удалить запись', icon: 'trash', danger: true, run: () => deleteEntry(entry, viewer) },
  ];
  openMenu(anchor, items);
}

function folderPicker(anchor, entry) {
  const items = state.folders.map(f => ({
    label: f.name, icon: 'folder', checked: (entry.folderIds || []).includes(f.id),
    run: async () => {
      const set = new Set(entry.folderIds || []);
      const had = set.has(f.id);
      had ? set.delete(f.id) : set.add(f.id);
      entry.folderIds = [...set];
      await db.put('entries', entry);
      render();
      toast(had ? `Убрано из «${f.name}»` : `Добавлено в «${f.name}»`);
    },
  }));
  items.push(...(items.length ? ['-'] : []), { label: 'Новая папка…', icon: 'folderPlus', run: () => promptFolder(entry) });
  openMenu(anchor, items);
}

function folderMenu(anchor, id) {
  const f = state.folders.find(x => x.id === id);
  openMenu(anchor, [
    { label: 'Переименовать', icon: 'edit', run: () => promptFolder(null, f) },
    { label: 'Удалить папку', icon: 'trash', danger: true, run: () => deleteFolder(f) },
  ]);
}

// ---------- modal helpers ----------
function modal(html, { cls = '', onClose } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal glass-panel ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(wrap);
  const prev = document.activeElement;
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const close = () => {
    wrap.classList.remove('is-open');
    removeEventListener('keydown', key, true);
    setTimeout(() => { wrap.remove(); prev?.focus?.(); }, 220);
    onClose?.();
  };
  const key = ev => {
    if (wrap !== [...document.querySelectorAll('.modal-wrap')].at(-1)) return; // only the top dialog reacts
    if (ev.key === 'Escape' && !document.querySelector('.menu')) { ev.stopPropagation(); if (!wrap.dataset.busy) close(); }
    if (ev.key === 'Tab') {
      const f = [...wrap.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f.at(-1).focus(); }
      else if (!ev.shiftKey && document.activeElement === f.at(-1)) { ev.preventDefault(); f[0].focus(); }
    }
  };
  addEventListener('keydown', key, true);
  wrap.addEventListener('pointerdown', ev => { if (ev.target === wrap && !wrap.dataset.busy) close(); });
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  return { el: wrap.querySelector('.modal'), wrap, close };
}

function confirmDialog({ title, text, ok, danger }) {
  return new Promise(resolve => {
    let answered = false;
    const m = modal(`
      <h2 class="modal-title">${esc(title)}</h2>
      <p class="modal-text">${esc(text)}</p>
      <div class="modal-actions">
        <button class="btn glass-btn" data-close>Отмена</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>
      </div>`, { cls: 'small', onClose: () => { if (!answered) resolve(false); } });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { answered = true; resolve(true); m.close(); });
    m.el.querySelector('[data-ok]').focus();
  });
}

function promptFolder(addEntry = null, folder = null) {
  const m = modal(`
    <h2 class="modal-title">${folder ? 'Переименовать папку' : 'Новая папка'}</h2>
    <form class="stack">
      <label class="field"><span>Название</span><input name="name" maxlength="40" required value="${esc(folder?.name || '')}" placeholder="Например, Лето у бабушки"></label>
      <div class="modal-actions">
        <button type="button" class="btn glass-btn" data-close>Отмена</button>
        <button class="btn primary">${folder ? 'Сохранить' : 'Создать'}</button>
      </div>
    </form>`, { cls: 'small' });
  const input = m.el.querySelector('input');
  input.focus(); input.select();
  m.el.querySelector('form').addEventListener('submit', async ev => {
    ev.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    if (folder) { folder.name = name; await db.put('folders', folder); toast('Папка переименована'); }
    else {
      const f = { id: db.uid(), name, createdAt: Date.now() };
      await db.put('folders', f);
      state.folders.push(f);
      if (addEntry) { addEntry.folderIds = [...(addEntry.folderIds || []), f.id]; await db.put('entries', addEntry); toast(`Добавлено в «${name}»`); }
      else toast(`Папка «${name}» создана`);
    }
    m.close();
    render();
  });
}

// Own mood: a word that describes the day more precisely, plus the base mood
// whose look (colors and pace) it should borrow.
function promptMood() {
  return new Promise(resolve => {
    let base = null, done = false;
    const m = modal(`
      <h2 class="modal-title">Своё настроение</h2>
      <p class="modal-text">Слово, которое точнее описывает день. Оформление возьмётся у близкого базового настроения.</p>
      <form class="stack">
        <label class="field"><span>Название</span><input name="name" maxlength="24" required placeholder="Например, Предвкушение"></label>
        <fieldset class="field"><legend>На что похоже</legend>
          <div class="mood-pick">${MOODS.map(mo => `<button type="button" class="chip" role="radio" aria-checked="false" data-base="${mo.id}">${mo.name}</button>`).join('')}</div>
        </fieldset>
        <p class="form-error" role="alert"></p>
        <div class="modal-actions">
          <button type="button" class="btn glass-btn" data-close>Отмена</button>
          <button class="btn primary">Добавить</button>
        </div>
      </form>`, { cls: 'small', onClose: () => { if (!done) resolve(null); } });
    const form = m.el.querySelector('form');
    form.querySelector('.mood-pick').addEventListener('click', ev => {
      const c = ev.target.closest('[data-base]');
      if (!c) return;
      base = c.dataset.base;
      form.querySelectorAll('[data-base]').forEach(x => { const on = x === c; x.classList.toggle('is-active', on); x.setAttribute('aria-checked', on); });
    });
    const nameInput = form.querySelector('input[name=name]');
    nameInput.focus();
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const name = nameInput.value.trim();
      const err = form.querySelector('.form-error');
      if (!name) { err.textContent = 'Введите название'; return; }
      if (allMoods().some(x => x.name.toLowerCase() === name.toLowerCase())) { err.textContent = 'Такое настроение уже есть'; return; }
      if (!base) { err.textContent = 'Выберите, на что похоже'; return; }
      const mood = { id: 'c-' + db.uid(), name: name[0].toUpperCase() + name.slice(1), base, createdAt: Date.now() };
      await db.put('moods', mood);
      setCustomMoods([...customMoods(), mood]);
      done = true;
      m.close();
      renderNav();
      toast(`Настроение «${mood.name}» добавлено`);
      resolve(mood);
    });
  });
}

async function deleteMood(id) {
  const mood = customMoods().find(x => x.id === id);
  if (!mood) return;
  const used = state.entries.filter(e => e.mood === id);
  const baseName = moodById(mood.base).name;
  const ok = await confirmDialog({
    title: `Удалить настроение «${mood.name}»?`,
    text: used.length ? `${used.length} ${plural(used.length, 'запись перейдёт', 'записи перейдут', 'записей перейдут')} в «${baseName}».` : 'Записей с этим настроением нет.',
    ok: 'Удалить', danger: true,
  });
  if (!ok) return;
  for (const e of used) { e.mood = mood.base; await db.put('entries', e); }
  await db.del('moods', id);
  setCustomMoods(customMoods().filter(x => x.id !== id));
  if (state.filter.type === 'mood' && state.filter.id === id) state.filter = { type: 'all', id: null };
  render();
  toast('Настроение удалено');
}

async function deleteFolder(f) {
  const ok = await confirmDialog({ title: `Удалить папку «${f.name}»?`, text: 'Записи останутся в дневнике — удалится только папка.', ok: 'Удалить папку', danger: true });
  if (!ok) return;
  await db.del('folders', f.id);
  state.folders = state.folders.filter(x => x.id !== f.id);
  for (const e of state.entries) {
    if ((e.folderIds || []).includes(f.id)) { e.folderIds = e.folderIds.filter(x => x !== f.id); await db.put('entries', e); }
  }
  if (state.filter.type === 'folder' && state.filter.id === f.id) state.filter = { type: 'all', id: null };
  render();
  toast('Папка удалена');
}

async function deleteEntry(entry, viewer) {
  const ok = await confirmDialog({ title: `Удалить «${entry.title}»?`, text: 'Запись, фото и выбранная песня исчезнут из дневника. Это нельзя отменить.', ok: 'Удалить', danger: true });
  if (!ok) return;
  viewer?.close();
  await db.del('entries', entry.id);
  state.entries = state.entries.filter(x => x.id !== entry.id);
  render();
  toast('Запись удалена');
}

// ---------- entry form ----------
function openForm(entry = null) {
  closeViewer();
  const draft = {
    date: entry?.date || today(),
    text: entry?.text || '',
    mood: entry?.mood || null,
    photos: entry ? [...entry.photos] : [],
    track: entry?.track || null,
    trackBy: entry?.trackBy || null,
    title: entry?.title || '',
  };
  let previewAudio = null;
  const stopPreview = () => { previewAudio?.pause(); previewAudio = null; m.el.querySelectorAll('.track-play.is-on').forEach(b => { b.classList.remove('is-on'); b.innerHTML = icon('play', 16); }); };

  const m = modal(`
    <div class="form-head">
      <div>
        <p class="eyebrow">${entry ? 'Редактирование' : 'Новая запись'}</p>
        <h2 class="display-sm">${entry ? esc(entry.title) : 'Как прошёл день?'}</h2>
      </div>
      <button class="glass-btn icon-btn" data-close aria-label="Закрыть">${icon('close')}</button>
    </div>
    <form class="entry-form" novalidate>
      <div class="form-grid">
        <div class="stack">
          <label class="field"><span>Дата</span><input type="date" name="date" value="${draft.date}" max="${today()}" required></label>
          ${entry ? `<label class="field"><span>Название папки дня</span><input name="title" maxlength="70" value="${esc(draft.title)}"></label>` : ''}
          <label class="field grow"><span>Запись</span>
            <textarea name="text" rows="7" placeholder="Погода, свет, запахи, люди рядом, мелочи, которые хочется запомнить…">${esc(draft.text)}</textarea>
          </label>
          <fieldset class="field">
            <legend>Настроение</legend>
            <div class="mood-pick" role="radiogroup"></div>
          </fieldset>
        </div>
        <div class="stack">
          <div class="field">
            <span>Фото <em>первое станет обложкой</em></span>
            <div class="photos"></div>
            <input type="file" accept="image/*" multiple hidden>
          </div>
          <div class="field music-field">
            <span>Песня дня <em>Apple Music</em></span>
            <div class="track-picked"></div>
            <label class="search">${icon('search', 18)}<input type="search" placeholder="Исполнитель или название" aria-label="Поиск песни в Apple Music"></label>
            <div class="track-results" role="listbox" aria-label="Результаты поиска"></div>
            <p class="hint">Не выбрали песню — Moodmark подберёт её по фото, записи и настроению.</p>
          </div>
        </div>
      </div>
      <div class="form-foot">
        <p class="form-error" role="alert"></p>
        <button class="btn primary shine submit" type="submit">${icon('check', 18)}<span>${entry ? 'Сохранить' : 'Сохранить день'}</span></button>
      </div>
    </form>`, { cls: 'form-modal', onClose: () => stopPreview() });

  const form = m.el.querySelector('form');
  const fileInput = form.querySelector('input[type=file]');
  const photosEl = form.querySelector('.photos');
  const err = form.querySelector('.form-error');

  // photos
  const renderPhotos = () => {
    photosEl.innerHTML = draft.photos.map((p, i) => `
      <div class="ph"><img src="${urlOf(p)}" alt="Фото ${i + 1}"><button type="button" class="glass-btn icon-btn sm" data-rm="${i}" aria-label="Убрать фото ${i + 1}">${icon('close', 14)}</button></div>`).join('')
      + `<button type="button" class="ph add" data-add>${icon('image', 22)}<span>${draft.photos.length ? 'Ещё фото' : 'Добавить фото'}</span></button>`;
  };
  const addFiles = async files => {
    const imgs = [...files].filter(f => f.type.startsWith('image/')).slice(0, 10 - draft.photos.length);
    if (!imgs.length) return;
    photosEl.classList.add('is-loading');
    for (const f of imgs) { try { draft.photos.push(await shrink(f)); } catch { toast('Не удалось прочитать одно из фото'); } }
    photosEl.classList.remove('is-loading');
    renderPhotos();
  };
  photosEl.addEventListener('click', ev => {
    if (ev.target.closest('[data-add]')) fileInput.click();
    const rm = ev.target.closest('[data-rm]');
    if (rm) { draft.photos.splice(+rm.dataset.rm, 1); renderPhotos(); }
  });
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  photosEl.addEventListener('dragover', ev => { ev.preventDefault(); photosEl.classList.add('is-drag'); });
  photosEl.addEventListener('dragleave', () => photosEl.classList.remove('is-drag'));
  photosEl.addEventListener('drop', ev => { ev.preventDefault(); photosEl.classList.remove('is-drag'); addFiles(ev.dataTransfer.files); });
  renderPhotos();

  // mood
  const moodPick = form.querySelector('.mood-pick');
  const renderMoods = () => {
    moodPick.innerHTML = allMoods().map(mo => `<button type="button" class="chip ${draft.mood === mo.id ? 'is-active' : ''}" role="radio" aria-checked="${draft.mood === mo.id}" data-mood="${mo.id}">${esc(mo.name)}</button>`).join('')
      + `<button type="button" class="chip chip-add" data-add-mood>${icon('plus', 14)}Своё</button>`;
  };
  renderMoods();
  moodPick.addEventListener('click', async ev => {
    if (ev.target.closest('[data-add-mood]')) {
      const mood = await promptMood();
      if (mood) { draft.mood = mood.id; renderMoods(); }
      return;
    }
    const c = ev.target.closest('[data-mood]');
    if (!c) return;
    draft.mood = c.dataset.mood;
    renderMoods();
  });

  // music
  const picked = form.querySelector('.track-picked');
  const results = form.querySelector('.track-results');
  const q = form.querySelector('.music-field input');
  let found = [];
  const renderPicked = () => {
    picked.innerHTML = draft.track ? `
      <div class="track is-picked">
        <img src="${draft.track.thumb}" alt="" width="44" height="44">
        <div class="track-meta"><b>${esc(draft.track.title)}</b><span>${esc(draft.track.artist)}${draft.trackBy === 'ai' ? ' · подобрано Moodmark' : ''}</span></div>
        <button type="button" class="icon-btn ghost sm" data-unpick aria-label="Убрать песню">${icon('close', 16)}</button>
      </div>` : '';
  };
  const renderResults = (state_) => {
    if (state_ === 'loading') { results.innerHTML = Array.from({ length: 3 }, () => '<div class="track skeleton-row"></div>').join(''); return; }
    if (state_ === 'error') { results.innerHTML = '<p class="hint">Каталог Apple Music сейчас не отвечает. Попробуйте ещё раз.</p>'; return; }
    results.innerHTML = found.map((t, i) => `
      <div class="track" role="option" aria-selected="${draft.track?.id === t.id}">
        <button type="button" class="track-play icon-btn ghost sm" data-play="${i}" aria-label="Послушать отрывок">${icon('play', 16)}</button>
        <img src="${t.thumb}" alt="" width="44" height="44" loading="lazy">
        <div class="track-meta"><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.year ? ' · ' + t.year : ''}</span></div>
        <button type="button" class="btn sm glass-btn" data-pick="${i}">Выбрать</button>
      </div>`).join('') || (q.value.trim() ? '<p class="hint">Ничего не нашлось</p>' : '');
  };
  let st;
  q.addEventListener('input', () => {
    clearTimeout(st);
    const v = q.value.trim();
    if (!v) { found = []; renderResults(); return; }
    st = setTimeout(async () => {
      renderResults('loading');
      try { found = await searchTracks(v); renderResults(); }
      catch (e2) { if (e2.name !== 'AbortError') renderResults('error'); }
    }, 300);
  });
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter') ev.preventDefault(); });
  results.addEventListener('click', ev => {
    const p = ev.target.closest('[data-pick]');
    if (p) { draft.track = found[+p.dataset.pick]; draft.trackBy = 'user'; stopPreview(); found = []; q.value = ''; renderResults(); renderPicked(); return; }
    const pl = ev.target.closest('[data-play]');
    if (pl) {
      const on = pl.classList.contains('is-on');
      stopPreview();
      if (on) return;
      previewAudio = new Audio(found[+pl.dataset.play].preview);
      previewAudio.volume = 0.8;
      previewAudio.play().catch(() => {});
      previewAudio.onended = stopPreview;
      pl.classList.add('is-on'); pl.innerHTML = icon('pause', 16);
    }
  });
  picked.addEventListener('click', ev => { if (ev.target.closest('[data-unpick]')) { draft.track = null; draft.trackBy = null; renderPicked(); } });
  renderPicked();

  // submit
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    draft.date = form.date.value;
    draft.text = form.text.value.trim();
    const titleInput = form.querySelector('input[name=title]');
    if (titleInput) draft.title = titleInput.value.trim();
    const missing = !draft.date ? 'Укажите дату' : !draft.photos.length ? 'Добавьте хотя бы одно фото' : !draft.mood ? 'Выберите настроение дня' : !draft.text ? 'Напишите пару строк о дне' : '';
    if (missing) { err.textContent = missing; return; }
    err.textContent = '';
    stopPreview();

    const btn = form.querySelector('.submit');
    const label = btn.querySelector('span');
    const step = t => { label.textContent = t; };
    btn.disabled = true; btn.classList.add('is-busy');
    m.wrap.dataset.busy = '1';
    form.querySelectorAll('input, textarea, button:not(.submit)').forEach(x => x.disabled = true);

    try {
      const changed = !entry || entry.text !== draft.text || entry.mood !== draft.mood || entry.photos[0] !== draft.photos[0] || (entry.track?.id !== draft.track?.id);
      let read = entry && !changed ? { title: entry.title, caption: entry.caption, atmosphere: entry.atmosphere, warmth: entry.warmth, model: entry.model, ambience: entry.ambience, time: entry.time, light: entry.light, weather: entry.weather, pace: entry.pace } : null;
      if (!read) {
        step(hasAI() ? 'Читаем запись и смотрим фото…' : 'Собираем воспоминание…');
        const photo = await thumbDataURL(draft.photos[0]);
        read = await readDay({ text: draft.text, mood: draft.mood, date: draft.date, photo, track: draft.track })
          || fallbackRead({ text: draft.text, mood: draft.mood, date: draft.date });
      }
      if (!draft.track) {
        step('Подбираем песню…');
        draft.track = (read.music && await findTrack(read.music).catch(() => null))
          || await findTrack(moodById(draft.mood).query).catch(() => null);
        draft.trackBy = draft.track ? 'ai' : null;
      }
      step('Сохраняем день…');
      const userTitle = entry && draft.title && draft.title !== entry.title ? draft.title : null;
      const saved = {
        id: entry?.id || db.uid(),
        createdAt: entry?.createdAt || Date.now(),
        updatedAt: Date.now(),
        date: draft.date,
        text: draft.text,
        mood: draft.mood,
        photos: draft.photos,
        aspect: await aspectOf(draft.photos[0]),
        thumb: entry && entry.photos[0] === draft.photos[0] && entry.thumb ? entry.thumb : await thumbBlob(draft.photos[0]).catch(() => null),
        ambience: read.ambience ?? entry?.ambience ?? null,
        time: read.time ?? entry?.time ?? null,
        light: read.light ?? entry?.light ?? null,
        weather: read.weather ?? entry?.weather ?? null,
        pace: read.pace ?? entry?.pace ?? null,
        palette: entry && entry.photos[0] === draft.photos[0] && entry.palette ? entry.palette : await paletteFromBlob(draft.photos[0]).catch(() => null),
        track: draft.track,
        trackBy: draft.trackBy,
        title: userTitle || read.title,
        caption: read.caption,
        atmosphere: read.atmosphere,
        warmth: read.warmth || 0,
        model: read.model || null,
        folderIds: entry?.folderIds || (state.filter.type === 'folder' ? [state.filter.id] : []),
      };
      await db.put('entries', saved);
      state.entries = [saved, ...state.entries.filter(x => x.id !== saved.id)].sort(byDate);
      delete m.wrap.dataset.busy;
      m.close();
      render();
      toast(entry ? 'Запись обновлена' : `День «${saved.title}» вклеен в альбом`);
      setTimeout(() => openEntry(saved.id), 260);
    } catch (e2) {
      console.error(e2);
      err.textContent = 'Не получилось сохранить. Попробуйте ещё раз.';
      btn.disabled = false; btn.classList.remove('is-busy');
      step(entry ? 'Сохранить' : 'Сохранить день');
      delete m.wrap.dataset.busy;
      form.querySelectorAll('input, textarea, button').forEach(x => x.disabled = false);
    }
  });

  setTimeout(() => form.text.focus(), 80);
}

// ---------- boot ----------
async function boot() {
  renderShell();
  const intro = playIntro();
  await Promise.all([load(), stickersReady()]);
  mountBook();
  render();
  makeThumbs().then(fillMissingSongs);
  await intro;
}
boot();
