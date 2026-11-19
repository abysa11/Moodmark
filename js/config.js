// Public config. The real OpenRouter key lives in js/config.local.js, which is
// not committed (see .gitignore). Copy js/config.local.example.js to
// js/config.local.js and put your key there. Without a key the site still
// works: the entry is read by the built-in rules instead of the AI.
const local = await import('./config.local.js').catch(() => ({}));
export const OPENROUTER_KEY = local.OPENROUTER_KEY || '';
