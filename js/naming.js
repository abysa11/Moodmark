// Folder names: one tone, 3–7 words, a nominative noun phrase without verbs.
// Built from what the text actually mentions: time, place, people, detail, event.

const SEASON_ADJ = {
  autumn: { m: 'Осенний', f: 'Осенняя', n: 'Осеннее', p: 'Осенние' },
  winter: { m: 'Зимний', f: 'Зимняя', n: 'Зимнее', p: 'Зимние' },
  spring: { m: 'Весенний', f: 'Весенняя', n: 'Весеннее', p: 'Весенние' },
  summer: { m: 'Летний', f: 'Летняя', n: 'Летнее', p: 'Летние' },
};
const SEASON_ADV = { autumn: 'осенью', winter: 'зимой', spring: 'весной', summer: 'летом' };
const TIME_WORD = {
  morning: { w: 'Утро', g: 'n' }, day: { w: 'День', g: 'm' },
  evening: { w: 'Вечер', g: 'm' }, night: { w: 'Ночь', g: 'f' },
};
const MOOD_ADJ = {
  impression: { m: 'Тёплый', f: 'Тёплая', n: 'Тёплое' },
  collage: { m: 'Шумный', f: 'Шумная', n: 'Шумное' },
  construct: { m: 'Напряжённый', f: 'Напряжённая', n: 'Напряжённое' },
  film: { m: 'Тихий', f: 'Тихая', n: 'Тихое' },
  ma: { m: 'Ясный', f: 'Ясная', n: 'Ясное' },
};
const WEATHER_PHRASE = {
  rain: 'под дождём', snow: 'в снегопад', fog: 'в тумане', storm: 'в грозу',
  wind: 'на ветру', heat: 'в жару', cold: 'в холод', sun: 'на солнце',
};
const EVENT_G = { deadline: 'f', exam: 'm', birthday: 'm', concert: 'm', trip: 'f', move: 'm', walk: 'f', date: 'n' };

const words = s => s.split(/\s+/).filter(Boolean).length;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);

export function makeTitle(t, regime) {
  const place = t.places.find(p => p.nom !== 'дом') || t.places[0];
  const person = t.people[0]?.with;
  const event = t.events.find(e => e.key !== 'walk') || null;
  const weatherKey = t.weather.find(w => WEATHER_PHRASE[w.key])?.key;
  const weather = weatherKey && WEATHER_PHRASE[weatherKey];
  const weatherNouns = ['снег', 'дождь'];
  const detail = t.details.find(d => !(weatherNouns.includes(d) && weather)) || null;
  const time = t.timeOfDay && TIME_WORD[t.timeOfDay];
  const season = t.season;
  const parts = [];
  let rule = '';

  const add = (...xs) => xs.forEach(x => { if (x && words(parts.join(' ') + ' ' + x) <= 7) parts.push(x); });

  if (event && ['deadline', 'exam'].includes(event.key) && (time || place)) {
    rule = 'событие с давлением → «время + место + перед событием»';
    add((time ? time.w : 'День'), place ? place.at : null, event.before);
  } else if (detail && place && season) {
    rule = 'есть место и запомнившаяся деталь → «сезон + место + и деталь»';
    add(`${SEASON_ADJ[season][place.g]} ${place.nom}`, `и ${detail}`);
    if (words(parts.join(' ')) < 4) add(person);
  } else if (time && place) {
    rule = 'есть время суток и место → «время + место + с кем»';
    if (season) add(`${SEASON_ADJ[season][time.g]} ${lowerFirst(time.w)}`); else add(time.w);
    add(place.at, person);
    if (words(parts.join(' ')) < 5) add(weather);
  } else if (place) {
    rule = 'есть место → «сезон + день + место + с кем»';
    add(season ? `${SEASON_ADJ[season].m} день` : 'День', place.at, person);
    if (words(parts.join(' ')) < 5) add(weather);
  } else if (event) {
    rule = 'есть событие → «событие + с кем + погода»';
    const g = EVENT_G[event.key] || 'm';
    add(season && words(event.nom) === 1 ? `${SEASON_ADJ[season][g]} ${event.nom}` : cap(event.nom), person, weather);
  } else {
    rule = 'нет места и события → «настроение + время + с кем + погода»';
    const tw = time || TIME_WORD.day;
    add(`${(MOOD_ADJ[regime] || MOOD_ADJ.ma)[tw.g]} ${lowerFirst(tw.w)}`, person, weather);
  }

  if (words(parts.join(' ')) < 3 && season) add(SEASON_ADV[season]);
  if (words(parts.join(' ')) < 3) add(detail ? `и ${detail}` : 'без спешки');

  const title = cap(parts.join(' ').replace(/\s+/g, ' ').trim());
  return { title, rule };
}
