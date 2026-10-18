import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  Mic,
  UsersRound,
  ExternalLink,
  ArrowRight,
  Trophy,
  Check,
} from 'lucide-react';
import { normalizeBannerUrl } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface EventDetailData {
  id: number | string;
  title: string;
  description: string;
  banner?: string | null;
  image_url?: string | null;
  category?: string;
  venue?: string;
  contact_email?: string;
  event_type?: 'individual' | 'team' | string;
  registration_link?: string | null;
  min_team_size?: number | null;
  max_team_size?: number | null;
  event_date?: string;
  event_start_date?: string;
  event_end_date?: string;
  start_time?: string;
  end_time?: string;
  status?: 'upcoming' | 'registration_open' | 'registration_closed' | 'completed' | string;
  speaker?: string | null;
  winners?: string | null;
  winner_link?: string | null;
  date_label?: string;
}

interface EventDetailModalProps {
  event: EventDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  isRegistered?: boolean;
}

export default function EventDetailModal({
  event,
  isOpen,
  onClose,
  isRegistered = false,
}: EventDetailModalProps) {
  const navigate = useNavigate();

  // Close on Escape key and prevent background scrolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!event) return null;

  const hasDate = Boolean(event.event_start_date || event.event_date);
  const dateObj = hasDate ? new Date((event.event_start_date || event.event_date)!) : null;
  const formattedDate = dateObj
    ? dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : event.date_label || 'Date TBA';

  const defaultBanner =
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80';
  const bannerSrc = normalizeBannerUrl(event.banner || event.image_url) || defaultBanner;

  const isRegistrationOpen = event.status === 'registration_open';
  const isCompleted = event.status === 'completed' || event.status === 'registration_closed';

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
    if (isRegistered) {
      navigate('/my-registrations');
    } else if (event.registration_link) {
      window.open(event.registration_link, '_blank');
    } else {
      navigate(`/events/${event.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
          {/* Backdrop with blur - matches Achievement modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0.1 }}
            className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 md:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors z-20 cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            {/* Event Banner */}
            <div className="w-full max-h-72 mb-6 rounded-xl overflow-hidden bg-secondary border border-border/50 flex items-center justify-center relative">
              <img
                src={bannerSrc}
                alt={event.title}
                className="w-full h-full object-cover max-h-72"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = defaultBanner;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Badges & Category Header */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {event.category && (
                <span className="text-xs font-mono text-primary uppercase tracking-wider px-3 py-1 bg-primary/10 rounded-md border border-primary/20">
                  {event.category}
                </span>
              )}

              {isRegistrationOpen ? (
                <span className="text-xs font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Open for Registration
                </span>
              ) : event.status === 'upcoming' ? (
                <span className="text-xs font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-md bg-primary/15 text-primary border border-primary/30">
                  Upcoming
                </span>
              ) : isCompleted ? (
                <span className="text-xs font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                  Completed
                </span>
              ) : null}

              {event.event_type && (
                <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-md bg-secondary text-muted-foreground border border-border flex items-center gap-1.5">
                  <UsersRound size={12} />
                  {event.event_type === 'team'
                    ? `Team (${event.min_team_size || 1}–${event.max_team_size || 4})`
                    : 'Individual'}
                </span>
              )}
            </div>

            {/* Event Title */}
            <h2
              id="event-modal-title"
              className="text-2xl md:text-3xl font-bold font-display text-foreground mb-2 leading-tight break-words"
            >
              {event.title}
            </h2>

            {/* Speaker Information */}
            {event.speaker && (
              <p className="text-sm font-semibold text-primary mb-4 flex items-center gap-1.5">
                <Mic size={14} className="shrink-0" />
                By {event.speaker}
              </p>
            )}

            {/* Event Details Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-secondary/40 border border-border/50 text-xs font-mono text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-primary shrink-0" />
                <span>{formattedDate}</span>
              </div>

              {event.start_time && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary shrink-0" />
                  <span>
                    {event.start_time}
                    {event.end_time ? ` – ${event.end_time}` : ''}
                  </span>
                </div>
              )}

              {event.venue && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-primary shrink-0" />
                  <span>{event.venue}</span>
                </div>
              )}

              {event.event_type && (
                <div className="flex items-center gap-2">
                  <UsersRound size={14} className="text-primary shrink-0" />
                  <span className="capitalize">{event.event_type} Format</span>
                </div>
              )}
            </div>

            {/* Full Untruncated Description */}
            <div className="border-t border-border/50 pt-5 mb-6">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                About this Event
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line break-words">
                {event.description}
              </p>
            </div>

            {/* Winners section if present */}
            {event.winners && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="font-semibold text-amber-500 flex items-center gap-1.5 mb-1">
                  <Trophy size={14} />
                  Winners & Accolades
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.winners}
                </p>
                {event.winner_link && (
                  <a
                    href={event.winner_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-primary hover:underline font-medium"
                  >
                    View Winner Results <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="border-t border-border/50 pt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/events/${event.id}`);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Event Page</span>
                  <ExternalLink size={12} />
                </button>

                {isRegistrationOpen && (
                  isRegistered ? (
                    <button
                      type="button"
                      onClick={handleRegisterClick}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Registered</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRegisterClick}
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <span>Register Now</span>
                      <ArrowRight size={13} />
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
