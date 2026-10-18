import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowDown } from 'lucide-react';
import HalftoneField from './HalftoneField';
import { Magnetic, SplitWords } from './motion';
import VaporText from './VaporText';
import { isIntroRunning, whenIntroDone } from './introBus';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function AboutHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Hold the hero copy until the intro portal opens, so its entrance plays on screen.
  const [ready, setReady] = useState(() => !isIntroRunning());
  useEffect(() => whenIntroDone(() => setReady(true)), []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="rd-root relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      <HalftoneField interactionRef={sectionRef} />

      {/* Soft scrim keeps the headline readable even if the hole drifts. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{ background: 'radial-gradient(ellipse 34% 26% at 50% 52%, hsl(var(--rd-bg) / 0.85), transparent 72%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 sm:hidden"
        style={{ background: 'radial-gradient(ellipse 62% 36% at 50% 52%, hsl(var(--rd-bg) / 0.92), transparent 78%)' }}
      />

      {ready && (
      <>
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-14 text-center">
        <motion.div {...fade(0.1)} className="rd-mono mb-3 inline-flex items-center gap-2 rounded-full border border-rd-line bg-rd-bg/70 px-3.5 py-1.5 text-[10.5px] text-rd-muted backdrop-blur-md">
          <span className="rd-live-dot relative h-1.5 w-1.5 rounded-full bg-[var(--rd-green)]" />
          AI Club · Dhirubhai Ambani University
        </motion.div>

        <h1 className="w-full max-w-4xl">
          <VaporText text="AI CLUB" />
        </h1>

        <p className="rd-display -mt-1 text-[clamp(1.35rem,2.7vw,2.25rem)] font-medium text-rd-fg">
          <SplitWords lines={['Where DAU learns, builds', 'and ships intelligence.']} delay={0.9} />
        </p>

        <motion.div {...fade(1.6)} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <Link
              to="/events"
              className="group inline-flex items-center gap-2 rounded-full bg-rd-fg px-6 py-3 text-sm font-semibold text-rd-bg transition-transform active:scale-95"
            >
              Explore events
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              to="/weekly-veneza"
              className="inline-flex items-center gap-2 rounded-full border border-rd-line bg-rd-bg/60 px-6 py-3 text-sm font-semibold text-rd-fg backdrop-blur-md transition-colors hover:border-rd-fg/40"
            >
              Start Weekly Veneza
            </Link>
          </Magnetic>
        </motion.div>
      </div>

      {/* Corner annotations */}
      <div className="rd-mono pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden items-end justify-between p-6 text-[10px] text-rd-muted sm:flex">
        <motion.a
          {...fade(1.3)}
          href="#about"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-rd-line bg-rd-bg/70 px-3 py-1.5 backdrop-blur-md hover:text-rd-fg"
        >
          <motion.span
            animate={reduce ? undefined : { y: [0, 3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ArrowDown size={12} />
          </motion.span>
          Scroll
        </motion.a>
      </div>
      <motion.div
        {...fade(1.2)}
        className="rd-mono pointer-events-none absolute right-6 top-24 z-10 hidden rounded-full border border-rd-line bg-rd-bg/70 px-3 py-1.5 text-[10px] text-rd-muted backdrop-blur-md md:block"
      >
        23.19°N · 72.63°E · Gandhinagar
      </motion.div>
      </>
      )}
    </section>
  );
}
