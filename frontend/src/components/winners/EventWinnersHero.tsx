import React, { useState } from 'react';
import { Trophy, ChevronDown, Share2, Sparkles, Check, ArrowDown } from 'lucide-react';
import { ShowcaseEvent } from './types';
import { toast } from 'sonner';

interface EventWinnersHeroProps {
  event: ShowcaseEvent;
  allEvents: ShowcaseEvent[];
  onSelectEvent: (event: ShowcaseEvent) => void;
}

export const EventWinnersHero: React.FC<EventWinnersHeroProps> = ({
  event,
  allEvents,
  onSelectEvent,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShareEvent = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('event', event.id);
    url.searchParams.delete('winner');
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success('Event link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToPodium = () => {
    const el = document.getElementById('podium-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      {/* Decorative ambient lighting */}
      <div className="winners-backdrop" />
      <div className="winners-grid-lines" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Kicker badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono tracking-widest uppercase text-slate-300 backdrop-blur-md mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F4B942] animate-ping" />
          <span>AI CLUB · DA-IICT · CELEBRATING EXCELLENCE / 2026</span>
        </div>

        {/* Main Title */}
        <h1 className="font-heading font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-[76px] tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          Every win has a <span className="text-[#F4B942]">story.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg md:text-xl text-[#8B9BB4] max-w-2xl mx-auto font-normal leading-relaxed">
          The people and teams who pushed boundaries and made their mark across hackathons, coding competitions, and AI challenges.
        </p>

        {/* Featured Event Card & Quick Switcher */}
        <div className="mt-12 max-w-3xl mx-auto showcase-card p-6 sm:p-8 bg-gradient-to-b from-[#151922] to-[#11141C] border border-[#F4B942]/25 shadow-2xl relative">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#F4B942]/15 text-[#F4B942] text-[10px] font-mono tracking-widest uppercase border border-[#F4B942]/30 font-bold">
                <Sparkles size={11} />
                FEATURED EVENT
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono tracking-wider uppercase border border-emerald-500/20">
                WINNERS ANNOUNCED
              </span>
            </div>

            <span className="text-xs font-mono text-slate-400">
              Edition {event.edition} {event.date && `· ${event.date}`}
            </span>
          </div>

          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight text-left">
            {event.title}
          </h2>

          {event.description && (
            <p className="mt-2.5 text-xs sm:text-sm text-slate-400 text-left line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Action Row */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={scrollToPodium}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4B942] hover:bg-[#e0a735] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all transform active:scale-95 shadow-lg shadow-[#F4B942]/20"
            >
              <ArrowDown size={14} />
              <span>Meet The Winners</span>
            </button>

            <div className="flex items-center gap-2 relative">
              {/* Event Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 border border-white/10 transition-colors"
                >
                  <Trophy size={13} className="text-[#F4B942]" />
                  <span>Switch Event</span>
                  <ChevronDown size={13} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-[#151922] border border-white/10 shadow-2xl z-30 p-1.5">
                    <p className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      Select Competition
                    </p>
                    {allEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          onSelectEvent(ev);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                          ev.id === event.id
                            ? 'bg-[#F4B942]/15 text-[#F4B942]'
                            : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span className="truncate">{ev.title}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                          {ev.edition}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Share Event Link */}
              <button
                type="button"
                onClick={handleShareEvent}
                aria-label="Share official results link"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-slate-300 border border-white/10 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
