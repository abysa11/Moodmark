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

let ctl = null;
export async function searchTracks(q, limit = 12) {
  ctl?.abort();
  ctl = new AbortController();
  const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: q, media: 'music', entity: 'song', limit: String(limit) })}`;
  const res = await fetch(url, { signal: ctl.signal });
  if (!res.ok) throw new Error('Каталог Apple Music недоступен');
  const data = await res.json();
  return (data.results || []).filter(r => r.previewUrl).map(toTrack);
}

// One-shot search that doesn't cancel the user's live search.
export async function findTrack(q) {
  const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: q, media: 'music', entity: 'song', limit: '5' })}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const r = (data.results || []).find(x => x.previewUrl);
  return r ? toTrack(r) : null;
}
