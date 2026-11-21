// The memory view: a short film made of the day.
//
// The photos play as moments. Each photo comes up large and the camera slowly
// moves in or out of it (more slowly on a calm day, faster on a busy one), over a
// deeply blurred copy of the same photo, with light in the photo's own colors,
// film grain and a soft vignette. Moments change on the beat of the day's
// song, and each one shows a fragment of what was written.
//
// A tap on the photo opens the original, the arrow keys move between moments,
// space pauses, and at the end the memory can be played again.
// A background sound (rain, wind, sea…) is offered only when the entry names
// it, and stays off until turned on.
import { icon } from './icons.js';
import { moodById } from './moods.js';
import { fitRect, paintBlur, loadImage, paletteOf } from './photo.js';
import { beatsOf } from './audio.js';
import { startWeather } from './weather.js';
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
  const frags = fragmentsOf(entry.text);
  const rnd = seeded(entry.id);

  // ---------- how this day is filmed ----------
  // Not just "sad means blue": the film is built from what was read in the day.
  //  - pace (how eventful the text is) speeds up or slows down the mood's own pace;
  //  - time of day sets the camera: morning pulls back (the day opens up),
  //    evening and night move in (closer, more private), daytime drifts across;
  //  - light and weather add their layer: golden haze, neon color, rain, snow, fog;
  //  - transitions: an eventful or neon day cuts with a flash, a night or a
  //    heavy day dips through darkness, everything else dissolves;
  //  - a longer written fragment holds its moment longer.
  const pace = Number.isFinite(entry.pace) ? entry.pace : 0;
  const speed = Math.max(0.35, Math.min(1.8, grade.speed * (1 + 0.45 * pace)));
  const time = entry.time || (grade.warm > 0.3 ? 'evening' : 'day');
  const base = mood.base || mood.id;
  const cut = pace > 0.35 || entry.light === 'neon' ? 'flash'
    : time === 'night' || ['sad', 'tired', 'anxious'].includes(base) ? 'dip' : 'dissolve';

  // Moments: one per photo; a single photo gives two to four moments over its
  // details, one for each written fragment.
  const plan = urls.length > 1 ? urls.map((_, i) => ({ i })) : Array.from({ length: Math.max(2, Math.min(4, frags.length || 3)) }, () => ({ i: 0 }));
  const moments = plan.map((m, k, all) => {
    const z = 0.05 + 0.07 * Math.min(1, Math.max(0, speed - 0.4)); // how far the camera travels
    const zin = time === 'morning' ? false : time === 'evening' || time === 'night' ? true : k % 2 === 0;
    const s0 = zin ? 1.02 : 1.02 + z, s1 = zin ? 1.02 + z : 1.02;
    const drift = time === 'day' ? 1 : 0.6; // daytime drifts across more
    const lim = s => ((s - 1) / 2 / s) * 100 * 0.9 * drift; // stay inside the photo
    const pt = s => [(rnd() * 2 - 1) * lim(s), (rnd() * 2 - 1) * lim(s)];
    const frag = frags.length ? frags[Math.min(frags.length - 1, Math.floor((k * frags.length) / all.length))] : '';
    return { ...m, from: [s0, ...pt(s0)], to: [s1, ...pt(s1)], frag };
  });
  // relative length of each moment: a longer fragment stays longer
  const avg = moments.reduce((a, m) => a + (m.frag.length || 60), 0) / moments.length;
  moments.forEach(m => { m.weight = Math.max(0.7, Math.min(1.5, 0.6 + 0.4 * (m.frag.length || 60) / avg)); });
  const M = moments.length;
  const trans = Math.round(Math.min(2400, Math.max(450, 1200 / speed ** 1.5))); // crossfade length

  const el = document.createElement('div');
  el.className = 'viewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', entry.title);
  el.style.setProperty('--speed', speed);
  el.style.setProperty('--grain', grade.grain);
  el.dataset.time = time;
  el.dataset.light = entry.light || '';
  el.dataset.cut = cut;
  el.style.setProperty('--trans', trans + 'ms');
  el.innerHTML = `
    <div class="v-stage">
      <canvas class="v-bg"></canvas><canvas class="v-bg"></canvas>
      <div class="v-light" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="v-collage">
        ${urls.map((u, i) => `<button class="v-print" data-print="${i}" aria-label="Открыть фото ${i + 1}"><span><img src="${u}" alt=""></span></button>`).join('')}
      </div>
      ${entry.weather === 'fog' ? '<div class="v-weather" data-w="fog" aria-hidden="true"></div>' : ''}
      ${['rain', 'snow'].includes(entry.weather) ? '<canvas class="v-weather" aria-hidden="true"></canvas>' : ''}
      <div class="v-grain" aria-hidden="true"></div>
      <div class="v-sweep" aria-hidden="true"></div>
      <div class="v-cut" aria-hidden="true"></div>
    </div>

    <div class="v-top">
      <button class="glass-btn icon-btn" data-act="close" aria-label="Закрыть">${icon('close')}</button>
      <span></span>
      <div class="v-top-right">
        <button class="glass-btn icon-btn" data-act="menu" aria-label="Действия с записью">${icon('more')}</button>
      </div>
    </div>

    <div class="v-text">
      <p class="v-date">${fmtDate(entry.date, true)} · ${esc(mood.name)}</p>
      <h2 class="v-title">${esc(entry.title)}</h2>
      <p class="v-frag" aria-live="polite"></p>
      ${entry.text ? '<button class="v-more" data-act="read">Вся запись</button>' : ''}
    </div>

    ${entry.track ? `
      <div class="v-song glass">
        <img src="${entry.track.thumb}" alt="" width="44" height="44">
        <div class="v-song-meta"><b>${esc(entry.track.title)}</b><span>${esc(entry.track.artist)}</span></div>
        <button class="v-song-btn" data-act="play" aria-label="Пауза">${icon('pause', 18)}</button>
        <div class="v-song-bar"><i></i></div>
      </div>` : ''}

    <button class="v-again" data-act="replay" hidden>${icon('replay', 18)}<span>Пережить ещё раз</span></button>
    <button class="v-unmute" data-act="unmute" hidden>${icon('volume', 18)}<span>Включить музыку</span></button>

    <div class="v-sheet glass" hidden>
      <div class="v-sheet-head"><span>${fmtDate(entry.date, true)}</span><button class="glass-btn icon-btn sm" data-act="read-close" aria-label="Скрыть запись">${icon('close', 18)}</button></div>
      <p>${esc(entry.text || '').replace(/\n/g, '<br>')}</p>
    </div>

    <div class="v-lightbox" hidden>
      <img alt="">
      <button class="glass-btn icon-btn" data-act="lb-close" aria-label="Закрыть фото">${icon('close')}</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('has-viewer');
  const prevFocus = document.activeElement;
  const $ = s => el.querySelector(s);

  const bgs = [...el.querySelectorAll('.v-bg')];
  const prints = [...el.querySelectorAll('.v-print')];
  let alive = true, cur = -1, bgFront = 0, bgPhoto = -1, imgs = [], palettes = [], slots = [], heroes = [];
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
  const cum = [0];
  moments.forEach(m => cum.push(cum.at(-1) + m.weight));
  let bounds = cum.map(c => Math.round(c * fallback)); // ms
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
    // each moment lasts a whole number of beats, in proportion to its fragment
    for (let k = 1; k <= M; k++) next.push(snap(b.offset + Math.round(cum[k] * dur / b.period) * b.period) * 1000);
    // only re-time if we're still in the first moment, so nothing jumps
    if (cur <= 0 && elapsed() < next[1]) { bounds = next; el.dataset.bpm = Math.round(b.bpm); }
    if (audio && M * dur > b.duration) audio.loop = true; else if (audio) audio.loop = false;
  });

  // ---------- the collage ----------
  // Every photo has a place on the "table" (a loose grid of prints with small
  // turns) and a large place in the middle. The photo of the moment comes up
  // large; when its moment is over it is laid down in its place, so the day
  // builds up into a collage.
  function layout() {
    const W = innerWidth, H = innerHeight, wide = W >= 720, n = imgs.length;
    const area = wide ? { x: W * 0.05, y: H * 0.11, w: W * 0.9, h: H * 0.6 } : { x: W * 0.05, y: H * 0.1, w: W * 0.9, h: H * 0.48 };
    const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * area.w) / area.h / 1.2))));
    const rows = Math.ceil(n / cols);
    const cw = area.w / cols, ch = area.h / rows;
    const r2 = seeded(entry.id + ':collage');
    slots = imgs.map((im, j) => {
      const c = j % cols, r = Math.floor(j / cols);
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const f = fitRect(im.naturalWidth, im.naturalHeight, cw, ch, 0.84, 0.84);
      return {
        x: area.x + ((cols - inRow) * cw) / 2 + c * cw + f.x + (r2() - 0.5) * cw * 0.12,
        y: area.y + r * ch + f.y + (r2() - 0.5) * ch * 0.12,
        w: f.w, h: f.h, rot: (r2() - 0.5) * 9,
      };
    });
    heroes = imgs.map(im => {
      const r = fitRect(im.naturalWidth, im.naturalHeight, W, H, wide ? 0.62 : 0.9, wide ? 0.64 : 0.56);
      r.y = wide ? Math.max(80, r.y - Math.round(H * 0.07)) : Math.max(72, r.y - Math.round(H * 0.1));
      return r;
    });
    prints.forEach((p, j) => Object.assign(p.style, { left: slots[j].x + 'px', top: slots[j].y + 'px', width: slots[j].w + 'px', height: slots[j].h + 'px' }));
    arrange();
  }

  function arrange() {
    const shown = cur < 0 ? -1 : moments[cur].i;
    prints.forEach((p, j) => {
      const s = slots[j], h = heroes[j];
      const isHero = !ended && j === shown;
      const laid = ended || j < shown;
      p.classList.toggle('is-hero', isHero);
      p.classList.toggle('is-laid', laid && !isHero);
      p.style.transform = isHero
        ? `translate(${h.x + h.w / 2 - (s.x + s.w / 2)}px, ${h.y + h.h / 2 - (s.y + s.h / 2)}px) scale(${h.w / s.w})`
        : laid ? `rotate(${s.rot}deg)` : `translateY(48px) scale(0.9) rotate(${s.rot}deg)`;
    });
    if (shown >= 0) {
      const r = heroes[shown];
      el.style.setProperty('--px', r.x + 'px');
      el.style.setProperty('--py', r.y + 'px');
      el.style.setProperty('--pr', innerWidth - r.x - r.w + 'px');
      el.style.setProperty('--pb', innerHeight - r.y - r.h + 'px');
    }
  }

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

    // the moment's photo comes up large and the camera moves through it;
    // the one before is laid down in its place in the collage
    anims.forEach(a => a?.cancel());
    anims = [kenBurns(prints[m.i].querySelector('img'), m, dur)];
    arrange();

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
    // the cut itself: a flash of light, a dip through darkness, or a plain dissolve
    if (!firstShow && !instant && cut !== 'dissolve') {
      const c = $('.v-cut'); c.classList.remove('is-on'); void c.offsetWidth; c.classList.add('is-on');
      if (cut === 'flash') { const sw = $('.v-sweep'); sw.classList.remove('is-on'); void sw.offsetWidth; sw.classList.add('is-on'); }
    }

    // the written fragment for this moment
    const fr = $('.v-frag');
    fr.classList.remove('is-on');
    setTimeout(() => { if (cur !== k) return; fr.textContent = m.frag; fr.classList.toggle('is-on', Boolean(m.frag)); }, firstShow ? 0 : Math.min(600, trans / 2));

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
  };

  function end() {
    ended = true;
    el.classList.add('is-ended');
    anims.forEach(a => a?.cancel());
    arrange(); // the whole day, laid out as a collage
    $('.v-again').hidden = false;
    fadeTo(0.15, 4000);
    setPlay(false, true);
  }

  // ---------- controls ----------
  const setPlay = (playing, keepAudio) => {
    const b = $('[data-act="play"]');
    if (b) { b.innerHTML = icon(playing ? 'pause' : 'play', 18); b.setAttribute('aria-label', playing ? 'Пауза' : 'Продолжить'); }
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
    arrange();
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

  // ---------- original photo ----------
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
  el.style.setProperty('--move', Math.max(900, trans) + 'ms');
  layout();
  setElapsed(0);
  showMoment(0, { instant: true });
  el.classList.add('is-photo');                                    // 1. the photo appears
  setTimeout(() => alive && el.classList.add('is-world'), 1000);  // 2. the world grows from it
  setTimeout(() => alive && el.classList.add('is-text'), 2200);   // 3. words arrive
  raf = requestAnimationFrame(tick);

  // the song's own progress, at the bottom
  audio?.addEventListener('timeupdate', () => {
    const bar = $('.v-song-bar i');
    if (bar && audio.duration) bar.style.transform = `scaleX(${audio.currentTime / audio.duration})`;
  });
  // rain or snow of the day, drawn as real drops and flakes
  const wc = $('canvas.v-weather');
  const weather = wc ? startWeather(wc, entry.weather, speed) : null;

  let resizeT;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { if (cur < 0) return; layout(); paintBlur(bgs[bgFront], imgs[moments[cur].i], grade, entry.warmth || 0); }, 120);
  };
  addEventListener('resize', onResize);

  // ---------- close ----------
  const close = instant => {
    if (!alive) return;
    alive = false;
    cancelAnimationFrame(raf);
    weather?.stop();
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
      else if (!$('.v-sheet').hidden) { $('.v-sheet').hidden = true; el.classList.remove('is-reading'); }
      else close();
    } else if (e.key === 'ArrowRight') seekTo(Math.min(M - 1, Math.max(0, cur) + 1));
    else if (e.key === 'ArrowLeft') seekTo(Math.max(0, cur - 1));
    else if (e.key === ' ') { e.preventDefault(); pausedAt == null && !ended ? pause() : resume(); }
  };
  addEventListener('keydown', onKey);

  el.addEventListener('click', e => {
    const pr = e.target.closest('[data-print]');
    if (pr) return openOriginal(+pr.dataset.print);
    const b = e.target.closest('[data-act]');
    if (!b) { if (e.target.closest('.v-lightbox')) closeOriginal(); return; }
    const a = b.dataset.act;
    if (a === 'close') close();
    else if (a === 'replay') replay();
    else if (a === 'unmute') tryPlay().then(ok => { if (ok && audio) audio.currentTime = (elapsed() / 1000) % (audio.duration || 30); });
    else if (a === 'play') (pausedAt == null && !ended ? pause() : resume());
    else if (a === 'lb-close') closeOriginal();
    else if (a === 'read') { $('.v-sheet').hidden = false; el.classList.add('is-reading'); }
    else if (a === 'read-close') { $('.v-sheet').hidden = true; el.classList.remove('is-reading'); }
    else if (a === 'menu') actions.menu(b, entry, { close });
  });

  $('[data-act="close"]').focus({ preventScroll: true });
  current = { close, id: entry.id };
}
