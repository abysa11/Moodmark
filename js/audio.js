// Sound for the memory view.
//
// 1. beatsOf(url): reads the song's 30-second preview and finds its tempo
//    (beats per minute), where the beats fall, the strongest accents and how
//    energetic it is, so photos change in time with the music and the light
//    is as lively as the song.
// 2. Ambience: soft background sound (rain, wind, sea, street, fire), made
//    right in the browser from filtered noise. It is offered only when the
//    entry itself mentions it, and it is off until the person turns it on.

let ctx = null;
export const audioCtx = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

// ---------- tempo and accents ----------
const cache = new Map();

export function beatsOf(url) {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) cache.set(url, analyse(url).catch(e => { console.warn('[beats]', e); return null; }));
  return cache.get(url);
}

async function analyse(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('preview ' + res.status);
  const buf = await audioCtx().decodeAudioData(await res.arrayBuffer());
  const sr = buf.sampleRate, data = buf.getChannelData(0);
  const hop = 512, n = Math.floor(data.length / hop);
  const fps = sr / hop;

  // loudness per frame, then how much it rises (onset strength)
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop, e = j + hop; j < e; j++) s += data[j] * data[j];
    env[i] = Math.sqrt(s / hop);
  }
  const onset = new Float32Array(n);
  for (let i = 1; i < n; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);

  // tempo: the beat period (70–180 BPM) where onsets repeat most strongly
  let best = 0, bestLag = 0;
  const lo = Math.floor(fps * 60 / 180), hi = Math.ceil(fps * 60 / 70);
  for (let lag = lo; lag <= hi; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
    // a gentle preference for 90–140 BPM, where most songs feel their pulse
    const bpm = 60 * fps / lag;
    s *= 1 - Math.min(0.25, Math.abs(bpm - 115) / 400);
    if (s > best) { best = s; bestLag = lag; }
  }
  if (!bestLag) return null;

  // phase: where the beat grid lines up with the onsets
  let bestPhase = 0, bestSum = -1;
  for (let ph = 0; ph < bestLag; ph++) {
    let s = 0;
    for (let i = ph; i < n; i += bestLag) s += onset[i];
    if (s > bestSum) { bestSum = s; bestPhase = ph; }
  }

  // accents: clear peaks well above the usual onset level
  let mean = 0;
  for (let i = 0; i < n; i++) mean += onset[i];
  mean /= n;
  let sd = 0;
  for (let i = 0; i < n; i++) sd += (onset[i] - mean) ** 2;
  sd = Math.sqrt(sd / n);
  const accents = [];
  for (let i = 1; i < n - 1; i++) {
    if (onset[i] > mean + 2.2 * sd && onset[i] >= onset[i - 1] && onset[i] >= onset[i + 1]) accents.push(i / fps);
  }

  // energy 0…1: how loud the song is and how often it hits hard
  let loud = 0;
  for (let i = 0; i < n; i++) loud += env[i];
  loud /= n;
  const energy = Math.max(0, Math.min(1, 0.5 * Math.min(1, loud / 0.2) + 0.5 * Math.min(1, accents.length / buf.duration / 2.5)));

  return { bpm: 60 * fps / bestLag, period: bestLag / fps, offset: bestPhase / fps, accents, duration: buf.duration, energy };
}

// ---------- ambience ----------
export const AMBIENCE = {
  rain: { name: 'Дождь', words: /дожд|ливен|ливн|гроз|капл[иья] по|rain/i },
  wind: { name: 'Ветер', words: /ветер|ветр[аеу]|ветрен|вьюг|метел|wind/i },
  sea: { name: 'Море', words: /мор[еяю]|волн|прибой|пляж|океан|sea|beach|ocean/i },
  street: { name: 'Улица', words: /улиц|город[ау]?\b|пробк|машин|трафик|метро|street|city|traffic/i },
  fire: { name: 'Костёр', words: /кост[её]р|камин|огон[ёь]|fireplace|campfire/i },
};

// The entry's own sound, if it names one: the AI's reading first, then the words of the entry.
export function ambienceOf(entry) {
  if (entry.ambience && AMBIENCE[entry.ambience]) return entry.ambience;
  const text = `${entry.text || ''} ${entry.title || ''}`;
  return Object.keys(AMBIENCE).find(k => AMBIENCE[k].words.test(text)) || null;
}

function noise(c, seconds = 2, brown = false) {
  const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}
function loop(c, buffer) {
  const s = c.createBufferSource();
  s.buffer = buffer; s.loop = true;
  return s;
}
function filter(c, type, freq, q = 0.7) {
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}
function lfo(c, rate, depth, target) {
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.value = rate; g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
}

// Starts an ambience; returns { stop() }. `level` is the final volume.
export function playAmbience(kind, level = 0.22) {
  const c = audioCtx();
  c.resume?.();
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(c.destination);
  out.gain.linearRampToValueAtTime(level, c.currentTime + 2.5);
  const nodes = [];
  const start = n => { n.start(); nodes.push(n); return n; };
  let timer = null;

  // short filtered noise bursts: rain drops, fire crackles, passing cars
  const burst = (freq, dur, gain, type = 'bandpass', q = 1.5) => {
    const s = c.createBufferSource();
    s.buffer = white;
    const f = filter(c, type, freq, q), g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.02, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  };
  const white = noise(c), brown = noise(c, 4, true);

  if (kind === 'rain') {
    const s = start(loop(c, white));
    s.connect(filter(c, 'highpass', 900)).connect(filter(c, 'lowpass', 7000)).connect(gainOf(c, 0.35, out));
    timer = setInterval(() => { if (Math.random() < 0.7) burst(2500 + Math.random() * 3000, 0.04, 0.25 * Math.random(), 'bandpass', 4); }, 45);
  } else if (kind === 'wind') {
    const s = start(loop(c, brown));
    const f = filter(c, 'bandpass', 420, 0.6), g = gainOf(c, 0.9, out);
    s.connect(f).connect(g);
    nodes.push(lfo(c, 0.07, 220, f.frequency), lfo(c, 0.11, 0.45, g.gain));
  } else if (kind === 'sea') {
    const s = start(loop(c, brown));
    const f = filter(c, 'lowpass', 900), g = gainOf(c, 0.7, out);
    s.connect(f).connect(g);
    nodes.push(lfo(c, 0.09, 0.55, g.gain), lfo(c, 0.09, 500, f.frequency));
  } else if (kind === 'street') {
    const s = start(loop(c, brown));
    s.connect(filter(c, 'lowpass', 320)).connect(gainOf(c, 0.8, out));
    timer = setInterval(() => { if (Math.random() < 0.25) burst(500 + Math.random() * 500, 2.5 + Math.random() * 2, 0.18, 'bandpass', 0.8); }, 1500);
  } else if (kind === 'fire') {
    const s = start(loop(c, brown));
    s.connect(filter(c, 'lowpass', 600)).connect(gainOf(c, 0.6, out));
    timer = setInterval(() => { if (Math.random() < 0.35) burst(3000 + Math.random() * 4000, 0.03 + Math.random() * 0.05, 0.4 * Math.random(), 'highpass', 0.7); }, 70);
  }

  return {
    stop() {
      clearInterval(timer);
      const t = c.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => { nodes.forEach(n => { try { n.stop(); } catch { /* already stopped */ } }); out.disconnect(); }, 1400);
    },
  };
}
function gainOf(c, v, dest) { const g = c.createGain(); g.gain.value = v; g.connect(dest); return g; }
