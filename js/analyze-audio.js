// Music analysis. With an audio file: real signal analysis (tempo, energy,
// brightness, key and major/minor). With a link: the user's short description
// (genre, tempo feel, light/dark, year) is mapped through genre priors.

export const GENRES = {
  jazz: { label: 'Джаз, свинг', bpm: 104, energy: 0.38, valence: 0.45, temp: 0.6 },
  classical: { label: 'Классика', bpm: 72, energy: 0.28, valence: 0.15, temp: 0.3 },
  ambient: { label: 'Эмбиент', bpm: 70, energy: 0.15, valence: 0.0, temp: -0.1 },
  lofi: { label: 'Lo-fi, чилл', bpm: 82, energy: 0.28, valence: 0.2, temp: 0.3 },
  acoustic: { label: 'Акустика, фолк', bpm: 96, energy: 0.35, valence: 0.3, temp: 0.5 },
  pop: { label: 'Поп', bpm: 116, energy: 0.62, valence: 0.5, temp: 0.2 },
  indie: { label: 'Инди', bpm: 112, energy: 0.5, valence: 0.1, temp: 0.1 },
  rnb: { label: 'R&B, соул', bpm: 92, energy: 0.45, valence: 0.3, temp: 0.5 },
  hiphop: { label: 'Хип-хоп', bpm: 92, energy: 0.66, valence: 0.05, temp: 0.0 },
  rock: { label: 'Рок', bpm: 128, energy: 0.78, valence: 0.05, temp: 0.1 },
  electronic: { label: 'Электроника', bpm: 126, energy: 0.76, valence: 0.0, temp: -0.6 },
  metal: { label: 'Метал, панк', bpm: 150, energy: 0.95, valence: -0.4, temp: -0.2 },
  ethno: { label: 'Этно, домбра', bpm: 100, energy: 0.45, valence: 0.25, temp: 0.4 },
};

export const TEMPO_FEEL = { slow: 72, medium: 104, fast: 136 };

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- FFT (radix-2, in place) ----------
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// Krumhansl–Schmuckler key profiles
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
}

export async function analyzeAudioFile(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let buf;
  try { buf = await ctx.decodeAudioData(await blob.arrayBuffer()); }
  finally { ctx.close?.(); }

  const sr = buf.sampleRate;
  const duration = buf.duration;
  const start = Math.floor(Math.min(duration * 0.25, Math.max(0, duration - 40)) * sr);
  const len = Math.min(Math.floor(40 * sr), buf.length - start);
  const mono = new Float32Array(len);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i] += ch[start + i] / buf.numberOfChannels;
  }

  // energy envelope + onset strength
  const hop = 512;
  const frames = Math.floor(len / hop);
  const env = new Float32Array(frames);
  let rmsSum = 0;
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = 0; i < hop; i++) { const v = mono[f * hop + i]; s += v * v; }
    env[f] = Math.sqrt(s / hop);
    rmsSum += env[f];
  }
  const rmsMean = rmsSum / frames;
  let rmsVar = 0;
  for (let f = 0; f < frames; f++) rmsVar += (env[f] - rmsMean) ** 2;
  const dynamics = Math.sqrt(rmsVar / frames) / (rmsMean || 1);

  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, Math.log1p(env[f] * 100) - Math.log1p(env[f - 1] * 100));

  // tempo via autocorrelation of the onset envelope (60–190 BPM),
  // weighted toward the perceptual centre (~110 BPM)
  const fps = sr / hop;
  let bestBpm = 100, bestScore = -Infinity;
  for (let bpm = 60; bpm <= 190; bpm += 0.5) {
    const lag = (60 / bpm) * fps;
    const l0 = Math.floor(lag), fr = lag - l0;
    let s = 0;
    for (let f = l0 + 1; f < frames; f++) s += onset[f] * (onset[f - l0] * (1 - fr) + onset[f - l0 - 1] * fr);
    const w = Math.exp(-0.5 * (Math.log2(bpm / 110) / 0.9) ** 2);
    const score = (s / frames) * w;
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }

  // spectrum: centroid (brightness) and chroma (key, mode)
  const N = 4096;
  const re = new Float32Array(N), im = new Float32Array(N);
  const chroma = new Array(12).fill(0);
  let centroidSum = 0, centroidCount = 0;
  const step = Math.max(N, Math.floor(len / 160));
  for (let off = 0; off + N < len; off += step) {
    for (let i = 0; i < N; i++) { re[i] = mono[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))); im[i] = 0; }
    fft(re, im);
    let num = 0, den = 0;
    for (let k = 1; k < N / 2; k++) {
      const mag = Math.hypot(re[k], im[k]);
      const f = (k * sr) / N;
      num += f * mag; den += mag;
      if (f >= 60 && f <= 2200) {
        const pc = ((Math.round(12 * Math.log2(f / 440)) + 69) % 12 + 12) % 12;
        chroma[pc] += mag;
      }
    }
    if (den > 0) { centroidSum += num / den; centroidCount++; }
  }
  const centroid = centroidCount ? centroidSum / centroidCount : 1500;

  let best = { r: -2 }, second = -2;
  for (let k = 0; k < 12; k++) {
    const rot = chroma.slice(k).concat(chroma.slice(0, k));
    const rMaj = corr(rot, MAJOR), rMin = corr(rot, MINOR);
    for (const [r, mode] of [[rMaj, 'major'], [rMin, 'minor']]) {
      if (r > best.r) { second = best.r; best = { r, mode, key: NOTES[k] }; }
      else if (r > second) second = r;
    }
  }

  return {
    source: 'audio',
    bpm: Math.round(bestBpm),
    energy: clamp(rmsMean * 5, 0, 1),
    dynamics: clamp(dynamics, 0, 1.5),
    brightness: clamp((centroid - 600) / 3400, 0, 1),
    centroid: Math.round(centroid),
    mode: best.mode,
    key: best.key,
    keyConfidence: clamp((best.r - second) * 4, 0, 1),
    duration,
  };
}

