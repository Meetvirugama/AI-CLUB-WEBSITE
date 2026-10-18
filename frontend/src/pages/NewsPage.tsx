import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowUpRight, Check, ExternalLink, LayoutGrid, Link2, List, Newspaper, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import SlicedWaves from '@/components/reactbits/SlicedWaves';
import { useTheme } from '@/components/redesign/theme';
import Footer from '@/components/redesign/SiteFooter';
import { getApiUrl } from '@/lib/api';
import { api } from '@/lib/apiClient';
import { normalizeBannerUrl } from '@/lib/utils';
import { Marquee, Reveal, SectionLabel, SplitWords } from '@/components/redesign/motion';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';

interface NewsModel {
  id: number;
  title?: string;
  description?: string;
  link?: string;
  sources?: string;
  image_url?: string;
  created_at: string;
}

const ACCENTS = ['var(--rd-violet)', 'var(--rd-cyan)', 'var(--rd-orange)', 'var(--rd-magenta)', 'var(--rd-green)', 'var(--rd-blue)'];

const formatDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' });

const readMinutes = (n: NewsModel) => Math.max(1, Math.round((n.description || '').split(/\s+/).length / 200));
const isNew = (n: NewsModel) => Date.now() - new Date(n.created_at).getTime() < 30 * 86_400_000;

