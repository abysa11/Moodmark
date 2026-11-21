// "How it works": the rules of the visual system and the artistic techniques,
// on one screen. Opened from the album bar; also a good script for a demo.
import { icon } from './icons.js';
import { DEMO } from './db.js';

const RULES = [
  {
    from: 'Фото',
    to: [
      'Три главных цвета фото становятся светом воспоминания: мягкие блики плывут в цветах самого снимка.',
      'Фон — то же фото, сильно увеличенное и размытое: день окружает сам себя.',
      'В альбоме цвет фото тонирует подложку отпечатка, а пропорции задают форму рамки на странице.',
      'ИИ читает по фото время суток, свет и погоду (см. ниже).',
    ],
  },
  {
    from: 'Музыка',
    to: [
      'Играет та самая песня дня (Apple Music, 30-секундный фрагмент).',
      'Темп песни считывается прямо в браузере: кадры сменяются через целое число долей, а смена ложится на сильный акцент.',
      'Быстрый день — смена каждые 4 доли, обычный — 8, тихий — 16.',
    ],
  },
  {
    from: 'Текст',
    to: [
      'Запись делится на фрагменты; у каждого момента — свой фрагмент на экране.',
      'Длинный фрагмент держит свой кадр дольше: фильм дышит в ритме написанного.',
      'ИИ оценивает темп дня (от тихого до насыщенного): он ускоряет или замедляет весь фильм и меняет наклон отпечатка в альбоме.',
      'Звук фона (дождь, ветер, море, улица, костёр) предлагается, только если он назван в записи или виден на фото, и включается вручную.',
    ],
  },
  {
    from: 'Время суток',
    to: [
      'Утро — камера отъезжает: день открывается.',
      'День — камера плывёт вдоль кадра.',
      'Вечер и ночь — камера медленно приближается: ближе, интимнее; ночь темнее по краям.',
    ],
  },
  {
    from: 'Свет и погода',
    to: [
      'Золотой свет — тёплое свечение сверху; неон — насыщенные цветные блики; тусклый — глубокая виньетка.',
      'Дождь, снег, туман — отдельный тонкий слой поверх сцены.',
    ],
  },
  {
    from: 'Настроение',
    to: [
      'Базовый темп, тёплый или холодный свет и сила зерна плёнки.',
      'Склейка: насыщенный или неоновый день режется вспышкой, ночь и тяжёлый день — через затемнение, остальное — мягким растворением.',
      'Рамка отпечатка в альбоме: радость и драйв — на скотче, спокойствие и ностальгия — в уголках, нежность — полароид, грусть и усталость — тонкая подложка.',
    ],
  },
];

const TECHNIQUES = [
  ['Эффект Кена Бёрнса', 'медленный наезд и панорама по неподвижному фото'],
  ['Коллаж из отпечатков', 'каждое фото выходит крупно в свой момент и ложится к остальным; к концу день собран целиком'],
  ['Двухслойная глубина', 'фото и размытый фон смещаются в разные стороны вслед за курсором'],
  ['Плёночное зерно и виньетка', 'зерно сильнее в ностальгии и тревоге, мягче в спокойствии'],
  ['Синхронизация с битом', 'темп и акценты песни находятся анализом звука в браузере'],
  ['Звуки, собранные из шума', 'дождь, ветер, море синтезируются в браузере, без аудиофайлов'],
];

export function openAbout() {
  const wrap = document.createElement('div');
  wrap.className = 'about';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Как устроен Moodmark');
  wrap.innerHTML = `
    <div class="about-in">
      <header class="about-head">
        <div>
          <p class="eyebrow">Moodmark</p>
          <h2 class="about-title">Как день становится воспоминанием</h2>
          <p class="about-lead">Каждый день — текст, фото и песня. Из них собирается короткий фильм: не по шаблону «грустно — значит синий», а по тому, что было в самом дне. Ниже — правила, по которым это происходит.</p>
        </div>
        <button class="glass-btn icon-btn" data-close aria-label="Закрыть">${icon('close')}</button>
      </header>

      <section class="about-flow" aria-label="Путь записи">
        ${['Запись: текст, фото, песня, настроение', 'ИИ читает день: название, атмосфера, время, свет, погода, темп', 'Анализ песни: темп и акценты', 'Фильм-коллаж и отпечаток в альбоме']
          .map((t, i) => `<div class="flow-step"><span>${i + 1}</span><p>${t}</p></div>`).join('')}
      </section>

      <h3 class="about-h">Правила визуальной системы</h3>
      <div class="about-rules">
        ${RULES.map(r => `
          <article class="rule">
            <h4>${r.from}</h4>
            <ul>${r.to.map(t => `<li>${t}</li>`).join('')}</ul>
          </article>`).join('')}
      </div>

      <h3 class="about-h">Отпечатки в альбоме</h3>
      <div class="about-prints">
        ${[['tape', 'Радость, драйв', '#f3d36b'], ['corners', 'Спокойствие, ностальгия', '#9fb7c9'], ['polaroid', 'Нежность', '#e9b8b0'], ['plain', 'Грусть, усталость', '#8d939b']]
          .map(([f, label, c], i) => `
            <figure class="print-demo">
              <span class="snap-photo frame-${f}" style="--mat:color-mix(in srgb, ${c} 26%, #fff);--rot:${[-2.4, 0.8, -1.2, 0.4][i]}deg"><i style="background:linear-gradient(160deg, ${c}, #2b2d33)"></i></span>
              <figcaption>${label}</figcaption>
            </figure>`).join('')}
      </div>

      <h3 class="about-h">Художественные приёмы</h3>
      <dl class="about-tech">
        ${TECHNIQUES.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}
      </dl>

      <footer class="about-foot">
        <p>ИИ: только бесплатные модели (OpenRouter, Gemini, Groq, Mistral, Cerebras) с автоматическим переключением при лимитах; ключ на сайте спрятан за прокси. Записи хранятся только на этом устройстве.</p>
        ${DEMO ? '<a class="btn glass-btn" href="./">Вернуться к своему альбому</a>' : '<a class="btn primary" href="?demo">Открыть пример альбома</a>'}
      </footer>
    </div>`;
  document.body.appendChild(wrap);
  const prev = document.activeElement;
  requestAnimationFrame(() => wrap.classList.add('is-open'));
  const close = () => {
    wrap.classList.remove('is-open');
    removeEventListener('keydown', key, true);
    setTimeout(() => { wrap.remove(); prev?.focus?.(); }, 250);
  };
  const key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  addEventListener('keydown', key, true);
  wrap.addEventListener('click', ev => { if (ev.target === wrap || ev.target.closest('[data-close]')) close(); });
  wrap.querySelector('[data-close]').focus();
}
