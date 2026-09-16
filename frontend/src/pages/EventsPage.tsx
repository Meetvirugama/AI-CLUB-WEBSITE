import Navbar from '@/components/club/Navbar';
import Events from '@/components/club/Events';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const EventsPage = () => {
  return (
    <div className="relative z-[1] min-h-screen">
      <div className="pt-28 max-w-[1280px] mx-auto px-8 -mb-16 relative z-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-transparent border border-border/50 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-primary/30 hover:from-primary/15 transition-all duration-300 group"
        >
          <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform duration-300 text-primary" />
          <span>Back to Home</span>
        </Link>
      </div>
      <Events isHomepage={false} />
      <Footer />
      <Chatbot />
    </div>
  );
};

export default EventsPage;
