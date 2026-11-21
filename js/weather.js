// Rain and snow over the memory, drawn as particles on a canvas.
//
// Three depths: far drops and flakes are small, faint and slow; near ones are
// bigger, brighter, faster and softer (out of focus). Rain falls in thin
// streaks that fade along their length and splash faintly at the bottom; snow
// drifts down in soft round flakes that sway and turn with the wind.

export function startWeather(canvas, kind, speed = 1) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, raf = 0, last = performance.now(), alive = true;
  const parts = [];
  const splashes = [];

  const size = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  addEventListener('resize', size);

  const rain = kind === 'rain';
  const count = rain ? Math.round((W * H) / 5200) : Math.round((W * H) / 9000);
  const wind = rain ? 0.12 : 0.25; // sideways drift per unit of fall

  const spawn = (p, top) => {
    const z = Math.random(); // 0 far … 1 near
    p.z = z;
    p.x = Math.random() * (W + 200) - 100;
    p.y = top ? -20 - Math.random() * 60 : Math.random() * H;
    if (rain) {
      p.len = 10 + z * 26;
      p.v = (700 + z * 900) * (0.8 + 0.4 * speed);
      p.w = 0.6 + z * 1.2;
      p.a = 0.18 + z * 0.4;
    } else {
      p.r = 0.8 + z * z * 4.2;
      p.v = (24 + z * 70) * (0.7 + 0.3 * speed);
      p.a = 0.45 + z * 0.5;
      p.phase = Math.random() * Math.PI * 2;
      p.sway = 6 + z * 18;
    }
    return p;
  };
  for (let i = 0; i < count; i++) parts.push(spawn({}, false));

  const frame = now => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    if (rain) {
      ctx.lineCap = 'round';
      for (const p of parts) {
        p.y += p.v * dt;
        p.x += p.v * wind * dt;
        if (p.y - p.len > H) {
          if (p.z > 0.55 && splashes.length < 60) splashes.push({ x: p.x, y: H - 4 - Math.random() * 40 * (1 - p.z), t: 0, r: 2 + p.z * 4 });
          spawn(p, true);
        }
        // a streak that is brightest at its head and fades toward its tail
        const g = ctx.createLinearGradient(p.x - p.len * wind, p.y - p.len, p.x, p.y);
        g.addColorStop(0, 'rgba(220,235,255,0)');
        g.addColorStop(1, `rgba(225,238,255,${p.a})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x - p.len * wind, p.y - p.len);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      // faint rings where near drops land
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.t += dt * 3;
        if (s.t >= 1) { splashes.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(230,240,255,${0.35 * (1 - s.t)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, s.r * (1 + s.t * 2), s.r * 0.35 * (1 + s.t * 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      for (const p of parts) {
        p.phase += dt * (0.8 + p.z);
        p.y += p.v * dt;
        p.x += (Math.sin(p.phase) * p.sway + p.v * wind) * dt;
        if (p.y - p.r > H) spawn(p, true);
        // a soft round flake; near ones are out of focus
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (p.z > 0.7 ? 1.8 : 1.2));
        g.addColorStop(0, `rgba(255,255,255,${p.a})`);
        g.addColorStop(0.55, `rgba(255,255,255,${p.a * (p.z > 0.7 ? 0.45 : 0.8)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.z > 0.7 ? 1.8 : 1.2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) raf = requestAnimationFrame(frame);

  return {
    stop() { alive = false; cancelAnimationFrame(raf); removeEventListener('resize', size); },
  };
}
