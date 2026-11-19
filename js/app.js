import { db } from './db.js';
import { createDay, songLabel } from './pipeline.js';
import { seedIfEmpty } from './seed.js';
import { analyzeAudioFile } from './analyze-audio.js';
import { searchTracks, fetchPreview } from './music.js';
import { MemoryRenderer, renderPoster, MOODS, W, H } from './renderer.js';
import { t, lang, setLang, LANGS, daysN, formatDate, loc, posterLangOf } from './i18n.js';
import { makeZip, download } from './zip.js';
import { canRecord, startRecording } from './recorder.js';
import { listCollections, getCollection, saveCollection, removeCollection, collectionsOf, forgetDay } from './collections.js';
import { aiEnabled } from './ai.js';

const root = document.documentElement;
const main = document.getElementById('main');
let cleanup = () => {};
const urls = new Set();
const objURL = b => { const u = URL.createObjectURL(b); urls.add(u); return u; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, r = main) => r.querySelector(sel);
const $$ = (sel, r = main) => [...r.querySelectorAll(sel)];

const svg = (d, sw = 1.4) => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  folder: svg('<path d="M1.75 4.25c0-.83.67-1.5 1.5-1.5h3l1.5 1.5h5c.83 0 1.5.67 1.5 1.5v6c0 .83-.67 1.5-1.5 1.5h-9.5c-.83 0-1.5-.67-1.5-1.5z"/>'),
  play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.2v9.6c0 .4.44.64.77.42l7.2-4.8a.5.5 0 0 0 0-.84l-7.2-4.8A.5.5 0 0 0 5 3.2z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx=".75"/><rect x="9" y="3" width="3" height="10" rx=".75"/></svg>',
  restart: svg('<path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3h3"/>'),
  voice: svg('<path d="M3 6.5v3M5.5 4.5v7M8 2.5v11M10.5 5v6M13 7v2"/>'),
  download: svg('<path d="M8 2.5v8m0 0L5 7.5m3 3l3-3M3 13.5h10"/>'),
  trash: svg('<path d="M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.7 9h6.6l.7-9"/>'),
  image: svg('<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 11l3.5-3.5 3 3 2-2L14 12"/><circle cx="10.5" cy="6" r="1"/>'),
  music: svg('<path d="M6 12V3.5l7-1.5v8.5"/><circle cx="4.25" cy="12" r="1.75"/><circle cx="11.25" cy="10.5" r="1.75"/>'),
  text: svg('<path d="M4 1.75h5.5l2.5 2.5v10H4zM6 8h4M6 10.5h4"/>'),
  upload: svg('<path d="M8 11V2.5m0 0L5 5.5m3-3l3 3M3 13.5h10"/>'),
  x: svg('<path d="M4 4l8 8M12 4l-8 8"/>', 1.6),
  check: svg('<path d="M3.5 8.5l3 3 6-7"/>', 2),
  video: svg('<rect x="1.75" y="4" width="9" height="8" rx="1.5"/><path d="M10.75 7l3.5-2v6l-3.5-2"/>'),
  ext: svg('<path d="M9 2.5h4.5V7M13.5 2.5L7 9M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3"/>'),
  sound: svg('<path d="M2.5 6h2.5l3.5-3v10L5 10H2.5zM11 5.5a3.5 3.5 0 0 1 0 5M12.75 3.5a6 6 0 0 1 0 9"/>'),
  search: svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'),
};

const moodOf = d => MOODS[d.style.regime] || MOODS.ma;
const MOOD_ORDER = ['collage', 'impression', 'ma', 'film', 'construct'];
const SORTS = {
  new: ['sort_new', (a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt],
  light: ['sort_light', (a, b) => b.style.valence - a.style.valence],
  sad: ['sort_sad', (a, b) => a.style.valence - b.style.valence],
  energy: ['sort_energy', (a, b) => b.style.arousal - a.style.arousal],
  calm: ['sort_calm', (a, b) => a.style.arousal - b.style.arousal],
  old: ['sort_old', (a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt - b.createdAt],
};
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const stripTags = s => s.replace(/<[^>]+>/g, '');
const fmtT = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const isMobile = () => innerWidth < 900;

function toast(msg) {
  const el = document.querySelector('.toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(el._h); el._h = setTimeout(() => { el.hidden = true; }, 3200);
}

// ================================================================ language
function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('doc_title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('doc_desc'));
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)));
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.lang === lang)));
}
document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.lang === lang) return;
  setLang(b.dataset.lang);
  applyStatic();
  refreshSidebar();
  router();
}));
applyStatic();

// ================================================================ sidebar
function setSidebar(state) {
  root.dataset.sidebar = state;
  if (!isMobile()) localStorage.setItem('mm-sidebar', state);
  document.querySelectorAll('[data-toggle-sidebar].btn').forEach(b => b.setAttribute('aria-expanded', String(state === 'open')));
}
document.querySelectorAll('[data-toggle-sidebar]').forEach(el => el.addEventListener('click', () => setSidebar(root.dataset.sidebar === 'open' ? 'closed' : 'open')));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isMobile() && root.dataset.sidebar === 'open') setSidebar('closed');
  if ((e.metaKey || e.ctrlKey) && e.key === '\\') { e.preventDefault(); setSidebar(root.dataset.sidebar === 'open' ? 'closed' : 'open'); }
});
if (isMobile()) root.dataset.sidebar = 'closed';

let seeding = null;
function ensureSeed(onProgress) {
  if (!seeding) seeding = seedIfEmpty(false, onProgress).finally(() => { seeding = null; });
  return seeding;
}

