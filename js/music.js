// Music from the Apple Music / iTunes catalog (public Search API, no login).
// Each track has an official 30-second preview that plays inside the memory.

const art = (url, size) => (url || '').replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.jpg`);

export function toTrack(r) {
  return {
    id: r.trackId,
    artist: r.artistName,
    title: r.trackName,
    album: r.collectionName || '',
    artwork: art(r.artworkUrl100, 600),
    thumb: art(r.artworkUrl100, 120),
    preview: r.previewUrl,
    genre: r.primaryGenreName || '',
    year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : '',
    url: r.trackViewUrl || '',
  };
}

// The catalog by fetch; where that fails (some phone browsers, content
// blockers, slow networks) the same search goes through a script tag (JSONP),
// which the iTunes API also supports.
let jsonpN = 0;
function jsonp(url, ms = 9000) {
  return new Promise((resolve, reject) => {
    const name = `__mmItunes${++jsonpN}`;
    const s = document.createElement('script');
    const done = () => { clearTimeout(t); delete window[name]; s.remove(); };
    const t = setTimeout(() => { done(); reject(new Error('timeout')); }, ms);
    window[name] = data => { done(); resolve(data); };
    s.onerror = () => { done(); reject(new Error('network')); };
    s.src = `${url}&callback=${name}`;
    document.head.appendChild(s);
  });
}

async function search(params, signal) {
  const url = `https://itunes.apple.com/search?${new URLSearchParams({ media: 'music', entity: 'song', ...params })}`;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    signal?.addEventListener('abort', () => c.abort());
    try {
      const res = await fetch(url, { signal: c.signal });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } finally { clearTimeout(t); }
  } catch (e) {
    if (signal?.aborted) throw e;
    return jsonp(url);
  }
}

let ctl = null;
export async function searchTracks(q, limit = 12) {
  ctl?.abort();
  ctl = new AbortController();
  const data = await search({ term: q, limit: String(limit) }, ctl.signal);
  return (data.results || []).filter(r => r.previewUrl).map(toTrack);
}

// One-shot search that doesn't cancel the user's live search. If the exact
// query finds nothing, it tries again with the main words only.
export async function findTrack(q) {
  for (const term of [q, q.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2).slice(0, 3).join(' ')]) {
    if (!term) continue;
    try {
      const data = await search({ term, limit: '5' });
      const r = (data.results || []).find(x => x.previewUrl);
      if (r) return toTrack(r);
    } catch { /* try the shorter query */ }
  }
  return null;
}
