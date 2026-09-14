/**
 * Chatbot.tsx — NeuralNode: AI Club DAU's global assistant.
 *
 * Capabilities:
 *   1. Knowledge assistant — answers questions about members, events, projects,
 *      resources, roadmaps, achievements, news using live DB-backed RAG.
 *   2. Smart navigation — understands "take me to events" style requests and
 *      navigates using React Router, with auth-aware route protection.
 *
 * Security:
 *   - Navigation destination keys are validated by the backend against an
 *     explicit allowlist before being returned in the response.
 *   - Admin routes are RBAC-checked server-side (user.is_admin).
 *   - The frontend does a second independent auth check before calling
 *     useNavigate() — the LLM cannot bypass either check.
 *   - Bearer token is sent with each request so the backend can check admin.
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles,
  ExternalLink, Navigation, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

// ── Types ────────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  type: string;
  url: string;
}

interface NavigationAction {
  destination: string;
  path: string;
  label: string;
}

type MessageType = 'knowledge' | 'navigation' | 'nav-denied' | 'error';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  sources?: Source[];
  navigation_action?: NavigationAction | null;
  messageType?: MessageType;
}

// ── Navigation allowlist (frontend mirror of backend NAVIGATION_ALLOWLIST) ───
// Keys match the backend exactly. This is the SECOND independent auth check —
// even if the backend somehow passed a nav action, the frontend re-validates
// before calling useNavigate().

interface NavEntry {
  path: string;
  label: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
}

const NAVIGATION_ALLOWLIST: Record<string, NavEntry> = {
  'home':                 { path: '/',                    label: 'Home',                        requiresAuth: false, requiresAdmin: false },
  'events':               { path: '/events',              label: 'Events',                      requiresAuth: false, requiresAdmin: false },
  'projects':             { path: '/projects',            label: 'Projects',                    requiresAuth: false, requiresAdmin: false },
  'team':                 { path: '/team',                label: 'Team',                        requiresAuth: false, requiresAdmin: false },
  'achievements':         { path: '/achievements',        label: 'Achievements',                requiresAuth: false, requiresAdmin: false },
  'news':                 { path: '/news',                label: 'News',                        requiresAuth: false, requiresAdmin: false },
  'curriculum':           { path: '/curriculum',          label: 'Curriculum',                  requiresAuth: false, requiresAdmin: false },
  'weekly-veneza':        { path: '/weekly-veneza',       label: 'Weekly Veneza',               requiresAuth: false, requiresAdmin: false },
  'roadmap-ml':           { path: '/roadmaps/ml',         label: 'ML Roadmap',                  requiresAuth: false, requiresAdmin: false },
  'roadmap-dl':           { path: '/roadmaps/dl',         label: 'Deep Learning Roadmap',       requiresAuth: false, requiresAdmin: false },
  'roadmap-rl':           { path: '/roadmaps/rl',         label: 'RL Roadmap',                  requiresAuth: false, requiresAdmin: false },
  'roadmap-nlp':          { path: '/roadmaps/nlp',        label: 'NLP Roadmap',                 requiresAuth: false, requiresAdmin: false },
  'roadmap-transformers': { path: '/roadmaps/transformers', label: 'Transformers Roadmap',      requiresAuth: false, requiresAdmin: false },
  'roadmap-genai':        { path: '/roadmaps/genai',      label: 'GenAI Roadmap',               requiresAuth: false, requiresAdmin: false },
  'roadmap-llm':          { path: '/roadmaps/llm',        label: 'LLM Roadmap',                 requiresAuth: false, requiresAdmin: false },
  'roadmap-agentic':      { path: '/roadmaps/agentic-ai', label: 'Agentic AI Roadmap',          requiresAuth: false, requiresAdmin: false },
  'my-registrations':     { path: '/my-registrations',    label: 'My Registrations',            requiresAuth: true,  requiresAdmin: false },
  'admin':                { path: '/admin',               label: 'Admin Dashboard',             requiresAuth: true,  requiresAdmin: true  },
};

// ── Suggested questions (knowledge + navigation) ──────────────────────────────

const SUGGESTED_QUESTIONS = [
  'What are the upcoming events?',
  'Take me to the Events page.',
  'Who are the AI Club members?',
  'Show me AI Club projects.',
  'Open the GenAI roadmap.',
  'What resources are available to learn ML?',
  'Take me to the Projects page.',
  'How do I join the club?',
];

// ── Source chip styles ────────────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  events:       { label: 'Events',       color: 'hsl(243 75% 59%)' },
  members:      { label: 'Members',      color: 'hsl(150 60% 35%)' },
  projects:     { label: 'Projects',     color: 'hsl(330 45% 50%)' },
  resources:    { label: 'Resources',    color: 'hsl(40 90% 40%)'  },
  roadmaps:     { label: 'Roadmaps',     color: 'hsl(200 70% 40%)' },
  achievements: { label: 'Achievements', color: 'hsl(270 60% 50%)' },
  news:         { label: 'News',         color: 'hsl(20 80% 45%)'  },
};

// ── Inline markdown renderer ──────────────────────────────────────────────────
// Returns JSX — no dangerouslySetInnerHTML (XSS-safe).

function renderMarkdown(text: string): JSX.Element {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`gap-${lineIdx}`} style={{ height: '0.35rem' }} />);
      return;
    }

    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
    const content = isBullet ? trimmed.slice(2) : trimmed;
    const inlineNodes = renderInline(content, lineIdx);

    if (isBullet) {
      elements.push(
        <div key={`li-${lineIdx}`} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'hsl(243 75% 59%)', flexShrink: 0, marginTop: '0.05rem', fontSize: '0.85em' }}>▸</span>
          <span>{inlineNodes}</span>
        </div>
      );
    } else {
      elements.push(<div key={`p-${lineIdx}`}>{inlineNodes}</div>);
    }
  });

  return <>{elements}</>;
}

function renderInline(text: string, lineKey: number | string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${lineKey}-${i}`}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return <em key={`${lineKey}-${i}`}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
          const url = part.replace(/[.,;:!?)]+$/, '');
          const trailing = part.slice(url.length);
          return (
            <span key={`${lineKey}-${i}`}>
              <a href={url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'hsl(243 75% 59%)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                {url}
              </a>
              {trailing}
            </span>
          );
        }
        return <span key={`${lineKey}-${i}`}>{part}</span>;
      })}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hey there! 👋 I'm **NeuralNode**, AI Club DAU's assistant. Ask me anything about the club — events, projects, members, resources — or say **\"take me to [page]\"** to navigate anywhere on the site!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Execute a navigation action from the API response ─────────────────────
  const executeNavigation = (navAction: NavigationAction) => {
    const entry = NAVIGATION_ALLOWLIST[navAction.destination];

    // Frontend second-layer security check (independent of backend)
    if (!entry) {
      // Key not in frontend allowlist — deny regardless of backend response
      return;
    }
    if (entry.requiresAdmin && !isAdmin) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "⛔ You don't have permission to access the Admin Dashboard.",
        messageType: 'nav-denied',
      }]);
      return;
    }
    if (entry.requiresAuth && !isAuthenticated) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: `🔒 You need to be signed in to access **${entry.label}**. Please log in first.`,
        messageType: 'nav-denied',
      }]);
      return;
    }

    // Show navigation confirmation and navigate after brief delay
    setNavigatingTo(entry.label);
    setTimeout(() => {
      setNavigatingTo(null);
      navigate(entry.path);
      setIsOpen(false);
    }, 900);
  };

  // ── Send message to backend ───────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowSuggestions(false);
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      // Send auth token so backend can check admin for navigation
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(getApiUrl('/api/club-chat'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: "You're sending messages a little fast! Please wait a moment and try again. 🙏",
          messageType: 'error',
        }]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const navAction: NavigationAction | null = data.navigation_action ?? null;

      const botMsg: Message = {
        sender: 'bot',
        text: data.reply || "I couldn't generate a response. Please try again!",
        sources: data.sources ?? [],
        navigation_action: navAction,
        messageType: navAction ? 'navigation' : 'knowledge',
      };
      setMessages(prev => [...prev, botMsg]);

      // Execute navigation if the response includes a valid, permitted action
      if (navAction) {
        executeNavigation(navAction);
      }

    } catch {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: "Sorry, I couldn't reach the server right now. Please try again in a moment!",
        messageType: 'error',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3"
      style={{ pointerEvents: 'none' }}
    >
      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-[370px] rounded-2xl bg-card border border-border flex flex-col overflow-hidden"
            style={{
              pointerEvents: 'all',
              boxShadow: '0 25px 60px -15px hsl(217 91% 60% / 0.25), 0 0 0 1px hsl(217 91% 60% / 0.08)',
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 bg-gradient-to-r from-primary/10 to-accent/5">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
                <Bot size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <span className="font-display font-bold text-sm text-foreground">NeuralNode</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: 'pulse-dot 2s ease-in-out infinite' }} />
                  <span className="text-[10px] text-muted-foreground">
                    AI Club DAU · Knowledge + Navigation
                  </span>
                </div>
              </div>
              {/* Auth status indicator */}
              {!authLoading && isAdmin && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-mono">
                  ADMIN
                </span>
              )}
              {!authLoading && isAuthenticated && !isAdmin && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20 font-mono">
                  SIGNED IN
                </span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                style={{ pointerEvents: 'all' }}
                aria-label="Close chatbot"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[400px]">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      {msg.messageType === 'nav-denied' ? (
                        <Lock size={11} className="text-destructive" />
                      ) : msg.messageType === 'navigation' ? (
                        <Navigation size={11} className="text-accent" />
                      ) : (
                        <Bot size={11} className="text-primary" />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5 max-w-[82%]">
                    {/* Message bubble */}
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : msg.messageType === 'nav-denied'
                          ? 'bg-destructive/10 text-foreground border border-destructive/20 rounded-tl-sm'
                          : msg.messageType === 'navigation'
                          ? 'bg-accent/10 text-foreground border border-accent/20 rounded-tl-sm'
                          : 'bg-secondary text-foreground rounded-tl-sm'
                      }`}
                    >
                      {msg.sender === 'bot' ? renderMarkdown(msg.text) : msg.text}
                    </div>

                    {/* Navigation action chip */}
                    {msg.navigation_action && (
                      <div className="flex items-center gap-1.5 px-1">
                        <Navigation size={9} className="text-accent" />
                        <span className="text-[10px] text-muted-foreground">
                          Navigating to <strong className="text-accent">{msg.navigation_action.label}</strong>…
                        </span>
                      </div>
                    )}

                    {/* Source chips */}
                    {msg.sender === 'bot' && msg.sources && msg.sources.length > 0 && !msg.navigation_action && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {msg.sources.map((src, si) => {
                          const meta = SOURCE_TYPE_LABELS[src.type] ?? { label: src.title, color: 'hsl(243 75% 59%)' };
                          return (
                            <a
                              key={si}
                              href={src.url}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-opacity hover:opacity-80"
                              style={{
                                color: meta.color,
                                borderColor: `${meta.color}40`,
                                background: `${meta.color}12`,
                                textDecoration: 'none',
                              }}
                              title={`View ${src.title}`}
                            >
                              <ExternalLink size={8} />
                              {meta.label}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                      <User size={12} className="text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Loader2 size={12} className="text-primary animate-spin" />
                  </div>
                  <div className="bg-secondary rounded-xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex gap-1 items-center h-4">
                      {[0, 1, 2].map(j => (
                        <span key={j} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                          style={{ animation: `pulse-dot 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Navigation toast */}
              <AnimatePresence>
                {navigatingTo && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/15 border border-accent/30"
                  >
                    <Navigation size={12} className="text-accent animate-pulse" />
                    <span className="text-xs text-foreground">
                      Taking you to <strong className="text-accent">{navigatingTo}</strong>…
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggested questions */}
              {showSuggestions && messages.length === 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col gap-1.5 mt-2"
                >
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 px-1">
                    <Sparkles size={9} />
                    Try asking or navigating
                  </p>
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-secondary transition-all"
                      style={{ pointerEvents: 'all' }}
                    >
                      {q}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2 bg-card">
              <input
                id="chatbot-input"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything or say 'take me to…'"
                disabled={isLoading}
                maxLength={1000}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/60 disabled:opacity-50"
                style={{ pointerEvents: 'all' }}
              />
              <motion.button
                id="chatbot-send-btn"
                onClick={() => sendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 transition-opacity"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Send message"
                style={{ pointerEvents: 'all' }}
              >
                <Send size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        id="chatbot-fab"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-14 h-14 rounded-full btn-glow flex items-center justify-center text-primary-foreground transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={
          isOpen
            ? {}
            : {
                boxShadow: [
                  '0 4px 15px hsl(217 91% 60% / 0.35)',
                  '0 4px 28px hsl(217 91% 60% / 0.6)',
                  '0 4px 15px hsl(217 91% 60% / 0.35)',
                ],
              }
        }
        transition={{ duration: 2, repeat: Infinity }}
        aria-label={isOpen ? 'Close chatbot' : 'Open AI Club chatbot'}
        style={{ pointerEvents: 'all' }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="open"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
