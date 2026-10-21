import Navbar from '@/components/club/Navbar';
import Events from '@/components/club/Events';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';

const EventsPage = () => {
  return (
    <div className="relative z-[1] min-h-screen bg-[#080A12]">
      <div className="pt-28 max-w-[1280px] mx-auto px-8 -mb-16 relative z-10 flex items-center justify-between flex-wrap gap-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono tracking-widest uppercase text-slate-400 hover:text-white hover:border-violet-400/40 hover:bg-white/[0.08] transition-all duration-300 group backdrop-blur-md"
        >
          <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform duration-300 text-violet-400" />
          <span>Back to Home</span>
        </Link>

        <Link 
          to="/winners" 
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F4B942]/10 border border-[#F4B942]/30 text-[11px] font-mono tracking-wider uppercase text-[#F4B942] hover:bg-[#F4B942]/20 hover:border-[#F4B942]/50 transition-all duration-300 group backdrop-blur-md shadow-lg shadow-[#F4B942]/10"
        >
          <Trophy size={12} className="text-[#F4B942] group-hover:scale-110 transition-transform" />
          <span>Winners &amp; Championship Showcase →</span>
        </Link>
      </div>
      <Events isHomepage={false} />
      <Footer short />
      <Chatbot />
    </div>
  );
};

export default EventsPage;
