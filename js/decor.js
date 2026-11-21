// Decorating the album: cover color and stickers (ready-made or made from
// your own photo). With the book closed, stickers go on the cover; with the
// book open, on its pages (and can be dragged across to the facing page). While the panel is open the book stays
// closed and stickers on the cover can be moved, turned, resized and removed.
import { icon } from './icons.js';
import { esc } from './util.js';
import { PRESETS, stickerSrc, makeSticker } from './stickers.js';
import { uid } from './db.js';

export const COVER_COLORS = [
  ['#2a9be6', 'Аква'], ['#6b1d24', 'Бордо'], ['#8e2a2a', 'Вишня'], ['#a4502f', 'Терракота'], ['#b0832a', 'Горчица'],
  ['#5d6232', 'Оливка'], ['#1f4a3c', 'Изумруд'], ['#1f2d4a', 'Тёмно-синий'], ['#7c9cbf', 'Небо'],
  ['#d8b4b0', 'Пудра'], ['#e8e1d3', 'Сливки'], ['#2c2d31', 'Графит'], ['#151517', 'Чёрный'],
];

export const DEFAULT_LOOK = {
  id: 'book',
  color: '#2a9be6',
  stickers: [],
  library: [],
};

export function createDecor(host, { look, save, book, toast, confirm }) {
  let el = null, tab = 'cover', selected = null;

  const swatches = (list, current, name) => list.map(([c, label]) => `
    <button class="swatch ${c === current ? 'is-active' : ''}" data-${name}="${c}" style="--c:${c}" aria-label="${label}" aria-pressed="${c === current}" title="${label}"></button>`).join('');

  function body() {
    const L = look();
    if (tab === 'cover') {
      const custom = !COVER_COLORS.some(([c]) => c === L.color);
      return `
        <p class="hint">Оттенок стеклянной обложки.</p>
        <div class="swatches">${swatches(COVER_COLORS, L.color, 'color')}
          <label class="swatch swatch-any ${custom ? 'is-active' : ''}" style="--c:${custom ? L.color : '#ffffff'}" title="Любой цвет">
            ${icon('palette', 18)}<input type="color" value="${L.color}" aria-label="Любой цвет обложки"></label>
        </div>`;
    }
    if (tab === 'stickers') {
      return `
        <p class="hint">${book.open
          ? 'Нажмите на наклейку — она ляжет на открытую страницу. Её можно двигать, перетащить на соседнюю страницу, а за уголок — поворачивать и менять размер.'
          : 'Нажмите на наклейку — она появится на обложке. Её можно двигать, а за уголок — поворачивать и менять размер. Чтобы украсить страницы, откройте альбом и нажмите «Оформить».'}</p>
        <div class="stk-grid">${PRESETS.map(p => `<button class="stk-pick" data-add="p:${p.id}" aria-label="Наклеить: ${p.name}" title="${p.name}"><img src="${stickerSrc('p:' + p.id)}" alt=""></button>`).join('')}</div>
        <div class="decor-sub"><span>Свои наклейки</span></div>
        <div class="stk-grid">
          ${L.library.map(l => `<span class="stk-own"><button class="stk-pick" data-add="lib:${l.id}" aria-label="Наклеить свою наклейку"><img src="${l.src}" alt=""></button>
            <button class="own-x" data-unlib="${l.id}" aria-label="Удалить свою наклейку" title="Удалить">${icon('close', 12)}</button></span>`).join('')}
          <button class="stk-pick stk-make" data-make>${icon('upload', 20)}<span>Из фото</span></button>
        </div>
        <input type="file" accept="image/*" hidden>
        <p class="hint">Фон вырезается прямо в браузере, а вокруг появляется белая обводка. В первый раз загружается модель (около 50 МБ).</p>`;
    }
    return '';
  }

  function render() {
    el.querySelectorAll('[role=tab]').forEach(t => { const on = t.dataset.tab === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    const panel = el.querySelector('.decor-body');
    panel.innerHTML = body();
  }

  const commit = () => { book.applyLook(); select(selected); save(); };

  function addSticker(src) {
    const L = look();
    const page = book.target();
    const s = { id: uid(), src, x: 0.3 + Math.random() * 0.4, y: page == null ? 0.62 + Math.random() * 0.2 : 0.2 + Math.random() * 0.6, size: page == null ? 0.26 : 0.22, rot: Math.round(Math.random() * 16 - 8) };
    if (page != null) s.page = page;
    L.stickers.push(s);
    selected = s.id;
    commit();
  }

  function select(id) {
    selected = id;
    book.el().querySelectorAll('.stk').forEach(n => n.classList.toggle('is-sel', n.dataset.id === id));
  }

  async function make(file) {
    const tile = el.querySelector('[data-make]');
    tile.disabled = true;
    tile.classList.add('is-busy');
    const label = tile.querySelector('span');
    label.textContent = 'Вырезаем фон…';
    try {
      const src = await makeSticker(file, p => { label.textContent = `Загрузка ${Math.round(p * 100)}%`; });
      const item = { id: uid(), src };
      look().library.push(item);
      render();
      addSticker('lib:' + item.id);
      toast('Наклейка готова');
    } catch (e) {
      console.error(e);
      toast('Не получилось вырезать фон. Попробуйте другое фото.');
      render();
    }
  }

  function onClick(ev) {
    const t = ev.target.closest('[data-tab]');
    if (t && t.getAttribute('role') === 'tab') { tab = t.dataset.tab; render(); return; }
    const L = look();
    const b = ev.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.decor === 'done') close();
    else if (d.color) { L.color = d.color; render(); commit(); }
    else if (d.add) addSticker(d.add);
    else if ('make' in d) el.querySelector('input[type=file]').click();
    else if (d.unlib) removeOwn(d.unlib);
  }

  async function removeOwn(id) {
    const L = look();
    const used = L.stickers.filter(s => s.src === 'lib:' + id).length;
    if (used && !await confirm({ title: 'Удалить свою наклейку?', text: 'Она исчезнет и с обложки.', ok: 'Удалить', danger: true })) return;
    L.library = L.library.filter(l => l.id !== id);
    L.stickers = L.stickers.filter(s => s.src !== 'lib:' + id);
    render(); commit();
  }

  // ---------- moving stickers on the cover or the pages ----------
  let drag = null;
  function onDown(ev) {
    const n = ev.target.closest('.stk');
    if (!n) { select(null); return; }
    if (ev.target.closest('[data-stk="del"]')) return;
    ev.preventDefault();
    const s = look().stickers.find(x => x.id === n.dataset.id);
    if (!s) return;
    select(s.id);
    n.focus({ preventScroll: true });
    const r = n.closest('.stk-layer').getBoundingClientRect();
    if (ev.target.closest('[data-stk="rot"]')) {
      const c = n.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      drag = { mode: 'rot', n, s, r, cx, cy, d0: Math.hypot(ev.clientX - cx, ev.clientY - cy), a0: Math.atan2(ev.clientY - cy, ev.clientX - cx), size0: s.size, rot0: s.rot };
    } else {
      drag = { mode: 'move', n, s, r, ox: ev.clientX - (r.left + s.x * r.width), oy: ev.clientY - (r.top + s.y * r.height) };
    }
    n.setPointerCapture(ev.pointerId);
    n.classList.add('is-drag');
  }
  function onMove(ev) {
    if (!drag) return;
    const { s, n, r } = drag;
    if (drag.mode === 'move') {
      // on an open spread a sticker may go over to the facing page
      const reach = s.page != null && book.spread().two ? 1.6 : 1;
      s.x = Math.max(1 - reach, Math.min(reach, (ev.clientX - drag.ox - r.left) / r.width));
      s.y = Math.max(0, Math.min(1, (ev.clientY - drag.oy - r.top) / r.height));
      n.style.left = s.x * 100 + '%'; n.style.top = s.y * 100 + '%';
    } else {
      const d = Math.hypot(ev.clientX - drag.cx, ev.clientY - drag.cy);
      const a = Math.atan2(ev.clientY - drag.cy, ev.clientX - drag.cx);
      s.size = Math.max(0.08, Math.min(0.9, drag.size0 * d / Math.max(8, drag.d0)));
      s.rot = Math.round(drag.rot0 + (a - drag.a0) * 180 / Math.PI);
      n.style.width = s.size * 100 + '%'; n.style.setProperty('--r', s.rot + 'deg');
    }
  }
  function onUp() {
    if (!drag) return;
    const { s } = drag;
    drag.n.classList.remove('is-drag');
    drag = null;
    if (s.page != null) {
      const { page } = book.spread();
      // the left page of the first spread is the cover's inside: stickers stay on the page
      if (s.x < 0 && s.page === page + 1 && page >= 0) { s.page = page; s.x += 1; }
      else if (s.x > 1 && s.page === page) { s.page = page + 1; s.x -= 1; }
      s.x = Math.max(0, Math.min(1, s.x));
      commit();
    } else save();
  }
  function onLayerClick(ev) {
    const del = ev.target.closest('[data-stk="del"]');
    if (!del) return;
    const id = del.closest('.stk').dataset.id;
    look().stickers = look().stickers.filter(s => s.id !== id);
    selected = null;
    commit();
  }
  function onKey(ev) {
    const n = ev.target.closest?.('.stk');
    if (!n) return;
    const s = look().stickers.find(x => x.id === n.dataset.id);
    if (!s) return;
    const k = ev.key, st = ev.shiftKey ? 0.05 : 0.01;
    if (k === 'ArrowLeft') s.x = Math.max(0, s.x - st);
    else if (k === 'ArrowRight') s.x = Math.min(1, s.x + st);
    else if (k === 'ArrowUp') s.y = Math.max(0, s.y - st);
    else if (k === 'ArrowDown') s.y = Math.min(1, s.y + st);
    else if (k === '+' || k === '=') s.size = Math.min(0.9, s.size * 1.08);
    else if (k === '-') s.size = Math.max(0.08, s.size / 1.08);
    else if (k === '[') s.rot -= 5;
    else if (k === ']') s.rot += 5;
    else if (k === 'Delete' || k === 'Backspace') { look().stickers = look().stickers.filter(x => x.id !== s.id); selected = null; commit(); return; }
    else return;
    ev.preventDefault();
    commit();
    book.el().querySelector(`.stk[data-id="${s.id}"]`)?.focus({ preventScroll: true });
  }

  function open() {
    if (el) return;
    if (book.open) tab = 'stickers'; // an open album is decorated with stickers
    el = document.createElement('aside');
    el.className = 'decor glass-panel';
    el.setAttribute('aria-label', 'Оформление альбома');
    el.innerHTML = `
      <div class="decor-head">
        <h2 class="modal-title">Оформление</h2>
        <button class="btn primary sm" data-decor="done">Готово</button>
      </div>
      <div class="tabs" role="tablist" aria-label="Что оформить">
        <button role="tab" data-tab="cover">${icon('palette', 16)}Обложка</button>
        <button role="tab" data-tab="stickers">${icon('sticker', 16)}Наклейки</button>
      </div>
      <div class="decor-body" role="tabpanel"></div>`;
    host.appendChild(el);
    document.body.classList.add('is-decorating');
    book.setDecorating(true);
    render();
    el.addEventListener('click', onClick);
    el.addEventListener('input', ev => {
      if (ev.target.type === 'color') { look().color = ev.target.value; ev.target.closest('.swatch').style.setProperty('--c', ev.target.value); book.applyLook(); }
    });
    el.addEventListener('change', ev => {
      if (ev.target.type === 'color') { render(); save(); }
      if (ev.target.type === 'file' && ev.target.files[0]) { make(ev.target.files[0]); ev.target.value = ''; }
    });
    el.querySelector('.tabs').addEventListener('keydown', ev => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const tabs = [...el.querySelectorAll('[role=tab]')];
      const i = tabs.findIndex(t => t.dataset.tab === tab);
      tab = tabs[(i + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].dataset.tab;
      render();
      el.querySelector(`[data-tab="${tab}"]`).focus();
    });
    const cover = book.el();
    cover.addEventListener('pointerdown', onDown);
    cover.addEventListener('pointermove', onMove);
    cover.addEventListener('pointerup', onUp);
    cover.addEventListener('pointercancel', onUp);
    cover.addEventListener('click', onLayerClick);
    cover.addEventListener('keydown', onKey);
    addEventListener('keydown', onEsc, true);
    el.querySelector('[role=tab]').focus();
  }
  const onEsc = ev => {
    if (ev.key !== 'Escape' || document.querySelector('.modal-wrap, .menu')) return;
    if (selected) { select(null); return; }
    close();
  };

  function close() {
    if (!el) return;
    const cover = book.el();
    cover.removeEventListener('pointerdown', onDown);
    cover.removeEventListener('pointermove', onMove);
    cover.removeEventListener('pointerup', onUp);
    cover.removeEventListener('pointercancel', onUp);
    cover.removeEventListener('click', onLayerClick);
    cover.removeEventListener('keydown', onKey);
    removeEventListener('keydown', onEsc, true);
    el.remove(); el = null; selected = null;
    document.body.classList.remove('is-decorating');
    book.setDecorating(false);
    save();
  }

  return { open, close, get isOpen() { return Boolean(el); } };
}
