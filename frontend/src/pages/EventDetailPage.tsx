import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Clock, ArrowLeft, Tag,
  CheckCircle, XCircle, AlertCircle, ExternalLink,
  Loader2, Upload, X, ArrowRight, Edit2, Trash2,
} from 'lucide-react';

import Navbar from '../components/club/Navbar';
import Footer from '../components/club/Footer';
import { getApiUrl } from '../lib/api';
import { api } from '../lib/apiClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventDetail {
  id: number;
  title: string;
  description?: string;
  event_date?: string;
  event_start_date?: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  registration_start?: string;
  registration_end?: string;
  registration_deadline?: string;
  venue?: string;
  category?: string;
  status: string;
  max_participants?: number;
  participants?: number;
  event_type?: string;
  min_team_size?: number;
  max_team_size?: number;
  registration_link?: string;
  poster_url?: string;
  banner?: string;
  speaker?: string;
  winners?: string;
  winner_link?: string;
  contact_email?: string;
}

interface FormField {
  id: number;
  label: string;
  field_type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  options_json?: string | null;
  file_max_size_kb?: number | null;
  file_allowed_types?: string | null;
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusMeta: Record<string, { label: string; color: string; bg: string; border: string }> = {
  upcoming:            { label: 'Upcoming',             color: 'hsl(217,91%,40%)',  bg: 'hsl(217,91%,95%)',  border: 'hsl(217,91%,80%)' },
  registration_open:   { label: 'Registration Open',    color: 'hsl(142,71%,30%)',  bg: 'hsl(142,71%,95%)',  border: 'hsl(142,71%,75%)' },
  registration_closed: { label: 'Registration Closed',  color: 'hsl(0,70%,40%)',    bg: 'hsl(0,70%,96%)',    border: 'hsl(0,70%,80%)' },
  completed:           { label: 'Completed',             color: 'hsl(230,15%,45%)', bg: 'hsl(228,20%,93%)',  border: 'hsl(228,20%,80%)' },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Format a UTC ISO string as IST (Asia/Kolkata) date+time. */
function formatDateIST(dateStr?: string, opts?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  });
}

