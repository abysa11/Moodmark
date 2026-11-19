// Rule-based text analysis (Russian first). No black box: every signal is a
// matched word stem, so the system can always say *why* a day looks the way it does.

const L = {
  pos: ['счаст', 'рад', 'радост', 'тепл', 'уют', 'любл', 'любим', 'смех', 'смея', 'смеял', 'улыб', 'весел', 'кайф',
    'отличн', 'прекрасн', 'чудесн', 'класс', 'круто', 'восторг', 'нежн', 'вкусн', 'обним', 'красив', 'приятн',
    'спокойн', 'гармон', 'благодар', 'свобод', 'вдохнов', 'ура', 'лучш', 'мечт', 'волшеб', 'светл', 'хорош',
    'доволь', 'праздн', 'наслажд', 'умиротвор', 'легко', 'ласк', 'родн', 'добр', 'разговар', 'тепло', 'обожа', 'гордил', 'горжусь', 'победи', 'получилось'],
  neg: ['груст', 'печал', 'тоск', 'устал', 'тяжел', 'плох', 'одинок', 'слез', 'плак', 'страх', 'страш', 'трев',
    'бою', 'боял', 'зло', 'злюсь', 'злил', 'раздраж', 'бесит', 'бесил', 'боль', 'болел', 'болит', 'скуч', 'стресс',
    'нерв', 'паник', 'ссор', 'обид', 'разочар', 'потерял', 'пусто', 'хмур', 'тускл', 'депрес', 'ужас', 'кошмар',
    'провал', 'ошибк', 'опозд', 'сорвал', 'выгор', 'измот', 'безнад', 'жаль', 'вымота', 'не успе', 'никак', 'давлен', 'напряж'],
  high: ['быстр', 'бег', 'бежал', 'танц', 'концерт', 'шумн', 'шум', 'громк', 'срочн', 'дедлайн', 'спеш', 'тороп',
    'вечерин', 'тусов', 'адрен', 'крич', 'толп', 'драйв', 'энерг', 'прыг', 'гонк', 'паник', 'стресс', 'взрыв',
    'фестив', 'клуб', 'марафон', 'матч', 'восторг', 'сует', 'аврал', 'сдач', 'презентац', 'экзамен', 'напряж',
    'кричал', 'смеял', 'нерв', 'бессон', 'кофеин', 'энергетик', 'рывок', 'горел', 'горит', 'ритм'],
  low: ['тих', 'тишин', 'спокой', 'медлен', 'долго', 'лен', 'ленив', 'сон', 'спал', 'засып', 'дрем', 'плед', 'книг',
    'чай', 'какао', 'уют', 'мягк', 'неспеш', 'умиротвор', 'отдых', 'лежал', 'валял', 'созерц', 'медитац', 'молча',
    'шепот', 'шёпот', 'пруд', 'озер', 'гулял', 'прогул', 'смотрел', 'разговар', 'задумч', 'дожд'],
  warm: ['тепл', 'какао', 'чай', 'кофе', 'солн', 'плед', 'свеч', 'камин', 'костер', 'костёр', 'обним', 'уют', 'ламп',
    'закат', 'золот', 'желт', 'жёлт', 'оранж', 'рыж', 'печень', 'выпечк', 'пирог', 'жар', 'лето', 'летн'],
  cold: ['холод', 'мороз', 'ветер', 'ветр', 'снег', 'лед', 'лёд', 'серо', 'серы', 'сера', 'хмур', 'дожд', 'туман', 'офис', 'монитор',
    'неон', 'синий', 'синев', 'бетон', 'метро', 'экран', 'ночь', 'ночью', 'слякот'],
};

const SEASON = [
  ['autumn', /(осен|листопад|листь|листв|сентябр|октябр|ноябр)/],
  ['winter', /(зим|снег|мороз|новый год|новогод|ёлк|елк|декабр|январ|феврал|каток|сугроб)/],
  ['spring', /(весн|весен|цветен|сакур|ручь|капел|март|апрел|\bма[йя]\b|подснеж)/],
  ['summer', /(\bлет(о|а|ом|н\w*)\b|пляж|\bжар|загар|июн|июл|август|купал)/],
];

const TIME = [
  ['night', /(ноч|полноч|до утра|бессон|\b[0-4]\s?(час|ч\b))/],
  ['morning', /(утр|рассвет|завтрак|проснул)/],
  ['evening', /(вечер|закат|ужин|сумерк)/],
  ['day', /(днём|днем|полдень|обед|\bдень\b)/],
];

const WEATHER = [
  ['rain', /дожд|ливн|ливень|морос|лужи|зонт/, 'дождь'],
  ['snow', /снег|снеж|метел|сугроб/, 'снег'],
  ['sun', /солн|ясно|ясный|безоблач/, 'солнце'],
  ['fog', /туман|дымк/, 'туман'],
  ['wind', /ветер|ветр/, 'ветер'],
  ['storm', /гроз|гром|молни/, 'гроза'],
  ['cold', /холод|мороз|зябк|замерз/, 'холод'],
  ['heat', /\bжар|духот|зной/, 'жара'],
];

