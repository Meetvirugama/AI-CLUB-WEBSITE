import React, { useState, useMemo } from 'react';
import { Search, Trophy, Medal, Award, Star, ArrowUpRight, Filter, Users } from 'lucide-react';
import { ShowcaseEvent, EventWinner, ResultsFilterTab } from './types';

interface ResultsSectionProps {
  event: ShowcaseEvent;
  onSelectWinner: (winner: EventWinner) => void;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  event,
  onSelectWinner,
}) => {
  const [filterTab, setFilterTab] = useState<ResultsFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allWinners = event.winners || [];

  // Filtered list
  const filteredWinners = useMemo(() => {
    return allWinners.filter((w) => {
      // 1. Tab filter
      if (filterTab === 'podium' && w.placement > 3) return false;
      if (filterTab === 'finalists' && (w.placement <= 3 || (w.award && w.award.toLowerCase().includes('special')))) {
        return false;
      }
      if (filterTab === 'awards' && (!w.award || !w.award.toLowerCase().includes('special'))) {
        return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = w.name.toLowerCase().includes(q);
        const projMatch = (w.projectTitle || '').toLowerCase().includes(q);
        const catMatch = (w.category || '').toLowerCase().includes(q);
        const memberMatch = (w.members || []).some((m) => m.toLowerCase().includes(q));
        return nameMatch || projMatch || catMatch || memberMatch;
      }

      return true;
    });
  }, [allWinners, filterTab, searchQuery]);

  return (
    <section className="py-12 md:py-16 border-t border-white/[0.06]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-slate-400 mb-2">
              <Filter size={12} className="text-[#F4B942]" />
              <span>Rankings & Leaderboard</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              All Results
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Verified standings and accolades for {event.title}
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search team, member, project…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#F4B942]/60 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-white/[0.06] pb-4">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-[#F4B942] text-slate-950 font-bold shadow-md shadow-[#F4B942]/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            All Placements ({allWinners.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('podium')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterTab === 'podium'
                ? 'bg-[#F4B942] text-slate-950 font-bold shadow-md shadow-[#F4B942]/20'
                : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Podium (Top 3)
          </button>

          {allWinners.some((w) => w.placement > 3) && (
            <button
              type="button"
              onClick={() => setFilterTab('finalists')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterTab === 'finalists'
                  ? 'bg-[#F4B942] text-slate-950 font-bold shadow-md shadow-[#F4B942]/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              Finalists
            </button>
          )}

          {allWinners.some((w) => w.award && w.award.toLowerCase().includes('special')) && (
            <button
              type="button"
              onClick={() => setFilterTab('awards')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterTab === 'awards'
                  ? 'bg-[#F4B942] text-slate-950 font-bold shadow-md shadow-[#F4B942]/20'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              Special Awards
            </button>
          )}
        </div>

        {/* Results List / Leaderboard Rows */}
        {filteredWinners.length > 0 ? (
          <div className="space-y-3">
            {filteredWinners.map((winner) => {
              const placement = winner.placement;

              let rankBadge = (
                <span className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
                  #{placement}
                </span>
              );

              if (placement === 1) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-[#F4B942]/20 border border-[#F4B942]/50 flex items-center justify-center font-mono font-bold text-xs text-[#F4B942]">
                    <Trophy size={14} />
                  </span>
                );
              } else if (placement === 2) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-slate-200/20 border border-slate-200/50 flex items-center justify-center font-mono font-bold text-xs text-slate-200">
                    <Medal size={14} />
                  </span>
                );
              } else if (placement === 3) {
                rankBadge = (
                  <span className="w-8 h-8 rounded-full bg-amber-600/20 border border-amber-600/50 flex items-center justify-center font-mono font-bold text-xs text-amber-500">
                    <Award size={14} />
                  </span>
                );
              }

              return (
                <div
                  key={winner.id}
                  onClick={() => onSelectWinner(winner)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectWinner(winner);
                    }
                  }}
                  className="result-row showcase-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                >
                  {/* Left: Rank + Team Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {rankBadge}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading font-bold text-base sm:text-lg text-white group-hover:text-[#F4B942] transition-colors">
                          {winner.name}
                        </h4>
                        {winner.award && (
                          <span className="text-[10px] font-mono tracking-wide px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/5">
                            {winner.award}
                          </span>
                        )}
                      </div>

                      {winner.projectTitle && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          <span className="text-[#8B9BB4] font-mono mr-1">Project:</span>
                          {winner.projectTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Category, Members & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 ml-11 sm:ml-0">
                    {winner.members && winner.members.length > 0 && (
                      <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
                        <Users size={12} className="text-slate-500" />
                        {winner.members.slice(0, 2).join(', ')}
                        {winner.members.length > 2 && ` +${winner.members.length - 2}`}
                      </span>
                    )}

                    {winner.score ? (
                      <span className="text-xs font-mono font-bold text-slate-300 bg-white/[0.05] px-2.5 py-1 rounded">
                        {winner.score} pts
                      </span>
                    ) : null}

                    <div className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-[#F4B942] transition-colors">
                      <span>View</span>
                      <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="showcase-card p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-3 text-slate-500">
              <Search size={20} />
            </div>
            <h4 className="font-heading font-semibold text-white text-base">No matches found</h4>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or switching to &ldquo;All Placements&rdquo;.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-xs text-white transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
