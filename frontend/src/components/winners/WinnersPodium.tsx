import React from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { ShowcaseEvent, EventWinner } from './types';
import { WinnerCard } from './WinnerCard';

interface WinnersPodiumProps {
  event: ShowcaseEvent;
  onSelectWinner: (winner: EventWinner) => void;
  hideHeader?: boolean;
}

export const WinnersPodium: React.FC<WinnersPodiumProps> = ({
  event,
  onSelectWinner,
  hideHeader = false,
}) => {
  const winners = event.winners || [];
  const first = winners.find((w) => w.placement === 1) || winners[0];
  const second = winners.find((w) => w.placement === 2) || winners[1];
  const third = winners.find((w) => w.placement === 3) || winners[2];

  if (!first) {
    return null;
  }

  return (
    <section id="podium-section" className={hideHeader ? "py-4 md:py-6 relative" : "py-12 md:py-16 relative"}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        {!hideHeader && (
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4B942]/10 border border-[#F4B942]/20 text-[#F4B942] text-xs font-mono tracking-widest uppercase mb-3">
              <Trophy size={13} />
              <span>The Podium</span>
            </div>

            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Official Results
            </h2>
            <p className="mt-3 text-sm md:text-base text-slate-400">
              {event.title} · Edition {event.edition}
            </p>
          </div>
        )}

        {/* Desktop Podium Layout (1024px+): 2nd (left), 1st (center, elevated), 3rd (right) */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6 items-end max-w-6xl mx-auto">
          {/* 2nd Place (Left) */}
          <div className="order-1">
            {second ? (
              <WinnerCard
                winner={second}
                isFirstPlace={false}
                onSelect={onSelectWinner}
              />
            ) : (
              <div className="showcase-card p-8 border-dashed border-white/10 text-center text-slate-500 font-mono text-sm">
                2nd Place not declared
              </div>
            )}
          </div>

          {/* 1st Place (Center, visually dominant) */}
          <div className="order-2 z-10">
            <WinnerCard
              winner={first}
              isFirstPlace={true}
              onSelect={onSelectWinner}
            />
          </div>

          {/* 3rd Place (Right) */}
          <div className="order-3">
            {third ? (
              <WinnerCard
                winner={third}
                isFirstPlace={false}
                onSelect={onSelectWinner}
              />
            ) : (
              <div className="showcase-card p-8 border-dashed border-white/10 text-center text-slate-500 font-mono text-sm">
                3rd Place not declared
              </div>
            )}
          </div>
        </div>

        {/* Tablet & Mobile Layout: Stacked with 1st place prominently featured first */}
        <div className="lg:hidden flex flex-col gap-6 max-w-xl mx-auto">
          {/* 1st Place first */}
          <WinnerCard
            winner={first}
            isFirstPlace={true}
            onSelect={onSelectWinner}
          />

          {/* 2nd Place */}
          {second && (
            <WinnerCard
              winner={second}
              isFirstPlace={false}
              onSelect={onSelectWinner}
            />
          )}

          {/* 3rd Place */}
          {third && (
            <WinnerCard
              winner={third}
              isFirstPlace={false}
              onSelect={onSelectWinner}
            />
          )}
        </div>
      </div>
    </section>
  );
};