// place: nominative, gender (for season adjective), and the "where" phrase
export const PLACES = [
  { re: /пруд/, nom: 'пруд', g: 'm', at: 'у пруда' },
  { re: /\bпарк/, nom: 'парк', g: 'm', at: 'в парке' },
  { re: /\bмор[еяю]|морск/, nom: 'море', g: 'n', at: 'у моря' },
  { re: /пляж/, nom: 'пляж', g: 'm', at: 'на пляже' },
  { re: /офис|опенспейс|коворк/, nom: 'офис', g: 'm', at: 'в офисе' },
  { re: /кофейн|кафе|ресторан|бар\b/, nom: 'кафе', g: 'n', at: 'в кафе' },
  { re: /\bгор[ыаеу]?\b|горах|горн/, nom: 'горы', g: 'p', at: 'в горах' },
  { re: /\bлес[ау]?\b|лесу|лесн/, nom: 'лес', g: 'm', at: 'в лесу' },
  { re: /набережн/, nom: 'набережная', g: 'f', at: 'на набережной' },
  { re: /\bозер|озеро/, nom: 'озеро', g: 'n', at: 'у озера' },
  { re: /\bрек[аиеу]\b|реки|речк/, nom: 'река', g: 'f', at: 'у реки' },
  { re: /концерт/, nom: 'концерт', g: 'm', at: 'на концерте' },
  { re: /дач[аеиу]/, nom: 'дача', g: 'f', at: 'на даче' },
  { re: /кухн/, nom: 'кухня', g: 'f', at: 'на кухне' },
  { re: /балкон/, nom: 'балкон', g: 'm', at: 'на балконе' },
  { re: /универ|университет|институт|аудитор/, nom: 'университет', g: 'm', at: 'в университете' },
  { re: /школ/, nom: 'школа', g: 'f', at: 'в школе' },
  { re: /поезд|вокзал/, nom: 'поезд', g: 'm', at: 'в поезде' },
  { re: /аэропорт|самолет|самолёт/, nom: 'аэропорт', g: 'm', at: 'в аэропорту' },
  { re: /\bкино\b|кинотеатр/, nom: 'кино', g: 'n', at: 'в кино' },
  { re: /музе/, nom: 'музей', g: 'm', at: 'в музее' },
  { re: /каток|катке/, nom: 'каток', g: 'm', at: 'на катке' },
  { re: /\bдом[аеу]?\b|квартир|комнат/, nom: 'дом', g: 'm', at: 'дома' },
  { re: /\bгород|улиц|центр[еау]?\b|проспект/, nom: 'город', g: 'm', at: 'в городе' },
  { re: /степ/, nom: 'степь', g: 'f', at: 'в степи' },
];

export const PEOPLE = [
  { re: /девушк/, with: 'с девушкой' },
  { re: /\bпарн[еяю]м?|\bпарень|бойфренд/, with: 'с парнем' },
  { re: /\bмуж[еау]?м?\b/, with: 'с мужем' },
  { re: /\bжен[аоеуы]й?\b/, with: 'с женой' },
  { re: /\bмам/, with: 'с мамой' },
  { re: /\bпап/, with: 'с папой' },
  { re: /\bбабушк|\bбабул/, with: 'с бабушкой' },
  { re: /сестр/, with: 'с сестрой' },
  { re: /\bбрат/, with: 'с братом' },
  { re: /\bсемь[ёеия]|родител|родн(ыми|ые)/, with: 'с семьёй' },
  { re: /друз|подруг|подружк|\bдруг(ом|а)\b/, with: 'с друзьями' },
  { re: /коллег/, with: 'с коллегами' },
  { re: /команд/, with: 'с командой' },
  { re: /\bсобак|\bпёс|\bпес\b|щенк/, with: 'с собакой' },
  { re: /\bодин\b|\bодна\b|в одиночеств|наедине/, with: 'наедине с собой' },
];

export const DETAILS = [
  ['какао', /какао/], ['кофе', /кофе/], ['чай', /\bча[йяю]/], ['вино', /\bвин[оау]/], ['пицца', /пицц/],
  ['мороженое', /морожен/], ['костёр', /костер|костёр|костр/], ['гитара', /гитар/], ['книги', /книг/],
  ['плед', /плед/], ['закат', /закат/], ['рассвет', /рассвет/], ['звёзды', /звезд|звёзд/], ['листья', /листь|листопад|листв/],
  ['снег', /снег/], ['дождь', /дожд/], ['фейерверк', /фейерверк|салют/], ['торт', /\bторт/], ['свечи', /свеч/],
  ['велосипеды', /велосипед|велик/], ['фонари', /фонар/],
];

