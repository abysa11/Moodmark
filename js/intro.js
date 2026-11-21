// Opening scene: high in a cloudy sky the logo bubble floats, then falls; a
// trail of bubbles rises behind it, the camera falls after it through the
// clouds, and the site is there — with the logo already in its place.
export function playIntro() {
  const el = document.getElementById('intro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce) { el?.remove(); document.body.classList.remove('is-intro'); return Promise.resolve(); }

  // bubbles: a trail that follows the falling cat, and a rush past the camera
  const box = el.querySelector('.bubbles');
  if (box) {
    const html = [];
    for (let i = 0; i < 44; i++) {
      const trail = i < 16;
      const size = Math.round(trail ? 8 + Math.random() * 26 : 10 + Math.random() * 46);
      const left = trail ? 50 + (Math.random() - 0.5) * 16 : Math.random() * 100;
      const dur = trail ? 1.6 + Math.random() * 1.4 : 1.3 + Math.random() * 1.6;
      const delay = trail ? Math.random() * 0.6 : Math.random() * 1.4;
      html.push(`<i class="bub ${trail ? 'trail' : 'rush'}" style="left:${left.toFixed(1)}%;width:${size}px;height:${size}px;--dx:${((Math.random() - 0.5) * 220).toFixed(0)}px;animation-duration:${dur.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s"></i>`);
    }
    box.innerHTML = html.join('');
  }

  return new Promise(resolve => {
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      el.classList.add('is-done');
      document.body.classList.remove('is-intro');
      setTimeout(() => { el.remove(); resolve(); }, 500);
    };

    at(40, () => el.classList.add('is-on'));
    at(1700, () => el.classList.add('is-hop'));       // the cat hops and falls, bubbles trail it
    at(2300, () => el.classList.add('is-descend'));   // the camera falls after it through the clouds
    at(4200, finish);
    el.addEventListener('click', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
  });
}
