// Memory renderer — a 4:5 animated diary page drawn on canvas.
// Constant: header, photo card, title, caption, song line.
// Mood-driven: the atmosphere behind the photo (colour, light, motion, grain),
// photo grading, pace of scene changes. Photos slowly drift and zoom.

import { loadBitmap } from './analyze-photo.js';
import { t, formatDate } from './i18n.js';

export const W = 1080, H = 1350, M = 64;

export { formatDate };

// Mood of a day — user-facing names for the five internal regimes.
const mood = (key, dot) => ({ get name() { return t('mood_' + key); }, dot });
export const MOODS = {
  collage: mood('collage', '#e8a13a'),
  impression: mood('impression', '#9bb58a'),
  ma: mood('ma', '#b9b3a8'),
  film: mood('film', '#6f86a6'),
  construct: mood('construct', '#c8463d'),
};

// How each mood paints the atmosphere behind the photo.
const ATMO = {
  collage: { bg: 'saturate(1.7) brightness(1.08)', wash: ['#fff3d6', 0.18], dark: false, photo: 'saturate(1.12) contrast(1.04)', drift: 1.4, glow: ['#ffcf7a', 0.32], grain: 0.05, pulse: 0.1, card: 0.88 },
  impression: { bg: 'saturate(1.1) brightness(1.12)', wash: ['#f7f1e6', 0.42], dark: false, photo: 'saturate(1.0) brightness(1.03) sepia(0.1)', drift: 0.7, glow: ['#ffe2b0', 0.22], grain: 0.06, pulse: 0, card: 0.86 },
  ma: { bg: 'saturate(0.6) brightness(1.18)', wash: ['#f4f2ee', 0.78], dark: false, photo: 'saturate(0.88)', drift: 0.35, glow: null, grain: 0.04, pulse: 0, card: 0.66 },
  film: { bg: 'saturate(0.35) brightness(0.62) contrast(1.05)', wash: ['#5d6b80', 0.32], dark: true, photo: 'saturate(0.5) contrast(0.96) brightness(0.96)', drift: 0.45, glow: null, grain: 0.22, pulse: 0, card: 0.84 },
  construct: { bg: 'saturate(0.8) brightness(0.42) contrast(1.35)', wash: ['#141b26', 0.45], dark: true, photo: 'contrast(1.14) saturate(0.86)', drift: 1.1, glow: ['#ff4b3a', 0.16], grain: 0.1, pulse: 0.22, card: 0.86 },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => 1 - Math.pow(1 - clamp(t), 3);
const easeInOut = t => (t = clamp(t), t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgba = (h, a) => { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function coverRect(sw, sh, w, h, zoom = 1, px = 0, py = 0) {
  const r = Math.max(w / sw, h / sh) * zoom;
  const cw = w / r, ch = h / r;
  return [(sw - cw) / 2 + px * (sw - cw) / 2, (sh - ch) / 2 + py * (sh - ch) / 2, cw, ch];
}

function coverCrop(img, w, h) {
  const c = canvas(w, h), ctx = c.getContext('2d');
  const r = Math.max(w / img.width, h / img.height);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
  return c;
}

// ---------- photo treatments ----------
function painterly(img, w, h, style, rand) {
  const base = coverCrop(img, w, h);
  const out = canvas(w, h), ctx = out.getContext('2d');
  ctx.filter = 'blur(10px) saturate(1.05)';
  ctx.drawImage(base, 0, 0);
  ctx.filter = 'none';
  const sw = Math.ceil(w / 4), sh = Math.ceil(h / 4);
  const small = canvas(sw, sh).getContext('2d', { willReadFrequently: true });
  small.drawImage(base, 0, 0, sw, sh);
  const d = small.getImageData(0, 0, sw, sh).data;
  const lumAt = (x, y) => { const i = (clamp(y, 0, sh - 1) * sw + clamp(x, 0, sw - 1)) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; };
  const warm = style.temperature;
  const sizeK = 1.15 - style.energy * 0.35;
  ctx.lineCap = 'round';
  const passes = [[w * h / 700, 30, 11], [w * h / 260, 17, 6]];
  for (const [count, len, width] of passes) {
    for (let i = 0; i < count; i++) {
      const x = rand() * w, y = rand() * h;
      const sx = Math.floor(x / 4), sy = Math.floor(y / 4);
      const idx = (Math.min(sy, sh - 1) * sw + Math.min(sx, sw - 1)) * 4;
      let r = d[idx], g = d[idx + 1], b = d[idx + 2];
      // impressionist light: lift shadows, warm the highlights
      const l = (r + g + b) / 765;
      r = r + (255 - r) * 0.12 + warm * 14 * l; g = g + (255 - g) * 0.1; b = b + (255 - b) * 0.08 - warm * 10 * l;
      const j = (rand() - 0.5) * 22;
      const gx = lumAt(sx + 1, sy) - lumAt(sx - 1, sy), gy = lumAt(sx, sy + 1) - lumAt(sx, sy - 1);
      const ang = Math.atan2(gy, gx) + Math.PI / 2 + (rand() - 0.5) * 0.5;
      const L = len * sizeK * (0.6 + rand() * 0.8);
      ctx.strokeStyle = `rgba(${r + j | 0},${g + j | 0},${b + j | 0},${0.55 + rand() * 0.35})`;
      ctx.lineWidth = width * sizeK * (0.7 + rand() * 0.6);
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ang) * L / 2, y - Math.sin(ang) * L / 2);
      ctx.lineTo(x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2);
      ctx.stroke();
    }
  }
  return out;
}

function pixelMap(img, w, h, fn) {
  const c = coverCrop(img, w, h), ctx = c.getContext('2d', { willReadFrequently: true });
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) fn(d, i);
  ctx.putImageData(id, 0, 0);
  return c;
}

