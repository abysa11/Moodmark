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

// Mixes the photo's colors with the mood's: the grayer the photo, the more the
// mood's own colors show (a gray wall shouldn't make a joyful day gray).
export function moodPalette(photoPal, tint, vivid) {
  const parse = c => c.startsWith('#') ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number);
  const k = Math.min(0.85, 0.3 + (1 - vivid) * 0.6);
  return photoPal.map((c, i) => {
    const a = parse(c), b = parse(tint[i % tint.length]);
    return `rgb(${a.map((v, j) => Math.round(v * (1 - k) + b[j] * k)).join(',')})`;
  });
}

export function paintBlur(canvas, img, grade, warmth = 0, tint = null) {
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

  // the mood sets the direction of the light; the photo can soften it, not turn it around
  let w = grade.warm * 0.8 + warmth * 0.3;
  if (grade.warm > 0.2) w = Math.max(w, grade.warm * 0.6);
  if (grade.warm < -0.2) w = Math.min(w, grade.warm * 0.6);
  w = Math.max(-1, Math.min(1, w));
  if (Math.abs(w) > 0.05) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = w > 0 ? `rgba(255,170,90,${0.35 * w})` : `rgba(80,130,255,${-0.35 * w})`;
    ctx.fillRect(0, 0, W, H);
  }
  // the mood's own color, stronger over a gray photo
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
