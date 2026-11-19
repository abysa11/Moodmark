// Interface languages: Kazakh, Russian, English.
// t('key', { n: 3 }) returns the string in the current language.

export const LANGS = { kk: 'Қаз', ru: 'Рус', en: 'Eng' };
export const LANG_NAMES = { kk: 'қазақ', ru: 'русский', en: 'English' };

const D = {
  // shell
  doc_title: ['Moodmark — дневник, который помнит, как ощущался день', 'Moodmark — күннің қалай өткенін есте сақтайтын күнделік', 'Moodmark — a diary that remembers how a day felt'],
  doc_desc: ['Напишите пару строк о дне, добавьте фото и песню. Moodmark соберёт из них живое воспоминание с музыкой, палитрой и ритмом этого дня.', 'Күн туралы бірнеше жол жазып, фото мен ән қосыңыз. Moodmark олардан сол күннің музыкасы, түсі мен ырғағы бар тірі естелік жасайды.', 'Write a few lines about your day, add photos and a song. Moodmark turns them into a living memory with the music, colours and rhythm of that day.'],
  skip: ['К содержимому', 'Мазмұнға өту', 'Skip to content'],
  hide_panel: ['Скрыть панель', 'Панельді жасыру', 'Hide panel'],
  show_panel: ['Показать панель', 'Панельді көрсету', 'Show panel'],
  sections: ['Разделы', 'Бөлімдер', 'Sections'],
  folders: ['Папки', 'Бумалар', 'Folders'],
  days: ['Дни', 'Күндер', 'Days'],
  restore_demo: ['Вернуть демо-дни', 'Демо күндерді қайтару', 'Restore demo days'],
  where: ['Где вы', 'Қайдасыз', 'You are here'],
  brand_all: ['Moodmark — все дни', 'Moodmark — барлық күндер', 'Moodmark — all days'],
  language: ['Язык', 'Тіл', 'Language'],

  // sorting
  sort_new: ['Сначала новые', 'Алдымен жаңалары', 'Newest first'],
  sort_light: ['Сначала светлые', 'Алдымен жарқын күндер', 'Brightest first'],
  sort_sad: ['Сначала грустные', 'Алдымен мұңды күндер', 'Saddest first'],
  sort_energy: ['Сначала энергичные', 'Алдымен қуатты күндер', 'Most energetic first'],
  sort_calm: ['Сначала спокойные', 'Алдымен тыныш күндер', 'Calmest first'],
  sort_old: ['Сначала старые', 'Алдымен ескілері', 'Oldest first'],

  // moods
  mood_collage: ['Радость', 'Қуаныш', 'Joy'],
  mood_impression: ['Спокойствие', 'Тыныштық', 'Calm'],
  mood_ma: ['Тишина', 'Үнсіздік', 'Stillness'],
  mood_film: ['Грусть', 'Мұң', 'Sadness'],
  mood_construct: ['Напряжение', 'Шиеленіс', 'Tension'],

  // archive
  no_days_side: ['Дней пока нет', 'Әзірге күндер жоқ', 'No days yet'],
  demo_restored: ['Демо-дни восстановлены', 'Демо күндер қалпына келтірілді', 'Demo days restored'],
  demo_restore_fail: ['Не удалось восстановить демо-дни', 'Демо күндерді қалпына келтіру мүмкін болмады', 'Couldn’t restore the demo days'],
  all_days: ['Все дни', 'Барлық күндер', 'All days'],
  diary: ['Дневник', 'Күнделік', 'Diary'],
  diary_lead: ['Каждый день здесь — папка: запись, фото и песня, собранные в живое воспоминание.', 'Әр күн — жеке бума: жазба, фото және ән бір тірі естелікке жиналады.', 'Every day here is a folder: an entry, photos and a song gathered into a living memory.'],
  new_day: ['Новый день', 'Жаңа күн', 'New day'],
  search_diary: ['Поиск по дневнику', 'Күнделіктен іздеу', 'Search the diary'],
  search_days: ['Поиск по дням', 'Күндерді іздеу', 'Search days'],
  sort: ['Сортировка', 'Сұрыптау', 'Sort'],
  day_mood: ['Настроение дня', 'Күннің көңіл-күйі', 'Mood of the day'],
  all: ['Все', 'Барлығы', 'All'],
  seeding: ['Собираю демо-дни {i}/{n}…', 'Демо күндерді жинап жатырмын {i}/{n}…', 'Preparing demo days {i}/{n}…'],
  diary_empty: ['Дневник пока пуст', 'Күнделік әзірге бос', 'The diary is empty'],
  diary_empty_hint: ['Начните с одного из самых любимых дней.', 'Ең сүйікті күндеріңіздің бірінен бастаңыз.', 'Start with one of your favourite days.'],
  no_match: ['Таких дней пока нет', 'Мұндай күндер әзірге жоқ', 'No days like this yet'],
  no_match_hint: ['Выберите другое настроение или сбросьте поиск.', 'Басқа көңіл-күйді таңдаңыз немесе іздеуді тазалаңыз.', 'Pick another mood or clear the search.'],
  memory_of: ['Воспоминание дня «{t}»', '«{t}» күнінің естелігі', 'Memory of “{t}”'],

  // folders
  no_days_diary: ['В дневнике пока нет дней.', 'Күнделікте әзірге күндер жоқ.', 'There are no days in the diary yet.'],
  new_folder: ['Новая папка', 'Жаңа бума', 'New folder'],
  close: ['Закрыть', 'Жабу', 'Close'],
  name: ['Название', 'Атауы', 'Name'],
  folder_name_ph: ['Например: Лето 2026 или Дни с друзьями', 'Мысалы: 2026 жылғы жаз немесе Достармен өткен күндер', 'For example: Summer 2026 or Days with friends'],
  folder_name_err: ['Придумайте название папки.', 'Бумаға атау беріңіз.', 'Give the folder a name.'],
  days_in_folder: ['Дни в папке', 'Бумадағы күндер', 'Days in the folder'],
  cancel: ['Отмена', 'Болдырмау', 'Cancel'],
  create_folder: ['Создать папку', 'Бума жасау', 'Create folder'],
  folder_created: ['Папка создана', 'Бума жасалды', 'Folder created'],
  add_to_folder: ['Добавить в папку', 'Бумаға қосу', 'Add to folder'],
  no_folders_yet: ['Папок пока нет — создайте первую.', 'Әзірге бумалар жоқ — алғашқысын жасаңыз.', 'No folders yet — create the first one.'],
  new_folder_ph: ['Название новой папки', 'Жаңа буманың атауы', 'New folder name'],
  save: ['Сохранить', 'Сақтау', 'Save'],
  folders_updated: ['Папки обновлены', 'Бумалар жаңартылды', 'Folders updated'],
  not_found: ['Не найдено', 'Табылмады', 'Not found'],
  no_folder: ['Такой папки нет', 'Мұндай бума жоқ', 'This folder doesn’t exist'],
  to_all_days: ['Ко всем дням', 'Барлық күндерге', 'To all days'],
  folder: ['Папка', 'Бума', 'Folder'],
  folder_empty_short: ['Пока пустая', 'Әзірге бос', 'Empty for now'],
  add_days: ['Добавить дни', 'Күндер қосу', 'Add days'],
  rename: ['Переименовать', 'Атын өзгерту', 'Rename'],
  delete_folder: ['Удалить папку', 'Буманы жою', 'Delete folder'],
  delete_folder_q: ['Удалить папку «{n}»? Сами дни останутся в дневнике.', '«{n}» бумасын жоясыз ба? Күндердің өзі күнделікте қалады.', 'Delete the folder “{n}”? The days stay in the diary.'],
  delete: ['Удалить', 'Жою', 'Delete'],
  remove_from_folder: ['Убрать из папки', 'Бумадан алу', 'Remove from folder'],
  folder_empty: ['В папке пока нет дней', 'Бумада әзірге күндер жоқ', 'No days in this folder yet'],
  folder_empty_hint: ['Соберите сюда дни с разных дат: поездку, лето, дни с близкими.', 'Мұнда әр түрлі күндерді жинаңыз: сапар, жаз, жақындармен өткен күндер.', 'Gather days from different dates here: a trip, a summer, days with loved ones.'],
  days_in_named: ['Дни в папке «{n}»', '«{n}» бумасындағы күндер', 'Days in “{n}”'],
  rename_folder: ['Переименовать папку', 'Буманың атын өзгерту', 'Rename folder'],
  folder_deleted: ['Папка удалена', 'Бума жойылды', 'Folder deleted'],
  day_removed_from_folder: ['День убран из папки', 'Күн бумадан алынды', 'Day removed from the folder'],

  // new day
  how_was: ['Как прошёл день?', 'Күніңіз қалай өтті?', 'How was your day?'],
  how_was_lead: ['Пара строк, фото и песня, которая тогда звучала. Остальное Moodmark сделает сам.', 'Бірнеше жол, фото және сол кезде ойнаған ән. Қалғанын Moodmark өзі жасайды.', 'A few lines, photos and the song that was playing. Moodmark does the rest.'],
  entry: ['Запись', 'Жазба', 'Entry'],
  entry_ph: ['Расскажите, как близкому другу: где были, с кем, какая была погода, что запомнилось.', 'Жақын досыңызға айтқандай жазыңыз: қайда болдыңыз, кіммен, ауа райы қандай болды, не есте қалды.', 'Write as if to a close friend: where you were, who with, what the weather was like, what stayed with you.'],
  entry_hint: ['Чем конкретнее, тем точнее воспоминание.', 'Неғұрлым нақты жазсаңыз, естелік соғұрлым дәл болады.', 'The more specific you are, the truer the memory.'],
  entry_err: ['Напишите хотя бы одно предложение о дне.', 'Күн туралы кемінде бір сөйлем жазыңыз.', 'Write at least one sentence about the day.'],
  photos: ['Фото', 'Фото', 'Photos'],
  up_to_8: ['до 8 штук', '8 данаға дейін', 'up to 8'],
  choose_photos: ['Выберите фото', 'Фото таңдаңыз', 'Choose photos'],
  or_drop: ['или перетащите сюда', 'немесе осында сүйреңіз', 'or drop them here'],
  photos_err: ['Добавьте минимум одно фото.', 'Кемінде бір фото қосыңыз.', 'Add at least one photo.'],
  song: ['Песня', 'Ән', 'Song'],
  song_source: ['Источник песни', 'Ән көзі', 'Song source'],
  find: ['Найти', 'Іздеу', 'Search'],
  own_file: ['Свой файл', 'Өз файлым', 'My file'],
  song_search: ['Поиск песни', 'Ән іздеу', 'Song search'],
  song_ph: ['Песня или исполнитель', 'Ән немесе орындаушы', 'Song or artist'],
  song_hint: ['Каталог Apple Music. Отрывок песни будет звучать вместе с воспоминанием прямо на сайте.', 'Apple Music каталогы. Әннің үзіндісі естелікпен бірге осы сайтта ойнайды.', 'Apple Music catalogue. A preview of the song plays with the memory right on the site.'],
  choose_audio: ['Выберите аудиофайл', 'Аудиофайлды таңдаңыз', 'Choose an audio file'],
  song_err: ['Выберите песню дня.', 'Күннің әнін таңдаңыз.', 'Choose the song of the day.'],
  details: ['Детали', 'Толығырақ', 'Details'],
  optional: ['необязательно', 'міндетті емес', 'optional'],
  own_emotions: ['Свои эмоции', 'Өз эмоцияларыңыз', 'Your emotions'],
  own_emotions_ph: ['Например: ностальгия, предвкушение, лёгкость', 'Мысалы: сағыныш, күту, жеңілдік', 'For example: nostalgia, anticipation, lightness'],
  own_emotions_hint: ['Через запятую. Добавятся к эмоциям, которые найдёт ИИ, и появятся в фильтрах дневника.', 'Үтір арқылы жазыңыз. ЖИ тапқан эмоцияларға қосылып, күнделік сүзгілерінде шығады.', 'Separate with commas. They join the emotions the AI finds and appear in the diary filters.'],
  date: ['Дата', 'Күні', 'Date'],
  time_of_day: ['Время суток', 'Тәулік уақыты', 'Time of day'],
  from_entry: ['Из записи', 'Жазбадан', 'From the entry'],
  morning: ['Утро', 'Таң', 'Morning'],
  daytime: ['День', 'Күндіз', 'Day'],
  evening: ['Вечер', 'Кеш', 'Evening'],
  night: ['Ночь', 'Түн', 'Night'],
  weather: ['Погода', 'Ауа райы', 'Weather'],
  w_sun: ['Ясно', 'Ашық', 'Clear'],
  w_rain: ['Дождь', 'Жаңбыр', 'Rain'],
  w_snow: ['Снег', 'Қар', 'Snow'],
  w_fog: ['Туман', 'Тұман', 'Fog'],
  w_wind: ['Ветер', 'Жел', 'Wind'],
  build: ['Собрать воспоминание', 'Естелік құрастыру', 'Create the memory'],
  photo_n: ['Фото {n}', 'Фото {n}', 'Photo {n}'],
  remove_photo_n: ['Удалить фото {n}', '{n}-фотоны жою', 'Remove photo {n}'],
  not_photo: ['Это не похоже на фото', 'Бұл фотоға ұқсамайды', 'That doesn’t look like a photo'],
  max_8: ['Можно добавить до 8 фото', '8 фотоға дейін қосуға болады', 'You can add up to 8 photos'],
  listen_preview: ['Послушать отрывок: {t}', 'Үзіндіні тыңдау: {t}', 'Play preview: {t}'],
  change: ['Изменить', 'Өзгерту', 'Change'],
  choose: ['Выбрать', 'Таңдау', 'Choose'],
  searching: ['Ищу «{q}»…', '«{q}» іздеп жатырмын…', 'Searching “{q}”…'],
  nothing_found: ['Ничего не нашлось. Попробуйте написать исполнителя латиницей.', 'Ештеңе табылмады. Орындаушыны латынша жазып көріңіз.', 'Nothing found. Try another spelling of the artist.'],
  search_down: ['Поиск сейчас недоступен. Можно загрузить свой файл.', 'Іздеу қазір қолжетімсіз. Өз файлыңызды жүктеуге болады.', 'Search is unavailable right now. You can upload your own file.'],
  preview_fail: ['Не удалось включить отрывок', 'Үзіндіні қосу мүмкін болмады', 'Couldn’t play the preview'],
  listening: ['Слушаю песню: темп, лад, энергия…', 'Әнді тыңдап жатырмын: қарқын, лад, қуат…', 'Listening: tempo, key, energy…'],
  major: ['мажор', 'мажор', 'major'],
  minor: ['минор', 'минор', 'minor'],
  energy: ['энергия', 'қуат', 'energy'],
  file_err: ['Не удалось прочитать файл. Попробуйте MP3 или M4A.', 'Файлды оқу мүмкін болмады. MP3 немесе M4A көріңіз.', 'Couldn’t read the file. Try MP3 or M4A.'],
  st_song: ['Загружаю песню', 'Әнді жүктеп жатырмын', 'Loading the song'],
  st_ai: ['ИИ читает запись', 'ЖИ жазбаны оқып жатыр', 'The AI is reading the entry'],
  st_text: ['Ищу место, время, погоду', 'Орынды, уақытты, ауа райын іздеп жатырмын', 'Finding the place, time and weather'],
  st_photos: ['Смотрю на фото', 'Фотоларды қарап жатырмын', 'Looking at the photos'],
  st_music: ['Слушаю темп и лад', 'Қарқын мен ладты тыңдап жатырмын', 'Listening to tempo and key'],
  st_style: ['Подбираю приём и палитру', 'Тәсіл мен түстерді таңдап жатырмын', 'Choosing the style and palette'],
  st_render: ['Рисую воспоминание', 'Естелікті салып жатырмын', 'Drawing the memory'],
  st_save: ['Сохраняю папку дня', 'Күн бумасын сақтап жатырмын', 'Saving the day folder'],
  building: ['Собираю воспоминание', 'Естелікті құрастырып жатырмын', 'Creating the memory'],
  went_wrong: ['Что-то пошло не так', 'Бірдеңе дұрыс болмады', 'Something went wrong'],
  build_fail: ['Не получилось собрать воспоминание: {e}. Попробуйте ещё раз или выберите другое фото.', 'Естелікті құрастыру мүмкін болмады: {e}. Қайталап көріңіз немесе басқа фото таңдаңыз.', 'Couldn’t create the memory: {e}. Try again or choose another photo.'],
  unknown_error: ['неизвестная ошибка', 'белгісіз қате', 'unknown error'],

  // day page
  no_day: ['Такого дня нет в дневнике', 'Мұндай күн күнделікте жоқ', 'This day isn’t in the diary'],
  song_of_day: ['Песня дня', 'Күннің әні', 'Song of the day'],
  animated_memory: ['Анимированное воспоминание дня «{t}»', '«{t}» күнінің анимациялық естелігі', 'Animated memory of “{t}”'],
  pause: ['Пауза', 'Кідірту', 'Pause'],
  play: ['Воспроизвести', 'Ойнату', 'Play'],
  restart: ['С начала', 'Басынан', 'From the start'],
  turn_on_music: ['Включить музыку', 'Музыканы қосу', 'Turn on the music'],
  cover: ['Обложка: {t}', 'Мұқаба: {t}', 'Cover: {t}'],
  song_progress: ['Прогресс песни', 'Ән барысы', 'Song progress'],
  mute: ['Выключить звук', 'Дыбысты өшіру', 'Mute'],
  unmute: ['Включить звук', 'Дыбысты қосу', 'Unmute'],
  open_apple: ['Открыть полную песню в Apple Music', 'Толық әнді Apple Music-та ашу', 'Open the full song in Apple Music'],
  zip: ['Папка .zip', 'Бума .zip', 'Folder .zip'],
  video: ['Видео', 'Бейне', 'Video'],
  png: ['Кадр .png', 'Кадр .png', 'Frame .png'],
  demo: ['демо', 'демо', 'demo'],
  my_voice: ['Мой голос', 'Менің дауысым', 'My voice'],
  my_voice_hint: ['Расскажите о дне своим голосом: запись звучит поверх музыки', 'Күн туралы өз дауысыңызбен айтыңыз: жазба музыкамен бірге ойнайды', 'Tell the story of the day in your own voice: it plays over the music'],
  day_photo_n: ['Фото дня {n}', 'Күннің {n}-фотосы', 'Photo {n} of the day'],
  day_folder: ['Папка дня', 'Күн бумасы', 'Day folder'],
  f_entry: ['запись', 'жазба', 'entry'],
  f_sound: ['звук', 'дыбыс', 'audio'],
  f_desc: ['описание', 'сипаттама', 'description'],
  f_memory: ['воспоминание', 'естелік', 'memory'],
  f_voice: ['мой голос', 'менің дауысым', 'my voice'],
  kb: ['КБ', 'КБ', 'KB'],
  delete_day: ['Удалить день', 'Күнді жою', 'Delete day'],
  delete_day_q: ['Удалить «{t}»? Папку дня нельзя будет восстановить.', '«{t}» жоясыз ба? Күн бумасын қалпына келтіру мүмкін болмайды.', 'Delete “{t}”? The day folder can’t be restored.'],
  rec_done: ['Готово', 'Дайын', 'Done'],
  stop: ['Остановить', 'Тоқтату', 'Stop'],
  listen: ['Слушать', 'Тыңдау', 'Listen'],
  rerecord: ['Перезаписать', 'Қайта жазу', 'Re-record'],
  delete_my_rec: ['Удалить мою запись', 'Жазбамды жою', 'Delete my recording'],
  record_voice: ['Записать голос', 'Дауыс жазу', 'Record voice'],
  no_rec: ['Этот браузер не умеет записывать звук', 'Бұл браузер дыбыс жаза алмайды', 'This browser can’t record audio'],
  no_mic: ['Нет доступа к микрофону', 'Микрофонға рұқсат жоқ', 'No access to the microphone'],
  voice_saved: ['Голос сохранён в папку дня', 'Дауыс күн бумасына сақталды', 'Voice saved to the day folder'],
  rec_play_fail: ['Не удалось включить запись', 'Жазбаны қосу мүмкін болмады', 'Couldn’t play the recording'],
  remove_emo: ['Убрать эмоцию {e}', '«{e}» эмоциясын алып тастау', 'Remove the emotion {e}'],
  own_emo: ['Своя эмоция', 'Өз эмоцияңыз', 'Your emotion'],
  own_emo_ph: ['+ своя эмоция', '+ өз эмоцияңыз', '+ your emotion'],
  to_folder: ['В папку', 'Бумаға', 'To folder'],
  frame_saved: ['Кадр сохранён', 'Кадр сақталды', 'Frame saved'],
  frame_fail: ['Не удалось сохранить кадр', 'Кадрды сақтау мүмкін болмады', 'Couldn’t save the frame'],
  zip_saved: ['Папка дня сохранена', 'Күн бумасы сақталды', 'Day folder saved'],
  zip_fail: ['Не удалось собрать архив', 'Мұрағатты жинау мүмкін болмады', 'Couldn’t build the archive'],
  no_video: ['Этот браузер не умеет записывать видео', 'Бұл браузер бейне жаза алмайды', 'This browser can’t record video'],
  video_saved: ['Видео сохранено', 'Бейне сақталды', 'Video saved'],
  recording_s: ['Запись {n} с', 'Жазу {n} с', 'Recording {n} s'],
  day_deleted: ['День удалён', 'Күн жойылды', 'Day deleted'],
  day_del_fail: ['Не удалось удалить день', 'Күнді жою мүмкін болмады', 'Couldn’t delete the day'],
};

