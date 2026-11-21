// Moodmark AI proxy (Cloudflare Worker).
//
// The site on GitHub Pages is public, so an API key can't live in its code.
// This tiny server keeps the OpenRouter key as a secret on Cloudflare and
// passes the site's requests to OpenRouter. The browser never sees the key.
//
// Guards:
//  - only the site's own address may call it (ALLOWED_ORIGINS);
//  - only free models (ids ending in ":free", or openrouter/free);
//  - only the two calls the site makes: the model list and chat completions;
//  - small request bodies.
//
// Setup: see proxy/README.md.

const UPSTREAM = 'https://openrouter.ai/api/v1';
const MAX_BODY = 600_000; // a 512px photo plus the text fits easily

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return json({ error: { message: 'origin not allowed' } }, 403, cors);

    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (request.method === 'GET' && path.endsWith('/models')) {
      const res = await fetch(`${UPSTREAM}/models?output_modalities=all`);
      return new Response(res.body, { status: res.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    if (request.method !== 'POST' || !path.endsWith('/chat/completions')) return json({ error: { message: 'not found' } }, 404, cors);

    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: { message: 'request too large' } }, 413, cors);
    let body;
    try { body = JSON.parse(text); } catch { return json({ error: { message: 'bad json' } }, 400, cors); }
    const model = String(body.model || '');
    if (!(model.endsWith(':free') || model === 'openrouter/free')) return json({ error: { message: 'free models only' } }, 400, cors);

    const res = await fetch(`${UPSTREAM}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'Moodmark' },
      body: JSON.stringify({ ...body, max_tokens: Math.min(Number(body.max_tokens) || 900, 2048) }),
    });
    const headers = { ...cors, 'Content-Type': 'application/json' };
    const reset = res.headers.get('x-ratelimit-reset');
    if (reset) headers['X-RateLimit-Reset'] = reset;
    return new Response(res.body, { status: res.status, headers: { ...headers, 'Access-Control-Expose-Headers': 'X-RateLimit-Reset' } });
  },
};

const json = (data, status, headers) => new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
