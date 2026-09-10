import Team from '@/components/club/Team';
import Chatbot from '@/components/club/Chatbot';

const TeamPage = () => {
  return (
    <div className="relative z-[1] h-[100dvh] overflow-hidden bg-[#ECF0F7] flex flex-col">
      <main className="flex-1 min-h-0 flex flex-col">
        <Team isHomepage={false} />
      </main>

      <Chatbot />
    </div>
  );
};

export default TeamPage;