const IDX = { ru: 0, kk: 1, en: 2 };
const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('mm-lang') : null;
const guess = typeof navigator !== 'undefined' ? (navigator.language || '').slice(0, 2) : 'ru';
export let lang = LANGS[saved] ? saved : LANGS[guess] ? guess : 'ru';

export function setLang(l) {
  if (!LANGS[l]) return;
  lang = l;
  localStorage.setItem('mm-lang', l);
  document.documentElement.lang = l;
}

export function t(key, params = {}) {
  const row = D[key];
  let s = row ? row[IDX[lang]] ?? row[0] : key;
  for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// "5 days" in each language
export function daysN(n) {
  if (lang === 'kk') return `${n} күн`;
  if (lang === 'en') return `${n} ${n === 1 ? 'day' : 'days'}`;
  const m = n % 10, h = n % 100;
  return `${n} ${m === 1 && h !== 11 ? 'день' : m >= 2 && m <= 4 && (h < 12 || h > 14) ? 'дня' : 'дней'}`;
}

const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export function formatDate(iso, upper = false) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const s = lang === 'en' ? `${d} ${MONTHS.en[m - 1]} ${y}` : lang === 'kk' ? `${d} ${MONTHS.kk[m - 1]} ${y}` : `${d} ${MONTHS.ru[m - 1]} ${y}`;
  return upper ? s.toUpperCase() : s;
}

// A day in the current language: demo days carry translations in day.i18n.
export function loc(day) {
  const tr = day?.i18n?.[lang];
  if (!tr) return day;
  return {
    ...day,
    title: tr.title || day.title,
    text: tr.text || day.text,
    caption: tr.caption || day.caption,
    analysis: { ...day.analysis, ai: day.analysis?.ai ? { ...day.analysis.ai, emotions: tr.emotions || day.analysis.ai.emotions } : day.analysis?.ai },
  };
}

// Language the day's poster should be drawn in.
export const posterLangOf = day => (day?.i18n ? lang : 'any');
