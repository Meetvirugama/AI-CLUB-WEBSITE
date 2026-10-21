import React from 'react';
import { Calendar, Filter, Sparkles, Check, Share2, Layers } from 'lucide-react';
import { ShowcaseEvent } from './types';
import { toast } from 'sonner';

interface EventSelectorProps {
  events: ShowcaseEvent[];
  activeEvent: ShowcaseEvent;
  onSelectEvent: (event: ShowcaseEvent) => void;
  selectedYear: string;
  onSelectYear: (year: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  activeEvent,
  onSelectEvent,
  selectedYear,
  onSelectYear,
  selectedCategory,
  onSelectCategory,
}) => {
  const [copied, setCopied] = React.useState(false);

  // Collect unique years & categories
  const years = React.useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.edition) set.add(e.edition);
    });
    return Array.from(set).sort().reverse();
  }, [events]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [events]);

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('event', activeEvent.id);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    toast.success('Event link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8 relative z-20">
      <div className="showcase-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#151922]/90 backdrop-blur-xl border border-white/10 shadow-xl">
        {/* Left: Quick Event selector pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 whitespace-nowrap hidden sm:inline mr-1">
            Events:
          </span>
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelectEvent(ev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                ev.id === activeEvent.id
                  ? 'bg-[#F4B942] text-slate-950 font-bold shadow-sm shadow-[#F4B942]/20'
                  : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {ev.title.length > 25 ? `${ev.title.slice(0, 25)}…` : ev.title}
            </button>
          ))}
        </div>

        {/* Right: Year Filter + Category Filter + Share */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {/* Year Filter */}
          {years.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-[#8B9BB4] hidden sm:block" />
              <select
                aria-label="Filter events by year"
                value={selectedYear}
                onChange={(e) => onSelectYear(e.target.value)}
                className="bg-white/[0.05] border border-white/10 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#F4B942]/50 cursor-pointer"
              >
                <option value="all" className="bg-[#151922] text-slate-200">
                  All Years
                </option>
                {years.map((y) => (
                  <option key={y} value={y} className="bg-[#151922] text-slate-200">
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Filter */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-[#8B9BB4] hidden sm:block" />
              <select
                aria-label="Filter events by competition category"
                value={selectedCategory}
                onChange={(e) => onSelectCategory(e.target.value)}
                className="bg-white/[0.05] border border-white/10 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#F4B942]/50 cursor-pointer"
              >
                <option value="all" className="bg-[#151922] text-slate-200">
                  All Categories
                </option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#151922] text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            title="Share this event's results"
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