// Description-only path (link to a streaming service)
export function describeSong(meta) {
  const g = GENRES[meta.genre] || GENRES.pop;
  const bpm = meta.tempo && TEMPO_FEEL[meta.tempo] ? TEMPO_FEEL[meta.tempo] : g.bpm;
  const mode = meta.mood === 'light' ? 'major' : meta.mood === 'dark' ? 'minor' : (g.valence >= 0.2 ? 'major' : 'minor');
  return {
    source: 'description',
    bpm, energy: clamp(g.energy + (bpm - g.bpm) / 300, 0, 1),
    brightness: clamp(0.45 + g.temp * -0.2 + (mode === 'major' ? 0.1 : -0.1), 0, 1),
    mode, modeGuessed: !meta.mood || meta.mood === 'unknown',
    dynamics: 0.4,
  };
}

// Converts musical features into mood coordinates the style engine uses.
export function musicToMood(m, meta = {}) {
  const g = GENRES[meta.genre];
  const tempoA = clamp((m.bpm - 60) / 110, 0, 1);
  const arousal = clamp(tempoA * 0.5 + m.energy * 0.5, 0, 1);
  const valence = clamp((m.mode === 'major' ? 0.35 : -0.35) + (g ? g.valence * 0.5 : 0) + (m.brightness - 0.5) * 0.3, -1, 1);
  const temperature = clamp((g ? g.temp : 0) * 0.7 + (m.mode === 'major' ? 0.15 : -0.15), -1, 1);
  return { arousal, valence, temperature };
}

export function parseSongLink(url) {
  if (!url) return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/);
    const id = host === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || (m && m[1]));
    if (id && /^[\w-]{6,}$/.test(id)) return { service: 'youtube', label: 'YouTube', id, embed: `https://www.youtube-nocookie.com/embed/${id}`, url: u.href };
  }
  if (host === 'music.youtube.com') {
    const id = u.searchParams.get('v');
    if (id) return { service: 'youtube', label: 'YouTube Music', id, embed: `https://www.youtube-nocookie.com/embed/${id}`, url: u.href };
  }
  if (host === 'open.spotify.com') {
    const m = u.pathname.match(/\/(track|album|playlist)\/([\w]+)/);
    if (m) return { service: 'spotify', label: 'Spotify', id: m[2], embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, url: u.href };
  }
  if (host.startsWith('music.yandex.')) {
    const m = u.pathname.match(/album\/(\d+)\/track\/(\d+)/);
    if (m) return { service: 'yandex', label: 'Яндекс Музыка', id: m[2], embed: `https://music.yandex.ru/iframe/#track/${m[2]}/${m[1]}`, url: u.href };
  }
  if (host === 'music.apple.com') return { service: 'apple', label: 'Apple Music', embed: u.href.replace('music.apple.com', 'embed.music.apple.com'), url: u.href };
  if (host === 'soundcloud.com') return { service: 'soundcloud', label: 'SoundCloud', embed: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}&visual=false`, url: u.href };
  return { service: 'link', label: host, url: u.href };
}

// Optional: public oEmbed to prefill artist and title (no personal data sent)
export async function fetchSongTitle(link) {
  const ep = link.service === 'youtube' ? `https://noembed.com/embed?url=${encodeURIComponent(link.url)}`
    : link.service === 'spotify' ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}` : null;
  if (!ep) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(ep, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    return { title: j.title || '', author: j.author_name || '' };
  } catch { return null; }
}
