import { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

const vertex = /* glsl */ `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHover;
uniform float uCell;
uniform vec3 uBg;
uniform float uLight;
uniform float uScroll;
uniform vec4 uRipples[4];   // x, y, age (s), strength
uniform vec3 uTrail[10];    // x, y, strength

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Thermal-map spectrum: blue > cyan > green > yellow > orange > red > magenta > violet > blue
vec3 ramp(float t) {
  float s = fract(t) * 8.0;
  vec3 c = vec3(0.10, 0.25, 1.00);
  c = mix(c, vec3(0.00, 0.85, 1.00), clamp(s, 0.0, 1.0));
  c = mix(c, vec3(0.15, 0.95, 0.30), clamp(s - 1.0, 0.0, 1.0));
  c = mix(c, vec3(1.00, 0.92, 0.05), clamp(s - 2.0, 0.0, 1.0));
  c = mix(c, vec3(1.00, 0.55, 0.00), clamp(s - 3.0, 0.0, 1.0));
  c = mix(c, vec3(1.00, 0.12, 0.25), clamp(s - 4.0, 0.0, 1.0));
  c = mix(c, vec3(1.00, 0.10, 0.85), clamp(s - 5.0, 0.0, 1.0));
  c = mix(c, vec3(0.45, 0.15, 1.00), clamp(s - 6.0, 0.0, 1.0));
  c = mix(c, vec3(0.10, 0.25, 1.00), clamp(s - 7.0, 0.0, 1.0));
  return c;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cellId = floor(frag / uCell);
  vec2 center = (cellId + 0.5) * uCell;
  vec2 local = frag - center;
  float minR = min(uRes.x, uRes.y);
  vec2 p = (center - 0.5 * uRes) / minR;
  float t = uTime;

  // Colour field: domain-warped noise sampled once per cell, posterised for the weather-map banding.
  vec2 q = p * 1.5;
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.11)), fbm(q + vec2(5.2, -t * 0.09)));
  float field = fbm(q * 1.1 + 2.2 * w + vec2(t * 0.07, -t * 0.03));
  float inten = smoothstep(0.2, 0.8, fbm(q * 2.4 - w + t * 0.05));

  // Organic hole in the middle that breathes and leans toward the cursor.
  vec2 mouseP = (uMouse - 0.5 * uRes) / minR;
  float portrait = step(uRes.x, uRes.y);
  vec2 hp = p - mouseP * 0.1 * uHover;
  hp.x *= mix(0.72, 1.0, portrait);
  hp.y *= mix(1.0, 0.5, portrait);
  float ang = atan(hp.y, hp.x);
  float wob = fbm(vec2(cos(ang), sin(ang)) * 1.4 + p * 1.4 + t * 0.14);
  float breathe = 0.05 * sin(t * 0.9) + 0.02 * sin(t * 2.3);
  float holeR = (0.34 + breathe + uScroll * 1.1) * (0.7 + 0.65 * wob) * mix(1.0, 1.3, portrait);
  float mask = smoothstep(0.5, 1.2, length(hp) / holeR);

  // Cursor halo + trail.
  float md = length(center - uMouse) / minR;
  float m = exp(-md * md / 0.014) * uHover;
  float trail = 0.0;
  for (int i = 0; i < 10; i++) {
    float td = length(center - uTrail[i].xy) / minR;
    trail = max(trail, exp(-td * td / 0.004) * uTrail[i].z);
  }

  // Click and ambient ripples.
  float r = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 rp = uRipples[i];
    if (rp.z >= 0.0 && rp.z < 2.6) {
      float rd = length(center - rp.xy) / minR;
      float R = rp.z * 0.5;
      r = max(r, exp(-pow((rd - R) / 0.055, 2.0)) * (1.0 - rp.z / 2.6) * rp.w);
    }
  }

  // Slow diagonal sweep band.
  float sweepPos = fract(t * 0.07) * 3.0 - 1.0;
  float sweep = exp(-pow((p.x * 0.6 + p.y * 0.8) - sweepPos, 2.0) / 0.006) * 0.6;

  float energy = m + trail;
  float hueT = floor((field * 1.9 + t * 0.03 + energy * 0.35 + r * 0.25) * 26.0) / 26.0;
  vec3 col = ramp(hueT);

  // Effects stay softer inside the hole so the headline remains readable.
  float inner = mix(0.4, 1.0, mask);
  float reveal = clamp(mask + (m * 0.95 + trail * 0.9 + r) * inner, 0.0, 1.0);

  // Dithered falloff: cells near the hole randomly drop out instead of fading.
  float keep = step(hash(cellId + 3.17) * 0.92, reveal);
  float size = reveal * mix(0.5, 1.0, inten) * keep;
  size *= 1.0 + 0.3 * m + 0.35 * trail + 0.45 * r + sweep * mask;
  size *= 1.0 - uScroll * 0.8;

  // Twinkle: random cells flash briefly.
  float tw = step(0.995, hash(cellId + floor(t * 4.0) * 7.31)) * mask;

  float rad = 0.5 * uCell * 0.88 * min(size + tw * 0.25, 1.2);
  float d = length(local);
  float a = 1.0 - smoothstep(rad - 0.9, rad + 0.3, d);
  a *= step(0.4, rad);

  float glow = 0.08 * m + 0.1 * trail + 0.2 * r + 0.4 * tw + 0.2 * sweep * mask;
  col = mix(col, vec3(1.0), glow * (1.0 - uLight));
  col = mix(col, col * 0.86, uLight * 0.6);
  gl_FragColor = vec4(mix(uBg, col, a), 1.0);
}`;

const DARK_BG: [number, number, number] = [0.027, 0.027, 0.035];
const LIGHT_BG: [number, number, number] = [0.969, 0.965, 0.949];

const isDarkTheme = () => document.documentElement.classList.contains('dark');

/**
 * Full-bleed halftone dot field. Listens to pointer events on `interactionRef`
 * (usually the hero section) so overlaid text and buttons still receive clicks.
 */
export default function HalftoneField({
  interactionRef,
  className = '',
}: {
  interactionRef: React.RefObject<HTMLElement>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const host = interactionRef.current;
    if (!container || !host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5);

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr, alpha: false, antialias: false, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    const gl = renderer.gl;
    if (!gl) {
      setFailed(true);
      return;
    }
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';
    gl.canvas.style.display = 'block';
    container.appendChild(gl.canvas);

    const uniforms = {
      uRes: { value: [1, 1] },
      uTime: { value: 8 },
      uMouse: { value: [0, 0] },
      uHover: { value: 0 },
      uCell: { value: 12 },
      uBg: { value: isDarkTheme() ? DARK_BG : LIGHT_BG },
      uLight: { value: isDarkTheme() ? 0 : 1 },
      uScroll: { value: 0 },
      // Plain arrays (not typed arrays): ogl only maps uniform arrays from Array values.
      uRipples: { value: Array.from({ length: 16 }, (_, i): number => (i % 4 === 2 ? -1 : 0)) },
      uTrail: { value: new Array(30).fill(0) as number[] },
    };

    let mesh: Mesh;
    try {
      const program = new Program(gl, { vertex, fragment, uniforms });
      mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    } catch {
      container.removeChild(gl.canvas);
      setFailed(true);
      return;
    }

    let width = 1;
    let height = 1;
    const resize = () => {
      width = container.clientWidth || 1;
      height = container.clientHeight || 1;
      renderer.setSize(width, height);
      uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
      const cssCell = Math.min(14, Math.max(8, width / 140));
      uniforms.uCell.value = cssCell * renderer.dpr;
      if (!running) draw();
    };

    const target = { x: 0, y: 0, hover: 0 };
    const current = { x: 0, y: 0 };
    const ripples = Array.from({ length: 4 }, () => ({ x: 0, y: 0, start: -1, strength: 0 }));
    let nextRipple = 0;
    const addRipple = (x: number, y: number, strength: number) => {
      ripples[nextRipple] = { x, y, start: performance.now(), strength };
      nextRipple = (nextRipple + 1) % ripples.length;
    };
    const trail = Array.from({ length: 10 }, () => ({ x: 0, y: 0, s: 0 }));
    let trailIndex = 0;
    let lastTrailAt = 0;
    let nextAmbient = performance.now() + 1800;

    const toDevice = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: (clientX - rect.left) * renderer.dpr, y: (rect.height - (clientY - rect.top)) * renderer.dpr };
    };
    const onMove = (e: PointerEvent) => {
      const pt = toDevice(e.clientX, e.clientY);
      target.x = pt.x;
      target.y = pt.y;
      if (target.hover === 0) {
        current.x = pt.x;
        current.y = pt.y;
      }
      target.hover = 1;
      const now = performance.now();
      if (now - lastTrailAt > 28) {
        lastTrailAt = now;
        trail[trailIndex] = { x: pt.x, y: pt.y, s: 1 };
        trailIndex = (trailIndex + 1) % trail.length;
      }
    };
    const onLeave = () => {
      target.hover = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (reduceMotion) return;
      const pt = toDevice(e.clientX, e.clientY);
      addRipple(pt.x, pt.y, 1);
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerdown', onDown);

    const themeObserver = new MutationObserver(() => {
      const dark = isDarkTheme();
      uniforms.uBg.value = dark ? DARK_BG : LIGHT_BG;
      uniforms.uLight.value = dark ? 0 : 1;
      if (!running) draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();

    const draw = () => renderer.render({ scene: mesh });

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value += dt * 0.5; // calmer flow
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      uniforms.uMouse.value = [current.x, current.y];
      uniforms.uHover.value += (target.hover - uniforms.uHover.value) * 0.06;
      // Ambient pulses from the outer field keep it alive without input.
      if (now > nextAmbient) {
        nextAmbient = now + 9000 + Math.random() * 5000;
        const w = gl.canvas.width;
        const h = gl.canvas.height;
        const side = Math.random() < 0.5 ? 0.12 : 0.88;
        addRipple(w * (Math.random() < 0.5 ? side : Math.random()), h * (Math.random() < 0.5 ? side : Math.random()), 0.28);
      }
      const rv = uniforms.uRipples.value;
      ripples.forEach((rp, i) => {
        rv[i * 4] = rp.x;
        rv[i * 4 + 1] = rp.y;
        rv[i * 4 + 2] = rp.start < 0 ? -1 : (now - rp.start) / 1000;
        rv[i * 4 + 3] = rp.strength;
      });
      uniforms.uRipples.value = [...rv];
      const tv = uniforms.uTrail.value;
      trail.forEach((p, i) => {
        p.s = Math.max(0, p.s - dt * 1.6);
        tv[i * 3] = p.x;
        tv[i * 3 + 1] = p.y;
        tv[i * 3 + 2] = p.s;
      });
      uniforms.uTrail.value = [...tv];
      const rect = container.getBoundingClientRect();
      uniforms.uScroll.value = Math.min(1, Math.max(0, -rect.top / Math.max(rect.height, 1)));
      draw();
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(container);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    draw();
    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerdown', onDown);
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [interactionRef]);

  return (
    <div ref={containerRef} aria-hidden className={`absolute inset-0 ${className}`}>
      {failed && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 45% 40% at 50% 50%, hsl(var(--rd-bg)) 40%, transparent 75%), linear-gradient(120deg, var(--rd-magenta), var(--rd-blue) 35%, var(--rd-cyan) 55%, var(--rd-green) 70%, var(--rd-yellow))',
          }}
        />
      )}
    </div>
  );
}
