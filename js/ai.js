// AI reading of the diary entry (OpenRouter, free models only).
// The model only extracts meaning from the text; every visual decision is still
// made by the rule engine in style.js, so the result stays explainable.

import { OPENROUTER_KEY } from './config.js';

export const AI_MODELS = [
  'baidu/ernie-5.5-flash-preview:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
];

const SYSTEM = `Ты читаешь личные дневниковые записи для арт-проекта Moodmark и извлекаешь из них смысл. Отвечай только JSON-объектом без пояснений и без markdown. Запись может быть на казахском, русском или английском: значения title, caption, emotions, place, company и detail пиши на том же языке, что и запись.
Поля:
"valence": число от -1 до 1 — настроение дня (-1 тяжело и грустно, 0 ровно, 1 светло и радостно);
"arousal": число от 0 до 1 — энергия дня (0 тихо и медленно, 1 насыщенно, шумно, быстро);
"temperature": число от -1 до 1 — ощущение холода или тепла в записи;
"emotions": массив из 1–3 эмоций на русском, одно слово каждая;
"season": "autumn" | "winter" | "spring" | "summer" | null — только если понятно из текста;
"timeOfDay": "morning" | "day" | "evening" | "night" | null;
"weather": "sun" | "rain" | "snow" | "fog" | "wind" | null;
"place": главное место в именительном падеже или null;
"company": с кем был автор, с предлогом в творительном падеже («с подругой», «с друзьями»), «наедине с собой» если один, или null;
"detail": одна запомнившаяся деталь, существительное, или null;
"title": название папки дня: 3–7 слов, именная группа без глаголов, без кавычек и точки, с заглавной буквы, спокойный тон, конкретные детали дня. Примеры: «Осенний парк и какао», «Ночь в офисе перед сдачей», «Летний концерт под дождём с друзьями»;
"caption": одна короткая фраза из записи до 90 символов, почти дословно;
"evidence": 3–6 слов или коротких фраз из текста через запятую, которые сильнее всего определили настроение.`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, Number.isFinite(+v) ? +v : 0));
const pick = (v, list) => (list.includes(v) ? v : null);
const str = (v, max = 80) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, max) : null);

function parseJSON(content) {
  if (!content) return null;
  const s = content.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

function validate(j, model) {
  if (!j || typeof j !== 'object') return null;
  let title = str(j.title, 80)?.replace(/^[«"']|[»"'.]$/g, '').trim() || null;
  const words = title ? title.split(/\s+/).length : 0;
  if (words < 3 || words > 7) title = null;
  return {
    model,
    valence: clamp(j.valence, -1, 1),
    arousal: clamp(j.arousal, 0, 1),
    temperature: clamp(j.temperature, -1, 1),
    emotions: (Array.isArray(j.emotions) ? j.emotions : []).map(e => str(e, 24)).filter(Boolean).slice(0, 3),
    season: pick(j.season, ['autumn', 'winter', 'spring', 'summer']),
    timeOfDay: pick(j.timeOfDay, ['morning', 'day', 'evening', 'night']),
    weather: pick(j.weather, ['sun', 'rain', 'snow', 'fog', 'wind']),
    place: str(j.place, 40),
    company: str(j.company, 40),
    detail: str(j.detail, 40),
    title,
    caption: str(j.caption, 110),
    evidence: str(Array.isArray(j.evidence) ? j.evidence.join(', ') : j.evidence, 160),
  };
}

async function callModel(model, text, timeout) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Moodmark',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text.slice(0, 4000) }],
        response_format: { type: 'json_object' },
        reasoning: { effort: 'low', exclude: true },
        temperature: 0.3,
        max_tokens: 1800,
      }),
    });
    if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
    const data = await res.json();
    const out = validate(parseJSON(data.choices?.[0]?.message?.content), data.model || model);
    if (!out) throw new Error(`${model}: пустой ответ`);
    return out;
  } finally { clearTimeout(timer); }
}

export const aiEnabled = () => !!OPENROUTER_KEY;

// Tries free models one by one; returns null if none answered, so the rules take over.
export async function aiReadEntry(text, { timeout = 20000 } = {}) {
  if (!aiEnabled() || !text?.trim()) return null;
  for (const m of AI_MODELS) {
    try { return await callModel(m, text, timeout); }
    catch (e) { console.warn('AI:', e.message); }
  }
  return null;
}
