// Stickers for the album cover.
//
// Every sticker looks the same way: a shape with a thick white outline, like a
// real die-cut sticker. Ready-made ones are drawn here as SVG; your own are
// made from a photo: the background is removed in the browser (a small
// segmentation model, downloaded once and cached), then the cut-out gets the
// same white outline.
import { loadImage } from './photo.js';

// [tag, attributes] lists on a 100×100 grid. The white outline is built from
// the same shapes, drawn first in white with a wide stroke.
const SHAPES = {
  star: [['polygon', { points: '50,8 61,38 93,38 67,57 77,89 50,70 23,89 33,57 7,38 39,38', fill: '#f5c542' }]],
  heart: [['path', { d: 'M50 86C20 66 8 50 8 33 8 19 19 10 31 10c9 0 15 5 19 12 4-7 10-12 19-12 12 0 23 9 23 23 0 17-12 33-42 53z', fill: '#e5484d' }]],
  moon: [['path', { d: 'M60 8a42 42 0 1 0 32 62A34 34 0 1 1 60 8z', fill: '#f0d28a' }]],
  sun: [
    ['g', { stroke: '#f29a38', 'stroke-width': 7, 'stroke-linecap': 'round' }, [
      ['path', { d: 'M50 6v12M50 82v12M6 50h12M82 50h12M19 19l8 8M73 73l8 8M81 19l-8 8M27 73l-8 8' }],
    ]],
    ['circle', { cx: 50, cy: 50, r: 22, fill: '#f7b84b' }],
  ],
  flower: [
    ...[0, 72, 144, 216, 288].map(a => ['circle', { cx: 50 + 21 * Math.sin(a * Math.PI / 180), cy: 50 - 21 * Math.cos(a * Math.PI / 180), r: 16, fill: '#f4a6b8' }]),
    ['circle', { cx: 50, cy: 50, r: 12, fill: '#f5c542' }],
  ],
  cloud: [['path', { d: 'M27 76h47a19 19 0 0 0 3-38 25 25 0 0 0-47-7 22 22 0 0 0-3 45z', fill: '#a9c7ec' }]],
  bolt: [['polygon', { points: '57,6 20,56 45,56 38,94 80,40 55,40 66,6', fill: '#ffd23f' }]],
  note: [
    ['ellipse', { cx: 36, cy: 76, rx: 17, ry: 13, transform: 'rotate(-20 36 76)', fill: '#1b1b1d' }],
    ['rect', { x: 46, y: 14, width: 8, height: 62, fill: '#1b1b1d' }],
    ['path', { d: 'M54 14c14 6 26 14 24 32-5-10-13-14-24-14z', fill: '#1b1b1d' }],
  ],
  planet: [
    ['circle', { cx: 50, cy: 50, r: 27, fill: '#7aa6d8' }],
    ['ellipse', { cx: 50, cy: 52, rx: 44, ry: 12, transform: 'rotate(-18 50 52)', fill: 'none', stroke: '#e9b44c', 'stroke-width': 6 }],
  ],
  leaf: [
    ['path', { d: 'M18 84C18 42 44 14 88 14c0 44-28 70-70 70z', fill: '#5f9e6e' }],
    ['path', { d: 'M22 80 70 32', stroke: '#3f7a50', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }],
  ],
  camera: [
    ['rect', { x: 8, y: 28, width: 84, height: 58, rx: 10, fill: '#2c2d31' }],
    ['rect', { x: 34, y: 18, width: 32, height: 16, rx: 4, fill: '#2c2d31' }],
    ['circle', { cx: 50, cy: 57, r: 19, fill: '#e8e8ea' }],
    ['circle', { cx: 50, cy: 57, r: 11, fill: '#2c2d31' }],
  ],
};
export const PRESETS = [
  { id: 'star', name: 'Звезда' }, { id: 'heart', name: 'Сердце' }, { id: 'moon', name: 'Луна' },
  { id: 'sun', name: 'Солнце' }, { id: 'flower', name: 'Цветок' }, { id: 'cloud', name: 'Облако' },
  { id: 'bolt', name: 'Молния' }, { id: 'note', name: 'Нота' }, { id: 'planet', name: 'Планета' },
  { id: 'leaf', name: 'Лист' }, { id: 'camera', name: 'Камера' }, { id: 'cat', name: 'Кот Moodmark' },
];

const attrs = a => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');
function draw(list, outline) {
  return list.map(([tag, a, kids]) => {
    let at = a;
    if (outline) {
      const sw = Number(a['stroke-width'] || 0) + 12;
      at = { ...a, stroke: '#fff', 'stroke-width': sw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
      if (a.fill && a.fill !== 'none') at.fill = '#fff';
    }
    return kids ? `<${tag} ${attrs(at)}>${draw(kids, outline)}</${tag}>` : `<${tag} ${attrs(at)}/>`;
  }).join('');
}
const svgURL = id => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112">${draw(SHAPES[id], true)}${draw(SHAPES[id], false)}</svg>`);

// The cat comes from the logo file, outlined on the fly.
let catURL = null;
const catReady = loadImage('assets/logo.png').then(img => { catURL = outline(img, { min: 0 }); }).catch(() => {});

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

export function outline(src, { size = 480, min = 40 } = {}) {
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
  const a = document.createElement('canvas');
  a.width = w0; a.height = h0;
  const ax = a.getContext('2d', { willReadFrequently: true });
  ax.drawImage(src, 0, 0);
  const img = ax.getImageData(0, 0, w0, h0), d = img.data;
  if (!keepMain(d, w0, h0)) throw new Error('empty cut-out');
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
  for (let i = 3; i < md.data.length; i += 4) md.data[i] = md.data[i] > 96 ? 255 : 0;
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
