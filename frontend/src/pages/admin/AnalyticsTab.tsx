import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Users, Eye, Clock, BarChart2,
  Monitor, Bot, Zap, MessageSquare,
  Activity, MousePointer, ChevronUp, ChevronDown,
  RefreshCw, AlertCircle, CheckCircle, XCircle,
  Calendar, Hash, Cpu, Globe, Smartphone, Tablet,
  ChevronRight, X,
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  useDashboardStats,
  useChatbotOverview,
  useChatbotUsage,
  useChatbotProviders,
  useChatbotCategories,
  useChatbotActivity,
  useAnalyticsOverview,
  useAnalyticsTraffic,
  useAnalyticsHourly,
  useAnalyticsPages,
  useAnalyticsActions,
  useAnalyticsDevices,
  useAnalyticsSessions,
  useAnalyticsSessionTimeline,
  SessionRow,
} from './queries';

// ─── Types ──────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d';
type AnalyticsSubTab = 'overview' | 'traffic' | 'pages' | 'behavior' | 'technology' | 'chatbot';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000    ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  : `${n}`;

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1000    ? `${(n / 1000).toFixed(1)}K`
  : `${n}`;

const fmtDuration = (sec: number | null | undefined): string => {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const rangeToDays: Record<DateRange, number> = { '7d': 7, '30d': 30, '90d': 90 };

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-display font-bold text-slate-900 text-base">{children}</h3>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

function HBar({ label, pct, color = '#6366f1', value, delay = 0 }: {
  label: string; pct: number; color?: string; value?: string; delay?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 font-medium w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.7, ease: 'easeOut' }}
          style={{ backgroundColor: color }}
          className="h-full rounded-full"
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-12 text-right shrink-0">{value ?? `${pct}%`}</span>
    </div>
  );
}

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

