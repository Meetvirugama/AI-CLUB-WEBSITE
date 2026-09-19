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
  return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function RegistrationCard({ reg }: { reg: Registration }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Object.keys(reg.responses_flat).length > 0 || reg.team || reg.uploaded_files.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'white', borderRadius: 10, border: '1px solid hsl(228,20%,82%)', overflow: 'hidden', marginBottom: '1rem' }}
    >
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link
            to={`/events/${reg.event_id}`}
            style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: 'hsl(230,25%,12%)', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'hsl(243,75%,59%)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'hsl(230,25%,12%)'}
          >
            {reg.event_title}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.78rem', color: 'hsl(230,15%,50%)', fontFamily: 'Inter, sans-serif' }}>
            <Calendar size={12} />
            Registered: {formatDate(reg.registered_at)}
            {reg.team && (
              <><span style={{ margin: '0 4px' }}>·</span><Users size={12} />{reg.team.team_name}</>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600, color: 'hsl(142,71%,30%)', background: 'hsl(142,71%,95%)', border: '1px solid hsl(142,71%,70%)' }}>
            ✓ Registered
          </span>
          {hasDetails && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', border: '1px solid hsl(228,20%,80%)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'hsl(230,15%,40%)' }}
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
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.5rem 1.5rem', borderTop: '1px solid hsl(228,20%,90%)', background: 'hsl(228,30%,97%)' }}>
              {/* Form responses */}
              {Object.keys(reg.responses_flat).length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'hsl(230,20%,30%)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Your Responses
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(reg.responses_flat).map(([label, value]) => (
                      <div key={label} style={{ background: 'white', borderRadius: 6, padding: '10px 12px', border: '1px solid hsl(228,20%,88%)' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 600, color: 'hsl(230,15%,50%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'hsl(230,25%,12%)', fontFamily: 'Inter, sans-serif' }}>
                          {Array.isArray(value) ? value.join(', ') : String(value).replace(/^(\d+)\.0$/, '$1') || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team info */}
              {reg.team && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'hsl(230,20%,30%)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Team: {reg.team.team_name}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {reg.team.members.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'white', border: '1px solid hsl(228,20%,88%)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'Inter, sans-serif' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'hsl(243,75%,90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'hsl(243,75%,50%)' }}>
                          {m.member_name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'hsl(230,25%,12%)' }}>{m.member_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'hsl(230,15%,50%)' }}>{m.member_email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded files */}
              {reg.uploaded_files.length > 0 && (
                <div>
                  <h4 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'hsl(230,20%,30%)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Uploaded Files
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {reg.uploaded_files.map(f => (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'white', border: '1px solid hsl(243,75%,80%)', borderRadius: 6, fontSize: '0.8rem', color: 'hsl(243,75%,59%)', textDecoration: 'none' }}>
                        <FileText size={13} /> {f.original_name || f.field_label} <ExternalLink size={10} />
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
    <div style={{ background: 'hsl(228,30%,93%)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '5rem 2rem 4rem' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
            <ClipboardList size={28} style={{ color: 'hsl(243,75%,59%)' }} />
            <div>
              <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 700, color: 'hsl(230,25%,10%)', margin: 0 }}>
                My Registrations
              </h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'hsl(230,15%,45%)', margin: '4px 0 0' }}>
                All events you've registered for
              </p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)', fontSize: '0.9rem' }}>
            Loading your registrations…
          </div>
        ) : !isLoggedIn ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: 10, border: '1px solid hsl(228,20%,83%)' }}>
            <ClipboardList size={48} style={{ color: 'hsl(228,20%,75%)', margin: '0 auto 1rem' }} />
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: 'hsl(230,25%,15%)', marginBottom: '0.5rem' }}>Sign in required</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You need to be signed in to view your registrations.
            </p>
            <Link
              to="/events"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 22px', background: 'hsl(243,75%,59%)', color: 'white', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
            >
              Browse Events
            </Link>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', background: 'hsl(0,70%,96%)', borderRadius: 10, border: '1px solid hsl(0,70%,85%)', fontFamily: 'Inter, sans-serif', color: 'hsl(0,70%,40%)', fontSize: '0.875rem' }}>
            Error: {error}
          </div>
        ) : registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: 10, border: '1px solid hsl(228,20%,83%)' }}>
            <ClipboardList size={48} style={{ color: 'hsl(228,20%,75%)', margin: '0 auto 1rem' }} />
            <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: 'hsl(230,25%,15%)', marginBottom: '0.5rem' }}>No registrations yet</h2>
            <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You haven't registered for any events. Browse upcoming events to get started.
            </p>
            <Link
              to="/events"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 22px', background: 'hsl(243,75%,59%)', color: 'white', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'hsl(230,15%,50%)', marginBottom: '1.25rem' }}>
              {registrations.length} registration{registrations.length !== 1 ? 's' : ''} found
            </p>
            {registrations.map(reg => (
              <RegistrationCard key={reg.id} reg={reg} />
            ))}
          </>
        )}
      </div>
      <Footer short />
    </div>
  );
}
