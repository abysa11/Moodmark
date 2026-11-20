// Opening scene: the logo rests on white clouds, hops and falls out of frame,
// the camera descends through the clouds, and the site is there — with the
// logo already in its place in the sidebar.
export function playIntro() {
  const el = document.getElementById('intro');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!el || reduce) { el?.remove(); document.body.classList.remove('is-intro'); return Promise.resolve(); }

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
    at(1700, () => el.classList.add('is-hop'));       // logo hops and falls out of frame
    at(2500, () => el.classList.add('is-descend'));   // camera goes down through the clouds
    at(4100, finish);
    el.addEventListener('click', finish, { once: true });
    addEventListener('keydown', finish, { once: true });
  });
}
