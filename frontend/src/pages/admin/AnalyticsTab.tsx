import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Eye, Clock, BarChart2,
  Globe, Smartphone, Monitor, Tablet, Chrome, Search,
  ArrowRight, ChevronUp, ChevronDown, Bot, Zap, MessageSquare,
  Activity, MousePointer, ExternalLink, RefreshCw, AlertCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type DateRange = '1d' | '7d' | '30d' | '90d';
type AnalyticsSubTab = 'overview' | 'traffic' | 'pages' | 'behavior' | 'technology' | 'chatbot';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const generateDailyPoints = (days: number, base: number, variance: number) =>
  Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    label: i % 5 === 0 ? `Day ${i + 1}` : '',
    value: Math.round(base + (Math.random() - 0.5) * variance * 2),
  }));

const RAW_TRAFFIC_90 = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 5, 22 + i); // June 22, 2026 onwards
  const label = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
  return {
    label,
    visitors: Math.round(1200 + Math.sin(i / 7) * 300 + Math.random() * 200),
    sessions: Math.round(1550 + Math.sin(i / 7) * 380 + Math.random() * 250),
    pageViews: Math.round(3800 + Math.sin(i / 7) * 900 + Math.random() * 600),
  };
});

const sliceTraffic = (range: DateRange) => {
  const slices: Record<DateRange, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
  const n = slices[range];
  return RAW_TRAFFIC_90.slice(-n);
};

const KPI_BY_RANGE: Record<DateRange, {
  visitors: number; visitorsDelta: number;
  sessions: number; sessionsDelta: number;
  pageViews: number; pageViewsDelta: number;
  avgDuration: string; bounce: number; returning: number;
}> = {
  '1d':  { visitors: 421,  visitorsDelta: 8.2,  sessions: 538,  sessionsDelta: 6.4,  pageViews: 1284, pageViewsDelta: 11.3, avgDuration: '2m 08s', bounce: 37.1, returning: 26.3 },
  '7d':  { visitors: 3201, visitorsDelta: 14.7, sessions: 4180, sessionsDelta: 12.1, pageViews: 9820, pageViewsDelta: 18.4, avgDuration: '2m 14s', bounce: 34.2, returning: 28.6 },
  '30d': { visitors: 12482, visitorsDelta: 18.4, sessions: 15821, sessionsDelta: 12.7, pageViews: 38492, pageViewsDelta: 21.3, avgDuration: '2m 19s', bounce: 33.1, returning: 29.4 },
  '90d': { visitors: 34821, visitorsDelta: 31.2, sessions: 44190, sessionsDelta: 27.8, pageViews: 108200, pageViewsDelta: 35.6, avgDuration: '2m 22s', bounce: 32.8, returning: 31.1 },
};

const SOURCES_DATA = [
  { name: 'Direct',    value: 42, color: '#6366f1' },
  { name: 'Google',    value: 31, color: '#0ea5e9' },
  { name: 'Instagram', value: 14, color: '#ec4899' },
  { name: 'LinkedIn',  value:  6, color: '#0077b5' },
  { name: 'GitHub',    value:  4, color: '#1f2937' },
  { name: 'Other',     value:  3, color: '#94a3b8' },
];

const NEW_VS_RETURNING = [
  { name: 'New Visitors', value: 71.4, color: '#6366f1' },
  { name: 'Returning',    value: 28.6, color: '#818cf8' },
];

const NVR_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  newVisitors: Math.round(900 + Math.random() * 300),
  returning: Math.round(280 + Math.random() * 120),
}));

