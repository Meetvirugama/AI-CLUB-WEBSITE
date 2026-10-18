import { useEffect, useMemo, useRef, useState } from "react";
import {
  useWeeklyVenezaData,
  useWeeklyVenezaProgress,
  useToggleWeeklyProgress,
  useResetWeeklyProgress,
  WeeklyVenezaWeek,
  WeeklyResource,
} from "@/hooks/useWeeklyVeneza";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Code,
  FileText,
  GraduationCap,
  Layers,
  Newspaper,
  RotateCcw,
  Search,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import Footer from "@/components/redesign/SiteFooter";
import { CountUp, Crosshair, Reveal, SectionLabel, SplitWords } from "@/components/redesign/motion";
import { useTheme } from "@/components/redesign/theme";
import GradientASCII from "@/components/reactbits/GradientASCII";

const LOCAL_KEY = "weekly_veneza_local_progress";
const EASE = [0.22, 1, 0.36, 1] as const;
const SPECTRUM = ["var(--rd-blue)", "var(--rd-cyan)", "var(--rd-green)", "var(--rd-yellow)", "var(--rd-orange)", "var(--rd-red)", "var(--rd-magenta)", "var(--rd-violet)"];

const TYPE_DETAILS: Record<string, { icon: typeof Video; color: string; label: string }> = {
  VIDEO: { icon: Video, color: "var(--rd-red)", label: "Video" },
  COURSE: { icon: GraduationCap, color: "var(--rd-orange)", label: "Course" },
  BOOK: { icon: BookOpen, color: "var(--rd-green)", label: "Book" },
  PAPER: { icon: FileText, color: "var(--rd-blue)", label: "Paper" },
  ARTICLE: { icon: Newspaper, color: "var(--rd-violet)", label: "Article" },
  CODE: { icon: Code, color: "var(--rd-cyan)", label: "Code" },
  DEFAULT: { icon: Layers, color: "var(--rd-magenta)", label: "Resource" },
};
const FILTERS = ["ALL", "VIDEO", "COURSE", "BOOK", "PAPER", "ARTICLE", "CODE"];

const typeOf = (r: WeeklyResource) => TYPE_DETAILS[r.resource_type.toUpperCase()] || TYPE_DETAILS.DEFAULT;
const pad = (n: number) => String(n).padStart(2, "0");

/* ─── Countdown ─────────────────────────────────────────────────────────── */

