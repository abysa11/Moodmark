// The example album (?demo). Eight days written as an example, with photos
// generated for the demo by a free image model (Recraft on OpenRouter). It is
// labeled as an example everywhere and lives in its own database.
//
// Each day carries what the AI would read from a real entry: title, caption,
// atmosphere, warmth, time of day, light, weather, pace and background sound,
// so the demo shows the whole system without spending AI requests.
import { thumbBlob, paletteOf, loadImage } from './photo.js';
import { findTrack } from './music.js';
import { uid } from './db.js';

const DAYS = [
  {
    date: '2026-04-09', mood: 'calm', photos: ['rain-1', 'rain-2'],
    title: 'Вечер дождя у окна',
    text: 'Весь вечер шёл дождь. Сидели у окна, пили чай с чабрецом и молчали — хорошо так молчали. Город внизу светился мокрыми огнями.',
    caption: 'Хорошо так молчали.',
    atmosphere: 'Стук капель по стеклу, тёплая лампа и мокрые огни внизу.',
    warmth: 0.3, time: 'evening', light: 'dim', weather: 'rain', pace: -0.6, ambience: 'rain',
    song: 'Norah Jones Don\'t Know Why',
  },
  {
    date: '2026-06-21', mood: 'joy', photos: ['sea-1', 'sea-2'],
    title: 'Рассвет на пустом пляже',
    text: 'Проснулись в шесть, чтобы застать рассвет. Пляж был пустой, только мы и чайки. Вода холодная, но я всё равно зашла по колено. Нашли ракушку, похожую на ухо.',
    caption: 'Пляж был пустой, только мы и чайки.',
    atmosphere: 'Розовое небо, холодная вода и шум волн с самого утра.',
    warmth: 0.4, time: 'morning', light: 'soft', weather: 'clear', pace: 0.2, ambience: 'sea',
    song: 'Kygo Firestone',
  },
  {
    date: '2026-08-17', mood: 'nostalgia', photos: ['garden-1', 'garden-2'],
    title: 'Бабушкин сад и яблоки',
    text: 'Приехали к бабушке. Яблоня у забора всё та же, только ветки ниже. Собрали полную корзину, и бабушка сразу поставила шарлотку. Пахло как в детстве.',
    caption: 'Пахло как в детстве.',
    atmosphere: 'Длинные золотые тени, тёплое дерево крыльца и запах яблок.',
    warmth: 0.7, time: 'evening', light: 'golden', weather: 'clear', pace: -0.3, ambience: null,
    song: 'Валентин Стрыкало Наше лето',
  },
  {
    date: '2026-09-26', mood: 'energy', photos: ['concert-1', 'concert-2'],
    title: 'Концерт в старом ангаре',
    text: 'Концерт в старом ангаре. Бас бил прямо в грудь, свет менялся быстрее, чем я успевала моргнуть. Охрипла на третьей песне. Домой шли пешком в три ночи по пустой улице.',
    caption: 'Бас бил прямо в грудь.',
    atmosphere: 'Дым, неон и гул толпы, который ещё долго звенел в ушах.',
    warmth: 0.1, time: 'night', light: 'neon', weather: 'indoor', pace: 0.9, ambience: 'street',
    song: 'Daft Punk One More Time',
  },
  {
    date: '2026-10-04', mood: 'tender', photos: ['coffee'],
    title: 'Кофе вдвоём на кухне',
    text: 'Медленное воскресное утро. Сварили кофе, разделили один круассан на двоих. Солнце лежало на столе полосками, и никуда не надо было спешить.',
    caption: 'Разделили один круассан на двоих.',
    atmosphere: 'Полоски солнца на столе и запах кофе в тихой кухне.',
    warmth: 0.6, time: 'morning', light: 'soft', weather: 'indoor', pace: -0.5, ambience: null,
    song: 'Ed Sheeran Perfect',
  },
  {
    date: '2026-10-29', mood: 'sad', photos: ['station'],
    title: 'Серый вокзал и остывший чай',
    text: 'Провожала брата. Поезд ушёл, а я ещё долго стояла на платформе с остывшим чаем. Небо было низкое, как крышка.',
    caption: 'Небо было низкое, как крышка.',
    atmosphere: 'Мокрый асфальт, низкое серое небо и тишина после поезда.',
    warmth: -0.4, time: 'day', light: 'soft', weather: 'cloudy', pace: -0.4, ambience: null,
    song: 'Radiohead No Surprises',
  },
  {
    date: '2026-11-12', mood: 'tired', photos: ['desk'],
    title: 'Ночь перед сдачей проекта',
    text: 'Третья кружка кофе, сороковая правка. В окне темно, в голове шум. Сдали в 4:12, и я просто легла на пол.',
    caption: 'Сдали в 4:12.',
    atmosphere: 'Свет лампы на клавиатуре и тёмное окно глубокой ночью.',
    warmth: -0.2, time: 'night', light: 'dim', weather: 'indoor', pace: 0.3, ambience: null,
    song: 'Billie Eilish ocean eyes',
  },
  {
    date: '2026-11-19', mood: 'calm', photos: ['snow-1', 'snow-2'],
    title: 'Первый снег в парке',
    text: 'Утром выпал первый снег. Пошла в парк, пока никто не натоптал. Снег скрипел под ногами, и всё вокруг стало тише.',
    caption: 'Всё вокруг стало тише.',
    atmosphere: 'Белый мягкий свет, скрип снега и почти полная тишина.',
    warmth: -0.1, time: 'day', light: 'soft', weather: 'snow', pace: -0.4, ambience: null,
    song: 'Sigur Ros Hoppipolla',
  },
];

// Fills an empty demo database. onProgress(done, total) for the loading state.
export async function seedDemo(put, onProgress = () => {}) {
  const out = [];
  let i = 0;
  for (const d of DAYS) {
    const photos = await Promise.all(d.photos.map(n => fetch(`assets/demo/${n}.jpg`).then(r => r.blob())));
    const url = URL.createObjectURL(photos[0]);
    const img = await loadImage(url);
    URL.revokeObjectURL(url);
    const track = await findTrack(d.song).catch(() => null);
    const { song, photos: _names, ...rest } = d;
    const entry = {
      ...rest,
      id: uid(), createdAt: Date.now() + i, updatedAt: Date.now(),
      photos,
      aspect: img.naturalWidth / img.naturalHeight,
      thumb: await thumbBlob(photos[0]).catch(() => null),
      palette: paletteOf(img),
      track, trackBy: track ? 'ai' : null,
      model: 'demo', folderIds: [],
    };
    await put('entries', entry);
    out.push(entry);
    onProgress(++i, DAYS.length);
  }
  return out;
}

// A decorated cover, so the example shows what the album can look like.
export const DEMO_LOOK = {
  color: '#1f2d4a',
  stickers: [
    { id: 'demo-s1', src: 'p:moon', x: 0.78, y: 0.16, size: 0.2, rot: 12 },
    { id: 'demo-s2', src: 'p:star', x: 0.24, y: 0.78, size: 0.18, rot: -10 },
    { id: 'demo-s3', src: 'p:cat', x: 0.74, y: 0.8, size: 0.24, rot: 6 },
    { id: 'demo-s4', src: 'p:leaf', x: 0.82, y: 0.12, size: 0.16, rot: 20, page: 2 },
    { id: 'demo-s5', src: 'p:note', x: 0.14, y: 0.88, size: 0.14, rot: -8, page: 3 },
  ],
};
