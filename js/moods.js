// The eight base moods. Each mood carries the "grade" used by the memory view
// (how the photo is colored and how fast it breathes), its own light colors
// (tint) and the range of pace it allows: the mood the person chose leads,
// the photo and the AI only adjust within it.
export const MOODS = [
  { id: 'joy',       name: 'Радость',      grade: { warm: 0.5,  sat: 1.15, bright: 1.06, blur: 40, speed: 1.0, grain: 0.06 },  tint: ['#ffd25e', '#ff8f6b', '#7fd3ff'], pace: [0, 1], query: 'feel good summer pop' },
  { id: 'calm',      name: 'Спокойствие',  grade: { warm: 0.15, sat: 0.9,  bright: 1.02, blur: 56, speed: 0.6, grain: 0.05 },  tint: ['#9fcbe8', '#b9e2c9', '#eaf2f8'], pace: [-1, 0.3], query: 'calm acoustic morning' },
  { id: 'tender',    name: 'Нежность',     grade: { warm: 0.35, sat: 0.95, bright: 1.05, blur: 60, speed: 0.55, grain: 0.07 }, tint: ['#ffc3d4', '#ffd8b5', '#fff0de'], pace: [-1, 0.3], query: 'soft love song' },
  { id: 'nostalgia', name: 'Ностальгия',   grade: { warm: 0.45, sat: 0.75, bright: 0.98, blur: 52, speed: 0.5, grain: 0.12 }, tint: ['#f2c27b', '#d99a6c', '#f5e3c0'], pace: [-1, 0.4], query: 'nostalgic vintage classic' },
  { id: 'sad',       name: 'Грусть',       grade: { warm: -0.3, sat: 0.6,  bright: 0.9,  blur: 64, speed: 0.45, grain: 0.1 },   tint: ['#8fa6c4', '#aab5c3', '#6f86a6'], pace: [-1, 0.2], query: 'sad piano ballad' },
  { id: 'anxious',   name: 'Тревога',      grade: { warm: -0.45, sat: 0.7, bright: 0.88, blur: 36, speed: 1.2, grain: 0.14 },   tint: ['#7d8fb3', '#a6acc8', '#5c6f99'], pace: [-0.2, 1], query: 'dark electronic tension' },
  { id: 'energy',    name: 'Драйв',        grade: { warm: 0.1,  sat: 1.25, bright: 1.04, blur: 30, speed: 1.4, grain: 0.08 }, tint: ['#ff5f6d', '#ffc371', '#4fd1ff'], pace: [0.2, 1], query: 'energetic dance electronic' },
  { id: 'tired',     name: 'Усталость',    grade: { warm: -0.1, sat: 0.55, bright: 0.92, blur: 60, speed: 0.4, grain: 0.09 }, tint: ['#aaa6b8', '#cbc3b2', '#8f97a8'], pace: [-1, 0.2], query: 'lofi chill evening' },
];

// Custom moods: the user's own word for the day, tied to the base mood whose
// look it is closest to (that base sets colors and pace).
let custom = [];
export const setCustomMoods = list => { custom = list; };
export const customMoods = () => custom;
export const allMoods = () => [...MOODS, ...custom.map(c => moodById(c.id))];

export function moodById(id) {
  const base = MOODS.find(m => m.id === id);
  if (base) return base;
  const c = custom.find(m => m.id === id);
  if (c) {
    const b = MOODS.find(m => m.id === c.base) || MOODS[1];
    return { ...b, id: c.id, name: c.name, base: b.id, custom: true };
  }
  return MOODS[1];
}
