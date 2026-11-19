// Style engine: mood coordinates → visual form. Every decision writes a
// human-readable reason into `why`, so any day can explain itself.

import { rgbToHsl, hex } from './analyze-photo.js';
import { musicToMood, GENRES } from './analyze-audio.js';
import { SEASON_RU, TIME_RU } from './analyze-text.js';

export const REGIMES = {
  impression: {
    name: 'Импрессионизм',
    ref: 'Клод Моне, Огюст Ренуар',
    when: 'Спокойная энергия, светлое настроение',
    why: 'Мягкие мазки размывают контуры так же, как память размывает детали: остаётся свет и тепло, а не резкость.',
    form: 'Фото переписаны короткими мазками по направлению света, медленные наплывы, пятна солнечных бликов, рукописная подпись.',
    caption: 'hand', sceneTarget: 7, transition: 'dissolve',
  },
  collage: {
    name: 'Коллаж и вырезки',
    ref: 'Анри Матисс (вырезки), дадаистский коллаж',
    when: 'Высокая энергия, светлое настроение',
    why: 'Насыщенный день состоит из кусочков: вырезанные формы и смена на сильную долю передают шум, движение и людей вокруг.',
    form: 'Фото вырезаны рваными формами, цветные органические пятна, смена кадров в такт, жирный гротеск.',
    caption: 'bold', sceneTarget: 3, transition: 'cut',
  },
  construct: {
    name: 'Геометрическая абстракция',
    ref: 'Василий Кандинский, конструктивизм',
    when: 'Высокая энергия, тревожное или напряжённое настроение',
    why: 'Напряжение — это направленные силы: диагонали, острые углы и пульсирующие круги держат внимание собранным, как в ночь перед дедлайном.',
    form: 'Дуотон в сине-серой гамме, жёсткая сетка, линии и круги в ритме музыки, резкие склейки, моноширинный шрифт.',
    caption: 'mono', sceneTarget: 2.5, transition: 'cut',
  },
  film: {
    name: 'Плёночная фотография',
    ref: 'Аналоговая плёнка 70-х, Марк Ротко (цветовые поля)',
    when: 'Спокойная энергия, грустное или задумчивое настроение',
    why: 'Выцветшие цвета, зерно и много пустого поля дают дистанцию: день как будто уже стал прошлым, и это честно для грустных дней.',
    form: 'Приглушённая палитра, плотное зерно, виньетка, световые засветки, медленное затемнение, курсивная антиква.',
    caption: 'serif', sceneTarget: 8, transition: 'fade',
  },
  ma: {
    name: 'Японский минимализм',
    ref: 'Принцип «ма» (пустота), графика Икко Танака, ваби-саби',
    when: 'Ровное, нейтральное или созерцательное настроение',
    why: 'Когда день тихий, лучше всего его передаёт воздух: одно фото, много пустоты и единственный цветовой акцент.',
    form: 'Одно фото на большом поле, тонкие линии, акцентная точка цвета дня, очень медленное движение, лёгкий гротеск.',
    caption: 'light', sceneTarget: 9, transition: 'fade',
  },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const fmt = (v, d = 2) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d);
const pct = v => Math.round(v * 100) + '%';

export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s); l = clamp(l);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

