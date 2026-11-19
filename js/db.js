// IndexedDB storage. Every day is one "folder" record that holds
// text, photos (Blobs), song (link or Blob), analysis, style and poster.

const DB_NAME = 'moodmark';
const DB_VERSION = 1;
const STORE = 'days';

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const result = fn(s);
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const db = {
  async all() {
    const list = await tx(STORE, 'readonly', s => s.getAll());
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
  },
  get: id => tx(STORE, 'readonly', s => s.get(id)),
  put: day => tx(STORE, 'readwrite', s => s.put(day)),
  remove: id => tx(STORE, 'readwrite', s => s.delete(id)),
  getMeta: key => tx('meta', 'readonly', s => s.get(key)),
  setMeta: (key, value) => tx('meta', 'readwrite', s => s.put(value, key)),
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
