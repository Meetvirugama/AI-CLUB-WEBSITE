import { useEffect } from 'react';
import Achievements from '@/components/club/Achievements';
import Chatbot from '@/chatbot/Chatbot';

const AchievementsPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative z-[1] min-h-screen">
      <Achievements />
      <Chatbot />
    </div>
  );
};

export default AchievementsPage;
