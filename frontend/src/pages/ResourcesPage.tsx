import Resources from '@/components/club/Resources';
import Roadmap from '@/components/club/Roadmap';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';

const ResourcesPage = () => {
  return (
    <div className="relative z-[1] min-h-screen pt-20">
      <Roadmap isHomepage={false} />
      <Resources isHomepage={false} />
      <Footer short />
      <Chatbot />
    </div>
  );
};

export default ResourcesPage;

