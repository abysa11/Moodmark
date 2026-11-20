// Photo helpers for the memory view and for storage.

export function fitRect(iw, ih, W, H, maxW = 0.62, maxH = 0.66) {
  const s = Math.min((W * maxW) / iw, (H * maxH) / ih);
  const w = Math.round(iw * s), h = Math.round(ih * s);
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}

const canvasFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;

// The memory's background: the same photo, enlarged to cover the screen and
// deeply blurred, then lit by the mood (warm or cool) with a soft vignette.
export function paintBlur(canvas, img, grade, warmth = 0) {
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

  const w = Math.max(-1, Math.min(1, grade.warm * 0.7 + warmth * 0.5));
  if (Math.abs(w) > 0.05) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = w > 0 ? `rgba(255,170,90,${0.35 * w})` : `rgba(80,130,255,${-0.35 * w})`;
    ctx.fillRect(0, 0, W, H);
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
