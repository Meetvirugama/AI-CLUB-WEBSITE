import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '@/components/club/Navbar';
import Hero from '@/components/club/Hero';
import ProgressTrackerCard from '@/components/club/ProgressTrackerCard';
import Events from '@/components/club/Events';
import Projects from '@/components/club/Projects';
import Team from '@/components/club/Team';
import Resources from '@/components/club/Resources';
import Roadmap from '@/components/club/Roadmap';
import Footer from '@/components/club/Footer';

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const hash = location.hash.substring(1);
      const el = document.getElementById(hash);
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [location]);

  return (
    <div className="bg-background text-foreground min-h-screen transition-colors duration-200">
      <Hero />
      <ProgressTrackerCard />
      <Events isHomepage={true} />
      <Projects isHomepage={true} />
      <Team isHomepage={true} />
      <Roadmap />
      <Resources />
      <Footer />
    </div>
  );
};

export default Index;
