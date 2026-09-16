import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Tag, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Navbar from '../components/club/Navbar';
import Footer from '../components/club/Footer';
import { getApiUrl } from '../lib/api';

interface EventDetail {
  id: number;
  title: string;
  description?: string;
  event_date?: string;
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
}

interface FormField {
  id: number;
  label: string;
  field_type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  upcoming:             { label: 'Upcoming', color: 'hsl(217,91%,40%)', bg: 'hsl(217,91%,95%)', icon: <Clock size={13} /> },
  registration_open:    { label: 'Registration Open', color: 'hsl(142,71%,30%)', bg: 'hsl(142,71%,95%)', icon: <CheckCircle size={13} /> },
  registration_closed:  { label: 'Registration Closed', color: 'hsl(0,70%,40%)', bg: 'hsl(0,70%,96%)', icon: <XCircle size={13} /> },
  completed:            { label: 'Completed', color: 'hsl(230,15%,45%)', bg: 'hsl(228,20%,93%)', icon: <CheckCircle size={13} /> },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState([{ name: '', email: '' }]);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch event details
        const evRes = await fetch(getApiUrl(`/api/events/${id}`));
        if (!evRes.ok) throw new Error('Event not found');
        const ev: EventDetail = await evRes.json();
        setEvent(ev);

        // Fetch form schema
        try {
          const formRes = await fetch(getApiUrl(`/api/events/${id}/form-schema`));
          if (formRes.ok) {
            const formData = await formRes.json();
            const fields: FormField[] = formData.fields || [];
            setFormFields(fields);
            const init: Record<number, any> = {};
            fields.forEach(f => { init[f.id] = f.field_type === 'checkbox' ? [] : ''; });
            setResponses(init);
          }
        } catch (_) {}

