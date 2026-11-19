// Collections: named folders that gather days from different dates.
// Stored in the meta store as one list: [{ id, name, dayIds, createdAt }].

import { db, uid } from './db.js';

export async function listCollections() {
  return (await db.getMeta('collections')) || [];
}
export async function getCollection(id) {
  return (await listCollections()).find(c => c.id === id) || null;
}
export async function saveCollection(c) {
  const all = await listCollections();
  const item = { id: c.id || uid(), name: c.name.trim(), dayIds: [...new Set(c.dayIds || [])], createdAt: c.createdAt || Date.now() };
  const i = all.findIndex(x => x.id === item.id);
  if (i >= 0) all[i] = item; else all.unshift(item);
  await db.setMeta('collections', all);
  return item;
}
export async function removeCollection(id) {
  await db.setMeta('collections', (await listCollections()).filter(c => c.id !== id));
}
export async function collectionsOf(dayId) {
  return (await listCollections()).filter(c => c.dayIds.includes(dayId));
}
// keep collections clean when a day is deleted
export async function forgetDay(dayId) {
  const all = await listCollections();
  await db.setMeta('collections', all.map(c => ({ ...c, dayIds: c.dayIds.filter(d => d !== dayId) })));
}