function filmGrade(img, w, h, style) {
  const warm = style.temperature * 10 + style.vintage * 14;
  const sat = 0.42 * (style.minor ? 0.85 : 1);
  return pixelMap(img, w, h, (d, i) => {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    for (let k = 0; k < 3; k++) {
      let v = l + (d[i + k] - l) * sat;
      v = 28 + v * 0.8;                        // lifted blacks, softened whites
      d[i + k] = v + (k === 0 ? warm : k === 2 ? -warm : warm * 0.3);
    }
  });
}

function duotone(img, w, h, style) {
  const [a, , b] = style.palette.colors.map(hexToRgb);
  const k = 1.25 + style.energy * 0.6;
  return pixelMap(img, w, h, (d, i) => {
    let l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
    l = clamp((l - 0.5) * k + 0.5);
    for (let c = 0; c < 3; c++) d[i + c] = a[c] + (b[c] - a[c]) * l;
  });
}

function vivid(img, w, h) {
  return pixelMap(img, w, h, (d, i) => {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    for (let k = 0; k < 3; k++) d[i + k] = clamp(((l + (d[i + k] - l) * 1.35) - 128) * 1.12 + 132, 0, 255);
  });
}

function soft(img, w, h) {
  return pixelMap(img, w, h, (d, i) => {
    const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    for (let k = 0; k < 3; k++) d[i + k] = 18 + (l + (d[i + k] - l) * 0.72) * 0.9;
  });
}


let grainTiles = null;
function getGrain() {
  if (grainTiles) return grainTiles;
  grainTiles = [0, 1, 2].map(() => {
    const c = canvas(256, 256), ctx = c.getContext('2d');
    const id = ctx.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  });
  return grainTiles;
}

let fontsReady = null;
export function loadFonts() {
  if (!fontsReady) {
    const specs = ['800 22px Archivo', '500 20px "Geist Mono"', '400 30px Geist', '500 64px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"'];
    fontsReady = Promise.race([
      Promise.all(specs.map(s => document.fonts.load(s, 'АаBbӘәҒғҚқҢңӨөҰұҮүҺһІі'))).catch(() => {}),
      new Promise(r => setTimeout(r, 3500)),
    ]);
  }
  return fontsReady;
}

function wrap(ctx, text, maxW, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.includes(' ')) last = last.replace(/\s+\S+$/, '');
    kept[maxLines - 1] = last.replace(/[,.;:—-]$/, '') + '…';
    return kept;
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const LOGO = typeof Path2D !== 'undefined' ? new Path2D('M0 52Q0 0 52 0H348Q400 0 400 52V494Q400 520 378 507L214 404Q200 395 186 404L22 507Q0 520 0 494ZM66 58Q48 58 48 76V288C80 290 120 290 150 275C200 250 230 188 270 166C300 150 330 162 352 183V76Q352 58 334 58Z') : null;

export class MemoryRenderer {
  constructor(cvs, day) {
    this.cvs = cvs;
    cvs.width = W; cvs.height = H;
    this.ctx = cvs.getContext('2d');
    this.day = day;
    this.style = day.style;
    this.atmo = ATMO[day.style.regime] || ATMO.ma;
  }