const sourceList = (n: NewsModel) =>
  (n.sources || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/* ─── Visuals ───────────────────────────────────────────────────────────── */

function DotPlaceholder({ accent }: { accent: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-rd-bg2">
      <div
        aria-hidden
        className="rd-spectrum-bg absolute inset-0 opacity-80"
        style={{
          WebkitMaskImage: 'radial-gradient(circle, #000 2.2px, transparent 2.6px), radial-gradient(ellipse 55% 50% at 50% 50%, transparent 30%, #000 90%)',
          WebkitMaskSize: '12px 12px, 100% 100%',
          WebkitMaskComposite: 'source-in',
          maskImage: 'radial-gradient(circle, #000 2.2px, transparent 2.6px), radial-gradient(ellipse 55% 50% at 50% 50%, transparent 30%, #000 90%)',
          maskSize: '12px 12px, 100% 100%',
          maskComposite: 'intersect',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Newspaper size={34} style={{ color: accent }} />
      </div>
    </div>
  );
}

function StoryImage({ item, accent, className = '' }: { item: NewsModel; accent: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!item.image_url || failed) return <DotPlaceholder accent={accent} />;
  return (
    <img
      src={normalizeBannerUrl(item.image_url)}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${className}`}
    />
  );
}

/** Tilts toward the cursor and lights up beneath it. */
function TiltCard({ children, accent, onOpen, label }: { children: ReactNode; accent: string; onOpen: () => void; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (reduce || e.pointerType !== 'mouse') return;
    ry.set((px - 0.5) * 6);
    rx.set(-(py - 0.5) * 6);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onOpen}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-label={label}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      className="group relative block h-full w-full overflow-hidden rounded-[24px] border border-rd-line bg-rd-card text-left transition-colors hover:border-rd-fg/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-rd-accent"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(500px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, ${accent} 12%, transparent), transparent 65%)` }}
      />
      {children}
      <span
        aria-hidden
        className="rd-mono pointer-events-none absolute z-20 hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 scale-0 items-center justify-center rounded-full text-[10px] text-white opacity-0 transition-[transform,opacity] duration-300 group-hover:scale-100 group-hover:opacity-100 [@media(pointer:fine)]:flex"
        style={{ left: 'var(--mx, 50%)', top: 'var(--my, 50%)', background: accent }}
      >
        Read ↗
      </span>
    </motion.button>
  );
}

function ReadMore({ accent }: { accent: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rd-fg">
      Read story
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45"
        style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
      >
        <ArrowUpRight size={14} />
      </span>
    </span>
  );
}

/* ─── Cards ─────────────────────────────────────────────────────────────── */

function FeaturedStory({ item, onOpen }: { item: NewsModel; onOpen: () => void }) {
  const accent = ACCENTS[0];
  return (
    <Reveal>
      <TiltCard accent={accent} onOpen={onOpen} label={`Read: ${item.title || 'Untitled story'}`}>
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[440px]">
            <StoryImage item={item} accent={accent} />
            <span className="rd-mono absolute left-4 top-4 z-10 rounded-full bg-black/55 px-3 py-1.5 text-[10px] text-white backdrop-blur-md">
              Featured
            </span>
            {isNew(item) && <NewBadge />}
          </div>
          <div className="relative flex flex-col p-7 sm:p-10">
            <div className="rd-mono flex flex-wrap items-center gap-2 text-[10.5px] text-rd-faint">
              <span>{formatDate(item.created_at, true)}</span>
              <span>· {readMinutes(item)} min read</span>
              {sourceList(item).slice(0, 2).map(s => (
                <span key={s}>· {s}</span>
              ))}
            </div>
            <h2 className="rd-display mt-5 line-clamp-4 text-[clamp(1.6rem,3vw,2.6rem)] font-medium text-rd-fg">{item.title || 'Untitled story'}</h2>
            {item.description && <p className="mt-5 line-clamp-4 text-[15px] leading-relaxed text-rd-muted">{item.description}</p>}
            <div className="mt-auto pt-8">
              <ReadMore accent={accent} />
            </div>
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

function StoryCard({ item, index, onOpen }: { item: NewsModel; index: number; onOpen: () => void }) {
  const accent = ACCENTS[(index + 1) % ACCENTS.length];
  return (
    <Reveal delay={(index % 3) * 0.08} className="h-full">
      <TiltCard accent={accent} onOpen={onOpen} label={`Read: ${item.title || 'Untitled story'}`}>
        <div className="flex h-full flex-col">
          <div className="relative aspect-[16/10] overflow-hidden">
            <StoryImage item={item} accent={accent} />
            {isNew(item) && <NewBadge />}
          </div>
          <div className="flex flex-1 flex-col p-6">
            <div className="rd-mono flex items-center justify-between text-[10px] text-rd-faint">
              <span>{formatDate(item.created_at)} · {readMinutes(item)} min</span>
              <span>{String(index + 2).padStart(2, '0')}</span>
            </div>
            <h3 className="rd-display mt-4 line-clamp-3 text-xl font-medium text-rd-fg">{item.title || 'Untitled story'}</h3>
            {item.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-rd-muted">{item.description}</p>}
            <div className="mt-auto pt-6">
              <ReadMore accent={accent} />
            </div>
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
}

function NewBadge() {
  return (
    <span className="rd-mono absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] text-white" style={{ background: 'var(--rd-magenta)' }}>
      <span className="rd-live-dot relative h-1.5 w-1.5 rounded-full bg-white" /> New
    </span>
  );
}

/** Index-style row: big title, metadata, and a thumbnail that slides in on hover. */
function StoryRow({ item, index, onOpen }: { item: NewsModel; index: number; onOpen: () => void }) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <motion.li layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="border-b border-rd-line">
      <button type="button" onClick={onOpen} className="group grid w-full grid-cols-[1fr_auto] items-center gap-6 py-7 text-left sm:grid-cols-[8rem_1fr_auto]">
        <span className="rd-mono hidden text-[10.5px] text-rd-faint sm:block">{formatDate(item.created_at)}</span>
        <span className="min-w-0">
          <span className="rd-display block text-[clamp(1.3rem,2.6vw,2rem)] font-medium leading-tight text-rd-fg transition-transform duration-300 group-hover:translate-x-2">
            {item.title || 'Untitled story'}
          </span>
          <span className="rd-mono mt-2 flex flex-wrap gap-x-3 text-[10px] text-rd-faint">
            <span className="sm:hidden">{formatDate(item.created_at)}</span>
            <span>{readMinutes(item)} min read</span>
            {isNew(item) && <span style={{ color: 'var(--rd-magenta)' }}>● New</span>}
          </span>
        </span>
        <span className="relative flex items-center gap-4">
          <span className="relative hidden h-16 w-0 overflow-hidden rounded-xl transition-all duration-500 ease-out group-hover:w-28 md:block">
            <StoryImage item={item} accent={accent} />
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-rd-line text-rd-muted transition-all duration-300 group-hover:rotate-45 group-hover:border-transparent group-hover:bg-[var(--row-accent)] group-hover:text-white" style={{ ['--row-accent' as string]: accent }}>
            <ArrowUpRight size={17} />
          </span>
        </span>
      </button>
    </motion.li>
  );
}

/* ─── Reader ────────────────────────────────────────────────────────────── */

function StoryReader({ item, onClose }: { item: NewsModel; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('story', String(item.id));
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address bar already holds the link */
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const sources = sourceList(item);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <motion.article
        role="dialog"
        aria-modal="true"
        aria-label={item.title || 'News story'}
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="rd-root relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] border border-rd-line bg-rd-card sm:rounded-[28px]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close story"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-transform hover:rotate-90"
        >
          <X size={18} />
        </button>
        <div className="absolute inset-x-0 top-0 z-20 h-1 bg-transparent">
          <div className="h-full origin-left" style={{ transform: `scaleX(${progress})`, background: 'var(--rd-spectrum)' }} />
        </div>
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          onScroll={e => {
            const el = e.currentTarget;
            const max = el.scrollHeight - el.clientHeight;
            setProgress(max > 0 ? el.scrollTop / max : 1);
          }}
        >
          {item.image_url && !imgFailed && (
            <div className="relative h-[38vh] overflow-hidden bg-rd-bg2">
              <img src={normalizeBannerUrl(item.image_url)} alt="" referrerPolicy="no-referrer" onError={() => setImgFailed(true)} className="h-full w-full object-cover object-center" />
            </div>
          )}
          <div className="p-7 sm:p-10">
            <div className="rd-mono flex flex-wrap items-center justify-between gap-3 text-[10.5px] text-rd-faint">
              <span>{formatDate(item.created_at, true)} · {readMinutes(item)} min read</span>
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-full border border-rd-line px-3 py-1.5 text-rd-muted transition-colors hover:text-rd-fg">
                {copied ? <Check size={12} style={{ color: 'var(--rd-green)' }} /> : <Link2 size={12} />}
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
            <h2 className="rd-display mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] font-medium text-rd-fg">{item.title || 'Untitled story'}</h2>
            {item.description ? (
              <p className="mt-6 whitespace-pre-line text-[15px] leading-[1.75] text-rd-muted">{item.description}</p>
            ) : (
              <p className="mt-6 text-sm italic text-rd-faint">No additional details provided.</p>
            )}
            {sources.length > 0 && (
              <div className="mt-8 border-t border-rd-line pt-6">
                <div className="rd-mono text-[10px] text-rd-faint">Sources & references</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sources.map(s => (
                    <span key={s} className="rounded-full border border-rd-line px-3 py-1 text-xs text-rd-muted">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {item.link && (
          <div className="border-t border-rd-line p-5 sm:px-10">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rd-fg px-6 py-3.5 text-sm font-semibold text-rd-bg transition-transform active:scale-[0.98] sm:w-auto"
            >
              Read the full article <ExternalLink size={15} />
            </a>
          </div>
        )}
      </motion.article>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

const NewsPage = () => {
  const [newsList, setNewsList] = useState<NewsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [selected, setSelected] = useState<NewsModel | null>(null);
  const [source, setSource] = useState('All');
  const [params, setParams] = useSearchParams();
  const { theme } = useTheme();
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem('news-view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const changeView = (v: 'grid' | 'list') => {
    setView(v);
    try {
      localStorage.setItem('news-view', v);
    } catch {
      /* preference just won't persist */
    }
  };

  const openStory = useCallback(
    (n: NewsModel) => {
      setSelected(n);
      setParams(p => {
        p.set('story', String(n.id));
        return p;
      }, { replace: true });
    },
    [setParams],
  );
  const closeReader = useCallback(() => {
    setSelected(null);
    setParams(p => {
      p.delete('story');
      return p;
    }, { replace: true });
  }, [setParams]);

  // Open a shared link (?story=ID) once the stories have loaded.
  useEffect(() => {
    const id = Number(params.get('story'));
    if (!id || selected || !newsList.length) return;
    const match = newsList.find(n => n.id === id);
    if (match) setSelected(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsList]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<NewsModel[]>('/api/news');
      setNewsList(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    newsList.forEach(n => sourceList(n).forEach(s => set.add(s)));
    return ['All', ...Array.from(set)];
  }, [newsList]);

  const visible = useMemo(
    () => (source === 'All' ? newsList : newsList.filter(n => sourceList(n).includes(source))),
    [newsList, source],
  );
  const [featured, ...rest] = visible;

  return (
    <div className="rd-root relative min-h-screen overflow-x-clip">
      {/* Headline ticker */}
      {newsList.length > 0 && (
        <div className="border-b border-rd-line bg-rd-bg2 pt-12">
          <Marquee duration={Math.max(30, newsList.length * 18)} className="py-3">
            {[...newsList, ...newsList].map((n, i) => (
              <button
                key={`${n.id}-${i}`}
                type="button"
                onClick={() => openStory(n)}
                className="flex items-center gap-3 whitespace-nowrap px-7 text-[13px] font-medium text-rd-fg/90 transition-colors hover:text-rd-fg"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ACCENTS[i % ACCENTS.length] }} />
                {n.title || 'Untitled story'}
              </button>
            ))}
          </Marquee>
        </div>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-60"
        style={{ WebkitMaskImage: 'linear-gradient(to bottom, #000 35%, transparent)', maskImage: 'linear-gradient(to bottom, #000 35%, transparent)' }}
      >
        <SlicedWaves
          key={theme}
          color1={theme === 'dark' ? '#ff9a2e' : '#f06a00'}
          color2={theme === 'dark' ? '#ff4be0' : '#d41cad'}
          color3={theme === 'dark' ? '#3d6bff' : '#1f4bff'}
          lightMode={theme === 'light'}
          position={0.55}
          ribbons={4}
        />
      </div>
      {/* Readability wash: keeps the small header text legible over the ribbons. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{ background: 'linear-gradient(100deg, hsl(var(--rd-bg) / 0.92) 0%, hsl(var(--rd-bg) / 0.55) 45%, hsl(var(--rd-bg) / 0.88) 70%, hsl(var(--rd-bg) / 0.6) 100%), linear-gradient(to bottom, transparent 55%, hsl(var(--rd-bg)))' }}
      />

      <main className={`relative mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-8 ${newsList.length > 0 ? 'pt-14 sm:pt-20' : 'pt-28 sm:pt-32'}`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel index="NW">The dispatch</SectionLabel>
            <h1 className="rd-display mt-6 text-[clamp(2.4rem,5.4vw,4.6rem)] font-medium text-rd-fg">
              <SplitWords lines={['News from the club', 'and the AI frontier.']} delay={0.1} />
            </h1>
          </div>
          <Reveal delay={0.4} className="max-w-sm">
            <p className="text-[15px] leading-relaxed text-rd-fg/85">Club milestones, speaker sessions and the AI breakthroughs worth your time.</p>
            {!loading && (
              <div className="rd-mono mt-4 text-[10.5px] text-rd-muted">
                {String(newsList.length).padStart(2, '0')} {newsList.length === 1 ? 'story' : 'stories'}
              </div>
            )}
          </Reveal>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="rd-mono text-[10.5px] text-rd-muted">{visible.length} shown</div>
          <div className="flex rounded-full border border-rd-line bg-rd-bg/70 p-1 backdrop-blur-md">
            {(['grid', 'list'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => changeView(v)}
                aria-pressed={view === v}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${view === v ? 'text-rd-bg' : 'text-rd-muted hover:text-rd-fg'}`}
              >
                {view === v && <motion.span layoutId="news-view" className="absolute inset-0 rounded-full bg-rd-fg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <span className="relative inline-flex items-center gap-1.5">
                  {v === 'grid' ? <LayoutGrid size={13} /> : <List size={13} />} {v === 'grid' ? 'Grid' : 'Index'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {sources.length > 2 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {sources.map(s => {
              const active = s === source;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={`relative rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? 'text-rd-bg' : 'border border-rd-line text-rd-muted hover:text-rd-fg'}`}
                >
                  {active && <motion.span layoutId="news-source" className="absolute inset-0 rounded-full bg-rd-fg" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{s}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-10">
          {loading ? (
            <div className="space-y-6">
              <div className="rd-skeleton h-[440px] rounded-[24px]" />
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="rd-skeleton h-80 rounded-[24px]" />
                ))}
              </div>
            </div>
          ) : error ? (
            <ErrorState
              error={error}
              onRetry={fetchNews}
              className="my-16"
            />
          ) : !featured ? (
            <EmptyState
              title="No stories yet"
              description="Check back soon for club updates and AI news."
              icon={Newspaper}
              className="my-16"
            />
          ) : view === 'list' ? (
            <ul className="border-t border-rd-line">
              {visible.map((item, i) => (
                <StoryRow key={item.id} item={item} index={i} onOpen={() => openStory(item)} />
              ))}
            </ul>
          ) : (
            <div className="space-y-6">
              <FeaturedStory item={featured} onOpen={() => openStory(featured)} />
              {rest.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((item, i) => (
                    <StoryCard key={item.id} item={item} index={i} onOpen={() => openStory(item)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>{selected && <StoryReader item={selected} onClose={closeReader} />}</AnimatePresence>

      <Footer short />
    </div>
  );
};

export default NewsPage;