        // Fetch auth + registrations
        try {
          const meRes = await fetch(getApiUrl('/api/auth/me'), { credentials: 'include' });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.authenticated && meData.user) {
              setUserProfile(meData.user);
              const regRes = await fetch(getApiUrl('/api/user/registrations'), { credentials: 'include' });
              if (regRes.ok) {
                const regData = await regRes.json();
                const ids = (regData.registrations || []).map((r: any) => r.event_id);
                setIsRegistered(ids.includes(Number(id)));
              }
            }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !userProfile) {
      setSubmitMsg({ type: 'error', text: 'You must be signed in to register.' });
      return;
    }
    setIsSubmitting(true);
    setSubmitMsg(null);
    try {
      const teamInput = event.event_type === 'team' ? {
        team_name: teamName.trim(),
        members: teamMembers.filter(m => m.name.trim() && m.email.trim()).map(m => ({ member_name: m.name, member_email: m.email }))
      } : null;

      const res = await fetch(getApiUrl(`/api/events/${event.id}/register`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ responses, team: teamInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setSubmitMsg({ type: 'success', text: 'Registered successfully! See you at the event 🎉' });
      setIsRegistered(true);
    } catch (err: any) {
      setSubmitMsg({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ background: 'hsl(228,30%,93%)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)' }}>
        Loading event…
      </div>
    </div>
  );

  if (error || !event) return (
    <div style={{ background: 'hsl(228,30%,93%)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, fontFamily: 'Inter, sans-serif' }}>
        <AlertCircle size={40} style={{ color: 'hsl(0,70%,50%)' }} />
        <h2 style={{ color: 'hsl(230,25%,12%)', fontFamily: 'Playfair Display, Georgia, serif' }}>Event not found</h2>
        <Link to="/events" style={{ color: 'hsl(243,75%,59%)', textDecoration: 'none', fontSize: '0.9rem' }}>← Back to Events</Link>
      </div>
    </div>
  );

  const status = statusMeta[event.status] || statusMeta['upcoming'];

  return (
    <div style={{ background: 'hsl(228,30%,93%)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '5rem 2rem 4rem' }}>
        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Link
            to="/events"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'hsl(230,15%,45%)', textDecoration: 'none', marginBottom: '2rem' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'hsl(243,75%,59%)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'hsl(230,15%,45%)'}
          >
            <ArrowLeft size={14} /> All Events
          </Link>
        </motion.div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Status + Category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600, color: status.color, background: status.bg, border: `1px solid ${status.color}22` }}>
              {status.icon} {status.label}
            </span>
            {event.category && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500, color: 'hsl(230,15%,45%)', background: 'white', border: '1px solid hsl(228,20%,80%)' }}>
                <Tag size={11} /> {event.category}
              </span>
            )}
            {event.event_type === 'team' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500, color: 'hsl(243,75%,50%)', background: 'hsl(243,75%,97%)', border: '1px solid hsl(243,75%,80%)' }}>
                <Users size={11} /> Team Event · {event.min_team_size}–{event.max_team_size} members
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 700, color: 'hsl(230,25%,10%)', margin: '0 0 1.5rem', lineHeight: 1.2 }}>
            {event.title}
          </h1>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
            {event.event_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(230,15%,35%)' }}>
                <Calendar size={15} style={{ color: 'hsl(243,75%,59%)' }} />
                {formatDate(event.event_date)}
              </div>
            )}
            {event.venue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(230,15%,35%)' }}>
                <MapPin size={15} style={{ color: 'hsl(243,75%,59%)' }} />
                {event.venue}
              </div>
            )}
            {event.registration_deadline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(230,15%,35%)' }}>
                <Clock size={15} style={{ color: 'hsl(243,75%,59%)' }} />
                Deadline: {formatDate(event.registration_deadline)}
              </div>
            )}
            {event.participants !== undefined && event.max_participants && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(230,15%,35%)' }}>
                <Users size={15} style={{ color: 'hsl(243,75%,59%)' }} />
                {event.participants}+ / {event.max_participants} participants
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ background: 'white', borderRadius: 8, padding: '1.5rem 2rem', border: '1px solid hsl(228,20%,83%)', marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', lineHeight: 1.8, color: 'hsl(230,20%,25%)', margin: 0, whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            </div>
          )}

          {/* External link */}
          {event.registration_link && event.status !== 'registration_open' && (
            <a
              href={event.registration_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'hsl(243,75%,59%)', color: 'white', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: '2rem' }}
            >
              <ExternalLink size={15} /> Register via External Link
            </a>
          )}
        </motion.div>

        {/* Registration Form */}
        {event.status === 'registration_open' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div style={{ background: 'white', borderRadius: 10, border: '1px solid hsl(228,20%,80%)', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid hsl(228,20%,88%)', background: 'hsl(243,75%,59%)', color: 'white' }}>
                <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                  {isRegistered ? '✓ You are registered!' : 'Register for this Event'}
                </h2>
                {!isRegistered && !userProfile && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem', opacity: 0.85 }}>Sign in with Google to complete your registration.</p>
                )}
              </div>

              {isRegistered ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <CheckCircle size={48} style={{ color: 'hsl(142,71%,40%)', margin: '0 auto 1rem' }} />
                  <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,35%)', fontSize: '0.95rem' }}>
                    You've already registered for this event. Check{' '}
                    <Link to="/my-registrations" style={{ color: 'hsl(243,75%,59%)' }}>My Registrations</Link> for details.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem' }}>
                  {formFields.length === 0 ? (
                    <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,45%)', fontSize: '0.9rem' }}>
                      No form fields configured. Click register to sign up.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {formFields.map(field => (
                        <div key={field.id}>
                          <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'hsl(230,20%,20%)', marginBottom: 6 }}>
                            {field.label} {field.required && <span style={{ color: 'hsl(0,70%,50%)' }}>*</span>}
                          </label>
                          {field.field_type === 'select' ? (
                            <select
                              required={field.required}
                              value={responses[field.id] || ''}
                              onChange={e => setResponses(p => ({ ...p, [field.id]: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none' }}
                            >
                              <option value="">Select…</option>
                              {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : field.field_type === 'textarea' ? (
                            <textarea
                              required={field.required}
                              placeholder={field.placeholder}
                              value={responses[field.id] || ''}
                              onChange={e => setResponses(p => ({ ...p, [field.id]: e.target.value }))}
                              rows={3}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <input
                              type={field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : 'text'}
                              required={field.required}
                              placeholder={field.placeholder}
                              value={responses[field.id] || ''}
                              onChange={e => setResponses(p => ({ ...p, [field.id]: e.target.value }))}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                          )}
                        </div>
                      ))}

                      {/* Team section */}
                      {event.event_type === 'team' && (
                        <div style={{ background: 'hsl(243,75%,98%)', border: '1px solid hsl(243,75%,85%)', borderRadius: 8, padding: '1rem' }}>
                          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 600, color: 'hsl(243,75%,40%)', margin: '0 0 1rem' }}>
                            Team Details ({event.min_team_size}–{event.max_team_size} members total)
                          </h3>
                          <input
                            type="text" placeholder="Team name *" value={teamName}
                            onChange={e => setTeamName(e.target.value)} required
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
                          />
                          {teamMembers.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <input type="text" placeholder={`Member ${i + 1} name`} value={m.name}
                                onChange={e => setTeamMembers(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem' }}
                              />
                              <input type="email" placeholder={`Member ${i + 1} email`} value={m.email}
                                onChange={e => setTeamMembers(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid hsl(228,20%,80%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem' }}
                              />
                              {teamMembers.length > 1 && (
                                <button type="button" onClick={() => setTeamMembers(prev => prev.filter((_, j) => j !== i))}
                                  style={{ padding: '0 10px', background: 'hsl(0,70%,96%)', border: '1px solid hsl(0,70%,85%)', borderRadius: 6, color: 'hsl(0,70%,50%)', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => setTeamMembers(prev => [...prev, { name: '', email: '' }])}
                            style={{ fontSize: '0.8rem', color: 'hsl(243,75%,59%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            + Add member
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {submitMsg && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ marginTop: '1rem', padding: '10px 14px', borderRadius: 6, background: submitMsg.type === 'success' ? 'hsl(142,71%,95%)' : 'hsl(0,70%,96%)', border: `1px solid ${submitMsg.type === 'success' ? 'hsl(142,71%,70%)' : 'hsl(0,70%,80%)'}`, color: submitMsg.type === 'success' ? 'hsl(142,71%,30%)' : 'hsl(0,70%,40%)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
                        {submitMsg.text}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isRegistered && (
                    <button
                      type="submit" disabled={isSubmitting || !userProfile}
                      style={{ marginTop: '1.25rem', padding: '11px 28px', background: userProfile ? 'hsl(243,75%,59%)' : 'hsl(228,20%,80%)', color: 'white', border: 'none', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, cursor: userProfile ? 'pointer' : 'not-allowed', width: '100%', transition: 'background 0.2s' }}
                    >
                      {isSubmitting ? 'Registering…' : !userProfile ? 'Sign in to Register' : 'Register Now'}
                    </button>
                  )}
                </form>
              )}
            </div>
          </motion.div>
        )}
      </div>
      <Footer short />
    </div>
  );
}
