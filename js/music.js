// Music search in the Apple Music / iTunes catalog (public, no login).
// Every track has a 30-second preview that plays right on the site and is
// analysed by our own audio code (tempo, key, energy).

const GENRE_MAP = [
  [/jazz|swing|bebop|vocal|standards/i, 'jazz'],
  [/classical|opera|orchestral|soundtrack|score/i, 'classical'],
  [/ambient|new age|meditat/i, 'ambient'],
  [/lo-?fi|chill/i, 'lofi'],
  [/folk|acoustic|singer|country/i, 'acoustic'],
  [/r&b|soul|funk/i, 'rnb'],
  [/hip-?hop|rap|trap/i, 'hiphop'],
  [/metal|punk|hardcore/i, 'metal'],
  [/rock|grunge/i, 'rock'],
  [/electro|dance|house|techno|edm|trance|drum|dubstep/i, 'electronic'],
  [/alternative|indie/i, 'indie'],
  [/world|ethn|kazakh|asia|latin|reggae/i, 'ethno'],
  [/pop|k-pop|j-pop|russian/i, 'pop'],
];
export const mapGenre = g => (GENRE_MAP.find(([re]) => re.test(g || '')) || [, ''])[1];

const art = (url, size = 600) => (url || '').replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${size}x${size}bb.jpg`);

export function toTrack(r) {
  return {
    id: r.trackId,
    artist: r.artistName,
    title: r.trackName,
    album: r.collectionName || '',
    artwork: art(r.artworkUrl100, 600),
    thumb: art(r.artworkUrl100, 120),
    preview: r.previewUrl,
    genreName: r.primaryGenreName || '',
    genre: mapGenre(r.primaryGenreName),
    year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : '',
    durationMs: r.trackTimeMillis || 0,
    url: r.trackViewUrl || '',
  };
}

let ctl = null;
export async function searchTracks(q, limit = 10) {
  ctl?.abort();
  ctl = new AbortController();
  const url = `https://itunes.apple.com/search?${new URLSearchParams({ term: q, media: 'music', entity: 'song', limit: String(limit) })}`;
  const res = await fetch(url, { signal: ctl.signal });
  if (!res.ok) throw new Error('Поиск музыки недоступен');
  const data = await res.json();
  return (data.results || []).filter(r => r.previewUrl).map(toTrack);
}

export async function lookupTrack(id) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
  const data = await res.json();
  const r = (data.results || []).find(x => x.previewUrl);
  return r ? toTrack(r) : null;
}

// Downloads the 30-second preview so it can be analysed, stored with the day
// and played offline together with the memory.
export async function fetchPreview(track) {
  const res = await fetch(track.preview);
  if (!res.ok) throw new Error('Не удалось загрузить отрывок песни');
  return res.blob();
}
