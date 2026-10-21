import React from 'react';
import { Archive, ArrowUpRight, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { ShowcaseEvent } from './types';

interface PastEventsArchiveProps {
  events: ShowcaseEvent[];
  activeEventId: string;
  onSelectEvent: (event: ShowcaseEvent) => void;
}

export const PastEventsArchive: React.FC<PastEventsArchiveProps> = ({
  events,
  activeEventId,
  onSelectEvent,
}) => {
  if (!events || events.length === 0) {
    return null;
  }

  const handleEventClick = (event: ShowcaseEvent) => {
    onSelectEvent(event);
    const podiumEl = document.getElementById('podium-section');
    if (podiumEl) {
      podiumEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06] bg-black/20">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-slate-400 mb-2">
            <Archive size={12} className="text-[#F4B942]" />
            <span>Past Event Archive</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            From Our Archives
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Browse official results and championship histories from past AI Club tournaments
          </p>
        </div>

        {/* 2- or 3-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isActive = event.id === activeEventId;
            const topWinner = event.winners?.find((w) => w.placement === 1) || event.winners?.[0];
            const winnersCount = event.winners?.length || 0;

            return (
              <div
                key={event.id}
                data-testid={`archive-card-${event.id}`}
                onClick={() => handleEventClick(event)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEventClick(event);
                  }
                }}
                className={`showcase-card p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden transition-all duration-300 ${
                  isActive
                    ? 'border-[#F4B942]/50 bg-white/[0.04] ring-1 ring-[#F4B942]/30 shadow-lg shadow-[#F4B942]/5'
                    : 'hover:border-white/20 hover:-translate-y-1'
                }`}
              >
                <div>
                  {/* Top row: Year & Category pill */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] border border-white/5 text-xs font-mono text-slate-300">
                      <Calendar size={11} className="text-[#8B9BB4]" />
                      Edition {event.edition}
                    </span>

                    {isActive && (
                      <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4B942]/15 text-[#F4B942] border border-[#F4B942]/30">
                        Currently Viewing
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-heading font-bold text-lg text-white group-hover:text-[#F4B942] transition-colors line-clamp-2">
                    {event.title}
                  </h3>

                  {event.description && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  {/* Champion summary */}
                  {topWinner && (
                    <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center gap-2">
                      <Trophy size={13} className="text-[#F4B942] shrink-0" />
                      <p className="text-xs text-slate-300 font-medium truncate">
                        <span className="text-[#8B9BB4] text-[11px] font-mono mr-1">Champion:</span>
                        {topWinner.name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div className="mt-6 pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-500 font-mono text-[11px]">
                    {winnersCount} official {winnersCount === 1 ? 'placement' : 'placements'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#F4B942] group-hover:translate-x-1 transition-transform">
                    <span>View Results</span>
                    <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
