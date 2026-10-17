import { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, Shield, ChevronDown, ClipboardList, User, Sparkles } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { getApiUrl } from '../../lib/api';
import aiClubLogo from '@/assets/ai-club-logo.png';
import FireworkLauncher, { type FireworkLauncherHandle } from './FireworkLauncher';
import { useAuth } from '../../contexts/AuthContext';
import { useChatbot } from '../../contexts/ChatbotContext';
import ThemeToggle from '../ThemeToggle';

interface NavCounts {
  events: number;
  projects: number;
  members: number;
}

const navItems = [
  { label: 'About', href: '/#hero' },
  { label: 'Weekly Veneza', href: '/weekly-veneza', pagePath: '/weekly-veneza' },
  { label: 'News', href: '/news', pagePath: '/news' },
  { label: 'Events', href: '/#events', pagePath: '/events' },
  { label: 'Projects', href: '/#projects', pagePath: '/projects' },
  { label: 'Resources', href: '/resources', pagePath: '/resources' },
  { label: 'Team', href: '/#team', pagePath: '/team' },
  { label: 'Achievements', href: '/achievements', pagePath: '/achievements' },
];

const linkStyle = (active: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.83rem',
  fontWeight: active ? 600 : 400,
  color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
  textDecoration: 'none',
  borderRadius: '8px',
  background: active ? 'hsl(var(--primary) / 0.12)' : 'transparent',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap' as const,
});

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
  const { isOpen: isChatOpen, openChat, toggleChat } = useChatbot();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [counts, setCounts] = useState<NavCounts>({ events: 0, projects: 0, members: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fireworkRef = useRef<FireworkLauncherHandle | null>(null);
  const venezaButtonRef = useRef<HTMLAnchorElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowUserDropdown(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(getApiUrl('/api/stats'));
        if (res.ok) {
          const data = await res.json();
          setCounts({
            events: data.events ?? 0,
            projects: data.projects ?? 0,
            members: data.members ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };
    fetchCounts();
  }, []);

  // We now use the <GoogleLogin /> component directly which returns an ID Token

  const handleLogout = async () => {
    await logout();
    setShowUserDropdown(false);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const parts = href.split('#');
    const path = parts[0] || '/';
    const hash = parts[1];
    if (location.pathname !== path && path !== '') {
      e.preventDefault();
      navigate(href);
    } else if (hash) {
      e.preventDefault();
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.pagePath) return location.pathname === item.pagePath;
    const hash = item.href.split('#')[1];
    return location.hash === `#${hash}` && location.pathname === '/';
  };

  const dropdownItem = (href: string, icon: React.ReactNode, label: string) => (
    <Link
      to={href}
      className="flex items-center gap-2 px-3.5 py-2.5 text-xs text-foreground hover:bg-secondary transition-colors"
      style={{ textDecoration: 'none' }}
    >
      {icon} {label}
    </Link>
  );

  return (
    <>
      {/* Full-screen canvas firework launcher */}
      <FireworkLauncher launcherRef={fireworkRef} />
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '56px', padding: '0 2rem',
          backgroundColor: 'hsl(var(--background) / 0.96)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid hsl(var(--border))',
          transition: 'box-shadow 0.3s ease, background-color 0.2s ease, border-color 0.2s ease',
          boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <img src={aiClubLogo} alt="AI Club DAU" style={{ width: 26, height: 26, borderRadius: 3, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'hsl(var(--foreground))' }}>
            AI Club{' '}
            <span style={{ fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}>DA-IICT</span>
          </span>
        </Link>

        {/* Desktop nav + Auth group */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '1.5rem' }}>
          {/* Desktop nav links with playful pop spring effects */}
          <ul style={{ display: 'flex', alignItems: 'center', gap: '4px', listStyle: 'none', margin: 0, padding: 0 }}>
          {navItems.map((item) => {
            const active = isActive(item);
            const badgeCount = item.label === 'Events' ? counts.events : item.label === 'Projects' ? counts.projects : item.label === 'Team' ? counts.members : 0;
            
            if (item.label === 'Weekly Veneza') {
              return (
                <li key={item.label} style={{ position: 'relative', padding: '0 4px' }}>
                  <a
                    ref={venezaButtonRef}
                    href={item.pagePath || item.href}
                    onClick={(e) => {
                      // Get button position to launch rockets FROM there
                      const rect = venezaButtonRef.current?.getBoundingClientRect();
                      if (rect) {
                        fireworkRef.current?.launch(
                          rect.left + rect.width / 2,
                          rect.bottom + window.scrollY
                        );
                      }
                      handleNavClick(e, item.pagePath || item.href);
                    }}
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 14px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
                      backgroundSize: '200% 200%',
                      color: '#fff',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.83rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      letterSpacing: '0.01em',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 0 0 rgba(99,102,241,0)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
                      animation: 'venezaGlow 3s ease-in-out infinite',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px) scale(1.04)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(99,102,241,0.55)';
                      (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(99,102,241,0)';
                      (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
                    }}
                  >
                    <span>Weekly Veneza</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '20px',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      letterSpacing: '0.05em',
                      background: 'rgba(255,255,255,0.22)',
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}>LIVE</span>
                  </a>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <a
                  href={item.pagePath || item.href}
                  onClick={(e) => handleNavClick(e, item.pagePath || item.href)}
                  style={{
                    ...linkStyle(active),
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = 'hsl(243, 75%, 59%)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(99, 102, 241, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = 'hsl(230, 15%, 35%)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '12px',
                        background: active ? 'hsl(243, 75%, 59%)' : 'hsl(228, 20%, 82%)',
                        color: active ? 'white' : 'hsl(230, 25%, 30%)',
                      }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
            {/* AI Chat Navigation Option */}
            <li>
              <button
                type="button"
                onClick={() => toggleChat()}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-[0.83rem] transition-all duration-200 cursor-pointer ${
                  isChatOpen
                    ? 'text-primary bg-primary/15 font-semibold ring-1 ring-primary/30 shadow-sm'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/10 font-normal'
                }`}
                title="Open AURA AI Chat (Cmd/Ctrl + K)"
              >
                <Sparkles size={13} className="text-primary animate-pulse" />
                <span>AI Chat</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                  AI
                </span>
              </button>
            </li>
          </ul>

          {/* Right: Auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {user ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px 4px 4px',
                  border: '1px solid hsl(228, 20%, 80%)', borderRadius: '4px',
                  background: 'white', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'hsl(243,75%,90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'hsl(243,75%,59%)' }}>
                    {user.name[0]}
                  </div>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'hsl(230,25%,12%)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name.split(' ')[0]}
                </span>
                {user.is_admin && <Shield size={11} style={{ color: 'hsl(243,75%,59%)' }} />}
                <ChevronDown size={12} style={{ color: 'hsl(230,15%,45%)', transform: showUserDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {showUserDropdown && (
                <div style={{
                  position: 'absolute', right: 0, marginTop: '6px', width: '210px',
                  background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.35)', zIndex: 100, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid hsl(var(--border))' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    {user.is_admin && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: '0.65rem', fontWeight: 600, color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.12)', border: '1px solid hsl(var(--primary) / 0.25)', borderRadius: 99, padding: '2px 7px' }}>
                        <Shield size={8} /> Admin
                      </span>
                    )}
                  </div>
                  {dropdownItem('/my-registrations', <ClipboardList size={13} style={{ color: 'hsl(var(--primary))' }} />, 'My Registrations')}
                  {user.is_admin && dropdownItem('/admin', <Shield size={13} style={{ color: 'hsl(var(--primary))' }} />, 'Admin Dashboard')}
                  <div style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3.5 py-2.5 w-full text-xs text-destructive hover:bg-destructive/10 transition-colors"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    try {
                      await login(credentialResponse.credential);
                    } catch (err) {
                      console.error('Login error:', err);
                    }
                  }
                }}
                onError={() => console.error('Google login error')}
              />
            </div>
          )}
          <ThemeToggle />
        </div>
        </div>

        {/* Mobile toggle + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden"
            style={{
              position: 'absolute', top: '56px', left: 0, right: 0,
              background: 'hsl(var(--background))',
              borderBottom: '1px solid hsl(var(--border))',
              padding: '1rem 2rem 1.5rem', zIndex: 49,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {/* Mobile AI Chat Assistant link */}
              <li style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    openChat();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-primary text-sm font-semibold transition-all active:scale-98 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary animate-pulse" />
                    <span>AI Chat Assistant</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                    AURA
                  </span>
                </button>
              </li>

              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.label} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <a
                      href={item.pagePath || item.href}
                      onClick={(e) => { handleNavClick(e, item.pagePath || item.href); setMobileOpen(false); }}
                      style={{ display: 'block', padding: '12px 0', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: active ? 600 : 400, color: active ? 'hsl(var(--primary))' : 'hsl(var(--foreground))', textDecoration: 'none' }}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: 10 }}>
              {user ? (
                <button
                  onClick={async () => { await logout(); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', color: 'hsl(var(--destructive))', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', border: '1px solid hsl(var(--border))', borderRadius: 4, cursor: 'pointer' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              ) : (
                <div style={{ display: 'inline-flex' }}>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      if (credentialResponse.credential) {
                        try {
                          await login(credentialResponse.credential);
                          setMobileOpen(false);
                        } catch (err) {
                          console.error('Login error:', err);
                        }
                      }
                    }}
                    onError={() => console.error('Google login error')}
                  />
                </div>
              )}
            </div>

            {user && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(var(--primary) / 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'hsl(var(--primary))' }}>
                    {user.name[0]}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>{user.name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))' }}>{user.email}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {user.is_admin && (
                    <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'hsl(var(--primary))', textDecoration: 'none' }}>
                      <Shield size={12} /> Admin
                    </Link>
                  )}
                  <Link to="/my-registrations" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', textDecoration: 'none' }}>
                    <ClipboardList size={12} /> My Regs
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
