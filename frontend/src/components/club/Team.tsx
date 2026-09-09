export type MemberRole = 
  | 'Convenor' 
  | 'Deputy Convenor' 
  | 'Core Member' 
  | 'Extended Core Member' 
  | 'Member'
  | 'Ex Convenor'
  | 'Ex Deputy Convenor'
  | 'Ex Core Member'
  | 'Alumni';

export interface Member {
  id: number;
  name: string;
  role: MemberRole;
  photo: string;
  description: string;
  github?: string;
  linkedin?: string;
  order_no?: number;
  created_at?: string;
}
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { getApiUrl } from '../../lib/api';
import { Search, ArrowRight, Sparkles, X, FolderGit2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Role badge colours — light editorial palette
const roleMeta: Record<MemberRole, { label: string; classes: string }> = {
  'Convenor':             { label: 'Convenor',             classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'Deputy Convenor':      { label: 'Deputy Convenor',      classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  'Core Member':          { label: 'Core Member',          classes: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  'Extended Core Member': { label: 'Extended Core Member', classes: 'bg-purple-50 text-purple-700 border border-purple-200' },
  'Member':               { label: 'Member',               classes: 'bg-slate-100 text-slate-650 border border-slate-200' },
  'Ex Convenor':          { label: 'Ex Convenor',          classes: 'bg-amber-100/70 text-amber-800 border border-amber-300' },
  'Ex Deputy Convenor':     { label: 'Ex Deputy Convenor',     classes: 'bg-blue-100/70 text-blue-800 border border-blue-300' },
  'Ex Core Member':         { label: 'Ex Core Member',         classes: 'bg-indigo-100/70 text-indigo-800 border border-indigo-300' },
  'Alumni':                 { label: 'Alumni',                 classes: 'bg-emerald-100/80 text-emerald-800 border border-emerald-300' },
};

const RoleBadge = ({ role }: { role: MemberRole }) => {
  const { label, classes } = roleMeta[role] || { label: role, classes: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block text-[9px] font-bold px-2.5 py-0.5 rounded-full mt-1 tracking-wide uppercase ${classes}`}>
      {label}
    </span>
  );
};

// GitHub SVG icon
const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.263.82-.582 0-.288-.012-1.243-.017-2.252-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.754-1.333-1.754-1.09-.745.083-.73.083-.73 1.204.085 1.838 1.237 1.838 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.305.762-1.605-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.304-.536-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.652.243 2.872.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.624-5.48 5.921.43.372.814 1.103.814 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.699.825.58C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// LinkedIn SVG icon
const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.984 1.984 0 1 1 0-3.967 1.984 1.984 0 0 1 0 3.967zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const MEMBER_PHOTO_OVERRIDES: Record<string, string> = {
  'Anmol Ghogare': 'https://lh3.googleusercontent.com/d/1ff8W6U26StDc86Im77NNMcUd6jCLxCgx',
  'Bhagyashree Khemwani': '/bhagyashree-khemwani.png?v=latest',
};

function getDriveUrls(url: string): string[] {
  if (!url) return [];
  const driveMatch = url.match(/(?:id=|\/d\/|src=)([a-zA-Z0-9_-]{25,})/);
  if (driveMatch) {
    const id = driveMatch[1];
    return [
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=800`,
      `https://drive.google.com/uc?export=view&id=${id}`,
    ];
  }
  return [url];
}

function MemberAvatar({ name, photo }: { name: string; photo: string }) {
  const [urlIndex, setUrlIndex] = useState(0);
  const normalizedName = (name || '').trim().toLowerCase();
  
  const isAnmol = normalizedName.includes('anmol') || normalizedName.includes('ghogare');
  const overridePhoto = isAnmol
    ? 'https://lh3.googleusercontent.com/d/1ff8W6U26StDc86Im77NNMcUd6jCLxCgx'
    : Object.entries(MEMBER_PHOTO_OVERRIDES).find(([k]) => k.toLowerCase() === normalizedName)?.[1];
    
  const rawPhoto = overridePhoto || photo || '';
  const urls = getDriveUrls(rawPhoto);
  const currentUrl = urls[urlIndex] || '';

  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (currentUrl && urlIndex < urls.length) {
    return (
      <div className="w-[84px] h-[84px] rounded-full mx-auto mb-3 overflow-hidden ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-[#ECF0F7]">
        <img
          src={currentUrl}
          alt={name}
          className="w-full h-full object-cover object-top"
          onError={() => setUrlIndex((prev) => prev + 1)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'hsl(243, 75%, 92%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1.1rem',
        color: 'hsl(243, 75%, 45%)',
        margin: '0 auto 0.75rem',
        border: '1.5px solid hsl(243, 75%, 85%)',
      }}
    >
      {initials}
    </div>
  );
}

// 3D Flip Card sub-component
interface TeamMemberCardProps {
  member: Member;
  projects: any[];
  achievements: any[];
}

function TeamMemberCard({ member, projects, achievements }: TeamMemberCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const nameLower = member.name.toLowerCase();

  // Match projects and achievements
  const matchedProjects = useMemo(() => {
    return projects.filter(p => {
      const authorMatch = p.author?.toLowerCase().includes(nameLower);
      const contribMatch = p.contributors?.toLowerCase().includes(nameLower);
      return authorMatch || contribMatch;
    });
  }, [projects, nameLower]);

  const matchedAchievements = useMemo(() => {
    return achievements.filter(a => {
      return a.student?.toLowerCase().includes(nameLower);
    });
  }, [achievements, nameLower]);

  const hasStats = matchedProjects.length > 0 || matchedAchievements.length > 0;
  const highlightProject = matchedProjects[0];

  return (
    <>
      <div 
        className="relative h-[320px] w-full"
        style={{ perspective: 1000, zIndex: isHovered ? 50 : 1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          className="w-full h-full relative cursor-pointer"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ 
            rotateY: isHovered ? 180 : 0,
            scale: isHovered ? 1.15 : 1,
            boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.15), 0 8px 10px -6px rgb(0 0 0 / 0.15)' : 'none'
          }}
          transition={{ duration: 0.6, ease: [0.25, 0.8, 0.25, 1] }}
        >
          {/* FRONT SIDE */}
          <div 
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-[#ECF0F7] text-center border-r border-b border-slate-200 transition-colors duration-300"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: isHovered ? 'white' : '#ECF0F7'
            }}
          >
            <MemberAvatar name={member.name} photo={member.photo || ''} />
            
            <h4 className="font-sans text-[0.95rem] font-bold text-slate-900 leading-snug mb-1">
              {member.name}
            </h4>
            
            <RoleBadge role={member.role} />
            
            <div className="flex gap-2.5 justify-center mt-4">
              {member.github && (
                <a 
                  href={member.github} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GitHubIcon />
                </a>
              )}
              {member.linkedin && (
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-indigo-650 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkedInIcon />
                </a>
              )}
            </div>
            
            {hasStats && (
              <div className="mt-4 flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-bold text-indigo-600 uppercase tracking-widest">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500 animate-pulse" />
                <span>Details</span>
              </div>
            )}
          </div>

          {/* BACK SIDE */}
          <div 
            className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 bg-slate-950 text-white border-r border-b border-slate-900 text-left"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-none pr-1">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-indigo-400 uppercase tracking-widest font-bold font-mono">Team Profile</span>
                  <h5 className="font-bold text-[0.82rem] leading-tight text-white mt-0.5">{member.name}</h5>
                </div>
              </div>

              {/* Show highlight project review / description right away */}
              {highlightProject ? (
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold block mb-1">💡 Highlight Project</span>
                  <h6 className="text-[10px] font-bold text-white truncate">{highlightProject.title}</h6>
                  <p className="text-[9px] text-slate-400 line-clamp-3 mt-1 leading-relaxed">
                    {highlightProject.description}
                  </p>
                </div>
              ) : member.description ? (
                <p className="text-[10px] text-slate-350 leading-relaxed font-medium">
                  {member.description}
                </p>
              ) : null}

              {matchedAchievements.length > 0 && (
                <div>
                  <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold block mb-1">🏆 Achievements</span>
                  <ul className="space-y-1">
                    {matchedAchievements.slice(0, 1).map((ach: any) => (
                      <li key={ach.id} className="text-[10px] text-slate-300 leading-snug line-clamp-2 pl-2 border-l border-amber-500/40" title={ach.title}>
                        {ach.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {matchedAchievements.length === 0 && matchedProjects.length === 0 && (
                <p className="text-[10px] text-slate-400 italic leading-relaxed pt-1">
                  Contributing member to the AI Club's workshops, events, and research roadmaps.
                </p>
              )}
            </div>

            {/* Clickable Actions block */}
            <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between bg-slate-950">
              {matchedProjects.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold uppercase tracking-wider transition-colors"
                >
                  All Projects ({matchedProjects.length})
                </button>
              ) : (
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">Social Links</span>
              )}
              
              <div className="flex gap-2">
                {member.github && (
                  <a 
                    href={member.github} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GitHubIcon />
                  </a>
                )}
                {member.linkedin && (
                  <a 
                    href={member.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkedInIcon />
                  </a>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Projects list overlay Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Member Contributions</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{member.name}'s Projects</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-450 hover:text-slate-700 transition-colors p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-left flex-1 scrollbar-thin">
                {matchedProjects.map((proj) => (
                  <div key={proj.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{proj.title}</h4>
                        {proj.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {JSON.parse(proj.tags.replace(/'/g, '"')).map((tag: string) => (
                              <span key={tag} className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {proj.github_link && (
                        <a 
                          href={proj.github_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200/60 rounded-xl hover:shadow transition-all"
                        >
                          <FolderGit2 className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Role display order — Convenor first, Alumni last
const ROLE_ORDER: Record<string, number> = {
  'Convenor':             1,
  'Deputy Convenor':      2,
  'Core Member':          3,
  'Extended Core Member': 4,
  'Member':               5,
  'Ex Convenor':          6,
  'Ex Deputy Convenor':     7,
  'Ex Core Member':         8,
  'Alumni':                 9,
};

export default function Team({ isHomepage = false }: { isHomepage?: boolean }) {
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Members
        const memRes = await fetch(getApiUrl('/api/members'));
        if (memRes.ok) {
          const data = await memRes.json();
          const sorted = [...data].sort((a, b) => {
            const orderA = a.order_no || 0;
            const orderB = b.order_no || 0;
            if (orderA !== orderB) {
              if (orderA === 0) return 1;
              if (orderB === 0) return -1;
              return orderA - orderB;
            }
            const roleA = ROLE_ORDER[a.role] ?? 99;
            const roleB = ROLE_ORDER[b.role] ?? 99;
            if (roleA !== roleB) return roleA - roleB;
            return a.name.localeCompare(b.name);
          });
          setMemberList(sorted);
        }

        // Fetch Projects
        const projRes = await fetch(getApiUrl('/api/projects'));
        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData || []);
        }

        // Fetch Achievements
        const achRes = await fetch(getApiUrl('/api/achievements'));
        if (achRes.ok) {
          const achData = await achRes.json();
          setAchievements(achData || []);
        }
      } catch (err) {
        console.error("Failed to load team section details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const filteredMembers = memberList.filter((m) => {
    if (isHomepage) return true;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesSearch = m.name.toLowerCase().includes(q) ||
                            m.role.toLowerCase().includes(q) ||
                            (m.description && m.description.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (roleFilter === 'convenor') {
      return m.role === 'Convenor' || m.role === 'Deputy Convenor';
    } else if (roleFilter === 'core') {
      return m.role === 'Core Member';
    } else if (roleFilter === 'extended') {
      return m.role === 'Extended Core Member';
    } else if (roleFilter === 'member') {
      return m.role === 'Member';
    } else if (roleFilter === 'alumni') {
      return m.role === 'Alumni' || m.role === 'Ex Convenor' || m.role === 'Ex Deputy Convenor' || m.role === 'Ex Core Member';
    }

    return true;
  });

  // Render ALL team members on the homepage itself (no slicing to 6)
  const displayMembers = filteredMembers;

  return (
    <section
      id="team"
      className="bg-[#ECF0F7] border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 mb-2">
          The team
        </h2>
        <p className="font-sans text-base text-slate-500 mb-10">
          Students who keep the Wednesday sessions running.
        </p>

        {/* Search + Filters for full page */}
        {!isHomepage && (
          <div className="flex gap-4 flex-wrap items-center mb-8">
            <div className="relative flex-1 min-w-[260px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'convenor', label: 'Leadership' },
                { id: 'core', label: 'Core' },
                { id: 'extended', label: 'Extended Core' },
                { id: 'member', label: 'Members' },
                { id: 'alumni', label: 'Alumni / Past Leads' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setRoleFilter(pill.id)}
                  className={`px-4 py-1.5 rounded-lg border text-xs font-mono transition-all duration-200 ${
                    roleFilter === pill.id 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-150' 
                      : 'bg-transparent text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
            <span className="text-sm font-semibold text-slate-400">Loading team...</span>
          </div>
        ) : displayMembers.length === 0 ? (
          <p className="font-sans text-sm text-slate-400 py-10">No members found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 border-t border-l border-slate-200 bg-[#ECF0F7] overflow-hidden">
            {displayMembers.map((m) => (
              <TeamMemberCard 
                key={m.id} 
                member={m} 
                projects={projects} 
                achievements={achievements} 
              />
            ))}
          </div>
        )}

        {/* CTA */}
        {isHomepage && (
          <div className="mt-10">
            <Link
              to="/team"
              className="inline-flex items-center gap-1.5 font-mono text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
            >
              <span className="group-hover:underline">Meet the full team</span>
              <ArrowRight size={13} className="transform group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
