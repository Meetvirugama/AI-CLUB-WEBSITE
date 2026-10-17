
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Code2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import AuraLogo from './AuraLogo';

const highlights = [
  {
    icon: BrainCircuit,
    label: 'Explore AI',
    description: 'Learn the ideas shaping intelligence.',
  },
  {
    icon: Code2,
    label: 'Build together',
    description: 'Turn concepts into working projects.',
  },
  {
    icon: UsersRound,
    label: 'Grow as a community',
    description: 'Learn, collaborate, and share.',
  },
];

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative isolate flex min-h-screen flex-col justify-center overflow-hidden bg-[#080A12] pt-20 text-white"
    >
      {/* Ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-cyan-500/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-orange-500/10 blur-[100px]"
      />

      {/* Subtle technical grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.2) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'linear-gradient(to bottom, black, transparent 90%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />

      {/* Main hero */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-6 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-8 lg:px-10">
        {/* Left: Copy and actions */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-7 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 backdrop-blur-xl sm:px-4"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>

            <span className="text-xs font-medium tracking-wide text-slate-300 sm:text-sm">
              DA-IICT · Dhirubhai Ambani University
            </span>

            <span className="hidden rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300 sm:inline-flex">
              AI Club
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">
              <Sparkles size={15} />
              Curiosity meets intelligence
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.06] tracking-[-0.055em] sm:text-6xl md:text-7xl xl:text-[5.5rem]">
              Explore AI.
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-cyan-300 to-cyan-400 bg-clip-text text-transparent">
                Build what&apos;s next.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              We are a community of curious minds exploring artificial
              intelligence, building meaningful projects, and learning
              together. From first experiments to ambitious ideas,
              the future starts with what we create today.
            </p>
          </motion.div>

          {/* Primary call to action */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <Link
              to="/events"
              className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#080A12] transition-all duration-300 hover:-translate-y-0.5 hover:bg-cyan-100 hover:shadow-[0_0_35px_rgba(34,211,238,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080A12]"
            >
              Explore Our Events
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </motion.div>

          {/* Supporting note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-6 text-xs leading-5 text-slate-500 sm:text-sm"
          >
            Learn together. Experiment boldly. Create responsibly.
          </motion.p>
        </div>

        {/* Right: Existing AURA visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, x: 15 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="relative mx-auto flex w-full max-w-md items-center justify-center lg:col-span-5 lg:max-w-none"
        >
          {/* Decorative orbit rings */}
          <div
            aria-hidden="true"
            className="absolute aspect-square w-[92%] rounded-full border border-violet-400/15"
          />
          <div
            aria-hidden="true"
            className="absolute aspect-square w-[76%] rounded-full border border-cyan-300/15"
          />
          <div
            aria-hidden="true"
            className="absolute aspect-square w-[58%] rounded-full border border-white/[0.07]"
          />

          {/* Orbit markers */}
          <motion.div
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none absolute aspect-square w-[92%]"
          >
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.8)]" />
            <span className="absolute bottom-[13%] right-[10%] h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,0.8)]" />
          </motion.div>

          {/* Core glow */}
          <div
            aria-hidden="true"
            className="absolute inset-[15%] rounded-full bg-gradient-to-br from-violet-500/20 via-cyan-400/10 to-orange-400/15 blur-3xl"
          />

          {/* Reuse the existing AURA logo and its interactions */}
          <div className="relative z-10 w-full max-w-[500px]">
            <AuraLogo />
          </div>

          {/* Floating label */}
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute bottom-[8%] right-0 z-20 rounded-xl border border-white/10 bg-[#111521]/90 px-3.5 py-3 shadow-2xl backdrop-blur-xl sm:right-[-2%] sm:px-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-cyan-300">
                <BrainCircuit size={17} />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">
                  Intelligence in action
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Meet AURA
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Feature strip: qualitative highlights, not invented statistics */}
      <div className="relative z-10 border-t border-white/[0.08] bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-0 px-6 sm:grid-cols-3 sm:px-8 lg:px-10">
          {highlights.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 + index * 0.1 }}
                className={`flex items-start gap-3.5 py-5 sm:px-4 sm:py-6 ${
                  index !== 0 ? 'border-t border-white/[0.08] sm:border-l sm:border-t-0' : ''
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300">
                  <Icon size={19} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
