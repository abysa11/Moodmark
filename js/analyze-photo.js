// Photo analysis: dominant colours (k-means), light, saturation, warmth, contrast.

export async function loadBitmap(blob) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' }); } catch { /* fallback */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function kmeans(px, k = 5, iters = 10) {
  const n = px.length / 3;
  const cents = [];
  for (let i = 0; i < k; i++) {
    const j = Math.floor(((i + 0.5) / k) * n) * 3;
    cents.push([px[j], px[j + 1], px[j + 2]]);
  }
  const assign = new Uint8Array(n);
  for (let it = 0; it < iters; it++) {
    const sums = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
      let best = 0, bd = Infinity;
      for (let c = 0; c < k; c++) {
        const dr = r - cents[c][0], dg = g - cents[c][1], db = b - cents[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; best = c; }
      }
      assign[i] = best;
      const s = sums[best]; s[0] += r; s[1] += g; s[2] += b; s[3]++;
    }
    sums.forEach((s, c) => { if (s[3]) cents[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (it === iters - 1) return cents.map((c, i) => ({ rgb: c.map(Math.round), weight: sums[i][3] / n }));
  }
}

export function analyzeImage(bitmap) {
  const S = 72;
  const c = document.createElement('canvas');
  const ratio = bitmap.width / bitmap.height;
  c.width = ratio >= 1 ? S : Math.round(S * ratio);
  c.height = ratio >= 1 ? Math.round(S / ratio) : S;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const px = new Float32Array((d.length / 4) * 3);
  let lum = 0, lum2 = 0, sat = 0, warm = 0;
  const n = d.length / 4;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    px[i * 3] = r; px[i * 3 + 1] = g; px[i * 3 + 2] = b;
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    lum += l; lum2 += l * l;
    const [, s] = rgbToHsl(r, g, b);
    sat += s;
    warm += (r - b) / 255;
  }
  lum /= n; sat /= n; warm /= n;
  const contrast = Math.sqrt(Math.max(0, lum2 / n - lum * lum));
  const palette = kmeans(px, 5).sort((a, b) => b.weight - a.weight);
  return { brightness: lum, saturation: sat, warmth: warm, contrast, palette, aspect: ratio };
}

export function combinePhotoStats(stats) {
  if (!stats.length) return null;
  const avg = key => stats.reduce((s, x) => s + x[key], 0) / stats.length;
  const all = stats.flatMap(s => s.palette.map(p => ({ ...p, weight: p.weight / stats.length })));
  // merge near-duplicate colours
  const merged = [];
  all.sort((a, b) => b.weight - a.weight).forEach(p => {
    const m = merged.find(q => Math.hypot(q.rgb[0] - p.rgb[0], q.rgb[1] - p.rgb[1], q.rgb[2] - p.rgb[2]) < 28);
    if (m) m.weight += p.weight; else merged.push({ ...p });
  });
  return {
    brightness: avg('brightness'), saturation: avg('saturation'), warmth: avg('warmth'),
    contrast: avg('contrast'), palette: merged.slice(0, 6), count: stats.length,
  };
}

export const hex = ([r, g, b]) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