function shiftHueToward(h, target, t) {
  let d = ((target - h + 540) % 360) - 180;
  return h + d * t;
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function buildStyle({ text, photo, music, musicMeta = {}, extras = {} }) {
  const why = [];
  const m = musicToMood(music, musicMeta);
  const textHits = text.ai ? 99 : text.hits.pos.length + text.hits.neg.length + text.hits.high.length + text.hits.low.length;
  const textW = textHits >= 2 ? 0.5 : 0.3;
  const musicW = textHits >= 2 ? 0.32 : 0.5;
  const photoW = 1 - textW - musicW;

  const pVal = photo ? clamp((photo.brightness - 0.45) * 1.2 + (photo.saturation - 0.3) * 0.6 + photo.warmth * 0.6, -1, 1) : 0;
  const pAro = photo ? clamp(photo.saturation * 0.7 + photo.contrast * 1.2, 0, 1) : 0.4;

  const valence = clamp(text.valence * textW + m.valence * musicW + pVal * photoW, -1, 1);
  const arousal = clamp(text.arousal * textW + m.arousal * musicW + pAro * photoW, 0, 1);
  const seasonT = { autumn: 0.25, summer: 0.3, winter: -0.45, spring: 0.05 }[text.season] || 0;
  const temperature = clamp(text.temperature * 0.4 + (photo ? photo.warmth * 1.6 : 0) * 0.3 + m.temperature * 0.2 + seasonT * 0.3, -1, 1);

  // ---- text reasons
  const q = arr => [...new Set(arr)].slice(0, 4).map(w => `«${w}»`).join(', ');
  const tParts = [];
  if (text.hits.pos.length) tParts.push(`светлые слова ${q(text.hits.pos)}`);
  if (text.hits.neg.length) tParts.push(`тяжёлые ${q(text.hits.neg)}`);
  if (text.hits.high.length) tParts.push(`быстрые ${q(text.hits.high)}`);
  if (text.hits.low.length) tParts.push(`медленные ${q(text.hits.low)}`);
  if (text.ai) {
    const emo = text.ai.emotions.length ? text.ai.emotions.join(', ') : 'без ярких эмоций';
    why.push({ src: 'Текст', text: `ИИ прочитал запись: <b>${emo}</b>${text.ai.evidence ? ` (по словам «${text.ai.evidence}»)` : ''} → настроение ${fmt(text.valence)}, энергия ${pct(text.arousal)}. Словарь системы проверяет оценку и весит 30%.` });
  } else why.push({ src: 'Текст', text: tParts.length
    ? `<b>${cap(tParts.join('; '))}</b> → настроение ${fmt(text.valence)}, энергия ${pct(text.arousal)}.`
    : 'Явных эмоциональных слов нет, поэтому основной голос отдан музыке и фото.' });

  // ---- regime
  let regime;
  if (arousal >= 0.52) regime = valence >= -0.05 ? 'collage' : 'construct';
  else regime = valence > 0.12 ? 'impression' : valence < -0.12 ? 'film' : 'ma';
  const genre = musicMeta.genre;
  if (genre === 'electronic' && regime === 'collage' && valence < 0.25) regime = 'construct';
  if (['classical', 'jazz'].includes(genre) && regime === 'ma' && valence > 0) regime = 'impression';
  const R = REGIMES[regime];
  why.push({ src: 'Приём', text: `Энергия ${pct(arousal)}, настроение ${fmt(valence)} → <b>${R.name}</b> (${R.ref}). ${R.why}` });

  // ---- music reasons & rhythm
  const beat = 60 / music.bpm;
  let beats = Math.max(2, Math.round(R.sceneTarget / beat / 2) * 2);
  const sceneDur = beats * beat;
  const modeRu = music.mode === 'major' ? 'мажор' : 'минор';
  why.push({ src: 'Музыка', text: `<b>${music.bpm} BPM</b> → кадр держится ${beats} долей ≈ ${sceneDur.toFixed(1)} с; ${R.transition === 'cut' ? 'склейки ровно на долю' : 'переходы растянуты на такт'}.` });
  why.push({ src: 'Музыка', text: `<b>${cap(modeRu)}${music.key ? ' (' + music.key + ')' : ''}</b>${music.modeGuessed ? ' (оценка по жанру)' : ''} → ${music.mode === 'major' ? 'палитра теплее и светлее на 6%' : 'насыщенность −20% и больше воздуха вокруг фото'}.` });
  why.push({ src: 'Музыка', text: `<b>Энергия ${pct(music.energy)}</b> → ${regime === 'construct' || regime === 'collage' ? 'число фигур' : 'плотность зерна'} и амплитуда пульсации${music.energy > 0.6 ? ' высокие' : ' сдержанные'}.` });

  const year = Number(musicMeta.year) || 0;
  const vintage = year ? clamp((2008 - year) / 50) : 0;
  if (vintage > 0.15) why.push({ src: 'Музыка', text: `<b>Песня ${year} года</b> → плёночное выцветание, зерно +${pct(vintage * 0.25)} и тёплый сдвиг.` });
  if (genre && GENRES[genre]) why.push({ src: 'Музыка', text: `<b>${GENRES[genre].label}</b> → ${GENRES[genre].temp > 0.25 ? 'тёплая' : GENRES[genre].temp < -0.25 ? 'холодная' : 'нейтральная'} температура палитры.` });

  // ---- palette from photos
  const seed = hashSeed((extras.id || '') + (text.caption || '') + music.bpm);
  const night = (extras.timeOfDay || text.timeOfDay) === 'night';
  const minor = music.mode === 'minor';
  const src = (photo?.palette?.length ? photo.palette : [{ rgb: [180, 170, 160], weight: 1 }]).map(p => {
    const [h, s, l] = rgbToHsl(...p.rgb);
    return { h, s, l, w: p.weight };
  });
  const satMul = (minor ? 0.8 : 1) * (1 - vintage * 0.3);
  const lightAdd = (minor ? -0.02 : 0.06) * 0.5 + (music.brightness - 0.5) * 0.08;
  const warmTarget = temperature >= 0 ? 32 : 205;
  const warmAmt = Math.abs(temperature) * 0.35 + vintage * 0.25;

  let pal, bg, ink, accent;
  const bySat = [...src].sort((a, b) => b.s - a.s);
  if (regime === 'impression') {
    pal = src.slice(0, 5).map(c => hsl(shiftHueToward(c.h, warmTarget, warmAmt), clamp(c.s * 0.9 * satMul + 0.12, 0.15, 0.7), clamp(mix(c.l, 0.68, 0.45) + lightAdd, 0.35, 0.86)));
    bg = temperature >= 0 ? '#f5efe4' : '#eef1f1'; ink = '#2a2520';
    accent = hsl(shiftHueToward(bySat[0].h, warmTarget, 0.4), 0.55 * satMul, 0.55);
  } else if (regime === 'collage') {
    pal = bySat.slice(0, 4).map((c, i) => hsl(shiftHueToward(c.h, warmTarget, warmAmt * 0.6) + i * 9, clamp(c.s * 1.3 * satMul + 0.25, 0.45, 0.85), clamp(0.52 + lightAdd, 0.4, 0.62)));
    while (pal.length < 4) pal.push(hsl(seed % 360 + pal.length * 90, 0.7, 0.52));
    bg = '#f4f0e8'; ink = '#111111'; accent = pal[0];
  } else if (regime === 'construct') {
    const base = temperature > 0.2 ? 215 : 220;
    pal = [hsl(base, 0.28, night ? 0.1 : 0.18), hsl(base - 6, 0.14, 0.45), hsl(base - 10, 0.12, 0.8)];
    // Kandinsky's accents are primaries: red for high pressure, yellow otherwise.
    // A warm photo colour is kept if it already sits in that range (never violet).
    const a = bySat[0];
    const warmPhoto = a.s > 0.3 && (a.h < 55 || a.h > 345);
    const accentHue = warmPhoto ? a.h : music.energy > 0.6 || valence < -0.3 ? 8 : 46;
    accent = hsl(accentHue, 0.8 * satMul + 0.1, 0.52);
    bg = night ? '#0d1117' : '#e8ebee'; ink = night ? '#e8ebee' : '#0d1117';
  } else if (regime === 'film') {
    pal = src.slice(0, 5).map(c => hsl(shiftHueToward(c.h, warmTarget, warmAmt * 0.8), c.s * 0.42 * satMul, clamp(mix(c.l, 0.5, 0.4), 0.25, 0.75)));
    bg = night ? '#171716' : '#ebe9e4'; ink = night ? '#e9e6df' : '#2b2a28';
    accent = hsl(shiftHueToward(src[0].h, warmTarget, 0.5), 0.3, 0.6);
  } else {
    pal = src.slice(0, 4).map(c => hsl(c.h, c.s * 0.55 * satMul, clamp(mix(c.l, 0.6, 0.3))));
    bg = night ? '#141414' : '#f7f6f2'; ink = night ? '#efede8' : '#1c1c1c';
    accent = hsl(bySat[0].s > 0.2 ? bySat[0].h : 6, 0.62 * satMul + 0.08, 0.48);
  }
  const dark = ['#0d1117', '#171716', '#141414'].includes(bg);

  if (photo) {
    why.push({ src: 'Фото', text: `<b>${photo.count} ${plural(photo.count, 'фото', 'фото', 'фото')}</b>, яркость ${pct(photo.brightness)}, насыщенность ${pct(photo.saturation)}, ${photo.warmth > 0.04 ? 'тёплый' : photo.warmth < -0.04 ? 'холодный' : 'нейтральный'} свет → палитра собрана из их доминирующих цветов${regime === 'construct' ? ', сведённых в дуотон с одним акцентом' : ''}.` });
    if (photo.count > 1) why.push({ src: 'Фото', text: `<b>${photo.count} ${plural(photo.count, 'кадр', 'кадра', 'кадров')}</b> → ${photo.count} ${plural(photo.count, 'сцена', 'сцены', 'сцен')}, полный цикл ${(photo.count * sceneDur).toFixed(0)} с.` });
  }
  const ctx = [];
  if (text.season) ctx.push(`${SEASON_RU[text.season]}${text.seasonFromText ? '' : ' (по дате)'}`);
  if (extras.timeOfDay || text.timeOfDay) ctx.push(TIME_RU[extras.timeOfDay || text.timeOfDay]);
  const weatherKey = extras.weather || text.weather[0]?.key;
  if (ctx.length || weatherKey) {
    const light = night ? 'тёмное поле и свечение' : (extras.timeOfDay || text.timeOfDay) === 'evening' ? 'низкий тёплый свет и виньетка' : (extras.timeOfDay || text.timeOfDay) === 'morning' ? 'высветленные тени' : 'ровный дневной свет';
    why.push({ src: 'Контекст', text: `<b>${cap(ctx.join(', ') || 'Погода')}</b>${weatherKey ? ` + ${WEATHER_RU[weatherKey] || weatherKey}` : ''} → ${light}${weatherKey === 'rain' ? ', косые штрихи дождя' : weatherKey === 'snow' ? ', медленные хлопья' : ''}; температура палитры ${fmt(temperature)}.` });
  }

  // ---- voice
  const tempoA = clamp((music.bpm - 60) / 110);
  const VOICE = {
    impression: { label: 'тёплый и тихий', rate: 0.9, pitch: 0.95, pause: 500 },
    collage: { label: 'живой и быстрый', rate: 1.1, pitch: 1.08, pause: 150 },
    construct: { label: 'ровный и собранный', rate: 1.04, pitch: 0.88, pause: 250 },
    film: { label: 'медленный и приглушённый', rate: 0.82, pitch: 0.86, pause: 700 },
    ma: { label: 'спокойный, с паузами', rate: 0.88, pitch: 1.0, pause: 900 },
  };
  const v = { ...VOICE[regime] };
  v.rate = +(v.rate * (0.94 + tempoA * 0.12)).toFixed(2);
  why.push({ src: 'Голос', text: `Режим «${R.name}» + темп ${music.bpm} BPM → голос <b>${v.label}</b>, скорость ×${v.rate}, паузы ${v.pause} мс.` });

  return {
    regime, valence, arousal, temperature, seed,
    palette: { bg, ink, accent, colors: pal }, dark, night,
    bpm: music.bpm, beats, sceneDur, transition: R.transition,
    energy: music.energy, dynamics: music.dynamics ?? 0.4,
    grain: clamp(0.12 + (regime === 'film' ? 0.28 : 0) + vintage * 0.25 + music.energy * 0.08, 0, 0.6),
    vintage, minor, air: minor ? 0.08 : 0,
    weather: weatherKey || null, timeOfDay: extras.timeOfDay || text.timeOfDay || null,
    caption: R.caption, voice: v, why,
  };
}

const WEATHER_RU = { rain: 'дождь', snow: 'снег', sun: 'солнце', fog: 'туман', wind: 'ветер', storm: 'гроза', cold: 'холод', heat: 'жара' };
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function plural(n, a, b, c) { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c; }
