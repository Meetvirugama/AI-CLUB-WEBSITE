import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, ClipboardList, Zap, TrendingUp, Plus, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useAdminEvents, RecentRegistration } from './queries';

type AdminTab =
  | 'dashboard' | 'registrations' | 'createEvent' | 'formBuilder'
  | 'manageEvents' | 'manageMembers' | 'pastEvents'
  | 'manageNews' | 'manageWeeklyVeneza' | 'chatbotAnalytics' | 'analytics';

interface DashboardTabProps {
  setActiveTab: (tab: AdminTab) => void;
  setSelectedEventId: (id: number) => void;
  setBuilderEventId: (id: number) => void;
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, gradient, glow, delay = 0,
}: {
  label: string; value: number | string; icon: React.ReactNode;
  gradient: string; glow: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col justify-between bg-white border border-slate-200 shadow-sm"
    >
      {/* Glow accent */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-2xl" style={{ background: glow }} />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: gradient, boxShadow: `0 4px 14px ${glow}60` }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">{label}</p>
        <p className="text-3xl font-extrabold text-slate-900 leading-none">{value}</p>
      </div>
    </motion.div>
  );
}

export default function DashboardTab({ setActiveTab, setSelectedEventId, setBuilderEventId }: DashboardTabProps) {
  const { user } = useAuth();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardStats();
  const { data: events = [] } = useAdminEvents();

  const stats = [
    {
      label: 'Total Events',
      value: loadingMetrics ? '—' : (metrics?.total_events ?? 0),
      icon: <Calendar size={18} className="text-white" />,
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      glow: '#6366f1',
      delay: 0,
    },
    {
      label: 'Total Registrations',
      value: loadingMetrics ? '—' : (metrics?.total_registrations ?? 0),
      icon: <ClipboardList size={18} className="text-white" />,
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      glow: '#10b981',
      delay: 0.07,
    },
    {
      label: 'Active Events',
      value: loadingMetrics ? '—' : (metrics?.active_events ?? 0),
      icon: <Zap size={18} className="text-white" />,
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      glow: '#f59e0b',
      delay: 0.14,
    },
    {
      label: 'Upcoming Events',
      value: loadingMetrics ? '—' : (metrics?.upcoming_events ?? 0),
      icon: <TrendingUp size={18} className="text-white" />,
      gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
      glow: '#3b82f6',
      delay: 0.21,
    },
  ];

  // Safe date formatter — handles both registered_at and created_at
  const fmtDate = (iso: string | undefined | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const initials = (name: string) =>
    name ? name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

  return (
    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-7">

      {/* ── Welcome banner ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-sm border border-indigo-100"
      >
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-[10px] font-mono text-indigo-500 uppercase tracking-widest mb-1">Good day, admin</p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">Welcome back, {user?.name?.split(' ')[0] || 'Administrator'}!</h2>
          <p className="text-sm text-slate-500 mt-1">AI Club DA-IICT Admin Dashboard</p>
        </div>
        <button
          onClick={() => setActiveTab('createEvent')}
          className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all self-start md:self-auto hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
        >
          <Plus size={15} />
          Create Event
        </button>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Two-column content ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent registrations */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-800">Recent Registrations</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-600">LAST 5</span>
          </div>

          {loadingMetrics ? (
            <div className="flex justify-center py-14"><Loader2 className="animate-spin text-indigo-500" size={28} /></div>
          ) : !metrics || metrics.recent_registrations.length === 0 ? (
            <div className="py-14 text-center">
              <ClipboardList size={32} className="mx-auto text-slate-700 mb-3" />
              <p className="text-sm text-slate-600">No registrations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.recent_registrations.map((reg: RecentRegistration, i: number) => (
                <motion.div
                  key={reg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                    style={{ background: `hsl(${(reg.id * 47) % 360}, 60%, 45%)` }}
                  >
                    {initials(reg.user_name || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate">{reg.user_name || 'Unknown'}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      → <span className="text-slate-500">{reg.event_title}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-600 shrink-0 ml-2">{fmtDate(reg.registered_at)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Quick Actions</p>
            </div>
            <div className="p-3 space-y-1.5">
              {[
                { label: 'View Registration Logs', action: () => { if (events.length > 0) { setSelectedEventId(events[0].id); setActiveTab('registrations'); } } },
                { label: 'Manage Form Schemas', action: () => { if (events.length > 0) { setBuilderEventId(events[0].id); setActiveTab('formBuilder'); } } },
                { label: 'Manage Live Events', action: () => setActiveTab('manageEvents') },
              ].map(({ label, action }) => (
                <button key={label} onClick={action}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] font-medium text-slate-700 bg-slate-50 border border-slate-100 hover:text-indigo-600 hover:border-indigo-200 transition-all group"
                >
                  <span>{label}</span>
                  <ChevronRight size={13} className="text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
              <button
                onClick={() => setActiveTab('analytics')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[12px] font-semibold text-indigo-300 transition-all group"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <span>View Analytics Dashboard</span>
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Event status breakdown */}
          {metrics?.status_breakdown && (
            <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Event Status</p>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Registration Open', value: metrics.status_breakdown.registration_open ?? 0, color: '#10b981' },
                  { label: 'Upcoming', value: metrics.status_breakdown.upcoming ?? 0, color: '#3b82f6' },
                  { label: 'Completed', value: metrics.status_breakdown.completed ?? 0, color: '#6b7280' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span className="text-[12px] text-slate-500">{label}</span>
                    </div>
                    <span className="text-[13px] font-bold font-mono text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System status */}
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 8px #10b981' }} />
              <div>
                <p className="text-[12px] font-semibold text-slate-300">All Systems Operational</p>
                <p className="text-[10px] text-slate-600 mt-0.5">API · Database · Analytics</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
