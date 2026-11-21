// Stickers for the album cover.
//
// Every sticker looks the same way: a shape with a thick white outline, like a
// real die-cut sticker. Ready-made ones are drawn here as SVG; your own are
// made from a photo: the background is removed in the browser (a small
// segmentation model, downloaded once and cached), then the cut-out gets the
// same white outline.
import { loadImage } from './photo.js';

// Glossy "aero" stickers on a 100×100 grid: a body with a top-to-bottom
// gradient, a white shine over its upper half, a light rim, and the thick
// white die-cut outline every sticker has. Parts without their own fill take
// the sticker's gradient.
const G = 'url(#g)';
const SHAPES = {
  star: { c: ['#ffe98f', '#f2a20a'], parts: [['polygon', { points: '50,8 61,38 93,38 67,57 77,89 50,70 23,89 33,57 7,38 39,38' }]] },
  heart: { c: ['#ffb3c9', '#e62e6b'], parts: [['path', { d: 'M50 86C20 66 8 50 8 33 8 19 19 10 31 10c9 0 15 5 19 12 4-7 10-12 19-12 12 0 23 9 23 23 0 17-12 33-42 53z' }]] },
  moon: { c: ['#fff7cf', '#f2bd2c'], parts: [['path', { d: 'M60 8a42 42 0 1 0 32 62A34 34 0 1 1 60 8z' }]] },
  sun: { c: ['#fff6a8', '#ffa30f'], parts: [
    ['path', { d: 'M50 6v12M50 82v12M6 50h12M82 50h12M19 19l8 8M73 73l8 8M81 19l-8 8M27 73l-8 8', stroke: '#ffc93a', 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }],
    ['circle', { cx: 50, cy: 50, r: 23 }],
  ] },
  flower: { c: ['#ffd9ec', '#ff5aa5'], parts: [
    ...[0, 72, 144, 216, 288].map(a => ['circle', { cx: +(50 + 21 * Math.sin(a * Math.PI / 180)).toFixed(1), cy: +(50 - 21 * Math.cos(a * Math.PI / 180)).toFixed(1), r: 16 }]),
    ['circle', { cx: 50, cy: 50, r: 12, fill: '#ffe066' }],
  ] },
  cloud: { c: ['#ffffff', '#9fd3ff'], parts: [['path', { d: 'M27 76h47a19 19 0 0 0 3-38 25 25 0 0 0-47-7 22 22 0 0 0-3 45z' }]] },
  bolt: { c: ['#fff48a', '#ffad00'], parts: [['polygon', { points: '57,6 20,56 45,56 38,94 80,40 55,40 66,6' }]] },
  note: { c: ['#9fe6ff', '#0f6fd0'], parts: [
    ['ellipse', { cx: 36, cy: 76, rx: 17, ry: 13, transform: 'rotate(-20 36 76)' }],
    ['rect', { x: 46, y: 14, width: 8, height: 62 }],
    ['path', { d: 'M54 14c14 6 26 14 24 32-5-10-13-14-24-14z' }],
  ] },
  planet: { c: ['#b5ecff', '#1677d2'], parts: [
    ['circle', { cx: 50, cy: 50, r: 27 }],
    ['ellipse', { cx: 50, cy: 52, rx: 44, ry: 12, transform: 'rotate(-18 50 52)', fill: 'none', stroke: '#ffd36b', 'stroke-width': 6 }],
  ] },
  leaf: { c: ['#c4f58a', '#2b9a3a'], parts: [
    ['path', { d: 'M18 84C18 42 44 14 88 14c0 44-28 70-70 70z' }],
    ['path', { d: 'M22 80 70 32', stroke: '#eaffd6', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none', opacity: 0.8 }],
  ] },
  camera: { c: ['#e3f2ff', '#5e8fc4'], parts: [
    ['rect', { x: 8, y: 28, width: 84, height: 58, rx: 12 }],
    ['rect', { x: 34, y: 18, width: 32, height: 16, rx: 5 }],
    ['circle', { cx: 50, cy: 57, r: 19, fill: '#173452' }],
    ['circle', { cx: 50, cy: 57, r: 11, fill: '#7fd0ff' }],
  ] },
  drop: { c: ['#d4f4ff', '#1585df'], parts: [['path', { d: 'M50 6C50 6 18 46 18 66a32 32 0 0 0 64 0C82 46 50 6 50 6z' }]] },
  bubble: { c: ['#e8f8ff', '#7cc6ff'], bubble: true, parts: [['circle', { cx: 50, cy: 50, r: 42 }]] },
};
export const PRESETS = [
  { id: 'bubble', name: 'Пузырь' }, { id: 'drop', name: 'Капля' }, { id: 'star', name: 'Звезда' },
  { id: 'heart', name: 'Сердце' }, { id: 'moon', name: 'Луна' }, { id: 'sun', name: 'Солнце' },
  { id: 'flower', name: 'Цветок' }, { id: 'cloud', name: 'Облако' }, { id: 'bolt', name: 'Молния' },
  { id: 'note', name: 'Нота' }, { id: 'planet', name: 'Планета' }, { id: 'leaf', name: 'Лист' },
  { id: 'camera', name: 'Камера' }, { id: 'cat', name: 'Кот Moodmark' },
];

const attrs = a => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
const el = (tag, a) => `<${tag} ${attrs(a)}/>`;
function svgOf(id) {
  const { c, parts, bubble } = SHAPES[id];
  const outline = parts.map(([tag, a]) => el(tag, { ...a, fill: a.fill === 'none' ? 'none' : '#fff', stroke: '#fff', 'stroke-width': Number(a['stroke-width'] || 0) + 12, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 1 })).join('');
  const body = parts.map(([tag, a]) => el(tag, { ...a, fill: a.fill ?? G })).join('');
  const clip = parts.filter(([, a]) => a.fill !== 'none').map(([tag, a]) => el(tag, { ...a, fill: '#000', stroke: 'none' })).join('');
  const rim = parts.filter(([, a]) => a.fill !== 'none').map(([tag, a]) => el(tag, { ...a, fill: 'none', stroke: 'rgba(255,255,255,0.75)', 'stroke-width': 1.5 })).join('');
  const fill = bubble
    ? `<radialGradient id="g" cx="0.5" cy="0.55" r="0.55"><stop offset="0" stop-color="#ffffff" stop-opacity="0.15"/><stop offset="0.7" stop-color="${c[1]}" stop-opacity="0.35"/><stop offset="0.93" stop-color="${c[1]}" stop-opacity="0.85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.95"/></radialGradient>`
    : `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112"><defs>${fill}
    <linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="c">${clip}</clipPath></defs>
    ${outline}${body}
    <ellipse cx="44" cy="${bubble ? 28 : 26}" rx="${bubble ? 26 : 46}" ry="${bubble ? 14 : 24}" fill="url(#h)" clip-path="url(#c)"/>
    ${rim}</svg>`;
}
const svgURL = id => 'data:image/svg+xml,' + encodeURIComponent(svgOf(id));

// The cat: the white logo inside a clear bubble, outlined like the rest.
let catURL = null;
const catReady = loadImage('assets/logo.png').then(img => {
  const S = 480, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // clear body with a bright rim and a faint blue inside
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(110,185,245,0.38)'); g.addColorStop(0.62, 'rgba(110,185,245,0.3)');
  g.addColorStop(0.84, 'rgba(225,244,255,0.6)'); g.addColorStop(0.97, 'rgba(255,255,255,0.98)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
  // the logo in white
  const w = document.createElement('canvas');
  w.width = w.height = S;
  const wx = w.getContext('2d');
  wx.drawImage(img, S * 0.2, S * 0.2, S * 0.6, S * 0.6);
  wx.globalCompositeOperation = 'source-in';
  wx.fillStyle = '#fff'; wx.fillRect(0, 0, S, S);
  x.save(); x.shadowColor = 'rgba(0,70,160,0.7)'; x.shadowBlur = 14; x.shadowOffsetY = 3;
  x.drawImage(w, 0, 0); x.restore();
  // shine on the upper half
  x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.clip();
  const h = x.createLinearGradient(0, 0, 0, S * 0.5);
  h.addColorStop(0, 'rgba(255,255,255,0.75)'); h.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = h; x.beginPath(); x.ellipse(S * 0.46, S * 0.24, S * 0.38, S * 0.2, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  catURL = outline(c, { min: 0, keep: false });
}).catch(() => {});

// A sticker on the cover stores `src` as 'p:<preset>' or 'lib:<id>'.
export function stickerSrc(src, library = []) {
  if (src.startsWith('p:')) {
    const id = src.slice(2);
    if (id === 'cat') return catURL || '';
    return SHAPES[id] ? svgURL(id) : '';
  }
  if (src.startsWith('lib:')) return library.find(l => l.id === src.slice(4))?.src || '';
  return '';
}
export const stickersReady = () => catReady;

// ---------- white outline around a cut-out ----------
// Keeps the main object (the largest solid area and anything nearly as big),
// drops stray specks the model left behind, trims to it, scales to `size`,
// grows the silhouette by a thick white band (about 5% of the size) and puts
// the image on top.
function keepMain(d, w, h) {
  const n = w * h, solid = new Uint8Array(n), comp = new Int32Array(n).fill(-1), sizes = [];
  for (let i = 0; i < n; i++) solid[i] = d[i * 4 + 3] >= 110;
  const stack = [];
  for (let i = 0; i < n; i++) {
    if (!solid[i] || comp[i] >= 0) continue;
    const id = sizes.length;
    let count = 0;
    comp[i] = id; stack.push(i);
    while (stack.length) {
      const p = stack.pop();
      count++;
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < n && solid[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
      }
    }
    sizes.push(count);
  }
  if (!sizes.length) return false;
  const big = Math.max(...sizes);
  const keep = sizes.map(c => c >= Math.max(big * 0.12, 50));
  const kept = i => comp[i] >= 0 && keep[comp[i]];
  for (let i = 0; i < n; i++) {
    const a = i * 4 + 3;
    if (kept(i)) { d[a] = Math.min(255, Math.round(d[a] * 1.4)); continue; }
    // soft edge pixels stay only right next to the object
    const x = i % w;
    const edge = d[a] > 0 && ((x > 0 && kept(i - 1)) || (x < w - 1 && kept(i + 1)) || (i >= w && kept(i - w)) || (i + w < n && kept(i + w)));
    if (!edge) d[a] = 0;
  }
  return true;
}

export function outline(src, { size = 480, min = 40, keep = true } = {}) {
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
  const a = document.createElement('canvas');
  a.width = w0; a.height = h0;
  const ax = a.getContext('2d', { willReadFrequently: true });
  ax.drawImage(src, 0, 0);
  const img = ax.getImageData(0, 0, w0, h0), d = img.data;
  if (keep && !keepMain(d, w0, h0)) throw new Error('empty cut-out');
  ax.putImageData(img, 0, 0);
  let x0 = w0, y0 = h0, x1 = -1, y1 = -1;
  for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
    if (d[(y * w0 + x) * 4 + 3] > min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error('empty cut-out');
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const s = size / Math.max(bw, bh);
  const w = Math.round(bw * s), h = Math.round(bh * s);
  const R = Math.round(size * 0.05), pad = R + 4;

  // the cut-out, scaled
  const cut = document.createElement('canvas');
  cut.width = w; cut.height = h;
  const cx = cut.getContext('2d');
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(a, x0, y0, bw, bh, 0, 0, w, h);

  // its silhouette with a hard edge, so the band has a clean border
  const mask = document.createElement('canvas');
  mask.width = w; mask.height = h;
  const mx = mask.getContext('2d', { willReadFrequently: true });
  mx.drawImage(cut, 0, 0);
  const md = mx.getImageData(0, 0, w, h);
  const edge = keep ? 96 : 8; // a clear sticker (the bubble) counts its faint inside as body
  for (let i = 3; i < md.data.length; i += 4) md.data[i] = md.data[i] > edge ? 255 : 0;
  mx.putImageData(md, 0, 0);

  const out = document.createElement('canvas');
  out.width = w + pad * 2; out.height = h + pad * 2;
  const ox = out.getContext('2d');
  for (const r of [R, R * 0.66, R * 0.33]) {
    for (let k = 0; k < 40; k++) {
      const t = (k / 40) * Math.PI * 2;
      ox.drawImage(mask, pad + Math.cos(t) * r, pad + Math.sin(t) * r);
    }
  }
  ox.globalCompositeOperation = 'source-in';
  ox.fillStyle = '#fff';
  ox.fillRect(0, 0, out.width, out.height);
  ox.globalCompositeOperation = 'source-over';
  ox.drawImage(cut, pad, pad);
  return out.toDataURL('image/png');
}

// ---------- background removal ----------
const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

async function smaller(file, max = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

// Fallback when the model can't load (offline): removes the background color
// that touches the edges of the photo. Works for objects on a plain backdrop.
async function floodCut(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const w = img.naturalWidth, h = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, w, h), d = im.data;
    const seen = new Uint8Array(w * h);
    const stack = [];
    const near = (i, j) => Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) < 42;
    for (let i = 0; i < w; i++) stack.push(i, (h - 1) * w + i);
    for (let j = 0; j < h; j++) stack.push(j * w, j * w + w - 1);
    for (const p of stack) seen[p] = 1;
    while (stack.length) {
      const p = stack.pop();
      d[p * 4 + 3] = 0;
      const px = p % w, py = (p - px) / w;
      for (const q of [px > 0 && p - 1, px < w - 1 && p + 1, py > 0 && p - w, py < h - 1 && p + w]) {
        if (q === false || seen[q]) continue;
        if (near(p * 4, q * 4)) { seen[q] = 1; stack.push(q); }
      }
    }
    x.putImageData(im, 0, 0);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

// Photo → outlined sticker (PNG data URL). onProgress gets 0..1 while the
// model downloads the first time.
export async function makeSticker(file, onProgress = () => {}) {
  const input = await smaller(file);
  let cut;
  try {
    const { removeBackground } = await import(LIB);
    const blob = await removeBackground(input, {
      model: 'isnet_quint8',
      output: { format: 'image/png' },
      progress: (key, cur, total) => { if (key.startsWith('fetch:') && total) onProgress(cur / total); },
    });
    const url = URL.createObjectURL(blob);
    try { cut = await loadImage(url); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  } catch (e) {
    console.warn('[stickers] model unavailable, using edge fill:', e);
    cut = await floodCut(input);
  }
  return outline(cut);
}
