import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Check, Copy, Mail, Mic, Rocket, Trophy, Zap, BookOpen } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { useWeeklyVenezaData, useWeeklyVenezaProgress } from '@/hooks/useWeeklyVeneza';
import { useAuth } from '@/contexts/AuthContext';
import SlicedWaves from '@/components/reactbits/SlicedWaves';
import { useTheme } from './theme';
import { useHomeTopicLabels } from './homeTopics';
import { CountUp, Crosshair, Magnetic, Marquee, Reveal, ScrollFillText, SectionLabel, SpotlightCard, SplitWords } from './motion';

const CLUB_EMAIL = 'ai_club@dau.ac.in';

const SOCIALS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/ai-club-daiict/' },
  { label: 'Instagram', href: 'https://www.instagram.com/aiclub_daiict?igsh=eTgxajEwZHBjMzNo' },
  { label: 'YouTube', href: 'https://www.youtube.com/@AIClubDAU' },
  { label: 'Discord', href: 'https://discord.gg/bU7JdWa6' },
  { label: 'GitHub', href: 'https://github.com/ai-club-daiict' },
];

const TOPIC_COLORS = ['var(--rd-blue)', 'var(--rd-cyan)', 'var(--rd-green)', 'var(--rd-yellow)', 'var(--rd-orange)', 'var(--rd-red)', 'var(--rd-magenta)', 'var(--rd-violet)'];