async function refreshSidebar(activeId = null) {
  const days = await db.all();
  document.getElementById('side-count').textContent = days.length || '';
  const list = document.getElementById('folders');
  list.innerHTML = days.length
    ? days.map(d => `<li><a href="#/day/${d.id}" ${d.id === activeId ? 'aria-current="page"' : ''}>
        <span class="folders__dot" style="background:${moodOf(d).dot}" title="${moodOf(d).name}"></span>
        <span class="folders__text"><span class="folders__title">${esc(loc(d).title)}</span><span class="folders__date">${formatDate(d.date)}</span></span></a></li>`).join('')
    : `<li class="field__hint" style="padding:0 var(--s-2)">${t('no_days_side')}</li>`;
  const cols = await listCollections();
  const activeFolder = (location.hash.match(/^#\/folder\/([\w-]+)/) || [])[1];
  document.getElementById('collections').innerHTML = cols.map(c => `<li><a href="#/folder/${c.id}" ${c.id === activeFolder ? 'aria-current="page"' : ''}>
      ${I.folder}<span class="folders__title">${esc(c.name)}</span><span class="side-nav__count mono">${c.dayIds.length || ''}</span></a></li>`).join('');
}
document.getElementById('new-folder').addEventListener('click', () => openNewFolder());
document.getElementById('sidebar').addEventListener('click', e => { if (e.target.closest('a') && isMobile()) setSidebar('closed'); });

document.getElementById('reseed').addEventListener('click', async e => {
  const b = e.currentTarget; b.classList.add('is-loading'); b.disabled = true;
  try {
    await seedIfEmpty(true);
    toast(t('demo_restored'));
    router();
  } catch (err) { console.error(err); toast(t('demo_restore_fail')); }
  b.classList.remove('is-loading'); b.disabled = false;
});

function setCrumbs(parts) {
  document.getElementById('crumbs').innerHTML = parts.map((p, i) => i === parts.length - 1
    ? `<span aria-current="page">${esc(p.label)}</span>`
    : `<a href="${p.href}">${esc(p.label)}</a><span class="crumbs__sep">/</span>`).join('');
}

// ================================================================ router
const routes = [
  [/^#\/new$/, renderNew, 'new'],
  [/^#\/day\/([\w-]+)$/, renderDay, 'day'],
  [/^#\/folder\/([\w-]+)$/, renderFolder, 'folder'],
  [/.*/, renderArchive, 'archive'],
];

async function router() {
  cleanup(); cleanup = () => {};
  urls.forEach(u => URL.revokeObjectURL(u)); urls.clear();
  const hash = location.hash || '#/';
  const [re, view, name] = routes.find(([r]) => r.test(hash));
  const m = hash.match(re);
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === name));
  document.querySelectorAll('[data-nav][aria-current]').forEach(a => a.setAttribute('aria-current', 'page'));
  window.scrollTo(0, 0);
  main.innerHTML = '';
  await view(...m.slice(1));
  main.focus({ preventScroll: true });
}
window.addEventListener('hashchange', router);

// ================================================================ archive
async function renderArchive() {
  setCrumbs([{ label: t('all_days') }]);
  const pref = JSON.parse(localStorage.getItem('mm-archive') || '{}');
  let filter = MOODS[pref.filter] || String(pref.filter || '').startsWith('emo:') ? pref.filter : '', sort = SORTS[pref.sort] ? pref.sort : 'new', query = '';
  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <h1 class="title">${t('diary')}</h1>
          <p class="lead">${t('diary_lead')}</p>
        </div>
        <a class="btn btn--primary btn--lg" href="#/new">${svg('<path d="M8 3v10M3 8h10"/>', 1.6)}<span>${t('new_day')}</span></a>
      </div>
      <div class="toolbar">
        <label class="visually-hidden" for="q">${t('search_diary')}</label>
        <input class="input input--search" id="q" type="search" placeholder="${t('search_days')}" autocomplete="off">
        <label class="visually-hidden" for="sort">${t('sort')}</label>
        <select class="select select--sm" id="sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${t(l)}</option>`).join('')}</select>
        <span class="toolbar__count mono" id="count"></span>
      </div>
      <div class="chips toolbar" role="group" aria-label="${t('day_mood')}" id="moods">
        <button class="chip" type="button" data-f="" aria-pressed="${!filter}">${t('all')}</button>
        ${MOOD_ORDER.map(k => `<button class="chip" type="button" data-f="${k}" aria-pressed="${filter === k}"><span class="chip__dot" style="background:${MOODS[k].dot}"></span>${MOODS[k].name}<span class="chip__n" data-n="${k}"></span></button>`).join('')}
      </div>
      <div class="feed" id="feed" aria-live="polite" aria-busy="true">
        ${Array.from({ length: 4 }, () => `<div><div class="skeleton skeleton--poster"></div><div class="skeleton skeleton--line" style="margin-top:12px;width:70%"></div></div>`).join('')}
      </div>
    </div>`;

  const count = $('#count');
  await ensureSeed((i, n) => { if (count) count.textContent = t('seeding', { i, n }); refreshSidebar(); });
  const days = await db.all();
  refreshSidebar();
  if (!main.contains(count)) return; // user navigated away while seeding
  const feed = $('#feed');
  feed.removeAttribute('aria-busy');
  MOOD_ORDER.forEach(k => { const n = days.filter(d => d.style.regime === k).length; $(`[data-n="${k}"]`).textContent = n || ''; });
  // the person's own emotions become filters too
  const ownCount = {};
  days.forEach(d => (d.ownEmotions || []).forEach(e => { ownCount[e] = (ownCount[e] || 0) + 1; }));
  $('#moods').insertAdjacentHTML('beforeend', Object.entries(ownCount).sort((a, b) => b[1] - a[1]).map(([e, n]) =>
    `<button class="chip chip--own" type="button" data-f="emo:${esc(e)}" aria-pressed="${filter === 'emo:' + e}">${esc(e)}<span class="chip__n">${n}</span></button>`).join(''));
  if (filter.startsWith('emo:') && !ownCount[filter.slice(4)]) filter = '';
  const matches = d => !filter || (filter.startsWith('emo:') ? (d.ownEmotions || []).includes(filter.slice(4)) : d.style.regime === filter);

  const draw = () => {
    localStorage.setItem('mm-archive', JSON.stringify({ filter, sort }));
    const q = query.trim().toLowerCase();
    const list = days.filter(d => matches(d) && (!q || loc(d).title.toLowerCase().includes(q) || loc(d).text.toLowerCase().includes(q) || (d.songLabel || '').toLowerCase().includes(q)))
      .sort(SORTS[sort][1]);
    count.textContent = daysN(list.length);
    if (!days.length) {
      feed.innerHTML = `<div class="empty"><p class="h3">${t('diary_empty')}</p><p class="muted">${t('diary_empty_hint')}</p><a class="btn btn--primary" href="#/new">${t('new_day')}</a></div>`;
      return;
    }
    if (!list.length) {
      feed.innerHTML = `<div class="empty"><p class="h3">${t('no_match')}</p><p class="muted">${t('no_match_hint')}</p></div>`;
      return;
    }
    feed.innerHTML = list.map(d => dayCard(d)).join('');
  };
  draw();
  $('#q').addEventListener('input', e => { query = e.target.value; draw(); });
  $('#sort').addEventListener('change', e => { sort = e.target.value; draw(); });
  $$('[data-f]').forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.f;
    $$('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));

  // posters made by the previous renderer are redrawn once
  for (const d of days.filter(x => x.posterV !== 3 || (x.posterLang || 'any') !== posterLangOf(x))) {
    try {
      d.poster = await renderPoster(loc(d)); d.posterV = 3; d.posterLang = posterLangOf(d); await db.put(d);
      const img = main.querySelector(`[data-poster="${d.id}"]`);
      if (img) img.src = objURL(d.poster);
    } catch (e) { console.warn('poster', e); }
  }
}

// ================================================================ shared day card
function dayCard(d0, extra = '') {
  const d = loc(d0);
  const emo = [...(d.analysis?.ai?.emotions || []), ...(d.ownEmotions || [])];
  return `
    <div class="day-card-wrap">
      <a class="day-card fade-in" href="#/day/${d.id}">
        <div class="day-card__poster">
          <img src="${objURL(d.poster)}" alt="${esc(t('memory_of', { t: d.title }))}" loading="lazy" width="720" height="900" data-poster="${d.id}">
        </div>
        <p class="day-card__title">${I.folder}<span>${esc(d.title)}</span></p>
        <div class="day-card__meta">
          <span class="badge"><span class="chip__dot" style="background:${moodOf(d).dot}"></span>${moodOf(d).name}</span>
          <span class="mono">${formatDate(d.date)}</span>
        </div>
        ${emo.length ? `<div class="day-card__meta">${esc(emo.join(' · '))}</div>` : ''}
        ${d.songLabel ? `<div class="day-card__meta day-card__song">${I.music}<span>${esc(d.songLabel)}</span></div>` : ''}
      </a>${extra}
    </div>`;
}

// ================================================================ dialogs
function dialog(html, { onOpen } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = 'modal';
  dlg.innerHTML = html;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
  dlg.showModal();
  onOpen?.(dlg);
  return dlg;
}

// pick days for a collection (checkbox list with covers)
function dayPickerHTML(days, chosen) {
  return days.length ? `<ul class="pick-list">${days.map(d => `
    <li><label class="pick">
      <input type="checkbox" value="${d.id}" ${chosen.includes(d.id) ? 'checked' : ''}>
      <img src="${objURL(d.poster)}" alt="" width="40" height="50">
      <span class="pick__text"><span class="pick__title">${esc(loc(d).title)}</span><span class="pick__sub"><span class="chip__dot" style="background:${moodOf(d).dot}"></span>${moodOf(d).name} · ${formatDate(d.date)}</span></span>
    </label></li>`).join('')}</ul>` : `<p class="field__hint">${t('no_days_diary')}</p>`;
}

async function openNewFolder(preselect = []) {
  const days = (await db.all()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  dialog(`
    <form method="dialog" class="modal__body" id="nf-form">
      <div class="modal__head"><h2 class="h3">${t('new_folder')}</h2><button class="btn btn--invisible btn--icon btn--sm" type="button" data-close aria-label="${t('close')}">${I.x}</button></div>
      <div class="field"><label class="field__label" for="nf-name">${t('name')}</label>
        <input class="input" id="nf-name" maxlength="60" placeholder="${t('folder_name_ph')}" required autocomplete="off">
        <p class="error-text" id="nf-err" hidden>${t('folder_name_err')}</p></div>
      <div class="field"><span class="field__label">${t('days_in_folder')}</span>${dayPickerHTML(days, preselect)}</div>
      <div class="modal__actions"><button class="btn" type="button" data-close>${t('cancel')}</button><button class="btn btn--primary" type="submit">${t('create_folder')}</button></div>
    </form>`, {
    onOpen: dlg => {
      dlg.querySelector('#nf-name').focus();
      dlg.querySelector('#nf-form').addEventListener('submit', async e => {
        e.preventDefault();
        const name = dlg.querySelector('#nf-name').value.trim();
        if (!name) { dlg.querySelector('#nf-err').hidden = false; dlg.querySelector('#nf-name').focus(); return; }
        const dayIds = [...dlg.querySelectorAll('.pick input:checked')].map(i => i.value);
        const c = await saveCollection({ name, dayIds });
        dlg.close();
        toast(t('folder_created'));
        location.hash = `#/folder/${c.id}`;
        refreshSidebar();
      });
    },
  });
}

