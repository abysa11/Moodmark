# Moodmark

A diary that remembers how a day felt, kept as a photo album. Write about the day, attach photos and a song, and the day is pasted into a hardcover book. When you open the day later, the photo appears first, the background slowly fills with the same photo, enlarged and blurred, and the song plays.

## Run

```bash
python3 -m http.server 5173 --bind 127.0.0.1
```

Then open http://127.0.0.1:5173. For AI features, copy `js/config.local.example.js` to `js/config.local.js` and add at least one key. The published site has no keys in its code: it reaches the AI through a small proxy that keeps the key on Cloudflare (see `proxy/README.md`). Without any key the site still works: titles come from built-in rules and the song is chosen by mood.

## How it works

- **Album:** the diary is a book. It starts closed, with a dark red cover; click the book to open it, click the paper to close it. It opens on today. A new album has 10 empty pages to flip through; more pages appear only once all of them are filled with photos. Days are pasted in like prints in an old photo album: frames of different sizes, shaped like each photo and scattered over the page (the same days always land in the same places), some held by black photo corners, with the title, mood and date under each. Turn pages like a real book: drag a page with the mouse or swipe it with a finger, and it follows; let go past a third of the way (or flick) and it turns, otherwise it lays back. The keyboard arrows work too; jump to a date with the calendar button. On phones the book shows one page at a time.
- **Decorating:** pick any cover color (a palette or your own) and put stickers on the cover (ready-made ones, or your own made from a photo). Stickers can be moved, turned and resized right on the cover. For your own sticker, the background is removed in the browser (the @imgly/background-removal model, about 50 MB, downloaded once) and the cut-out gets a thick white outline.
- **Memory view:** opening a day plays it like a short film. Each photo is a moment: the camera slowly moves in or out of it over a deeply blurred copy of the same photo, with light in the photo's own colors and film grain. Moments change on the beat of the day's song (its tempo is read from the 30-second preview); a calm day moves slowly with long crossfades, a busy one cuts faster. Each moment shows a fragment of what was written. The timeline jumps between moments, a tap on the photo opens the original, the archive mode shows all photos, the whole text and the song, and the memory can be played again. A background sound (rain, wind, sea, street, fire) is offered only when the entry names it, and is off until turned on; it is made in the browser, with no sound files.
- **Entry:** date, photos (the first one is the cover), text, a mood (8 base moods plus your own), and a song from the Apple Music catalog (iTunes Search API, official 30-second previews).
- **AI (free models and free tiers only):** reads the text and the cover photo and returns the day's title, a caption, an atmosphere line and a song suggestion if none was attached. The order is OpenRouter, Google Gemini, Groq, Mistral, Cerebras: only the platforms whose key is set. When a model hits its limit, it rests and the next model is tried; when a platform runs out of free quota for the day, the next platform takes over.
- **Storage:** IndexedDB in the browser. Entries, photos, folders, moods and the album's look stay on the device.
- **Sidebar:** search, folders, mood filters, and a text list of entries grouped by mood. A filter or search narrows the album to the matching days.

## Tools

Fonts: Unbounded and Manrope (Google Fonts). Music: iTunes Search API. AI: OpenRouter, Gemini, Groq, Mistral, Cerebras (OpenAI-compatible APIs). Sticker cut-outs: @imgly/background-removal. No frameworks and no build step.
