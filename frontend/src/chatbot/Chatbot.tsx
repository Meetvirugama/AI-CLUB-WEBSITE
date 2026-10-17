/**
 * Chatbot.tsx — AURA: AI Club DAU's Left-Side AI Assistant.
 *
 * Inspired by the reference design with:
 *   - Sleek floating/docked left-side panel
 *   - Luminous dark theme aura gradient and ambient illumination
 *   - Personal greeting: "Hello {Name}, Can I help you?"
 *   - Glassmorphic "Daily Insights" card
 *   - Pill suggestions & frosted capsule input bar
 *   - Full RAG knowledge streaming & smart navigation allowlist
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles,
  ExternalLink, Navigation, Lock, RotateCcw, ChevronRight, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useChatbot } from '../contexts/ChatbotContext';

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

// ── Suggested quick prompts ──────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'What are the upcoming events?',
  'Show me AI Club projects',
  'Take me to Weekly Veneza',
  'Open the GenAI roadmap',
  'Who are the AI Club members?',
  'How do I join the club?',
];

// ── Source chip styling ──────────────────────────────────────────────────────

const SOURCE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  member:       { label: 'Member',       color: '#7965FF' },
  event:        { label: 'Event',        color: '#FF9418' },
  project:      { label: 'Project',      color: '#35D49A' },
  resource:     { label: 'Resource',     color: '#60A5FA' },
  roadmap:      { label: 'Roadmap',      color: '#F472B6' },
  news:         { label: 'News',         color: '#FBBF24' },
  achievement:  { label: 'Achievement',  color: '#A78BFA' },
};

// ── Markdown Parser ──────────────────────────────────────────────────────────

function renderFormattedText(text: string): JSX.Element {
  if (!text) return <></>;
  const rawLines = text.split('\n');
  const elements: JSX.Element[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={`code-${i}`} className="my-2 p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs overflow-x-auto text-emerald-400">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
    const content = isBullet ? trimmed.slice(2) : trimmed;
    const inlineNodes = renderInline(content, i);

    if (isBullet) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 items-start text-xs sm:text-sm my-1">
          <span className="text-primary flex-shrink-0 mt-0.5 text-xs">▸</span>
          <span className="flex-1">{inlineNodes}</span>
        </div>
      );
    } else {
      elements.push(<div key={`p-${i}`} className="text-xs sm:text-sm my-1 leading-relaxed">{inlineNodes}</div>);
    }
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string, lineKey: number | string): JSX.Element {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s)]+|<br\s*\/?>)/gi);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.toLowerCase().startsWith('<br')) {
          return <br key={`${lineKey}-${i}`} />;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${lineKey}-${i}`} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return <em key={`${lineKey}-${i}`}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
          const url = part.replace(/[.,;:!?)]+$/, '');
          const trailing = part.slice(url.length);
          return (
            <span key={`${lineKey}-${i}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chatbot() {
  const { isOpen, setIsOpen, closeChat, toggleChat } = useChatbot();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hey there! 👋 I'm **AURA**, AI Club DA-IICT's intelligent companion. Ask me anything about the club — upcoming events, projects, learning roadmaps — or say **\"take me to [page]\"** to navigate anywhere!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin } = useAuth();

  const userFirstName = user?.name ? user.name.split(' ')[0] : 'Explorer';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd/Ctrl + K to toggle, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleChat();
      } else if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleChat, closeChat]);

  // ── Navigation execution ──────────────────────────────────────────────────
  const executeNavigation = (navAction: NavigationAction) => {
    const entry = NAVIGATION_ALLOWLIST[navAction.destination];
    if (!entry) return;

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

    setNavigatingTo(entry.label);
    setTimeout(() => {
      setNavigatingTo(null);
      navigate(entry.path);
      closeChat();
    }, 900);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setMessages(prev => [
      ...prev,
      { sender: 'user', text },
      { sender: 'bot', text: '', sources: [], navigation_action: null, messageType: 'knowledge' },
    ]);

    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/club-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      });

      if (res.status === 429) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            sender: 'bot',
            text: "You're sending messages a little fast! Please wait a moment and try again. 🙏",
            messageType: 'error',
          };
          return updated;
        });
        setIsLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No readable stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      setIsLoading(false);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr.trim() === '[DONE]') continue;

              try {
                const parsed = JSON.parse(dataStr);
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (!last || last.sender !== 'bot') return prev;

                  const nextText = parsed.answer !== undefined ? parsed.answer : last.text;
                  const nextSources = parsed.sources !== undefined ? parsed.sources : last.sources;
                  const nextNav = parsed.navigation_action !== undefined ? parsed.navigation_action : last.navigation_action;

                  updated[updated.length - 1] = {
                    ...last,
                    text: nextText,
                    sources: nextSources,
                    navigation_action: nextNav,
                    messageType: parsed.message_type || last.messageType,
                  };
                  return updated;
                });

                if (parsed.navigation_action) {
                  executeNavigation(parsed.navigation_action);
                }
              } catch {
                // partial chunk skip
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          sender: 'bot',
          text: "I ran into an issue connecting to the AI brain. Please try again in a moment.",
          messageType: 'error',
        };
        return updated;
      });
      setIsLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        sender: 'bot',
        text: `Chat cleared. Hello ${userFirstName}! How can I help you today?`,
      },
    ]);
  };

  return (
    <>
      {/* ── Left-Side AI Chat Bar Overlay & Drawer ────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeChat}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
              aria-hidden="true"
            />

            {/* Left-Side AI Panel (matching the reference layout) */}
            <motion.aside
              initial={{ x: -460, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -460, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed top-2 bottom-2 left-2 sm:top-3 sm:bottom-3 sm:left-3 w-[calc(100vw-16px)] sm:w-[420px] md:w-[450px] z-50 rounded-[28px] overflow-hidden flex flex-col shadow-2xl border border-white/10"
              style={{
                background: 'linear-gradient(165deg, rgba(22, 18, 48, 0.96) 0%, rgba(13, 16, 26, 0.97) 35%, rgba(10, 13, 22, 0.98) 70%, rgba(32, 20, 18, 0.95) 100%)',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(121, 101, 255, 0.22)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="AURA AI Chat Assistant"
            >
              {/* Atmospheric Glow Overlays */}
              <div className="absolute top-0 left-0 w-72 h-72 bg-primary/20 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent/15 rounded-full blur-[90px] pointer-events-none" />
              
              {/* Subtle wave contours at bottom */}
              <div
                className="absolute inset-x-0 bottom-0 h-44 pointer-events-none opacity-20"
                style={{
                  background: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(255, 148, 24, 0.35) 0%, transparent 80%)',
                }}
              />

              {/* ── Top Header ────────────────────────────────────────────── */}
              <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-white/10 shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                    <Sparkles size={15} className="text-primary animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                      AURA AI
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">
                        v2.0
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-mono">DAU Live Companion</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={clearChat}
                    className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    title="Clear chat history"
                    aria-label="Clear chat"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={closeChat}
                    className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close AI Assistant"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* ── Greeting Hero (matching reference image) ──────────────── */}
              <div className="px-5 pt-4 pb-2 relative z-10 shrink-0">
                <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white/90">
                  Hello {userFirstName},
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-200 to-amber-200 bg-clip-text text-transparent leading-tight">
                  Can I help you?
                </h2>
              </div>

              {/* ── Daily Insights Feature Card (matching reference image) ─── */}
              <div
                onClick={() => sendMessage("Give me a quick update on current AI Club events and roadmaps.")}
                className="mx-5 my-2.5 p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 backdrop-blur-xl transition-all cursor-pointer shadow-lg group relative overflow-hidden shrink-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                    <Sparkles size={16} className="text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white/90 tracking-wider uppercase font-mono">
                        Daily Insights
                      </span>
                      <ChevronRight size={14} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-white/70 mt-0.5 leading-relaxed line-clamp-2">
                      GenAI Roadmaps, Weekly Veneza resources, and upcoming Hackathons are live!
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Scrollable Chat Messages Stream ────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3.5 relative z-10 custom-scrollbar">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    {/* User Bubble */}
                    {msg.sender === 'user' ? (
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-white/15 backdrop-blur-md text-white border border-white/20 text-xs sm:text-sm shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    ) : (
                      /* Bot Bubble */
                      <div className="max-w-[92%] rounded-2xl rounded-tl-sm p-4 bg-white/[0.07] backdrop-blur-md text-white/95 border border-white/10 text-xs sm:text-sm shadow-sm leading-relaxed space-y-2">
                        {renderFormattedText(msg.text)}

                        {/* Navigation action feedback */}
                        {msg.navigation_action && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/15 border border-accent/30 mt-2">
                            <Navigation size={12} className="text-accent animate-pulse" />
                            <span className="text-xs text-white">
                              Navigating to <strong className="text-accent">{msg.navigation_action.label}</strong>…
                            </span>
                          </div>
                        )}

                        {/* Source citations */}
                        {msg.sources && msg.sources.length > 0 && !msg.navigation_action && (
                          <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5 mt-2">
                            {msg.sources.map((src, si) => {
                              const meta = SOURCE_TYPE_LABELS[src.type] ?? { label: src.title, color: '#7965FF' };
                              return (
                                <a
                                  key={si}
                                  href={src.url}
                                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all hover:scale-105"
                                  style={{
                                    color: meta.color,
                                    borderColor: `${meta.color}50`,
                                    background: `${meta.color}15`,
                                    textDecoration: 'none',
                                  }}
                                  title={`View ${src.title}`}
                                >
                                  <ExternalLink size={9} />
                                  {meta.label}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator matching reference image dots */}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.08] border border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Toast */}
                <AnimatePresence>
                  {navigatingTo && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="p-3 rounded-xl bg-accent/20 border border-accent/40 flex items-center gap-2"
                    >
                      <Navigation size={14} className="text-accent animate-pulse" />
                      <span className="text-xs text-white font-medium">
                        Redirecting to <strong className="text-accent">{navigatingTo}</strong>…
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Suggested Prompt Pills (matching reference image) */}
                {messages.length <= 2 && !isLoading && (
                  <div className="pt-2">
                    <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
                      <Sparkles size={11} className="text-primary" /> Suggested prompts
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                          className="text-left text-xs px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-98 cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>

              {/* ── Bottom Frosted Capsule Input Bar ──────────────────────── */}
              <div className="p-4 border-t border-white/10 relative z-10 shrink-0">
                <div className="rounded-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/15 p-1.5 flex items-center gap-2 shadow-xl focus-within:border-primary/60 transition-colors">
                  <div className="pl-2 text-white/40">
                    <Bot size={16} />
                  </div>
                  <input
                    ref={inputRef}
                    id="aura-chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask AURA anything or navigate…"
                    disabled={isLoading}
                    maxLength={1000}
                    className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder:text-white/40 outline-none px-1 py-1.5 disabled:opacity-50"
                  />
                  <motion.button
                    onClick={() => sendMessage(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-30 transition-all cursor-pointer shadow-md shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Send query"
                  >
                    <Send size={13} />
                  </motion.button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating Launcher on Left Side (when bar is closed) ─────────── */}
      <motion.button
        id="aura-chat-fab"
        onClick={toggleChat}
        className={`fixed bottom-6 left-6 z-40 rounded-full btn-glow flex items-center gap-2.5 px-4 py-3 text-primary-foreground transition-all shadow-xl cursor-pointer ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
        }`}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        title="Open AURA AI Chat (Cmd/Ctrl + K)"
        aria-label="Open AURA AI Chat"
      >
        <Sparkles size={18} className="animate-pulse text-amber-300" />
        <span className="text-xs font-bold font-sans tracking-wide">
          AI Chat
        </span>
      </motion.button>
    </>
  );
}
