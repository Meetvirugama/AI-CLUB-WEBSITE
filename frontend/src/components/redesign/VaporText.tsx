import { useEffect, useRef } from 'react';

const DARK_STOPS = ['#3d6bff', '#22e0ff', '#3ef07a', '#ffe53d', '#ff9a2e', '#ff4d6a', '#ff4be0', '#9a6bff'];
const LIGHT_STOPS = ['#1f4bff', '#00a8d6', '#11a84a', '#d9a400', '#f06a00', '#e8203f', '#d41cad', '#5b1fe0'];

const hexToRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function gradientAt(stops: number[][], t: number) {
  const s = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(s);
  const f = s - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

/**
 * Text drawn as a field of particles that condense into the letters,
 * shed vapour wisps, and evaporate around the cursor.
 */
export default function VaporText({
  text,
  className = '',
  weight = 800,
  maxFontSize = 230,
  widthRatio = 0.2,
}: {
  text: string;
  className?: string;
  weight?: number;
  maxFontSize?: number;
  widthRatio?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let W = 0;
    let H = 0;
    let n = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let tx = new Float32Array(0);
    let ty = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let alpha = new Float32Array(0);
    let delay = new Float32Array(0);
    let vapor = new Float32Array(0); // >0 while evaporating (seconds left)
    let col = new Uint8Array(0);
    let image: ImageData | null = null;
    let buf32: Uint32Array | null = null;
    let dot = 2;
    let start = performance.now();
    let raf = 0;
    let running = false;
    let visible = true;
    const pointer = { x: -9999, y: -9999, active: false };

    const isDark = () => document.documentElement.classList.contains('dark');
    let stops = (isDark() ? DARK_STOPS : LIGHT_STOPS).map(hexToRgb);

    const recolor = () => {
      stops = (isDark() ? DARK_STOPS : LIGHT_STOPS).map(hexToRgb);
      for (let i = 0; i < n; i++) {
        const c = gradientAt(stops, tx[i] / W);
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
      if (!running) draw(performance.now());
    };

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const fontSize = Math.min(maxFontSize, cssW * widthRatio);
      const cssH = Math.ceil(fontSize * 1.05);
      W = Math.round(cssW * dpr);
      H = Math.round(cssH * dpr);
      canvas.width = W;
      canvas.height = H;
      canvas.style.height = `${cssH}px`;

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const o = off.getContext('2d', { willReadFrequently: true });
      if (!o) return;
      o.fillStyle = '#fff';
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.font = `${weight} ${fontSize * dpr}px Inter, system-ui, sans-serif`;
      (o as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-0.04 * fontSize * dpr}px`;
      o.fillText(text, W / 2, H / 2 + fontSize * dpr * 0.04);
      const data = o.getImageData(0, 0, W, H).data;

      const step = Math.max(3, Math.round(fontSize * dpr / 70));
      dot = Math.max(2, Math.round(step * 0.62));
      const pts: number[] = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
        }
      }
      n = pts.length / 2;
      px = new Float32Array(n);
      py = new Float32Array(n);
      tx = new Float32Array(n);
      ty = new Float32Array(n);
      vx = new Float32Array(n);
      vy = new Float32Array(n);
      alpha = new Float32Array(n);
      delay = new Float32Array(n);
      vapor = new Float32Array(n);
      col = new Uint8Array(n * 3);
      for (let i = 0; i < n; i++) {
        tx[i] = pts[i * 2];
        ty[i] = pts[i * 2 + 1];
        if (reduce) {
          px[i] = tx[i];
          py[i] = ty[i];
          alpha[i] = 1;
        } else {
          px[i] = tx[i] + (Math.random() - 0.5) * 60 * dpr;
          py[i] = ty[i] + (40 + Math.random() * 90) * dpr;
          alpha[i] = 0;
          delay[i] = (tx[i] / W) * 0.9 + Math.random() * 0.35;
        }
      }
      image = ctx.createImageData(W, H);
      buf32 = new Uint32Array(image.data.buffer);
      start = performance.now();
      recolor();
    };

    const draw = (now: number) => {
      if (!image || !buf32) return;
      buf32.fill(0);
      for (let i = 0; i < n; i++) {
        const a = alpha[i];
        if (a <= 0.02) continue;
        const x0 = px[i] | 0;
        const y0 = py[i] | 0;
        const r = col[i * 3];
        const g = col[i * 3 + 1];
        const b = col[i * 3 + 2];
        const packed = ((Math.min(255, a * 255) & 255) << 24) | (b << 16) | (g << 8) | r;
        const size = vapor[i] > 0 ? Math.max(1, dot - 1) : dot;
        for (let dy = 0; dy < size; dy++) {
          const yy = y0 + dy;
          if (yy < 0 || yy >= H) continue;
          const row = yy * W;
          for (let dx = 0; dx < size; dx++) {
            const xx = x0 + dx;
            if (xx >= 0 && xx < W) buf32[row + xx] = packed;
          }
        }
      }
      ctx.putImageData(image, 0, 0);
      void now;
    };

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      const R = 70 * dpr;
      // Ambient wisps: a few random particles lift off each frame once formed.
      if (t > 1.6) {
        const wisps = Math.max(1, Math.round(n * 0.0012));
        for (let k = 0; k < wisps; k++) {
          const i = (Math.random() * n) | 0;
          if (vapor[i] <= 0) {
            vapor[i] = 1.2 + Math.random() * 1.3;
            vx[i] += (Math.random() - 0.5) * 30 * dpr;
            vy[i] -= (20 + Math.random() * 40) * dpr;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        if (t < delay[i]) continue;
        if (pointer.active) {
          const dxp = px[i] - pointer.x;
          const dyp = py[i] - pointer.y;
          const d2 = dxp * dxp + dyp * dyp;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 420 * dpr;
            vx[i] += (dxp / d) * f * dt;
            vy[i] += ((dyp / d) * f - 260 * dpr) * dt;
            if (vapor[i] <= 0) vapor[i] = 0.9 + Math.random() * 0.8;
          }
        }
        if (vapor[i] > 0) {
          vapor[i] -= dt;
          // Drift upward with a curling wobble and fade.
          vx[i] += Math.sin(py[i] * 0.02 + t * 3 + i) * 40 * dpr * dt;
          vy[i] -= 35 * dpr * dt;
          vx[i] *= 0.97;
          vy[i] *= 0.97;
          px[i] += vx[i] * dt;
          py[i] += vy[i] * dt;
          alpha[i] = Math.max(0, Math.min(alpha[i], vapor[i]));
          if (vapor[i] <= 0) {
            // Respawn just below the glyph and condense back.
            px[i] = tx[i] + (Math.random() - 0.5) * 24 * dpr;
            py[i] = ty[i] + (14 + Math.random() * 30) * dpr;
            vx[i] = 0;
            vy[i] = 0;
            alpha[i] = 0;
          }
        } else {
          // Spring toward the glyph.
          const ax = (tx[i] - px[i]) * 48 - vx[i] * 9;
          const ay = (ty[i] - py[i]) * 48 - vy[i] * 9;
          vx[i] += ax * dt;
          vy[i] += ay * dt;
          px[i] += vx[i] * dt;
          py[i] += vy[i] * dt;
          alpha[i] = Math.min(1, alpha[i] + dt * 2.2);
        }
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const startLoop = () => {
      if (running || reduce || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) * dpr;
      pointer.y = (e.clientY - rect.top) * dpr;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener('visibilitychange', onVis);

    const themeObserver = new MutationObserver(recolor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let lastWidth = 0;
    const ro = new ResizeObserver(() => {
      const w = wrap.getBoundingClientRect().width;
      if (Math.abs(w - lastWidth) < 2) return;
      lastWidth = w;
      build();
      if (reduce) draw(performance.now());
    });

    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      lastWidth = wrap.getBoundingClientRect().width;
      build();
      draw(performance.now());
      ro.observe(wrap);
      startLoop();
    });

    return () => {
      cancelled = true;
      stopLoop();
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [text, weight, maxFontSize, widthRatio]);

  return (
    <div ref={wrapRef} className={`relative w-full ${className}`}>
      <span className="sr-only">{text}</span>
      <canvas ref={canvasRef} aria-hidden className="block w-full" />
    </div>
  );
}
