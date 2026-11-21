// The album: a hardcover book. Closed, it shows the cover (its color and
// stickers). Click the book to open it, click the paper to close it. Open, it
// shows a spread of two pages (one page on phones). Days are pasted in like
// prints in an old photo album: frames of different sizes, scattered over the
// page, each with the mood and date under it. It opens at today.
import { icon } from './icons.js';
import { moodById } from './moods.js';
import { fmtDate, monthLabel, today, esc, plural } from './util.js';
import { stickerSrc } from './stickers.js';

// Page grid for the collage: 6 columns × 16 rows (a cell is twice as wide as
// tall). A day takes a block of photo rows plus one caption row.
const COLS = 6, ROWS = 16, MAX_PER_PAGE = 5;
const BLANK_PAGES = 10;
const FRAMES = {
  wide: [[4, 5], [3, 4], [5, 6], [6, 7], [4, 6], [3, 3]],
  tall: [[2, 5], [3, 7], [3, 8], [2, 6]],
  square: [[3, 6], [2, 4], [4, 8]],
};
const kindOf = a => (a > 1.15 ? 'wide' : a < 0.87 ? 'tall' : 'square');

// Small seeded random generator: the same days always land in the same places.
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const shuffle = (list, rnd) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Text on the cover follows the cover's lightness.
export function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

