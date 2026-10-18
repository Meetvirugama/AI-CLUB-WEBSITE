import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import './redesign.css';

const EASE = [0.22, 1, 0.36, 1] as const;

export function SectionLabel({ index, children, className = '' }: { index: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rd-mono flex items-center gap-3 text-[11px] text-rd-muted ${className}`}>
      <span className="text-rd-fg">{index}</span>
      <motion.span
        className="block h-px bg-rd-faint/60"
        initial={{ width: 0 }}
        whileInView={{ width: 40 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <span>{children}</span>
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'article';
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

/** Headline whose words rise in one by one. Each entry in `lines` is forced onto its own line on wide screens. */
export function SplitWords({
  lines,
  className = '',
  delay = 0,
  stagger = 0.06,
  onView = false,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  stagger?: number;
  onView?: boolean;
}) {
  const reduce = useReducedMotion();
  let i = 0;
  const trigger = onView
    ? { whileInView: 'show', viewport: { once: true, margin: '-40px' } }
    : { animate: 'show' };
  return (
    <motion.span className={className} initial="hidden" {...trigger} aria-label={lines.join(' ')}>
      {lines.map((line, li) => (
        <span key={li} className="inline sm:block" aria-hidden>
          {li > 0 && <span className="sm:hidden"> </span>}
          {line.split(' ').map((word, wi) => {
            const idx = i++;
            return (
              <Fragment key={wi}>
              <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { y: '105%', opacity: 0, filter: 'blur(6px)' },
                    show: {
                      y: '0%',
                      opacity: 1,
                      filter: 'blur(0px)',
                      transition: { duration: 0.9, delay: delay + idx * stagger, ease: EASE },
                    },
                  }}
                >
                  {word}
                </motion.span>
              </span>
              {wi < line.split(' ').length - 1 && ' '}
              </Fragment>
            );
          })}
        </span>
      ))}
    </motion.span>
  );
}

function FillWord({
  word,
  progress,
  range,
  highlight,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
  highlight: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={highlight ? 'rd-spectrum-text' : undefined}>
      {word}{' '}
    </motion.span>
  );
}

/** Paragraph that fills in word by word as it scrolls through the viewport. */
export function ScrollFillText({ text, highlights = [], className = '' }: { text: string; highlights?: string[]; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });
  const words = text.split(' ');
  const isHighlight = (w: string) => highlights.some(h => w.toLowerCase().replace(/[.,]/g, '') === h.toLowerCase());

  if (reduce) {
    return (
      <p ref={ref} className={className}>
        {words.map((w, i) => (
          <span key={i} className={isHighlight(w) ? 'rd-spectrum-text' : undefined}>{w} </span>
        ))}
      </p>
    );
  }

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <FillWord
          key={i}
          word={w}
          progress={scrollYProgress}
          range={[i / words.length, (i + 1) / words.length]}
          highlight={isHighlight(w)}
        />
      ))}
    </p>
  );
}

export function CountUp({ to, duration = 1.8, suffix = '' }: { to: number; duration?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, { duration, ease: EASE, onUpdate: v => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

/** Card whose border and surface light up around the cursor in `glow` colour. */
export function SpotlightCard({
  children,
  glow = 'var(--rd-violet)',
  className = '',
  innerClassName = '',
}: {
  children: ReactNode;
  glow?: string;
  className?: string;
  innerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`group relative rounded-[22px] bg-rd-line/80 p-px ${className}`}
      style={{ '--mx': '50%', '--my': '50%' } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(260px circle at var(--mx) var(--my), ${glow}, transparent 70%)` }}
      />
      <div className={`relative h-full overflow-hidden rounded-[21px] bg-rd-card ${innerClassName}`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(420px circle at var(--mx) var(--my), color-mix(in srgb, ${glow} 13%, transparent), transparent 70%)` }}
        />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

/** Pulls its child gently toward the cursor while hovered. */
export function Magnetic({ children, strength = 0.28, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={reset} style={{ x: sx, y: sy }} className={`inline-block ${className}`}>
      {children}
    </motion.div>
  );
}

export function Marquee({ children, duration = 40, reverse = false, className = '' }: { children: ReactNode; duration?: number; reverse?: boolean; className?: string }) {
  return (
    <div className={`rd-marquee overflow-hidden ${className}`} style={{ '--rd-marquee-duration': `${duration}s` } as CSSProperties}>
      <div className="rd-marquee-track" data-reverse={reverse}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>{children}</div>
      </div>
    </div>
  );
}

export function Crosshair({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 11 11" className={`pointer-events-none absolute text-rd-faint ${className}`}>
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
