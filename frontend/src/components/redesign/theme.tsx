import { createContext, useCallback, useContext, useLayoutEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import './redesign.css';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ai-club-theme';

/** Only these pages are redesigned for dark mode; every other page always renders in its original light style. */
const THEMED_PATHS = ['/', '/news', '/weekly-veneza'];
export const isThemedPath = (pathname: string) => THEMED_PATHS.includes(pathname.replace(/\/+$/, '') || '/');

const readStoredTheme = (): Theme => {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* storage blocked */
  }
  return 'dark';
};

interface ThemeCtx {
  /** The visitor's chosen theme. */
  theme: Theme;
  /** What the current page actually shows: the chosen theme on redesigned pages, light elsewhere. */
  effective: Theme;
  /** True on pages that support the theme switch. */
  themed: boolean;
  setTheme: (t: Theme) => void;
  setThemed: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [themed, setThemed] = useState(() => isThemedPath(window.location.pathname));
  const effective: Theme = themed ? theme : 'light';

  // Layout effect so the class flips in the same frame (needed by the view-transition reveal).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effective === 'dark');
    root.classList.toggle('rd-route', themed);
    root.style.colorScheme = effective;
  }, [effective, themed]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* private mode: theme still applies for this visit */
    }
    setThemeState(t);
  }, []);

  return <ThemeContext.Provider value={{ theme, effective, themed, setTheme, setThemed }}>{children}</ThemeContext.Provider>;
}

/** Keeps the theme scoped to the redesigned pages as the route changes. Render inside the router. */
export function ThemeRouteSync() {
  const { pathname } = useLocation();
  const { setThemed } = useTheme();
  useLayoutEffect(() => {
    setThemed(isThemedPath(pathname));
  }, [pathname, setThemed]);
  return null;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Theme switch: the new theme spreads out in a circle from the click point. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const doc = document as ViewTransitionDoc;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!doc.startViewTransition || reduce) {
      setTheme(next);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = doc.startViewTransition(() => flushSync(() => setTheme(next)));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-rd-line bg-rd-bg/60 text-rd-fg backdrop-blur-md transition-colors hover:border-rd-fg/40 ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 14, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -14, rotate: 90, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex"
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
