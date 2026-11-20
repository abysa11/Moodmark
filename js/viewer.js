// The memory view: the photo appears in the center, then the whole background
// slowly turns into the same photo, enlarged and blurred, while the day's song plays.
import { icon } from './icons.js';
import { moodById } from './moods.js';
import { fitRect, paintBlur, loadImage } from './photo.js';
import { fmtDate, esc } from './util.js';

let current = null;

export function closeViewer() { current?.close(); }

export async function openViewer(entry, urls, actions) {
  current?.close(true);
  const mood = moodById(entry.mood);
  const grade = mood.grade;
  const el = document.createElement('div');
  el.className = 'viewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', entry.title);
  el.style.setProperty('--speed', grade.speed);
  el.style.setProperty('--grain', grade.grain);
  el.innerHTML = `
    <canvas class="v-scene v-scene-a"></canvas>
    <canvas class="v-scene v-scene-b"></canvas>
    <img class="v-photo" alt="">
    <div class="v-grain" aria-hidden="true"></div>
    <div class="v-top">
      <button class="glass-btn icon-btn" data-act="close" aria-label="Закрыть">${icon('close')}</button>
      <div class="v-top-right">
        <button class="glass-btn icon-btn" data-act="menu" aria-label="Действия с записью">${icon('more')}</button>
      </div>
    </div>
    <div class="v-text">
      <p class="v-date">${fmtDate(entry.date, true)} · ${mood.name}</p>
      <h2 class="v-title">${esc(entry.title)}</h2>
      ${entry.caption ? `<p class="v-caption">${esc(entry.caption)}</p>` : ''}
      ${entry.atmosphere ? `<p class="v-atmo">${esc(entry.atmosphere)}</p>` : ''}
      ${entry.text ? `<button class="v-more" data-act="read">Вся запись</button>` : ''}
    </div>
    ${urls.length > 1 ? `
      <button class="glass-btn icon-btn v-nav v-prev" data-act="prev" aria-label="Предыдущее фото">${icon('left')}</button>
      <button class="glass-btn icon-btn v-nav v-next" data-act="next" aria-label="Следующее фото">${icon('right')}</button>
      <div class="v-dots">${urls.map((_, i) => `<span class="${i ? '' : 'is-on'}"></span>`).join('')}</div>` : ''}
    ${entry.track ? `
      <div class="v-track glass">
        <img src="${entry.track.thumb}" alt="" width="40" height="40">
        <div class="v-track-meta"><b>${esc(entry.track.title)}</b><span>${esc(entry.track.artist)}${entry.trackBy === 'ai' ? ' · подобрано Moodmark' : ''}</span></div>
        <button class="glass-btn icon-btn sm" data-act="play" aria-label="Пауза">${icon('pause', 18)}</button>
        <div class="v-progress"><i></i></div>
      </div>` : ''}
    <div class="v-sheet glass" hidden>
      <div class="v-sheet-head"><span>${fmtDate(entry.date, true)}</span><button class="glass-btn icon-btn sm" data-act="read-close" aria-label="Скрыть запись">${icon('close', 18)}</button></div>
      <p>${esc(entry.text || '').replace(/\n/g, '<br>')}</p>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('has-viewer');
  const prevFocus = document.activeElement;

  const photo = el.querySelector('.v-photo');
  const scenes = [el.querySelector('.v-scene-a'), el.querySelector('.v-scene-b')];
  let sceneIdx = 0, photoIdx = 0, rect = null, img = null, alive = true, cycle = null;

  // --- music ---
  const audio = entry.track?.preview ? new Audio(entry.track.preview) : null;
  let fadeTimer = null;
  const fadeTo = (vol, ms, then) => {
    if (!audio) return;
    clearInterval(fadeTimer);
    const start = audio.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = start + (vol - start) * p;
      if (p >= 1) { clearInterval(fadeTimer); then?.(); }
    }, 40);
  };
  const playBtn = el.querySelector('[data-act="play"]');
  const setPlayIcon = playing => {
    if (!playBtn) return;
    playBtn.innerHTML = icon(playing ? 'pause' : 'play', 18);
    playBtn.setAttribute('aria-label', playing ? 'Пауза' : 'Включить музыку');
  };
  if (audio) {
    audio.loop = true;
    audio.volume = 0;
    audio.addEventListener('timeupdate', () => {
      const bar = el.querySelector('.v-progress i');
      if (bar && audio.duration) bar.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
    });
    audio.play().then(() => { fadeTo(0.85, 2500); setPlayIcon(true); }).catch(() => setPlayIcon(false));
  }

  // --- photo + scene ---
  const place = () => {
    rect = fitRect(img.naturalWidth, img.naturalHeight, innerWidth, innerHeight, innerWidth < 720 ? 0.86 : 0.56, innerWidth < 720 ? 0.56 : 0.64);
    // On wide screens lift the photo a little so the words below have room.
    if (innerWidth >= 720) rect.y = Math.max(88, rect.y - Math.round(innerHeight * 0.06));
    Object.assign(photo.style, { left: rect.x + 'px', top: rect.y + 'px', width: rect.w + 'px', height: rect.h + 'px' });
    el.style.setProperty('--px', rect.x + 'px');
    el.style.setProperty('--py', rect.y + 'px');
    el.style.setProperty('--pr', innerWidth - rect.x - rect.w + 'px');
    el.style.setProperty('--pb', innerHeight - rect.y - rect.h + 'px');
  };

  const show = async (i, first) => {
    const next = await loadImage(urls[i]);
    if (!alive) return;
    img = next;
    place();
    const target = scenes[first ? 0 : 1 - sceneIdx];
    paintBlur(target, img, grade, entry.warmth || 0);
    if (first) {
      photo.src = urls[i];
      el.classList.add('is-photo');                                   // 1. photo appears
      setTimeout(() => alive && el.classList.add('is-world'), 1100);  // 2. world grows from it
      setTimeout(() => alive && el.classList.add('is-text'), 2600);   // 3. words arrive
      target.classList.add('is-on');
    } else {
      photo.classList.add('is-swap');
      setTimeout(() => { photo.src = urls[i]; photo.classList.remove('is-swap'); }, 700);
      scenes[sceneIdx].classList.remove('is-on');
      target.classList.add('is-on');
      sceneIdx = 1 - sceneIdx;
      el.querySelectorAll('.v-dots span').forEach((d, k) => d.classList.toggle('is-on', k === i));
    }
  };

  const go = d => {
    if (urls.length < 2) return;
    photoIdx = (photoIdx + d + urls.length) % urls.length;
    show(photoIdx);
    restartCycle();
  };
  const restartCycle = () => {
    clearInterval(cycle);
    if (urls.length > 1) cycle = setInterval(() => go(1), Math.round(9000 / grade.speed));
  };

  await show(0, true);
  restartCycle();

  let resizeT;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (!img) return; place(); paintBlur(scenes[sceneIdx], img, grade, entry.warmth || 0); }, 120);
  };
  addEventListener('resize', onResize);

  // --- close ---
  const close = (instant) => {
    if (!alive) return;
    alive = false;
    clearInterval(cycle);
    removeEventListener('resize', onResize);
    removeEventListener('keydown', onKey);
    current = null;
    const done = () => { audio?.pause(); el.remove(); if (!document.querySelector('.viewer')) document.body.classList.remove('has-viewer'); prevFocus?.focus?.(); };
    if (instant) return done();
    fadeTo(0, 500);
    el.classList.add('is-leaving');
    setTimeout(done, 520);
  };

  const onKey = e => {
    if (e.target.closest?.('input, textarea')) return;
    if (document.querySelector('.modal-wrap, .menu')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === ' ' && audio) { e.preventDefault(); toggle(); }
  };
  addEventListener('keydown', onKey);

  const toggle = () => {
    if (audio.paused) { audio.play().then(() => { fadeTo(0.85, 800); setPlayIcon(true); }); }
    else { fadeTo(0, 400, () => audio.pause()); setPlayIcon(false); }
  };

  el.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'close') close();
    else if (a === 'next') go(1);
    else if (a === 'prev') go(-1);
    else if (a === 'play') toggle();
    else if (a === 'read') { el.querySelector('.v-sheet').hidden = false; el.classList.add('is-reading'); }
    else if (a === 'read-close') { el.querySelector('.v-sheet').hidden = true; el.classList.remove('is-reading'); }
    else if (a === 'menu') actions.menu(b, entry, { close });
  });

  el.querySelector('[data-act="close"]').focus({ preventScroll: true });
  current = { close, id: entry.id };
}

