/**
 * ChatbotAnalytics.tsx
 * --------------------
 * Admin-only chatbot analytics dashboard tab.
 *
 * Sections:
 *   1. Overview KPI cards (today's chats, tokens, latency, success rate)
 *   2. Daily usage trend chart (area chart — period selector: 7/30/90 days)
 *   3. Provider & model breakdown tables
 *   4. API key health grid (status badges — no key values ever shown)
 *   5. Query category distribution (pie chart + table)
 *   6. Recent activity feed (no PII, no message content)
 *   7. Auto-refresh every 30 seconds
 *
 * Security:
 *   - Sends JWT Bearer token on every request (same as rest of Admin.tsx)
 *   - No key values displayed — only "Groq Key 01" style labels
 *   - No user PII rendered anywhere
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import {
  MessageSquare, Zap, Clock, TrendingUp, AlertCircle, CheckCircle,
  RefreshCw, Server, Database, Activity, ShieldAlert, ChevronRight,
  BarChart2, Cpu, Globe, Loader2,
} from 'lucide-react';
import { getApiUrl } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  today_requests: number;
  today_successful: number;
  today_failed: number;
  today_input_tokens: number;
  today_output_tokens: number;
  today_total_tokens: number;
  today_avg_latency_ms: number | null;
  today_success_rate: number | null;
  today_fallbacks: number;
  today_rate_limited: number;
  total_requests: number;
  total_tokens: number;
  groq_keys_total: number;
  gemini_keys_total: number;
  provider_pool_ready: boolean;
}

interface DailyPoint {
  date: string;
  total_requests: number;
  successful: number;
  failed: number;
  rate_limited: number;
  fallbacks: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  groq_requests: number;
  gemini_requests: number;
  avg_latency_ms: number | null;
}

interface ProviderSummary {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  rate_limits: number;
  fallbacks: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
}

interface ModelSummary {
  provider: string;
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  failures: number;
  avg_latency_ms: number | null;
}

interface KeyHealth {
  label: string;
  provider: string;
  key_idx: number;
  status: string;
  requests_today: number;
  successes_today: number;
  failures_today: number;
  rate_limits_today: number;
  tokens_in_today: number;
  tokens_out_today: number;
  last_used: string | null;
}

interface ActivityEntry {
  id: number;
  created_at: string;
  request_type: string;
  provider: string | null;
  model: string | null;
  key_label: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number | null;
  status: string;
  fallback_used: boolean;
}

interface CategoryBreakdown {
  knowledge: number;
  navigation: number;
  greeting: number;
  out_of_scope: number;
  restricted: number;
  no_answer: number;
  error: number;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: 'Today', days: 1 },
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const CATEGORY_COLORS: Record<string, string> = {
  knowledge:    '#6366f1',
  navigation:   '#22c55e',
  greeting:     '#f59e0b',
  out_of_scope: '#ef4444',
  restricted:   '#8b5cf6',
  no_answer:    '#64748b',
  error:        '#dc2626',
};

const PROVIDER_COLORS: Record<string, string> = {
  groq:   '#f97316',
  gemini: '#3b82f6',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  healthy:      { label: 'Healthy',      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',  dot: 'bg-emerald-500' },
  degraded:     { label: 'Degraded',     color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',      dot: 'bg-amber-400'   },
  rate_limited: { label: 'Rate Limited', color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',    dot: 'bg-orange-500'  },
  error:        { label: 'Error',        color: 'text-red-700',     bg: 'bg-red-50 border-red-200',          dot: 'bg-red-500'     },
  cooling:      { label: 'Cooling',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',        dot: 'bg-blue-400'    },
  unknown:      { label: 'Unknown',      color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200',      dot: 'bg-slate-400'   },
};

const REQ_TYPE_LABELS: Record<string, string> = {
  knowledge:    'AI Club Question',
  navigation:   'Navigation',
  greeting:     'Greeting',
  out_of_scope: 'Out of Scope',
  restricted:   'Restricted',
  no_answer:    'No Answer',
  error:        'Error',
};

// ─── Helper components ────────────────────────────────────────────────────────

const Pill = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const StatCard = ({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3"
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ?? 'bg-indigo-50 text-indigo-600'}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-extrabold font-display text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  </motion.div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4">{children}</h3>
);

const fmt = (n: number) => n.toLocaleString();
const fmtMs = (ms: number | null) => ms == null ? '—' : `${ms.toFixed(0)} ms`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  getAuthHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

export default function ChatbotAnalytics({ getAuthHeaders }: Props) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [keys, setKeys] = useState<KeyHealth[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown | null>(null);
  const [period, setPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (days = period) => {
    setError(null);
    try {
      const headers = getAuthHeaders();
      const opts = { headers, credentials: 'include' as const };

      const [ovRes, usRes, prRes, kyRes, acRes, caRes] = await Promise.all([
        fetch(getApiUrl('/api/admin/chatbot/overview'), opts),
        fetch(getApiUrl(`/api/admin/chatbot/usage?days=${days}`), opts),
        fetch(getApiUrl(`/api/admin/chatbot/providers?days=${days}`), opts),
        fetch(getApiUrl('/api/admin/chatbot/keys'), opts),
        fetch(getApiUrl('/api/admin/chatbot/activity?limit=50'), opts),
        fetch(getApiUrl(`/api/admin/chatbot/categories?days=${days}`), opts),
      ]);

      if (ovRes.status === 401 || ovRes.status === 403) {
        setError('You do not have permission to view chatbot analytics.');
        setLoading(false);
        return;
      }

      const [ov, us, pr, ky, ac, ca] = await Promise.all([
        ovRes.json(), usRes.json(), prRes.json(),
        kyRes.json(), acRes.json(), caRes.json(),
      ]);

      setOverview(ov);
      setDaily(us.data ?? []);
      setProviders(pr.providers ?? []);
      setModels(pr.models ?? []);
      setKeys(ky.keys ?? []);
      setActivity(ac.events ?? []);
      setCategories(ca.categories ?? null);
      setLastRefresh(new Date());
    } catch (e) {
      setError('Failed to load analytics data. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, period]);

  useEffect(() => {
    setLoading(true);
    fetchAll(period);
  }, [period]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchAll(period), 30_000);
    return () => clearInterval(interval);
  }, [fetchAll, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-indigo-500 mr-3" size={24} />
        <span className="text-sm text-slate-500">Loading analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <ShieldAlert size={32} className="text-red-500" />
        <p className="text-sm font-semibold text-slate-700">{error}</p>
      </div>
    );
  }

  // ── Category pie data ────────────────────────────────────────────────────
  const catData = categories
    ? Object.entries(categories)
        .filter(([k]) => k !== 'total')
        .map(([k, v]) => ({ name: REQ_TYPE_LABELS[k] ?? k, value: v as number, key: k }))
        .filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-8 pb-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 font-display">Chatbot Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            NeuralNode — production operations dashboard
            {lastRefresh && (
              <span className="ml-2 text-slate-400">· Last updated {fmtTime(lastRefresh.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAll(period); }}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ── Provider pool status banner ───────────────────────────────── */}
      {overview && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold ${
          overview.provider_pool_ready
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${overview.provider_pool_ready ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
          {overview.provider_pool_ready
            ? `Provider pool online — ${overview.groq_keys_total} Groq key${overview.groq_keys_total !== 1 ? 's' : ''} + ${overview.gemini_keys_total} Gemini key${overview.gemini_keys_total !== 1 ? 's' : ''} loaded`
            : 'Provider pool OFFLINE — no API keys configured'}
        </div>
      )}

      {/* ── Period selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.days}
            onClick={() => setPeriod(opt.days)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              period === opt.days
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            icon={<MessageSquare size={16} />}
            label="Chats Today"
            value={fmt(overview.today_requests)}
            sub={`${fmt(overview.total_requests)} all-time`}
            accent="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            icon={<Zap size={16} />}
            label="Tokens Today"
            value={fmt(overview.today_total_tokens)}
            sub={`In ${fmt(overview.today_input_tokens)} / Out ${fmt(overview.today_output_tokens)}`}
            accent="bg-amber-50 text-amber-600"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Success Rate"
            value={overview.today_success_rate != null ? `${overview.today_success_rate.toFixed(1)}%` : '—'}
            sub={`${fmt(overview.today_successful)} ok / ${fmt(overview.today_failed)} failed`}
            accent="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={<Clock size={16} />}
            label="Avg Latency"
            value={fmtMs(overview.today_avg_latency_ms)}
            sub="today"
            accent="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={<Activity size={16} />}
            label="Fallbacks"
            value={fmt(overview.today_fallbacks)}
            sub={`${fmt(overview.today_rate_limited)} rate-limits`}
            accent="bg-orange-50 text-orange-600"
          />
        </div>
      )}

      {/* ── Daily usage chart ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <SectionTitle>Daily Chat Volume</SectionTitle>
        {daily.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">No data for this period yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}
                labelFormatter={fmtDate}
              />
              <Area type="monotone" dataKey="total_requests" name="Total" stroke="#6366f1" fill="url(#gradTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" fill="url(#gradFailed)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Daily token chart ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <SectionTitle>Daily Token Usage</SectionTitle>
        {daily.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">No data for this period yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={daily.length > 20 ? 6 : 12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={n => n >= 1000 ? `${(n/1000).toFixed(0)}k` : n} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                labelFormatter={fmtDate}
              />
              <Bar dataKey="input_tokens"  name="Input"  fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="output_tokens" name="Output" fill="#22c55e" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Provider + Model tables ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Provider breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <SectionTitle>Provider Usage ({period}-day)</SectionTitle>
          {providers.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No provider data yet</p>
          ) : (
            <div className="space-y-3">
              {providers.map(p => (
                <div key={p.provider} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PROVIDER_COLORS[p.provider] ?? '#94a3b8' }}
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-800 capitalize">{p.provider}</p>
                      <p className="text-[10px] text-slate-500">{fmt(p.requests)} requests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-700">{fmt(p.total_tokens)} tokens</p>
                    <p className="text-[10px] text-slate-400">
                      {p.success_rate != null ? `${p.success_rate.toFixed(1)}% ok` : '—'} · {fmtMs(p.avg_latency_ms)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Model breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <SectionTitle>Model Usage ({period}-day)</SectionTitle>
          {models.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No model data yet</p>
          ) : (
            <div className="space-y-2">
              {models.map(m => (
                <div key={`${m.provider}/${m.model}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-semibold text-slate-800 truncate">{m.model}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{m.provider} · {fmt(m.requests)} reqs</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-xs font-semibold text-slate-700">{fmt(m.total_tokens)} tok</p>
                    <p className="text-[10px] text-slate-400">{m.failures} fails · {fmtMs(m.avg_latency_ms)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── API Key Health ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <SectionTitle>API Key Health (Today)</SectionTitle>
        {keys.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No key data available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {keys.map(k => (
              <div
                key={k.label}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{k.label}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{k.provider}</p>
                  </div>
                  <Pill status={k.status} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                    <p className="text-slate-400">Requests</p>
                    <p className="font-bold text-slate-700">{fmt(k.requests_today)}</p>
                  </div>
                  <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                    <p className="text-slate-400">Success</p>
                    <p className="font-bold text-emerald-600">{fmt(k.successes_today)}</p>
                  </div>
                  <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                    <p className="text-slate-400">Tokens In</p>
                    <p className="font-bold text-slate-700">{fmt(k.tokens_in_today)}</p>
                  </div>
                  <div className="bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                    <p className="text-slate-400">Tokens Out</p>
                    <p className="font-bold text-slate-700">{fmt(k.tokens_out_today)}</p>
                  </div>
                </div>
                {k.last_used && (
                  <p className="text-[10px] text-slate-400">
                    Last used {new Date(k.last_used).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Query Categories ───────────────────────────────────────────── */}
      {categories && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <SectionTitle>Query Categories ({period}-day)</SectionTitle>
            {catData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={catData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catData.map(entry => (
                      <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmt(v), '']}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ fontSize: 10, color: '#64748b' }}>{value}</span>}
                    iconSize={8}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category counts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <SectionTitle>Breakdown</SectionTitle>
            <div className="space-y-2">
              {Object.entries(categories)
                .filter(([k]) => k !== 'total')
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([k, v]) => {
                  const pct = categories.total > 0 ? ((v as number) / categories.total * 100) : 0;
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[k] ?? '#94a3b8' }} />
                      <span className="text-xs text-slate-600 min-w-[130px]">{REQ_TYPE_LABELS[k] ?? k}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: CATEGORY_COLORS[k] ?? '#94a3b8' }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-8 text-right">{fmt(v as number)}</span>
                    </div>
                  );
                })}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total</span>
                <span className="text-xs font-bold text-slate-800">{fmt(categories.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Activity ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <SectionTitle>Recent Activity</SectionTitle>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No activity recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Time', 'Type', 'Provider', 'Model', 'Key', 'In Tok', 'Out Tok', 'Latency', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                  >
                    <td className="px-3 py-2 text-slate-500 font-mono whitespace-nowrap">{fmtTime(e.created_at)}</td>
                    <td className="px-3 py-2">
                      <span className="font-semibold text-slate-700">{REQ_TYPE_LABELS[e.request_type] ?? e.request_type}</span>
                    </td>
                    <td className="px-3 py-2 capitalize text-slate-600">{e.provider ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-slate-500 max-w-[120px] truncate">{e.model ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{e.key_label ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt(e.input_tokens)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt(e.output_tokens)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{fmtMs(e.latency_ms)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
                        e.status === 'success' || e.status === 'fallback'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : e.status === 'rate_limited'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {e.fallback_used && <span title="Fallback used">↪</span>}
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
