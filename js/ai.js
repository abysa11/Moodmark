// AI for Moodmark: free models only, across several platforms.
//
// Order: OpenRouter (free models), then Google Gemini, Groq, Mistral and
// Cerebras — every platform whose key is set in js/config.local.js. All of
// them have free tiers and speak the same OpenAI-style chat API.
//
// When a model hits its limit (429) or fails, it rests for a while and the
// next model is tried. When a whole platform runs out for the day (OpenRouter's
// "free-models-per-day", a daily quota elsewhere), the platform rests and the
// next platform takes over — so the AI keeps working while any free quota is left.
//
// Two jobs:
//  1. readDay      — reads the text and the cover photo and returns the day's
//                    title, caption, atmosphere, warmth and a song suggestion.
//  2. fallbackRead — built-in rules when there is no key or every model failed.
import { KEYS, AI_PROXY } from './config.js';
import { moodById } from './moods.js';

const PROVIDERS = [
  {
    // the published site: OpenRouter's free models through the proxy that holds the key
    id: 'proxy',
    base: AI_PROXY,
    vision: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free', 'google/gemma-4-26b-a4b-it:free'],
    text: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-lightning:free', 'google/gemma-4-26b-a4b-it:free'],
    discover: d => (d.data || []).filter(m => m.id.endsWith(':free') || m.id === 'openrouter/free').map(m => ({
      id: m.id,
      vision: (m.architecture?.input_modalities || []).includes('image'),
      text: (m.architecture?.output_modalities || ['text']).join() === 'text',
      ctx: m.context_length || 0,
    })),
    extra: { reasoning: { enabled: false } },
  },
  {
    id: 'openrouter',
    base: 'https://openrouter.ai/api/v1',
    vision: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-super-vl:free', 'google/gemma-4-26b-a4b-it:free'],
    text: ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3.5-lightning:free', 'google/gemma-4-26b-a4b-it:free'],
    // the live list of free models; reasoning off, or reasoning models spend the whole budget thinking
    discover: d => (d.data || []).filter(m => m.id.endsWith(':free') || m.id === 'openrouter/free').map(m => ({
      id: m.id,
      vision: (m.architecture?.input_modalities || []).includes('image'),
      text: (m.architecture?.output_modalities || ['text']).join() === 'text',
      ctx: m.context_length || 0,
    })),
    extra: { reasoning: { enabled: false } },
    headers: { 'X-Title': 'Moodmark' },
  },
  {
    id: 'gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    vision: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
    text: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    discover: d => (d.data || []).map(m => m.id.replace(/^models\//, ''))
      .filter(id => /^gemini-[\d.]+-flash(-lite)?$/.test(id))
      .map(id => ({ id, vision: true, text: true, ctx: 0 })),
    maxTokens: 2048, // flash models think before answering
  },
  {
    id: 'groq',
    base: 'https://api.groq.com/openai/v1',
    vision: ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'],
    text: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'],
    discover: d => (d.data || []).filter(m => m.active !== false && !/whisper|tts|guard|playai|orpheus|compound/i.test(m.id))
      .map(m => ({ id: m.id, vision: /scout|maverick|vision|-vl/i.test(m.id), text: true, ctx: m.context_window || 0 })),
  },
  {
    id: 'mistral',
    base: 'https://api.mistral.ai/v1',
    vision: ['mistral-small-latest', 'mistral-medium-latest', 'pixtral-12b-2409'],
    text: ['mistral-small-latest', 'mistral-medium-latest'],
    discover: d => (d.data || []).filter(m => m.capabilities?.completion_chat)
      .map(m => ({ id: m.id, vision: Boolean(m.capabilities?.vision), text: true, ctx: m.max_context_length || 0 })),
    imageAsString: true, // Mistral takes image_url as a plain string
  },
  {
    id: 'cerebras',
    base: 'https://api.cerebras.ai/v1',
    vision: [],
    text: ['llama-3.3-70b', 'gpt-oss-120b', 'qwen-3-32b'],
    discover: d => (d.data || []).map(m => ({ id: m.id, vision: false, text: true, ctx: 0 })),
  },
];
const MAX_PER_PROVIDER = 4;

// the proxy only when there is no OpenRouter key of our own (local development has one)
const active = () => PROVIDERS.filter(p => (p.id === 'proxy' ? Boolean(AI_PROXY) && !KEYS.openrouter : KEYS[p.id]));
const auth = p => (KEYS[p.id] ? { Authorization: `Bearer ${KEYS[p.id]}` } : {});
export const hasAI = () => active().length > 0;

// ---------- rest bookkeeping: models and whole platforms ----------
const REST_KEY = 'mm.rest';
const rests = () => JSON.parse(localStorage.getItem(REST_KEY) || '{}');
const resting = id => rests()[id] > Date.now();
function rest(id, ms) {
  const r = rests();
  r[id] = Date.now() + ms;
  for (const k in r) if (r[k] < Date.now()) delete r[k];
  localStorage.setItem(REST_KEY, JSON.stringify(r));
}

// ---------- model lists (live, cached for 6 hours) ----------
const listKey = p => `mm.models.${p.id}.v3`;
const pending = {};
async function discovered(p) {
  const cached = JSON.parse(localStorage.getItem(listKey(p)) || 'null');
  if (cached && Date.now() - cached.at < 6 * 3600e3) return cached.models;
  pending[p.id] ??= fetch(`${p.base}/models`, { headers: auth(p) })
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(d => { const models = p.discover(d); localStorage.setItem(listKey(p), JSON.stringify({ at: Date.now(), models })); return models; })
    .catch(() => cached?.models || [])
    .finally(() => { delete pending[p.id]; });
  return pending[p.id];
}

async function modelsFor(p, kind) {
  const found = await discovered(p);
  const fits = found.filter(m => m[kind]);
  const known = new Set(found.map(m => m.id));
  const pref = p[kind].filter(id => !found.length || known.has(id));
  const others = fits.filter(m => !pref.includes(m.id)).sort((a, b) => b.ctx - a.ctx).map(m => m.id);
  const order = [...pref, ...others];
  if ((p.id === 'openrouter' || p.id === 'proxy') && kind === 'text' && !order.includes('openrouter/free')) order.push('openrouter/free');
  return order.filter(id => !resting(`${p.id}:${id}`)).slice(0, MAX_PER_PROVIDER);
}

// ---------- one request ----------
class DayLimit extends Error {}

async function call(p, model, body, timeout) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeout);
  const key = `${p.id}:${model}`;
  try {
    const res = await fetch(`${p.base}/chat/completions`, {
      method: 'POST',
      signal: c.signal,
      headers: { ...auth(p), 'Content-Type': 'application/json', ...p.headers },
      body: JSON.stringify({ model, ...body, ...p.extra }),
    });
    if (res.status === 429) {
      const text = await res.text().catch(() => '');
      // The platform's free quota for the day is used up: move on to the next platform.
      if (/per-?day|daily/i.test(text)) {
        const reset = Number(res.headers.get('x-ratelimit-reset'));
        rest(p.id, reset > Date.now() ? reset - Date.now() : 3600e3);
        throw new DayLimit(`${p.id}: out of free quota`);
      }
      rest(key, /quota|credits/i.test(text) ? 10 * 60e3 : 2 * 60e3);
      throw new Error(`${key}: limit`);
    }
    if (res.status === 401 || res.status === 403) { rest(p.id, 3600e3); throw new DayLimit(`${p.id}: key rejected`); }
    if (res.status === 402) { rest(p.id, 3600e3); throw new DayLimit(`${p.id}: needs credits`); }
    if (res.status === 404 || res.status === 400) { rest(key, 6 * 3600e3); throw new Error(`${key}: ${res.status}`); }
    if (!res.ok) { rest(key, 2 * 60e3); throw new Error(`${key}: ${res.status}`); }
    const data = await res.json();
    if (data.error) { rest(key, 5 * 60e3); throw new Error(`${key}: ${data.error.message || 'error'}`); }
    return data.choices?.[0]?.message || {};
  } catch (e) {
    if (e.name === 'AbortError') { rest(key, 5 * 60e3); throw new Error(`${key}: timeout`); }
    throw e;
  } finally { clearTimeout(t); }
}

