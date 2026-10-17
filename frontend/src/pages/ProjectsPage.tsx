import Projects from '@/components/club/Projects';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';

const ProjectsPage = () => {
  return (
    <div className="relative z-[1] min-h-screen pt-14">
      <Projects isHomepage={false} />
      <Footer short />
      <Chatbot />
    </div>
  );
};

export default ProjectsPage;

