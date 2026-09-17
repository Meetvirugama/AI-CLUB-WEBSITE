import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Users, ArrowRight, Loader2, CalendarDays, Mic, UsersRound, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getApiUrl } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

// Helper: build auth headers from localStorage token (needed for cross-origin cookie issues)
function getAuthHeaders(): Record<string, string> {
  return {};
}

interface EventModel {
  id: number | string;
  title: string;
  description: string;
  banner: string | null;
  category: string;
  venue: string;
  contact_email: string;
  event_type: 'individual' | 'team';
  registration_link?: string | null;
  min_team_size: number | null;
  max_team_size: number | null;
  event_date: string;
  event_start_date?: string;
  event_end_date?: string;
  start_time: string;
  end_time: string;
  registration_start: string;
  registration_end: string;
  status: 'upcoming' | 'registration_open' | 'registration_closed' | 'completed';
  winners?: string | null;
  winner_link?: string | null;
  speaker?: string | null;
  date_label?: string;
  isArchived?: boolean;
}

interface FormFieldModel {
  id: number;
  label: string;
  field_type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'file';
  placeholder: string | null;
  required: boolean;
  options_json: string | null;
  order_no: number;
  file_max_size_kb: number | null;
  file_allowed_types: string | null;
}

interface PastEvent {
  id: number;
  title: string;
  date_label: string;
  category: string;
  description: string;
  speaker: string | null;
  participants: number | null;
  image_url: string | null;
  sort_order: number;
  winners?: string | null;
  winner_link?: string | null;
}

interface PastEventModel {
  id: number;
  title: string;
  category: string;
  date_label: string;
  description: string;
  speaker?: string | null;
  participants?: number | null;
  image_url?: string | null;
  sort_order?: number;
  winners?: string | null;
  winner_link?: string | null;
  venue?: string;
  event_type?: string;
  event_start_date?: string;
  event_date?: string;
  isArchived?: boolean;
  status?: string;
  banner?: string | null;
}

