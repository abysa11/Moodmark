// Photo helpers for the memory view and for storage.

export function fitRect(iw, ih, W, H, maxW = 0.62, maxH = 0.66) {
  const s = Math.min((W * maxW) / iw, (H * maxH) / ih);
  const w = Math.round(iw * s), h = Math.round(ih * s);
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}

const canvasFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

// The memory's background: the same photo, enlarged to cover the screen and
// deeply blurred, then lit by the mood (warm or cool) with a soft vignette.
// How colorful an image is, 0 (gray) … 1 (vivid).
export function colorfulness(img) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 32, 32);
  const d = x.getImageData(0, 0, 32, 32).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
  return Math.min(1, sum / (d.length / 4) / 90);
}

// ---------- the day's colors ----------
// Colors come from the day itself, never from a mood: the photo's own colors,
// and where the photo is gray, the colors of the song's cover. The mood only
// treats them: richer for joy, muted for sadness, faded for nostalgia…
const parse = c => (c.startsWith('#') ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number));
function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function toRgb([h, s, l]) {
  if (!s) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => Math.round(v * 255));
}
// The mood's treatment of a color: saturation, lightness, contrast around the
// middle, and fading (like old film: less saturated, lifted toward paper-white).
export function treatColor(c, t = {}) {
  let [h, s, l] = toHsl(parse(c));
  s = Math.min(1, s * (t.sat ?? 1));
  l = 0.5 + (l - 0.5) * (t.contrast ?? 1) + (t.light ?? 0);
  if (t.fade) { s *= 1 - t.fade; l = l + (0.86 - l) * t.fade * 0.6; }
  return `rgb(${toRgb([h, Math.max(0, s), Math.max(0.04, Math.min(0.96, l))]).join(',')})`;
}
// The light of the memory: the photo's colors first; the grayer the photo, the
// more the song cover's colors take over. Then the mood's treatment.
export function dayPalette(photoPal, artPal, vivid, treat) {
  const take = artPal ? Math.max(0, Math.min(0.85, (0.55 - vivid) * 1.6)) : 0;
  return photoPal.map((c, i) => {
    const a = parse(c), b = artPal ? parse(artPal[i % artPal.length]) : a;
    const mix = `rgb(${a.map((v, j) => Math.round(v * (1 - take) + b[j] * take)).join(',')})`;
    return treatColor(mix, treat);
  });
}

// light: { warm: -1…1 from the day (time of day, the photo), tint: { color, strength } | null }
export function paintBlur(canvas, img, grade, light = {}) {
  const tint = light.tint || null;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const k = 0.5; // the blur hides detail anyway: half resolution keeps it fast
  canvas.width = Math.max(1, Math.round(W * k));
  canvas.height = Math.max(1, Math.round(H * k));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);

  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(W / iw, H / ih) * 1.15;
  const tone = `brightness(${grade.bright}) saturate(${grade.sat})`;
  if (canvasFilter) {
    ctx.filter = `blur(${grade.blur}px) ${tone}`;
    ctx.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
    ctx.filter = 'none';
    canvas.style.filter = '';
  } else {
    // Safari can't filter inside a canvas: shrink the photo to a few dozen
    // pixels and stretch it back (that is a strong blur), then smooth and tone
    // it with a CSS filter on the canvas itself.
    const step = Math.max(16, grade.blur);
    let t = document.createElement('canvas');
    t.width = Math.max(4, Math.round(W / step)); t.height = Math.max(4, Math.round(H / step));
    const tx = t.getContext('2d');
    tx.imageSmoothingQuality = 'high';
    const ts = t.width / W;
    tx.drawImage(img, ((W - iw * s) / 2) * ts, ((H - ih * s) / 2) * ts, iw * s * ts, ih * s * ts);
    // the photo's average color under everything, so stretched edges never go see-through
    const one = document.createElement('canvas');
    one.width = one.height = 1;
    const ox = one.getContext('2d', { willReadFrequently: true });
    ox.drawImage(t, 0, 0, 1, 1);
    const [r, g, b] = ox.getImageData(0, 0, 1, 1).data;
    const base = `rgb(${r},${g},${b})`;
    // grow it back in 2× steps so the stretch stays smooth, not blocky
    while (t.width * 2 < W * k) {
      const u = document.createElement('canvas');
      u.width = t.width * 2; u.height = t.height * 2;
      const ux = u.getContext('2d');
      ux.fillStyle = base; ux.fillRect(0, 0, u.width, u.height);
      ux.imageSmoothingQuality = 'high';
      ux.drawImage(t, 0, 0, u.width, u.height);
      t = u;
    }
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(t, 0, 0, W, H);
    canvas.style.filter = `blur(${Math.round(grade.blur * 0.5)}px) ${tone}`;
  }

  // warm or cool light comes from the day (its hour, its photo), not the mood
  const w = Math.max(-1, Math.min(1, light.warm || 0));
  if (Math.abs(w) > 0.05) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = w > 0 ? `rgba(255,170,90,${0.35 * w})` : `rgba(80,130,255,${-0.35 * w})`;
    ctx.fillRect(0, 0, W, H);
  }
  // over a gray photo, a wash of the song cover's color
  if (tint) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = tint.strength;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// Shrinks a photo before storing it; returns a JPEG blob.
export async function shrink(file, max = 2200, quality = 0.88) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  } finally { URL.revokeObjectURL(url); }
}

// Small data URL of a photo for the vision model.
export async function thumbDataURL(blob, max = 512) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}

// A light copy of a photo for the album pages: page turns stay smooth on
// phones even with many photos. Returns a JPEG blob.
export async function thumbBlob(blob, max = 720) {
  const bmp = await createImageBitmap(blob);
  try {
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  } finally { bmp.close(); }
}

// The photo's own colors: up to three dominant, clearly different colors,
// with a little preference for color over gray. Returns ['rgb(…)', …].
export function paletteOf(img, count = 3) {
  const c = document.createElement('canvas');
  c.width = 40; c.height = 40;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 40, 40);
  const d = x.getImageData(0, 0, 40, 40).data;
  const bins = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    const bin = bins.get(key) || { n: 0, r: 0, g: 0, b: 0, w: 0 };
    bin.n++; bin.r += r; bin.g += g; bin.b += b; bin.w += 1 + sat / 64;
    bins.set(key, bin);
  }
  const picked = [];
  for (const bin of [...bins.values()].sort((a, b) => b.w - a.w)) {
    const col = [bin.r / bin.n, bin.g / bin.n, bin.b / bin.n];
    if (picked.every(p => Math.hypot(p[0] - col[0], p[1] - col[1], p[2] - col[2]) > 60)) picked.push(col);
    if (picked.length === count) break;
  }
  while (picked.length < count) picked.push(picked[0] || [200, 200, 205]);
  return picked.map(([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`);
}
