// Public config. API keys live in js/config.local.js, which is not committed
// (see .gitignore). Every key is optional: the AI uses the platforms whose key
// is set, OpenRouter first. Without any key the site still works: titles and
// music are picked by built-in rules instead of the AI.
const local = await import('./config.local.js').catch(() => ({}));
export const KEYS = {
  openrouter: local.OPENROUTER_KEY || '',
  gemini: local.GEMINI_KEY || '',
  groq: local.GROQ_KEY || '',
  mistral: local.MISTRAL_KEY || '',
  cerebras: local.CEREBRAS_KEY || '',
};

// The published site has no keys: it asks the AI through a small proxy that
// keeps the key on its own server (see proxy/README.md). Put its address here,
// ending in /v1. Not a secret.
export const AI_PROXY = local.AI_PROXY ?? '';
