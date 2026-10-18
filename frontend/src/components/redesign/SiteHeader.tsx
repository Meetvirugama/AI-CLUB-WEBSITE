import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { ChevronDown, ClipboardList, LogOut, Menu, Shield, X } from 'lucide-react';
import aiClubLogo from '@/assets/ai-club-logo.png';
import FireworkLauncher, { type FireworkLauncherHandle } from '@/components/club/FireworkLauncher';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/api';
import { ThemeToggle, useTheme } from './theme';
import { toast } from 'sonner';
import './redesign.css';

const NAV = [
  { label: 'About', href: '/#about' },
  { label: 'News', href: '/news', pagePath: '/news' },
  { label: 'Events', href: '/events', pagePath: '/events', count: 'events' as const },
  { label: 'Projects', href: '/projects', pagePath: '/projects', count: 'projects' as const },
  { label: 'Resources', href: '/resources', pagePath: '/resources' },
  { label: 'Team', href: '/team', pagePath: '/team', count: 'members' as const },
  { label: 'Achievements', href: '/achievements', pagePath: '/achievements' },
];

type Counts = { events: number; projects: number; members: number };

function useCounts() {
  return useQuery<Counts>({
    queryKey: ['club-stats'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/stats'));
      if (!res.ok) throw new Error('stats');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

/** Site-wide header. Follows the theme on the redesigned pages and stays light everywhere else. */
export default function SiteHeader() {
  const { user, login, logout } = useAuth();
  const { effective, themed } = useTheme();
  const { data: counts } = useCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const fireworkRef = useRef<FireworkLauncherHandle | null>(null);
  const venezaRef = useRef<HTMLAnchorElement>(null);

  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  useMotionValueEvent(scrollY, 'change', y => {
    setScrolled(y > 24);
  });

  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e: globalThis.MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    const [path, hash] = href.split('#');
    const target = path || '/';
    if (location.pathname !== target) {
      e.preventDefault();
      navigate(href);
    } else if (hash) {
      e.preventDefault();
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  const isActive = (item: (typeof NAV)[number]) =>
    item.pagePath ? location.pathname === item.pagePath : location.pathname === '/' && location.hash === `#${item.href.split('#')[1]}`;

  const launchVeneza = (e: MouseEvent<HTMLAnchorElement>) => {
    const r = venezaRef.current?.getBoundingClientRect();
    if (r) fireworkRef.current?.launch(r.left + r.width / 2, r.bottom + window.scrollY);
    go(e, '/weekly-veneza');
  };

  const onLogin = async (credential?: string) => {
    if (!credential) return;
    try {
      await login(credential);
      setMenuOpen(false);
      toast.success('Signed in successfully');
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message || 'Access restricted. Only @dau.ac.in accounts are permitted to sign in.');
    }
  };

  const venezaActive = location.pathname === '/weekly-veneza';

  return (
    <>
      <FireworkLauncher launcherRef={fireworkRef} />

      <header
        className={`fixed inset-x-0 top-0 z-50 border-b font-sans text-rd-fg backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 ${
          scrolled ? 'border-rd-line bg-rd-bg/85 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)]' : 'border-rd-line/60 bg-rd-bg/60'
        }`}
      >
        <div className="relative flex h-12 w-full items-center justify-between gap-3 px-3 sm:px-4">
          {/* Logo */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 py-1">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-rd-fg/5 ring-1 ring-rd-line transition-transform duration-500 group-hover:rotate-[360deg]">
              <img src={aiClubLogo} alt="" className="h-5 w-5 object-contain" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-rd-fg">
              AI Club <span className="font-normal text-rd-muted">DAU</span>
            </span>
          </Link>

          {/* Desktop links */}
          <nav className="hidden xl:block" aria-label="Main">
            <ul className="flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
              <li>
                <a
                  ref={venezaRef}
                  href="/weekly-veneza"
                  onClick={launchVeneza}
                  className="group relative mr-1 inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(120deg, #4f46e5, #7c3aed 45%, #db2777 100%)', backgroundSize: '200% 100%' }}
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">Weekly Veneza</span>
                  <span className="rd-mono relative inline-flex items-center gap-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">
                    <span className="rd-live-dot relative h-1.5 w-1.5 rounded-full bg-[#3ef07a]" /> Live
                  </span>
                  {venezaActive && <span aria-hidden className="absolute inset-x-4 bottom-0.5 h-px bg-white/70" />}
                </a>
              </li>
              {NAV.map(item => {
                const active = isActive(item);
                const n = item.count && counts ? counts[item.count] : 0;
                return (
                  <li key={item.label} className="relative" onMouseEnter={() => setHover(item.label)}>
                    {hover === item.label && (
                      <motion.span layoutId="rd-nav-hover" className="absolute inset-0 rounded-full bg-rd-fg/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                    )}
                    <a
                      href={item.href}
                      onClick={e => go(e, item.href)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] transition-colors ${active ? 'font-semibold text-rd-fg' : 'text-rd-muted hover:text-rd-fg'}`}
                    >
                      {item.label}
                      {n > 0 && <span className="rd-mono -mt-2 text-[9px] text-rd-faint">{n}</span>}
                      {active && <motion.span layoutId="rd-nav-active" className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--rd-violet)]" />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            {themed && <ThemeToggle className="!h-8 !w-8" />}
            <div className="hidden xl:block">
              {user ? (
                <div ref={userRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUserOpen(o => !o)}
                    aria-expanded={userOpen}
                    className="flex items-center gap-2 rounded-full border border-rd-line py-1 pl-1 pr-3 text-sm text-rd-fg transition-colors hover:border-rd-fg/30"
                  >
                    {user.profile_image ? (
                      <img src={user.profile_image} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--rd-violet)] text-xs font-semibold text-white">{user.name[0]}</span>
                    )}
                    <span className="max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                    {user.is_admin && <Shield size={12} className="text-[var(--rd-violet)]" />}
                    <ChevronDown size={14} className={`text-rd-faint transition-transform ${userOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {userOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-rd-line bg-rd-card shadow-2xl"
                      >
                        <div className="border-b border-rd-line px-4 py-3">
                          <div className="truncate text-sm font-semibold text-rd-fg">{user.name}</div>
                          <div className="truncate text-xs text-rd-muted">{user.email}</div>
                        </div>
                        <Link to="/my-registrations" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rd-fg transition-colors hover:bg-rd-fg/5">
                          <ClipboardList size={15} className="text-[var(--rd-violet)]" /> My Registrations
                        </Link>
                        {user.is_admin && (
                          <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rd-fg transition-colors hover:bg-rd-fg/5">
                            <Shield size={15} className="text-[var(--rd-violet)]" /> Admin Dashboard
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => logout()}
                          className="flex w-full items-center gap-2.5 border-t border-rd-line px-4 py-2.5 text-sm text-[var(--rd-red)] transition-colors hover:bg-rd-fg/5"
                        >
                          <LogOut size={15} /> Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <GoogleLogin
                  theme={effective === 'dark' ? 'filled_black' : 'outline'}
                  shape="pill"
                  size="medium"
                  hosted_domain="dau.ac.in"
                  onSuccess={r => onLogin(r.credential)}
                  onError={() => toast.error('Google sign-in was cancelled or failed.')}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-rd-line text-rd-fg xl:hidden"
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

        </div>
        {/* Scroll progress */}
        <motion.span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-px origin-left"
          style={{ scaleX: progress, background: 'var(--rd-spectrum)' }}
        />
      </header>

      {/* Mobile / tablet menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="rd-root fixed inset-0 z-40 flex flex-col overflow-y-auto px-6 pb-8 pt-16 xl:hidden"
            initial={{ clipPath: 'circle(0% at calc(100% - 28px) 24px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 28px) 24px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 28px) 24px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile">
              <ul className="space-y-1">
                {[{ label: 'Weekly Veneza', href: '/weekly-veneza' }, ...NAV].map((item, i) => (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + i * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <a
                      href={item.href}
                      onClick={e => go(e, item.href)}
                      className="rd-display flex items-baseline justify-between border-b border-rd-line py-3 text-[clamp(1.6rem,7vw,2.4rem)] font-medium text-rd-fg"
                    >
                      {item.label}
                      <span className="rd-mono text-[10px] text-rd-faint">{String(i + 1).padStart(2, '0')}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="mt-8">
              {user ? (
                <div className="space-y-2">
                  <div className="text-sm text-rd-muted">Signed in as <span className="text-rd-fg">{user.name}</span></div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/my-registrations" className="rounded-full border border-rd-line px-4 py-2 text-sm text-rd-fg">My Registrations</Link>
                    {user.is_admin && <Link to="/admin" className="rounded-full border border-rd-line px-4 py-2 text-sm text-rd-fg">Admin</Link>}
                    <button type="button" onClick={() => logout()} className="rounded-full border border-rd-line px-4 py-2 text-sm text-[var(--rd-red)]">Sign out</button>
                  </div>
                </div>
              ) : (
                <GoogleLogin
                  theme={effective === 'dark' ? 'filled_black' : 'outline'}
                  shape="pill"
                  hosted_domain="dau.ac.in"
                  onSuccess={r => onLogin(r.credential)}
                  onError={() => toast.error('Google sign-in was cancelled or failed.')}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
