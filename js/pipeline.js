// Day pipeline: input → analysis → style → title → memory poster → folder.

import { db, uid } from './db.js';
import { analyzeText } from './analyze-text.js';
import { loadBitmap, analyzeImage, combinePhotoStats } from './analyze-photo.js';
import { analyzeAudioFile, describeSong } from './analyze-audio.js';
import { buildStyle } from './style.js';
import { makeTitle } from './naming.js';
import { renderPoster } from './renderer.js';
import { aiReadEntry } from './ai.js';

async function normalizePhoto(blob, max = 1600) {
  const bmp = await loadBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.88));
  return { blob: out, bitmap: c };
}

export function songLabel(song) {
  const m = song?.meta || {};
  if (m.artist || m.title) return [m.artist, m.title].filter(Boolean).join(' — ');
  if (song?.fileName) return song.fileName.replace(/\.[^.]+$/, '');
  return '';
}

export const detectLang = text => (/[әғқңөұүһі]/i.test(text) ? 'kk' : /[а-яё]/i.test(text) ? 'ru' : 'en');
// without the AI, Kazakh and English entries get a title from their own first words
function plainTitle(text) {
  const words = (text.split(/(?<=[.!?…])\s+/)[0] || text).replace(/[«»"“”.!?…,;:]/g, '').split(/\s+/).filter(Boolean).slice(0, 6);
  const s = words.join(' ');
  return s ? s[0].toUpperCase() + s.slice(1) : '…';
}

const WEATHER_RU = { sun: 'солнце', rain: 'дождь', snow: 'снег', fog: 'туман', wind: 'ветер' };

// AI reading leads (70%), the stem dictionary keeps it honest (30%).
function mergeAI(t, ai) {
  if (!ai) return t;
  const out = { ...t, ai };
  out.valence = ai.valence * 0.7 + t.valence * 0.3;
  out.arousal = ai.arousal * 0.7 + t.arousal * 0.3;
  out.temperature = ai.temperature * 0.6 + t.temperature * 0.4;
  if (ai.season && !t.seasonFromText) { out.season = ai.season; out.seasonFromText = true; }
  if (ai.timeOfDay && !t.timeOfDay) out.timeOfDay = ai.timeOfDay;
  if (ai.weather && !t.weather.length) out.weather = [{ key: ai.weather, label: WEATHER_RU[ai.weather] }];
  if (ai.caption) out.caption = ai.caption.length > 96 ? ai.caption.slice(0, 92).replace(/\s+\S*$/, '') + '…' : ai.caption;
  return out;
}

export async function analyzeDay(input, onStep = () => {}) {
  const { text, date, extras = {} } = input;
  onStep('ai');
  const ai = input.ai !== undefined ? input.ai : await aiReadEntry(text);
  onStep('text');
  const t = mergeAI(analyzeText(text, date), ai);

  onStep('photos');
  const norm = await Promise.all(input.photos.map(p => normalizePhoto(p)));
  const stats = norm.map(n => analyzeImage(n.bitmap));
  const photo = combinePhotoStats(stats);

  onStep('music');
  const meta = input.song?.meta || {};
  let music;
  if (input.song?.file) {
    try { music = await analyzeAudioFile(input.song.file); }
    catch (e) { console.warn('audio analysis failed', e); music = describeSong(meta); music.fallback = true; }
  } else music = describeSong(meta);

  onStep('style');
  const style = buildStyle({ text: t, photo, music, musicMeta: meta, extras });
  let title, rule;
  if (ai?.title) { title = ai.title; rule = `название предложил ИИ (${ai.model.split('/')[1]?.replace(':free', '') || ai.model}) по правилу тона`; }
  else if (detectLang(text) !== 'ru') { title = plainTitle(text); rule = 'первые слова записи'; }
  else ({ title, rule } = makeTitle({ ...t, timeOfDay: extras.timeOfDay || t.timeOfDay }, style.regime));
  style.why.push({ src: 'Название', text: `<b>${title}</b>: ${rule}. Тон один для всех папок: 3–7 слов, без глаголов.` });

  return { t, ai, photo, music, style, title, titleRule: rule, photos: norm };
}

export async function createDay(input, onStep = () => {}) {
  const a = await analyzeDay(input, onStep);
  const existing = await db.all();
  const day = {
    id: input.id || uid(),
    createdAt: Date.now(),
    date: input.date,
    number: input.number || Math.max(0, ...existing.map(d => d.number || 0)) + 1,
    title: a.title,
    titleRule: a.titleRule,
    text: input.text,
    caption: a.t.caption,
    photos: a.photos.map(p => p.blob),
    posterV: 3,
    lang: detectLang(input.text),
    i18n: input.i18n || null,
    ownEmotions: input.ownEmotions || [],
    song: input.song,
    songLabel: songLabel(input.song),
    extras: input.extras || {},
    analysis: {
      ai: a.ai,
      text: { ...a.t, places: a.t.places.map(p => p.nom), people: a.t.people.map(p => p.with), events: a.t.events.map(e => e.nom) },
      photo: a.photo, music: a.music,
    },
    style: a.style,
    demo: !!input.demo,
  };
  onStep('render');
  day.poster = await renderPoster(day, a.photos.map(p => p.bitmap));
  onStep('save');
  await db.put(day);
  return day;
}
