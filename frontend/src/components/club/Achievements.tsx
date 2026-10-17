import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Award, Star, X } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface AchievementModel {
  id: number;
  title: string;
  student: string;
  description: string;
  category: string;
  icon: string;
  image_url?: string;
  created_at?: string;
}

const ACCENT_PALETTE = [
  '#DFFF8F', // Electric Lime
  '#C9C2FF', // Lavender / Light Purple
  '#FFC8A9', // Warm Apricot / Peach
  '#99F6E4', // Fresh Mint / Teal
  '#FDE047', // Warm Gold / Amber
  '#F472B6', // Rose / Soft Pink
];

function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="st-arrow"
    >
      <path
        d="M5 12H19M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<AchievementModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementModel | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

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
      case 'Trophy': return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'Medal': return <Medal className="w-5 h-5 text-blue-400" />;
      case 'Star': return <Star className="w-5 h-5 text-purple-400" />;
      case 'Award':
      default:
        return <Award className="w-5 h-5 text-emerald-400" />;
    }
  };

  // Helper to extract clean tags from title & category
  const getTags = (item: AchievementModel): string[] => {
    const tags: string[] = [];
    if (item.category && item.category.trim()) {
      tags.push(item.category.trim());
    }
    if (item.title && item.title.includes('|')) {
      const parts = item.title.split('|').map(p => p.trim());
      parts.slice(1, 3).forEach(part => {
        if (part.length <= 32) tags.push(part);
      });
    }
    if (tags.length === 0) {
      tags.push('Excellence', 'DA-IICT');
    }
    return Array.from(new Set(tags)).slice(0, 3);
  };

  return (
    <section className="pt-20 pb-16 relative overflow-hidden min-h-[60vh]" id="achievements">
      {/* Framer ServiceTiles Scoped Styles */}
      <style>{`
        .st-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
          gap: 20px;
          align-items: stretch;
          width: 100%;
        }

        .st-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100%;
          color: hsl(var(--foreground));
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          text-decoration: none;
          isolation: isolate;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.35s cubic-bezier(0.2, 0.75, 0.25, 1),
                      box-shadow 0.35s ease,
                      border-color 0.3s ease;
          cursor: pointer;
          overflow: hidden;
        }

        .st-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.25),
                      0 0 24px -6px var(--st-accent);
          border-color: var(--st-accent);
        }

        .st-media {
          position: relative;
          height: 190px;
          flex-shrink: 0;
          overflow: hidden;
          background: hsl(var(--secondary));
          border-radius: 15px 15px 0 0;
        }

        .st-image {
          display: block;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 0.56s cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .st-card:hover .st-image {
          transform: scale(1.06);
        }

        .st-number {
          position: absolute;
          top: 12px;
          left: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 26px;
          padding: 3px 8px;
          background: hsl(var(--card) / 0.88);
          backdrop-filter: blur(8px);
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-variant-numeric: tabular-nums;
          z-index: 2;
        }

        .st-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: stretch;
          min-width: 0;
          padding: 22px;
        }

        .st-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          margin-bottom: 12px;
          color: hsl(var(--muted-foreground));
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .st-dot {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
          border-radius: 50%;
          background: var(--st-accent);
          box-shadow: 0 0 8px var(--st-accent);
        }

        .st-title {
          margin: 0;
          color: hsl(var(--foreground));
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.35em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s ease;
        }

        .st-card:hover .st-title {
          color: hsl(var(--foreground));
        }

        .st-description {
          margin: 10px 0 0;
          color: hsl(var(--muted-foreground));
          font-size: 13.5px;
          line-height: 1.55em;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .st-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 16px;
        }

        .st-tag {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          max-width: 100%;
          background: hsl(var(--secondary));
          color: hsl(var(--muted-foreground));
          border: 1px solid hsl(var(--border) / 0.8);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
        }

        .st-footer {
          margin-top: auto;
          padding-top: 20px;
          min-width: 0;
        }

        .st-detail {
          margin-bottom: 10px;
          color: hsl(var(--muted-foreground));
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .st-cta {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 44px;
          padding: 10px 14px;
          overflow: hidden;
          isolation: isolate;
          background: hsl(var(--secondary) / 0.75);
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          transition: color 0.35s ease, border-color 0.35s ease;
        }

        .st-cta::before {
          content: "";
          position: absolute;
          inset: 0;
          background: var(--st-accent);
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.35s cubic-bezier(0.2, 0.75, 0.25, 1);
          z-index: -1;
        }

        .st-arrow {
          display: inline-flex;
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(0.2, 0.75, 0.25, 1);
        }

        .st-card:hover .st-cta {
          color: #0b0e14;
          border-color: transparent;
        }

        .st-card:hover .st-cta::before {
          transform: scaleX(1);
        }

        .st-card:hover .st-arrow {
          transform: rotate(-35deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .st-card, .st-image, .st-cta, .st-cta::before, .st-arrow {
            transition: none !important;
          }
          .st-card, .st-arrow {
            transform: none !important;
          }
        }
      `}</style>

      {/* Background decorations */}
      <div className="absolute top-0 left-10 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl">
        {/* Left-aligned Heading Section */}
        <div className="text-left mb-14 max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 tracking-tight text-foreground"
          >
            Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-accent">Fame</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-base md:text-lg leading-relaxed"
          >
            Celebrating our students who have represented Dhirubhai Ambani University and achieved excellence in Hackathons, ICPC, and global events.
          </motion.p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : achievements.length === 0 ? (
          /* Empty State */
          <div className="text-left py-14 px-8 bg-card border border-border rounded-2xl max-w-2xl">
            <Trophy className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No achievements found</h3>
            <p className="text-muted-foreground text-sm">
              Check back soon for updates on our students' upcoming accomplishments and awards.
            </p>
          </div>
        ) : (
          /* Framer ServiceTiles Grid */
          <div className="st-grid">
            {achievements.map((item, index) => {
              const accent = ACCENT_PALETTE[index % ACCENT_PALETTE.length];
              const number = String(index + 1).padStart(2, '0');
              const tags = getTags(item);
              const hasImage = Boolean(item.image_url) && !imageErrors[item.id];
              const category = item.category?.trim() || 'EXCELLENCE & RECOGNITION';
              const detailText = item.student ? `Awarded to ${item.student}` : 'AI Club · DAU';
              const descriptionText = item.description?.trim() || 'Demonstrated outstanding technical skill, innovation, and perseverance representing the university on competitive stages.';

              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  onClick={() => setSelectedAchievement(item)}
                  className="st-card group"
                  style={{ '--st-accent': accent } as React.CSSProperties}
                >
                  {/* Media Banner */}
                  <div className="st-media">
                    {hasImage ? (
                      <img
                        className="st-image"
                        src={item.image_url}
                        alt={item.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center relative overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at 50% 40%, ${accent}25 0%, transparent 75%), hsl(var(--secondary))`,
                        }}
                      >
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border shadow-md"
                          style={{ background: 'hsl(var(--card))' }}
                        >
                          {renderIcon(item.icon)}
                        </div>
                      </div>
                    )}
                    <span className="st-number" aria-hidden="true">
                      {number}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="st-body">
                    {/* Eyebrow / Category with accent dot */}
                    <div className="st-eyebrow">
                      <span className="st-dot" aria-hidden="true" />
                      <span className="truncate">{category}</span>
                    </div>

                    {/* Title */}
                    <h3 className="st-title">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="st-description">
                      {descriptionText}
                    </p>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div className="st-tags">
                        {tags.map((tag, tagIdx) => (
                          <span key={tagIdx} className="st-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="st-footer">
                      <div className="st-detail">
                        {detailText}
                      </div>

                      <div className="st-cta">
                        <span>Explore achievement</span>
                        <ArrowIcon />
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
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
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>

              {selectedAchievement.image_url && !imageErrors[selectedAchievement.id] && (
                <div className="w-full max-h-96 mb-6 rounded-xl overflow-hidden bg-secondary">
                  <img
                    src={selectedAchievement.image_url}
                    alt={selectedAchievement.title}
                    referrerPolicy="no-referrer"
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

              {selectedAchievement.description ? (
                <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line border-t border-border/50 pt-4">
                  {selectedAchievement.description}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm leading-relaxed border-t border-border/50 pt-4">
                  Represented Dhirubhai Ambani University with exceptional innovation, problem-solving, and dedication on the national and global stage.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
