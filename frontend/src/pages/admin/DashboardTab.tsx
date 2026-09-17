import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats, useAdminEvents } from './queries';
import { Plus, ChevronRight } from 'lucide-react';

interface DashboardTabProps {
  setActiveTab: React.Dispatch<React.SetStateAction<'dashboard' | 'registrations' | 'createEvent' | 'formBuilder' | 'manageEvents' | 'manageMembers' | 'manageProjects' | 'pastEvents' | 'manageAchievements' | 'manageNews' | 'manageResources' | 'manageWeeklyVeneza' | 'chatbotAnalytics'>>;
  setSelectedEventId: (id: number) => void;
  setBuilderEventId: (id: number) => void;
}

export default function DashboardTab({ setActiveTab, setSelectedEventId, setBuilderEventId }: DashboardTabProps) {
  const { user } = useAuth();
  const { data: metrics, isLoading: loadingMetrics } = useDashboardStats();
  const { data: events } = useAdminEvents();

  return (
    <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* Welcome banner */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activity List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">Recent Activity</h3>
          {loadingMetrics ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : !metrics || metrics.recent_registrations.length === 0 ? (
            <div className="bg-secondary/15 border border-border/50 rounded-xl p-8 text-center text-xs text-muted-foreground">
              No recent registrations found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
              {metrics.recent_registrations.map((reg: any) => (
                <div key={reg.id} className="flex items-center justify-between bg-secondary/20 p-4 rounded-xl border border-border/40 hover:border-primary/20 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-display text-xs font-extrabold text-primary border border-primary/10 group-hover:scale-105 transition-transform duration-300">
                      {reg.user_name ? reg.user_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-snug">{reg.user_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Registered for <span className="font-semibold text-foreground">{reg.event_title}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-medium px-2 py-1 bg-secondary rounded-md text-muted-foreground block mb-1">
                      {new Date(reg.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {reg.payment_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-secondary/15 border border-border/50 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Console Quick Actions</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  if (events && events.length > 0) {
                    setSelectedEventId(events[0].id);
                    setActiveTab('registrations');
                  }
                }}
                className="w-full flex items-center justify-between p-3 bg-secondary/35 border border-border hover:border-primary/30 rounded-xl text-left text-xs text-foreground transition-all"
              >
                <span>View Registration Logs</span>
                <ChevronRight size={14} className="text-primary" />
              </button>
              <button
                onClick={() => {
                  if (events && events.length > 0) {
                    setBuilderEventId(events[0].id);
                    setActiveTab('formBuilder');
                  }
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
            </div>
          </div>

          {/* System Status Panel */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">System</h3>
            <div className="bg-secondary/10 border border-border/50 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-pulse"></div>
                <div>
                  <p className="text-xs font-bold text-foreground">API Systems Online</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">All services are currently operational.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-foreground">Database Connected</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Connected to primary PostgreSQL instance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
