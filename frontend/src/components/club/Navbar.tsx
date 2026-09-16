import { useState, useEffect, useRef } from 'react';
import { Menu, X, LogOut, Shield, ChevronDown, ClipboardList, User } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { getApiUrl } from '../../lib/api';
import aiClubLogo from '@/assets/ai-club-logo.png';
import FireworkLauncher, { type FireworkLauncherHandle } from './FireworkLauncher';

interface UserProfile {
  name: string;
  email: string;
  picture: string;
  is_admin: boolean;
}

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
  color: active ? 'hsl(243, 75%, 59%)' : 'hsl(230, 15%, 35%)',
  textDecoration: 'none',
  borderRadius: '8px',
  background: active ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
  transition: 'all 0.15s ease',
  whiteSpace: 'nowrap' as const,
});

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
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

  // Auth check — uses HttpOnly cookie and/or localStorage Bearer token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(getApiUrl('/api/auth/me'), { credentials: 'include', headers });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser({
              name: data.user.name,
              email: data.user.email,
              picture: data.user.profile_image || '',
              is_admin: !!data.user.is_admin,
            });
            return;
          }
        }
      } catch (_) {}
      setUser(null);
    };
    checkAuth();
  }, []);

  // Google OAuth login — exchanges Google credential for backend JWT
  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setAuthLoading(true);
      try {
        // Get user info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!userInfoRes.ok) throw new Error('Failed to get user info');
        const googleUser = await userInfoRes.json();

        // Exchange with backend
        const authRes = await fetch(getApiUrl('/api/auth/google'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id_token: tokenResponse.access_token }),
        });

        if (authRes.ok) {
          const data = await authRes.json();
          if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
          }
          if (data.user) {
            setUser({
              name: data.user.name,
              email: data.user.email,
              picture: data.user.profile_image || googleUser.picture || '',
              is_admin: !!data.user.is_admin,
            });
          }
          window.dispatchEvent(new Event('auth-change'));
        } else {
          console.error('Auth failed:', await authRes.text());
        }
      } catch (err) {
        console.error('Login error:', err);
      } finally {
        setAuthLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google login error:', err);
      setAuthLoading(false);
    },
  });

  const logout = async () => {
    localStorage.removeItem('access_token');
    try {
      await fetch(getApiUrl('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {}
    setUser(null);
    setShowUserDropdown(false);
    window.dispatchEvent(new Event('auth-change'));
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
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'hsl(230,25%,12%)', textDecoration: 'none', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(228,20%,96%)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {icon} {label}
    </Link>
  );

  return (
    <>
      {/* Full-screen canvas firework launcher — auto-fires only on home page (first visit this session) */}
      <FireworkLauncher launcherRef={fireworkRef} autoLaunchOnHome={location.pathname === '/'} />
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '56px', padding: '0 2rem',
          backgroundColor: 'hsl(228, 30%, 93%)',
          borderBottom: '1px solid hsl(228, 20%, 80%)',
          transition: 'box-shadow 0.3s ease',
          boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
          <img src={aiClubLogo} alt="AI Club DAU" style={{ width: 26, height: 26, borderRadius: 3, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'hsl(230, 25%, 12%)' }}>
            AI Club{' '}
            <span style={{ fontWeight: 400, color: 'hsl(230, 15%, 45%)' }}>DA-IICT</span>
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
                {user.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
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
                  background: 'white', border: '1px solid hsl(228,20%,80%)', borderRadius: '6px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.10)', zIndex: 100, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid hsl(228,20%,88%)' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(230,25%,12%)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'hsl(230,15%,50%)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    {user.is_admin && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, fontSize: '0.65rem', fontWeight: 600, color: 'hsl(243,75%,59%)', background: 'hsl(243,75%,96%)', border: '1px solid hsl(243,75%,80%)', borderRadius: 99, padding: '2px 7px' }}>
                        <Shield size={8} /> Admin
                      </span>
                    )}
                  </div>
                  {dropdownItem('/my-registrations', <ClipboardList size={13} style={{ color: 'hsl(243,75%,59%)' }} />, 'My Registrations')}
                  {user.is_admin && dropdownItem('/admin', <Shield size={13} style={{ color: 'hsl(243,75%,59%)' }} />, 'Admin Dashboard')}
                  <div style={{ borderTop: '1px solid hsl(228,20%,88%)' }}>
                    <button
                      onClick={logout}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', border: 'none', background: 'transparent', fontSize: '0.8rem', color: 'hsl(0,70%,50%)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(0,70%,97%)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => googleLogin()}
              disabled={authLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px',
                background: 'white',
                border: '1px solid hsl(228, 20%, 80%)',
                borderRadius: '4px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: 'hsl(230, 25%, 12%)',
                cursor: authLoading ? 'wait' : 'pointer',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                opacity: authLoading ? 0.7 : 1,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {authLoading ? 'Signing in…' : 'Sign in'}
            </button>
          )}
        </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(230, 25%, 12%)', padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden"
            style={{
              position: 'absolute', top: '56px', left: 0, right: 0,
              background: 'hsl(228, 30%, 93%)',
              borderBottom: '1px solid hsl(228, 20%, 80%)',
              padding: '1rem 2rem 1.5rem', zIndex: 49,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.label} style={{ borderBottom: '1px solid hsl(228, 20%, 85%)' }}>
                    <a
                      href={item.pagePath || item.href}
                      onClick={(e) => { handleNavClick(e, item.pagePath || item.href); setMobileOpen(false); }}
                      style={{ display: 'block', padding: '12px 0', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: active ? 600 : 400, color: active ? 'hsl(243, 75%, 59%)' : 'hsl(230, 20%, 25%)', textDecoration: 'none' }}
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
                  onClick={() => { logout(); setMobileOpen(false); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', color: 'hsl(0,70%,50%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', border: '1px solid hsl(228, 20%, 80%)', borderRadius: 2, cursor: 'pointer' }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              ) : (
                <button
                  onClick={() => { googleLogin(); setMobileOpen(false); }}
                  disabled={authLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'white', color: 'hsl(230,25%,12%)', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', border: '1px solid hsl(228, 20%, 80%)', borderRadius: 2, cursor: 'pointer' }}
                >
                  Sign in with Google
                </button>
              )}
            </div>

            {user && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'white', border: '1px solid hsl(228,20%,80%)', borderRadius: 4 }}>
                {user.picture ? (
                  <img src={user.picture} alt={user.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsl(243,75%,90%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'hsl(243,75%,59%)' }}>
                    {user.name[0]}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'hsl(230,25%,12%)' }}>{user.name}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'hsl(230,15%,50%)' }}>{user.email}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {user.is_admin && (
                    <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'hsl(243,75%,59%)', textDecoration: 'none' }}>
                      <Shield size={12} /> Admin
                    </Link>
                  )}
                  <Link to="/my-registrations" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'hsl(230,20%,40%)', textDecoration: 'none' }}>
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
