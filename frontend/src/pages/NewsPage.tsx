import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ExternalLink, Newspaper, X, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/club/Navbar';
import Footer from '@/components/club/Footer';
import Chatbot from '@/components/club/Chatbot';
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

// News Card Component
const NewsCard = ({ item, onClick, featured = false }: { item: NewsModel, onClick: () => void, featured?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      onClick={onClick}
      className={`group relative overflow-hidden bg-white border border-[hsl(228,20%,84%)] rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(99,102,241,0.18)] hover:border-primary/50 flex flex-col ${
        featured ? 'md:col-span-2 md:row-span-2 min-h-[450px]' : 'h-full min-h-[350px]'
      }`}
    >
      {item.image_url ? (
        <div className={`relative overflow-hidden bg-secondary w-full ${featured ? 'h-64 md:h-72' : 'h-48'}`}>
          <img src={item.image_url} alt={item.title || 'News'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <div className={`relative flex justify-center items-center overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 w-full ${featured ? 'h-64 md:h-72' : 'h-48'}`}>
           <Newspaper className="w-16 h-16 text-indigo-200 group-hover:scale-110 transition-transform duration-500" />
        </div>
      )}

      <div className="p-6 md:p-8 flex flex-col flex-grow">
        {featured && (
          <div className="mb-4 self-start bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-2">
            <Sparkles size={12} /> Featured Story
          </div>
        )}
        
        <h3 className={`font-display font-bold text-[hsl(230,25%,12%)] mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300 ${featured ? 'text-2xl md:text-4xl leading-tight' : 'text-xl'}`}>
          {item.title || 'Untitled News'}
        </h3>
        
        {item.description && (
          <p className="text-[hsl(230,15%,45%)] text-sm leading-relaxed line-clamp-3 mb-6">
            {item.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-5 border-t border-[hsl(228,20%,84%)]">
          <span className="text-xs font-semibold text-primary flex items-center gap-2">
            Read Story <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-[hsl(230,15%,50%)]">
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(getApiUrl('/api/news'));
        if (res.ok) {
          const data = await res.json();
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

      <section className="relative overflow-hidden min-h-screen" style={{ background: 'hsl(228, 30%, 93%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 2rem' }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h1 style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'hsl(230, 25%, 10%)',
              marginBottom: '0.5rem',
            }}>
              Latest Dispatch
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: 'hsl(230, 15%, 45%)', maxWidth: '600px' }}>
              Immerse yourself in the cutting-edge developments, club milestones, and global AI breakthroughs.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              </div>
            </div>
          ) : newsList.length === 0 ? (
            <div className="text-center py-24 bg-white border border-[hsl(228,20%,84%)] rounded-2xl max-w-2xl mx-auto shadow-sm">
              <Newspaper className="w-12 h-12 text-[hsl(228,20%,80%)] mx-auto mb-4" />
              <h3 className="text-xl font-display font-bold text-[hsl(230,25%,12%)] mb-2">No News Yet</h3>
              <p className="text-[hsl(230,15%,45%)] text-sm">Check back soon for groundbreaking updates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[auto]">
              {newsList.map((item, index) => (
                <NewsCard 
                  key={item.id} 
                  item={item} 
                  onClick={() => setSelectedNews(item)}
                  featured={index === 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedNews && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setSelectedNews(null)}
                className="absolute inset-0 bg-[hsl(230,25%,12%)]/40 backdrop-blur-sm"
              />
              
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl z-10 overflow-hidden flex flex-col md:flex-row"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 z-50 p-2 bg-white/80 hover:bg-[hsl(228,30%,93%)] text-[hsl(230,25%,12%)] rounded-full backdrop-blur-md transition-all shadow-sm"
                >
                  <X size={20} />
                </button>

                {/* Left Side: Image */}
                {selectedNews.image_url && (
                  <div className="md:w-5/12 relative h-48 md:h-auto bg-secondary shrink-0">
                    <img
                      src={selectedNews.image_url}
                      alt={selectedNews.title || 'News image'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Right Side: Content */}
                <div className={`p-6 md:p-10 flex flex-col ${selectedNews.image_url ? 'md:w-7/12' : 'w-full'} overflow-y-auto custom-scrollbar`}>
                  
                  <div className="mb-6">
                    <span className="inline-block px-3 py-1 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold tracking-widest uppercase mb-4 border border-primary/20">
                      {new Date(selectedNews.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold font-display text-[hsl(230,25%,12%)] leading-tight">
                      {selectedNews.title || 'Untitled News'}
                    </h2>
                  </div>

                  <div className="prose prose-slate max-w-none mb-8">
                    {selectedNews.description ? (
                      <p className="text-[hsl(230,15%,35%)] leading-relaxed text-[0.95rem] whitespace-pre-line">
                        {selectedNews.description}
                      </p>
                    ) : (
                      <p className="text-[hsl(230,15%,50%)] italic text-[0.95rem]">No additional details provided.</p>
                    )}
                    
                    {selectedNews.sources && (
                      <div className="mt-8 p-4 bg-[hsl(228,30%,96%)] rounded-lg border border-[hsl(228,20%,84%)]">
                        <strong className="text-[hsl(230,25%,12%)] block mb-1 text-sm font-semibold">Sources & References:</strong>
                        <p className="text-[hsl(230,15%,45%)] text-xs">{selectedNews.sources}</p>
                      </div>
                    )}
                  </div>
                  
                  {selectedNews.link && (
                    <div className="mt-auto pt-4 border-t border-[hsl(228,20%,84%)]">
                      <a 
                        href={selectedNews.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
                      >
                        Access Full Article <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      <Footer short />
      <Chatbot />
    </div>
  );
};

export default NewsPage;