  async prepare(bitmaps) {
    await loadFonts();
    const s = this.style, A = this.atmo;
    const imgs = bitmaps || await Promise.all(this.day.photos.map(b => loadBitmap(b)));
    // photo card: large, nearly full width
    this.card = { x: 48, y: 116, w: W - 96, h: 884 };
    const C = this.card;
    const TW = Math.round(C.w * 1.1), TH = Math.round(C.h * 1.1); // room for slow drift
    const treat = (img, i) => {
      const r = rng(s.seed + i * 101);
      if (s.regime === 'impression') return painterly(img, TW, TH, s, r);
      if (s.regime === 'film') return filmGrade(img, TW, TH, s);
      if (s.regime === 'construct') return duotone(img, TW, TH, s);
      if (s.regime === 'collage') return vivid(img, TW, TH);
      return soft(img, TW, TH);
    };
    this.scenes = imgs.map((img, i) => {
      // atmosphere: small blurred, mood-graded version of the photo
      const b = canvas(216, 270), bctx = b.getContext('2d');
      bctx.filter = `blur(14px) ${A.bg}`;
      const [sx, sy, sw, sh] = coverRect(img.width, img.height, 216, 270, 1.25);
      bctx.drawImage(img, sx, sy, sw, sh, -20, -20, 256, 310);
      bctx.filter = 'none';
      bctx.fillStyle = rgba(A.wash[0], A.wash[1]);
      bctx.fillRect(0, 0, 216, 270);
      return { img: treat(img, i), bg: b };
    });
    if (!this.scenes.length) this.scenes = [{ img: canvas(10, 10), bg: canvas(10, 10) }];
    this.loop = this.scenes.length * s.sceneDur;
    const rand = rng(s.seed);
    this.weatherParticles = Array.from({ length: 90 }, () => [rand(), rand(), rand()]);
    this.ink = A.dark ? '#f3f1ec' : '#141414';
  }

  get duration() { return this.loop; }

  sceneSource(i) {
    const img = this.scenes[i].img;
    return { src: img, w: img.width, h: img.height, live: false };
  }

