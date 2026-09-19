import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Users, Award, ClipboardList, Zap, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useAdminEvents, RecentRegistration } from './queries';

// ─── The slim ActiveTab type used in Admin.tsx shell ─────────────────────────
type AdminTab =
  | 'dashboard' | 'registrations' | 'createEvent' | 'formBuilder'
  | 'manageEvents' | 'manageMembers' | 'pastEvents'
  | 'manageNews' | 'manageWeeklyVeneza' | 'chatbotAnalytics' | 'analytics';

interface DashboardTabProps {
  setActiveTab: (tab: AdminTab) => void;
  setSelectedEventId: (id: number) => void;
  setBuilderEventId: (id: number) => void;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, color, delay = 0
}: {
  label: string; value: number | string; icon: React.ReactNode;
  color: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`relative overflow-hidden rounded-2xl border p-5 ${color}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-extrabold font-display text-foreground leading-none">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-current/10 text-current shrink-0">
          {icon}
        </div>
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
      icon: <Calendar size={18} />,
      color: 'bg-primary/8 border-primary/20 [&>div>div:last-child]:text-primary',
      delay: 0,
    },
    {
      label: 'Total Registrations',
      value: loadingMetrics ? '—' : (metrics?.total_registrations ?? 0),
      icon: <ClipboardList size={18} />,
      color: 'bg-emerald-500/8 border-emerald-500/20 [&>div>div:last-child]:text-emerald-500',
      delay: 0.05,
    },
    {
      label: 'Active Events',
      value: loadingMetrics ? '—' : (metrics?.active_events ?? 0),
      icon: <Zap size={18} />,
      color: 'bg-amber-500/8 border-amber-500/20 [&>div>div:last-child]:text-amber-500',
      delay: 0.1,
    },
    {
      label: 'Upcoming Events',
      value: loadingMetrics ? '—' : (metrics?.upcoming_events ?? 0),
      icon: <TrendingUp size={18} />,
      color: 'bg-blue-500/8 border-blue-500/20 [&>div>div:last-child]:text-blue-500',
      delay: 0.15,
    },
  ];

  return (
    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">Welcome back, {user?.name || 'Administrator'}!</h3>
          <p className="text-xs text-muted-foreground mt-1">Here is a quick snapshot of what is happening in the AI Club platform today.</p>
        </div>
        <button
          onClick={() => setActiveTab('createEvent')}
          className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 self-start md:self-auto"
        >
          <Plus size={14} />
          Create New Event
        </button>
      </div>

      {/* ── Stats grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color} delay={s.delay} />
        ))}
      </div>

      {/* ── Content grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent registrations */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Recent Registrations</h3>
          {loadingMetrics ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : !metrics || metrics.recent_registrations.length === 0 ? (
            <div className="bg-secondary/15 border border-border/50 rounded-xl p-8 text-center text-xs text-muted-foreground">
              No recent registrations found.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
              {metrics.recent_registrations.map((reg: RecentRegistration) => (
                <div key={reg.id} className="flex items-center justify-between bg-secondary/20 px-4 py-3 rounded-xl border border-border/40 hover:border-primary/20 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-display text-[10px] font-extrabold text-primary border border-primary/10 shrink-0">
                      {reg.user_name ? reg.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{reg.user_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        → <span className="font-semibold text-foreground">{reg.event_title}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-1 rounded-md shrink-0 ml-2">
                    {new Date(reg.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + system status */}
        <div className="space-y-5">
          <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Quick Actions</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  if (events.length > 0) { setSelectedEventId(events[0].id); setActiveTab('registrations'); }
                }}
                className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
              >
                <span>View Registration Logs</span>
                <ChevronRight size={14} className="text-primary" />
              </button>
              <button
                onClick={() => {
                  if (events.length > 0) { setBuilderEventId(events[0].id); setActiveTab('formBuilder'); }
                }}
                className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
              >
                <span>Manage Form Schemas</span>
                <ChevronRight size={14} className="text-primary" />
              </button>
              <button
                onClick={() => setActiveTab('manageEvents')}
                className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
              >
                <span>Manage Live Events</span>
                <ChevronRight size={14} className="text-primary" />
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className="w-full flex items-center justify-between p-3 bg-primary/10 border border-primary/20 hover:border-primary/40 rounded-xl text-left text-xs text-primary font-semibold transition-all"
              >
                <span>View Analytics Dashboard</span>
                <ChevronRight size={14} className="text-primary" />
              </button>
            </div>
          </div>

          {/* Status breakdown */}
          {metrics?.status_breakdown && (
            <div className="bg-secondary/10 border border-border/50 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Event Status</h4>
              {[
                { label: 'Registration Open', value: metrics.status_breakdown.registration_open, color: 'bg-emerald-500' },
                { label: 'Upcoming', value: metrics.status_breakdown.upcoming, color: 'bg-blue-500' },
                { label: 'Completed', value: metrics.status_breakdown.completed, color: 'bg-muted-foreground' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-bold font-mono text-foreground">{value ?? 0}</span>
                </div>
              ))}
            </div>
          )}

          {/* System status */}
          <div className="bg-secondary/10 border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">System</h3>
            <div className="flex gap-2.5 items-start">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-foreground">API Systems Online</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">All services are operational.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