function useClubStats() {
  return useQuery<{ events: number; projects: number; members: number }>({
    queryKey: ['club-stats'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/stats'));
      if (!res.ok) throw new Error('stats');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

/* ─── Manifesto + stats ─────────────────────────────────────────────────── */

function Manifesto() {
  const { data: stats } = useClubStats();
  const { data: weeks = [] } = useWeeklyVenezaData();
  const resources = weeks.reduce((n, w) => n + (w.resources?.length || 0), 0);

  const items = [
    { label: 'Members', value: stats?.members, color: 'var(--rd-violet)' },
    { label: 'Projects shipped', value: stats?.projects, color: 'var(--rd-cyan)' },
    { label: 'Events hosted', value: stats?.events, color: 'var(--rd-orange)' },
    { label: 'Curated resources', value: resources || undefined, color: 'var(--rd-green)' },
  ];

  return (
    <section id="about" className="relative scroll-mt-16 border-t border-rd-line py-24 sm:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <div className="lg:pt-3">
            <SectionLabel index="01">About the club</SectionLabel>
            <Reveal delay={0.1} className="mt-6 hidden max-w-[200px] text-sm leading-relaxed text-rd-muted lg:block">
              Technical club of Dhirubhai Ambani University, Gandhinagar.
            </Reveal>
          </div>
          <ScrollFillText
            className="rd-display text-[clamp(1.65rem,3.4vw,3rem)] font-medium leading-[1.15] text-rd-fg"
            text="AI Club at DAU is a vibrant community that aspires to promote and enrich the AI/ML culture on our campus. With buildathons, speaker sessions and lecture series, we keep AI innovation alive at DAU."
            highlights={['AI/ML', 'buildathons']}
          />
        </div>

        <div className="relative mt-20 grid grid-cols-2 border-l border-t border-rd-line lg:grid-cols-4">
          <Crosshair className="-left-[6px] -top-[6px]" />
          <Crosshair className="-right-[6px] -top-[6px]" />
          {items.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="relative border-b border-r border-rd-line p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                <span className="rd-mono text-[10.5px] text-rd-faint">{s.label}</span>
              </div>
              <div className="rd-display mt-5 text-[clamp(2.4rem,5vw,3.75rem)] font-medium text-rd-fg">
                {s.value === undefined ? <span className="rd-skeleton inline-block h-[0.8em] w-16 rounded-md align-middle" /> : <CountUp to={s.value} suffix="+" />}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ─── Topic marquee ─────────────────────────────────────────────────────── */

function TopicStrip() {
  const topics = useHomeTopicLabels();
  return (
    <section aria-label="What we cover" className="relative border-y border-rd-line bg-rd-bg2 py-6">
      <Marquee duration={45}>
        {topics.map((t, i) => (
          <span key={`${t}-${i}`} className="rd-display flex items-center whitespace-nowrap px-6 text-[clamp(1.4rem,3vw,2.4rem)] font-medium text-rd-fg">
            {t}
            <span className="ml-12 text-[0.7em]" style={{ color: TOPIC_COLORS[i % TOPIC_COLORS.length] }}>✦</span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}

/* ─── Bento: what we do ─────────────────────────────────────────────────── */

function CardShell({
  index,
  icon,
  title,
  body,
  color,
  to,
  children,
  horizontal = false,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  body: string;
  color: string;
  to?: string;
  children?: ReactNode;
  horizontal?: boolean;
}) {
  const head = (
    <div className="flex items-center justify-between">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rd-line"
        style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
      >
        {icon}
      </span>
      <span className="rd-mono text-[10.5px] text-rd-faint">{index}</span>
    </div>
  );
  const text = (
    <div>
      <h3 className="rd-display flex items-center gap-2 text-xl font-medium text-rd-fg sm:text-2xl">
        {title}
        {to && <ArrowUpRight size={18} className="text-rd-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rd-fg" />}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-rd-muted">{body}</p>
    </div>
  );
  const content = (
    <SpotlightCard glow={color} className="h-full" innerClassName="p-6 sm:p-7">
      {horizontal ? (
        <div className="flex h-full flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex flex-1 flex-col justify-between gap-10">{head}{text}</div>
          <div className="flex-1 lg:ml-auto lg:max-w-md">{children}</div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          {head}
          <div className="my-6 flex min-h-[120px] flex-1 items-center">{children}</div>
          {text}
        </div>
      )}
    </SpotlightCard>
  );
  return to ? (
    <Link to={to} className="block h-full rounded-[22px] focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-accent">
      {content}
    </Link>
  ) : (
    content
  );
}

function BuildLog() {
  const lines = [
    { t: '$ idea --pitch "campus copilot"', c: 'text-rd-muted' },
    { t: '✓ dataset scraped · 12,408 rows', c: '' },
    { t: '✓ model fine-tuned · val acc 0.94', c: '' },
    { t: '✓ shipped to prod in 36h', c: '' },
  ];
  return (
    <div className="rd-mono w-full rounded-xl border border-rd-line bg-rd-bg/60 p-4 text-[11px] normal-case tracking-normal">
      {lines.map((l, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.35, duration: 0.4 }}
          className={`py-0.5 ${l.c}`}
          style={i > 0 ? { color: 'var(--rd-green)' } : undefined}
        >
          {l.t}
        </motion.div>
      ))}
      <motion.span
        className="mt-1 inline-block h-3.5 w-1.5 bg-rd-fg"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </div>
  );
}

function Leaderboard() {
  const rows = [92, 81, 74, 63];
  return (
    <div className="w-full space-y-2.5">
      {rows.map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="rd-mono w-5 text-[10px] text-rd-faint">#{i + 1}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-rd-line/70">
            <motion.div
              className="h-full rounded-full"
              style={{ background: i === 0 ? 'var(--rd-cyan)' : 'hsl(var(--rd-fg) / 0.25)' }}
              initial={{ width: 0 }}
              whileInView={{ width: `${w}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.12, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Waveform() {
  const reduce = useReducedMotion();
  const bars = Array.from({ length: 28 });
  return (
    <div className="flex h-16 w-full items-center justify-between gap-[3px]">
      {bars.map((_, i) => (
        <motion.span
          key={i}
          className="w-full rounded-full"
          style={{ background: 'var(--rd-blue)', opacity: 0.35 + ((i * 7) % 10) / 16 }}
          animate={reduce ? { height: '40%' } : { height: ['20%', `${30 + ((i * 37) % 70)}%`, '20%'] }}
          transition={{ duration: 1.1 + (i % 5) * 0.18, repeat: Infinity, ease: 'easeInOut', delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

function FestBadges() {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      {['iPrompt', 'AI Triathlon'].map((b, i) => (
        <motion.span
          key={b}
          className="rd-display rounded-full border px-4 py-2 text-lg font-medium"
          style={{ borderColor: i ? 'var(--rd-magenta)' : 'var(--rd-yellow)', color: i ? 'var(--rd-magenta)' : 'var(--rd-orange)' }}
          animate={reduce ? undefined : { y: [0, -6, 0], rotate: [i ? 2 : -2, i ? -2 : 2, i ? 2 : -2] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut' }}
        >
          {b}
        </motion.span>
      ))}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = { VIDEO: 'Videos', COURSE: 'Courses', BOOK: 'Books', PAPER: 'Papers', ARTICLE: 'Articles', CODE: 'Code' };

function readLocalProgress(): number[] {
  try {
    const saved = localStorage.getItem('weekly_veneza_local_progress');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/** The live Weekly Veneza week and this visitor's progress on it (account if signed in, else this device). */
function MiniRing() {
  const { data: weeks = [], isLoading } = useWeeklyVenezaData();
  const { data: remote = [] } = useWeeklyVenezaProgress();
  const { isAuthenticated } = useAuth();
  const progress = isAuthenticated ? remote : readLocalProgress();

  const week = weeks.find(w => w.is_current) || weeks.find(w => w.status === 'current') || weeks[0];
  const resources = week?.resources || [];
  const done = resources.filter(r => progress.includes(r.id)).length;
  const pct = resources.length ? done / resources.length : 0;
  const types = [...new Set(resources.map(r => TYPE_LABELS[r.resource_type.toUpperCase()] || 'Resources'))].slice(0, 3).join(' · ');
  const title = week?.title.replace(/^week\s*\d+\s*[:\-–]\s*/i, '') || '';

  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex w-full items-center gap-5">
      <div className="relative shrink-0">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" strokeWidth="7" className="stroke-rd-line" />
          <motion.circle
            cx="44" cy="44" r={r} fill="none" strokeWidth="7" strokeLinecap="round"
            stroke="var(--rd-green)" strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="rd-mono absolute inset-0 flex items-center justify-center text-[11px] text-rd-fg">{Math.round(pct * 100)}%</span>
      </div>
      <div className="rd-mono min-w-0 space-y-1.5 text-[10.5px] text-rd-muted">
        {isLoading ? (
          <div className="rd-skeleton h-3 w-32 rounded" />
        ) : week ? (
          <>
            <div className="line-clamp-2 normal-case tracking-normal text-rd-fg">
              Week {String(week.week_number).padStart(2, '0')} · {title}
            </div>
            <div className="text-rd-faint">
              {done}/{resources.length} done{types ? ` · ${types}` : ''}
            </div>
          </>
        ) : (
          <div>First week coming soon</div>
        )}
      </div>
    </div>
  );
}

function AuraChat() {
  const reduce = useReducedMotion();
  return (
    <div className="w-full space-y-2.5 text-sm">
      <motion.div
        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-rd-fg px-4 py-2.5 text-rd-bg"
      >
        When is the next AI Club event?
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
        className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md border border-rd-line bg-rd-bg px-4 py-3"
      >
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--rd-orange)' }}
            animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

function WhatWeDo() {
  return (
    <section className="relative py-24 sm:py-32">
      <Container>
        <div className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel index="02">What we do</SectionLabel>
            <h2 className="rd-display mt-6 text-[clamp(2rem,4.4vw,3.6rem)] font-medium text-rd-fg">
              <SplitWords lines={['Learn it. Build it.', 'Ship it, together.']} onView stagger={0.05} />
            </h2>
          </div>
          <Reveal className="max-w-sm text-sm leading-relaxed text-rd-muted">
            Kaggle contests, buildathons, public lectures and fest events like iPrompt and AI Triathlon, run by students, for
            students.
          </Reveal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Reveal className="md:col-span-2">
            <CardShell index="01" icon={<Rocket size={17} />} color="var(--rd-violet)" title="Buildathons" body="Form a team, pick a real problem and ship a working AI product in a weekend.">
              <BuildLog />
            </CardShell>
          </Reveal>
          <Reveal delay={0.08}>
            <CardShell index="02" icon={<Trophy size={17} />} color="var(--rd-cyan)" title="Kaggle contests" body="Compete on real datasets, climb the leaderboard and learn from every submission.">
              <Leaderboard />
            </CardShell>
          </Reveal>
          <Reveal>
            <CardShell index="03" icon={<Mic size={17} />} color="var(--rd-blue)" title="Public lectures" body="Talks such as Edge AI by Kiran Trivedi and WorldQuant BRAIN sessions.">
              <Waveform />
            </CardShell>
          </Reveal>
          <Reveal delay={0.08}>
            <CardShell index="04" icon={<Zap size={17} />} color="var(--rd-magenta)" title="Fest events" body="iPrompt, AI Triathlon and more during the university fests.">
              <FestBadges />
            </CardShell>
          </Reveal>
          <Reveal delay={0.16}>
            <CardShell index="05" icon={<BookOpen size={17} />} color="var(--rd-green)" title="Weekly Veneza" body="A curated weekly AI curriculum with progress tracking." to="/weekly-veneza">
              <MiniRing />
            </CardShell>
          </Reveal>
          <Reveal className="md:col-span-2 lg:col-span-3">
            <CardShell index="06" icon={<img src="/aura-mark.png" alt="" className="h-6 w-6 object-contain" />} color="var(--rd-orange)" title="AURA, our university AI assistant" body="Built by DAU students. Ask about events, courses and campus life." to="/aura" horizontal>
              <AuraChat />
            </CardShell>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ─── Get involved ──────────────────────────────────────────────────────── */

export function Connect() {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLUB_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable: the mailto link still works */
    }
  };

  const dotMask: CSSProperties = {
    WebkitMaskImage: 'radial-gradient(circle, #000 2.4px, transparent 2.8px), radial-gradient(ellipse 60% 55% at 50% 50%, transparent 35%, #000 85%)',
    WebkitMaskSize: '13px 13px, 100% 100%',
    WebkitMaskComposite: 'source-in',
    maskImage: 'radial-gradient(circle, #000 2.4px, transparent 2.8px), radial-gradient(ellipse 60% 55% at 50% 50%, transparent 35%, #000 85%)',
    maskSize: '13px 13px, 100% 100%',
    maskComposite: 'intersect',
  };

  return (
    <section className="rd-root relative overflow-hidden border-t border-rd-line py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-90">
        <SlicedWaves
          key={theme}
          color1={theme === 'dark' ? '#9a6bff' : '#6d2bff'}
          color2={theme === 'dark' ? '#ff4be0' : '#f224c8'}
          color3={theme === 'dark' ? '#22e0ff' : '#00a8d6'}
          lightMode={theme === 'light'}
          position={0.82}
        />
      </div>
      <div aria-hidden className="rd-spectrum-bg pointer-events-none absolute inset-0 opacity-30" style={dotMask} />
      <Container className="text-center">
        <div className="flex justify-center">
          <SectionLabel index="07">Get involved</SectionLabel>
        </div>
        <h2 className="rd-display mx-auto mt-7 max-w-3xl text-[clamp(2.2rem,5.4vw,4.6rem)] font-medium text-rd-fg">
          <SplitWords lines={['Have questions', 'or want to join?']} onView />
        </h2>

        <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <a
              href={`mailto:${CLUB_EMAIL}`}
              className="inline-flex items-center gap-2.5 rounded-full bg-rd-fg px-6 py-3.5 text-sm font-semibold text-rd-bg transition-transform active:scale-95"
            >
              <Mail size={16} /> {CLUB_EMAIL}
            </a>
          </Magnetic>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy email address"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-rd-line bg-rd-bg/70 text-rd-muted backdrop-blur-md transition-colors hover:text-rd-fg"
          >
            {copied ? <Check size={16} style={{ color: 'var(--rd-green)' }} /> : <Copy size={16} />}
          </button>
        </Reveal>

        <Reveal delay={0.3} className="mt-12 flex flex-wrap justify-center gap-2">
          {SOCIALS.map(s => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-rd-line bg-rd-bg/80 px-4 py-2 text-sm text-rd-muted backdrop-blur-md transition-colors hover:border-rd-fg/30 hover:text-rd-fg"
            >
              {s.label}
              <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}

export default function AboutSections() {
  return (
    <div className="rd-root relative">
      <Manifesto />
      <TopicStrip />
      <WhatWeDo />
    </div>
  );
}