export default function Events({ isHomepage = false }: { isHomepage?: boolean }) {
  const [activeTab, setActiveTab] = useState('all');
  const [events, setEvents] = useState<EventModel[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEventModel[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter state (full-page only)
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<EventModel | null>(null);
  
  // Dynamic Form schema state
  const [formFields, setFormFields] = useState<FormFieldModel[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<(number | string)[]>([]);

  // Team Registration state
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string }>>([
    { name: '', email: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Events from backend (with optional filters)
  const fetchEvents = async (status?: string, category?: string) => {
    setLoadingEvents(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      const res = await fetch(getApiUrl(`/api/events?${params}`));
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error('Failed to fetch events from backend, falling back to static descriptions.', e);
    } finally {
      setLoadingEvents(false);
    }
  };

  const { user: authUser } = useAuth();

  useEffect(() => {
    setUserProfile(authUser);
    if (authUser) {
      const fetchRegs = async () => {
        try {
          const regRes = await fetch(getApiUrl('/api/user/registrations'), { credentials: 'include' });
          if (regRes.ok) {
            const regData = await regRes.json();
            if (regData.registrations) {
              setRegisteredEventIds(regData.registrations.map((r: any) => r.event_id));
            }
          }
        } catch (e) {
          console.error('Failed to fetch registrations', e);
        }
      };
      fetchRegs();
    } else {
      setRegisteredEventIds([]);
    }
  }, [authUser]);

  const fetchPastEvents = async () => {
    try {
      const res = await fetch(getApiUrl('/api/past-events'));
      if (res.ok) {
        const data = await res.json();
        setPastEvents(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch past events', e);
    }
  };

  useEffect(() => {
    // Fetch initial data
    fetchEvents();
    fetchPastEvents();
  }, []);

  const featured = events.find(ev => ev.status === 'registration_open') || events.find(ev => ev.status === 'upcoming');

  // Countdown timer for next event based on real database featured event
  useEffect(() => {
    if (!featured) {
      setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
      return;
    }
    const rawDate = featured.event_start_date || featured.event_date;
    if (!rawDate) {
      setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
      return;
    }
    const targetStr = `${rawDate}T${featured.start_time || '00:00:00'}`;
    const target = new Date(targetStr).getTime();
    if (isNaN(target)) {
      setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
      return;
    }
    
    const updateTimer = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
        return false;
      }
      setTimeLeft({
        d: String(Math.floor(diff / 86400000)).padStart(2, '0'),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0'),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
      });
      return true;
    };

    const hasTime = updateTimer();
    if (!hasTime) return;

    const interval = setInterval(() => {
      const continuing = updateTimer();
      if (!continuing) clearInterval(interval);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [featured]);

  // 2. Load form schema when an event is selected
  useEffect(() => {
    if (selectedEvent) {
      const loadSchema = async () => {
        setLoadingSchema(true);
        setFormFields([]);
        setResponses({});
        setUploadedFiles({});
        setTeamName('');
        setTeamMembers([{ name: '', email: '' }]);
        setSubmitMessage(null);

        // Prepopulate default fields from backend profile
        let profile: any = userProfile || {};

        try {
          const res = await fetch(getApiUrl(`/api/events/${selectedEvent.id}/form-schema`));
          if (res.ok) {
            const data = await res.json();
            const fields: FormFieldModel[] = data.fields || [];
            setFormFields(fields);
            
            // Pre-fill fields with user profile info by label matching
            const initialResponses: Record<string, any> = {};
            fields.forEach(field => {
              const labelLower = field.label.toLowerCase();
              if (labelLower.includes('name') && profile.name) {
                initialResponses[field.id] = profile.name;
              } else if (labelLower.includes('email') && profile.email) {
                initialResponses[field.id] = profile.email;
              } else if (field.field_type === 'checkbox') {
                initialResponses[field.id] = [];
              } else {
                initialResponses[field.id] = '';
              }
            });
            setResponses(initialResponses);
          }
        } catch (e) {
          console.error('Failed to load form schema', e);
        } finally {
          setLoadingSchema(false);
        }
      };
      loadSchema();
    } else {
      setFormFields([]);
      setResponses({});
      setUploadedFiles({});
      setSubmitMessage(null);
      setUserProfile(null);
    }
  }, [selectedEvent]);

  // Handle input changes dynamically
  const handleInputChange = (fieldId: number, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: number, option: string, checked: boolean) => {
    const currentList = responses[fieldId] || [];
    let updatedList = [];
    if (checked) {
      updatedList = [...currentList, option];
    } else {
      updatedList = currentList.filter((item: string) => item !== option);
    }
    handleInputChange(fieldId, updatedList);
  };

  const handleFileChange = (fieldId: number, file: File) => {
    setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
    handleInputChange(fieldId, file.name);
  };

  const addTeamMember = () => {
    if (selectedEvent && selectedEvent.max_team_size && teamMembers.length + 1 >= selectedEvent.max_team_size) {
      // reached limit (note: leader is not in members array, so limit is max_team_size - 1)
    }
    setTeamMembers(prev => [...prev, { name: '', email: '' }]);
  };

  const removeTeamMember = (index: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  // Submit registration form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    // Check if user is logged in
    let currentUser = userProfile;

    if (!currentUser) {
      setSubmitMessage({ type: 'error', text: 'You must be logged in to register for events.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Check required fields
      for (const field of formFields) {
        if (field.required && !responses[field.id] && !uploadedFiles[field.id]) {
          throw new Error(`The field "${field.label}" is required.`);
        }
      }

      // Team validation
      let teamInput = null;
      if (selectedEvent.event_type === 'team') {
        if (!teamName.trim()) {
          throw new Error('Team Name is required.');
        }
        const activeMembers = teamMembers.filter(m => m.name.trim() && m.email.trim());
        const totalTeamSize = activeMembers.length + 1; // leader + members
        const minSize = selectedEvent.min_team_size || 2;
        const maxSize = selectedEvent.max_team_size || 4;

        if (totalTeamSize < minSize || totalTeamSize > maxSize) {
          throw new Error(`Team size must be between ${minSize} and ${maxSize} members.`);
        }
        teamInput = {
          team_name: teamName.trim(),
          members: activeMembers.map(m => ({ member_name: m.name.trim(), member_email: m.email.trim() }))
        };
      }

      const hasFiles = Object.keys(uploadedFiles).length > 0;
      const apiPath = `/api/events/${selectedEvent.id}/register`;

      let res;
      if (hasFiles) {
        // Send as multipart/form-data — cookie is attached automatically via credentials:'include'
        const formDataPayload = new FormData();
        formDataPayload.append('data', JSON.stringify({
          responses: responses,
          team: teamInput
        }));

        Object.entries(uploadedFiles).forEach(([fieldId, file]) => {
          formDataPayload.append(fieldId, file);
        });

        res = await fetch(getApiUrl(apiPath), {
          method: 'POST',
          body: formDataPayload,
          credentials: 'include',
          headers: getAuthHeaders()
        });
      } else {
        // Send as JSON
        res = await fetch(getApiUrl(apiPath), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            responses: responses,
            team: teamInput
          }),
          credentials: 'include'
        });
      }

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('You must be logged in to register for events.');
        }
        throw new Error(data.detail || 'Registration failed');
      }

      setSubmitMessage({ type: 'success', text: 'Registration successful! See you at the event.' });
      setTimeout(() => {
        setSelectedEvent(null);
      }, 2500);
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.message || 'Server error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for tab lists - using only real database events, no mock fallbacks
  const displayEvents = events;

  // Filter and search logic

const matchesSearch = (event: any) => {
  const query = searchQuery.trim().toLowerCase();

  if (!query) return true;

  const searchableFields = [
    event.title,
    event.description,
    event.category,
    event.venue,
    event.speaker,
    event.winners,
    event.date_label,
    event.event_date,
    event.event_start_date,
    event.event_end_date,
  ];

  return searchableFields
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(query));
};

const matchesCategory = (event: any) => {
  if (!categoryFilter) return true;

  return String(event.category || '').toLowerCase() ===
    categoryFilter.toLowerCase();
};

const matchesTab = (event: any) => {
  switch (activeTab) {
    case 'live':
      return event.status === 'registration_open';

    case 'upcoming':
      return event.status === 'upcoming';

    case 'past':
      return (
        event.status === 'completed' ||
        event.status === 'registration_closed' ||
        event.isArchived === true
      );

    case 'all':
    default:
      return true;
  }
};

// Convert archived past events into the same searchable/card shape
const archivedPastCards = pastEvents.map(p => ({
  id: `past-${p.id}`,
  title: p.title,
  category: p.category || 'Workshop',
  description: p.description,
  banner: p.image_url,
  event_date: p.date_label,
  date_label: p.date_label,
  speaker: p.speaker,
  winners: p.winners,
  winner_link: p.winner_link,
  venue: '',
  status: 'completed' as const,
  isArchived: true,
  event_start_date: undefined as string | undefined,
  event_end_date: undefined as string | undefined,
  start_time: undefined as string | undefined,
  end_time: undefined as string | undefined,
  contact_email: '',
  event_type: 'individual' as const,
  min_team_size: null,
  max_team_size: null,
  registration_start: '',
  registration_end: '',
}));

// Current database events
const currentEventCards = events.map(ev => ({
  ...ev,
  isArchived: false,
  date_label: undefined as string | undefined,
}));

// All events, including archived past events
const allEventCards = [
  ...currentEventCards,
  ...archivedPastCards,
];

const filteredEvents = allEventCards
  .filter(event => {
    if (isHomepage) {
      return (
        event.status === 'registration_open' ||
        event.status === 'upcoming'
      );
    }

    return (
      matchesTab(event) &&
      matchesCategory(event) &&
      matchesSearch(event)
    );
  })
  .sort((a, b) => {
    const getStart = (event: any) => {
      const date = event.event_start_date || event.event_date;
      const time = event.start_time || '00:00:00';

      if (!date) return Infinity;

      return new Date(`${date}T${time}`).getTime();
    };

    const getEnd = (event: any) => {
      const date = event.event_end_date || event.event_date;
      const time = event.end_time || '23:59:59';

      if (!date) return -Infinity;

      return new Date(`${date}T${time}`).getTime();
    };

    const now = Date.now();

    const getPriority = (event: any) => {
      const start = getStart(event);
      const end = getEnd(event);

      if (event.isArchived || end < now) return 2; // Past
      if (start <= now && now <= end) return 0;     // Live
      return 1;                                    // Upcoming
    };

    const priorityA = getPriority(a);
    const priorityB = getPriority(b);

    // Live → Upcoming → Past
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Within each group, chronological order
    if (priorityA === 2) {
      return getStart(b) - getStart(a); // Newest past first
    }

    return getStart(a) - getStart(b); // Earliest live/upcoming first
  });

const displayedUpcomingEvents = filteredEvents;

const resultCount = displayedUpcomingEvents.length;


  // ── Homepage: calendar list style ──────────────────────────────
  if (isHomepage) {
    return (
      <>
      <section
        id="events"
        style={{
          background: 'hsl(228, 28%, 91%)',
          borderTop: '1px solid hsl(228, 20%, 80%)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem' }}>
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'hsl(230, 25%, 10%)',
              marginBottom: '0.6rem',
            }}
          >
            Calendar
          </h2>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
              color: 'hsl(230, 15%, 45%)',
              marginBottom: '2.5rem',
            }}
          >
            Sessions are open to every DA-IICT student. Walk in; nothing is ticketed.
          </p>

          {/* Event list */}
          <div>
            {loadingEvents ? (
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'hsl(230, 15%, 50%)' }}>Loading events...</p>
            ) : displayedUpcomingEvents.length === 0 ? (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'hsl(230, 15%, 50%)', padding: '2rem 0', borderTop: '1px solid hsl(228, 20%, 80%)' }}>
                No upcoming events at the moment. Check back soon.
              </p>
            ) : (
              displayedUpcomingEvents.map((ev) => {
                const hasDate = Boolean(ev.event_start_date || ev.event_date);
                const dateObj = hasDate ? new Date((ev.event_start_date || ev.event_date)!) : null;
                const day = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : 'TBA';
                const month = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short' }) : '';
                const date = dateObj ? dateObj.getDate() : '';
                
                const metaParts = [];
                if (ev.venue) metaParts.push(ev.venue);
                if (ev.start_time) metaParts.push(ev.start_time);
                if (ev.event_type) metaParts.push(ev.event_type);
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      gap: '2rem',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      background: 'white',
                      border: '1px solid hsl(228, 20%, 84%)',
                      alignItems: 'flex-start',
                      marginBottom: '1rem',
                      transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) scale(1.01)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px -6px rgba(99, 102, 241, 0.18)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'hsl(243, 75%, 59%)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLElement).style.borderColor = 'hsl(228, 20%, 84%)';
                    }}
                  >
                    {/* Date column */}
                    <div style={{ minWidth: 70, flexShrink: 0 }}>
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.65rem',
                          letterSpacing: '0.1em',
                          color: 'hsl(230, 15%, 50%)',
                          marginBottom: 2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {day}
                      </p>
                      <p
                        style={{
                          fontFamily: 'Playfair Display, Georgia, serif',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: 'hsl(243, 75%, 59%)',
                          lineHeight: 1.1,
                        }}
                      >
                        {month ? `${month} ${date}` : 'TBA'}
                      </p>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontFamily: 'Playfair Display, Georgia, serif',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: 'hsl(230, 25%, 12%)',
                          marginBottom: '0.35rem',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {ev.title}
                      </h3>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '0.88rem',
                          color: 'hsl(230, 15%, 40%)',
                          lineHeight: 1.6,
                          marginBottom: '0.75rem',
                          maxWidth: 600,
                        }}
                      >
                        {ev.description}
                      </p>
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.75rem',
                          color: 'hsl(230, 15%, 48%)',
                        }}
                      >
                        {metaParts.join(' · ')}
                        {ev.status === 'registration_open' && (
                          <span style={{ color: 'hsl(243, 75%, 59%)', marginLeft: metaParts.length > 0 ? 8 : 0 }}>· Open for registration</span>
                        )}
                      </p>

                      {/* Register button + View Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                        {ev.status === 'registration_open' && (
                          registeredEventIds.includes(ev.id) ? (
                            <span style={{ display: 'inline-block', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'hsl(243,75%,59%)', padding: '4px 12px', border: '1px solid hsl(243,75%,80%)', borderRadius: 2 }}>
                              Registered ✓
                            </span>
                          ) : ev.registration_link ? (
                            <a
                              href={ev.registration_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-block', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'hsl(228,30%,93%)', background: 'hsl(230,25%,12%)', padding: '5px 14px', borderRadius: 2, textDecoration: 'none', border: '1px solid hsl(230,25%,12%)' }}
                            >
                              Register now
                            </a>
                          ) : (
                            <button
                              onClick={() => setSelectedEvent(ev)}
                              style={{ display: 'inline-block', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'hsl(228,30%,93%)', background: 'hsl(230,25%,12%)', padding: '5px 14px', borderRadius: 2, border: '1px solid hsl(230,25%,12%)', cursor: 'pointer' }}
                            >
                              Register now
                            </button>
                          )
                        )}
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'hsl(243,75%,59%)', background: 'transparent', padding: '4px 10px', border: '1px solid hsl(243,75%,75%)', borderRadius: 2, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(243,75%,97%)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <ArrowRight size={11} /> View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Footnote */}
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.72rem',
                color: 'hsl(230, 15%, 55%)',
                marginTop: '1.5rem',
                borderTop: '1px solid hsl(228, 20%, 80%)',
                paddingTop: '1rem',
              }}
            >
              Dates shift occasionally around institute schedules — check the Discord for updates.
            </p>
          </div>

          {/* Past Events Highlights (2 Past Events on Homepage) */}
          {pastEvents.length > 0 && (
            <div style={{ marginTop: '3rem', paddingTop: '2.5rem', borderTop: '1px solid hsl(228, 20%, 80%)' }}>
              <h3
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'hsl(230, 25%, 10%)',
                  marginBottom: '1.25rem',
                }}
              >
                Past Events & Workshops
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pastEvents.slice(0, 2).map((pe) => (
                  <div
                    key={pe.id}
                    onClick={() => setSelectedEvent(pe as any)}
                    className="glass-card relative overflow-hidden p-6 flex flex-col justify-between cursor-pointer group bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-xl transition-all"
                  >
                    <div>
                      {pe.image_url && (
                        <div className="w-full mb-4 rounded-xl overflow-hidden bg-secondary">
                          <img src={pe.image_url} alt={pe.title} className="w-full object-contain group-hover:scale-105 transition-transform duration-500" style={{ maxHeight: '220px' }} />
                        </div>
                      )}
                      <span className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded bg-primary/10 text-primary border border-primary/20">{pe.category || 'Workshop'}</span>
                      <h4 className="font-display font-bold text-lg text-foreground mt-3 mb-1">{pe.title}</h4>
                      {pe.date_label && <p className="text-xs font-semibold text-primary mb-2">{pe.date_label}</p>}
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{pe.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View all CTA */}
          <div style={{ marginTop: '2.5rem' }}>
            <Link
              to="/events"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem',
                color: 'hsl(243, 75%, 59%)', textDecoration: 'none', letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
            >
              View all events {'&'} archive <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* Registration Modal Overlay (shared with full page) */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.05), hsl(217 91% 60% / 0.02))' }}
            >
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-20"
              >
                <X size={16} />
              </button>

              {(selectedEvent.banner || (selectedEvent as any).image_url) && (
                <div className="w-full mb-4 rounded-xl overflow-hidden bg-secondary border border-border/50">
                  <img
                    src={selectedEvent.banner || (selectedEvent as any).image_url}
                    alt={selectedEvent.title}
                    className="w-full object-contain"
                    style={{ maxHeight: '320px' }}
                  />
                </div>
              )}

              {(() => {
                const evStatus = selectedEvent.status;
                const isPastOrCompleted = evStatus === 'completed' || evStatus === 'registration_closed' || !evStatus;
                return (
                  <>
                    <h3 className="font-display font-extrabold text-foreground text-xl mb-1">{selectedEvent.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {isPastOrCompleted ? 'Event Details' : 'Event Details & Registration'}
                    </p>

                    {/* Always show description */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {selectedEvent.description}
                    </p>

                    {/* Event metadata */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground mb-4">
                      {selectedEvent.venue && <span>📍 {selectedEvent.venue}</span>}
                      {(selectedEvent.event_start_date || selectedEvent.event_date) && (
                        <span>📅 {new Date((selectedEvent.event_start_date || selectedEvent.event_date)!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      )}
                      {selectedEvent.start_time && <span>🕐 {selectedEvent.start_time}{selectedEvent.end_time ? ` – ${selectedEvent.end_time}` : ''}</span>}
                      {selectedEvent.event_type && <span>👥 {selectedEvent.event_type === 'team' ? 'Team Event' : 'Individual'}</span>}
                    </div>

                    {isPastOrCompleted ? (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-center">
                        <p className="text-sm font-medium text-muted-foreground">This event has ended.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Registration is no longer available.</p>
                      </div>
                    ) : (
                      <>
                        {submitMessage && (
                          <div
                            className={`p-3 rounded-lg text-xs font-medium mb-4 ${
                              submitMessage.type === 'success' ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-destructive/10 border border-destructive/20 text-destructive'
                            }`}
                          >
                            {submitMessage.text}
                          </div>
                        )}

                        {loadingSchema ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <span className="text-xs text-muted-foreground">Loading registration fields...</span>
                          </div>
                        ) : (
                          <form onSubmit={handleSubmit} className="space-y-4">
                            {formFields.map((field) => {
                              const isRequired = field.required;
                              return (
                                <div key={field.id}>
                                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">
                                    {field.label} {isRequired && <span className="text-destructive">*</span>}
                                  </label>

                                  {field.field_type === 'file' ? (
                                    <div className="relative">
                                      <label className="flex items-center justify-center gap-2 w-full bg-secondary border border-border border-dashed rounded-lg px-3 py-3 text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-foreground transition-colors">
                                        <Upload size={16} />
                                        <span>{uploadedFiles[field.id] ? uploadedFiles[field.id].name : field.placeholder || 'Choose File'}</span>
                                        <input
                                          type="file"
                                          required={isRequired && !uploadedFiles[field.id]}
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleFileChange(field.id, e.target.files[0]);
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                    </div>
                                  ) : field.field_type === 'dropdown' ? (
                                    <select
                                      required={isRequired}
                                      value={responses[field.id] || ''}
                                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors appearance-none"
                                    >
                                      <option value="" disabled>{field.placeholder || 'Select option...'}</option>
                                      {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  ) : field.field_type === 'checkbox' ? (
                                    <div className="space-y-2 mt-1">
                                      {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                                        <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={(responses[field.id] || []).includes(opt)}
                                            onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                            className="rounded bg-secondary border border-border outline-none focus:ring-primary text-primary w-4 h-4"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : field.field_type === 'radio' ? (
                                    <div className="space-y-2 mt-1">
                                      {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                                        <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`radio-${field.id}`}
                                            checked={responses[field.id] === opt}
                                            onChange={() => handleInputChange(field.id, opt)}
                                            className="bg-secondary border border-border outline-none focus:ring-primary text-primary w-4 h-4"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  ) : field.field_type === 'textarea' ? (
                                    <textarea
                                      required={isRequired}
                                      placeholder={field.placeholder || ''}
                                      value={responses[field.id] || ''}
                                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                                      rows={3}
                                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                                    />
                                  ) : (
                                    <input
                                      type={field.field_type === 'phone' ? 'tel' : field.field_type}
                                      required={isRequired}
                                      placeholder={field.placeholder || ''}
                                      value={responses[field.id] || ''}
                                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                                    />
                                  )}
                                </div>
                              );
                            })}

                            {selectedEvent.event_type === 'team' && (
                              <div className="mt-6 pt-4 border-t border-border space-y-4">
                                <h4 className="flex items-center gap-2 font-display font-bold text-sm text-foreground">
                                  <Users size={16} className="text-primary" />
                                  Team Details
                                </h4>
                                <div>
                                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">
                                    Team Name <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="Enter unique team name"
                                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase">
                                    Additional Team Members ({teamMembers.length + 1} / {selectedEvent.max_team_size || 4})
                                  </label>
                                  {teamMembers.map((member, idx) => (
                                    <div key={idx} className="flex gap-2 items-center bg-secondary/30 p-3 rounded-lg border border-border/50 relative">
                                      <div className="grid grid-cols-2 gap-2 w-full pr-6">
                                        <input
                                          type="text"
                                          required
                                          value={member.name}
                                          onChange={(e) => {
                                            const updated = [...teamMembers];
                                            updated[idx].name = e.target.value;
                                            setTeamMembers(updated);
                                          }}
                                          placeholder="Member Name"
                                          className="bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                        />
                                        <input
                                          type="email"
                                          required
                                          value={member.email}
                                          onChange={(e) => {
                                            const updated = [...teamMembers];
                                            updated[idx].email = e.target.value;
                                            setTeamMembers(updated);
                                          }}
                                          placeholder="Member Email"
                                          className="bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                                        />
                                      </div>
                                      {teamMembers.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeTeamMember(idx)}
                                          className="absolute right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {teamMembers.length + 1 < (selectedEvent.max_team_size || 4) && (
                                    <button
                                      type="button"
                                      onClick={addTeamMember}
                                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 mt-1"
                                    >
                                      + Add Team Member
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="pt-4 border-t border-border/50">
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Submitting Registration...
                                  </>
                                ) : (
                                  <>
                                    Register for Event
                                    <ArrowRight size={14} />
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </>
    );
  }

  // ── Full page: original detailed view ────────────────────────────
  return (
    <section id="events" style={{
  background: `
    radial-gradient(
      circle at 10% 10%,
      rgba(99,102,241,0.08),
      transparent 28%
    ),
    radial-gradient(
      circle at 90% 30%,
      rgba(139,92,246,0.07),
      transparent 25%
    ),
    hsl(228, 28%, 95%)
  `,
}}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 2rem' }}>
          <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className="mb-10"
>
  <div
    className="text-xs font-semibold uppercase tracking-[0.2em] mb-3"
    style={{
      color: 'hsl(243,75%,59%)',
    }}
  >
    AI CLUB · EVENTS
  </div>

  <h1
    className="font-display font-bold"
    style={{
      fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
      lineHeight: 1,
      letterSpacing: '-0.045em',
      color: 'hsl(230,25%,10%)',
    }}
  >
    Discover what&apos;s
    <br />
    <span
      style={{
        background:
          'linear-gradient(90deg, hsl(243,75%,59%), hsl(270,80%,62%))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      happening next.
    </span>
  </h1>

  <p
    className="mt-5 max-w-2xl"
    style={{
      fontSize: '1rem',
      lineHeight: 1.7,
      color: 'hsl(230,15%,45%)',
    }}
  >
    Workshops, hackathons, seminars, and AI events organized
    by the AI Club community.
  </p>
</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >

        {/* Highlight banner */}
        {featured && (
          <motion.div
            className="rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.1), hsl(160 90% 43% / 0.05))', border: '1px solid hsl(217 91% 60% / 0.25)' }}
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div>
              <span className="text-xs font-mono text-primary tracking-widest uppercase">Next Up</span>
              <h3 className="font-display font-bold text-xl text-foreground mt-2">{featured.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">{featured.description}</p>
              {featured.status === 'registration_open' && (
                registeredEventIds.includes(featured.id) ? (
                  <button disabled className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-primary/20 text-primary border border-primary/20 cursor-not-allowed">
                    Already Registered
                  </button>
                ) : featured.registration_link ? (
                  <a
                    href={featured.registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
                  >
                    Register Now
                  </a>
                ) : (
                  <button
                    onClick={() => setSelectedEvent(featured)}
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-105 transition-all duration-300"
                  >
                    Register Now
                  </button>
                )
              )}
            </div>
            <div className="flex gap-5">
              {timeLeft.d === '00' && timeLeft.h === '00' && timeLeft.m === '00' && timeLeft.s === '00' ? (
                <div className="flex items-center justify-center bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl text-primary font-mono text-sm font-semibold tracking-wider animate-pulse self-center">
                  COMING SOON
                </div>
              ) : (
                Object.entries(timeLeft).map(([unit, value]) => (
                  <div key={unit} className="text-center">
                    <motion.span
                      key={value}
                      initial={{ y: -8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="font-mono text-3xl font-bold text-primary block"
                    >
                      {value}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1 block">
                      {unit === 'd' ? 'Days' : unit === 'h' ? 'Hours' : unit === 'm' ? 'Mins' : 'Secs'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Event filters */}
{!isHomepage && (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl p-4 md:p-5 mb-8"
    style={{
      background: 'rgba(255,255,255,0.72)',
      border: '1px solid rgba(99,102,241,0.12)',
      boxShadow: '0 8px 30px rgba(45,50,100,0.05)',
      backdropFilter: 'blur(14px)',
    }}
  >
    <div className="flex flex-col xl:flex-row gap-5 xl:items-center">

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { value: 'all', label: 'All' },
          { value: 'live', label: 'Live' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
        ].map((tab) => (
          <motion.button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            whileTap={{ scale: 0.96 }}
            className="relative px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background:
                activeTab === tab.value
                  ? 'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))'
                  : 'transparent',
              color:
                activeTab === tab.value
                  ? 'white'
                  : 'hsl(230,15%,48%)',
              boxShadow:
                activeTab === tab.value
                  ? '0 4px 14px rgba(99,102,241,0.22)'
                  : 'none',
            }}
          >
            {tab.label}

            {tab.value === 'live' && (
              <span
                className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    activeTab === 'live' ? 'white' : 'rgb(34,197,94)',
                }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden xl:block w-px h-7 bg-border" />

      {/* Categories */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground mr-1">
          Category
        </span>

        {[
          { value: '', label: 'All' },
          { value: 'Hackathon', label: 'Hackathon' },
          { value: 'Workshop', label: 'Workshop' },
          { value: 'Seminar', label: 'Seminar' },
        ].map((category) => (
          <motion.button
            key={category.value}
            onClick={() => setCategoryFilter(category.value)}
            whileTap={{ scale: 0.96 }}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background:
                categoryFilter === category.value
                  ? 'rgba(99,102,241,0.10)'
                  : 'transparent',
              color:
                categoryFilter === category.value
                  ? 'hsl(243,75%,55%)'
                  : 'hsl(230,15%,50%)',
              border:
                categoryFilter === category.value
                  ? '1px solid rgba(99,102,241,0.25)'
                  : '1px solid rgba(100,110,150,0.16)',
            }}
          >
            {category.label}
          </motion.button>
        ))}
      </div>

      {/* Search */}
      <div className="xl:ml-auto w-full xl:w-[280px]">
        <div
          className="relative"
          style={{
            transition: 'all 0.2s ease',
          }}
        >
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />

          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs outline-none"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(100,110,150,0.18)',
              color: 'hsl(230,25%,15%)',
            }}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
)}

        {!loadingEvents && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-between mb-5"
  >
    <div className="text-xs text-muted-foreground">
      Showing{' '}
      <span className="font-semibold text-foreground">
        {displayedUpcomingEvents.length}
      </span>{' '}
      {displayedUpcomingEvents.length === 1 ? 'event' : 'events'}
    </div>

    {(searchQuery || categoryFilter || activeTab !== 'all') && (
      <button
        onClick={() => {
          setSearchQuery('');
          setCategoryFilter('');
          setActiveTab('all');
        }}
        className="text-xs font-medium text-primary hover:underline"
      >
        Clear filters
      </button>
    )}
  </motion.div>
)}
        {loadingEvents ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : displayedUpcomingEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No events found in this category.</p>
        ) : (
          <div
  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
  style={{
    perspective: '1200px',
  }}
>
  <AnimatePresence mode="popLayout">
    {displayedUpcomingEvents.map((card, i) => {
      const eventImage = card.banner || (card as any).image_url;

      const isLive = card.status === 'registration_open';
      const isPast =
        card.status === 'completed' ||
        card.status === 'registration_closed' ||
        card.isArchived;

      return (
        <motion.div
          key={card.id || card.title}
          layout
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              delay: i * 0.07,
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            y: -15,
            transition: { duration: 0.2 },
          }}
          whileHover={{
            y: -8,
            transition: {
              duration: 0.25,
              ease: 'easeOut',
            },
          }}
          onClick={() => setSelectedEvent(card)}
          className="group relative overflow-hidden rounded-2xl cursor-pointer"
          style={{
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(246,247,255,0.92))',
            border: '1px solid rgba(99,102,241,0.16)',
            boxShadow:
              '0 8px 30px rgba(45, 50, 100, 0.08)',
            transition:
              'box-shadow 0.3s ease, border-color 0.3s ease',
          }}
        >
          {/* Hover glow */}
          <div
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)',
              filter: 'blur(10px)',
            }}
          />

          {/* Event Image */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              height: '210px',
              background:
                'linear-gradient(135deg, hsl(243,75%,59%,0.12), hsl(270,80%,65%,0.08))',
            }}
          >
            {eventImage ? (
              <motion.img
                src={eventImage}
                alt={card.title}
                loading="lazy"
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.06 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CalendarDays
                  size={48}
                  className="text-primary/30"
                />
              </div>
            )}

            {/* Image gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgba(10,12,30,0.72) 0%, rgba(10,12,30,0.08) 55%, transparent 100%)',
              }}
            />

            {/* Category */}
            <div className="absolute top-4 left-4">
              <span
                className="px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.14em] uppercase"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  color: 'hsl(243,75%,50%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}
              >
                {card.category}
              </span>
            </div>

            {/* Live / Past badge */}
            <div className="absolute top-4 right-4">
              {isLive ? (
                <span
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: 'rgba(34,197,94,0.92)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-white"
                    style={{
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  Live
                </span>
              ) : isPast ? (
                <span
                  className="px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase"
                  style={{
                    background: 'rgba(15,23,42,0.72)',
                    color: 'white',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  Past
                </span>
              ) : (
                <span
                  className="px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase"
                  style={{
                    background: 'rgba(99,102,241,0.9)',
                    color: 'white',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  Upcoming
                </span>
              )}
            </div>

            {/* Date on image */}
            <div className="absolute bottom-4 left-4 text-white">
              <div
                className="text-xs font-medium opacity-80"
                style={{ letterSpacing: '0.08em' }}
              >
                EVENT DATE
              </div>
              <div className="text-sm font-semibold mt-0.5">
                {card.event_start_date || card.event_date || card.date_label}
              </div>
            </div>
          </div>

          {/* Card content */}
          <div className="p-6">
            <h4
              className="font-display font-bold text-xl leading-tight mb-3"
              style={{
                color: 'hsl(230,25%,12%)',
                letterSpacing: '-0.02em',
              }}
            >
              {card.title}
            </h4>

            <p
              className="text-sm leading-relaxed mb-5"
              style={{
                color: 'hsl(230,15%,45%)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {card.description}
            </p>

            {/* Event information */}
            <div
              className="space-y-2.5 pt-4"
              style={{
                borderTop: '1px solid rgba(100,110,150,0.14)',
              }}
            >
              {(card.venue || card.event_type) && (
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      color: 'hsl(243,75%,59%)',
                    }}
                  >
                    <CalendarDays size={13} />
                  </div>

                  <span
                    style={{
                      color: 'hsl(230,15%,48%)',
                    }}
                  >
                    {card.venue || 'Online'}
                  </span>

                  {card.event_type && (
                    <>
                      <span className="text-muted-foreground/40">
                        •
                      </span>
                      <span
                        className="capitalize"
                        style={{
                          color: 'hsl(230,15%,48%)',
                        }}
                      >
                        {card.event_type} event
                      </span>
                    </>
                  )}
                </div>
              )}

              {card.speaker && (
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(139,92,246,0.08)',
                      color: 'rgb(139,92,246)',
                    }}
                  >
                    <Mic size={13} />
                  </div>

                  <span
                    style={{
                      color: 'hsl(230,15%,48%)',
                    }}
                  >
                    {card.speaker}
                  </span>
                </div>
              )}
            </div>

            {/* Winners */}
            {card.winners && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-3 rounded-xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(234,179,8,0.10), rgba(245,158,11,0.04))',
                  border: '1px solid rgba(234,179,8,0.20)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-yellow-600 mb-1">
                  <span>🏆</span>
                  Winners
                </div>

                <div
                  className="text-xs leading-relaxed"
                  style={{
                    color: 'hsl(230,15%,40%)',
                  }}
                >
                  {card.winners}
                </div>

                {card.winner_link && (
                  <a
                    href={card.winner_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
                  >
                    View results
                    <ExternalLink size={11} />
                  </a>
                )}
              </motion.div>
            )}

            {/* Register button */}
            {card.status === 'registration_open' && !card.isArchived && (
              <div className="mt-5">
                {registeredEventIds.includes(card.id) ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-xs font-semibold"
                    style={{
                      background: 'rgba(99,102,241,0.07)',
                      color: 'rgba(99,102,241,0.45)',
                      border: '1px solid rgba(99,102,241,0.12)',
                    }}
                  >
                    Already Registered
                  </button>
                ) : card.registration_link ? (
                  <a
                    href={card.registration_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="group/button w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))',
                      color: 'white',
                      boxShadow:
                        '0 5px 18px rgba(99,102,241,0.22)',
                    }}
                  >
                    Register Now
                    <ArrowRight
                      size={14}
                      className="group-hover/button:translate-x-1 transition-transform"
                    />
                  </a>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(card);
                    }}
                    className="group/button w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(243,75%,59%), hsl(270,80%,62%))',
                      color: 'white',
                      boxShadow:
                        '0 5px 18px rgba(99,102,241,0.22)',
                    }}
                  >
                    Register Now
                    <ArrowRight
                      size={14}
                      className="group-hover/button:translate-x-1 transition-transform"
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom accent */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background:
                'linear-gradient(90deg, hsl(243,75%,59%), hsl(270,80%,65%))',
            }}
          />
        </motion.div>
      );
    })}
  </AnimatePresence>
</div>
        )}

        {/* placeholder - homepage handled above */}
      </motion.div>
      {/* Registration Modal Overlay */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEvent(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />

            {/* Form Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-10"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.05), hsl(217 91% 60% / 0.02))' }}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors z-20"
              >
                <X size={16} />
              </button>

              {(selectedEvent.banner || (selectedEvent as any).image_url) && (
                <div className="w-full mb-4 rounded-xl overflow-hidden bg-secondary border border-border/50">
                  <img
                    src={selectedEvent.banner || (selectedEvent as any).image_url}
                    alt={selectedEvent.title}
                    className="w-full object-contain"
                    style={{ maxHeight: '320px' }}
                  />
                </div>
              )}

              {(() => {
                const evStatus = selectedEvent.status;
                const isPastOrCompleted = evStatus === 'completed' || evStatus === 'registration_closed' || !evStatus;
                return (
                  <>
                    <h3 className="font-display font-extrabold text-foreground text-xl mb-1">{selectedEvent.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {isPastOrCompleted ? 'Event Details' : 'Event Details & Registration'}
                    </p>

                    {isPastOrCompleted ? (
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-center">
                        <p className="text-sm font-medium text-muted-foreground">This event has ended.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Registration is no longer available.</p>
                      </div>
                    ) : (
                      <>
                        {submitMessage && (
                          <div
                            className={`p-3 rounded-lg text-xs font-medium mb-4 ${
                              submitMessage.type === 'success' ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-destructive/10 border border-destructive/20 text-destructive'
                            }`}
                          >
                            {submitMessage.text}
                          </div>
                        )}

                        {loadingSchema ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <span className="text-xs text-muted-foreground">Loading registration fields...</span>
                          </div>
                        ) : (
                          <form onSubmit={handleSubmit} className="space-y-4">
                  
                            {/* DYNAMIC FORM FIELDS */}
                            {formFields.map((field) => {
                              const isRequired = field.required;
                              return (
                                <div key={field.id}>
                                  <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">
                                    {field.label} {isRequired && <span className="text-destructive">*</span>}
                                  </label>

                        {/* File Upload Field */}
                        {field.field_type === 'file' ? (
                          <div className="relative">
                            <label className="flex items-center justify-center gap-2 w-full bg-secondary border border-border border-dashed rounded-lg px-3 py-3 text-sm text-muted-foreground cursor-pointer hover:border-primary hover:text-foreground transition-colors">
                              <Upload size={16} />
                              <span>{uploadedFiles[field.id] ? uploadedFiles[field.id].name : field.placeholder || 'Choose File'}</span>
                              <input
                                type="file"
                                required={isRequired && !uploadedFiles[field.id]}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileChange(field.id, e.target.files[0]);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : field.field_type === 'dropdown' ? (
                          <select
                            required={isRequired}
                            value={responses[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors appearance-none"
                          >
                            <option value="" disabled>{field.placeholder || 'Select option...'}</option>
                            {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.field_type === 'checkbox' ? (
                          <div className="space-y-2 mt-1">
                            {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                              <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(responses[field.id] || []).includes(opt)}
                                  onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                                  className="rounded bg-secondary border border-border outline-none focus:ring-primary text-primary w-4 h-4"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.field_type === 'radio' ? (
                          <div className="space-y-2 mt-1">
                            {field.options_json && JSON.parse(field.options_json).map((opt: string) => (
                              <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                  type="radio"
                                  name={`radio-${field.id}`}
                                  checked={responses[field.id] === opt}
                                  onChange={() => handleInputChange(field.id, opt)}
                                  className="bg-secondary border border-border outline-none focus:ring-primary text-primary w-4 h-4"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.field_type === 'textarea' ? (
                          <textarea
                            required={isRequired}
                            placeholder={field.placeholder || ''}
                            value={responses[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            rows={3}
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                          />
                        ) : (
                          // Standard input types (text, email, phone, number, date)
                          <input
                            type={field.field_type === 'phone' ? 'tel' : field.field_type}
                            required={isRequired}
                            placeholder={field.placeholder || ''}
                            value={responses[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* TEAM REGISTRATION SECTION */}
                  {selectedEvent.event_type === 'team' && (
                    <div className="mt-6 pt-4 border-t border-border space-y-4">
                      <h4 className="flex items-center gap-2 font-display font-bold text-sm text-foreground">
                        <Users size={16} className="text-primary" />
                        Team Details
                      </h4>
                      <div>
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase mb-1">
                          Team Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Enter unique team name"
                          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      {/* Team Members List */}
                      <div className="space-y-3">
                        <label className="block text-xs font-mono tracking-wider text-muted-foreground uppercase">
                          Additional Team Members ({teamMembers.length + 1} / {selectedEvent.max_team_size || 4})
                        </label>
                        {teamMembers.map((member, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-secondary/30 p-3 rounded-lg border border-border/50 relative">
                            <div className="grid grid-cols-2 gap-2 w-full pr-6">
                              <input
                                type="text"
                                required
                                value={member.name}
                                onChange={(e) => {
                                  const updated = [...teamMembers];
                                  updated[idx].name = e.target.value;
                                  setTeamMembers(updated);
                                }}
                                placeholder="Member Name"
                                className="bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                              />
                              <input
                                type="email"
                                required
                                value={member.email}
                                onChange={(e) => {
                                  const updated = [...teamMembers];
                                  updated[idx].email = e.target.value;
                                  setTeamMembers(updated);
                                }}
                                placeholder="Member Email"
                                className="bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                              />
                            </div>
                            {teamMembers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTeamMember(idx)}
                                className="absolute right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        {teamMembers.length + 1 < (selectedEvent.max_team_size || 4) && (
                          <button
                            type="button"
                            onClick={addTeamMember}
                            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 mt-1"
                          >
                            + Add Team Member
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/50">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Submitting Registration...
                        </>
                      ) : (
                        <>
                          Register for Event
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                          </form>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}
