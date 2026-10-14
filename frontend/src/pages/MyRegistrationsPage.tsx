import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, ChevronDown, ChevronUp, FileText, ExternalLink, ClipboardList } from 'lucide-react';
import Navbar from '../components/club/Navbar';
import Footer from '../components/club/Footer';
import { getApiUrl } from '../lib/api';

interface TeamMember { id: number; member_name: string; member_email: string; }
interface TeamInfo { id: number; team_name: string; members: TeamMember[]; }
interface UploadedFile { id: number; field_label: string; file_url: string; original_name?: string; }
interface Registration {
  id: number;
  event_id: number;
  event_title: string;
  registered_at: string;
  responses_flat: Record<string, any>;
  team?: TeamInfo;
  uploaded_files: UploadedFile[];
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

function RegistrationCard({ reg }: { reg: Registration }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Object.keys(reg.responses_flat).length > 0 || reg.team || reg.uploaded_files.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden mb-4 shadow-sm hover:border-border/80 transition-colors"
    >
      {/* Header */}
      <div className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            to={`/events/${reg.event_id}`}
            className="font-serif text-lg font-bold text-foreground hover:text-primary transition-colors block"
          >
            {reg.event_title}
          </Link>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-sans">
            <Calendar size={12} />
            <span>Registered: {formatDate(reg.registered_at)}</span>
            {reg.team && (
              <>
                <span className="mx-1">·</span>
                <Users size={12} />
                <span>{reg.team.team_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            ✓ Registered
          </span>
          {hasDetails && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg bg-secondary/50 hover:bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-t border-border bg-secondary/30 space-y-5">
              {/* Form responses */}
              {Object.keys(reg.responses_flat).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Your Responses
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(reg.responses_flat).map(([label, value]) => (
                      <div key={label} className="bg-card rounded-lg p-3 border border-border">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className="mt-1 text-sm text-foreground font-sans font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value).replace(/^(\d+)\.0$/, '$1') || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team info */}
              {reg.team && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Team: {reg.team.team_name}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {reg.team.members.map(m => (
                      <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 bg-card border border-border rounded-lg text-sm font-sans">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {m.member_name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-xs">{m.member_name}</div>
                          <div className="text-[11px] text-muted-foreground">{m.member_email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded files */}
              {reg.uploaded_files.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Uploaded Files
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {reg.uploaded_files.map(f => (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-primary/30 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                        <FileText size={13} /> <span>{f.original_name || f.field_label}</span> <ExternalLink size={10} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { useAuth } from '../contexts/AuthContext';

export default function MyRegistrationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setAuthChecked(true);
    setIsLoggedIn(isAuthenticated);

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const regRes = await fetch(getApiUrl('/api/user/registrations'), { credentials: 'include' });
        if (!regRes.ok) throw new Error('Failed to fetch registrations');
        const data = await regRes.json();
        setRegistrations(data.registrations || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, authLoading]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navbar />
      <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 flex-1">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ClipboardList size={22} />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
                My Registrations
              </h1>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-0.5">
                All events you've registered for
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-16 font-sans text-muted-foreground text-sm">
            Loading your registrations…
          </div>
        ) : !isLoggedIn ? (
          <div className="text-center py-16 px-6 bg-card rounded-xl border border-border">
            <ClipboardList size={44} className="text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">Sign in required</h2>
            <p className="font-sans text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              You need to be signed in to view your registrations.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-sans text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Browse Events
            </Link>
          </div>
        ) : error ? (
          <div className="p-5 bg-destructive/10 rounded-xl border border-destructive/20 font-sans text-destructive text-sm">
            Error: {error}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16 px-6 bg-card rounded-xl border border-border">
            <ClipboardList size={44} className="text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="font-serif text-xl font-bold text-foreground mb-2">No registrations yet</h2>
            <p className="font-sans text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              You haven't registered for any events. Browse upcoming events to get started.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-sans text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <>
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {registrations.length} registration{registrations.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-3">
              {registrations.map(reg => (
                <RegistrationCard key={reg.id} reg={reg} />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer short />
    </div>
  );
}
