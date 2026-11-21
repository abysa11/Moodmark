// The memory view: a short film made of the day.
//
// Cinema mode: the photos play as moments. Each moment slowly moves in or out
// of its photo (more slowly on a calm day, faster on a busy one), over a
// deeply blurred copy of the same photo, with light in the photo's own colors,
// film grain and a soft vignette. Moments change on the beat of the day's
// song, and each one shows a fragment of what was written.
//
// It can be steered: the timeline at the bottom jumps between moments, a tap
// on the photo opens the original, the archive mode shows everything at once
// (all photos, the whole text, the song), and the memory can be played again.
// A background sound (rain, wind, sea…) is offered only when the entry names
// it, and stays off until turned on.
import { icon } from './icons.js';
import { moodById } from './moods.js';
import { fitRect, paintBlur, loadImage, paletteOf } from './photo.js';
import { beatsOf, ambienceOf, AMBIENCE, playAmbience } from './audio.js';
import { fmtDate, esc } from './util.js';

let current = null;
export function closeViewer() { current?.close(); }

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The entry split into short readable fragments (sentences, long ones cut).
function fragmentsOf(text) {
  return (text || '').replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => s.length > 2)
    .flatMap(s => (s.length > 160 ? s.match(/.{1,150}(\s|$)/g).map(x => x.trim()) : [s]));
}

// Small seeded random numbers, so a memory moves the same way every time.
function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

