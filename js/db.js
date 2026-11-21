// IndexedDB storage: entries (with photo blobs), folders, custom moods and
// meta (the album's look: cover color and stickers).
// ?demo opens the example album: a separate database, so the example never
// mixes with real entries.
export const DEMO = new URLSearchParams(location.search).has('demo');
const DB_NAME = DEMO ? 'moodmark-demo' : 'moodmark';
const VERSION = 3;
let dbp;

function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('moods')) db.createObjectStore('moods', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    t.oncomplete = () => resolve(r?.result ?? r);
    t.onerror = () => reject(t.error);
  });
}

export const get = async (store, id) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(id);
    r.onsuccess = () => resolve(r.result ?? null);
    r.onerror = () => reject(r.error);
  });
};
export const all = store => tx(store, 'readonly', s => s.getAll());
export const put = (store, value) => tx(store, 'readwrite', s => { s.put(value); return value; });
export const del = (store, id) => tx(store, 'readwrite', s => s.delete(id));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
