import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ExternalLink, Newspaper, X, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '@/components/club/Navbar';
import Footer from '@/components/club/Footer';
import Chatbot from '@/chatbot/Chatbot';
import { getApiUrl } from '@/lib/api';

interface NewsModel {
  id: number;
  title?: string;
  description?: string;
  link?: string;
  sources?: string;
  image_url?: string;
  created_at: string;
}

// Ambient animated background orbs
const AmbientBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]" />
    <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse duration-[10000ms] delay-1000" />
    <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-pulse duration-[12000ms] delay-500" />
  </div>
);

// Magic Spotlight & 3D Tilt Card Component
const MagicCard = ({ item, onClick, featured = false }: { item: NewsModel, onClick: () => void, featured?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  // Calculate subtle 3D rotation based on mouse position relative to center
  const rotateX = isHovered && cardRef.current ? (mousePosition.y - cardRef.current.clientHeight / 2) / -20 : 0;
  const rotateY = isHovered && cardRef.current ? (mousePosition.x - cardRef.current.clientWidth / 2) / 20 : 0;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      animate={{ 
        rotateX: isHovered ? rotateX : 0, 
        rotateY: isHovered ? rotateY : 0,
        scale: isHovered ? 1.02 : 1
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={`relative group backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl overflow-hidden cursor-pointer shadow-2xl ${
        featured ? 'md:col-span-2 md:row-span-2 min-h-[500px]' : 'h-full min-h-[350px]'
      }`}
      style={{
        transformPerspective: 1000,
        background: isHovered 
          ? `radial-gradient(circle 600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(99,102,241,0.15), rgba(15,23,42,0.8))` 
          : 'rgba(15,23,42,0.6)'
      }}
    >
      {/* Glossy top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />
      
      {item.image_url ? (
        <div className="absolute inset-0 z-0">
          <img src={item.image_url} alt={item.title || 'News'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out opacity-50 group-hover:opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/60 to-slate-900/20" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-800 to-slate-950 flex justify-center items-center opacity-60">
           <Newspaper className="w-32 h-32 text-indigo-500/10 group-hover:scale-125 transition-transform duration-1000" />
           <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-transparent" />
        </div>
      )}

      <div className="relative z-10 p-8 h-full flex flex-col justify-end">
        {featured && (
          <div className="mb-auto self-start bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md">
            <Sparkles size={14} /> Featured Story
          </div>
        )}
        
        <h3 className={`font-bold text-white mb-3 line-clamp-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-300 group-hover:to-purple-300 transition-colors duration-300 ${featured ? 'text-4xl md:text-5xl mt-8 leading-tight' : 'text-xl md:text-2xl'}`}>
          {item.title || 'Untitled News'}
        </h3>
        
        {item.description && (
          <p className={`text-slate-300 leading-relaxed line-clamp-3 mb-6 ${featured ? 'text-lg md:text-xl max-w-3xl opacity-90' : 'text-sm opacity-80'}`}>
            {item.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/10">
          <span className="text-sm font-bold text-indigo-400 flex items-center gap-2 group-hover:text-indigo-300 transition-colors">
            Read Story <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform duration-300" />
          </span>
          <span className="text-xs font-medium text-slate-400 bg-black/30 px-3 py-1 rounded-full backdrop-blur-md">
            {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const NewsPage = () => {
  const [newsList, setNewsList] = useState<NewsModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsModel | null>(null);
  
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 1000], [0, 200]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(getApiUrl('/api/news'));
        if (res.ok) {
          const data = await res.json();
          // Sort by newest first
          const sorted = data.sort((a: NewsModel, b: NewsModel) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setNewsList(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="relative z-[1] min-h-screen bg-slate-950 pt-20">
      <AmbientBackground />
      <Navbar />
      <section className="py-20 relative overflow-hidden min-h-screen">
        <div className="container mx-auto px-6 md:px-12 relative z-10">
          
          <motion.div style={{ y: yParallax }} className="text-center mb-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-6xl md:text-8xl font-display font-extrabold mb-6 text-white tracking-tight"
            >
              Latest <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">Dispatch</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto font-light"
            >
              Immerse yourself in the cutting-edge developments, club milestones, and global AI breakthroughs.
            </motion.p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin animation-delay-200" />
                <div className="absolute inset-4 rounded-full border-b-2 border-blue-500 animate-spin animation-delay-400" />
              </div>
            </div>
          ) : newsList.length === 0 ? (
            <div className="text-center py-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <Newspaper className="w-16 h-16 text-slate-500 mx-auto mb-6 opacity-50 relative z-10" />
              <h3 className="text-2xl font-bold text-white mb-3 relative z-10">The wire is silent</h3>
              <p className="text-slate-400 text-lg relative z-10">Check back soon for groundbreaking updates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto auto-rows-[350px]">
              {newsList.map((item, index) => (
                <MagicCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setSelectedNews(item)}
                  featured={index === 0} // First item spans larger
                />
              ))}
            </div>
          )}
        </div>

        {/* Edge-to-Edge Cinematic Detail Modal */}
        <AnimatePresence>
          {selectedNews && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                onClick={() => setSelectedNews(null)}
                className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl"
              />
              
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-5xl min-h-[70vh] rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl z-10 mx-4 overflow-hidden flex flex-col md:flex-row"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-6 right-6 z-50 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all hover:rotate-90 hover:scale-110"
                >
                  <X size={24} />
                </button>

                {/* Left Side: Image (if exists) */}
                {selectedNews.image_url && (
                  <div className="md:w-1/2 relative min-h-[300px] md:min-h-full overflow-hidden bg-black">
                    <div className="absolute inset-0 bg-indigo-500/20 mix-blend-screen z-10 pointer-events-none" />
                    <img
                      src={selectedNews.image_url}
                      alt={selectedNews.title || 'News image'}
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-900 via-transparent to-transparent z-10" />
                  </div>
                )}

                {/* Right Side: Content */}
                <div className={`p-8 md:p-12 flex flex-col justify-center ${selectedNews.image_url ? 'md:w-1/2' : 'w-full'} bg-slate-900/90 backdrop-blur-xl relative z-20`}>
                  
                  <div className="mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold tracking-widest uppercase mb-4 border border-indigo-500/30">
                      {new Date(selectedNews.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display text-white leading-tight">
                      {selectedNews.title || 'Untitled News'}
                    </h2>
                  </div>

                  <div className="prose prose-invert prose-slate max-w-none mb-10 overflow-y-auto pr-4 custom-scrollbar" style={{ maxHeight: '40vh' }}>
                    {selectedNews.description ? (
                      <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-line">
                        {selectedNews.description}
                      </p>
                    ) : (
                      <p className="text-slate-500 italic text-lg">No additional details provided.</p>
                    )}
                    
                    {selectedNews.sources && (
                      <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                        <strong className="text-white block mb-1">Sources & References:</strong>
                        <p className="text-slate-400 text-sm">{selectedNews.sources}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedNews.link && (
                    <div className="mt-auto">
                      <a 
                        href={selectedNews.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group relative inline-flex items-center justify-center w-full sm:w-auto gap-3 px-8 py-4 bg-white text-slate-900 font-bold rounded-xl overflow-hidden transition-all hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-purple-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center gap-2">
                          Access Full Article <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      <Footer />
      <Chatbot />
    </div>
  );
};

export default NewsPage;