export async function openViewer(entry, urls, actions) {
  current?.close(true);
  const mood = moodById(entry.mood);
  const grade = mood.grade;
  const speed = grade.speed;
  const frags = fragmentsOf(entry.text);
  const amb = ambienceOf(entry);
  const rnd = seeded(entry.id);

  // Moments: one per photo; a single photo gives three moments over its details.
  const moments = (urls.length > 1 ? urls.map((_, i) => ({ i })) : [{ i: 0 }, { i: 0 }, { i: 0 }]).map((m, k, all) => {
    const z = 0.05 + 0.07 * Math.min(1, Math.max(0, speed - 0.4)); // how far the camera travels
    const zin = k % 2 === 0;
    const s0 = zin ? 1.02 : 1.02 + z, s1 = zin ? 1.02 + z : 1.02;
    const lim = s => ((s - 1) / 2 / s) * 100 * 0.9; // stay inside the photo
    const pt = s => [(rnd() * 2 - 1) * lim(s), (rnd() * 2 - 1) * lim(s)];
    return {
      ...m,
      from: [s0, ...pt(s0)], to: [s1, ...pt(s1)],
      frag: frags.length ? frags[Math.min(frags.length - 1, Math.floor((k * frags.length) / all.length))] : '',
    };
  });
  const M = moments.length;
  const trans = Math.round(Math.min(2400, Math.max(450, 1200 / speed ** 1.5))); // crossfade length

  const el = document.createElement('div');
  el.className = 'viewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', entry.title);
  el.style.setProperty('--speed', speed);
  el.style.setProperty('--grain', grade.grain);
  el.style.setProperty('--trans', trans + 'ms');
  el.innerHTML = `
    <div class="v-stage">
      <canvas class="v-bg"></canvas><canvas class="v-bg"></canvas>
      <div class="v-light" aria-hidden="true"><i></i><i></i><i></i></div>
      <button class="v-frame" data-act="original" aria-label="Открыть оригинал фото">
        <img class="v-photo" alt=""><img class="v-photo" alt="">
      </button>
      <div class="v-grain" aria-hidden="true"></div>
      <div class="v-sweep" aria-hidden="true"></div>
    </div>

    <div class="v-top">
      <button class="glass-btn icon-btn" data-act="close" aria-label="Закрыть">${icon('close')}</button>
      <div class="v-modes glass" role="radiogroup" aria-label="Режим">
        <button role="radio" aria-checked="true" data-mode="cinema">${icon('film', 16)}Кино</button>
        <button role="radio" aria-checked="false" data-mode="archive">${icon('grid', 16)}Архив</button>
      </div>
      <button class="glass-btn icon-btn" data-act="menu" aria-label="Действия с записью">${icon('more')}</button>
    </div>

    <div class="v-text">
      <p class="v-date">${fmtDate(entry.date, true)} · ${esc(mood.name)}</p>
      <h2 class="v-title">${esc(entry.title)}</h2>
      <p class="v-frag" aria-live="polite"></p>
      ${entry.text ? '<button class="v-more" data-act="read">Вся запись</button>' : ''}
    </div>

    <div class="v-dock glass">
      <button class="icon-btn v-ctl" data-act="play" aria-label="Пауза">${icon('pause', 18)}</button>
      <button class="icon-btn v-ctl" data-act="replay" aria-label="Пережить заново" title="Пережить заново">${icon('replay', 18)}</button>
      <div class="v-line" role="group" aria-label="Моменты воспоминания">
        ${moments.map((m, k) => `<button class="v-seg" data-seg="${k}" aria-label="Момент ${k + 1}${m.frag ? ': ' + esc(m.frag) : ''}"><i></i></button>`).join('')}
      </div>
      ${amb ? `<button class="v-amb" data-act="amb" aria-pressed="false" title="Звук фона из записи">${icon('wave', 16)}<span>${AMBIENCE[amb].name}</span></button>` : ''}
      ${entry.track ? `
        <div class="v-song">
          <img src="${entry.track.thumb}" alt="" width="32" height="32">
          <div><b>${esc(entry.track.title)}</b><span>${esc(entry.track.artist)}${entry.trackBy === 'ai' ? ' · подобрано Moodmark' : ''}</span></div>
        </div>` : ''}
    </div>

    <button class="v-again" data-act="replay" hidden>${icon('replay', 18)}<span>Пережить ещё раз</span></button>
    <button class="v-unmute" data-act="unmute" hidden>${icon('volume', 18)}<span>Включить музыку</span></button>

    <div class="v-sheet glass" hidden>
      <div class="v-sheet-head"><span>${fmtDate(entry.date, true)}</span><button class="glass-btn icon-btn sm" data-act="read-close" aria-label="Скрыть запись">${icon('close', 18)}</button></div>
      <p>${esc(entry.text || '').replace(/\n/g, '<br>')}</p>
    </div>

    <section class="v-archive" hidden aria-label="Архив записи">
      <div class="v-archive-in">
        <p class="v-date">${fmtDate(entry.date, true)} · ${esc(mood.name)}</p>
        <h2 class="v-arch-title">${esc(entry.title)}</h2>
        ${entry.atmosphere ? `<p class="v-arch-atmo">${esc(entry.atmosphere)}</p>` : ''}
        ${entry.track ? `<p class="v-arch-song">${icon('music', 16)}${esc(entry.track.title)} — ${esc(entry.track.artist)}</p>` : ''}
        <div class="v-arch-text">${(entry.text || '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</div>
        <div class="v-arch-grid">${urls.map((u, i) => `<button data-orig="${i}" aria-label="Открыть фото ${i + 1}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>
      </div>
    </section>

    <div class="v-lightbox" hidden>
      <img alt="">
      <button class="glass-btn icon-btn" data-act="lb-close" aria-label="Закрыть фото">${icon('close')}</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('has-viewer');
  const prevFocus = document.activeElement;
  const $ = s => el.querySelector(s);

  const bgs = [...el.querySelectorAll('.v-bg')];
  const photos = [...el.querySelectorAll('.v-photo')];
  const frame = $('.v-frame');
  let alive = true, cur = -1, front = 0, bgFront = 0, bgPhoto = -1, imgs = [], palettes = [];
  let anims = [];

  // ---------- music ----------
  // created right in the click that opened the memory, so phones let it play
  const audio = entry.track?.preview ? new Audio(entry.track.preview) : null;
  let fadeTimer = null;
  const fadeTo = (vol, ms, then) => {
    if (!audio) return;
    clearInterval(fadeTimer);
    const start = audio.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, Math.min(1, start + (vol - start) * p));
      if (p >= 1) { clearInterval(fadeTimer); then?.(); }
    }, 40);
  };
  const tryPlay = () => audio?.play().then(() => { fadeTo(0.85, 2000); $('.v-unmute').hidden = true; return true; })
    .catch(() => { $('.v-unmute').hidden = false; return false; });
  if (audio) { audio.volume = 0; audio.loop = true; tryPlay(); }

  // ---------- the clock: moments change on the beat ----------
  const fallback = Math.round(7000 / speed);
  let bounds = moments.map((_, k) => k * fallback).concat(M * fallback); // ms
  let t0 = performance.now(), pausedAt = null, ended = false;
  const elapsed = () => (pausedAt ?? performance.now()) - t0;
  const setElapsed = ms => { t0 = (pausedAt ?? performance.now()) - ms; };

  beatsOf(entry.track?.preview).then(b => {
    if (!b || !alive) return;
    // a moment lasts 4 beats on a fast day, 8 on an ordinary one, 16 on a slow one
    let dur = b.period * (speed >= 1.2 ? 4 : speed >= 0.85 ? 8 : 16);
    while (dur < 3) dur *= 2;
    while (dur > 11) dur /= 2;
    const snap = t => { const a = b.accents.find(x => Math.abs(x - (t % b.duration)) < 0.18); return a == null ? t : t - (t % b.duration) + a; };
    const next = [0];
    for (let k = 1; k <= M; k++) next.push(snap(b.offset + k * dur) * 1000);
    // only re-time if we're still in the first moment, so nothing jumps
    if (cur <= 0 && elapsed() < next[1]) { bounds = next; $('.v-line').dataset.beat = Math.round(b.bpm); }
    if (audio && M * dur > b.duration) audio.loop = true; else if (audio) audio.loop = false;
  });

  // ---------- painting ----------
  const place = i => {
    const im = imgs[i];
    const wide = innerWidth >= 720;
    const r = fitRect(im.naturalWidth, im.naturalHeight, innerWidth, innerHeight, wide ? 0.66 : 0.92, wide ? 0.68 : 0.6);
    if (wide) r.y = Math.max(80, r.y - Math.round(innerHeight * 0.07));
    else r.y = Math.max(72, r.y - Math.round(innerHeight * 0.1));
    Object.assign(frame.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    el.style.setProperty('--px', r.x + 'px');
    el.style.setProperty('--py', r.y + 'px');
    el.style.setProperty('--pr', innerWidth - r.x - r.w + 'px');
    el.style.setProperty('--pb', innerHeight - r.y - r.h + 'px');
  };

  const kenBurns = (img, m, ms) => {
    const tf = ([s, x, y]) => `scale(${s}) translate(${x}%, ${y}%)`;
    if (reduce()) { img.style.transform = tf(m.to); return null; }
    return img.animate([{ transform: tf(m.from) }, { transform: tf(m.to) }], { duration: ms, easing: 'linear', fill: 'forwards' });
  };

  function showMoment(k, { instant = false } = {}) {
    if (k === cur || !imgs.length) return;
    const m = moments[k];
    const firstShow = cur < 0;
    cur = k;
    const dur = Math.max(1000, bounds[k + 1] - bounds[k]) + trans;

    // photo: the hidden layer takes the new moment and fades in over the old one
    const back = photos[1 - front];
    back.src = urls[m.i];
    anims.forEach(a => a?.cancel());
    anims = [kenBurns(back, m, dur)];
    back.classList.add('is-on');
    photos[front].classList.remove('is-on');
    front = 1 - front;
    place(m.i);

    // background and colors follow the photo
    if (bgPhoto !== m.i) {
      const target = bgs[1 - bgFront];
      paintBlur(target, imgs[m.i], grade, entry.warmth || 0);
      target.classList.add('is-on');
      bgs[bgFront].classList.remove('is-on');
      bgFront = 1 - bgFront;
      bgPhoto = m.i;
      const [c1, c2, c3] = palettes[m.i];
      el.style.setProperty('--c1', c1); el.style.setProperty('--c2', c2); el.style.setProperty('--c3', c3);
    }

    // a fast day gets a quick light sweep on the change
    if (!firstShow && speed >= 1.1 && !instant) { const sw = $('.v-sweep'); sw.classList.remove('is-on'); void sw.offsetWidth; sw.classList.add('is-on'); }

    // the written fragment for this moment
    const fr = $('.v-frag');
    fr.classList.remove('is-on');
    setTimeout(() => { if (cur !== k) return; fr.textContent = m.frag; fr.classList.toggle('is-on', Boolean(m.frag)); }, firstShow ? 0 : Math.min(600, trans / 2));

    el.querySelectorAll('.v-seg').forEach((s, j) => { s.classList.toggle('is-done', j < k); s.classList.toggle('is-now', j === k); });
    if (pausedAt != null) anims.forEach(a => a?.pause());
  }

  // ---------- the loop ----------
  let raf = 0;
  const tick = () => {
    if (!alive) return;
    raf = requestAnimationFrame(tick);
    if (!imgs.length) return;
    const t = elapsed();
    if (!ended && t >= bounds[M]) return end();
    let k = 0;
    while (k < M - 1 && t >= bounds[k + 1]) k++;
    if (!ended) showMoment(k);
    const segs = el.querySelectorAll('.v-seg i');
    const p = Math.min(1, Math.max(0, (t - bounds[k]) / (bounds[k + 1] - bounds[k])));
    segs.forEach((s, j) => { s.style.transform = `scaleX(${j < k || ended ? 1 : j === k ? p : 0})`; });
  };

  function end() {
    ended = true;
    el.classList.add('is-ended');
    $('.v-again').hidden = false;
    fadeTo(0.15, 4000);
    setPlay(false, true);
  }

  // ---------- controls ----------
  const setPlay = (playing, keepAudio) => {
    const b = $('[data-act="play"]');
    b.innerHTML = icon(playing ? 'pause' : 'play', 18);
    b.setAttribute('aria-label', playing ? 'Пауза' : 'Продолжить');
    if (!keepAudio && audio) { if (playing) tryPlay(); else fadeTo(0, 300, () => audio.pause()); }
  };
  const pause = () => {
    if (pausedAt != null || ended) return;
    pausedAt = performance.now();
    anims.forEach(a => a?.pause());
    el.classList.add('is-paused');
    setPlay(false);
  };
  const resume = () => {
    if (ended) return replay();
    if (pausedAt == null) return;
    t0 += performance.now() - pausedAt;
    pausedAt = null;
    anims.forEach(a => a?.play());
    el.classList.remove('is-paused');
    setPlay(true);
  };
  const seekTo = k => {
    ended = false;
    el.classList.remove('is-ended');
    $('.v-again').hidden = true;
    setElapsed(bounds[k] + 1);
    if (audio) { const d = audio.duration || 30; audio.currentTime = (bounds[k] / 1000) % d; if (pausedAt == null) tryPlay(); }
    cur = -2; // force a redraw
    showMoment(k);
    if (pausedAt == null) setPlay(true, true);
  };
  function replay() {
    pausedAt = null;
    el.classList.remove('is-paused');
    if (audio) { audio.currentTime = 0; audio.volume = 0; tryPlay(); }
    el.classList.remove('is-text');
    setTimeout(() => alive && el.classList.add('is-text'), 1200);
    seekTo(0);
    setElapsed(0);
    setPlay(true, true);
  }

  // ---------- background sound ----------
  let ambience = null;
  const toggleAmb = () => {
    const b = $('[data-act="amb"]');
    if (ambience) { ambience.stop(); ambience = null; b.setAttribute('aria-pressed', 'false'); return; }
    ambience = playAmbience(amb);
    b.setAttribute('aria-pressed', 'true');
  };

  // ---------- modes, original photo, full text ----------
  let wasPaused = false;
  const setMode = mode => {
    const archive = mode === 'archive';
    el.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    $('.v-archive').hidden = !archive;
    el.classList.toggle('is-archive', archive);
    if (archive) { wasPaused = pausedAt != null; if (!wasPaused) { pausedAt = performance.now(); anims.forEach(a => a?.pause()); } }
    else if (!wasPaused && pausedAt != null && !ended) { t0 += performance.now() - pausedAt; pausedAt = null; anims.forEach(a => a?.play()); }
  };
  const openOriginal = i => {
    const lb = $('.v-lightbox');
    lb.querySelector('img').src = urls[i];
    lb.hidden = false;
    lb.querySelector('button').focus();
  };
  const closeOriginal = () => { $('.v-lightbox').hidden = true; };

  // ---------- depth: the photo and the background move apart a little ----------
  const onMove = ev => {
    if (ev.pointerType !== 'mouse') return;
    el.style.setProperty('--mx', ((ev.clientX / innerWidth) * 2 - 1).toFixed(3));
    el.style.setProperty('--my', ((ev.clientY / innerHeight) * 2 - 1).toFixed(3));
  };
  el.addEventListener('pointermove', onMove);

  // ---------- start ----------
  imgs = await Promise.all(urls.map(u => loadImage(u).catch(() => null)));
  if (!alive) return;
  if (imgs.some(x => !x)) { const ok = imgs.find(Boolean); imgs = imgs.map(x => x || ok); }
  palettes = imgs.map(im => paletteOf(im));
  setElapsed(0);
  showMoment(0, { instant: true });
  el.classList.add('is-photo');                                    // 1. the photo appears
  setTimeout(() => alive && el.classList.add('is-world'), 1000);  // 2. the world grows from it
  setTimeout(() => alive && el.classList.add('is-text'), 2200);   // 3. words arrive
  raf = requestAnimationFrame(tick);

  let resizeT;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (cur < 0) return; place(moments[cur].i); paintBlur(bgs[bgFront], imgs[moments[cur].i], grade, entry.warmth || 0); }, 120);
  };
  addEventListener('resize', onResize);

  // ---------- close ----------
  const close = instant => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    ambience?.stop();
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
    if (e.key === 'Escape') {
      if (!$('.v-lightbox').hidden) closeOriginal();
      else if (!$('.v-archive').hidden) setMode('cinema');
      else if (!$('.v-sheet').hidden) { $('.v-sheet').hidden = true; el.classList.remove('is-reading'); }
      else close();
    } else if (e.key === 'ArrowRight') seekTo(Math.min(M - 1, Math.max(0, cur) + 1));
    else if (e.key === 'ArrowLeft') seekTo(Math.max(0, cur - 1));
    else if (e.key === ' ') { e.preventDefault(); pausedAt == null && !ended ? pause() : resume(); }
  };
  addEventListener('keydown', onKey);

  el.addEventListener('click', e => {
    const seg = e.target.closest('[data-seg]');
    if (seg) return seekTo(+seg.dataset.seg);
    const orig = e.target.closest('[data-orig]');
    if (orig) return openOriginal(+orig.dataset.orig);
    const mode = e.target.closest('[data-mode]');
    if (mode) return setMode(mode.dataset.mode);
    const b = e.target.closest('[data-act]');
    if (!b) { if (e.target.closest('.v-lightbox')) closeOriginal(); return; }
    const a = b.dataset.act;
    if (a === 'close') close();
    else if (a === 'play') (pausedAt == null && !ended ? pause() : resume());
    else if (a === 'replay') replay();
    else if (a === 'unmute') tryPlay().then(ok => { if (ok && audio) audio.currentTime = (elapsed() / 1000) % (audio.duration || 30); });
    else if (a === 'amb') toggleAmb();
    else if (a === 'original') openOriginal(moments[Math.max(0, cur)].i);
    else if (a === 'lb-close') closeOriginal();
    else if (a === 'read') { $('.v-sheet').hidden = false; el.classList.add('is-reading'); }
    else if (a === 'read-close') { $('.v-sheet').hidden = true; el.classList.remove('is-reading'); }
    else if (a === 'menu') actions.menu(b, entry, { close });
  });

  $('[data-act="close"]').focus({ preventScroll: true });
  current = { close, id: entry.id };
}
