import Events from '@/components/club/Events';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';

const EventsPage = () => {
  return (
    <div className="relative z-[1] min-h-screen pt-14">
      <Events isHomepage={false} />
      <Footer short />
      <Chatbot />
    </div>
  );
};

export default EventsPage;