/** Format only time as IST. */
function formatTimeIST(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a bare time string like "19:00:00" for display.
 * If it looks like a full ISO, delegate to formatTimeIST.
 */
function formatBareTime(t?: string) {
  if (!t) return '';
  if (t.includes('T') || t.includes('Z') || t.includes('+')) return formatTimeIST(t);
  // bare HH:MM or HH:MM:SS — convert to 12-hour
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Format event date + optional time for display. */
function formatEventDate(ev: EventDetail) {
  const rawDate = ev.event_start_date || ev.event_date;
  if (!rawDate) return '—';

  // If rawDate is already ISO with time, format as IST
  if (rawDate.includes('T') || rawDate.includes('Z')) {
    return formatDateIST(rawDate);
  }

  // bare date like "2026-09-21"
  const d = new Date(`${rawDate}T00:00:00+05:30`); // treat as IST midnight
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

/** Format registration_start/registration_end which are UTC ISO strings from backend. */
function formatRegDate(isoStr?: string) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([{ name: '', email: '' }]);

  // Edit / withdraw state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [existingRegistrationId, setExistingRegistrationId] = useState<number | null>(null);

  const { user: authUser } = useAuth();

  useEffect(() => {
    setUserProfile(authUser);
    if (authUser && id) {
      const fetchRegs = async () => {
        try {
          // Use shared api client so cookies are sent correctly cross-origin (same as auth/me)
          const regData = await api.get<{ registrations: any[] }>('/api/user/registrations');
          const myReg = (regData.registrations || []).find((r: any) => Number(r.event_id) === Number(id));
          if (myReg) {
            setIsRegistered(true);
            setExistingRegistrationId(myReg.id);
            // Pre-fill responses from existing registration
            if (myReg.responses_flat) {
              // responses_flat is { label: value } — we need field ids
              // We'll re-fill after form fields load; store flat for now
              (window as any).__existingFlat = myReg.responses_flat;
            }
            // Pre-fill team
            if (myReg.team) {
              setTeamName(myReg.team.team_name || '');
              setTeamMembers(
                (myReg.team.members || []).map((m: any) => ({ name: m.member_name, email: m.member_email }))
              );
            }
          } else {
            setIsRegistered(false);
          }
        } catch (e) {
          console.error('Failed to fetch user registrations', e);
        }
      };
      fetchRegs();
    } else {
      setIsRegistered(false);
    }
  }, [authUser?.id, id]);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const evRes = await fetch(getApiUrl(`/api/events/${id}`));
        if (!evRes.ok) throw new Error('Event not found');
        const ev: EventDetail = await evRes.json();
        setEvent(ev);

        try {
          const formRes = await fetch(getApiUrl(`/api/events/${id}/form-schema`));
          if (formRes.ok) {
            const formData = await formRes.json();
            const fields: FormField[] = formData.fields || [];
            setFormFields(fields);
            const init: Record<number, any> = {};
            const existingFlat: Record<string, any> = (window as any).__existingFlat || {};
            // Pre-fill from existing registration responses if available,
            // otherwise fall back to user profile fields
            fields.forEach(f => {
              if (existingFlat[f.label] !== undefined) {
                let val = existingFlat[f.label];
                if (typeof val === 'string') {
                  val = val.replace(/^(\d+)\.0$/, '$1');
                }
                init[f.id] = val;
              } else {
                init[f.id] = f.field_type === 'checkbox' ? [] : '';
              }
            });
            setResponses(init);
            delete (window as any).__existingFlat;
          }
        } catch (_) {}
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleInputChange = (fieldId: number, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: number, option: string, checked: boolean) => {
    const cur = responses[fieldId] || [];
    setResponses(prev => ({
      ...prev,
      [fieldId]: checked ? [...cur, option] : cur.filter((x: string) => x !== option),
    }));
  };

  const handleFileChange = (fieldId: number, file: File) => {
    setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
    handleInputChange(fieldId, file.name);
  };

  const buildPayload = () => {
    if (!event) return null;
    return event.event_type === 'team' ? {
      team_name: teamName.trim(),
      members: teamMembers.filter(m => m.name.trim() && m.email.trim()).map(m => ({ member_name: m.name, member_email: m.email }))
    } : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !userProfile) {
      setSubmitMsg({ type: 'error', text: 'You must be signed in to register.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const teamInput = buildPayload();
      const hasFiles = Object.keys(uploadedFiles).length > 0;
      const apiPath = `/api/events/${event.id}/register`;
      let res;

      if (hasFiles) {
        const fd = new FormData();
        fd.append('data', JSON.stringify({ responses, team: teamInput }));
        Object.entries(uploadedFiles).forEach(([fid, file]) => fd.append(fid, file));
        res = await fetch(getApiUrl(apiPath), { method: 'POST', body: fd, credentials: 'include' });
      } else {
        res = await fetch(getApiUrl(apiPath), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ responses, team: teamInput }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setSubmitMsg({ type: 'success', text: 'Registered successfully! See you at the event 🎉' });
      setIsRegistered(true);
      setIsEditMode(false);
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !userProfile) return;
    setIsUpdating(true);
    setSubmitMsg(null);
    try {
      const teamInput = buildPayload();
      const hasFiles = Object.keys(uploadedFiles).length > 0;
      const apiPath = `/api/events/${event.id}/registration`;
      let res;

      if (hasFiles) {
        const fd = new FormData();
        fd.append('data', JSON.stringify({ responses, team: teamInput }));
        Object.entries(uploadedFiles).forEach(([fid, file]) => fd.append(fid, file));
        res = await fetch(getApiUrl(apiPath), { method: 'PUT', body: fd, credentials: 'include' });
      } else {
        res = await fetch(getApiUrl(apiPath), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ responses, team: teamInput }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      setSubmitMsg({ type: 'success', text: 'Registration updated successfully! ✏️' });
      setIsEditMode(false);
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWithdraw = async () => {
    if (!event) return;
    setIsWithdrawing(true);
    try {
      const res = await fetch(getApiUrl(`/api/events/${event.id}/registration`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Could not withdraw registration');
      }
      setIsRegistered(false);
      setExistingRegistrationId(null);
      setShowWithdrawConfirm(false);
      setIsEditMode(false);
      setSubmitMsg({ type: 'success', text: 'Your registration has been withdrawn.' });
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message });
      setShowWithdrawConfirm(false);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: 'hsl(228,28%,95%)', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)', gap: 12 }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: 'hsl(243,75%,59%)' }} />
        Loading event…
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !event) return (
    <div style={{ background: 'hsl(228,28%,95%)', minHeight: '100vh', paddingTop: '56px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <AlertCircle size={40} style={{ color: 'hsl(0,70%,50%)' }} />
        <h2 style={{ color: 'hsl(230,25%,12%)', fontFamily: 'Playfair Display, Georgia, serif' }}>Event not found</h2>
        <Link to="/events" style={{ color: 'hsl(243,75%,59%)', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to Events
        </Link>
      </div>
    </div>
  );

  const status = statusMeta[event.status] || statusMeta['upcoming'];
  const bannerSrc = event.banner || event.poster_url;
  const rawEventDate = event.event_start_date || event.event_date;
  const isPast = event.status === 'completed' || event.status === 'registration_closed';
  const isOpen = event.status === 'registration_open';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'hsl(228,28%,95%)', minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingTop: '56px' }}>

      {/* ── Hero banner image ───────────────────────────────────────────────── */}
      {bannerSrc && (
        <div style={{ width: '100%', height: 420, overflow: 'hidden', position: 'relative', background: '#0a0c1e', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {/* Blurred background layer */}
          <div style={{
            position: 'absolute', inset: -30,
            backgroundImage: `url(${bannerSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(25px)',
            opacity: 0.6
          }} />
          {/* Main image */}
          <img
            src={bannerSrc}
            alt={event.title}
            style={{ 
              position: 'relative',
              maxWidth: '90%', 
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 12,
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,12,30,0.0) 0%, rgba(10,12,30,0.5) 100%)',
            pointerEvents: 'none'
          }} />
        </div>
      )}

      <main style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: '2.5rem 1.5rem 6rem' }}>

        {/* ── Back button ──────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '0.82rem', fontFamily: 'Inter, sans-serif',
              color: 'hsl(230,15%,40%)', background: 'white',
              border: '1px solid hsl(228,20%,82%)', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer', marginBottom: '2rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'hsl(243,75%,59%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(243,75%,70%)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'hsl(230,15%,40%)';
              (e.currentTarget as HTMLElement).style.borderColor = 'hsl(228,20%,82%)';
            }}
          >
            <ArrowLeft size={14} /> Back to Events
          </button>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>

          {/* ── Left / Main content ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Status + Category badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                color: status.color, background: status.bg, border: `1px solid ${status.border}`,
                fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em',
              }}>
                {isOpen ? <CheckCircle size={12} /> : isPast ? <XCircle size={12} /> : <Clock size={12} />}
                {status.label}
              </span>

              {event.category && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500,
                  color: 'hsl(230,15%,42%)', background: 'white', border: '1px solid hsl(228,20%,80%)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  <Tag size={11} /> {event.category}
                </span>
              )}

              {event.event_type === 'team' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500,
                  color: 'hsl(243,75%,50%)', background: 'hsl(243,75%,97%)', border: '1px solid hsl(243,75%,80%)',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  <Users size={11} /> Team Event · {event.min_team_size}–{event.max_team_size} members
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(1.75rem, 4vw, 2.8rem)',
              fontWeight: 700, color: 'hsl(230,25%,10%)',
              margin: '0 0 1.5rem', lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}>
              {event.title}
            </h1>

            {/* ── Key meta info grid ─────────────────────────────────────── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.75rem', marginBottom: '2rem',
            }}>
              {/* Date */}
              {rawEventDate && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Date</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>
                    {formatEventDate(event)}
                  </p>
                </div>
              )}

              {/* Time */}
              {(event.start_time || event.end_time) && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Clock size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Time (IST)</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>
                    {formatBareTime(event.start_time)}{event.end_time ? ` – ${formatBareTime(event.end_time)}` : ''}
                  </p>
                </div>
              )}

              {/* Venue */}
              {event.venue && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <MapPin size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Venue</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>
                    {event.venue}
                  </p>
                </div>
              )}

              {/* Event type */}
              {event.event_type && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Users size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Format</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>
                    {event.event_type}
                    {event.event_type === 'team' && event.min_team_size && event.max_team_size
                      ? ` (${event.min_team_size}–${event.max_team_size} members)`
                      : ''}
                  </p>
                </div>
              )}

              {/* Capacity */}
              {event.participants !== undefined && event.max_participants && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Users size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Capacity</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>
                    {event.participants}+ / {event.max_participants} registered
                  </p>
                </div>
              )}

              {/* Registration window */}
              {(event.registration_start || event.registration_end) && (
                <div style={{ background: 'white', borderRadius: 10, padding: '0.85rem 1rem', border: '1px solid hsl(228,20%,84%)', gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Calendar size={14} style={{ color: 'hsl(243,75%,59%)' }} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,59%)', letterSpacing: '0.1em', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase' }}>Registration Window (IST)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'hsl(230,20%,18%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>
                    {event.registration_start ? formatRegDate(event.registration_start) : '—'}
                    {' → '}
                    {event.registration_end ? formatRegDate(event.registration_end) : '—'}
                  </p>
                </div>
              )}
            </div>

            {/* Speaker */}
            {event.speaker && (
              <div style={{ background: 'hsl(243,75%,98%)', border: '1px solid hsl(243,75%,85%)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>🎤</span>
                <div>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'hsl(243,75%,55%)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', margin: '0 0 2px' }}>Speaker</p>
                  <p style={{ fontSize: '0.95rem', color: 'hsl(230,25%,12%)', fontFamily: 'Inter, sans-serif', fontWeight: 600, margin: 0 }}>{event.speaker}</p>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem 2rem', border: '1px solid hsl(228,20%,83%)', marginBottom: '2rem' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', lineHeight: 1.85, color: 'hsl(230,20%,22%)', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {event.description}
                </p>
              </div>
            )}

            {/* Winners */}
            {event.winners && (
              <div style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.10), rgba(245,158,11,0.04))', border: '1px solid rgba(234,179,8,0.28)', borderRadius: 12, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🏆</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(35,90%,40%)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Winners</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'hsl(230,20%,22%)', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, margin: 0 }}>{event.winners}</p>
                {event.winner_link && (
                  <a href={event.winner_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: '0.82rem', color: 'hsl(243,75%,59%)', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    View results <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* External registration link (for non-open status) */}
            {event.registration_link && !isOpen && (
              <a href={event.registration_link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', background: 'hsl(243,75%,59%)', color: 'white', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: '2rem' }}>
                <ExternalLink size={15} /> Register via External Link
              </a>
            )}
          </motion.div>

          {/* ── Registration form / Edit panel ────────────────────────────── */}
          {isOpen && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid hsl(228,20%,80%)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(45,50,100,0.06)' }}>

                {/* Form header */}
                <div style={{ padding: '1.5rem 2rem', background: isRegistered ? 'linear-gradient(135deg, hsl(142,65%,38%), hsl(160,60%,42%))' : 'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))', color: 'white' }}>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                    {isRegistered && !isEditMode ? '✓ You are registered!' : isEditMode ? '✏️ Edit Your Registration' : 'Register for this Event'}
                  </h2>
                  {!isRegistered && !userProfile && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', opacity: 0.88, fontFamily: 'Inter, sans-serif' }}>Sign in with Google to complete your registration.</p>
                  )}
                  {isRegistered && !isEditMode && (
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', opacity: 0.9, fontFamily: 'Inter, sans-serif' }}>
                      You can edit or withdraw your registration while registration is open.
                    </p>
                  )}
                </div>

                {/* ── Already registered: show action buttons or edit form ── */}
                {isRegistered && !isEditMode ? (
                  <div style={{ padding: '2rem' }}>

                    {/* Status card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'hsl(142,60%,97%)', border: '1px solid hsl(142,60%,82%)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                      <CheckCircle size={32} style={{ color: 'hsl(142,65%,38%)', flexShrink: 0 }} />
                      <div>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'hsl(142,50%,22%)', margin: '0 0 2px', fontSize: '0.95rem' }}>
                          Registration confirmed!
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(142,40%,35%)', fontSize: '0.82rem', margin: 0 }}>
                          Check <Link to="/my-registrations" style={{ color: 'hsl(142,55%,30%)', fontWeight: 600 }}>My Registrations</Link> for full details.
                        </p>
                      </div>
                    </div>

                    {/* Withdraw confirm inline */}
                    {showWithdrawConfirm ? (
                      <div style={{ background: 'hsl(0,70%,97%)', border: '1px solid hsl(0,70%,83%)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'hsl(0,55%,30%)', fontWeight: 600, margin: '0 0 0.75rem' }}>
                          ⚠️ Are you sure you want to withdraw your registration?
                        </p>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'hsl(0,40%,40%)', margin: '0 0 1rem' }}>
                          This action is permanent. All your responses and uploaded files will be deleted.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                            style={{
                              padding: '9px 20px', background: 'hsl(0,70%,50%)', color: 'white',
                              border: 'none', borderRadius: 8, fontFamily: 'Inter, sans-serif',
                              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 6,
                              opacity: isWithdrawing ? 0.7 : 1,
                            }}
                          >
                            {isWithdrawing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Withdrawing…</> : <><Trash2 size={14} /> Yes, withdraw</>}
                          </button>
                          <button
                            onClick={() => setShowWithdrawConfirm(false)}
                            disabled={isWithdrawing}
                            style={{
                              padding: '9px 20px', background: 'white', color: 'hsl(230,15%,40%)',
                              border: '1px solid hsl(228,20%,82%)', borderRadius: 8,
                              fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {/* Edit button */}
                        <button
                          id="edit-registration-btn"
                          onClick={() => setIsEditMode(true)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))',
                            color: 'white', border: 'none', borderRadius: 9,
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                          <Edit2 size={15} /> Edit Registration
                        </button>

                        {/* Withdraw button */}
                        <button
                          id="withdraw-registration-btn"
                          onClick={() => setShowWithdrawConfirm(true)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '10px 20px',
                            background: 'white', color: 'hsl(0,70%,48%)',
                            border: '1.5px solid hsl(0,70%,80%)', borderRadius: 9,
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'hsl(0,70%,97%)';
                            (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0,70%,65%)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'white';
                            (e.currentTarget as HTMLElement).style.borderColor = 'hsl(0,70%,80%)';
                          }}
                        >
                          <Trash2 size={15} /> Withdraw
                        </button>
                      </div>
                    )}

                    {/* Message after withdraw action */}
                    <AnimatePresence>
                      {submitMsg && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{
                            marginTop: '1rem', padding: '12px 16px', borderRadius: 8,
                            background: submitMsg.type === 'success' ? 'hsl(142,71%,95%)' : 'hsl(0,70%,96%)',
                            border: `1px solid ${submitMsg.type === 'success' ? 'hsl(142,71%,70%)' : 'hsl(0,70%,80%)'}`,
                            color: submitMsg.type === 'success' ? 'hsl(142,71%,30%)' : 'hsl(0,70%,40%)',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                          }}>
                          {submitMsg.text}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                ) : (
                  /* ── Register form (new registration OR edit mode) ───── */
                  <form onSubmit={isEditMode ? handleUpdate : handleSubmit} style={{ padding: '1.75rem 2rem' }} autoComplete="off">

                    {/* Edit mode top bar */}
                    {isEditMode && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(228,20%,88%)' }}>
                        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: 'hsl(230,15%,45%)', margin: 0 }}>
                          Make your changes below and click Save.
                        </p>
                        <button
                          type="button"
                          onClick={() => { setIsEditMode(false); setSubmitMsg(null); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'hsl(230,15%,45%)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                        >
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    )}

                    {/* Submit message */}
                    <AnimatePresence>
                      {submitMsg && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{
                            marginBottom: '1.25rem', padding: '12px 16px', borderRadius: 8,
                            background: submitMsg.type === 'success' ? 'hsl(142,71%,95%)' : 'hsl(0,70%,96%)',
                            border: `1px solid ${submitMsg.type === 'success' ? 'hsl(142,71%,70%)' : 'hsl(0,70%,80%)'}`,
                            color: submitMsg.type === 'success' ? 'hsl(142,71%,30%)' : 'hsl(0,70%,40%)',
                            fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
                          }}>
                          {submitMsg.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {formFields.map(field => (
                        <div key={field.id}>
                          <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: 'hsl(230,20%,20%)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {field.label} {field.required && <span style={{ color: 'hsl(0,70%,50%)' }}>*</span>}
                          </label>

                          {field.field_type === 'file' ? (
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'hsl(228,28%,97%)', border: '1.5px dashed hsl(228,20%,78%)', borderRadius: 8, padding: '12px', cursor: 'pointer', boxSizing: 'border-box' }}>
                              <Upload size={16} style={{ color: 'hsl(243,75%,59%)' }} />
                              <span style={{ fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)' }}>
                                {uploadedFiles[field.id] ? uploadedFiles[field.id].name : field.placeholder || 'Choose File'}
                              </span>
                              <input type="file" required={field.required && !uploadedFiles[field.id]} onChange={e => { if (e.target.files?.[0]) handleFileChange(field.id, e.target.files[0]); }} style={{ display: 'none' }} />
                            </label>
                          ) : field.field_type === 'dropdown' || field.field_type === 'select' ? (
                            <select required={field.required} value={responses[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                              <option value="" disabled>{field.placeholder || 'Select option...'}</option>
                              {(field.options_json ? JSON.parse(field.options_json) : field.options || []).map((o: string) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          ) : field.field_type === 'checkbox' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                              {(field.options_json ? JSON.parse(field.options_json) : field.options || []).map((opt: string) => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', color: 'hsl(230,20%,22%)' }}>
                                  <input type="checkbox" checked={(responses[field.id] || []).includes(opt)} onChange={e => handleCheckboxChange(field.id, opt, e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: 'hsl(243,75%,59%)' }} />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          ) : field.field_type === 'radio' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                              {(field.options_json ? JSON.parse(field.options_json) : field.options || []).map((opt: string) => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', color: 'hsl(230,20%,22%)' }}>
                                  <input type="radio" name={`radio-${field.id}`} checked={responses[field.id] === opt} onChange={() => handleInputChange(field.id, opt)}
                                    style={{ width: 16, height: 16, accentColor: 'hsl(243,75%,59%)' }} />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          ) : field.field_type === 'textarea' ? (
                            <textarea required={field.required} placeholder={field.placeholder} value={responses[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} rows={3} autoComplete="off"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                          ) : (
                            <input type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text'}
                              required={field.required} placeholder={field.placeholder} value={responses[field.id] || ''} onChange={e => handleInputChange(field.id, e.target.value)} autoComplete="off"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                          )}
                        </div>
                      ))}

                      {/* Team section */}
                      {event.event_type === 'team' && (
                        <div style={{ background: 'hsl(243,75%,98%)', border: '1px solid hsl(243,75%,85%)', borderRadius: 10, padding: '1.25rem' }}>
                          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'hsl(243,75%,40%)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={15} /> Team Details ({event.min_team_size}–{event.max_team_size} members total)
                          </h3>
                          <input type="text" placeholder="Team name *" value={teamName} onChange={e => setTeamName(e.target.value)} required autoComplete="off"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', marginBottom: '0.85rem', boxSizing: 'border-box' }} />
                          {teamMembers.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                              <input type="text" placeholder={`Member ${i + 1} name`} value={m.name} autoComplete="off"
                                onChange={e => setTeamMembers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem' }} />
                              <input type="email" placeholder={`Member ${i + 1} email`} value={m.email} autoComplete="off"
                                onChange={e => setTeamMembers(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                                style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem' }} />
                              {teamMembers.length > 1 && (
                                <button type="button" onClick={() => setTeamMembers(prev => prev.filter((_, j) => j !== i))}
                                  style={{ padding: '6px 10px', background: 'hsl(0,70%,96%)', border: '1px solid hsl(0,70%,85%)', borderRadius: 7, color: 'hsl(0,70%,50%)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          ))}
                          {teamMembers.length + 1 < (event.max_team_size || 4) && (
                            <button type="button" onClick={() => setTeamMembers(prev => [...prev, { name: '', email: '' }])}
                              style={{ fontSize: '0.82rem', color: 'hsl(243,75%,59%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                              + Add member
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit / Save button */}
                    <button
                      id={isEditMode ? 'save-registration-btn' : 'submit-registration-btn'}
                      type="submit"
                      disabled={(isEditMode ? isUpdating : isSubmitting) || (!isEditMode && !userProfile)}
                      style={{
                        marginTop: '1.5rem', padding: '13px 28px', width: '100%',
                        background: (isEditMode || userProfile)
                          ? (isEditMode
                            ? 'linear-gradient(135deg, hsl(142,65%,38%), hsl(160,60%,42%))'
                            : 'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))')
                          : 'hsl(228,20%,80%)',
                        color: 'white', border: 'none', borderRadius: 10,
                        fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 700,
                        cursor: (!isEditMode && !userProfile) ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: (isEditMode || userProfile) ? '0 5px 20px rgba(99,102,241,0.22)' : 'none',
                        transition: 'opacity 0.2s',
                        opacity: (isEditMode ? isUpdating : isSubmitting) ? 0.7 : 1,
                      }}
                    >
                      {isEditMode ? (
                        isUpdating
                          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                          : <><CheckCircle size={16} /> Save Changes</>
                      ) : isSubmitting ? (
                        <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Registering…</>
                      ) : !userProfile ? (
                        'Sign in to Register'
                      ) : (
                        <>Register for Event <ArrowRight size={16} /></>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}


          {/* Closed / completed notice */}
          {isPast && (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid hsl(228,20%,82%)', padding: '2rem', textAlign: 'center' }}>
              <XCircle size={40} style={{ color: 'hsl(228,20%,68%)', margin: '0 auto 1rem', display: 'block' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: 'hsl(230,15%,45%)', margin: 0 }}>
                This event has ended. Registration is no longer available.
              </p>
            </div>
          )}

        </div>
      </main>

      <Footer short />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
