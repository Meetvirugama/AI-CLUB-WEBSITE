import React, { useEffect } from 'react';
import {
  X,
  Trophy,
  Medal,
  Award,
  Users,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import { EventWinner, ShowcaseEvent } from './types';
import { toast } from 'sonner';

interface WinnerDetailModalProps {
  winner: EventWinner | null;
  event: ShowcaseEvent | null;
  onClose: () => void;
}

export const WinnerDetailModal: React.FC<WinnerDetailModalProps> = ({
  winner,
  event,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (winner) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [winner, onClose]);

  if (!winner) return null;

  const placement = winner.placement;
  let Icon = Award;
  let badgeClass = 'badge-gold';
  let placementLabel = `Placement #${placement}`;

  if (placement === 1) {
    Icon = Trophy;
    badgeClass = 'badge-gold font-bold';
    placementLabel = '1ST PLACE CHAMPION';
  } else if (placement === 2) {
    Icon = Medal;
    badgeClass = 'badge-silver font-semibold';
    placementLabel = '2ND PLACE RUNNER-UP';
  } else if (placement === 3) {
    Icon = Award;
    badgeClass = 'badge-bronze font-semibold';
    placementLabel = '3RD PLACE';
  }

  const handleCopyLink = () => {
    if (!event) return;
    const url = new URL(window.location.href);
    url.searchParams.set('event', event.id);
    url.searchParams.set('winner', winner.id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-winner-name"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#151922] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        {/* Header: Placement badge & Event title */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase ${badgeClass}`}>
            <Icon size={13} />
            {placementLabel}
          </span>

          {event && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded">
              <Calendar size={11} className="text-[#8B9BB4]" />
              {event.title} ({event.edition})
            </span>
          )}
        </div>

        {/* Winner / Team Name */}
        <h2 id="modal-winner-name" className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {winner.name}
        </h2>

        {/* Award title / accolade */}
        {winner.award && (
          <div className="mt-2 text-sm font-medium text-[#F4B942]">
            {winner.award}
          </div>
        )}

        {/* Score & Category grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          {winner.category && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Category
              </p>
              <p className="text-xs font-medium text-slate-200 mt-0.5 truncate">
                {winner.category}
              </p>
            </div>
          )}

          {winner.score ? (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Final Score
              </p>
              <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                {winner.score} / 100
              </p>
            </div>
          ) : null}

          {event?.date && (
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                Date
              </p>
              <p className="text-xs font-medium text-slate-200 mt-0.5 truncate">
                {event.date}
              </p>
            </div>
          )}
        </div>

        {/* Project Section (if project-based) */}
        {winner.projectTitle && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-mono uppercase tracking-wider text-[#8B9BB4]">
              Featured Project
            </p>
            <h3 className="font-heading font-bold text-lg text-white mt-1">
              {winner.projectTitle}
            </h3>
            {winner.projectDescription && (
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-line">
                {winner.projectDescription}
              </p>
            )}
          </div>
        )}

        {/* Team Members */}
        {winner.members && winner.members.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
              <Users size={12} className="text-[#F4B942]" />
              <span>Team Members ({winner.members.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {winner.members.map((member, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-white/[0.05] border border-white/5 text-xs font-medium text-slate-200"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* External Winner Document Link if present */}
        {event?.winner_link && (
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <a
              href={event.winner_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#F4B942] hover:underline font-mono"
            >
              <span>View Official Tournament Announcement Document</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Actions row */}
        <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied Link!' : 'Share Winner'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