const TOP_PAGES = [
  { page: '/',             title: 'Home',            views: 4230, visitors: 2810, avgTime: '1m 42s', bounce: 31 },
  { page: '/events',       title: 'Events',          views: 2140, visitors: 1530, avgTime: '2m 11s', bounce: 24 },
  { page: '/projects',     title: 'Projects',        views: 1820, visitors: 1210, avgTime: '1m 56s', bounce: 29 },
  { page: '/team',         title: 'Team',            views: 1340, visitors:  980, avgTime: '1m 21s', bounce: 41 },
  { page: '/resources',    title: 'Resources',       views: 1180, visitors:  840, avgTime: '3m 02s', bounce: 19 },
  { page: '/aura',         title: 'Aura Network',    views:  920, visitors:  710, avgTime: '4m 14s', bounce: 18 },
  { page: '/achievements', title: 'Achievements',    views:  780, visitors:  620, avgTime: '1m 05s', bounce: 52 },
  { page: '/news',         title: 'News',            views:  640, visitors:  510, avgTime: '2m 48s', bounce: 27 },
  { page: '/curriculum',   title: 'Curriculum',      views:  540, visitors:  430, avgTime: '5m 11s', bounce: 12 },
  { page: '/my-registrations', title: 'My Regs.',   views:  320, visitors:  280, avgTime: '1m 32s', bounce: 45 },
];

const JOURNEY_STEPS = [
  { label: 'Home',              pct: 100, count: 4230 },
  { label: 'Events',            pct: 61,  count: 2581 },
  { label: 'Event Detail',      pct: 43,  count: 1819 },
  { label: 'Register Click',    pct: 28,  count: 1184 },
  { label: 'Registration Form', pct: 21,  count: 888  },
  { label: 'Submitted',         pct: 17,  count: 719  },
];

const FUNNEL_STEPS = [
  { label: 'Event Page Viewed',      count: 1842, color: '#6366f1' },
  { label: 'Register Button Clicked', count: 634, color: '#818cf8' },
  { label: 'Login Completed',        count: 521, color: '#a5b4fc' },
  { label: 'Form Submitted',         count: 463, color: '#c4b5fd' },
  { label: 'Registration Confirmed', count: 421, color: '#ddd6fe' },
];

const DEVICES = [
  { name: 'Desktop',  pct: 61, icon: Monitor,    color: '#6366f1' },
  { name: 'Mobile',   pct: 35, icon: Smartphone, color: '#818cf8' },
  { name: 'Tablet',   pct:  4, icon: Tablet,     color: '#a5b4fc' },
];

const BROWSERS = [
  { name: 'Chrome',  pct: 62, color: '#6366f1' },
  { name: 'Safari',  pct: 21, color: '#0ea5e9' },
  { name: 'Firefox', pct:  9, color: '#f97316' },
  { name: 'Edge',    pct:  6, color: '#10b981' },
  { name: 'Other',   pct:  2, color: '#94a3b8' },
];

const OS_DATA = [
  { name: 'Windows', pct: 38 },
  { name: 'Android', pct: 27 },
  { name: 'iOS',     pct: 18 },
  { name: 'macOS',   pct: 11 },
  { name: 'Linux',   pct:  6 },
];

const GEO_DATA = [
  { country: 'India',      pct: 92, regions: ['Gujarat', 'Maharashtra', 'Rajasthan', 'Delhi', 'Other'] },
  { country: 'USA',        pct:  3, regions: [] },
  { country: 'UAE',        pct:  2, regions: [] },
  { country: 'Other',      pct:  3, regions: [] },
];

const CHATBOT_KPI_BY_RANGE: Record<DateRange, {
  users: number; conversations: number; messages: number; avgMsgs: number;
  tokens: string; apiRequests: number; failures: number;
}> = {
  '1d':  { users: 42,  conversations: 61,  messages: 281,  avgMsgs: 4.6, tokens: '61K',  apiRequests: 314,  failures: 2  },
  '7d':  { users: 284, conversations: 411, messages: 1892, avgMsgs: 4.6, tokens: '421K', apiRequests: 2114, failures: 12 },
  '30d': { users: 1284, conversations: 1847, messages: 8421, avgMsgs: 4.6, tokens: '1.82M', apiRequests: 9421, failures: 37 },
  '90d': { users: 3841, conversations: 5540, messages: 25263, avgMsgs: 4.6, tokens: '5.47M', apiRequests: 28263, failures: 111 },
};