function DatePicker({ value, onChange }: { value: DateRange; onChange: (v: DateRange) => void }) {
  const options: { label: string; value: DateRange }[] = [
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

function SubTabPills({ value, onChange }: { value: AnalyticsSubTab; onChange: (v: AnalyticsSubTab) => void }) {
  const tabs: { label: string; value: AnalyticsSubTab; icon: React.ElementType }[] = [
    { label: 'Overview',   value: 'overview',   icon: BarChart2 },
    { label: 'Traffic',    value: 'traffic',    icon: TrendingUp },
    { label: 'Pages',      value: 'pages',      icon: Eye },
    { label: 'Behavior',   value: 'behavior',   icon: MousePointer },
    { label: 'Technology', value: 'technology', icon: Monitor },
    { label: 'Chatbot',    value: 'chatbot',    icon: Bot },
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

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-2 animate-pulse">
      <div className="w-8 h-8 rounded-xl bg-slate-100" />
      <div className="h-2.5 w-20 bg-slate-100 rounded-full mt-2" />
      <div className="h-6 w-16 bg-slate-100 rounded-full" />
      <span className="text-[10px] text-slate-300 font-mono">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
      <Activity size={28} className="text-slate-200" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon: Icon, color, bg, index }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string; index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">{title}</p>
      <p className="font-display font-extrabold text-slate-900 text-2xl mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: dashboard, isLoading, isError } = useDashboardStats();
  const { data: traffic } = useAnalyticsOverview(days);

  const statusCards = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        title: 'Total Events',
        value: fmt(dashboard.total_events),
        icon: Calendar,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        sub: 'All time',
      },
      {
        title: 'Total Registrations',
        value: fmt(dashboard.total_registrations),
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        sub: 'All time',
      },
      {
        title: 'Active Events',
        value: fmt(dashboard.active_events),
        icon: Activity,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        sub: 'Registration open',
      },
      {
        title: 'Upcoming Events',
        value: fmt(dashboard.upcoming_events),
        icon: TrendingUp,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        sub: 'Not yet open',
      },
    ];
  }, [dashboard]);

  const trafficCards = useMemo(() => {
    if (!traffic) return [];
    return [
      { title: 'Unique Visitors', value: fmt(traffic.unique_visitors), icon: Users,      color: 'text-violet-600', bg: 'bg-violet-50', sub: `Last ${days} days` },
      { title: 'Sessions',        value: fmt(traffic.sessions),        icon: Globe,      color: 'text-sky-600',    bg: 'bg-sky-50',    sub: `Last ${days} days` },
      { title: 'Page Views',      value: fmt(traffic.page_views),      icon: Eye,        color: 'text-teal-600',   bg: 'bg-teal-50',   sub: `Last ${days} days` },
      { title: 'Avg Session',     value: fmtDuration(traffic.avg_session_duration), icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Average duration' },
    ];
  }, [traffic, days]);

  // Status breakdown for pie chart
  const pieData = useMemo(() => {
    if (!dashboard?.status_breakdown) return [];
    const b = dashboard.status_breakdown;
    return [
      { name: 'Active',    value: b.registration_open   ?? 0, color: '#10b981' },
      { name: 'Upcoming',  value: b.upcoming             ?? 0, color: '#f59e0b' },
      { name: 'Closed',    value: b.registration_closed  ?? 0, color: '#6366f1' },
      { name: 'Completed', value: b.completed            ?? 0, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [dashboard]);

  // Recent registrations from dashboard
  const recent = useMemo(() => dashboard?.recent_registrations ?? [], [dashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Events', 'Registrations', 'Active', 'Upcoming'].map(l => <LoadingCard key={l} label={l} />)}
        </div>
      </div>
    );
  }

  if (isError) return <ErrorBanner message="Failed to load dashboard stats. Please try again." />;

  return (
    <div className="space-y-6">
      {/* Event KPI Cards */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3">Events</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statusCards.map((c, i) => (
            <KpiCard key={c.title} {...c} index={i} />
          ))}
        </div>
      </div>

      {/* Traffic KPI Cards */}
      {traffic && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-3">Web Traffic (last {days} days)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {trafficCards.map((c, i) => (
              <KpiCard key={c.title} {...c} index={i + 4} />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Breakdown by current status">Event Status Distribution</SectionHeading>
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" stroke="none">
                    {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 w-full">
                {pieData.map((d, i) => (
                  <HBar key={d.name} label={d.name} pct={Math.round((d.value / (dashboard?.total_events || 1)) * 100)} color={d.color} value={`${d.value}`} delay={i * 0.1} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No events found." />
          )}
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub="Last 5 registrations across all events">Recent Registrations</SectionHeading>
          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map((reg: any, i: number) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-extrabold text-indigo-600 shrink-0">
                    {(reg.user_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{reg.user_name || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{reg.event_title || 'Unknown Event'}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(reg.registered_at || reg.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState label="No registrations yet." />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Traffic Tab ──────────────────────────────────────────────────────────────

function TrafficTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: overview, isLoading: loadingOverview, isError } = useAnalyticsOverview(days);
  const { data: daily,    isLoading: loadingDaily }    = useAnalyticsTraffic(days);
  const { data: hourly,   isLoading: loadingHourly }   = useAnalyticsHourly(Math.min(days, 30));

  const dailyChart = useMemo(() =>
    (daily ?? []).map(d => ({
      label:    new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      visitors: d.unique_visitors,
      sessions: d.sessions,
      views:    d.page_views,
    })),
    [daily]
  );

  const hourlyChart = useMemo(() =>
    (hourly ?? []).map(h => ({
      label: `${String(h.hour).padStart(2, '0')}:00`,
      visitors: h.visitors,
      events:   h.events,
    })),
    [hourly]
  );

  const kpiCards = useMemo(() => {
    if (!overview) return [];
    return [
      { title: 'Unique Visitors', value: fmt(overview.unique_visitors),   icon: Users,    color: 'text-violet-600', bg: 'bg-violet-50' },
      { title: 'Sessions',        value: fmt(overview.sessions),          icon: Globe,    color: 'text-sky-600',    bg: 'bg-sky-50'    },
      { title: 'Page Views',      value: fmt(overview.page_views),        icon: Eye,      color: 'text-teal-600',   bg: 'bg-teal-50'   },
      { title: 'Avg Session',     value: fmtDuration(overview.avg_session_duration), icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
      { title: 'Bounce Rate',     value: overview.bounce_rate != null ? `${overview.bounce_rate.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];
  }, [overview]);

  if (loadingOverview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <LoadingCard key={i} label="Loading…" />)}
        </div>
      </div>
    );
  }

  if (isError) return <ErrorBanner message="Failed to load traffic data. Make sure the backend analytics module is running." />;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((c, i) => (
          <KpiCard key={c.title} {...c} sub={`Last ${days} days`} index={i} />
        ))}
      </div>

      {/* Daily area chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub={`Visitor & session trend — last ${days} days`}>Visitor Traffic</SectionHeading>
        {loadingDaily ? (
          <div className="h-56 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={22} /></div>
        ) : dailyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-vis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="grad-ses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={fmt} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#6366f1" strokeWidth={2} fill="url(#grad-vis)" dot={false} />
              <Area type="monotone" dataKey="sessions"  name="Sessions" stroke="#0ea5e9" strokeWidth={1.5} fill="url(#grad-ses)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label={`No visitor data for the last ${days} days. The tracker starts collecting from now.`} />
        )}
      </div>

      {/* Hourly heatmap */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub="When are students using the website? (avg over selected period)">Peak Usage Hours</SectionHeading>
        {loadingHourly ? (
          <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={22} /></div>
        ) : hourlyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="visitors" name="Visitors" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No hourly data yet." />
        )}
      </div>
    </div>
  );
}

// ─── Pages Tab ────────────────────────────────────────────────────────────────

function PagesTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: pages, isLoading, isError } = useAnalyticsPages(days);

  const maxViews = useMemo(() => Math.max(...(pages ?? []).map(p => p.views), 1), [pages]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) return <ErrorBanner message="Failed to load page stats." />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <SectionHeading sub={`Top pages by views — last ${days} days`}>Most Visited Pages</SectionHeading>
        {(pages ?? []).length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 pb-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Views</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-20">Avg Time</span>
            </div>
            {(pages ?? []).map((p, i) => (
              <motion.div
                key={p.page}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group"
              >
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center mb-1">
                  <span className="text-xs font-medium text-slate-700 truncate font-mono">{p.page}</span>
                  <span className="text-xs font-bold text-slate-800 text-right">{p.views.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 text-right w-20">{fmtDuration(p.avg_time_sec)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.views / maxViews) * 100}%` }}
                    transition={{ delay: i * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-indigo-500"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState label={`No page view data for the last ${days} days.`} />
        )}
      </div>
    </div>
  );
}

// ─── Behavior Tab ─────────────────────────────────────────────────────────────

function SessionTimelineModal({ session, onClose }: { session: SessionRow; onClose: () => void }) {
  const { data, isLoading } = useAnalyticsSessionTimeline(session.session_id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-800 text-sm">Session Timeline</p>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">#{session.session_id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={13} className="text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-indigo-400" size={20} /></div>
          ) : (data?.events ?? []).length > 0 ? (
            <div className="space-y-2">
              {data!.events.map((e, i) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    {i < data!.events.length - 1 && <div className="w-px h-full bg-slate-200 flex-1 mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700">{e.event_type}</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(e.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {e.page && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{e.page}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No events recorded for this session." />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function BehaviorTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: actions, isLoading: loadingActions, isError } = useAnalyticsActions(days);
  const { data: sessions, isLoading: loadingSessions } = useAnalyticsSessions(days, 20);
  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);

  const maxCount = useMemo(() => Math.max(...(actions ?? []).map(a => a.count), 1), [actions]);

  const actionColors: Record<string, string> = {
    PAGE_VIEW: '#6366f1',
    CHATBOT_OPEN: '#0ea5e9',
    CHATBOT_MESSAGE: '#0284c7',
    EVENT_VIEW: '#10b981',
    EVENT_REGISTER_CLICK: '#f59e0b',
    REGISTRATION_COMPLETED: '#22c55e',
    PROJECT_VIEW: '#8b5cf6',
    RESOURCE_VIEW: '#f97316',
    SEARCH: '#94a3b8',
  };

  if (isError) return <ErrorBanner message="Failed to load behavior data." />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`What users did — last ${days} days`}>User Actions</SectionHeading>
          {loadingActions ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : (actions ?? []).length > 0 ? (
            <div className="space-y-3">
              {(actions ?? []).map((a, i) => (
                <HBar
                  key={a.event_type}
                  label={a.event_type.replace(/_/g, ' ')}
                  pct={Math.round((a.count / maxCount) * 100)}
                  color={actionColors[a.event_type] ?? '#6366f1'}
                  value={a.count.toLocaleString()}
                  delay={i * 0.05}
                />
              ))}
            </div>
          ) : (
            <EmptyState label="No user actions recorded yet." />
          )}
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Most recent sessions — last ${days} days`}>Recent Sessions</SectionHeading>
          {loadingSessions ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (sessions ?? []).length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(sessions ?? []).map((s, i) => (
                <motion.button
                  key={s.session_id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setActiveSession(s)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-slate-600 truncate">#{s.session_id.slice(0, 12)}…</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {s.page_views} page views · {fmtDuration(s.duration_sec)} · {s.device_type ?? 'unknown'}
                    </p>
                  </div>
                  <ChevronRight size={12} className="text-slate-400 shrink-0" />
                </motion.button>
              ))}
            </div>
          ) : (
            <EmptyState label="No sessions recorded yet." />
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeSession && (
          <SessionTimelineModal session={activeSession} onClose={() => setActiveSession(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Technology Tab ───────────────────────────────────────────────────────────

function TechnologyTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: devices, isLoading, isError } = useAnalyticsDevices(days);

  const devicePieData = useMemo(() => {
    const colors: Record<string, string> = { desktop: '#6366f1', mobile: '#0ea5e9', tablet: '#10b981', unknown: '#94a3b8' };
    return (devices?.devices ?? []).map(d => ({
      name:  d.device_type.charAt(0).toUpperCase() + d.device_type.slice(1),
      value: d.count,
      pct:   d.pct,
      color: colors[d.device_type] ?? '#94a3b8',
    }));
  }, [devices]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-4" />
            <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) return <ErrorBanner message="Failed to load device data." />;

  const deviceIcon = (type: string) => {
    if (type === 'Mobile') return <Smartphone size={13} />;
    if (type === 'Tablet') return <Tablet size={13} />;
    return <Monitor size={13} />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Device types — last ${days} days`}>Devices</SectionHeading>
          {devicePieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={devicePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                    {devicePieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 w-full">
                {devicePieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span style={{ color: d.color }}>{deviceIcon(d.name)}</span>
                    <HBar label={d.name} pct={d.pct} color={d.color} value={`${d.pct}%`} delay={i * 0.1} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No session data yet." />
          )}
        </div>

        {/* Browser breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Browser distribution — last ${days} days`}>Browsers</SectionHeading>
          {(devices?.browsers ?? []).length > 0 ? (
            <div className="space-y-3">
              {(devices?.browsers ?? []).map((b, i) => {
                const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#94a3b8'];
                return (
                  <HBar
                    key={b.browser}
                    label={b.browser}
                    pct={b.pct}
                    color={colors[i % colors.length]}
                    value={`${b.pct}%`}
                    delay={i * 0.08}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState label="No browser data yet." />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chatbot Tab ──────────────────────────────────────────────────────────────

function ChatbotTab({ range }: { range: DateRange }) {
  const days = rangeToDays[range];
  const { data: overview, isLoading: loadingOverview, isError: errorOverview } = useChatbotOverview();
  const { data: usage, isLoading: loadingUsage } = useChatbotUsage(days);
  const { data: providers, isLoading: loadingProviders } = useChatbotProviders(days);
  const { data: categories } = useChatbotCategories(days);
  const { data: activity, isLoading: loadingActivity } = useChatbotActivity(20);

  // Chart data for daily usage
  const usageChartData = useMemo(() =>
    (usage?.data ?? []).map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      requests: d.total_requests,
      successful: d.successful,
      failed: d.failed,
      tokens: d.total_tokens,
      groq: d.groq_requests,
      gemini: d.gemini_requests,
    })),
    [usage]
  );

  // Provider pie data
  const providerPieData = useMemo(() => {
    if (!providers?.providers) return [];
    return providers.providers.map((p, i) => ({
      name: p.provider.charAt(0).toUpperCase() + p.provider.slice(1),
      value: p.requests,
      color: i === 0 ? '#6366f1' : i === 1 ? '#0ea5e9' : '#f97316',
    }));
  }, [providers]);

  // Category data for bar chart
  const categoryData = useMemo(() => {
    if (!categories?.categories) return [];
    const c = categories.categories;
    return [
      { name: 'Knowledge', value: c.knowledge,   color: '#6366f1' },
      { name: 'Navigation', value: c.navigation, color: '#0ea5e9' },
      { name: 'Greeting',   value: c.greeting,   color: '#10b981' },
      { name: 'Off-topic',  value: c.out_of_scope, color: '#f59e0b' },
      { name: 'No Answer',  value: c.no_answer,  color: '#94a3b8' },
      { name: 'Error',      value: c.error,      color: '#f43f5e' },
    ].filter(d => d.value > 0);
  }, [categories]);

  const kpiCards = useMemo(() => {
    if (!overview) return [];
    return [
      { title: "Today's Requests",  value: overview.today_requests.toLocaleString(),   icon: Zap,          color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { title: 'Successful',        value: overview.today_successful.toLocaleString(), icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { title: 'Failed',            value: overview.today_failed.toLocaleString(),     icon: XCircle,      color: 'text-rose-600',    bg: 'bg-rose-50'   },
      { title: 'Success Rate',      value: overview.today_success_rate != null ? `${overview.today_success_rate.toFixed(1)}%` : '—', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50' },
      { title: "Today's Tokens",    value: fmtTokens(overview.today_total_tokens),     icon: Cpu,          color: 'text-purple-600',  bg: 'bg-purple-50' },
      { title: 'Avg Latency',       value: overview.today_avg_latency_ms != null ? `${Math.round(overview.today_avg_latency_ms)}ms` : '—', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Fallbacks',         value: overview.today_fallbacks.toLocaleString(), icon: RefreshCw,    color: 'text-amber-600',   bg: 'bg-amber-50'  },
      { title: 'All-time Requests', value: fmt(overview.total_requests),              icon: Hash,         color: 'text-slate-600',   bg: 'bg-slate-100' },
    ];
  }, [overview]);

  if (loadingOverview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <LoadingCard key={i} label="Loading…" />)}
        </div>
      </div>
    );
  }

  if (errorOverview) return <ErrorBanner message="Failed to load chatbot analytics. Make sure the backend is running." />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((c, i) => {
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
                <Icon size={14} className={c.color} />
              </div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider font-mono leading-tight">{c.title}</p>
              <p className="font-display font-extrabold text-slate-900 text-lg mt-0.5">{c.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Provider pool health */}
      {overview && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold ${overview.provider_pool_ready ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          <span className={`w-2 h-2 rounded-full ${overview.provider_pool_ready ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          Provider pool {overview.provider_pool_ready ? 'is healthy' : 'has issues'} — {overview.groq_keys_total} Groq key{overview.groq_keys_total !== 1 ? 's' : ''}, {overview.gemini_keys_total} Gemini key{overview.gemini_keys_total !== 1 ? 's' : ''} configured.
          <span className="ml-auto font-mono text-[10px] opacity-60">All-time tokens: {fmtTokens(overview.total_tokens)}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily usage area chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Daily request volume — last ${days} days`}>Request Volume</SectionHeading>
          {loadingUsage ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={22} /></div>
          ) : usageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={usageChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-req" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grad-ok" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="requests" name="Total" stroke="#6366f1" strokeWidth={2} fill="url(#grad-req)" dot={false} />
                <Area type="monotone" dataKey="successful" name="Successful" stroke="#10b981" strokeWidth={1.5} fill="url(#grad-ok)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No usage data for this period." />
          )}
        </div>

        {/* Provider breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Which AI provider was used — last ${days} days`}>Provider Split</SectionHeading>
          {loadingProviders ? (
            <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={22} /></div>
          ) : providerPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={providerPieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" stroke="none">
                    {providerPieData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {providers?.providers.map((p, i) => {
                  const total = providers.providers.reduce((a, x) => a + x.requests, 0);
                  const pct = total > 0 ? Math.round((p.requests / total) * 100) : 0;
                  const color = i === 0 ? '#6366f1' : i === 1 ? '#0ea5e9' : '#f97316';
                  return (
                    <HBar
                      key={p.provider}
                      label={p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                      pct={pct}
                      color={color}
                      value={`${p.requests.toLocaleString()} req`}
                      delay={i * 0.08}
                    />
                  );
                })}
              </div>
              {/* Provider detail cards */}
              <div className="mt-4 space-y-2">
                {providers?.providers.map((p, i) => (
                  <div key={p.provider} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-slate-700 capitalize">{p.provider}</span>
                      {p.success_rate != null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.success_rate >= 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.success_rate.toFixed(1)}% success
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                      <div><span className="font-bold text-slate-700">{p.failures}</span> fails</div>
                      <div><span className="font-bold text-slate-700">{p.rate_limits}</span> rate lmts</div>
                      <div><span className="font-bold text-slate-700">{p.avg_latency_ms != null ? `${Math.round(p.avg_latency_ms)}ms` : '—'}</span> avg</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState label="No provider data for this period." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`What users asked the chatbot — last ${days} days`}>Query Categories</SectionHeading>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={categoryData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Queries" radius={[4, 4, 0, 0]}>
                    {categoryData.map(d => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {categoryData.map((d, i) => {
                  const total = categories?.categories.total ?? 1;
                  return (
                    <HBar key={d.name} label={d.name} pct={Math.round((d.value / total) * 100)} color={d.color} value={d.value.toLocaleString()} delay={i * 0.05} />
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState label="No category data for this period." />
          )}
        </div>

        {/* Recent activity feed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <SectionHeading sub="Live chatbot request log">Recent Activity</SectionHeading>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          {loadingActivity ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={20} /></div>
          ) : (activity?.events ?? []).length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {activity!.events.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${e.status === 'success' ? 'bg-emerald-500' : e.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-700 truncate capitalize">{e.provider ?? 'unknown'} / {e.model ?? '—'}</span>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">{e.latency_ms != null ? `${e.latency_ms}ms` : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-slate-400">{fmtTokens(e.input_tokens + e.output_tokens)} tokens</span>
                      {e.fallback_used && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-mono">fallback</span>}
                      <span className="text-[9px] text-slate-300 ml-auto font-mono">{new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState label="No recent chatbot activity." />
          )}
        </div>
      </div>

      {/* Token usage trend */}
      {usageChartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <SectionHeading sub={`Daily token consumption — last ${days} days`}>Token Usage Trend</SectionHeading>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={usageChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-tok-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={fmtTokens} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="tokens" name="Total Tokens" stroke="#6366f1" strokeWidth={2} fill="url(#grad-tok-in)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AnalyticsTab() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('overview');

  const showDatePicker = true; // all tabs now use the date range

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <SubTabPills value={subTab} onChange={v => setSubTab(v)} />
        {showDatePicker && <DatePicker value={dateRange} onChange={setDateRange} />}
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
          {subTab === 'overview'   && <OverviewTab   range={dateRange} />}
          {subTab === 'traffic'    && <TrafficTab    range={dateRange} />}
          {subTab === 'pages'      && <PagesTab      range={dateRange} />}
          {subTab === 'behavior'   && <BehaviorTab   range={dateRange} />}
          {subTab === 'technology' && <TechnologyTab range={dateRange} />}
          {subTab === 'chatbot'    && <ChatbotTab    range={dateRange} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
