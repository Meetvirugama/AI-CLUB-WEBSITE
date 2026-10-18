import { useEffect, useRef, useState } from 'react';
import { setIntroRunning } from './introBus';
import './redesign.css';

const SESSION_KEY = 'aiclub_intro_v3';
const SPECTRUM_DARK = ['#3d6bff', '#22e0ff', '#3ef07a', '#ffe53d', '#ff9a2e', '#ff4d6a', '#ff4be0', '#9a6bff'];
const SPECTRUM_LIGHT = ['#1f4bff', '#00a8d6', '#11a84a', '#d9a400', '#f06a00', '#e8203f', '#d41cad', '#5b1fe0'];

// Timeline (ms)
const T_DOT = 380;
const T_ASSEMBLED = 1750;
const T_EXIT = 2650;
const T_END = 3900;

let decided: boolean | null = null;
function shouldPlay() {
  if (decided !== null) return decided;
  try {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    decided = !reduce && !sessionStorage.getItem(SESSION_KEY);
    if (decided) sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    decided = false;
  }
  if (decided) setIntroRunning(true);
  return decided;
}

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const easeInCubic = (x: number) => x * x * x;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Opening sequence: dots assemble the wordmark, then a halftone portal opens onto the site. */
export default function IntroSequence() {
  const [play, setPlay] = useState(shouldPlay);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!play) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dark = document.documentElement.classList.contains('dark');
    const bg = dark ? '#09090b' : '#f7f6f2';
    const spectrum = dark ? SPECTRUM_DARK : SPECTRUM_LIGHT;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = Math.round(innerWidth * dpr);
    const H = Math.round(innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    const cx = W / 2;
    const cy = H * 0.47;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Wordmark particles (built once the display font is ready)
    const fontSize = Math.min(innerWidth * 0.17, 210) * dpr;
    const step = Math.max(5, Math.round(fontSize / 34));
    type Part = { tx: number; ty: number; sx: number; sy: number; ex: number; ey: number; c: number; d: number };
    let parts: Part[] | null = null;
    const buildParts = () => {
    const off = document.createElement('canvas');
    off.width = W;
    off.height = Math.ceil(fontSize * 1.2);
    const o = off.getContext('2d', { willReadFrequently: true })!;
    o.fillStyle = '#fff';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    o.fillText('AI CLUB', W / 2, off.height / 2);
    const pix = o.getImageData(0, 0, W, off.height).data;
    const list: Part[] = [];
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < W; x += step) {
        if (pix[(y * W + x) * 4 + 3] > 128) {
          const ang = Math.random() * Math.PI * 2;
          const far = Math.hypot(W, H) * (0.55 + Math.random() * 0.25);
          const tx = x;
          const ty = cy - off.height / 2 + y;
          const out = Math.atan2(ty - cy, tx - cx) + (Math.random() - 0.5) * 0.6;
          list.push({
            tx, ty,
            sx: cx + Math.cos(ang) * far,
            sy: cy + Math.sin(ang) * far,
            ex: tx + Math.cos(out) * Math.hypot(W, H) * (0.4 + Math.random() * 0.5),
            ey: ty + Math.sin(out) * Math.hypot(W, H) * (0.4 + Math.random() * 0.5),
            c: Math.min(spectrum.length - 1, Math.floor((x / W) * 1.6 * spectrum.length) % spectrum.length),
            d: Math.random() * 0.35,
          });
        }
      }
    }
    parts = list;
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      if (!finished) buildParts();
    });
    const dotR = step * 0.36;

    // Portal ring cells, bucketed by colour so each colour is one path.
    const cell = 13 * dpr;
    const buckets: { x: number; y: number; dist: number; h: number }[][] = spectrum.map(() => []);
    for (let y = cell / 2; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell) {
        const dist = Math.hypot(x - cx, y - cy);
        const ang = (Math.atan2(y - cy, x - cx) / (Math.PI * 2) + 1) % 1;
        const b = Math.floor((ang + dist / (W * 1.4)) * spectrum.length) % spectrum.length;
        buckets[b].push({ x, y, dist, h: hash(x, y) });
      }
    }
    const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.15;

    let t0 = performance.now();
    let raf = 0;
    let finished = false;
    let handedOver = false;

    const skip = () => {
      const t = performance.now() - t0;
      if (t < T_EXIT) t0 -= T_EXIT - t;
    };
    window.addEventListener('keydown', skip);
    wrap.addEventListener('pointerdown', skip);

    const finish = () => {
      if (finished) return;
      finished = true;
      document.body.style.overflow = prevOverflow;
      setIntroRunning(false);
      setPlay(false);
    };

    const frame = (now: number) => {
      // Hold the timeline at the seed dot until the wordmark is ready.
      if (!parts && now - t0 > T_DOT) t0 = now - T_DOT;
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);

      if (t < T_EXIT) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
      }

      // Seed dot
      if (t < T_DOT + 300) {
        const p = clamp01(t / T_DOT);
        const r = (4 + Math.sin(t / 60) * 1.5) * dpr * (1 - clamp01((t - T_DOT) / 300));
        ctx.fillStyle = spectrum[7];
        ctx.globalAlpha = p;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Wordmark: fly in, hold with a shimmer, scatter on exit
      if (parts && t > T_DOT * 0.6 && t < T_END) {
        const exitP = clamp01((t - T_EXIT) / (T_END - T_EXIT - 300));
        const shimmerX = ((t - T_ASSEMBLED) / 900) * W * 1.4 - W * 0.2;
        for (let ci = 0; ci < spectrum.length; ci++) {
          ctx.fillStyle = spectrum[ci];
          ctx.beginPath();
          for (const p of parts) {
            if (p.c !== ci) continue;
            const inP = easeOutExpo(clamp01((t - T_DOT * 0.6 - p.d * 900) / 1100));
            let x = p.sx + (p.tx - p.sx) * inP;
            let y = p.sy + (p.ty - p.sy) * inP;
            if (exitP > 0) {
              const e = easeInCubic(exitP);
              x = p.tx + (p.ex - p.tx) * e;
              y = p.ty + (p.ey - p.ty) * e;
            }
            let r = dotR * (0.4 + 0.6 * inP) * (1 - exitP * 0.7);
            if (t > T_ASSEMBLED && exitP === 0) r *= 1 + 0.6 * Math.exp(-Math.pow((x - shimmerX) / (60 * dpr), 2));
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          }
          ctx.globalAlpha = 1 - exitP;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Portal: a halftone ring around a growing hole that reveals the site
      if (t >= T_EXIT) {
        if (!handedOver) {
          handedOver = true;
          setIntroRunning(false);
        }
        const p = clamp01((t - T_EXIT) / (T_END - T_EXIT));
        const R = easeInCubic(p) * maxR;
        const band = Math.max(160 * dpr, R * 0.35);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        for (let b = 0; b < buckets.length; b++) {
          ctx.fillStyle = spectrum[b];
          ctx.beginPath();
          for (const c of buckets[b]) {
            if (c.dist < R || c.dist > R + band) continue;
            const k = (c.dist - R) / band; // 0 at hole edge, 1 at outer edge
            const s = Math.sin(k * Math.PI); // peak mid-band
            if (c.h > s * 1.15) continue; // dithered falloff
            const r = cell * 0.42 * s;
            ctx.moveTo(c.x + r, c.y);
            ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        wrap.style.transform = `scale(${1 + easeInCubic(p) * 0.15})`;
      }

      // DOM captions
      if (counterRef.current) counterRef.current.textContent = String(Math.round(clamp01(t / T_EXIT) * 100)).padStart(3, '0');
      if (captionRef.current) captionRef.current.style.opacity = String(t < T_EXIT ? clamp01((t - 900) / 500) : 1 - clamp01((t - T_EXIT) / 300));

      if (t >= T_END) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', skip);
      wrap.removeEventListener('pointerdown', skip);
      document.body.style.overflow = prevOverflow;
      if (!finished) setIntroRunning(false);
    };
  }, [play]);

  if (!play) return null;

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[200] cursor-pointer" style={{ transformOrigin: '50% 47%' }} aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={captionRef} className="rd-mono pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-[10.5px] text-rd-muted opacity-0">
        <span>
          Loading <span ref={counterRef} className="text-rd-fg">000</span>
        </span>
        <span className="hidden sm:inline">Dhirubhai Ambani University · Gandhinagar</span>
        <span>Click to skip</span>
      </div>
    </div>
  );
}