export const EVENTS = [
  { key: 'deadline', re: /сдач|дедлайн|релиз|аврал|сдавал/, nom: 'сдача проекта', before: 'перед сдачей' },
  { key: 'exam', re: /экзамен|сесси/, nom: 'экзамен', before: 'перед экзаменом' },
  { key: 'birthday', re: /день рожд|днюх|др\b/, nom: 'день рождения', before: 'в день рождения' },
  { key: 'concert', re: /концерт|фестив/, nom: 'концерт', before: 'после концерта' },
  { key: 'trip', re: /поездк|путешеств|поехали|уехал|улетел/, nom: 'поездка', before: 'в дороге' },
  { key: 'move', re: /переезд|переехал/, nom: 'переезд', before: 'в день переезда' },
  { key: 'walk', re: /гуля|прогул/, nom: 'прогулка', before: 'на прогулке' },
  { key: 'date', re: /свидани/, nom: 'свидание', before: 'на свидании' },
];

// JS \b is ASCII-only, so rebuild every regex with a Cyrillic-aware boundary.
const BOUND = '(?:(?<![а-яa-z0-9])(?=[а-яa-z0-9])|(?<=[а-яa-z0-9])(?![а-яa-z0-9]))';
const fix = re => new RegExp(re.source.replaceAll('\\b', BOUND), re.flags);
SEASON.forEach(x => { x[1] = fix(x[1]); });
TIME.forEach(x => { x[1] = fix(x[1]); });
WEATHER.forEach(x => { x[1] = fix(x[1]); });
PLACES.forEach(x => { x.re = fix(x.re); });
PEOPLE.forEach(x => { x.re = fix(x.re); });
DETAILS.forEach(x => { x[1] = fix(x[1]); });
EVENTS.forEach(x => { x.re = fix(x.re); });

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const norm = s => s.toLowerCase().replace(/ё/g, 'е');

function matchStems(tokens, stems) {
  const hits = [];
  const ns = stems.map(norm);
  tokens.forEach((t, i) => {
    const s = ns.find(st => !st.includes(' ') && t.startsWith(st));
    if (s) hits.push({ word: t, i });
  });
  return hits;
}

export function analyzeText(raw, dateStr) {
  const text = (raw || '').trim();
  const low = norm(text);
  const tokens = low.match(/[a-zа-я]+/g) || [];
  const isNeg = i => i > 0 && /^(не|нет|без|ни)$/.test(tokens[i - 1]);

  // sentiment with simple negation flip
  const pos = [], neg = [];
  matchStems(tokens, L.pos).forEach(h => (isNeg(h.i) ? neg : pos).push(h.word));
  matchStems(tokens, L.neg).forEach(h => (isNeg(h.i) ? pos : neg).push(h.word));
  L.neg.filter(s => s.includes(' ')).forEach(s => { if (low.includes(s)) neg.push(s); });
  const high = matchStems(tokens, L.high).map(h => h.word);
  const lowA = matchStems(tokens, L.low).map(h => h.word);
  const warm = matchStems(tokens, L.warm).map(h => h.word);
  const cold = matchStems(tokens, L.cold).map(h => h.word);

  const exclam = (text.match(/!/g) || []).length;
  const valence = clamp((pos.length - neg.length) / Math.max(3, pos.length + neg.length) * 1.4, -1, 1);
  const arousal = clamp(0.45 + (high.length - lowA.length) * 0.09 + Math.min(exclam, 4) * 0.04, 0, 1);
  const temperature = clamp((warm.length - cold.length) / Math.max(3, warm.length + cold.length) * 1.3, -1, 1);

  let season = SEASON.find(([, re]) => re.test(low))?.[0] || null;
  const seasonFromText = !!season;
  if (!season && dateStr) {
    const m = new Date(dateStr).getMonth();
    season = [11, 0, 1].includes(m) ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }
  const timeOfDay = TIME.find(([, re]) => re.test(low))?.[0] || null;
  const weather = WEATHER.filter(([, re]) => re.test(low)).map(([k, , label]) => ({ key: k, label }));
  const places = PLACES.filter(p => p.re.test(low));
  // Someone counts as "with me" only in a «с …» construction (or «мы … с»);
  // being alone wins over people who are only remembered or mentioned.
  const solo = PEOPLE[PEOPLE.length - 1];
  const people = solo.re.test(low) ? [solo] : PEOPLE.slice(0, -1).filter(p => {
    const re = new RegExp(p.re.source, 'g');
    let m;
    while ((m = re.exec(low))) {
      const before = low.slice(Math.max(0, m.index - 24), m.index);
      if (/(^|[^а-яa-z])(с|со|вместе с)\s+([а-я]+\s+)?$/.test(before)) return true;
    }
    return false;
  });
  const details = DETAILS.filter(([, re]) => re.test(low)).map(([n]) => n);
  const events = EVENTS.filter(e => e.re.test(low));

  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  let caption = sentences[0] || '';
  if (caption.length > 96) caption = caption.slice(0, 92).replace(/\s+\S*$/, '') + '…';

  return {
    valence, arousal, temperature,
    hits: { pos, neg, high, low: lowA, warm, cold },
    season, seasonFromText, timeOfDay, weather, places, people, details, events,
    caption, sentences: sentences.length, words: tokens.length, exclam,
  };
}

export const SEASON_RU = { autumn: 'осень', winter: 'зима', spring: 'весна', summer: 'лето' };
export const TIME_RU = { morning: 'утро', day: 'день', evening: 'вечер', night: 'ночь' };
