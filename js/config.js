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