const MODEL_USAGE = [
  { name: 'Groq',     pct: 58, color: '#6366f1' },
  { name: 'Gemini',   pct: 31, color: '#0ea5e9' },
  { name: 'Fallback', pct: 11, color: '#f97316' },
];

const POPULAR_TOPICS = [
  { name: 'Events',          pct: 31 },
  { name: 'AI Club Projects', pct: 24 },
  { name: 'Members',         pct: 18 },
  { name: 'Resources',       pct: 15 },
  { name: 'Other',           pct: 12 },
];

const CHATBOT_TIMELINE = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  conversations: Math.round(55 + Math.random() * 30),
  messages: Math.round(250 + Math.random() * 140),
}));

// ─── Shared Utilities ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000    ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  : `${n}`;

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

// ─── Sub-components ──────────────────────────────────────────────────────────

// Mini sparkline using SVG path
function Sparkline({ data, color = '#6366f1', negative = false }: { data: number[]; color?: string; negative?: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const path = `M${pts.join(' L')}`;
  const fill = `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// KPI Card
function KpiCard({ title, value, delta, sub, sparkData, icon: Icon, idx }: {
  title: string; value: string; delta: number; sub?: string;
  sparkData: number[]; icon: React.ElementType; idx: number;
}) {
  const up = delta >= 0;
  return (
    <motion.div
      custom={idx}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Icon size={15} className="text-indigo-600" />
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          up ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
        }`}>
          {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {Math.abs(delta)}%
        </span>
      </div>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono mt-2">{title}</p>
      <p className="font-display font-extrabold text-slate-900 text-xl mt-0.5 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
      <div className="mt-3">
        <Sparkline data={sparkData} color={up ? '#6366f1' : '#f43f5e'} />
      </div>
    </motion.div>
  );
}

// Section heading
function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-display font-bold text-slate-900 text-base">{children}</h3>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

// Horizontal bar with label
function HBar({ label, pct, color = '#6366f1', value, delay = 0 }: {
  label: string; pct: number; color?: string; value?: string; delay?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 font-medium w-24 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.7, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
          className="h-full rounded-full"
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-10 text-right shrink-0">{value ?? `${pct}%`}</span>
    </div>
  );
}

// Custom chart tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-xl border border-slate-700">
      <p className="font-mono text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// Date Range Pill Selector
function DatePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const options: { label: string; value: DateRange }[] = [
    { label: 'Today',   value: '1d' },
    { label: '7 Days',  value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === o.value
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Sub-tab pills
function SubTabPills({ value, onChange }: { value: AnalyticsSubTab; onChange: (v: AnalyticsSubTab) => void }) {
  const tabs: { label: string; value: AnalyticsSubTab; icon: React.ElementType }[] = [
    { label: 'Overview',   value: 'overview',    icon: BarChart2 },
    { label: 'Traffic',    value: 'traffic',     icon: TrendingUp },
    { label: 'Pages',      value: 'pages',       icon: Eye },
    { label: 'Behavior',   value: 'behavior',    icon: MousePointer },
    { label: 'Technology', value: 'technology',  icon: Monitor },
    { label: 'Chatbot',    value: 'chatbot',     icon: Bot },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = value === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              active
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
            }`}
          >
            <Icon size={13} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sub-tab: Overview ───────────────────────────────────────────────────────

function OverviewTab({ range }: { range: DateRange }) {
  const kpi = KPI_BY_RANGE[range];
  const traffic = sliceTraffic(range);
  const [activeSeries, setActiveSeries] = useState<string[]>(['visitors', 'sessions', 'pageViews']);

  const sparkVisitors = useMemo(() => generateDailyPoints(14, 1200, 300).map(d => d.value), []);
  const sparkSessions = useMemo(() => generateDailyPoints(14, 1600, 400).map(d => d.value), []);
  const sparkPages    = useMemo(() => generateDailyPoints(14, 3800, 900).map(d => d.value), []);

  const toggleSeries = (key: string) => {
    setActiveSeries(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const seriesConfig = [
    { key: 'visitors',  label: 'Visitors',   color: '#6366f1' },
    { key: 'sessions',  label: 'Sessions',   color: '#0ea5e9' },
    { key: 'pageViews', label: 'Page Views', color: '#10b981' },
  ];

  const kpiCards = [
    { title: 'Total Visitors',   value: fmt(kpi.visitors),  delta: kpi.visitorsDelta,  sub: 'Unique users',    spark: sparkVisitors, icon: Users    },
    { title: 'Sessions',         value: fmt(kpi.sessions),  delta: kpi.sessionsDelta,  sub: 'All visits',      spark: sparkSessions, icon: Activity },
    { title: 'Page Views',       value: fmt(kpi.pageViews), delta: kpi.pageViewsDelta, sub: 'Total views',     spark: sparkPages,    icon: Eye      },
    { title: 'Avg. Duration',    value: kpi.avgDuration,    delta: 3.1,                sub: 'Per session',     spark: sparkVisitors.map(v => v * 0.001), icon: Clock },
    { title: 'Bounce Rate',      value: `${kpi.bounce}%`,   delta: -2.4,               sub: 'Single page visits', spark: sparkPages.reverse(), icon: TrendingDown },
    { title: 'Returning',        value: `${kpi.returning}%`, delta: 1.8,              sub: 'Coming back',     spark: sparkSessions.map(v => v * 0.3), icon: RefreshCw },
  ];

  // Live now simulation
  const [liveCount, setLiveCount] = useState(17);
  useEffect(() => {
    const t = setInterval(() => setLiveCount(c => Math.max(8, Math.min(32, c + Math.round((Math.random() - 0.5) * 3)))), 5000);
    return () => clearInterval(t);
  }, []);

  const LIVE_PAGES = [
    { page: 'Home',         count: Math.round(liveCount * 0.45) },
    { page: 'Events',       count: Math.round(liveCount * 0.25) },
    { page: 'Projects',     count: Math.round(liveCount * 0.18) },
    { page: 'Team',         count: Math.round(liveCount * 0.08) },
    { page: 'Chatbot',      count: Math.round(liveCount * 0.04) },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((c, i) => (
          <KpiCard key={c.title} {...c} sparkData={c.spark} idx={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Traffic Chart */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <SectionHeading sub="Daily traffic breakdown">Traffic Overview</SectionHeading>
            <div className="flex gap-2 flex-wrap">
              {seriesConfig.map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                    activeSeries.includes(s.key)
                      ? 'border-transparent text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                  style={activeSeries.includes(s.key) ? { backgroundColor: s.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={traffic} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                {seriesConfig.map(s => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip content={<ChartTooltip />} />
              {seriesConfig.map(s => activeSeries.includes(s.key) && (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                  stroke={s.color} strokeWidth={2} fill={`url(#grad-${s.key})`} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Now panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Live Now</span>
          </div>
          <div className="text-center mb-5">
            <motion.p
              key={liveCount}
              initial={{ scale: 1.15, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-display font-extrabold text-4xl text-slate-900"
            >
              {liveCount}
            </motion.p>
            <p className="text-[11px] text-slate-400 mt-1">active visitors</p>
          </div>
          <div className="space-y-2.5">
            {LIVE_PAGES.map(p => (
              <div key={p.page} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{p.page}</span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 rounded-full px-2 py-0.5">{p.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-400 font-mono">Last 30 min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Visitors</span>
              <span className="text-xs font-bold text-slate-800">43</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Page Views</span>
              <span className="text-xs font-bold text-slate-800">91</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Traffic ────────────────────────────────────────────────────────

function TrafficTab({ range }: { range: DateRange }) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const sel = SOURCES_DATA.find(s => s.name === selectedSource);

  const nvrData = range === '1d'
    ? NVR_TIMELINE.slice(-1)
    : range === '7d'
    ? NVR_TIMELINE.slice(-7)
    : NVR_TIMELINE;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="How visitors found the AI Club">Traffic Sources</SectionHeading>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={SOURCES_DATA} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value" stroke="none"
                  onClick={(d) => setSelectedSource(d.name === selectedSource ? null : d.name)}
                >
                  {SOURCES_DATA.map((s) => (
                    <Cell key={s.name} fill={s.color}
                      opacity={selectedSource && selectedSource !== s.name ? 0.35 : 1}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5 w-full">
              {SOURCES_DATA.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setSelectedSource(s.name === selectedSource ? null : s.name)}
                  className={`w-full transition-all ${selectedSource === s.name ? 'opacity-100' : selectedSource ? 'opacity-50' : 'opacity-100'}`}
                >
                  <HBar label={s.name} pct={s.value} color={s.color} delay={i * 0.07} />
                </button>
              ))}
            </div>
          </div>

          {/* Source detail tooltip */}
          <AnimatePresence>
            {sel && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-4 p-3 rounded-xl border border-indigo-100 bg-indigo-50"
              >
                <p className="font-bold text-xs text-indigo-800 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sel.color }} />
                  {sel.name}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div><span className="font-semibold text-slate-800">Visitors:</span> {Math.round(KPI_BY_RANGE[range].visitors * sel.value / 100).toLocaleString()}</div>
                  <div><span className="font-semibold text-slate-800">Sessions:</span> {Math.round(KPI_BY_RANGE[range].sessions * sel.value / 100).toLocaleString()}</div>
                  <div><span className="font-semibold text-slate-800">Page Views:</span> {Math.round(KPI_BY_RANGE[range].pageViews * sel.value / 100).toLocaleString()}</div>
                  <div><span className="font-semibold text-slate-800">Avg. Duration:</span> {KPI_BY_RANGE[range].avgDuration}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* New vs Returning */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Visitor loyalty breakdown">New vs Returning</SectionHeading>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={NEW_VS_RETURNING} cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  dataKey="value" stroke="none"
                >
                  {NEW_VS_RETURNING.map(s => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-4 w-full">
              {NEW_VS_RETURNING.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">{s.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ backgroundColor: s.color }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* N vs R timeline chart */}
          <div className="mt-5">
            <p className="text-[10px] font-mono text-slate-400 mb-2 uppercase tracking-wider">30-day trend</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={nvrData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-new" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-ret" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => fmt(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="newVisitors" name="New" stroke="#6366f1" strokeWidth={2} fill="url(#grad-new)" dot={false} />
                <Area type="monotone" dataKey="returning" name="Returning" stroke="#818cf8" strokeWidth={2} fill="url(#grad-ret)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Geographic breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Visitor origin — aggregated, privacy-safe">Geographic Distribution</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GEO_DATA.map((g, i) => (
            <div key={g.country}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-700">{g.country}</span>
                <span className="text-xs font-bold text-slate-900">{g.pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${g.pct}%` }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="h-full rounded-full bg-indigo-500"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              </div>
              {g.regions.length > 0 && (
                <div className="space-y-1 pl-2 border-l-2 border-indigo-100">
                  {g.regions.map(r => (
                    <p key={r} className="text-[10px] text-slate-400 font-mono">↳ {r}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Pages ──────────────────────────────────────────────────────────

type SortKey = 'views' | 'visitors' | 'bounce';
type SortDir = 'asc' | 'desc';

function PagesTab() {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('views');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let rows = TOP_PAGES.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.page.toLowerCase().includes(search.toLowerCase())
    );
    rows = rows.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return rows;
  }, [search, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronDown size={12} className="text-slate-300" />;
    return sortDir === 'desc' ? <ChevronDown size={12} className="text-indigo-500" /> : <ChevronUp size={12} className="text-indigo-500" />;
  };

  const maxViews = Math.max(...TOP_PAGES.map(p => p.views));

  return (
    <div className="space-y-5">
      {/* Search + sort bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <SectionHeading sub="Most visited pages on the AI Club website">Top Pages</SectionHeading>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search pages…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px] w-40">Page</th>
                <th className="py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                  <button onClick={() => handleSort('views')} className="flex items-center gap-1 mx-auto">
                    Views <SortIcon k="views" />
                  </button>
                </th>
                <th className="py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                  <button onClick={() => handleSort('visitors')} className="flex items-center gap-1 mx-auto">
                    Visitors <SortIcon k="visitors" />
                  </button>
                </th>
                <th className="py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px]">Avg. Time</th>
                <th className="py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                  <button onClick={() => handleSort('bounce')} className="flex items-center gap-1 mx-auto">
                    Bounce <SortIcon k="bounce" />
                  </button>
                </th>
                <th className="py-2 px-3 font-mono text-slate-400 uppercase tracking-wider text-[10px] w-32">Traffic Bar</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.page}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-indigo-50/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-800">{p.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.page}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{p.views.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-slate-600">{p.visitors.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-slate-600 font-mono">{p.avgTime}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold ${p.bounce <= 25 ? 'text-emerald-600' : p.bounce >= 45 ? 'text-rose-500' : 'text-amber-600'}`}>
                        {p.bounce}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.views / maxViews) * 100}%` }}
                          transition={{ delay: i * 0.05, duration: 0.6 }}
                          className="h-full rounded-full bg-indigo-500"
                        />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs">No pages match "{search}"</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Behavior ───────────────────────────────────────────────────────

function BehaviorTab() {
  const maxFunnel = FUNNEL_STEPS[0].count;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* User Journey */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Most common navigation path through the site">User Journey</SectionHeading>
        <div className="space-y-2">
          {JOURNEY_STEPS.map((step, i) => (
            <div key={step.label}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700">{step.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">{step.count.toLocaleString()} users</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${step.pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.7 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, #6366f1, #818cf8)`,
                        opacity: 1 - i * 0.1,
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600 w-10 text-right shrink-0">{step.pct}%</span>
              </div>
              {i < JOURNEY_STEPS.length - 1 && (
                <div className="flex items-center gap-3 my-1">
                  <div className="w-8 flex justify-center">
                    <ArrowRight size={14} className="text-slate-300 rotate-90" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round((JOURNEY_STEPS[i + 1].count / step.count) * 100)}% continued
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Registration Funnel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Event registration conversion steps">Registration Funnel</SectionHeading>
        <div className="space-y-3">
          {FUNNEL_STEPS.map((step, i) => {
            const widthPct = (step.count / maxFunnel) * 100;
            const convPct = i > 0 ? Math.round((step.count / FUNNEL_STEPS[i - 1].count) * 100) : 100;
            return (
              <div key={step.label}>
                {i > 0 && (
                  <div className="flex items-center gap-2 my-1 ml-2">
                    <ChevronDown size={12} className="text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-mono">{convPct}% conversion</span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    originX: 0,
                    width: `${widthPct}%`,
                    minWidth: '40%',
                    background: `linear-gradient(90deg, #6366f1 0%, #818cf8 100%)`,
                    opacity: 1 - i * 0.12,
                  }}
                >
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs font-semibold text-white truncate pr-2">{step.label}</span>
                    <span className="text-xs font-bold text-white/90 shrink-0">{step.count.toLocaleString()}</span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <p className="text-[10px] font-mono text-indigo-700 mb-1 uppercase tracking-wider">Overall Conversion</p>
          <p className="font-display font-bold text-indigo-900 text-lg">
            {Math.round((FUNNEL_STEPS[FUNNEL_STEPS.length - 1].count / FUNNEL_STEPS[0].count) * 100)}%
          </p>
          <p className="text-[10px] text-indigo-600">
            {FUNNEL_STEPS[FUNNEL_STEPS.length - 1].count} of {FUNNEL_STEPS[0].count} page views became registrations
          </p>
        </div>
      </div>

      {/* Key Transition Flows */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm lg:col-span-2">
        <SectionHeading sub="Most common page-to-page transitions">Key Navigation Flows</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { from: 'Home', to: 'Events',        pct: 61 },
            { from: 'Home', to: 'Projects',      pct: 43 },
            { from: 'Home', to: 'Team',          pct: 32 },
            { from: 'Home', to: 'Resources',     pct: 28 },
            { from: 'Events', to: 'Event Detail', pct: 79 },
            { from: 'Event Detail', to: 'Register', pct: 34 },
            { from: 'Home', to: 'Chatbot',       pct: 22 },
            { from: 'Projects', to: 'Team',      pct: 18 },
          ].map((flow, i) => (
            <motion.div
              key={`${flow.from}-${flow.to}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
            >
              <p className="text-[10px] text-slate-400 font-mono truncate">{flow.from}</p>
              <div className="flex items-center gap-1 my-1">
                <ArrowRight size={10} className="text-indigo-400 shrink-0" />
                <p className="text-xs font-bold text-slate-800 truncate">{flow.to}</p>
              </div>
              <p className="text-sm font-extrabold text-indigo-600 font-display">{flow.pct}%</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Technology ─────────────────────────────────────────────────────

function TechnologyTab() {
  const deviceTotal = DEVICES.reduce((a, d) => a + d.pct, 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Devices */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Screen size distribution">Devices</SectionHeading>
        <div className="flex flex-col items-center gap-4">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={DEVICES.map(d => ({ name: d.name, value: d.pct }))} cx="50%" cy="50%"
                innerRadius={48} outerRadius={72} dataKey="value" stroke="none"
              >
                {DEVICES.map(d => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-full space-y-3">
            {DEVICES.map((d, i) => {
              const Icon = d.icon;
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <Icon size={14} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-600">{d.name}</span>
                      <span className="text-xs font-bold text-slate-800">{d.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.pct}%` }}
                        transition={{ delay: i * 0.12, duration: 0.7 }}
                        style={{ backgroundColor: d.color }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-[10px] text-amber-700 font-mono mb-0.5">💡 Insight</p>
          <p className="text-xs text-amber-800">35% mobile usage — prioritize responsive UI for event registration flow.</p>
        </div>
      </div>

      {/* Browsers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Browser market share">Browsers</SectionHeading>
        <div className="space-y-3 mt-2">
          {BROWSERS.map((b, i) => (
            <HBar key={b.name} label={b.name} pct={b.pct} color={b.color} delay={i * 0.08} />
          ))}
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3">Operating Systems</p>
          <div className="space-y-3">
            {OS_DATA.map((o, i) => (
              <HBar key={o.name} label={o.name} pct={o.pct} color="#6366f1" delay={i * 0.08} />
            ))}
          </div>
        </div>
      </div>

      {/* Screen & Session quality */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="Quality signals">Session Quality</SectionHeading>
        <div className="space-y-4">
          {[
            { label: 'Avg. Pages / Session', value: '3.8', icon: Eye,          color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Avg. Session Duration', value: '2m 19s', icon: Clock,    color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Single Page Sessions',  value: '33.1%', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Multi-Page Sessions',   value: '66.9%', icon: ExternalLink, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} className={stat.color} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-mono">{stat.label}</p>
                  <p className="font-display font-bold text-slate-900 text-base">{stat.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Device chart by bar */}
        <div className="mt-5">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-3">Device + Browser matrix</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={[
              { name: 'Desktop Chrome', value: 38 },
              { name: 'Mobile Safari', value: 21 },
              { name: 'Desktop Safari', value: 12 },
              { name: 'Mobile Chrome', value: 15 },
              { name: 'Other', value: 14 },
            ]} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab: Chatbot ────────────────────────────────────────────────────────

function ChatbotTab({ range }: { range: DateRange }) {
  const kpi = CHATBOT_KPI_BY_RANGE[range];
  const chatTimeline = range === '1d' ? CHATBOT_TIMELINE.slice(-1)
    : range === '7d' ? CHATBOT_TIMELINE.slice(-7) : CHATBOT_TIMELINE;

  const chatKpiCards = [
    { title: 'Chatbot Users',     value: kpi.users.toLocaleString(),         icon: Users,         color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Conversations',     value: kpi.conversations.toLocaleString(), icon: MessageSquare, color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { title: 'Messages',          value: kpi.messages.toLocaleString(),      icon: Zap,           color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Avg Msgs / Chat',   value: `${kpi.avgMsgs}`,                   icon: Activity,      color: 'text-teal-600',   bg: 'bg-teal-50'   },
    { title: 'Tokens Used',       value: kpi.tokens,                         icon: Bot,           color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { title: 'API Requests',      value: kpi.apiRequests.toLocaleString(),   icon: RefreshCw,     color: 'text-emerald-600',bg: 'bg-emerald-50'},
    { title: 'Failed Requests',   value: `${kpi.failures}`,                  icon: AlertCircle,   color: 'text-rose-600',   bg: 'bg-rose-50'   },
  ];

  return (
    <div className="space-y-6">
      {/* Chatbot KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {chatKpiCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <Icon size={15} className={c.color} />
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono leading-tight">{c.title}</p>
              <p className="font-display font-extrabold text-slate-900 text-lg mt-1">{c.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chatbot timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Daily chatbot activity">Conversation Trend</SectionHeading>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chatTimeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-conv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-msg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="conversations" name="Conversations" stroke="#6366f1" strokeWidth={2} fill="url(#grad-conv)" dot={false} />
              <Area type="monotone" dataKey="messages" name="Messages" stroke="#0ea5e9" strokeWidth={2} fill="url(#grad-msg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Performance stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Response quality metrics">Performance</SectionHeading>
          <div className="space-y-4">
            {[
              { label: 'Avg Response Time', value: '1.42s', sub: 'Per API call',      pct: 85, color: '#6366f1' },
              { label: 'Success Rate',      value: '99.6%', sub: 'API reliability',   pct: 99.6, color: '#10b981' },
              { label: 'Fallback Rate',     value: '3.1%',  sub: 'Provider fallback', pct: 3.1, color: '#f97316' },
            ].map((s, i) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">{s.label}</span>
                  <span className="font-bold text-slate-900 text-xs">{s.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(s.pct, 100)}%` }}
                    transition={{ delay: i * 0.12, duration: 0.7 }}
                    style={{ backgroundColor: s.color }}
                    className="h-full rounded-full"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-mono">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model usage */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Which AI provider served each request">Model Usage</SectionHeading>
          <div className="flex gap-6 items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={MODEL_USAGE} cx="50%" cy="50%"
                  innerRadius={48} outerRadius={72} dataKey="pct" stroke="none"
                >
                  {MODEL_USAGE.map(m => <Cell key={m.name} fill={m.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {MODEL_USAGE.map((m, i) => (
                <div key={m.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      {m.name}
                    </span>
                    <span className="font-bold text-slate-800 text-xs">{m.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.7 }}
                      style={{ backgroundColor: m.color }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Popular topics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="What users ask the chatbot about most">Popular Topics</SectionHeading>
          <div className="space-y-3">
            {POPULAR_TOPICS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700">{t.name}</span>
                  <span className="text-xs font-bold text-indigo-600">{t.pct}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${t.pct}%` }}
                    transition={{ delay: i * 0.1, duration: 0.7 }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, #6366f1 0%, #818cf8 100%)`,
                      opacity: 1 - i * 0.08,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalyticsTab() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('overview');

  return (
    <div className="space-y-6">
      {/* Top bar — sub-tab navigation + date filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <SubTabPills value={subTab} onChange={(v) => setSubTab(v)} />
        <DatePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {subTab === 'overview'    && <OverviewTab   range={dateRange} />}
          {subTab === 'traffic'     && <TrafficTab    range={dateRange} />}
          {subTab === 'pages'       && <PagesTab />}
          {subTab === 'behavior'    && <BehaviorTab />}
          {subTab === 'technology'  && <TechnologyTab />}
          {subTab === 'chatbot'     && <ChatbotTab    range={dateRange} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
