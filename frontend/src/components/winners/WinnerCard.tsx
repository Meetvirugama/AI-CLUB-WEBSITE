import React from 'react';
import { Trophy, Medal, Award, Users, ArrowUpRight, Sparkles } from 'lucide-react';
import { EventWinner } from './types';

interface WinnerCardProps {
  winner: EventWinner;
  isFirstPlace?: boolean;
  onSelect: (winner: EventWinner) => void;
}

export const WinnerCard: React.FC<WinnerCardProps> = ({
  winner,
  isFirstPlace = false,
  onSelect,
}) => {
  const placement = winner.placement;

  let cardClass = 'showcase-card p-6 flex flex-col justify-between';
  let badgeClass = 'badge-gold';
  let Icon = Trophy;
  let rankLabel = '1ST PLACE';

  if (placement === 1) {
    cardClass = 'showcase-card podium-card-first p-7 md:p-8 flex flex-col justify-between';
    badgeClass = 'badge-gold font-bold tracking-wider';
    Icon = Trophy;
    rankLabel = 'CHAMPION · 1ST PLACE';
  } else if (placement === 2) {
    cardClass = 'showcase-card podium-card-second p-6 flex flex-col justify-between';
    badgeClass = 'badge-silver font-semibold tracking-wider';
    Icon = Medal;
    rankLabel = '2ND PLACE';
  } else if (placement === 3) {
    cardClass = 'showcase-card podium-card-third p-6 flex flex-col justify-between';
    badgeClass = 'badge-bronze font-semibold tracking-wider';
    Icon = Award;
    rankLabel = '3RD PLACE';
  }

  return (
    <div
      data-testid={`winner-card-${winner.id}`}
      onClick={() => onSelect(winner)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(winner);
        }
      }}
      className={`${cardClass} cursor-pointer group relative overflow-hidden transition-all duration-300 ${
        isFirstPlace ? 'md:-translate-y-4 shadow-xl z-10' : 'hover:-translate-y-1'
      }`}
    >
      {/* Ambient subtle glow for 1st place */}
      {isFirstPlace && (
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#F4B942]/10 rounded-full blur-2xl pointer-events-none" />
      )}

      {/* Top row: Rank badge + Score/Prize */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase ${badgeClass}`}
          >
            <Icon size={13} className={isFirstPlace ? 'text-[#F4B942] animate-pulse' : ''} />
            {rankLabel}
          </span>

          {winner.score ? (
            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded border border-white/5">
              Score: <strong className="text-slate-200">{winner.score}</strong>
            </span>
          ) : winner.award && winner.award.includes('Prize:') ? (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
              {winner.award.split('Prize:')[1].trim()}
            </span>
          ) : null}
        </div>

        {/* Winner / Team Name */}
        <h3
          className={`font-heading font-bold tracking-tight text-white transition-colors duration-200 ${
            isFirstPlace
              ? 'text-2xl md:text-3xl text-white group-hover:text-[#F4B942]'
              : 'text-xl md:text-2xl text-slate-100 group-hover:text-white'
          }`}
        >
          {winner.name}
        </h3>

        {/* Project Title / Tagline if available */}
        {winner.projectTitle && (
          <div className="mt-2.5">
            <p className="text-sm font-medium text-slate-300 line-clamp-1 group-hover:text-slate-200">
              <span className="text-[#8B9BB4] text-xs uppercase tracking-wide font-mono mr-1.5">
                Project:
              </span>
              {winner.projectTitle}
            </p>
          </div>
        )}

        {/* Short description preview if present */}
        {winner.projectDescription && (
          <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {winner.projectDescription}
          </p>
        )}
      </div>

      {/* Bottom row: Category, Members & CTA button */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {winner.category && (
            <span className="text-[11px] font-mono tracking-wide text-[#8B9BB4] bg-white/[0.04] px-2 py-0.5 rounded">
              {winner.category}
            </span>
          )}

          {winner.members && winner.members.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Users size={11} className="text-slate-500" />
              {winner.members.length} {winner.members.length === 1 ? 'member' : 'members'}
            </span>
          )}
        </div>

        <button
          type="button"
          data-testid={`winner-details-btn-${winner.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 group-hover:text-[#F4B942] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(winner);
          }}
        >
          <span>Details</span>
          <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