// add one day to collections (from the day page)
async function openFolderPicker(dayId, done) {
  const cols = await listCollections();
  dialog(`
    <form method="dialog" class="modal__body" id="fp-form">
      <div class="modal__head"><h2 class="h3">${t('add_to_folder')}</h2><button class="btn btn--invisible btn--icon btn--sm" type="button" data-close aria-label="${t('close')}">${I.x}</button></div>
      ${cols.length ? `<ul class="pick-list">${cols.map(c => `<li><label class="pick pick--plain"><input type="checkbox" value="${c.id}" ${c.dayIds.includes(dayId) ? 'checked' : ''}>${I.folder}<span class="pick__title">${esc(c.name)}</span><span class="pick__sub">${daysN(c.dayIds.length)}</span></label></li>`).join('')}</ul>` : `<p class="field__hint">${t('no_folders_yet')}</p>`}
      <div class="field"><label class="field__label" for="fp-new">${t('new_folder')}</label><input class="input" id="fp-new" maxlength="60" placeholder="${t('new_folder_ph')}" autocomplete="off"></div>
      <div class="modal__actions"><button class="btn" type="button" data-close>${t('cancel')}</button><button class="btn btn--primary" type="submit">${t('save')}</button></div>
    </form>`, {
    onOpen: dlg => dlg.querySelector('#fp-form').addEventListener('submit', async e => {
      e.preventDefault();
      const on = new Set([...dlg.querySelectorAll('.pick input:checked')].map(i => i.value));
      for (const c of cols) {
        const has = c.dayIds.includes(dayId);
        if (on.has(c.id) !== has) await saveCollection({ ...c, dayIds: has ? c.dayIds.filter(x => x !== dayId) : [...c.dayIds, dayId] });
      }
      const name = dlg.querySelector('#fp-new').value.trim();
      if (name) await saveCollection({ name, dayIds: [dayId] });
      dlg.close();
      toast(t('folders_updated'));
      done?.();
    }),
  });
}