function useCountdown(targetDate?: string) {
  const target = useMemo(() => {
    if (targetDate) return new Date(targetDate);
    // Default: end of this week (Sunday 23:59:59)
    const t = new Date();
    t.setDate(t.getDate() + (7 - t.getDay()));
    t.setHours(23, 59, 59, 999);
    return t;
  }, [targetDate]);

  const compute = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      minutes: Math.floor((diff / 60_000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };
  const [left, setLeft] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setLeft(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return left;
}

function RollingDigits({ value }: { value: string }) {
  return (
    <span className="relative inline-flex overflow-hidden tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "-100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Countdown({ week }: { week?: WeeklyVenezaWeek }) {
  const t = useCountdown(week?.target_date);
  const parts = [
    { v: t.days, l: "Days" },
    { v: t.hours, l: "Hrs" },
    { v: t.minutes, l: "Min" },
    { v: t.seconds, l: "Sec" },
  ];
  return (
    <div className="rounded-[22px] border border-rd-line bg-rd-card p-5 sm:p-6">
      <div className="rd-mono flex items-center gap-2 text-[10.5px] text-rd-muted">
        <span className="rd-live-dot relative h-1.5 w-1.5 rounded-full bg-[var(--rd-green)]" />
        {week ? `Week ${pad(week.week_number)} closes in` : "This week closes in"}
      </div>
      <div className="mt-4 flex items-end gap-2 sm:gap-3">
        {parts.map((p, i) => (
          <div key={p.l} className="flex items-end gap-2 sm:gap-3">
            <div className="flex flex-col items-start">
              <span className="rd-display text-[clamp(2rem,4.2vw,3rem)] font-medium leading-none text-rd-fg">
                <RollingDigits value={pad(p.v)} />
              </span>
              <span className="rd-mono mt-2 text-[9.5px] text-rd-faint">{p.l}</span>
            </div>
            {i < parts.length - 1 && <span className="rd-display pb-6 text-2xl text-rd-faint">:</span>}
          </div>
        ))}
      </div>
      <WeekElapsed left={t} />
    </div>
  );
}

function WeekElapsed({ left }: { left: { days: number; hours: number; minutes: number; seconds: number } }) {
  const remaining = (((left.days * 24 + left.hours) * 60 + left.minutes) * 60 + left.seconds) * 1000;
  const pct = Math.min(1, Math.max(0, 1 - remaining / (7 * 86_400_000)));
  return (
    <div className="mt-5">
      <div className="h-1.5 overflow-hidden rounded-full bg-rd-line">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--rd-spectrum)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </div>
      <div className="rd-mono mt-2 flex justify-between text-[9.5px] text-rd-faint">
        <span>{Math.round(pct * 100)}% of the week gone</span>
        <span>Make it count</span>
      </div>
    </div>
  );
}

/* ─── Levels ────────────────────────────────────────────────────────────── */

const LEVELS = [
  { at: 0, name: "Novice" },
  { at: 120, name: "Learner" },
  { at: 360, name: "Builder" },
  { at: 720, name: "Practitioner" },
  { at: 1200, name: "Researcher" },
  { at: 1800, name: "Veneza Master" },
];

function LevelBadge({ minutes }: { minutes: number }) {
  const idx = LEVELS.reduce((acc, l, i) => (minutes >= l.at ? i : acc), 0);
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const pct = next ? (minutes - cur.at) / (next.at - cur.at) : 1;
  return (
    <div className="mt-4 w-full max-w-[220px]">
      <div className="flex items-center gap-2">
        <span className="rd-mono rounded-full px-2 py-0.5 text-[9.5px]" style={{ color: SPECTRUM[(idx * 2 + 7) % 8], background: `color-mix(in srgb, ${SPECTRUM[(idx * 2 + 7) % 8]} 14%, transparent)` }}>
          Lv {idx + 1}
        </span>
        <span className="text-sm font-semibold text-rd-fg">{cur.name}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-rd-line">
        <motion.div className="h-full rounded-full" style={{ background: SPECTRUM[(idx * 2 + 7) % 8] }} initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 1, ease: EASE }} />
      </div>
      <div className="rd-mono mt-1.5 text-[9px] text-rd-faint">{next ? `${next.at - minutes} XP to ${next.name}` : "Max level reached"}</div>
    </div>
  );
}

/* ─── Type mix ──────────────────────────────────────────────────────────── */

function TypeMix({ resources, progress }: { resources: WeeklyResource[]; progress: number[] }) {
  const groups = Object.entries(
    resources.reduce<Record<string, { total: number; done: number }>>((acc, r) => {
      const k = TYPE_DETAILS[r.resource_type.toUpperCase()] ? r.resource_type.toUpperCase() : "DEFAULT";
      acc[k] ||= { total: 0, done: 0 };
      acc[k].total++;
      if (progress.includes(r.id)) acc[k].done++;
      return acc;
    }, {}),
  );
  if (!groups.length) return null;
  return (
    <div className="border-b border-r border-rd-line p-6 sm:px-8 md:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rd-mono text-[10.5px] text-rd-faint">Resource mix</div>
        <div className="flex flex-wrap gap-4">
          {groups.map(([k, g]) => (
            <span key={k} className="rd-mono inline-flex items-center gap-1.5 text-[9.5px] text-rd-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TYPE_DETAILS[k].color }} />
              {TYPE_DETAILS[k].label} {g.done}/{g.total}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex h-3 gap-1">
        {groups.map(([k, g], i) => (
          <motion.div
            key={k}
            className="relative overflow-hidden rounded-full"
            style={{ flexGrow: g.total, background: `color-mix(in srgb, ${TYPE_DETAILS[k].color} 22%, transparent)` }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: EASE }}
          >
            <motion.div className="h-full rounded-full" style={{ background: TYPE_DETAILS[k].color }} animate={{ width: `${(g.done / g.total) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Up next ───────────────────────────────────────────────────────────── */

function UpNext({ week, progress, onToggle }: { week?: WeeklyVenezaWeek; progress: number[]; onToggle: (id: number) => void }) {
  if (!week?.resources?.length) return null;
  const next = [...week.resources].sort((a, b) => a.order_no - b.order_no).find(r => !progress.includes(r.id));
  if (!next) {
    return (
      <Reveal className="mt-6 flex items-center gap-4 rounded-[22px] border border-rd-line bg-rd-card p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--rd-green) 16%, transparent)", color: "var(--rd-green)" }}>
          <Check size={20} strokeWidth={3} />
        </span>
        <div>
          <div className="font-semibold text-rd-fg">Week {pad(week.week_number)} complete</div>
          <div className="text-sm text-rd-muted">Every resource ticked off. The next week unlocks soon.</div>
        </div>
      </Reveal>
    );
  }
  const d = typeOf(next);
  const Icon = d.icon;
  return (
    <Reveal className="relative mt-6 overflow-hidden rounded-[22px] border border-rd-line bg-rd-card">
      <div aria-hidden className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-30 blur-3xl" style={{ background: d.color }} />
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="min-w-0 flex-1">
          <div className="rd-mono flex flex-wrap items-center gap-3 text-[10px] text-rd-faint">
            <span className="text-rd-fg">Up next</span>
            <span className="inline-flex items-center gap-1" style={{ color: d.color }}>
              <Icon size={12} /> {d.label}
            </span>
            {next.est_minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} /> {next.est_minutes} min
              </span>
            )}
          </div>
          <h3 className="rd-display mt-3 text-2xl font-medium text-rd-fg sm:text-3xl">{next.title}</h3>
          {next.description && <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-rd-muted">{next.description}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={next.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-rd-fg px-5 py-3 text-sm font-semibold text-rd-bg transition-transform active:scale-95"
          >
            Start <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:rotate-45" />
          </a>
          <button
            type="button"
            onClick={() => onToggle(next.id)}
            className="inline-flex items-center gap-2 rounded-full border border-rd-line px-5 py-3 text-sm font-semibold text-rd-fg transition-colors hover:border-rd-fg/40"
          >
            <Check size={15} /> Done
          </button>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Progress ring ─────────────────────────────────────────────────────── */

function ProgressRing({ percent }: { percent: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[132px] w-[132px] shrink-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="rd-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--rd-cyan)" />
            <stop offset="50%" stopColor="var(--rd-violet)" />
            <stop offset="100%" stopColor="var(--rd-magenta)" />
          </linearGradient>
        </defs>
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="10" className="stroke-rd-line" />
        <motion.circle
          cx="66" cy="66" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke="url(#rd-ring)" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - percent / 100) }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="rd-display text-3xl font-medium text-rd-fg">
          <CountUp to={percent} suffix="%" duration={1.2} />
        </span>
      </div>
    </div>
  );
}

/* ─── Burst & confetti ──────────────────────────────────────────────────── */

function Burst() {
  const pieces = Array.from({ length: 10 });
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {pieces.map((_, i) => {
        const a = (i / pieces.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: SPECTRUM[i % SPECTRUM.length], left: -3, top: -3 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 22, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: (Math.random() - 0.5) * 900,
        y: -200 - Math.random() * 380,
        r: Math.random() * 540 - 270,
        d: 1.4 + Math.random() * 1.2,
        c: SPECTRUM[i % SPECTRUM.length],
        w: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[2px]"
          style={{ background: p.c, width: p.w, height: p.w * 0.45 }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 700], rotate: p.r, opacity: [1, 1, 0] }}
          transition={{ duration: p.d, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ─── Resource row ──────────────────────────────────────────────────────── */

function ResourceRow({
  item,
  done,
  onToggle,
  index,
}: {
  item: WeeklyResource;
  done: boolean;
  onToggle: () => void;
  index: number;
}) {
  const detail = typeOf(item);
  const Icon = detail.icon;
  const [burst, setBurst] = useState(0);

  const handle = () => {
    if (!done) setBurst(b => b + 1);
    onToggle();
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: EASE }}
      className="group relative flex items-start gap-4 rounded-2xl border border-rd-line bg-rd-bg/60 p-4 transition-colors hover:border-rd-fg/20 sm:items-center sm:p-5"
      style={done ? { borderColor: "color-mix(in srgb, var(--rd-green) 40%, transparent)" } : undefined}
    >
      <button
        type="button"
        onClick={handle}
        aria-pressed={done}
        aria-label={done ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`}
        className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 sm:mt-0"
        style={{
          borderColor: done ? "var(--rd-green)" : "hsl(var(--rd-faint))",
          background: done ? "var(--rd-green)" : "transparent",
        }}
      >
        <AnimatePresence>
          {done && (
            <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
              <Check size={15} strokeWidth={3} className="text-white" />
            </motion.span>
          )}
        </AnimatePresence>
        {burst > 0 && <Burst key={burst} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className={`text-[15px] font-semibold transition-colors sm:text-base ${done ? "text-rd-faint line-through decoration-rd-faint/60" : "text-rd-fg"}`}>
            {item.title}
          </h4>
          <span
            className="rd-mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px]"
            style={{ color: detail.color, borderColor: `color-mix(in srgb, ${detail.color} 35%, transparent)`, background: `color-mix(in srgb, ${detail.color} 9%, transparent)` }}
          >
            <Icon size={11} /> {detail.label}
          </span>
          {item.est_minutes > 0 && (
            <span className="rd-mono inline-flex items-center gap-1 text-[9.5px] text-rd-faint">
              <Clock size={11} /> {item.est_minutes} min
            </span>
          )}
        </div>
        {item.description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-rd-muted">{item.description}</p>}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${item.title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rd-line text-rd-muted transition-all hover:border-rd-fg hover:bg-rd-fg hover:text-rd-bg"
      >
        <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    </motion.li>
  );
}

/* ─── Week node ─────────────────────────────────────────────────────────── */

function WeekNode({
  week,
  filteredRes,
  progress,
  isOpen,
  onToggle,
  onResourceToggle,
  isCurrent = false,
}: {
  week: WeeklyVenezaWeek;
  filteredRes: WeeklyResource[];
  progress: number[];
  isOpen: boolean;
  onToggle: () => void;
  onResourceToggle: (id: number) => void;
  isCurrent?: boolean;
}) {
  const total = week.resources?.length || 0;
  const completed = (week.resources || []).filter(r => progress.includes(r.id)).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const done = total > 0 && completed === total;
  const minutes = (week.resources || []).reduce((n, r) => n + (r.est_minutes || 0), 0);

  return (
    <Reveal as="li" className="relative pl-14 sm:pl-20">
      {/* Timeline node */}
      <div className="absolute left-0 top-5 flex w-10 justify-center sm:w-14">
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-rd-bg text-xs font-semibold sm:h-12 sm:w-12"
          style={{
            borderColor: done ? "var(--rd-green)" : isCurrent ? "var(--rd-violet)" : "hsl(var(--rd-line))",
            color: done ? "var(--rd-green)" : "hsl(var(--rd-fg))",
          }}
        >
          {isCurrent && !done && <span className="rd-live-dot absolute inset-0 rounded-full" style={{ background: "color-mix(in srgb, var(--rd-violet) 25%, transparent)" }} />}
          <span className="relative">{done ? <Check size={16} strokeWidth={3} /> : `W${pad(week.week_number)}`}</span>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[22px] border bg-rd-card transition-colors"
        style={{ borderColor: isCurrent ? "color-mix(in srgb, var(--rd-violet) 45%, transparent)" : "hsl(var(--rd-line))" }}
      >
        <button type="button" onClick={onToggle} aria-expanded={isOpen} className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isCurrent && (
                <span className="rd-mono rounded-full px-2 py-0.5 text-[9.5px]" style={{ color: "var(--rd-violet)", background: "color-mix(in srgb, var(--rd-violet) 12%, transparent)" }}>
                  Live now
                </span>
              )}
              <span className="rd-mono text-[9.5px] text-rd-faint">
                {total} resources · ~{Math.round(minutes / 60)}h
              </span>
            </div>
            <h3 className="rd-display mt-2 text-xl font-medium text-rd-fg sm:text-2xl">{week.title}</h3>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-rd-line">
              <motion.div
                className="h-full rounded-full"
                style={{ background: done ? "var(--rd-green)" : "linear-gradient(90deg, var(--rd-cyan), var(--rd-violet))" }}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: EASE }}
              />
            </div>
            <span className="rd-mono w-14 text-right text-[10.5px] text-rd-muted">{completed}/{total}</span>
          </div>
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rd-line text-rd-muted">
            <ChevronDown size={16} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="border-t border-rd-line p-4 sm:p-6">
                {week.description && <p className="mb-5 max-w-3xl text-sm leading-relaxed text-rd-muted">{week.description}</p>}
                {filteredRes.length === 0 ? (
                  <p className="rd-mono py-6 text-center text-[10.5px] text-rd-faint">No resources match your filters this week</p>
                ) : (
                  <ul className="space-y-3">
                    <AnimatePresence initial={false}>
                      {filteredRes.map((item, i) => (
                        <ResourceRow key={item.id} item={item} index={i} done={progress.includes(item.id)} onToggle={() => onResourceToggle(item.id)} />
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function WeeklyVenezaPage() {
  const { data: weeks = [], isLoading: loadingWeeks } = useWeeklyVenezaData();
  const { data: remoteProgress = [], isLoading: loadingProgress } = useWeeklyVenezaProgress();
  const toggleProgressMutation = useToggleWeeklyProgress();
  const resetProgressMutation = useResetWeeklyProgress();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const reduce = useReducedMotion();
  const { theme } = useTheme();

  const [localProgress, setLocalProgress] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const progress = isAuthenticated ? remoteProgress : localProgress;

  const [openWeeks, setOpenWeeks] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ["start 0.7", "end 0.6"] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const allResources = useMemo(() => weeks.flatMap(w => w.resources || []), [weeks]);
  const currentWeek = useMemo(() => weeks.find(w => w.is_current) || weeks.find(w => w.status === "current") || weeks[0], [weeks]);
  const pastWeeks = useMemo(
    () => weeks.filter(w => !w.is_current && w.week_number < (currentWeek?.week_number || 999)).sort((a, b) => b.week_number - a.week_number),
    [weeks, currentWeek],
  );

  useEffect(() => {
    if (weeks.length > 0 && openWeeks.length === 0) setOpenWeeks([(currentWeek || weeks[0]).id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeks, currentWeek]);

  useEffect(() => {
    if (searchQuery || selectedType !== "ALL") setOpenWeeks(weeks.map(w => w.id));
  }, [searchQuery, selectedType, weeks]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = allResources.length;
  const completed = progress.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const studyMinutes = useMemo(
    () => progress.reduce((acc, id) => acc + (allResources.find(r => r.id === id)?.est_minutes || 45), 0),
    [progress, allResources],
  );
  const studyHours = Math.round((studyMinutes / 60) * 10) / 10;

  useEffect(() => {
    setCelebrate(percent === 100 && total > 0);
  }, [percent, total]);

  const toggleWeek = (id: number) => setOpenWeeks(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleToggleResource = async (resourceId: number) => {
    if (isAuthenticated) {
      try {
        await toggleProgressMutation.mutateAsync({ resourceId });
        const nowDone = !progress.includes(resourceId);
        toast({
          title: nowDone ? "Resource Completed! 🎉" : "Resource Unchecked",
          description: nowDone ? "Your weekly progress has been saved." : "Progress updated.",
        });
      } catch {
        toast({ title: "Error", description: "Failed to update progress.", variant: "destructive" });
      }
    } else {
      const wasDone = localProgress.includes(resourceId);
      const next = wasDone ? localProgress.filter(id => id !== resourceId) : [...localProgress, resourceId];
      setLocalProgress(next);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      toast({
        title: wasDone ? "Resource Unchecked" : "Resource Completed! 🎉",
        description: wasDone ? "Local progress updated." : "Great job! Sign in to sync across devices.",
      });
    }
  };

  const handleResetProgress = async () => {
    if (isAuthenticated) {
      try {
        await resetProgressMutation.mutateAsync();
        setShowResetConfirm(false);
        toast({ title: "Progress Reset", description: "All your Weekly Veneza progress has been cleared." });
      } catch {
        toast({ title: "Error", description: "Failed to reset progress.", variant: "destructive" });
      }
    } else {
      setLocalProgress([]);
      localStorage.removeItem(LOCAL_KEY);
      setShowResetConfirm(false);
      toast({ title: "Progress Reset", description: "Local progress cleared successfully." });
    }
  };

  const filterWeekResources = (list: WeeklyResource[]) => {
    const q = searchQuery.toLowerCase();
    return list.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const matchesType = selectedType === "ALL" || r.resource_type.toUpperCase() === selectedType;
      return matchesSearch && matchesType;
    });
  };

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allResources.length };
    allResources.forEach(r => {
      const k = r.resource_type.toUpperCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [allResources]);

  const loading = loadingWeeks || loadingProgress;
  const timelineWeeks = [...(currentWeek ? [currentWeek] : []), ...pastWeeks];

  return (
    <div className="rd-root relative min-h-screen overflow-x-clip">
      {/* Celebration */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={() => setCelebrate(false)}
          >
            {!reduce && <Confetti />}
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md rounded-[28px] border border-rd-line bg-rd-card p-8 text-center"
            >
              <button type="button" onClick={() => setCelebrate(false)} aria-label="Close" className="absolute right-4 top-4 text-rd-faint hover:text-rd-fg">
                <X size={18} />
              </button>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--rd-yellow) 18%, transparent)", color: "var(--rd-orange)" }}>
                <Trophy size={30} />
              </div>
              <h2 className="rd-display text-3xl font-medium text-rd-fg">Veneza Champion!</h2>
              <p className="mt-3 text-sm leading-relaxed text-rd-muted">
                You finished every Weekly Veneza resource, with about <span className="rd-spectrum-text font-semibold">{studyHours} hours</span> of study.
              </p>
              <button type="button" onClick={() => setCelebrate(false)} className="mt-7 w-full rounded-full bg-rd-fg py-3.5 text-sm font-semibold text-rd-bg transition-transform active:scale-[0.98]">
                Keep up the momentum
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-80"
        style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 20%, transparent)", maskImage: "linear-gradient(to bottom, #000 20%, transparent)" }}
      >
        <GradientASCII
          key={theme}
          colors={theme === "dark" ? ["#09090b", "#11a84a", "#22e0ff", "#9a6bff", "#ff4be0"] : ["#f7f6f2", "#8fe3b0", "#8fe7ff", "#c2adff", "#ffb3ec"]}
          shape="horizon"
          cellSize={15}
          lightMode={theme === "light"}
          clickEffect="burst"
          gradientOpacity={0.8}
          glyphOpacity={0.85}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        style={{ background: "linear-gradient(100deg, hsl(var(--rd-bg) / 0.85) 0%, hsl(var(--rd-bg) / 0.45) 55%, hsl(var(--rd-bg) / 0.7) 100%)" }}
      />

      <main className="relative mx-auto w-full max-w-[1200px] px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        {/* Header */}
        <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <SectionLabel index="WV">Weekly Veneza</SectionLabel>
            <h1 className="rd-display mt-6 text-[clamp(2.2rem,4.1vw,3.6rem)] font-medium text-rd-fg">
              <SplitWords lines={["A curated AI curriculum,", "one week at a time."]} delay={0.1} />
            </h1>
            <Reveal delay={0.5} className="mt-5 max-w-xl text-[15px] leading-relaxed text-rd-muted">
              Hand-picked videos, courses and papers every week. Tick them off as you go and watch your progress grow.
            </Reveal>
          </div>
          <Reveal delay={0.3}>
            <Countdown week={currentWeek} />
          </Reveal>
        </div>

        {/* Progress dashboard */}
        <Reveal delay={0.2} className="relative mt-14 grid border-l border-t border-rd-line md:grid-cols-[1.4fr_1fr_1fr]">
          <Crosshair className="-left-[6px] -top-[6px]" />
          <Crosshair className="-right-[6px] -top-[6px]" />
          <div className="flex items-center gap-6 border-b border-r border-rd-line p-6 sm:p-8">
            <ProgressRing percent={percent} />
            <div>
              <div className="rd-mono text-[10.5px] text-rd-faint">Your journey</div>
              <div className="rd-display mt-3 text-4xl font-medium text-rd-fg">
                {completed}
                <span className="text-rd-faint"> / {total}</span>
              </div>
              <div className="mt-1 text-sm text-rd-muted">resources completed</div>
              <LevelBadge minutes={studyMinutes} />
            </div>
          </div>
          <div className="flex flex-col justify-between border-b border-r border-rd-line p-6 sm:p-8">
            <div className="rd-mono text-[10.5px] text-rd-faint">Study time</div>
            <div className="rd-display mt-6 text-4xl font-medium text-rd-fg">~{studyHours}h</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-rd-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: isAuthenticated ? "var(--rd-green)" : "var(--rd-yellow)" }} />
              {isAuthenticated ? "Synced to your account" : "Saved on this device"}
            </div>
          </div>
          <div className="flex flex-col justify-between border-b border-r border-rd-line p-6 sm:p-8">
            <div className="rd-mono text-[10.5px] text-rd-faint">Manage</div>
            <p className="mt-3 text-sm leading-relaxed text-rd-muted">
              {isAuthenticated ? "Your progress follows you on every device." : "Sign in to sync your progress across devices."}
            </p>
            <div className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                {showResetConfirm ? (
                  <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex gap-2">
                    <button type="button" onClick={handleResetProgress} className="flex-1 rounded-full py-2.5 text-xs font-semibold text-white" style={{ background: "var(--rd-red)" }}>
                      Confirm reset
                    </button>
                    <button type="button" onClick={() => setShowResetConfirm(false)} className="rounded-full border border-rd-line px-4 py-2.5 text-xs font-semibold text-rd-muted hover:text-rd-fg">
                      Cancel
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="reset"
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onClick={() => setShowResetConfirm(true)}
                    disabled={progress.length === 0}
                    className="inline-flex items-center gap-2 rounded-full border border-rd-line px-4 py-2.5 text-xs font-semibold text-rd-muted transition-colors hover:text-rd-fg disabled:opacity-40"
                  >
                    <RotateCcw size={13} /> Reset progress
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          <TypeMix resources={allResources} progress={progress} />
        </Reveal>

        <UpNext week={currentWeek} progress={progress} onToggle={handleToggleResource} />

        {/* Toolbar */}
        <div className="sticky top-[52px] z-20 -mx-5 mt-12 px-5 py-3 sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-3 rounded-full border border-rd-line bg-rd-bg/80 p-1.5 backdrop-blur-xl max-md:rounded-[22px] md:flex-row md:items-center">
            <div className="flex flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
              {FILTERS.filter(f => f === "ALL" || typeCounts[f]).map(type => {
                const active = selectedType === type;
                const detail = TYPE_DETAILS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? "text-rd-bg" : "text-rd-muted hover:text-rd-fg"}`}
                  >
                    {active && <motion.span layoutId="wv-filter" className="absolute inset-0 rounded-full bg-rd-fg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    {detail && <span className="relative h-1.5 w-1.5 rounded-full" style={{ background: detail.color }} />}
                    <span className="relative">{type === "ALL" ? "All" : detail.label}</span>
                    <span className={`relative rd-mono text-[9px] ${active ? "text-rd-bg/60" : "text-rd-faint"}`}>{typeCounts[type] || 0}</span>
                  </button>
                );
              })}
            </div>
            <label className="relative flex items-center md:w-72">
              <Search size={15} className="pointer-events-none absolute left-4 text-rd-faint" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search resources"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-transparent bg-rd-bg2 py-2.5 pl-10 pr-10 text-sm text-rd-fg placeholder:text-rd-faint focus:border-rd-line focus:outline-none"
              />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="absolute right-3 text-rd-faint hover:text-rd-fg">
                  <X size={14} />
                </button>
              ) : (
                <kbd className="rd-mono pointer-events-none absolute right-3 hidden rounded border border-rd-line px-1.5 text-[10px] text-rd-faint md:block">/</kbd>
              )}
            </label>
          </div>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="mt-10 space-y-4 pl-14 sm:pl-20">
            {[0, 1].map(i => (
              <div key={i} className="rd-skeleton h-28 rounded-[22px]" />
            ))}
          </div>
        ) : timelineWeeks.length === 0 ? (
          <div className="mt-16 rounded-[22px] border border-dashed border-rd-line p-12 text-center">
            <div className="rd-mono text-[10.5px] text-rd-faint">No weeks published yet</div>
            <p className="mt-2 text-sm text-rd-muted">The first week of resources will appear here soon.</p>
          </div>
        ) : (
          <div ref={timelineRef} className="relative mt-8">
            <div aria-hidden className="absolute bottom-6 left-5 top-6 w-px bg-rd-line sm:left-7" />
            <motion.div
              aria-hidden
              className="absolute bottom-6 left-5 top-6 w-px origin-top sm:left-7"
              style={{ scaleY: reduce ? 1 : lineScale, background: "linear-gradient(to bottom, var(--rd-violet), var(--rd-cyan), var(--rd-green))" }}
            />
            <ol className="space-y-6">
              {timelineWeeks.map((week, i) => {
                const filtered = filterWeekResources(week.resources || []);
                if (i > 0 && filtered.length === 0 && (searchQuery || selectedType !== "ALL")) return null;
                return (
                  <WeekNode
                    key={week.id}
                    week={week}
                    filteredRes={filtered}
                    progress={progress}
                    isOpen={openWeeks.includes(week.id)}
                    onToggle={() => toggleWeek(week.id)}
                    onResourceToggle={handleToggleResource}
                    isCurrent={i === 0}
                  />
                );
              })}
            </ol>
            {pastWeeks.length === 0 && (
              <div className="rd-mono mt-8 pl-14 text-[10.5px] text-rd-faint sm:pl-20">More weeks unlock as the semester moves on</div>
            )}
          </div>
        )}
      </main>

      <Footer short />
    </div>
  );
}
