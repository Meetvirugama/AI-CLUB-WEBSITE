import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Trophy, 
  Share2, 
  ExternalLink, 
  Calendar, 
  Award, 
  Sparkles, 
  Check, 
  ChevronDown 
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { ShowcaseEvent, EventWinner } from '@/components/winners/types';
import { INITIAL_SHOWCASE_EVENTS } from '@/components/winners/initialData';
import { WinnersPodium } from '@/components/winners/WinnersPodium';
import { WinnerCard } from '@/components/winners/WinnerCard';
import { WinnerDetailModal } from '@/components/winners/WinnerDetailModal';
import Footer from '@/components/club/Footer';
import { ComponentErrorBoundary } from '@/components/common/ComponentErrorBoundary';
import '@/components/winners/winners-page.css';

const EventWinnersPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedWinner, setSelectedWinner] = useState<EventWinner | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch all events that have declared winners
  const { data: remoteEvents, isLoading } = useQuery<ShowcaseEvent[]>({
    queryKey: ['event-winners-showcase'],
    queryFn: async () => {
      return await api.get<ShowcaseEvent[]>('/api/events/winners');
    },
    staleTime: 5 * 60 * 1000,
  });

  // Effective events: remote API data if available, fallback to verified initial data
  const allEvents = useMemo(() => {
    if (remoteEvents && Array.isArray(remoteEvents) && remoteEvents.length > 0) {
      return remoteEvents;
    }
    return INITIAL_SHOWCASE_EVENTS;
  }, [remoteEvents]);

  // Target event identifier from route path (/events/:id/winners, /winners/:id) or query param (?event=)
  const targetEventId = useMemo(() => {
    const raw = id || searchParams.get('event');
    return raw ? raw.trim() : null;
  }, [id, searchParams]);

  // Active event resolution: exact match or suffix match
  const activeEvent = useMemo<ShowcaseEvent | null>(() => {
    if (!allEvents || allEvents.length === 0) return null;

    if (targetEventId) {
      const lower = targetEventId.toLowerCase();
      const match = allEvents.find((e) => {
        const eid = e.id.toLowerCase();
        return (
          eid === lower ||
          eid === `club-${lower}` ||
          eid === `past-${lower}` ||
          eid.endsWith(`-${lower}`) ||
          eid.replace(/^(past-|club-)/, '') === lower
        );
      });
      return match || null;
    }

    // Default to the first featured event, or first event overall when no event was specified in URL
    return allEvents.find((e) => e.featured) || allEvents[0] || null;
  }, [allEvents, targetEventId]);

  // Sync winner detail modal from URL query param on mount or change
  useEffect(() => {
    const winnerParam = searchParams.get('winner');
    if (winnerParam && activeEvent) {
      const matchedWinner = (activeEvent.winners || []).find(
        (w) => w.id.toLowerCase() === winnerParam.toLowerCase()
      );
      if (matchedWinner) {
        setSelectedWinner(matchedWinner);
      }
    }
  }, [searchParams, activeEvent]);

  // Document title for SEO
  useEffect(() => {
    const prevTitle = document.title;
    if (activeEvent) {
      document.title = `${activeEvent.title} — Official Winners | AI Club DA-IICT`;
    } else {
      document.title = 'Event Winners — AI Club DA-IICT';
    }
    return () => {
      document.title = prevTitle;
    };
  }, [activeEvent]);

  // Handle switching to another event via dropdown selector
  const handleSwitchEvent = (eventId: string) => {
    navigate(`/events/${eventId}/winners`);
  };

  // Winner selection: open modal and sync URL
  const handleSelectWinner = (winner: EventWinner) => {
    setSelectedWinner(winner);
    try {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (activeEvent) {
          next.set('event', activeEvent.id);
        }
        next.set('winner', winner.id);
        return next;
      });
    } catch {
      // safe fallback in test environments
    }
  };

  // Close modal: clear state and remove winner URL param
  const handleCloseModal = () => {
    setSelectedWinner(null);
    try {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('winner');
        return next;
      });
    } catch {
      // safe fallback in test environments
    }
  };

  // Share link handler
  const handleShare = () => {
    if (!activeEvent) return;
    const url = new URL(window.location.origin + `/events/${activeEvent.id}/winners`);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success('Winners link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Categorize winners into podium (1, 2, 3) vs remaining/special awards
  const { podiumWinners, additionalWinners, hasPodium } = useMemo(() => {
    const list = activeEvent?.winners || [];
    const first = list.find((w) => w.placement === 1);
    const hasAnyPodium = Boolean(first);

    if (hasAnyPodium) {
      const podium = list.filter((w) => w.placement >= 1 && w.placement <= 3);
      const remaining = list.filter((w) => w.placement > 3 || !w.placement);
      return { podiumWinners: podium, additionalWinners: remaining, hasPodium: true };
    }

    return { podiumWinners: [], additionalWinners: list, hasPodium: false };
  }, [activeEvent]);

  return (
    <div className="winners-page-root min-h-screen bg-[#080A12] flex flex-col justify-between">
      {/* Ambient background glows */}
      <div className="winners-backdrop" />
      <div className="winners-grid-lines" />

      <main className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-36 pb-20">
        {/* Top Control Bar: Back to Events, Switcher, Share */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Link
              to="/events"
              data-testid="back-to-events-btn"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-violet-400/40 text-[11px] font-mono tracking-widest uppercase text-slate-300 hover:text-white transition-all duration-300 group backdrop-blur-md shadow-sm"
            >
              <ArrowLeft size={12} className="text-violet-400 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Events</span>
            </Link>

            {activeEvent && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
                <span>/</span>
                <span className="text-slate-400 truncate max-w-[200px] md:max-w-[320px]">{activeEvent.title}</span>
                <span>/</span>
                <span className="text-[#F4B942]">Winners</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Event Switcher Dropdown (switches active event without listing other events) */}
            {allEvents.length > 1 && activeEvent && (
              <div className="flex items-center gap-2">
                <label htmlFor="event-switcher" className="text-[11px] font-mono uppercase text-slate-400 hidden md:inline">
                  Event:
                </label>
                <div className="relative">
                  <select
                    id="event-switcher"
                    data-testid="event-switcher-select"
                    value={activeEvent.id}
                    onChange={(e) => handleSwitchEvent(e.target.value)}
                    className="appearance-none bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:border-[#F4B942]/60 cursor-pointer transition-colors"
                  >
                    {allEvents.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-[#151922] text-slate-200">
                        {ev.title} ({ev.edition})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            )}

            {/* Share Link Button */}
            {activeEvent && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share winners link"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Event Main Content */}
        {activeEvent ? (
          <div>
            {/* Event Header Banner */}
            <div className="showcase-card p-6 sm:p-8 md:p-10 mb-10 bg-gradient-to-b from-[#151922]/95 via-[#131620]/95 to-[#0F1118]/95 border border-[#F4B942]/30 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#F4B942]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2.5 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4B942]/15 text-[#F4B942] text-[11px] font-mono tracking-widest uppercase border border-[#F4B942]/35 font-bold">
                    <Trophy size={12} className="text-[#F4B942]" />
                    OFFICIAL WINNERS
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] border border-white/10 text-xs font-mono text-slate-300">
                    <Calendar size={12} className="text-slate-400" />
                    Edition {activeEvent.edition} {activeEvent.date && `· ${activeEvent.date}`}
                  </span>

                  {activeEvent.category && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-violet-500/10 text-violet-300 text-xs font-mono uppercase border border-violet-500/20">
                      {activeEvent.category}
                    </span>
                  )}
                </div>

                {/* Event Title */}
                <h1 className="font-heading font-extrabold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
                  {activeEvent.title}
                </h1>

                {/* Event Description */}
                {activeEvent.description && (
                  <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                    {activeEvent.description}
                  </p>
                )}

                {/* External Results Link if declared */}
                {activeEvent.winner_link && (
                  <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-3">
                    <a
                      href={activeEvent.winner_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F4B942] hover:bg-[#e0a735] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all transform active:scale-95 shadow-md shadow-[#F4B942]/20"
                    >
                      <span>Official Results Document</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Winners Section: ONLY this event's winners */}
            {activeEvent.winners && activeEvent.winners.length > 0 ? (
              <div className="space-y-12">
                {/* 3-Place Podium */}
                {hasPodium && (
                  <ComponentErrorBoundary name="WinnersPodium">
                    <WinnersPodium
                      event={activeEvent}
                      onSelectWinner={handleSelectWinner}
                      hideHeader={true}
                    />
                  </ComponentErrorBoundary>
                )}

                {/* Additional Placements or Single Grid if no 3-place podium */}
                {(!hasPodium || additionalWinners.length > 0) && (
                  <div className="pt-6">
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-slate-400 mb-1">
                        <Award size={12} className="text-[#F4B942]" />
                        <span>{hasPodium ? 'Additional Placements & Accolades' : 'Tournament Standings'}</span>
                      </div>
                      <h2 className="font-heading text-2xl font-bold text-white tracking-tight">
                        {hasPodium ? 'Runners-Up & Special Recognitions' : 'Official Results'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {(hasPodium ? additionalWinners : activeEvent.winners).map((w, idx) => (
                        <WinnerCard
                          key={w.id || `winner-${idx}`}
                          winner={w}
                          isFirstPlace={!hasPodium && w.placement === 1}
                          onSelect={handleSelectWinner}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty Winners State for this event */
              <div className="showcase-card p-12 text-center max-w-xl mx-auto border-dashed border-white/10">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#F4B942]">
                  <Trophy size={20} />
                </div>
                <h3 className="font-heading text-lg font-bold text-white mb-2">
                  No Winners Declared Yet
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  The official results and standings for {activeEvent.title} have not been finalized or published yet. Please check back soon!
                </p>
                <Link
                  to="/events"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono uppercase tracking-wider text-slate-200"
                >
                  <ArrowLeft size={12} />
                  <span>Return to Events</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          /* Event Not Found State */
          <div className="showcase-card p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4 text-violet-400">
              <Calendar size={20} />
            </div>
            <h3 className="font-heading text-xl font-bold text-white mb-2">
              Event Not Found
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              We couldn't find the requested event or its declared winners.
            </p>
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4B942] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#F4B942]/20"
            >
              <ArrowLeft size={13} />
              <span>Back to All Events</span>
            </Link>
          </div>
        )}

        {/* Winner Detail Modal */}
        <WinnerDetailModal
          winner={selectedWinner}
          event={activeEvent}
          onClose={handleCloseModal}
        />
      </main>

      {/* Standard Club Footer */}
      <Footer short />
    </div>
  );
};

export default EventWinnersPage;