// ================================================================ collection page
async function renderFolder(id) {
  const c = await getCollection(id);
  refreshSidebar();
  if (!c) {
    setCrumbs([{ label: t('all_days'), href: '#/' }, { label: t('not_found') }]);
    main.innerHTML = `<div class="page"><div class="empty"><p class="h3">${t('no_folder')}</p><a class="btn" href="#/">${t('to_all_days')}</a></div></div>`;
    return;
  }
  setCrumbs([{ label: t('all_days'), href: '#/' }, { label: c.name }]);
  const all = await db.all();
  const days = c.dayIds.map(x => all.find(d => d.id === x)).filter(Boolean).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const moods = {};
  days.forEach(d => { const m = moodOf(d).name; moods[m] = (moods[m] || 0) + 1; });
  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div>
          <p class="label" style="display:flex;align-items:center;gap:var(--s-2)">${I.folder}${t('folder')}</p>
          <h1 class="title" id="f-title">${esc(c.name)}</h1>
          <p class="lead">${days.length ? `${daysN(days.length)}${days.length > 1 ? ` · ${formatDate(days[0].date)} — ${formatDate(days[days.length - 1].date)}` : ''}` : t('folder_empty_short')}${Object.keys(moods).length ? ' · ' + Object.entries(moods).map(([m, n]) => `${m.toLowerCase()} ${n}`).join(', ') : ''}</p>
        </div>
        <div class="actions" style="margin:0">
          <button class="btn btn--primary" type="button" id="f-add">${svg('<path d="M8 3v10M3 8h10"/>', 1.6)}<span>${t('add_days')}</span></button>
          <button class="btn" type="button" id="f-rename">${t('rename')}</button>
          <button class="btn btn--invisible btn--danger" type="button" id="f-del">${I.trash}<span>${t('delete_folder')}</span></button>
        </div>
      </div>
      <div class="confirm" id="f-confirm" hidden style="margin-bottom:var(--s-5)">
        <p>${esc(t('delete_folder_q', { n: c.name }))}</p>
        <div class="confirm__actions"><button class="btn btn--sm btn--danger-solid" id="f-del-yes" type="button">${t('delete')}</button><button class="btn btn--sm" id="f-del-no" type="button">${t('cancel')}</button></div>
      </div>
      <div class="feed" id="f-feed">
        ${days.length ? days.map(d => dayCard(d, `<button class="btn btn--sm btn--invisible day-card__remove" type="button" data-out="${d.id}">${I.x}<span>${t('remove_from_folder')}</span></button>`)).join('')
          : `<div class="empty"><p class="h3">${t('folder_empty')}</p><p class="muted">${t('folder_empty_hint')}</p><button class="btn btn--primary" type="button" data-add>${t('add_days')}</button></div>`}
      </div>
    </div>`;

  const openAdd = async () => {
    const all2 = (await db.all()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    dialog(`
      <form method="dialog" class="modal__body" id="fa-form">
        <div class="modal__head"><h2 class="h3">${esc(t('days_in_named', { n: c.name }))}</h2><button class="btn btn--invisible btn--icon btn--sm" type="button" data-close aria-label="${t('close')}">${I.x}</button></div>
        ${dayPickerHTML(all2, c.dayIds)}
        <div class="modal__actions"><button class="btn" type="button" data-close>${t('cancel')}</button><button class="btn btn--primary" type="submit">${t('save')}</button></div>
      </form>`, {
      onOpen: dlg => dlg.querySelector('#fa-form').addEventListener('submit', async e => {
        e.preventDefault();
        await saveCollection({ ...c, dayIds: [...dlg.querySelectorAll('.pick input:checked')].map(i => i.value) });
        dlg.close(); router();
      }),
    });
  };
  $('#f-add').addEventListener('click', openAdd);
  main.querySelector('[data-add]')?.addEventListener('click', openAdd);
  $('#f-rename').addEventListener('click', () => {
    dialog(`
      <form method="dialog" class="modal__body" id="fr-form">
        <div class="modal__head"><h2 class="h3">${t('rename_folder')}</h2><button class="btn btn--invisible btn--icon btn--sm" type="button" data-close aria-label="${t('close')}">${I.x}</button></div>
        <div class="field"><label class="field__label" for="fr-name">${t('name')}</label><input class="input" id="fr-name" maxlength="60" value="${esc(c.name)}" required autocomplete="off"></div>
        <div class="modal__actions"><button class="btn" type="button" data-close>${t('cancel')}</button><button class="btn btn--primary" type="submit">${t('save')}</button></div>
      </form>`, {
      onOpen: dlg => {
        const inp = dlg.querySelector('#fr-name'); inp.select();
        dlg.querySelector('#fr-form').addEventListener('submit', async e => {
          e.preventDefault();
          if (!inp.value.trim()) return;
          await saveCollection({ ...c, name: inp.value }); dlg.close(); router();
        });
      },
    });
  });
  $('#f-del').addEventListener('click', () => { $('#f-confirm').hidden = false; $('#f-del-no').focus(); });
  $('#f-del-no').addEventListener('click', () => { $('#f-confirm').hidden = true; });
  $('#f-del-yes').addEventListener('click', async () => { await removeCollection(c.id); toast(t('folder_deleted')); location.hash = '#/'; refreshSidebar(); });
  $('#f-feed').addEventListener('click', async e => {
    const b = e.target.closest('[data-out]'); if (!b) return;
    await saveCollection({ ...c, dayIds: c.dayIds.filter(x => x !== b.dataset.out) });
    toast(t('day_removed_from_folder')); router();
  });
}


// ================================================================ new entry
async function renderNew() {
  setCrumbs([{ label: t('all_days'), href: '#/' }, { label: t('new_day') }]);
  refreshSidebar();
  const state = { photos: [], songMode: 'search', track: null, file: null, fileAnalysis: null };
  const preview = new Audio();
  preview.preload = 'none';
  let previewId = null;

  main.innerHTML = `
    <div class="page">
      <div class="page-head"><div>
        <h1 class="title">${t('how_was')}</h1>
        <p class="lead">${t('how_was_lead')}</p>
      </div></div>
      <div class="compose">
        <form id="form" class="card" novalidate>
          <section class="step">
            <div class="step__head"><span class="step__num">01</span><label class="h3" for="text">${t('entry')}</label></div>
            <textarea class="textarea" id="text" placeholder="${t('entry_ph')}" required></textarea>
            <div style="display:flex;justify-content:space-between;gap:var(--s-3)"><span class="field__hint">${t('entry_hint')}</span><span class="field__hint mono" id="chars">0</span></div>
            <p class="error-text" data-err="text" hidden>${t('entry_err')}</p>
          </section>

          <section class="step">
            <div class="step__head"><span class="step__num">02</span><span class="h3" id="photos-label">${t('photos')}</span><span class="step__opt">${t('up_to_8')}</span></div>
            <label class="dropzone" id="drop" tabindex="0" aria-labelledby="photos-label">
              ${I.upload}
              <span><b style="font-weight:500">${t('choose_photos')}</b> ${t('or_drop')}</span>
              <span class="field__hint">JPG, PNG, WebP</span>
              <input type="file" id="photos" accept="image/*" multiple class="visually-hidden">
            </label>
            <div class="thumbs" id="thumbs"></div>
            <p class="error-text" data-err="photos" hidden>${t('photos_err')}</p>
          </section>

          <section class="step">
            <div class="step__head"><span class="step__num">03</span><span class="h3">${t('song')}</span>
              <div class="segmented" role="radiogroup" aria-label="${t('song_source')}" style="margin-left:auto">
                <button type="button" role="radio" aria-checked="true" data-mode="search">${t('find')}</button>
                <button type="button" role="radio" aria-checked="false" data-mode="file">${t('own_file')}</button>
              </div>
            </div>
            <div data-pane="search" class="field">
              <div id="picked"></div>
              <div id="finder" class="field">
                <label class="visually-hidden" for="song-q">${t('song_search')}</label>
                <input class="input input--search" id="song-q" type="search" placeholder="${t('song_ph')}" autocomplete="off">
                <ul class="tracks" id="tracks" aria-live="polite"></ul>
                <span class="field__hint">${t('song_hint')}</span>
              </div>
            </div>
            <div data-pane="file" class="field" hidden>
              <label class="dropzone" for="audio" style="padding:var(--s-5)">
                ${I.music}
                <span id="audio-name"><b style="font-weight:500">${t('choose_audio')}</b></span>
                <span class="field__hint">MP3, M4A, WAV</span>
              </label>
              <input type="file" id="audio" accept="audio/*" class="visually-hidden">
              <div id="audio-result" class="song-meta"></div>
            </div>
            <p class="error-text" data-err="song" hidden>${t('song_err')}</p>
          </section>

          <section class="step">
            <div class="step__head"><span class="step__num">04</span><span class="h3">${t('details')}</span><span class="step__opt">${t('optional')}</span></div>
            <div class="field">
              <label class="field__label" for="own-emo">${t('own_emotions')}</label>
              <input class="input" id="own-emo" placeholder="${t('own_emotions_ph')}" autocomplete="off">
              <span class="field__hint">${t('own_emotions_hint')}</span>
            </div>
            <div class="grid-3">
              <div class="field"><label class="field__label" for="date">${t('date')}</label><input class="input" id="date" type="date" value="${todayISO()}" max="${todayISO()}"></div>
              <div class="field"><label class="field__label" for="tod">${t('time_of_day')}</label>
                <select class="select" id="tod"><option value="">${t('from_entry')}</option><option value="morning">${t('morning')}</option><option value="day">${t('daytime')}</option><option value="evening">${t('evening')}</option><option value="night">${t('night')}</option></select></div>
              <div class="field"><label class="field__label" for="weather">${t('weather')}</label>
                <select class="select" id="weather"><option value="">${t('from_entry')}</option><option value="sun">${t('w_sun')}</option><option value="rain">${t('w_rain')}</option><option value="snow">${t('w_snow')}</option><option value="fog">${t('w_fog')}</option><option value="wind">${t('w_wind')}</option></select></div>
            </div>
          </section>

          <div class="form-progress" id="live" aria-live="polite" hidden></div>
          <div class="form-actions">
            <button class="btn btn--primary btn--lg" type="submit" id="submit"><span class="spinner" aria-hidden="true"></span><span>${t('build')}</span></button>
            <a class="btn btn--lg" href="#/">${t('cancel')}</a>
          </div>
        </form>

      </div>
    </div>`;

  const text = $('#text');
  const updateSignals = () => { $('#chars').textContent = text.value.length; };
  text.addEventListener('input', () => { updateSignals(); if (text.value.trim().length >= 10) $('[data-err="text"]').hidden = true; });

  // ---- photos
  const thumbs = $('#thumbs');
  const drawThumbs = () => {
    thumbs.innerHTML = state.photos.map((p, i) => `<div class="thumb"><img src="${p.url}" alt="${t('photo_n', { n: i + 1 })}"><button class="btn btn--icon btn--sm" type="button" data-rm="${i}" aria-label="${t('remove_photo_n', { n: i + 1 })}">${I.x}</button></div>`).join('');
  };
  thumbs.addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    state.photos.splice(+b.dataset.rm, 1); drawThumbs(); updateSignals();
  });
  const addPhotos = files => {
    const ok = [...files].filter(f => f.type.startsWith('image/'));
    if (!ok.length && files.length) toast(t('not_photo'));
    ok.slice(0, 8 - state.photos.length).forEach(f => state.photos.push({ file: f, url: objURL(f) }));
    if (state.photos.length >= 8 && ok.length) toast(t('max_8'));
    drawThumbs(); updateSignals();
    if (state.photos.length) $('[data-err="photos"]').hidden = true;
  };
  $('#photos').addEventListener('change', e => { addPhotos(e.target.files); e.target.value = ''; });
  const drop = $('#drop');
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#photos').click(); } });
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => addPhotos(e.dataTransfer.files));

  // ---- song: mode
  $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
    state.songMode = b.dataset.mode;
    $$('[data-mode]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== state.songMode; });
    stopPreview(); updateSignals();
  }));

  // ---- song: search + preview
  let results = [];
  const playIcon = id => (previewId === id && !preview.paused ? I.pause : I.play);
  const trackRow = (tr, selected = false) => `
    <li class="track${selected ? ' track--selected' : ''}" data-id="${tr.id}">
      <span class="track__art"><img src="${esc(tr.thumb)}" alt="" loading="lazy"></span>
      <span class="track__body"><span class="track__title">${esc(tr.title)}</span><span class="track__sub">${esc(tr.artist)}${tr.year ? ' · ' + tr.year : ''}${tr.genreName ? ' · ' + esc(tr.genreName) : ''}</span></span>
      <span class="track__actions">
        <button class="btn btn--icon btn--sm" type="button" data-preview="${tr.id}" aria-label="${esc(t('listen_preview', { t: tr.title }))}">${playIcon(tr.id)}</button>
        ${selected ? `<button class="btn btn--sm" type="button" data-change>${t('change')}</button>` : `<button class="btn btn--sm" type="button" data-pick="${tr.id}">${t('choose')}</button>`}
      </span>
    </li>`;
  const drawResults = (html) => { $('#tracks').innerHTML = html ?? results.map(x => trackRow(x)).join(''); };
  const drawPicked = () => {
    $('#picked').innerHTML = state.track ? `<ul class="tracks" style="border:0">${trackRow(state.track, true)}</ul>` : '';
    $('#finder').hidden = !!state.track;
  };
  const refreshIcons = () => $$('[data-preview]').forEach(b => { b.innerHTML = playIcon(+b.dataset.preview); });
  function stopPreview() { preview.pause(); previewId = null; refreshIcons(); }
  preview.addEventListener('ended', stopPreview);
  preview.addEventListener('pause', refreshIcons);
  preview.addEventListener('play', refreshIcons);

  let qTimer;
  $('#song-q').addEventListener('input', e => {
    clearTimeout(qTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { results = []; drawResults(''); return; }
    drawResults(`<li class="tracks__state"><span class="spinner" aria-hidden="true"></span>${esc(t('searching', { q }))}</li>`);
    qTimer = setTimeout(async () => {
      try {
        results = await searchTracks(q);
        drawResults(results.length ? undefined : `<li class="tracks__state">${t('nothing_found')}</li>`);
      } catch (err) {
        if (err.name === 'AbortError') return;
        drawResults(`<li class="tracks__state">${t('search_down')}</li>`);
      }
    }, 320);
  });
  $('[data-pane="search"]').addEventListener('click', e => {
    const pv = e.target.closest('[data-preview]');
    if (pv) {
      const id = +pv.dataset.preview;
      const tk = state.track?.id === id ? state.track : results.find(r => r.id === id);
      if (previewId === id && !preview.paused) { preview.pause(); return; }
      previewId = id; preview.src = tk.preview; preview.volume = 0.8;
      preview.play().catch(() => toast(t('preview_fail')));
      refreshIcons();
      return;
    }
    const pk = e.target.closest('[data-pick]');
    if (pk) {
      state.track = results.find(r => r.id === +pk.dataset.pick);
      $('[data-err="song"]').hidden = true;
      drawPicked(); updateSignals();
      return;
    }
    if (e.target.closest('[data-change]')) {
      state.track = null; stopPreview(); drawPicked(); updateSignals();
      $('#song-q').focus();
    }
  });

  // ---- song: own file
  $('#audio').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    state.file = f; state.fileAnalysis = null;
    $('#audio-name').innerHTML = `<b style="font-weight:500">${esc(f.name)}</b>`;
    const box = $('#audio-result');
    box.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${t('listening')}</span>`;
    $('[data-err="song"]').hidden = true;
    try {
      const a = await analyzeAudioFile(f);
      state.fileAnalysis = a;
      box.innerHTML = `${I.check}<span>${a.bpm} BPM · ${a.key} ${t(a.mode)} · ${t('energy')} ${Math.round(a.energy * 100)}%</span>`;
    } catch {
      state.file = null;
      box.innerHTML = `<span class="error-text">${t('file_err')}</span>`;
    }
    updateSignals();
  });

  // ---- submit
  $('#form').addEventListener('submit', async e => {
    e.preventDefault();
    const errs = {
      text: text.value.trim().length < 10,
      photos: !state.photos.length,
      song: state.songMode === 'search' ? !state.track : !state.file,
    };
    Object.entries(errs).forEach(([k, v]) => { $(`[data-err="${k}"]`).hidden = !v; });
    const first = Object.keys(errs).find(k => errs[k]);
    if (first) { $(`[data-err="${first}"]`).closest('.step').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    stopPreview();

    const btn = $('#submit');
    btn.classList.add('is-loading'); btn.disabled = true;
    const steps = [
      ['song', t('st_song')], ...(aiEnabled() ? [['ai', t('st_ai')]] : []), ['text', t('st_text')], ['photos', t('st_photos')],
      ['music', t('st_music')], ['style', t('st_style')], ['render', t('st_render')], ['save', t('st_save')],
    ];
    $('#live').hidden = false;
    $('#live').innerHTML = `<p class="label">${t('building')}</p><ul class="progress">${steps.map(([k, l]) => `<li data-s="${k}"><span class="progress__mark"></span>${l}</li>`).join('')}</ul>`;
    $('#live').scrollIntoView({ behavior: 'smooth', block: 'center' });
    const mark = k => {
      let passed = true;
      steps.forEach(([s]) => {
        const li = $(`[data-s="${s}"]`);
        if (!li) return;
        if (s === k) { li.className = 'is-active'; passed = false; }
        else if (passed) { li.className = 'is-done'; li.querySelector('.progress__mark').innerHTML = I.check; }
      });
    };
    try {
      mark('song');
      let song;
      if (state.songMode === 'search') {
        const tk = state.track;
        const file = await fetchPreview(tk);
        song = { kind: 'track', track: tk, file, fileName: `${tk.artist} - ${tk.title}.m4a`, meta: { artist: tk.artist, title: tk.title, genre: tk.genre, year: tk.year } };
      } else {
        song = { kind: 'file', file: state.file, fileName: state.file.name, meta: { title: state.file.name.replace(/\.[^.]+$/, '') } };
      }
      const day = await createDay({
        text: text.value.trim(), date: $('#date').value || todayISO(),
        photos: state.photos.map(p => p.file), song,
        extras: { timeOfDay: $('#tod').value, weather: $('#weather').value },
        ownEmotions: [...new Set($('#own-emo').value.split(',').map(x => x.trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean).map(x => x.slice(0, 24)))],
      }, mark);
      location.hash = `#/day/${day.id}`;
    } catch (err) {
      console.error(err);
      btn.classList.remove('is-loading'); btn.disabled = false;
      $('#live').innerHTML = `<p class="label">${t('went_wrong')}</p><p class="error-text">${esc(t('build_fail', { e: err.message || t('unknown_error') }))}</p>`;
    }
  });

  cleanup = () => { preview.pause(); preview.src = ''; };
}

