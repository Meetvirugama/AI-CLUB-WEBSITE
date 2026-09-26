import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

export type FanMode = 'center' | 'left' | 'right';

export interface WebThreadsProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  fanMode?: FanMode;
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  mirror?: boolean;
  shimmer?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  backgroundColor?: string;
  lightMode?: boolean;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const FAN_MODE: Record<FanMode, number> = { center: 0, left: 1, right: 2 };

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;

#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);
  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) {
    pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  }
  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;
  vec3 col = vec3(0.0);
  float gsum = 0.0;
  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;
    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;
    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;
    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);
    col += g * threadCol;
    gsum += g;
  }
  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);
  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;
  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * alpha;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }
  if (uLightMode) {
    vec3 mapped = vec3(1.0) - exp(-max(col, vec3(0.0)) * 1.3);
    float rawEnergy = clamp(max(mapped.r, max(mapped.g, mapped.b)) * uOpacity, 0.0, 1.0);
    float coverage = smoothstep(0.18, 0.72, rawEnergy);
    coverage *= coverage;
    vec3 hue = mapped / max(max(mapped.r, max(mapped.g, mapped.b)), 1e-4);
    vec3 chroma = pow(clamp(hue, 0.0, 1.0), vec3(0.78));
    vec3 pigment = mix(chroma, vec3(0.08), 0.12);
    vec3 ink = mix(vec3(0.9), pigment, 0.82 + coverage * 0.18);
    fragColor = vec4(mix(uBackgroundColor, ink, coverage), 1.0);
  } else {
    fragColor = vec4(outRgb, alpha);
  }
}`;

type Ctx = { renderer: InstanceType<typeof Renderer>; program: InstanceType<typeof Program>; mesh: InstanceType<typeof Mesh>; };
const ctxMap = new WeakMap<HTMLDivElement, Ctx>();

const WebThreads: React.FC<WebThreadsProps> = ({
  color1 = '#5227FF', color2 = '#FF9FFC', color3 = '#FFFFFF',
  speed = 0.2, threadCount = 6, frequency = 5.0, spread = 0.18,
  taper = 1.0, position = 0.5, fanMode = 'center',
  glow = 0.02, falloff = 0.6, thickness = 1.1, brightness = 0.6,
  opacity = 1.0, mirror = true, shimmer = false, grain = true,
  grainIntensity = 0.05, mouseInteraction = true, mouseStrength = 0.3,
  backgroundColor = '#FFFFFF', lightMode = false, className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ enabled: true, strength: 0.3 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new Renderer({ webgl: 2, alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.display = 'block';
    container.appendChild(canvas);
    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex, fragment,
      uniforms: {
        iTime: { value: 0 }, iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: 0.2 }, uThreadCount: { value: 6 }, uFrequency: { value: 5.0 },
        uSpread: { value: 0.18 }, uTaper: { value: 1.0 }, uPosition: { value: 0.5 },
        uFanMode: { value: 0 }, uGlow: { value: 0.02 }, uFalloff: { value: 0.6 },
        uThickness: { value: 1.1 }, uBrightness: { value: 0.6 }, uOpacity: { value: 1.0 },
        uMirror: { value: 1.0 }, uShimmer: { value: 0.0 }, uGrain: { value: 1.0 },
        uGrainIntensity: { value: 0.05 }, uColor1: { value: new Float32Array([1, 1, 1]) },
        uColor2: { value: new Float32Array([1, 1, 1]) }, uColor3: { value: new Float32Array([1, 1, 1]) },
        uBackgroundColor: { value: new Float32Array([1, 1, 1]) }, uLightMode: { value: false },
        uMouse: { value: new Float32Array([0.5, 0.5]) }, uMouseStrength: { value: 0.3 },
        uEnableMouse: { value: 1.0 }, uMouseActive: { value: 0 },
      }
    });
    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });
    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const res = (program.uniforms.iResolution as { value: Float32Array }).value;
      res[0] = gl.drawingBufferWidth; res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };
    const ro = new ResizeObserver(setSize); ro.observe(container); setSize();
    const cur: [number, number] = [0.5, 0.5], tar: [number, number] = [0.5, 0.5];
    let curActive = 0, tarActive = 0, raf = 0, isVisible = true, isPageVisible = !document.hidden;
    const t0 = performance.now();
    const onMove = (e: MouseEvent) => { const r = canvas.getBoundingClientRect(); tar[0]=(e.clientX-r.left)/r.width; tar[1]=1-(e.clientY-r.top)/r.height; tarActive=1; };
    const onEnter = () => { tarActive=1; };
    const onLeave = () => { tarActive=0; };
    canvas.addEventListener('mousemove', onMove); canvas.addEventListener('mouseenter', onEnter); canvas.addEventListener('mouseleave', onLeave);
    const loop = (t: number) => {
      (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;
      cur[0] += 0.05*(tar[0]-cur[0]); cur[1] += 0.05*(tar[1]-cur[1]);
      curActive += 0.05*(tarActive-curActive);
      const mouse = (program.uniforms.uMouse as { value: Float32Array }).value;
      mouse[0]=cur[0]; mouse[1]=cur[1];
      (program.uniforms.uMouseActive as { value: number }).value = curActive;
      (program.uniforms.uEnableMouse as { value: number }).value = mouseRef.current.enabled ? 1.0 : 0.0;
      (program.uniforms.uMouseStrength as { value: number }).value = mouseRef.current.strength;
      renderer.render({ scene: mesh }); raf = requestAnimationFrame(loop);
    };
    const tryStart = () => { if (isVisible && isPageVisible && raf===0) raf=requestAnimationFrame(loop); };
    const tryStop = () => { if (raf!==0) { cancelAnimationFrame(raf); raf=0; } };
    const io = new IntersectionObserver(([e]) => { isVisible=e.isIntersecting; isVisible?tryStart():tryStop(); }, { threshold: 0 });
    io.observe(container);
    const onVis = () => { isPageVisible=!document.hidden; isPageVisible?tryStart():tryStop(); };
    document.addEventListener('visibilitychange', onVis);
    tryStart();
    return () => {
      tryStop(); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseenter', onEnter); canvas.removeEventListener('mouseleave', onLeave);
      ctxMap.delete(container);
      try { container.removeChild(canvas); } catch {}
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current; if (!container) return;
    const ctx = ctxMap.get(container); if (!ctx) return;
    const u = ctx.program.uniforms as Record<string, { value: any }>;
    u.uSpeed.value=speed; u.uThreadCount.value=Math.round(threadCount); u.uFrequency.value=frequency;
    u.uSpread.value=spread; u.uTaper.value=taper; u.uPosition.value=position;
    u.uFanMode.value=FAN_MODE[fanMode]??0; u.uGlow.value=glow; u.uFalloff.value=falloff;
    u.uThickness.value=thickness; u.uBrightness.value=brightness; u.uOpacity.value=opacity;
    u.uMirror.value=mirror?1.0:0.0; u.uShimmer.value=shimmer?1.0:0.0;
    u.uGrain.value=grain?1.0:0.0; u.uGrainIntensity.value=grainIntensity;
    const [r1,g1,b1]=hexToRgb(color1); u.uColor1.value[0]=r1; u.uColor1.value[1]=g1; u.uColor1.value[2]=b1;
    const [r2,g2,b2]=hexToRgb(color2); u.uColor2.value[0]=r2; u.uColor2.value[1]=g2; u.uColor2.value[2]=b2;
    const [r3,g3,b3]=hexToRgb(color3); u.uColor3.value[0]=r3; u.uColor3.value[1]=g3; u.uColor3.value[2]=b3;
    const [br,bg,bb]=hexToRgb(backgroundColor); u.uBackgroundColor.value[0]=br; u.uBackgroundColor.value[1]=bg; u.uBackgroundColor.value[2]=bb;
    u.uLightMode.value=lightMode; u.uMouseStrength.value=mouseStrength;
    u.uEnableMouse.value=mouseInteraction?1.0:0.0;
    mouseRef.current.enabled=mouseInteraction; mouseRef.current.strength=mouseStrength;
  }, [color1,color2,color3,speed,threadCount,frequency,spread,taper,position,fanMode,glow,falloff,thickness,brightness,opacity,mirror,shimmer,grain,grainIntensity,mouseInteraction,mouseStrength,backgroundColor,lightMode]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`.trim()} />;
};

export default WebThreads;
