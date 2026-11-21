// Opening scene: the logo bubble floats on the sea, hops and dives into the
// water with a splash; the camera follows it down through rising bubbles, and
// the site is there — with the logo already in its place in the sidebar.
export function playIntro() {
  const el = document.getElementById('intro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce) { el?.remove(); document.body.classList.remove('is-intro'); return Promise.resolve(); }

  // bubbles: a slow stream all along, and a rush when the camera dives
  const sea = el.querySelector('.sea-bubbles');
  if (sea) {
    const html = [];
    for (let i = 0; i < 46; i++) {
      const rush = i >= 18;
      const size = Math.round(6 + Math.random() * (rush ? 34 : 22));
      html.push(`<i class="${rush ? 'rush' : ''}" style="left:${(Math.random() * 100).toFixed(1)}%;width:${size}px;height:${size}px;animation-delay:${(Math.random() * (rush ? 1.2 : 4)).toFixed(2)}s;animation-duration:${(rush ? 1.1 + Math.random() * 1.2 : 4 + Math.random() * 4).toFixed(2)}s"></i>`);
    }
    sea.innerHTML = html.join('');
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
    at(1700, () => el.classList.add('is-hop'));       // logo hops and dives into the water
    at(2350, () => el.classList.add('is-splash'));    // splash rings on the surface
    at(2600, () => el.classList.add('is-descend'));   // camera follows it down through the bubbles
    at(4300, finish);
    el.addEventListener('click', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
  });
}
