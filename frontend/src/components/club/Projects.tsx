import { useState, useEffect } from 'react';
import { ExternalLink, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../lib/api';

const formatProjectText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/([.,\s]*)(\b\d+\))/g, (match, prefix, numStr, offset) => {
      if (offset === 0) return numStr;
      return `\n\n${numStr}`;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export interface Project {
  id: number;
  title: string;
  author: string;
  authorId: number;
  description: string;
  tags: string[];
  githubLink: string;
  contributors?: string;
}

export interface Track {
  id: number;
  title: string;
  description: string;
  audience?: string;
}

// Tag styles for full project listing
const tagStyleMap: Record<string, { tagClass: string; label: string }> = {
  'Machine Learning':    { tagClass: 'tag-blue',  label: 'Machine Learning' },
  'Full Stack':          { tagClass: 'tag-green', label: 'Full Stack' },
  'Data Science':        { tagClass: 'tag-blue',  label: 'Data Science' },
  'Computer Vision':     { tagClass: 'tag-pink',  label: 'Computer Vision' },
  'Object Detection':    { tagClass: 'tag-pink',  label: 'Object Detection' },
  'Deep Learning':       { tagClass: 'tag-blue',  label: 'Deep Learning' },
  'NLP':                 { tagClass: 'tag-green', label: 'NLP' },
  'Renewable Energy':    { tagClass: 'tag-green', label: 'Renewable Energy' },
  'GAN':                 { tagClass: 'tag-pink',  label: 'GAN' },
  'Reinforcement Learning': { tagClass: 'tag-pink', label: 'Reinforcement Learning' },
  'Backend':             { tagClass: 'tag-blue',  label: 'Backend' },
};

function getPrimaryTag(tags: string[]) {
  for (const tag of tags) {
    if (tagStyleMap[tag]) return tagStyleMap[tag];
  }
  return { tagClass: 'tag-blue', label: tags[0] || 'Project' };
}

function getCategory(tags: string[]): string {
  if (tags.includes('Computer Vision') || tags.includes('Object Detection')) return 'cv';
  if (tags.includes('Full Stack'))                                             return 'fullstack';
  if (tags.includes('Renewable Energy') || tags.includes('Energy'))           return 'energy';
  return 'ml';
}

const categoryOrder = ['all', 'ml', 'cv', 'fullstack', 'energy'];
const tabLabels: Record<string, string> = {
  all: 'All', ml: 'ML / AI', cv: 'Computer Vision', fullstack: 'Full Stack', energy: 'Energy',
};

export default function Projects({ isHomepage = false }: { isHomepage?: boolean }) {
  const [activeTab, setActiveTab] = useState('all');
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(getApiUrl('/api/projects'));
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();

        if (data) {
          const parsedData = data.map((p: any) => {
            let tagsList: string[] = [];
            if (p.tags) {
              try {
                const parsed = JSON.parse(p.tags);
                tagsList = Array.isArray(parsed) ? parsed : [String(parsed)];
              } catch {
                tagsList = p.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
              }
            }
            return {
              id: p.id, title: p.title, author: p.author, authorId: p.author_id,
              description: p.description, tags: tagsList, githubLink: p.github_link,
              contributors: p.contributors,
            };
          });
          setProjectList(parsedData);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally { setLoading(false); }
    };

    fetchProjects();
  }, []);

  // ── Homepage: show Tracks grid ──────────────────────────────────
  if (isHomepage) {
    return (
      <section
        id="projects"
        style={{
          background: 'hsl(228, 30%, 93%)',
          borderTop: '1px solid hsl(228, 20%, 80%)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem' }}>
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'hsl(230, 25%, 10%)',
              marginBottom: '0.6rem',
            }}
          >
            Projects
          </h2>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '1rem',
              color: 'hsl(230, 15%, 40%)',
              maxWidth: 520,
              lineHeight: 1.65,
              marginBottom: '3rem',
            }}
          >
            Pick one for a semester. They run in parallel and share the same Wednesday slot on alternate weeks.
          </p>

          {/* Top 3 Projects grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {projectList.length === 0 && !loading ? (
              <div style={{ padding: '2rem' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,50%)', fontSize: '0.9rem' }}>
                  No projects available.
                </p>
              </div>
            ) : projectList.slice(0, 3).map((p) => {
              const { tagClass, label } = getPrimaryTag(p.tags);
              const gitLink = (p as any).github_link || p.githubLink || '';
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '1.75rem',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid hsl(228,20%,84%)',
                    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-5px) scale(1.02)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px -6px rgba(99, 102, 241, 0.18)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'hsl(243, 75%, 59%)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'hsl(228,20%,84%)';
                  }}
                >
                  <span className={`${tagClass}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                  <h4
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'hsl(230,25%,12%)',
                      marginTop: '0.75rem',
                      marginBottom: '0.25rem',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {formatProjectText(p.title)}
                  </h4>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'hsl(230,15%,50%)', marginBottom: '0.6rem' }}>
                    by {p.author}{p.contributors ? ` • Contributors: ${p.contributors}` : ''}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'hsl(230,15%,38%)', lineHeight: 1.6, marginBottom: '1rem', whiteSpace: 'pre-line' }}>{formatProjectText(p.description)}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
                    {p.tags.slice(0, 4).map((tag) => (
                      <span key={tag} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', padding: '2px 7px', border: '1px solid hsl(228,20%,78%)', borderRadius: 2, color: 'hsl(230,15%,45%)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {gitLink && (
                    <a
                      href={gitLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
                        color: 'hsl(243,75%,59%)', textDecoration: 'none',
                        border: '1px solid hsl(243,75%,80%)', padding: '4px 10px', borderRadius: 2,
                      }}
                    >
                      <ExternalLink size={11} /> GitHub
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Link to all projects */}
          <div style={{ marginTop: '2.5rem' }}>
            <Link
              to="/projects"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                color: 'hsl(243, 75%, 59%)',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.textDecoration = 'none';
              }}
            >
              Browse all student projects <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // ── Full page: project listing ─────────────────────────────────
  const filtered = projectList.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = p.title.toLowerCase().includes(q) ||
                      p.author.toLowerCase().includes(q) ||
                      p.description.toLowerCase().includes(q) ||
                      p.tags.some(t => t.toLowerCase().includes(q));
      if (!matches) return false;
    }
    return activeTab === 'all' || getCategory(p.tags) === activeTab;
  });

  return (
    <section
      id="projects"
      style={{ background: 'hsl(228, 30%, 93%)', minHeight: '80vh' }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '4rem 2rem' }}>
        <h1
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'hsl(230, 25%, 10%)',
            marginBottom: '0.5rem',
          }}
        >
          Student Projects
        </h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: 'hsl(230, 15%, 45%)', marginBottom: '2rem' }}>
          Built by club members. Open source where possible.
        </p>

        {/* Search + Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(230,15%,50%)' }} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-[0.85rem] font-sans border border-slate-300 rounded bg-white text-slate-900 outline-none hover:border-indigo-400 hover:shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
              style={{ boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {categoryOrder.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3.5 py-1.5 font-mono text-[0.72rem] tracking-wide border rounded cursor-pointer transition-all duration-200
                  ${activeTab === tab 
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm' 
                    : 'bg-transparent border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 hover:-translate-y-[1px] hover:shadow-sm'
                  }
                `}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,50%)', fontSize: '0.9rem', padding: '2rem 0' }}>Loading projects...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {filtered.map((p) => {
              const { tagClass, label } = getPrimaryTag(p.tags);
              const gitLink = (p as any).github_link || p.githubLink || '';
              return (
                <div
                  key={p.id}
                  style={{
                    padding: '1.75rem',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid hsl(228,20%,84%)',
                    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-5px) scale(1.02)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 24px -6px rgba(99, 102, 241, 0.18)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'hsl(243, 75%, 59%)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'hsl(228,20%,84%)';
                  }}
                >
                  <span className={`${tagClass}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                  <h4
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: 'hsl(230,25%,12%)',
                      marginTop: '0.75rem',
                      marginBottom: '0.25rem',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {formatProjectText(p.title)}
                  </h4>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'hsl(230,15%,50%)', marginBottom: '0.6rem' }}>by {p.author}</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'hsl(230,15%,38%)', lineHeight: 1.6, marginBottom: '1rem', whiteSpace: 'pre-line' }}>{formatProjectText(p.description)}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '1rem' }}>
                    {p.tags.slice(0, 4).map((tag) => (
                      <span key={tag} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', padding: '2px 7px', border: '1px solid hsl(228,20%,78%)', borderRadius: 2, color: 'hsl(230,15%,45%)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  {gitLink && (
                    <a
                      href={gitLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
                        color: 'hsl(243,75%,59%)', textDecoration: 'none',
                        border: '1px solid hsl(243,75%,80%)', padding: '4px 10px', borderRadius: 2,
                      }}
                    >
                      <ExternalLink size={11} /> GitHub
                    </a>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '3rem', background: 'white', gridColumn: '1/-1' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', color: 'hsl(230,15%,50%)', fontSize: '0.9rem' }}>No projects found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