// ================================================================ day page
async function renderDay(id) {
  setCrumbs([{ label: t('all_days'), href: '#/' }, { label: '…' }]);
  main.innerHTML = `<div class="page"><div class="day"><div class="stage skeleton"></div><div class="day__side"><div class="skeleton skeleton--line" style="width:40%"></div><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:240px"></div></div></div></div>`;
  const raw = await db.get(id);
  const day = raw && loc(raw);
  refreshSidebar(id);
  if (!day) {
    setCrumbs([{ label: t('all_days'), href: '#/' }, { label: t('not_found') }]);
    main.innerHTML = `<div class="page"><div class="empty"><p class="h3">${t('no_day')}</p><a class="btn" href="#/">${t('to_all_days')}</a></div></div>`;
    return;
  }
  setCrumbs([{ label: t('all_days'), href: '#/' }, { label: day.title }]);
  const s = day.style;
  const hasAudio = !!day.song?.file;
  const track = day.song?.track;
  const songName = songLabel(day.song) || t('song_of_day');
  const music = day.analysis.music;

  main.innerHTML = `
    <div class="page">
      <div class="day">
        <div>
          <div class="stage">
            <canvas id="cv" width="${W}" height="${H}" role="img" aria-label="${esc(t('animated_memory', { t: day.title }))}"></canvas>
            <div class="stage__loading" id="loading"><span class="spinner" aria-hidden="true"></span></div>
            <div class="stage__controls">
              <button class="btn btn--glass btn--icon" id="play" type="button" aria-label="${t('pause')}">${I.pause}</button>
              <button class="btn btn--glass btn--icon" id="restart" type="button" aria-label="${t('restart')}">${I.restart}</button>
              <span class="btn btn--glass stage__time" id="time">0:00</span>
            </div>
            <button class="btn btn--glass btn--lg stage__unmute" id="unmute" type="button" hidden>${I.sound}<span>${t('turn_on_music')}</span></button>
          </div>
          ${hasAudio || track ? `
          <div class="player">
            ${track?.artwork ? `<img class="player__art" src="${esc(track.artwork)}" alt="${esc(t('cover', { t: songName }))}">` : `<span class="player__art" style="display:grid;place-items:center">${I.music}</span>`}
            <div class="player__body">
              <span class="player__title">${esc(day.song.meta?.title || songName)}</span>
              <span class="player__sub">${esc(day.song.meta?.artist || '')}${music ? ` · ${music.bpm} BPM · ${music.key ? music.key + ' ' : ''}${t(music.mode === 'major' ? 'major' : 'minor')}` : ''}</span>
              ${hasAudio ? `<span class="player__bar" id="bar" role="progressbar" aria-label="${t('song_progress')}" aria-valuemin="0" aria-valuemax="100"><i></i></span>` : ''}
            </div>
            ${hasAudio ? `<button class="btn btn--icon" id="mute" type="button" aria-label="${t('mute')}">${I.sound}</button>` : ''}
            ${track?.url ? `<a class="btn btn--icon" href="${esc(track.url)}" target="_blank" rel="noopener" aria-label="${t('open_apple')}">${I.ext}</a>` : ''}
          </div>` : ''}
          <div class="actions">
            <button class="btn" id="zip" type="button"><span class="spinner" aria-hidden="true"></span>${I.download}<span>${t('zip')}</span></button>
            <button class="btn" id="vid" type="button"><span class="spinner" aria-hidden="true"></span>${I.video}<span>${t('video')}</span></button>
            <button class="btn" id="png" type="button"><span class="spinner" aria-hidden="true"></span>${I.image}<span>${t('png')}</span></button>
          </div>
        </div>

        <div class="day__side">
          <div>
            <h1 class="title">${esc(day.title)}</h1>
            <div class="day__meta">
              <span class="mono">№ ${String(day.number).padStart(3, '0')} · ${formatDate(day.date)}</span>
              <span class="badge"><span class="chip__dot" style="background:${moodOf(day).dot}"></span>${moodOf(day).name}</span>
              ${day.demo ? `<span class="badge">${t('demo')}</span>` : ''}
            </div>
            <div class="emotions" id="emotions"></div>
            <div class="day__folders" id="day-folders"></div>
          </div>

          <section class="voice-box">
            <div class="voice-box__head">
              <p class="section-label" style="margin:0">${t('my_voice')}</p>
              <span class="field__hint">${t('my_voice_hint')}</span>
            </div>
            <div class="voice-box__row" id="mine-row"></div>
          </section>

          <section>
            <p class="section-label">${t('entry')}</p>
            <p class="entry-text" id="entry"></p>
            <div class="photo-strip">${day.photos.map((p, i) => `<img src="${objURL(p)}" alt="${t('day_photo_n', { n: i + 1 })}" loading="lazy">`).join('')}</div>
          </section>

          <section>
            <p class="section-label">${t('day_folder')}</p>
            <ul class="files">
              <li>${I.text}entry.txt<span class="muted">${t('f_entry')}</span></li>
              ${day.photos.map((p, i) => `<li>${I.image}photos/photo-${i + 1}.jpg<span class="muted">${Math.round(p.size / 1024)} ${t('kb')}</span></li>`).join('')}
              <li>${I.music}song/${hasAudio ? esc(day.song.fileName || 'song.m4a') : 'song.json'}<span class="muted">${t(hasAudio ? 'f_sound' : 'f_desc')}</span></li>
              <li>${I.image}memory/memory.png<span class="muted">${t('f_memory')}</span></li>
              ${day.myVoice ? `<li>${I.voice}voice/my-voice.${day.myVoice.type.includes('mp4') ? 'm4a' : 'webm'}<span class="muted">${t('f_voice')}</span></li>` : ''}
            </ul>
          </section>

          <div>
            <button class="btn btn--sm btn--invisible btn--danger" id="del" type="button" aria-expanded="false" aria-controls="del-confirm">${I.trash}<span>${t('delete_day')}</span></button>
            <div class="confirm" id="del-confirm" role="alertdialog" aria-labelledby="del-q" hidden>
              <p id="del-q">${esc(t('delete_day_q', { t: day.title }))}</p>
              <div class="confirm__actions">
                <button class="btn btn--sm btn--danger-solid" id="del-yes" type="button"><span class="spinner" aria-hidden="true"></span><span>${t('delete')}</span></button>
                <button class="btn btn--sm" id="del-no" type="button">${t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  $('#entry').textContent = day.text;

  // ---- player: the memory and the song share one clock
  const cv = $('#cv');
  const r = new MemoryRenderer(cv, day);
  await r.prepare();
  $('#loading')?.remove();

  let audio = null;
  if (hasAudio) { audio = new Audio(objURL(day.song.file)); audio.loop = true; audio.preload = 'auto'; }
  let playing = false, raf = 0, startAt = performance.now(), offset = 0;
  const audioOn = () => audio && !audio.paused;
  const now = () => (audioOn() ? audio.currentTime : offset + (playing ? (performance.now() - startAt) / 1000 : 0));
  const len = audio && Number.isFinite(audio.duration) ? audio.duration : r.duration;
  let last = 0;
  const frame = ts => {
    raf = requestAnimationFrame(frame);
    if (ts - last < 1000 / 30) return;
    last = ts;
    const now_ = now();
    r.draw(now_);
    const total = audio && Number.isFinite(audio.duration) ? audio.duration : len;
    $('#time').textContent = `${fmtT(now_ % total)} / ${fmtT(total)}`;
    const bar = $('#bar i'); if (bar && audio?.duration) bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  };
  const setBtn = on => { const b = $('#play'); b.innerHTML = on ? I.pause : I.play; b.setAttribute('aria-label', on ? t('pause') : t('play')); };
  const tryAudio = async () => {
    if (!audio) return true;
    audio.currentTime = offset % (audio.duration || 30);
    try { await audio.play(); $('#unmute').hidden = true; return true; }
    catch { $('#unmute').hidden = false; return false; }
  };
  const setPlaying = async on => {
    if (on === playing) return;
    playing = on;
    setBtn(on);
    if (on) { r.posterMode = false; startAt = performance.now(); await tryAudio(); }
    else { offset = now(); audio?.pause(); }
  };
  r.draw(0.01);
  raf = requestAnimationFrame(frame);
  setPlaying(true); // opening a day plays it with its song

  $('#play').addEventListener('click', () => setPlaying(!playing));
  $('#restart').addEventListener('click', async () => {
    offset = 0; startAt = performance.now();
    if (audio) { audio.currentTime = 0; }
    if (!playing) setPlaying(true); else if (audio && audio.paused) tryAudio();
  });
  $('#unmute').addEventListener('click', async () => {
    offset = now(); startAt = performance.now();
    if (!playing) { setPlaying(true); return; }
    await tryAudio();
  });
  $('#mute')?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    const b = $('#mute');
    b.setAttribute('aria-label', audio.muted ? t('unmute') : t('mute'));
    b.style.opacity = audio.muted ? '.5' : '';
  });
  $('#bar')?.addEventListener('click', e => {
    if (!audio?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    offset = audio.currentTime; startAt = performance.now();
  });

  // ---- own voice: record, listen, re-record; music ducks underneath
  const save = async patch => { const fresh = await db.get(day.id); if (!fresh) return; Object.assign(fresh, patch); Object.assign(day, patch); await db.put(fresh); };
  const vplayer = new Audio();
  let vplaying = false;
  const duck = on => { if (audio) audio.volume = on ? 0.22 : 1; };
  const stopVoicePlayback = () => { vplayer.pause(); vplaying = false; duck(false); drawMine(); };
  vplayer.addEventListener('ended', stopVoicePlayback);
  let micRec = null, recTimer = 0;
  const dot = svg('<circle cx="8" cy="8" r="4" fill="currentColor"/>');
  function drawMine() {
    const row = $('#mine-row'); if (!row) return;
    if (micRec) {
      row.innerHTML = `<button class="btn btn--danger-solid" id="rec-stop" type="button">${svg('<rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor"/>')}<span>${t('rec_done')} <span id="rec-t">0:00</span></span></button><span class="rec-dot" aria-hidden="true"></span><span class="field__hint">Идёт запись</span>`;
      return;
    }
    if (day.myVoice) {
      row.innerHTML = `<button class="btn btn--primary" id="mine-play" type="button">${vplaying ? I.pause : I.play}<span>${vplaying ? t('stop') : t('listen')}</span></button>
        <button class="btn" id="rec-start" type="button">${dot}<span>${t('rerecord')}</span></button>
        <button class="btn btn--invisible btn--danger btn--icon" id="mine-del" type="button" aria-label="${t('delete_my_rec')}">${I.trash}</button>`;
      return;
    }
    row.innerHTML = canRecord()
      ? `<button class="btn btn--primary" id="rec-start" type="button">${dot}<span>${t('record_voice')}</span></button>`
      : `<span class="field__hint">${t('no_rec')}</span>`;
  }
  $('#mine-row').addEventListener('click', async e => {
    if (e.target.closest('#rec-start')) {
      stopVoicePlayback();
      try {
        micRec = await startRecording();
        duck(true); drawMine();
        recTimer = setInterval(() => { const tEl = $('#rec-t'); if (tEl) tEl.textContent = fmtT(micRec.elapsed()); if (micRec.elapsed() > 180) $('#rec-stop')?.click(); }, 250);
      } catch (err) { console.error(err); micRec = null; toast(t('no_mic')); drawMine(); }
    } else if (e.target.closest('#rec-stop')) {
      clearInterval(recTimer);
      const blob = await micRec.stop(); micRec = null; duck(false);
      if (blob.size > 1000) { await save({ myVoice: blob }); toast(t('voice_saved')); }
      drawMine();
    } else if (e.target.closest('#mine-play')) {
      if (vplaying) { stopVoicePlayback(); return; }
      vplayer.src = objURL(day.myVoice); vplaying = true; duck(true);
      if (!playing) setPlaying(true);
      vplayer.play().catch(() => { stopVoicePlayback(); toast(t('rec_play_fail')); });
      drawMine();
    } else if (e.target.closest('#mine-del')) {
      stopVoicePlayback(); await save({ myVoice: null }); drawMine();
    }
  });
  drawMine();

  // ---- emotions: AI ones + the person's own words
  const drawEmotions = () => {
    const ai = day.analysis?.ai?.emotions || [];
    const own = day.ownEmotions || [];
    $('#emotions').innerHTML =
      ai.map(e => `<span class="emotion">${esc(e)}</span>`).join('') +
      own.map((e, i) => `<span class="emotion emotion--own">${esc(e)}<button type="button" data-rm-emo="${i}" aria-label="${esc(t('remove_emo', { e }))}">${I.x}</button></span>`).join('') +
      `<form class="emotion-add" id="emo-form"><label class="visually-hidden" for="emo-in">${t('own_emo')}</label><input id="emo-in" maxlength="24" placeholder="${t('own_emo_ph')}" autocomplete="off"></form>`;
  };
  drawEmotions();
  $('#emotions').addEventListener('submit', async e => {
    e.preventDefault();
    const v = $('#emo-in').value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!v) return;
    const own = day.ownEmotions || [];
    if (!own.includes(v) && !(day.analysis?.ai?.emotions || []).includes(v)) await save({ ownEmotions: [...own, v] });
    drawEmotions(); $('#emo-in').focus();
  });
  $('#emotions').addEventListener('click', async e => {
    const b = e.target.closest('[data-rm-emo]'); if (!b) return;
    const own = [...(day.ownEmotions || [])]; own.splice(+b.dataset.rmEmo, 1);
    await save({ ownEmotions: own }); drawEmotions();
  });

  // ---- collections this day belongs to
  const drawDayFolders = async () => {
    const mine = await collectionsOf(day.id);
    $('#day-folders').innerHTML = `${mine.map(c => `<a class="badge badge--link" href="#/folder/${c.id}">${I.folder}${esc(c.name)}</a>`).join('')}
      <button class="btn btn--sm btn--invisible" type="button" id="to-folder">${svg('<path d="M8 3v10M3 8h10"/>', 1.6)}<span>${t('to_folder')}</span></button>`;
  };
  await drawDayFolders();
  $('#day-folders').addEventListener('click', e => {
    if (!e.target.closest('#to-folder')) return;
    openFolderPicker(day.id, async () => { await drawDayFolders(); refreshSidebar(day.id); });
  });

  // ---- exports
  const folderName = `${day.date} ${day.title}`.replace(/[\\/:*?"<>|]/g, '');
  const busy = (b, on) => { b.classList.toggle('is-loading', on); b.disabled = on; };
  const memoryPng = async () => {
    const c = document.createElement('canvas');
    const rr = new MemoryRenderer(c, day);
    await rr.prepare();
    rr.posterMode = true;
    rr.draw(s.sceneDur * 0.45);
    return new Promise(res => c.toBlob(res, 'image/png'));
  };
  $('#png').addEventListener('click', async e => {
    const b = e.currentTarget; busy(b, true);
    try { download(await memoryPng(), `${folderName}.png`); toast(t('frame_saved')); } catch (err) { console.error(err); toast(t('frame_fail')); }
    busy(b, false);
  });
  $('#zip').addEventListener('click', async e => {
    const b = e.currentTarget; busy(b, true);
    try {
      const f = folderName + '/';
      const files = [
        { name: f + 'entry.txt', data: `${day.title}\n${formatDate(day.date)}\n\n${day.text}\n` },
        ...day.photos.map((p, i) => ({ name: `${f}photos/photo-${i + 1}.jpg`, data: p })),
        { name: f + 'song/song.json', data: JSON.stringify({ label: songName, track: track || null, meta: day.song.meta, analysis: music }, null, 2) },
        ...(hasAudio ? [{ name: f + 'song/' + (day.song.fileName || 'song.m4a'), data: day.song.file }] : []),
        { name: f + 'memory/memory.png', data: await memoryPng() },
        ...(day.myVoice ? [{ name: f + 'voice/my-voice.' + (day.myVoice.type.includes('mp4') ? 'm4a' : 'webm'), data: day.myVoice }] : []),
        { name: f + 'day.json', data: JSON.stringify({ id: day.id, number: day.number, date: day.date, title: day.title, titleRule: day.titleRule, style: { ...s, why: s.why.map(w => ({ src: w.src, text: stripTags(w.text) })) }, analysis: day.analysis }, null, 2) },
      ];
      download(await makeZip(files), `${folderName}.zip`);
      toast(t('zip_saved'));
    } catch (err) { console.error(err); toast(t('zip_fail')); }
    busy(b, false);
  });

  let audioGraph = null;
  let recording = null;
  $('#vid').addEventListener('click', async e => {
    const b = e.currentTarget;
    if (!('MediaRecorder' in window) || !cv.captureStream) { toast(t('no_video')); return; }
    const mime = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
    const seconds = Math.round(Math.min(30, Math.max(15, audio?.duration || r.duration)));
    busy(b, true);
    const label = b.querySelector('span:last-child');
    const stream = cv.captureStream(30);
    if (audio) {
      if (!audioGraph) {
        const actx = new AudioContext();
        const src = actx.createMediaElementSource(audio);
        const dest = actx.createMediaStreamDestination();
        src.connect(dest); src.connect(actx.destination);
        audioGraph = { actx, dest };
      }
      await audioGraph.actx.resume();
      audioGraph.dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
    }
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
    const chunks = [];
    rec.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
    rec.onstop = () => {
      clearInterval(recording?.tick); recording = null;
      const type = rec.mimeType || 'video/webm';
      if (chunks.length) { download(new Blob(chunks, { type }), `${folderName}.${type.includes('mp4') ? 'mp4' : 'webm'}`); toast(t('video_saved')); }
      busy(b, false); label.textContent = t('video');
    };
    await setPlaying(false); offset = 0; if (audio) audio.currentTime = 0; await setPlaying(true);
    rec.start(500);
    const t0 = performance.now();
    recording = { rec, tick: setInterval(() => {
      const left = Math.ceil(seconds - (performance.now() - t0) / 1000);
      label.textContent = t('recording_s', { n: Math.max(0, left) });
      if (left <= 0 && rec.state === 'recording') rec.stop();
    }, 250) };
  });

  const delBox = $('#del-confirm');
  const showDel = on => { delBox.hidden = !on; $('#del').hidden = on; $('#del').setAttribute('aria-expanded', String(on)); if (on) $('#del-no').focus(); else $('#del').focus(); };
  $('#del').addEventListener('click', () => showDel(true));
  $('#del-no').addEventListener('click', () => showDel(false));
  delBox.addEventListener('keydown', e => { if (e.key === 'Escape') showDel(false); });
  $('#del-yes').addEventListener('click', async e => {
    const b = e.currentTarget; busy(b, true);
    try {
      await db.remove(day.id);
      await forgetDay(day.id);
      toast(t('day_deleted'));
      location.hash = '#/';
    } catch (err) { console.error(err); toast(t('day_del_fail')); busy(b, false); }
  });

  cleanup = () => {
    vplayer.pause(); clearInterval(recTimer); micRec?.cancel();
    cancelAnimationFrame(raf);
    if (recording) { clearInterval(recording.tick); recording.rec.ondataavailable = null; recording.rec.onstop = null; if (recording.rec.state === 'recording') recording.rec.stop(); }
    if (audio) { audio.pause(); audio.src = ''; }
    audioGraph?.actx.close();
  };
}

router();