export function createBook(root, api) {
  let open = false, page = 0, busy = false, two = true, decorating = false;
  let pages = [];

  root.innerHTML = `
    <div class="album-bar">
      <div class="bar-side bar-start"></div>
      <div class="bar-mid"></div>
      <div class="bar-side bar-end"></div>
    </div>
    <div class="album-stage">
      <div class="book">
        <div class="board" aria-hidden="true"></div>
        <div class="pages">
          <div class="page page-l paper-l"></div>
          <div class="page page-r paper-r"></div>
          <div class="gutter" aria-hidden="true"></div>
        </div>
        <div class="leaf">
          <div class="leaf-front cover">
            <button class="cover-hit" data-book="open" aria-label="Открыть альбом"></button>
            <div class="cover-art" aria-hidden="true">
              <span class="cover-frame"></span>
              <span class="logo-bubble"><span class="logo"></span></span>
              <span class="cover-title">Moodmark</span>
              <span class="cover-sub"></span>
            </div>
            <div class="stk-layer"></div>
          </div>
          <div class="leaf-back" aria-hidden="true"></div>
        </div>
      </div>
    </div>
`;

  const $ = s => root.querySelector(s);
  const bar = { start: $('.bar-start'), mid: $('.bar-mid'), end: $('.bar-end') };
  const stage = $('.album-stage'), book = $('.book'), pagesEl = $('.pages');
  const L = $('.page-l'), R = $('.page-r');

  // ---------- pages ----------
  function build() {
    const items = api.items().map(e => ({ e }));
    // the last place in the album is always an empty frame for a new day
    if (api.showToday()) items.push({ today: true, done: items.some(it => it.e.date === today()) });
    // no title page: the glass cover is the title, the album starts with the days
    // on a spread the first left page is the inside of the glass cover,
    // so the first page of days lies on the right, as in a real book
    pages = [...(two ? [{ type: 'inside' }] : []), ...collage(items)];
    // A new album has 10 empty pages to flip through. More pages appear only
    // once all of them are filled with photos.
    const count = () => pages.filter(p => p.type === 'items').length;
    if (api.showToday()) while (count() < BLANK_PAGES) pages.push({ type: 'items', items: [] });
    if (!count()) pages.push({ type: 'items', items: [] });
    // the back endpaper evens out the last spread
    if (two && pages.length % 2) pages.push({ type: 'end' });
  }
  // Packs days onto pages: each day gets a frame shaped like its photo, put at
  // the highest free spot (a random one among equals), until the page is full.
  function collage(items) {
    const out = [];
    let i = 0;
    while (i < items.length) {
      const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
      const free = (x, y, w, h) => { for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) if (grid[r][c]) return false; return true; };
      const rnd = seeded((items[i].e?.id || 'today') + ':' + out.length);
      const slots = [];
      while (i < items.length && slots.length < MAX_PER_PAGE) {
        const it = items[i];
        let spot = null;
        // frames shaped like the photo first; if none fits, any frame (the photo is cropped)
        const kind = kindOf(it.today ? 1 : api.aspect(it.e));
        const tries = [FRAMES[kind], FRAMES.square, ...Object.values(FRAMES)];
        for (const set of tries) {
          for (const [w, rows] of shuffle(set, rnd)) {
            const h = rows + 1;
            for (let y = 0; y + h <= ROWS; y++) {
              if (spot && y >= spot.y) break;
              const xs = [];
              for (let x = 0; x + w <= COLS; x++) if (free(x, y, w, h)) xs.push(x);
              if (xs.length) {
                // mostly against an edge (packs tighter), sometimes anywhere
                const x = rnd() < 0.8 ? (rnd() < 0.5 ? xs[0] : xs.at(-1)) : xs[Math.floor(rnd() * xs.length)];
                spot = { x, y, w, h }; break;
              }
            }
          }
          if (spot) break;
        }
        if (!spot) break;
        for (let r = spot.y; r < spot.y + spot.h; r++) for (let c = spot.x; c < spot.x + spot.w; c++) grid[r][c] = true;
        slots.push({ it, ...spot, jx: rnd() - 0.5, jy: rnd() - 0.5, tilt: rnd() * 2 - 1 });
        i++;
      }
      out.push({ type: 'items', items: slots });
    }
    return out;
  }

  const step = () => (two ? 2 : 1);
  const lastView = () => Math.max(0, pages.length - step());
  const viewOf = i => (two ? i - (i % 2) : i);
  // where the album opens: the page with today (or the latest day)
  const homePage = () => {
    const i = pages.findLastIndex(p => p.type === 'items' && p.items.length);
    return i < 0 ? 0 : i;
  };
  const homeView = () => viewOf(homePage());
  const pageOfEntry = id => pages.findIndex(p => p.type === 'items' && p.items.some(s => s.it.e?.id === id));

  // Each day's print is styled by the day itself: the frame by its mood, the
  // mat by its photo's colors, the tilt by how eventful the day was.
  function printOf(e, tilt) {
    const base = moodById(e.mood).base || e.mood;
    const frame = e.light === 'neon' ? 'tape'
      : ({ joy: 'tape', energy: 'tape', nostalgia: 'corners', calm: 'corners', tender: 'polaroid', sad: 'plain', anxious: 'plain', tired: 'plain' })[base] || 'corners';
    const mat = e.palette?.[0] && frame !== 'polaroid' && frame !== 'tape' ? `color-mix(in srgb, ${e.palette[0]} 26%, #fff)` : '#fff';
    const pace = e.pace ?? (moodById(e.mood).grade.speed - 0.9);
    // every print sits a little crooked, like pasted by hand; a busier day more so
    const rot = Math.sign(tilt || 1) * (1.4 + Math.abs(tilt) * 1.4 + Math.max(0, pace) * 1.6);
    return { frame, style: `--mat:${mat};--rot:${rot.toFixed(2)}deg` };
  }

  function snap(s) {
    const pos = `left:${(s.x / COLS) * 100}%;top:${(s.y / ROWS) * 100}%;width:${(s.w / COLS) * 100}%;height:${(s.h / ROWS) * 100}%;--h:${s.h};--jx:${s.jx};--jy:${s.jy}`;
    if (s.it.today) {
      return `
        <button class="snap snap-today" data-act="new" style="${pos}">
          <span class="snap-photo">${icon('plus', 24)}</span>
          <span class="snap-cap"><b>${s.it.done ? 'Новая запись' : 'Записать этот день'}</b><span>Сегодня, ${fmtDate(today())}</span></span>
        </button>`;
    }
    const e = s.it.e;
    const url = api.urlOf(e);
    const pr = printOf(e, s.tilt ?? 0);
    return `
      <article class="snap" style="${pos};${pr.style}">
        <button class="snap-open" data-act="open" data-id="${e.id}" aria-label="Открыть «${esc(e.title)}»">
          <span class="snap-photo frame-${pr.frame}"><img src="${url}" alt="" loading="lazy" decoding="async" draggable="false">
            ${e.photos.length > 1 ? `<span class="snap-count">${icon('image', 12)}${e.photos.length}</span>` : ''}</span>
          <span class="snap-cap"><b>${esc(e.title)}</b><span>${esc(moodById(e.mood).name)} · ${fmtDate(e.date)}</span></span>
        </button>
        <button class="snap-more icon-btn ghost sm" data-act="entry-menu" data-id="${e.id}" aria-label="Действия с записью «${esc(e.title)}»">${icon('more', 16)}</button>
      </article>`;
  }

  function titlePage() {
    const items = api.items();
    const n = items.length;
    const range = n ? [...new Set([items[0].date, items.at(-1).date].map(monthLabel))].join(' — ') : 'Первые страницы ещё впереди';
    return `
      <div class="pg pg-title">
        <span class="logo-bubble" aria-hidden="true"><span class="logo"></span></span>
        <h2 class="pg-title-name">Moodmark</h2>
        <p class="pg-title-sub">Альбом дней</p>
        <p class="pg-title-meta">${esc(api.filterLabel() || range)}</p>
        <p class="pg-title-meta">${n ? `${n} ${plural(n, 'день', 'дня', 'дней')}` : ''}</p>
      </div>`;
  }

  // Page numbers count only pages of days (the cover's inside is not a page);
  // stickers are kept by that number, so they stay put on phones and desktops.
  const off = () => (pages[0]?.type === 'inside' ? 1 : 0);
  const ord = i => i - off();

  function pageHTML(i) {
    if (pages[i]?.type === 'inside') return '<div class="pg pg-inside"></div>';
    return pageBody(i) + (pages[i] ? `<div class="stk-layer" data-page="${ord(i)}">${stickerHTML(pageStickers(ord(i)), null)}</div>` : '');
  }
  function pageBody(i) {
    const p = pages[i];
    const num = i < pages.length && p?.type !== 'end' ? `<span class="pg-num">${ord(i) + 1}</span>` : '';
    if (p?.type === 'end') return '<div class="pg pg-end"></div>';
    if (!p || p.type === 'blank') return `<div class="pg pg-blank"><span class="logo" aria-hidden="true"></span>${num}</div>`;
    if (p.type === 'title') return titlePage();
    if (!p.items.length) return `<div class="pg pg-blank">${api.showToday() ? '' : '<p class="pg-empty">Ничего не нашлось</p>'}${num}</div>`;
    const months = [...new Set(p.items.map(s => monthLabel(s.it.e?.date || today())))];
    return `<div class="pg"><header class="pg-head">${months.join(' — ')}</header><div class="pg-items">${p.items.map(snap).join('')}</div>${num}</div>`;
  }

  // the first page with photos, seen through the glass cover of the closed book
  const firstPage = () => Math.max(0, pages.findIndex(p => p.type === 'items' && p.items.length));

  function renderSpread() {
    if (!open) { L.innerHTML = ''; R.innerHTML = pageHTML(firstPage()); }
    else if (two) { L.innerHTML = pageHTML(page); R.innerHTML = pageHTML(page + 1); }
    else { L.innerHTML = ''; R.innerHTML = pageHTML(page); }
    const vis = new Set(two ? [page, page + 1] : [page]);
    L.toggleAttribute('inert', !open); R.toggleAttribute('inert', !open);
    pagesEl.setAttribute('aria-label', [...vis].filter(i => i < pages.length).filter(i => pages[i]?.type === 'items').map(i => `страница ${ord(i) + 1}`).join(', '));
  }

  // ---------- turning ----------
  // A turn is a loose leaf laid over the spread: its front is the page being
  // turned, its back is the page that comes next. Dragging sets how far it is
  // turned (0..1); letting go finishes the turn or lays the page back.
  function begin(to) {
    const dir = to > page ? 1 : -1;
    const leaf = document.createElement('div');
    const face = (side, cls, html) => `<div class="face face-${side} ${cls}">${html}</div>`;
    if (two) {
      if (dir > 0) { leaf.innerHTML = face('front', 'paper-r', pageHTML(page + 1)) + face('back', 'paper-l', pageHTML(to)); R.innerHTML = pageHTML(to + 1); }
      else { leaf.innerHTML = face('front', 'paper-l', pageHTML(page)) + face('back', 'paper-r', pageHTML(to + 1)); L.innerHTML = pageHTML(to); }
    } else if (dir > 0) { leaf.innerHTML = face('front', 'paper-r', pageHTML(page)) + face('back', 'paper-l', ''); R.innerHTML = pageHTML(to); }
    else leaf.innerHTML = face('front', 'paper-r', pageHTML(to)) + face('back', 'paper-l', '');
    leaf.className = `turn ${dir > 0 ? 'fwd' : 'back'}${two ? '' : ' single'}`;
    leaf.setAttribute('aria-hidden', 'true');
    const t = { leaf, dir, to, p: 0 };
    pose(t, 0, true);
    pagesEl.appendChild(leaf);
    return t;
  }

  function pose(t, p, instant) {
    t.p = p;
    const { leaf, dir } = t;
    leaf.style.transition = instant ? 'none' : '';
    // phones: the page swings off to the left (next) or in from the left (previous)
    const deg = two ? (dir > 0 ? -180 * p : 180 * p) : (dir > 0 ? -180 * p : -180 * (1 - p));
    // perspective lives in the transform itself: Safari keeps the 3D that way
    leaf.style.transform = `perspective(2200px) rotateY(${deg}deg)`;
    leaf.style.setProperty('--shade', Math.sin(p * Math.PI).toFixed(3));
    // fade the faces, not the leaf: opacity on a 3D element flattens it in Safari
    if (!two) leaf.style.setProperty('--fade', dir > 0 ? (p > 0.75 ? (1 - p) * 4 : 1) : (p < 0.25 ? p * 4 : 1));
  }

  function settle(t, commit) {
    busy = true;
    t.leaf.getBoundingClientRect();
    pose(t, commit ? 1 : 0);
    if (commit) { page = t.to; sync(true); } // the bar shows the new pages right away
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (commit) page = t.to;
      renderSpread(); t.leaf.remove(); busy = false; sync();
    };
    t.leaf.addEventListener('transitionend', ev => { if (ev.target === t.leaf && ev.propertyName === 'transform') done(); });
    setTimeout(done, 900);
  }

  function turn(to) {
    to = Math.max(0, Math.min(lastView(), viewOf(to)));
    if (busy || to === page || !open) return;
    if (reduce()) { page = to; renderSpread(); sync(); return; }
    settle(begin(to), true);
  }

  function setOpen(v, at) {
    if (busy && v === open) return;
    if (v === open) { if (v && at != null) { page = viewOf(at); renderSpread(); sync(); } return; }
    open = v;
    if (v) { page = at != null ? viewOf(at) : homeView(); renderSpread(); }
    book.classList.toggle('is-open', v);
    L.toggleAttribute('inert', !v); R.toggleAttribute('inert', !v);
    // once the cover has come down, the glass shows the first page again
    if (!v) setTimeout(() => { if (!open) renderSpread(); }, reduce() ? 0 : 1000);
    busy = true;
    setTimeout(() => { busy = false; }, reduce() ? 0 : 1000);
    sync();
    if (v) setTimeout(() => R.querySelector('button')?.focus({ preventScroll: true }), reduce() ? 0 : 1000);
  }

  // ---------- bar ----------
  const spreadLabel = () => {
    const nums = (two ? [page, page + 1] : [page]).filter(i => pages[i]?.type === 'items').map(i => ord(i) + 1);
    return nums.length ? `<span class="bar-pre">Стр. </span>${nums.join('–')} из ${pages.filter(p => p.type === 'items').length}` : '';
  };

  function sync(barOnly) {
    const f = api.filterLabel();
    const filter = f ? `<span class="bar-filter">${esc(f)}<button class="icon-btn ghost sm" data-act="filter" data-type="all" aria-label="Показать все записи">${icon('close', 14)}</button></span>` : '';
    const add = decorating ? '' : `<button class="btn primary bar-new" data-act="new">${icon('plus', 18)}<span>Новая запись</span></button>`
      + (api.demo ? `<a class="bar-demo" href="./" title="Вернуться к своему альбому">Пример альбома<span> · к своему</span></a>`
        : api.isEmpty() ? `<a class="btn glass-btn bar-example" href="?demo">${icon('book', 18)}<span>Открыть пример</span></a>` : '');
    if (!open) {
      bar.start.innerHTML = add + filter;
      bar.mid.innerHTML = decorating ? '' : '<span class="bar-hint">Нажмите на книгу, чтобы открыть</span>';
      bar.end.innerHTML = decorating ? '' : `<button class="btn glass-btn" data-book="decorate">${icon('brush', 18)}<span>Оформить</span></button>`;
    } else {
      bar.start.innerHTML = add + filter;
      bar.mid.innerHTML = `<span class="bar-page" aria-live="polite">${spreadLabel()}</span>`;
      bar.end.innerHTML = `
        <button class="btn glass-btn" data-book="home" ${page === homeView() ? 'disabled' : ''}>${icon('today', 18)}<span>Сегодня</span></button>
        <label class="glass-btn icon-btn date-jump" title="Перейти к дате">${icon('calendar')}<input type="date" max="${today()}" aria-label="Перейти к дате"></label>
        <button class="glass-btn icon-btn" data-book="decorate" aria-label="Оформить альбом" title="Оформить">${icon('brush')}</button>`;
    }
    root.classList.toggle('is-open', open);
    if (barOnly) return;
  }

  root.addEventListener('change', ev => {
    if (!ev.target.matches('.date-jump input') || !ev.target.value) return;
    const d = ev.target.value;
    let i = pages.findIndex(p => p.type === 'items' && p.items.some(s => (s.it.e?.date || today()) >= d));
    if (i < 0) i = homePage();
    turn(i);
    ev.target.value = '';
  });
  root.addEventListener('click', ev => {
    const dj = ev.target.closest('.date-jump');
    if (dj) { try { dj.querySelector('input').showPicker(); } catch { dj.querySelector('input').focus(); } }
    const b = ev.target.closest('[data-book]');
    if (!b || b.disabled) return;
    const a = b.dataset.book;
    if (a === 'open') { if (!decorating) setOpen(true); }
    else if (a === 'next') turn(page + step());
    else if (a === 'prev') turn(page - step());
    else if (a === 'home') turn(homeView());
    else if (a === 'decorate') api.onDecorate();
  });

  // keyboard and swipes
  addEventListener('keydown', ev => {
    if (!open || ev.target.closest?.('input, textarea, [contenteditable]')) return;
    if (document.querySelector('.viewer, .modal-wrap, .menu')) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); turn(page + step()); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); turn(page - step()); }
  });
  // Drag (mouse) or swipe (touch) the pages: the page follows the pointer
  // like a real one; let go past a third of the way (or flick) to turn it.
  let g = null, swiped = false;
  pagesEl.addEventListener('pointerdown', ev => {
    if (!open || busy || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    if (decorating && ev.target.closest('.stk')) return;
    g = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), turn: null };
    swiped = false;
  });
  pagesEl.addEventListener('pointermove', ev => {
    if (!g || ev.pointerId !== g.id) return;
    const dx = ev.clientX - g.x, dy = ev.clientY - g.y;
    if (!g.turn) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 16) g = null; return; }
      const to = page + (dx < 0 ? step() : -step());
      if (to < 0 || to > lastView() || busy) { g = null; return; }
      g.turn = begin(to);
      swiped = true;
      try { pagesEl.setPointerCapture(ev.pointerId); } catch { /* pointer already gone */ }
    }
    const width = pagesEl.getBoundingClientRect().width / (two ? 2 : 1);
    const p = Math.max(0, Math.min(1, (g.turn.dir > 0 ? -dx : dx) / width));
    pose(g.turn, p, true);
    g.lx = ev.clientX; g.lt = performance.now();
  });
  const release = ev => {
    if (!g || ev.pointerId !== g.id) return;
    const t = g.turn;
    if (t) {
      const v = (ev.clientX - g.x) / Math.max(1, performance.now() - g.t); // px per ms
      const flick = (t.dir > 0 ? -v : v) > 0.45;
      settle(t, ev.type !== 'pointercancel' && (t.p > 0.33 || flick));
    }
    g = null;
  };
  pagesEl.addEventListener('pointerup', release);
  pagesEl.addEventListener('pointercancel', release);
  // a drag is not a click: don't open a day or close the book after it
  pagesEl.addEventListener('click', ev => { if (swiped) { ev.stopPropagation(); ev.preventDefault(); swiped = false; } }, true);
  // A click on the paper (not on a day) or on the covers closes the book.
  const closeOnClick = ev => {
    if (!open || busy || decorating || ev.target.closest('button, a, input, label, .snap, .stk')) return;
    setOpen(false);
  };
  pagesEl.addEventListener('click', closeOnClick);
  $('.board').addEventListener('click', closeOnClick);
  $('.leaf').addEventListener('click', closeOnClick);
  addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && open && !decorating && !document.querySelector('.viewer, .modal-wrap, .menu')) setOpen(false);
  });

  // ---------- size ----------
  function fit() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    const wasTwo = two;
    two = r.width >= 700;
    const ratio = 0.74; // page width : height
    const room = two ? (r.width - 2 * 72) / 2 : r.width - 24;
    const pw = Math.floor(Math.max(160, Math.min(room, (r.height - 72) * ratio, two ? 470 : 520)));
    book.style.setProperty('--pw', pw + 'px');
    book.style.setProperty('--ph', Math.round(pw / ratio) + 'px');
    book.classList.toggle('is-single', !two);
    if (wasTwo !== two) { build(); page = Math.min(lastView(), viewOf(page)); renderSpread(); sync(); }
  }
  new ResizeObserver(fit).observe(stage);

  // ---------- the cover's look ----------
  function applyLook() {
    const look = api.look();
    book.style.setProperty('--book', look.color);
    book.classList.toggle('is-light', isLight(look.color));
    const year = new Date().getFullYear();
    root.querySelector('.cover-sub').textContent = `Альбом дней · ${year}`;
    renderStickers();
  }

  // Stickers: on the cover (no page) or on a page of the album (page number).
  function stickerHTML(list, sel) {
    const look = api.look();
    return list.map(s => {
      const src = stickerSrc(s.src, look.library);
      if (!src) return '';
      return `<div class="stk${s.id === sel ? ' is-sel' : ''}" data-id="${s.id}" style="left:${s.x * 100}%;top:${s.y * 100}%;width:${s.size * 100}%;--r:${s.rot}deg"
        ${decorating ? 'tabindex="0" role="button" aria-label="Наклейка: стрелки двигают, плюс и минус меняют размер, Delete удаляет"' : ''}>
        <img src="${src}" alt="" draggable="false">
        ${decorating ? `<button class="stk-del" data-stk="del" aria-label="Удалить наклейку">${icon('close', 12)}</button><span class="stk-rot" data-stk="rot" aria-hidden="true">${icon('rotate', 12)}</span>` : ''}
      </div>`;
    }).join('');
  }
  // page stickers belong to the whole album, not to a search or filter
  const pageStickers = i => (api.showToday() ? api.look().stickers.filter(s => s.page === i) : []);

  function renderStickers() {
    // the selection frame belongs to decorating only
    const sel = decorating ? root.querySelector('.stk.is-sel')?.dataset.id : null;
    root.querySelector('.leaf-front .stk-layer').innerHTML = stickerHTML(api.look().stickers.filter(s => s.page == null), sel);
    root.querySelectorAll('.page .stk-layer[data-page]').forEach(l => { l.innerHTML = stickerHTML(pageStickers(+l.dataset.page), sel); });
  }

  // ---------- public ----------
  build();
  renderSpread();
  applyLook();
  sync();
  fit();

  return {
    refresh() { build(); page = Math.min(lastView(), open ? viewOf(page) : homeView()); if (!open) page = homeView(); renderSpread(); sync(); },
    reveal(id) { build(); const i = pageOfEntry(id); if (i < 0) return; if (open) { page = viewOf(i); renderSpread(); sync(); } else setOpen(true, i); },
    goHome() { build(); if (open) turn(homeView()); else setOpen(true); },
    applyLook,
    renderStickers,
    // decorating the closed book edits the cover; the open book, its pages
    setDecorating(v) { decorating = v; book.classList.toggle('is-decorating', v); root.classList.toggle('is-decorating', v); renderStickers(); sync(); },
    // where a new sticker goes: the cover, or the open (right) page
    target: () => (open ? ord(two ? Math.min(page + 1, pages.length - 1) : page) : null),
    // the left page's number on a spread (the right one is +1)
    spread: () => ({ two, page: ord(page) }),
    el: () => book,
    get open() { return open; },
    cover: () => root.querySelector('.leaf-front'),
    layer: () => root.querySelector('.leaf-front .stk-layer'),
  };
}
