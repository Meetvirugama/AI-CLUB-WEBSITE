import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, Star, X } from 'lucide-react';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface AchievementModel {
  id: number;
  title: string;
  student: string;
  description: string;
  category: string;
  icon: string;
  image_url?: string;
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementModel | null>(null);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const res = await fetch(getApiUrl('/api/achievements'));
        if (res.ok) {
          const data = await res.json();
          setAchievements(data);
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, []);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Trophy': return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 'Medal': return <Medal className="w-6 h-6 text-blue-500" />;
      case 'Star': return <Star className="w-6 h-6 text-purple-500" />;
      case 'Award':
      default:
        return <Award className="w-6 h-6 text-green-500" />;
    }
  };

  return (
    <section className="py-20 relative overflow-hidden min-h-[60vh]" id="achievements">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-display font-bold mb-4"
          >
            Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Fame</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            Celebrating our students who have represented the university and achieved excellence in Hackathons, ICPC, and global events.
          </motion.p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-12 bg-card/50 backdrop-blur-md border border-border/50 rounded-2xl max-w-3xl mx-auto">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No achievements found</h3>
            <p className="text-muted-foreground">Check back later for updates on our students' incredible accomplishments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {achievements.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.04, y: -6 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                onClick={() => setSelectedAchievement(item)}
                className="bg-card border border-border shadow-sm rounded-2xl p-6 hover:border-primary/50 transition-all cursor-pointer group"
              >
                {item.image_url && (
                  <div className="w-full h-48 mb-4 rounded-xl overflow-hidden bg-secondary">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-secondary/80 rounded-xl group-hover:scale-110 transition-transform flex-shrink-0">
                    {renderIcon(item.icon)}
                  </div>
                  <div>
                    {item.category && <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">{item.category}</div>}
                    {item.title && <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>}
                    {item.student && <p className="text-sm font-semibold text-foreground/80 mb-2">By {item.student}</p>}
                    {item.description && <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAchievement(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl rounded-2xl bg-card border border-border p-6 md:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
            >
              <button
                onClick={() => setSelectedAchievement(null)}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition-colors"
              >
                <X size={20} />
              </button>

              {selectedAchievement.image_url && (
                <div className="w-full max-h-96 mb-6 rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={selectedAchievement.image_url}
                    alt={selectedAchievement.title}
                    className="w-full h-full object-contain max-h-96 mx-auto"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-secondary rounded-lg">
                  {renderIcon(selectedAchievement.icon)}
                </div>
                {selectedAchievement.category && (
                  <span className="text-xs font-mono text-primary uppercase tracking-wider px-3 py-1 bg-primary/10 rounded-md border border-primary/20">
                    {selectedAchievement.category}
                  </span>
                )}
              </div>

              {selectedAchievement.title && (
                <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                  {selectedAchievement.title}
                </h2>
              )}

              {selectedAchievement.student && (
                <p className="text-sm font-semibold text-primary mb-4">
                  By {selectedAchievement.student}
                </p>
              )}

              {selectedAchievement.description && (
                <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line border-t border-border/50 pt-4">
                  {selectedAchievement.description}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
