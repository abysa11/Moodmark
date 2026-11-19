// Pre-computed for the demo diary so first visit does not spend AI requests.
// ai: answer of a free OpenRouter model; track: Apple Music catalog entry.
export const DEMO_DATA = {
  "1": {
    "ai": {
      "model": "baidu/ernie-5.5-flash-preview:free",
      "valence": 0.65,
      "arousal": 0.2,
      "temperature": 0.2,
      "emotions": [
        "спокойствие",
        "тепло",
        "уют"
      ],
      "season": "autumn",
      "timeOfDay": "evening",
      "weather": "sun",
      "place": "парк",
      "company": "с подругой",
      "detail": "какао",
      "title": "Осенний парк и какао",
      "caption": "Было холодно, но мы пили какао и долго разговаривали.",
      "evidence": "спокойной, тёплым, медленным, какао, жёлтых листьях"
    },
    "track": {
      "id": 725816432,
      "artist": "Frank Sinatra",
      "title": "Autumn Leaves",
      "album": "Where Are You?",
      "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music4/v4/86/b4/5a/86b45acb-1807-b2aa-916e-c830eee6c524/00724353374655.jpg/600x600bb.jpg",
      "thumb": "https://is1-ssl.mzstatic.com/image/thumb/Music4/v4/86/b4/5a/86b45acb-1807-b2aa-916e-c830eee6c524/00724353374655.jpg/120x120bb.jpg",
      "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/77/4f/45/774f4540-0092-640f-d8f9-34ce39849f29/mzaf_11351092923079910248.plus.aac.p.m4a",
      "genreName": "Pop",
      "genre": "pop",
      "year": 1957,
      "durationMs": 172867,
      "url": "https://music.apple.com/us/album/autumn-leaves/725816076?i=725816432&uo=4"
    }
  },
  "2": {
    "ai": {
      "model": "baidu/ernie-5.5-flash-preview:free",
      "valence": -0.7,
      "arousal": 0.9,
      "temperature": -0.2,
      "emotions": [
        "тревога",
        "напряжение",
        "усталость"
      ],
      "season": null,
      "timeOfDay": "night",
      "weather": null,
      "place": "офис",
      "company": "наедине с собой",
      "detail": "кофе",
      "title": "Ночная сдача проекта в офисе",
      "caption": "Дедлайн в шесть утра, всё время спешка и напряжение.",
      "evidence": "ночь в офисе, третий кофе, нервы на пределе, спешка и напряжение"
    },
    "track": {
      "id": 315489351,
      "artist": "Moderat",
      "title": "A New Error",
      "album": "Moderat (Deluxe Version)",
      "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Features124/v4/80/1f/60/801f6017-8523-eceb-af23-ebbd9c3c6f5e/dj.xnqaumam.jpg/600x600bb.jpg",
      "thumb": "https://is1-ssl.mzstatic.com/image/thumb/Features124/v4/80/1f/60/801f6017-8523-eceb-af23-ebbd9c3c6f5e/dj.xnqaumam.jpg/120x120bb.jpg",
      "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c7/c8/d7/c7c8d7ea-5a7d-e6dd-5d5e-02eeb5a5b6ca/mzaf_11470532376229439336.plus.aac.p.m4a",
      "genreName": "Electronic",
      "genre": "electronic",
      "year": 2009,
      "durationMs": 367307,
      "url": "https://music.apple.com/us/album/a-new-error/315489205?i=315489351&uo=4"
    }
  },
  "3": {
    "ai": {
      "model": "baidu/ernie-5.5-flash-preview:free",
      "valence": 0.95,
      "arousal": 0.95,
      "temperature": -0.2,
      "emotions": [
        "радость",
        "восторг",
        "веселье"
      ],
      "season": "summer",
      "timeOfDay": null,
      "weather": "rain",
      "place": "концерт",
      "company": "с друзьями",
      "detail": "дождь",
      "title": "Летний концерт под дождём с друзьями",
      "caption": "Концерт с друзьями под дождём!",
      "evidence": "Концерт с друзьями, под дождём, танцевали, кричали песни, лучшее лето"
    },
    "track": {
      "id": 6781079518,
      "artist": "Queen",
      "title": "Don't Stop Me Now",
      "album": "Jazz (Deluxe Edition)",
      "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9e/ae/4a/9eae4a23-130a-4ed7-d590-bfa701f9acaf/602527717685.jpg/600x600bb.jpg",
      "thumb": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/9e/ae/4a/9eae4a23-130a-4ed7-d590-bfa701f9acaf/602527717685.jpg/120x120bb.jpg",
      "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/09/8a/5a/098a5a86-64e8-c5dc-1361-69bb8bfae005/mzaf_16847470439783324197.plus.aac.p.m4a",
      "genreName": "Rock",
      "genre": "rock",
      "year": 1978,
      "durationMs": 209391,
      "url": "https://music.apple.com/us/album/dont-stop-me-now/6781079346?i=6781079518&uo=4"
    }
  },
  "4": {
    "ai": {
      "model": "baidu/ernie-5.5-flash-preview:free",
      "valence": -0.4,
      "arousal": 0.2,
      "temperature": -0.2,
      "emotions": [
        "грусть",
        "пустота",
        "спокойствие"
      ],
      "season": null,
      "timeOfDay": "day",
      "weather": "rain",
      "place": "дом",
      "company": "наедине с собой",
      "detail": "окно",
      "title": "Дождь и воспоминания о бабушке",
      "caption": "Грустно и пусто, но почему-то спокойно.",
      "evidence": "дождь, одна, бабушку, грустно, пусто, спокойно"
    },
    "track": {
      "id": 1097861842,
      "artist": "Radiohead",
      "title": "No Surprises",
      "album": "OK Computer",
      "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg",
      "thumb": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/120x120bb.jpg",
      "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f0/2a/fa/f02afaad-0a7f-9ceb-1236-55ef3d388061/mzaf_10063872040766906863.plus.aac.p.m4a",
      "genreName": "Alternative",
      "genre": "indie",
      "year": 1997,
      "durationMs": 229120,
      "url": "https://music.apple.com/us/album/no-surprises/1097861387?i=1097861842&uo=4"
    }
  },
  "5": {
    "ai": {
      "model": "baidu/ernie-5.5-flash-preview:free",
      "valence": 0.2,
      "arousal": 0.1,
      "temperature": 0.2,
      "emotions": [
        "спокойствие",
        "тишина"
      ],
      "season": null,
      "timeOfDay": "morning",
      "weather": null,
      "place": "балкон",
      "company": "наедине с собой",
      "detail": "чай",
      "title": "Утро на балконе с чаем",
      "caption": "Утро на балконе. Чай, город ещё не проснулся",
      "evidence": "утро на балконе, чай, город ещё не проснулся, ни звука"
    },
    "track": {
      "id": 714861225,
      "artist": "Brian Eno",
      "title": "An Ending (Ascent)",
      "album": "Apollo: Atmospheres and Soundtracks",
      "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/99/3b/d1/993bd1fa-13ab-7898-6993-bc4da32be961/00724356364752.rgb.jpg/600x600bb.jpg",
      "thumb": "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/99/3b/d1/993bd1fa-13ab-7898-6993-bc4da32be961/00724356364752.rgb.jpg/120x120bb.jpg",
      "preview": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/39/f0/83/39f083d2-f807-039c-936c-819ff0fbb225/mzaf_2664632352612945926.plus.aac.p.m4a",
      "genreName": "Ambient",
      "genre": "ambient",
      "year": 1983,
      "durationMs": 266200,
      "url": "https://music.apple.com/us/album/an-ending-ascent/714861155?i=714861225&uo=4"
    }
  }
};
