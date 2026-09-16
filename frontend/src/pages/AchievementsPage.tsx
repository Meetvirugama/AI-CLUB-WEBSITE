import { useEffect } from 'react';
import Navbar from '@/components/club/Navbar';
import Achievements from '@/components/club/Achievements';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';

const AchievementsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative z-[1] min-h-screen pt-16">
      <Achievements />
      <div className="h-px bg-border mx-6 md:mx-12 relative z-[1]" />
      <Footer short />
      <Chatbot />
    </div>
  );
};

export default AchievementsPage;
