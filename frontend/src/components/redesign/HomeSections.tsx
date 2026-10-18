import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Calendar, Clock, Github, MapPin, MoveHorizontal } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { normalizeBannerUrl } from '@/lib/utils';
import GradientASCII from '@/components/reactbits/GradientASCII';
import { Marquee, Reveal, SectionLabel, SplitWords } from './motion';
import { useTheme } from './theme';

const SPECTRUM = ['var(--rd-blue)', 'var(--rd-cyan)', 'var(--rd-green)', 'var(--rd-yellow)', 'var(--rd-orange)', 'var(--rd-red)', 'var(--rd-magenta)', 'var(--rd-violet)'];
const EASE = [0.22, 1, 0.36, 1] as const;

function useApi<T>(key: string, path: string) {
  return useQuery<T>({
    queryKey: ['home', key],
    queryFn: async () => {
      const res = await fetch(getApiUrl(path));
      if (!res.ok) throw new Error(path);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>{children}</div>;
}

function SectionHead({ index, label, lines, aside, cta }: { index: string; label: string; lines: string[]; aside?: ReactNode; cta?: ReactNode }) {
  return (
    <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <SectionLabel index={index}>{label}</SectionLabel>
        <h2 className="rd-display mt-6 text-[clamp(2rem,4.4vw,3.6rem)] font-medium text-rd-fg">
          <SplitWords lines={lines} onView stagger={0.05} />
        </h2>
      </div>
      <Reveal className="flex max-w-sm flex-col items-start gap-4 lg:items-end lg:text-right">
        {aside && <div className="text-sm leading-relaxed text-rd-muted">{aside}</div>}
        {cta}
      </Reveal>
    </div>
  );
}

function PillLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 rounded-full border border-rd-line px-4 py-2 text-sm font-semibold text-rd-fg transition-colors hover:border-rd-fg/40">
      {children}
      <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

function SafeImage({ src, className = '', fallbackIndex = 0 }: { src?: string | null; className?: string; fallbackIndex?: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    const c = SPECTRUM[fallbackIndex % SPECTRUM.length];
    return (
      <div className={`relative overflow-hidden bg-rd-bg2 ${className}`}>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${c}, transparent 60%), radial-gradient(circle at 75% 70%, ${SPECTRUM[(fallbackIndex + 3) % 8]}, transparent 55%)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 2.2px, transparent 2.6px)',
            WebkitMaskSize: '11px 11px',
            maskImage: 'radial-gradient(circle, #000 2.2px, transparent 2.6px)',
            maskSize: '11px 11px',
          }}
        />
      </div>
    );
  }
  return <img src={normalizeBannerUrl(src)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/* ─── 03 · Events ───────────────────────────────────────────────────────── */

interface ClubEvent {
  id: number;
  title: string;
  description?: string;
  banner?: string | null;
  venue?: string;
  category?: string;
  event_start_date?: string;
  start_time?: string;
  status: string;
  event_type?: string;
}
interface PastEvent {
  id: number;
  title: string;
  category?: string;
  date_label?: string;
  image_url?: string | null;
  speaker?: string;
}

function useCountdownTo(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = Math.max(0, target.getTime() - now);
  return { d: Math.floor(diff / 86_400_000), h: Math.floor((diff / 3_600_000) % 24), m: Math.floor((diff / 60_000) % 60), s: Math.floor((diff / 1000) % 60) };
}

function FeaturedEvent({ event }: { event: ClubEvent }) {
  const start = useMemo(() => {
    if (!event.event_start_date) return null;
    const d = new Date(`${event.event_start_date}T${event.start_time || '00:00:00'}+05:30`);
    return isNaN(d.getTime()) ? null : d;
  }, [event.event_start_date, event.start_time]);
  const upcoming = Boolean(start && start.getTime() > Date.now());
  const left = useCountdownTo(upcoming ? start : null);
  const open = event.status === 'registration_open';
  const badge = open ? 'Registration open' : upcoming ? 'Coming up' : 'Most recent';
  const badgeColor = open ? 'var(--rd-green)' : upcoming ? 'var(--rd-yellow)' : 'var(--rd-violet)';
  const dateText = start?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const timeText = start?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

  return (
    <Link to={`/events/${event.id}`} className="group relative block h-full overflow-hidden rounded-[26px] border border-rd-line bg-rd-card">
      <div className="relative aspect-[16/9] overflow-hidden">
        <SafeImage src={event.banner} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="rd-mono absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[10px] text-white backdrop-blur-md">
          <span className={`${upcoming ? 'rd-live-dot ' : ''}relative h-1.5 w-1.5 rounded-full`} style={{ background: badgeColor }} />
          {badge}
        </span>
        {left && (
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 text-white">
            <div className="flex gap-3">
              {[
                { v: left.d, l: 'd' },
                { v: left.h, l: 'h' },
                { v: left.m, l: 'm' },
                { v: left.s, l: 's' },
              ].map(x => (
                <div key={x.l} className="rd-display text-3xl font-medium tabular-nums sm:text-4xl">
                  {String(x.v).padStart(2, '0')}
                  <span className="rd-mono ml-0.5 text-[10px] text-white/60">{x.l}</span>
                </div>
              ))}
            </div>
            <span className="rd-mono hidden text-[10px] text-white/70 sm:block">until kickoff</span>
          </div>
        )}
      </div>
      <div className="p-6 sm:p-8">
        <div className="rd-mono flex flex-wrap gap-x-4 gap-y-2 text-[10.5px] text-rd-muted">
          {dateText && <span className="inline-flex items-center gap-1.5"><Calendar size={12} /> {dateText}</span>}
          {timeText && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> {timeText} IST</span>}
          {event.venue && <span className="inline-flex items-center gap-1.5"><MapPin size={12} /> {event.venue}</span>}
        </div>
        <h3 className="rd-display mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-medium text-rd-fg">{event.title}</h3>
        {event.description && <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-relaxed text-rd-muted">{event.description}</p>}
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-rd-fg px-5 py-2.5 text-sm font-semibold text-rd-bg">
          {open ? 'Register now' : 'View event'}
          <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:rotate-45" />
        </span>
      </div>
    </Link>
  );
}

interface TrackItem {
  key: string;
  title: string;
  category?: string;
  dateLabel?: string;
  image?: string | null;
  to?: string;
}

function PastTrack({ items }: { items: TrackItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [limit, setLimit] = useState(0);
  useEffect(() => {
    const measure = () => {
      if (trackRef.current && viewRef.current) setLimit(Math.max(0, trackRef.current.scrollWidth - viewRef.current.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewRef.current) ro.observe(viewRef.current);
    return () => ro.disconnect();
  }, [items.length]);

  return (
    <div ref={viewRef} className="overflow-hidden">
      <motion.div
        ref={trackRef}
        drag="x"
        dragConstraints={{ left: -limit, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => { dragging.current = true; }}
        // Let the click that ends a drag pass before links work again.
        onDragEnd={() => { setTimeout(() => { dragging.current = false; }, 0); }}
        className="flex w-max cursor-grab gap-4 active:cursor-grabbing"
      >
        {items.map((p, i) => {
          const body = (
            <>
              <div className="pointer-events-none relative aspect-[4/3] overflow-hidden">
                <SafeImage src={p.image} fallbackIndex={i} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
                {p.category && (
                  <span className="rd-mono absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[9.5px] text-white backdrop-blur-md">{p.category}</span>
                )}
              </div>
              <div className="p-4">
                <div className="rd-mono text-[10px] text-rd-faint">{p.dateLabel || 'Past event'}</div>
                <div className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-rd-fg">{p.title}</div>
              </div>
            </>
          );
          return (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.6, ease: EASE }}
              className="group w-[250px] shrink-0 overflow-hidden rounded-[20px] border border-rd-line bg-rd-card sm:w-[280px]"
            >
              {p.to ? (
                <Link
                  to={p.to}
                  draggable={false}
                  onClick={e => { if (dragging.current) e.preventDefault(); }}
                  className="block"
                >
                  {body}
                </Link>
              ) : body}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

const eventDateLabel = (d?: string) => {
  if (!d) return undefined;
  const date = new Date(d);
  return Number.isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

function HomeEvents() {
  const { data: evData } = useApi<{ events: ClubEvent[] }>('events', '/api/events?limit=50');
  const { data: past = [] } = useApi<PastEvent[]>('past-events', '/api/past-events');
  const events = evData?.events || [];
  const live = events.find(e => e.status === 'registration_open') || events.find(e => e.status === 'upcoming');
  const recent = [...events]
    .filter(e => e.event_start_date)
    .sort((a, b) => (b.event_start_date || '').localeCompare(a.event_start_date || ''))[0];
  const featured = live || recent;

  // Events from Admin → Events come first (newest first, minus the featured one),
  // then the Past Events & Achievements entries.
  const trackItems: TrackItem[] = [
    ...[...events]
      .filter(e => e.id !== featured?.id)
      .sort((a, b) => (b.event_start_date || '').localeCompare(a.event_start_date || ''))
      .map(e => ({
        key: `event-${e.id}`,
        title: e.title,
        category: e.category,
        dateLabel: eventDateLabel(e.event_start_date),
        image: e.banner,
        to: `/events/${e.id}`,
      })),
    ...past.map(p => ({
      key: `past-${p.id}`,
      title: p.title,
      category: p.category,
      dateLabel: p.date_label,
      image: p.image_url,
    })),
  ];

  return (
    <section id="events" className="relative scroll-mt-16 border-t border-rd-line py-24 sm:py-32">
      <Container>
        <SectionHead
          index="03"
          label="Events"
          lines={['Show up. Build something.', 'Leave with more.']}
          aside="Buildathons, talks and workshops through the year. Registrations open right here."
          cta={<PillLink to="/events">All events</PillLink>}
        />
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Reveal>
            {featured ? (
              <FeaturedEvent event={featured} />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-start justify-end rounded-[26px] border border-dashed border-rd-line p-8">
                <div className="rd-mono text-[10.5px] text-rd-faint">Nothing live right now</div>
                <p className="mt-2 max-w-sm text-sm text-rd-muted">The next event will appear here the moment registrations open.</p>
              </div>
            )}
          </Reveal>
          <Reveal delay={0.1} className="flex min-w-0 flex-col justify-between gap-6 rounded-[26px] border border-rd-line bg-rd-bg2 p-6 sm:p-8">
            <div>
              <div className="rd-mono flex items-center justify-between text-[10.5px] text-rd-faint">
                <span>Recently</span>
                <span className="inline-flex items-center gap-1.5"><MoveHorizontal size={12} /> Drag</span>
              </div>
              <div className="rd-display mt-3 text-4xl font-medium text-rd-fg">{events.length + past.length}+ events</div>
              <p className="mt-2 text-sm text-rd-muted">From Kaggle contests to a BlackRock speaker session.</p>
            </div>
            <div className="-mx-6 pl-6 sm:-mx-8 sm:pl-8">
              <PastTrack items={trackItems} />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ─── 04 · Projects ─────────────────────────────────────────────────────── */

interface Project {
  id: number;
  title: string;
  author?: string | null;
  description?: string;
  tags?: string | string[] | null;
  github_link?: string | null;
  contributors?: string | null;
}

const parseTags = (t: Project['tags']): string[] => {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  try {
    const v = JSON.parse(t);
    return Array.isArray(v) ? v : [];
  } catch {
    return t.split(',').map(s => s.trim()).filter(Boolean);
  }
};

function HomeProjects() {
  const { theme } = useTheme();
  const { data: projects = [] } = useApi<Project[]>('projects', '/api/projects');
  const list = projects.slice(0, 7);
  const sectionRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28 });
  const sy = useSpring(y, { stiffness: 260, damping: 28 });
  const active = hovered !== null ? list[hovered] : null;
  const previewRef = useRef<HTMLDivElement>(null);
  // Viewport-positioned so the section's overflow can't clip it; flips to stay on screen.
  const follow = (e: { clientX: number; clientY: number }) => {
    const w = previewRef.current?.offsetWidth ?? 300;
    const h = previewRef.current?.offsetHeight ?? 220;
    const gap = 24;
    let nx = e.clientX + gap;
    let ny = e.clientY + gap;
    if (nx + w > window.innerWidth - 12) nx = e.clientX - w - gap;
    if (ny + h > window.innerHeight - 12) ny = e.clientY - h - gap;
    x.set(Math.max(12, nx));
    y.set(Math.max(12, ny));
  };

  return (
    <section
      ref={sectionRef}
      id="projects"
      className="relative scroll-mt-16 overflow-hidden border-t border-rd-line py-24 sm:py-32"
      onPointerMove={follow}
    >
      {/* ASCII gradient banner behind the heading */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-70"
        style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent)', maskImage: 'linear-gradient(to bottom, #000 30%, transparent)' }}
      >
        <GradientASCII
          key={theme}
          colors={theme === 'dark' ? ['#09090b', '#3d6bff', '#9a6bff', '#ff4be0', '#22e0ff'] : ['#f7f6f2', '#7aa0ff', '#b79bff', '#ff9fe8', '#7fe6ff']}
          shape="horizon"
          cellSize={16}
          lightMode={theme === 'light'}
          mouseInteraction={false}
          clickEffect="none"
          gradientOpacity={0.55}
          glyphOpacity={0.75}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{ background: 'linear-gradient(100deg, hsl(var(--rd-bg) / 0.8) 0%, hsl(var(--rd-bg) / 0.35) 55%, hsl(var(--rd-bg) / 0.7) 100%)' }}
      />

      <Container>
        <SectionHead
          index="04"
          label="Projects"
          lines={['Things we built', 'and shipped.']}
          aside={`${projects.length || '—'} projects from club members.`}
          cta={<PillLink to="/projects">All projects</PillLink>}
        />

        <ul className="border-t border-rd-line" onPointerLeave={() => setHovered(null)}>
          {list.map((p, i) => {
            const tags = parseTags(p.tags);
            const href = p.github_link || '/projects';
            const external = Boolean(p.github_link);
            const color = SPECTRUM[i % SPECTRUM.length];
            const Row = (
              <motion.div
                className="relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 overflow-hidden py-6 sm:grid-cols-[3.5rem_1.4fr_1fr_auto] sm:py-7"
                onPointerEnter={e => {
                  follow(e);
                  setHovered(i);
                }}
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 origin-left"
                  style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 14%, transparent), transparent 70%)` }}
                  initial={false}
                  animate={{ scaleX: hovered === i ? 1 : 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                />
                <span className="rd-mono relative text-[11px] text-rd-faint">{String(i + 1).padStart(2, '0')}</span>
                <motion.span
                  className="rd-display relative truncate text-xl font-medium text-rd-fg sm:text-[1.7rem]"
                  animate={{ x: hovered === i ? 12 : 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  {p.title}
                </motion.span>
                <span className="relative hidden flex-wrap gap-1.5 sm:flex">
                  {tags.slice(0, 2).map(t => (
                    <span key={t} className="rd-mono rounded-full border border-rd-line px-2.5 py-1 text-[9.5px] text-rd-muted">{t}</span>
                  ))}
                  {p.author && <span className="rd-mono px-1 py-1 text-[9.5px] text-rd-faint">by {p.author}</span>}
                </span>
                <span
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-rd-line text-rd-muted transition-colors"
                  style={hovered === i ? { background: color, borderColor: color, color: '#fff' } : undefined}
                >
                  {external ? <Github size={16} /> : <ArrowUpRight size={16} />}
                </span>
              </motion.div>
            );
            return (
              <li key={p.id} className="border-b border-rd-line">
                {external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="block">{Row}</a>
                ) : (
                  <Link to={href} className="block">{Row}</Link>
                )}
              </li>
            );
          })}
          {list.length === 0 &&
            [0, 1, 2, 3].map(i => <li key={i} className="rd-skeleton my-3 h-14 rounded-xl" />)}
        </ul>
      </Container>

      {/* Cursor-following preview (pointer devices only) */}
      <AnimatePresence>
        {active && (
          <motion.div
            key="preview"
            ref={previewRef}
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-40 hidden w-[300px] rounded-2xl border border-rd-line bg-rd-card/95 p-5 shadow-2xl backdrop-blur-xl [@media(pointer:fine)]:block"
            style={{ x: sx, y: sy }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rd-mono text-[10px] text-rd-faint">{active.author ? `by ${active.author}` : 'Club project'}</div>
            <div className="mt-2 text-base font-semibold text-rd-fg">{active.title}</div>
            <p className="mt-2 line-clamp-5 text-[13px] leading-relaxed text-rd-muted">{active.description || 'No description yet.'}</p>
            {active.contributors && <div className="rd-mono mt-3 line-clamp-1 text-[9.5px] text-rd-faint">With {active.contributors}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ─── 05 · Team ─────────────────────────────────────────────────────────── */

interface Member {
  id: number;
  name: string;
  role?: string;
  photo?: string | null;
}

function MemberChip({ m, i }: { m: Member; i: number }) {
  const [failed, setFailed] = useState(false);
  const initials = m.name.split(' ').map(s => s[0]).slice(0, 2).join('');
  const color = SPECTRUM[i % SPECTRUM.length];
  return (
    <div className="group mx-2 flex shrink-0 items-center gap-3 rounded-full border border-rd-line bg-rd-card py-2 pl-2 pr-5 transition-all duration-300 hover:-translate-y-1 hover:border-rd-fg/25">
      {m.photo && !failed ? (
        <img src={normalizeBannerUrl(m.photo)} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className="h-11 w-11 rounded-full object-cover grayscale transition duration-500 group-hover:grayscale-0" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: color }}>
          {initials}
        </span>
      )}
      <span className="flex flex-col">
        <span className="whitespace-nowrap text-sm font-semibold text-rd-fg">{m.name}</span>
        <span className="rd-mono whitespace-nowrap text-[9.5px] text-rd-faint transition-colors" style={{ color: undefined }}>
          {m.role || 'Member'}
        </span>
      </span>
    </div>
  );
}

function HomeTeam() {
  const { data: members = [] } = useApi<Member[]>('members', '/api/members');
  const half = Math.ceil(members.length / 2);
  const rows = [members.slice(0, half), members.slice(half)];

  return (
    <section id="team" className="relative scroll-mt-16 overflow-hidden border-t border-rd-line py-24 sm:py-32">
      <Container>
        <SectionHead
          index="05"
          label="Team"
          lines={['The people', 'behind it all.']}
          aside={`${members.length || '—'} students who keep the sessions running every week.`}
          cta={<PillLink to="/team">Meet the team</PillLink>}
        />
      </Container>
      <div className="space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        {rows.map((row, r) =>
          row.length ? (
            <Marquee key={r} duration={50 + r * 10} reverse={r === 1}>
              {row.map((m, i) => (
                <MemberChip key={m.id} m={m} i={i + r * half} />
              ))}
            </Marquee>
          ) : null,
        )}
        {members.length === 0 && (
          <div className="flex gap-4 px-8">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="rd-skeleton h-[60px] w-56 rounded-full" />)}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── 06 · Learning paths (horizontal scroll) ───────────────────────────── */

const PATHS = [
  { key: 'ML', title: 'Machine Learning', sub: 'End-to-end ML workflow', slug: 'ml' },
  { key: 'DL', title: 'Deep Learning', sub: 'Neural nets & architectures', slug: 'dl' },
  { key: 'RL', title: 'Reinforcement Learning', sub: 'Agents & environments', slug: 'rl' },
  { key: 'NLP', title: 'Natural Language Processing', sub: 'Text & language', slug: 'nlp' },
  { key: 'TRANSFORMER', title: 'Transformers', sub: 'Attention, end to end', slug: 'transformers' },
  { key: 'GENAI', title: 'Generative AI', sub: 'Foundation models & RAG', slug: 'genai' },
  { key: 'LLM', title: 'Large Language Models', sub: 'Training to inference', slug: 'llm' },
  { key: 'AGENTIC', title: 'Agentic AI', sub: 'Tools, memory, multi-agent', slug: 'agentic-ai' },
];

interface Phase {
  roadmap_type: string;
  phase: string | number;
  title: string;
  order_no: number;
}

function PathCard({ p, i, phases }: { p: (typeof PATHS)[number]; i: number; phases: Phase[] }) {
  const color = SPECTRUM[i % SPECTRUM.length];
  return (
    <Link
      to={`/roadmaps/${p.slug}`}
      className="group relative flex h-[420px] w-[300px] shrink-0 flex-col overflow-hidden rounded-[26px] border border-rd-line bg-rd-card p-7 transition-colors hover:border-rd-fg/25 sm:w-[340px]"
    >
      <div
        aria-hidden
        className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: color }}
      />
      <div className="relative flex items-start justify-between">
        <span className="rd-display text-6xl font-medium" style={{ color }}>{String(i + 1).padStart(2, '0')}</span>
        <span className="rd-mono rounded-full border border-rd-line px-2.5 py-1 text-[9.5px] text-rd-muted">{phases.length || '—'} phases</span>
      </div>
      <div className="relative mt-auto">
        <h3 className="rd-display text-2xl font-medium text-rd-fg">{p.title}</h3>
        <div className="rd-mono mt-1 text-[10px] text-rd-faint">{p.sub}</div>
        <ol className="mt-5 space-y-1.5 border-t border-rd-line pt-4">
          {phases.slice(0, 3).map(ph => (
            <li key={`${ph.phase}-${ph.order_no}`} className="flex gap-3 text-sm text-rd-muted">
              <span className="rd-mono shrink-0 text-[10px] leading-5 text-rd-faint">{String(ph.phase).replace(/^phase\s*/i, 'P')}</span>
              <span className="truncate">{ph.title}</span>
            </li>
          ))}
        </ol>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-rd-fg">
          Explore path <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function HomeRoadmaps() {
  const { data: phases = [] } = useApi<Phase[]>('roadmaps', '/api/roadmaps');
  const byType = useMemo(() => {
    const m: Record<string, Phase[]> = {};
    phases.forEach(p => (m[p.roadmap_type] ||= []).push(p));
    Object.values(m).forEach(list => list.sort((a, b) => a.order_no - b.order_no));
    return m;
  }, [phases]);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0.05, 0.95], [0, 1]);

  useEffect(() => {
    const measure = () => {
      const t = trackRef.current;
      if (t) setDistance(Math.max(0, t.scrollWidth - window.innerWidth + 48));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phases.length]);

  const cards = (
    <>
      {PATHS.map((p, i) => (
        <PathCard key={p.key} p={p} i={i} phases={byType[p.key] || []} />
      ))}
      <div className="flex h-[420px] w-[300px] shrink-0 flex-col justify-between rounded-[26px] border border-dashed border-rd-line p-7 sm:w-[340px]">
        <div className="rd-mono text-[10.5px] text-rd-faint">Keep going</div>
        <div className="space-y-3">
          <Link to="/resources" className="group flex items-center justify-between rounded-2xl border border-rd-line p-4 text-rd-fg transition-colors hover:border-rd-fg/30">
            <span><span className="block font-semibold">Resources</span><span className="text-sm text-rd-muted">Courses, papers, books</span></span>
            <ArrowUpRight size={18} className="transition-transform group-hover:rotate-45" />
          </Link>
          <Link to="/curriculum" className="group flex items-center justify-between rounded-2xl border border-rd-line p-4 text-rd-fg transition-colors hover:border-rd-fg/30">
            <span><span className="block font-semibold">Curriculum tracker</span><span className="text-sm text-rd-muted">Tick off what you learn</span></span>
            <ArrowUpRight size={18} className="transition-transform group-hover:rotate-45" />
          </Link>
        </div>
      </div>
    </>
  );

  const head = (
    <Container className="mb-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionLabel index="06">Learning paths</SectionLabel>
          <h2 className="rd-display mt-6 text-[clamp(2rem,4.4vw,3.6rem)] font-medium text-rd-fg">
            <SplitWords lines={['Eight roads', 'into AI.']} onView stagger={0.05} />
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-rd-muted">
          Structured roadmaps from your first regression to multi-agent systems, phase by phase.
        </p>
      </div>
    </Container>
  );

  if (reduce) {
    return (
      <section id="roadmap" className="border-t border-rd-line py-24">
        {head}
        <div className="flex gap-4 overflow-x-auto px-5 pb-4 sm:px-8">{cards}</div>
      </section>
    );
  }

  return (
    <div id="roadmap" className="scroll-mt-16">
      {/* Phones and tablets: native swipe row */}
      <section className="border-t border-rd-line py-24 lg:hidden">
        {head}
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8 [&>*]:snap-start">{cards}</div>
      </section>
      {/* Desktop: vertical scroll drives the track sideways */}
      <section ref={sectionRef} className="relative hidden h-[260vh] border-t border-rd-line lg:block">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          {head}
          <motion.div ref={trackRef} style={{ x }} className="flex w-max gap-5 pl-[max(2rem,calc((100vw-1200px)/2+2rem))]">
            {cards}
          </motion.div>
          <Container className="mt-10">
            <div className="h-px w-full overflow-hidden bg-rd-line">
              <motion.div className="h-full origin-left" style={{ scaleX: bar, background: 'var(--rd-spectrum)' }} />
            </div>
          </Container>
        </div>
      </section>
    </div>
  );
}

export default function HomeSections() {
  return (
    <div className="rd-root relative">
      <HomeEvents />
      <HomeProjects />
      <HomeTeam />
      <HomeRoadmaps />
    </div>
  );
}