  draw(t) {
    const { ctx, style: s, atmo: A } = this;
    const sd = s.sceneDur, n = this.scenes.length;
    const tt = ((t % this.loop) + this.loop) % this.loop;
    const idx = Math.floor(tt / sd) % n;
    const local = tt - idx * sd;
    const beatLen = 60 / s.bpm;
    const beatPhase = (t % beatLen) / beatLen;
    const pulse = A.pulse * Math.exp(-beatPhase * 5);
    const fadeLen = Math.min(sd * 0.35, s.regime === 'collage' || s.regime === 'construct' ? 0.35 : 1.2);
    const prev = (idx - 1 + n) % n;
    const mix = n > 1 && local < fadeLen && t > fadeLen ? easeInOut(local / fadeLen) : 1;

    ctx.save();
    ctx.fillStyle = A.dark ? '#111' : '#f4f2ee';
    ctx.fillRect(0, 0, W, H);

    // ---- atmosphere behind the photo
    const drawBg = (i, alpha, age) => {
      const k = 1.12 + Math.sin((t + i * 3) * 0.12 * A.drift) * 0.05 + pulse * 0.2;
      const dx = Math.sin(t * 0.07 * A.drift + i) * 40, dy = Math.cos(t * 0.05 * A.drift + i) * 30;
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.scenes[i].bg, (W - W * k) / 2 + dx, (H - H * k) / 2 + dy, W * k, H * k);
      ctx.globalAlpha = 1;
    };
    if (mix < 1) drawBg(prev, 1);
    drawBg(idx, mix);
    if (A.glow) {
      const gx = W * (0.5 + Math.sin(t * 0.09 * A.drift) * 0.35), gy = H * (0.3 + Math.cos(t * 0.07 * A.drift) * 0.2);
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.75);
      g.addColorStop(0, rgba(A.glow[0], A.glow[1] * (1 + pulse * 2)));
      g.addColorStop(1, rgba(A.glow[0], 0));
      ctx.globalCompositeOperation = A.dark ? 'screen' : 'soft-light';
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (s.night || A.dark) {
      const v = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.3, W / 2, H * 0.45, W * 0.95);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.45 + pulse})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    this.drawWeather(t);

    // ---- photo card (slowly drifting still)
    const C = this.card;
    ctx.save();
    ctx.shadowColor = A.dark ? 'rgba(0,0,0,0.5)' : 'rgba(40,30,20,0.22)';
    ctx.shadowBlur = 48; ctx.shadowOffsetY = 18;
    roundRect(ctx, C.x, C.y, C.w, C.h, 10);
    ctx.fillStyle = A.dark ? '#000' : '#fff';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, C.x, C.y, C.w, C.h, 10);
    ctx.clip();
    const drawPhoto = (i, alpha, localT) => {
      const { src, w, h, live } = this.sceneSource(i);
      const p = clamp(localT / (sd + fadeLen));
      const zoom = 1 + ease(p) * 0.06 * A.drift;
      const px = Math.sin(i * 2.1) * 0.5 * p, py = Math.cos(i * 1.3) * 0.4 * p;
      const [sx, sy, sw, sh] = coverRect(w, h, C.w, C.h, zoom, px, py);
      ctx.globalAlpha = alpha;
      ctx.filter = s.vintage > 0.15 && s.regime !== 'film' ? `sepia(${(s.vintage * 0.3).toFixed(2)})` : 'none';
      ctx.drawImage(src, sx, sy, sw, sh, C.x, C.y, C.w, C.h);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    };
    if (mix < 1) drawPhoto(prev, 1, sd + local);
    drawPhoto(idx, mix, local);
    ctx.restore();

    this.drawGrain(t);
    this.drawFrame(t);
    ctx.restore();
  }

  drawWeather(t) {
    const { ctx, style: s } = this;
    if (s.weather !== 'rain' && s.weather !== 'snow') return;
    ctx.save();
    ctx.strokeStyle = this.atmo.dark ? 'rgba(255,255,255,0.22)' : 'rgba(60,70,80,0.18)';
    ctx.fillStyle = this.atmo.dark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.2;
    this.weatherParticles.forEach(([a, b, c]) => {
      if (s.weather === 'rain') {
        const y = (b * H + t * (520 + c * 300)) % H;
        const x = (a * W + y * 0.16) % W;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 24); ctx.stroke();
      } else {
        const y = (b * H + t * (30 + c * 30)) % H;
        const x = a * W + Math.sin(t * 0.8 + c * 6) * 14;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + c * 2.5, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.restore();
  }

  drawGrain(t) {
    const { ctx, style: s, atmo: A } = this;
    const g = A.grain + (s.vintage || 0) * 0.15;
    if (g <= 0.02) return;
    const tiles = getGrain();
    const tile = tiles[Math.floor(t * 24) % tiles.length];
    ctx.save();
    ctx.globalAlpha = g;
    ctx.globalCompositeOperation = 'overlay';
    const ox = Math.floor((Math.sin(t * 97) + 1) * 128), oy = Math.floor((Math.cos(t * 89) + 1) * 128);
    for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) ctx.drawImage(tile, x, y);
    ctx.restore();
  }

  drawFrame(t) {
    const { ctx, day } = this;
    const ink = this.ink;
    ctx.save();
    ctx.fillStyle = ink;
    ctx.textBaseline = 'alphabetic';
    // header: mark + wide wordmark, number and date
    ctx.save(); ctx.translate(M, 66); ctx.scale(0.05, 0.05); ctx.fill(LOGO, 'evenodd'); ctx.restore();
    ctx.font = '800 22px Archivo';
    if ('fontStretch' in ctx) ctx.fontStretch = 'expanded';
    ctx.fillText('MOODMARK', M + 30, 88);
    if ('fontStretch' in ctx) ctx.fontStretch = 'normal';
    ctx.font = '500 20px "Geist Mono"';
    ctx.textAlign = 'right';
    ctx.fillText(`№ ${String(day.number || 1).padStart(3, '0')}  ·  ${formatDate(day.date, true)}`, W - M, 88);
    ctx.textAlign = 'center';

    // title + caption under the card
    let size = 70;
    ctx.font = `500 ${size}px "Cormorant Garamond"`;
    let lines = wrap(ctx, day.title || '', W - M * 2, 2);
    if (lines.length > 1) { size = 58; ctx.font = `500 ${size}px "Cormorant Garamond"`; lines = wrap(ctx, day.title || '', W - M * 2, 2); }
    let y = 1000 + 78;
    lines.forEach(l => { ctx.fillText(l, W / 2, y); y += size; });
    ctx.font = 'italic 500 36px "Cormorant Garamond"';
    const cap = (day.caption || '').trim();
    const capLines = wrap(ctx, cap, W - M * 2 - 80, lines.length > 1 ? 1 : 2);
    const reveal = this.posterMode ? 1 : clamp(t / 2.6);
    ctx.globalAlpha = 0.78 * ease(reveal);
    y += 4;
    capLines.forEach(l => { ctx.fillText(l, W / 2, y); y += 40; });
    ctx.globalAlpha = 1;

    // song line
    ctx.fillStyle = rgba(ink === '#141414' ? '#141414' : '#f3f1ec', 0.62);
    ctx.font = '500 18px "Geist Mono"';
    const song = day.songLabel ? `${day.songLabel}`.toUpperCase() : '';
    let sl = song;
    while (sl && ctx.measureText(sl).width > W - M * 2) sl = sl.slice(0, -2);
    if (sl !== song) sl += '…';
    ctx.fillText(sl, W / 2, H - M + 6);
    ctx.restore();
  }
}

export async function renderPoster(day, bitmaps, width = 720) {
  const c = canvas(W, H);
  const r = new MemoryRenderer(c, day);
  await r.prepare(bitmaps);
  r.posterMode = true;
  r.draw(day.style.sceneDur * 0.45);
  const out = canvas(width, Math.round(width * H / W));
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, 0, 0, out.width, out.height);
  return new Promise(res => out.toBlob(res, 'image/jpeg', 0.88));
}
