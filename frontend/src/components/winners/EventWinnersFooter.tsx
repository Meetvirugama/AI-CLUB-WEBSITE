import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Sparkles, ArrowRight } from 'lucide-react';

export const EventWinnersFooter: React.FC = () => {
  return (
    <footer className="py-16 md:py-20 border-t border-white/[0.08] bg-[#080A10] relative z-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="showcase-card p-8 sm:p-12 bg-gradient-to-r from-[#151922] via-[#121620] to-[#151922] border border-[#F4B942]/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F4B942]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4B942]/10 border border-[#F4B942]/20 text-[#F4B942] text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles size={12} />
            <span>Ready for the next challenge?</span>
          </div>

          <h3 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight max-w-xl mx-auto">
            Your journey to the podium starts with the next event.
          </h3>

          <p className="mt-3 text-sm text-[#8B9BB4] max-w-md mx-auto">
            Join the AI Club community, compete in upcoming hackathons, collaborate with fellow builders, and showcase your solutions.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F4B942] hover:bg-[#e0a735] text-slate-950 font-bold text-xs uppercase tracking-wider transition-all transform active:scale-95 shadow-lg shadow-[#F4B942]/20"
            >
              <Calendar size={14} />
              <span>Explore Upcoming Events</span>
              <ArrowRight size={13} />
            </Link>

            <Link
              to="/projects"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold text-xs tracking-wider transition-colors border border-white/10"
            >
              <span>View Club Projects</span>
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
          <p>© {new Date().getFullYear()} AI Club DA-IICT · Championship Showcase</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-slate-300 transition-colors">
              Home
            </Link>
            <Link to="/events" className="hover:text-slate-300 transition-colors">
              Events
            </Link>
            <Link to="/team" className="hover:text-slate-300 transition-colors">
              Team
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
