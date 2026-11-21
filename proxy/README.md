# Moodmark AI proxy

The published site (GitHub Pages) is public, so the OpenRouter key can't be in its code. This Cloudflare Worker keeps the key as a secret on Cloudflare and forwards the site's AI requests. It only accepts requests from the site's address and only for free models.

## Set up (free Cloudflare account, about 5 minutes)

1. Install the Cloudflare CLI and sign in:

   ```bash
   npm install -g wrangler
   ```

   ```bash
   wrangler login
   ```

2. From this `proxy` folder, publish the worker:

   ```bash
   wrangler deploy
   ```

   It prints the address, for example `https://moodmark-ai.<your-name>.workers.dev`.

3. Add the key as a secret (paste it when asked; it is stored only on Cloudflare):

   ```bash
   wrangler secret put OPENROUTER_KEY
   ```

4. Put the worker's address in `js/config.js` as `AI_PROXY`, adding `/v1` at the end, then commit and push.

`ALLOWED_ORIGINS` in `wrangler.toml` lists the sites that may use the proxy: the GitHub Pages address and the local dev server.