// ---------- 1. reading the day ----------
const SYSTEM = `Ты помогаешь личному дневнику Moodmark сохранить атмосферу дня. Тебе дают запись, настроение, дату, фото и песню (если есть). Ответь только JSON без markdown:
{"title": "название дня: 3–7 слов, именная группа без глаголов, без кавычек и точки, на языке записи, конкретные детали дня, например «Осенний парк и какао» или «Ночь в офисе перед сдачей»",
"caption": "одна короткая фраза из записи до 90 символов, почти дословно",
"atmosphere": "одно предложение до 120 символов: свет, звук, температура и ощущение этого дня, как будто вспоминаешь его через год",
"warmth": число от -1 (холодный день) до 1 (тёплый день),
"music": "если песни нет: поисковый запрос для Apple Music — 'исполнитель название' реальной известной песни, которая подходит по настроению, фото и записи; иначе null",
"ambience": "звук фона этого дня, только если он прямо назван в записи или явно виден на фото: rain, wind, sea, street или fire; если нет — null. Не выдумывай."}`;

function parseJSON(content) {
  if (!content) return null;
  const s = String(content).replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

const str = (v, max) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null);

function clean(j, model) {
  if (!j) return null;
  let title = str(j.title, 70)?.replace(/^[«"']+|[»"'.]+$/g, '').trim() || null;
  const words = title ? title.split(/\s+/).length : 0;
  if (words < 2 || words > 8) title = null;
  if (!title) return null;
  return {
    model,
    title,
    caption: str(j.caption, 110),
    atmosphere: str(j.atmosphere, 160),
    warmth: Math.max(-1, Math.min(1, Number(j.warmth) || 0)),
    music: str(j.music, 80),
    ambience: ['rain', 'wind', 'sea', 'street', 'fire'].includes(j.ambience) ? j.ambience : null,
  };
}

export async function readDay({ text, mood, date, photo, track }) {
  if (!hasAI()) return null;
  const song = track ? `${track.artist} — ${track.title} (${track.genre}${track.year ? ', ' + track.year : ''})` : 'нет, подбери';
  const prompt = `Дата: ${date}\nНастроение: ${moodById(mood).name}\nПесня: ${song}\nЗапись: ${text || '(без текста, опирайся на фото)'}`;
  const kinds = photo ? ['vision', 'text'] : ['text'];
  for (const kind of kinds) {
    for (const p of active()) {
      if (resting(p.id)) continue;
      for (const model of await modelsFor(p, kind)) {
        const content = kind === 'vision'
          ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: p.imageAsString ? photo : { url: photo } }]
          : prompt;
        try {
          const msg = await call(p, model, {
            messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content }],
            temperature: 0.6,
            max_tokens: p.maxTokens || 900,
          }, 40000);
          const out = clean(parseJSON(msg.content), `${p.id}/${model}`);
          if (out) return out;
          console.warn('[ai]', p.id, model, 'unusable reply:', String(msg.content).slice(0, 160));
        } catch (e) {
          console.warn('[ai]', e.message);
          if (e instanceof DayLimit) break; // this platform is done for now, try the next one
        }
      }
    }
  }
  return null;
}

// ---------- 2. built-in fallback ----------
const ADJ = { joy: 'Светлый', calm: 'Тихий', tender: 'Нежный', nostalgia: 'Тёплый', sad: 'Серый', anxious: 'Тревожный', energy: 'Быстрый', tired: 'Долгий' };
const MONTH_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function fallbackRead({ text, mood, date }) {
  const d = new Date(date + 'T12:00');
  const m = moodById(mood);
  const first = (text || '').split(/(?<=[.!?…])\s+/)[0]?.trim() || '';
  return {
    model: null,
    title: `${ADJ[m.base || m.id] || 'Тихий'} день ${d.getDate()} ${MONTH_GEN[d.getMonth()]}`,
    caption: first.slice(0, 110) || null,
    atmosphere: null,
    warmth: 0,
    music: null,
    ambience: null,
  };
}
