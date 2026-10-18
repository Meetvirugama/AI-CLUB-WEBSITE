import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AboutHero from '@/components/redesign/AboutHero';
import AboutSections, { Connect } from '@/components/redesign/AboutSections';
import HomeSections from '@/components/redesign/HomeSections';
import Footer from '@/components/redesign/SiteFooter';

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
    <div className="rd-root min-h-screen">
      <AboutHero />
      <AboutSections />
      <HomeSections />
      <Connect />
      <Footer />
    </div>
  );
};

export default Index;
