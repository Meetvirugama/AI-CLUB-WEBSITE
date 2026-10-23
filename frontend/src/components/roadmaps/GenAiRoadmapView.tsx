import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  Search,
  RotateCcw,
  Printer,
  FileCode2,
  Sparkles,
  Trophy,
  Compass,
  Layers,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Calendar,
  Check,
  Terminal,
  Bookmark,
  Share2,
} from "lucide-react";
import {
  GENAI_ROADMAP_META,
  GENAI_ROADMAP_WEEKS,
  GenAiWeek,
} from "@/data/genaiRoadmapData";
import { toast } from "sonner";

export default function GenAiRoadmapView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Compute total checklist items across all weeks
  const allItemKeys = useMemo(() => {
    const keys: { key: string; weekId: string; text: string }[] = [];
    let globalIndex = 0;
    GENAI_ROADMAP_WEEKS.forEach((w) => {
      w.topics.forEach((t) => {
        keys.push({ key: `genai-roadmap-clean-${globalIndex}`, weekId: w.id, text: t });
        globalIndex++;
      });
      w.buildTasks.forEach((b) => {
        keys.push({ key: `genai-roadmap-clean-${globalIndex}`, weekId: w.id, text: b });
        globalIndex++;
      });
    });
    return keys;
  }, []);

  // Load progress from localStorage on mount
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    allItemKeys.forEach((item) => {
      if (localStorage.getItem(item.key) === "1") {
        initial[item.key] = true;
      }
    });
    setCompletedItems(initial);
  }, [allItemKeys]);

  const toggleCheck = (key: string) => {
    setCompletedItems((prev) => {
      const nextVal = !prev[key];
      const updated = { ...prev, [key]: nextVal };
      if (nextVal) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
      return updated;
    });
  };

  const totalTasks = allItemKeys.length;
  const completedCount = useMemo(() => {
    return Object.values(completedItems).filter(Boolean).length;
  }, [completedItems]);

  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const toggleCollapse = (id: string) => {
    setCollapsedWeeks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => setCollapsedWeeks({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    GENAI_ROADMAP_WEEKS.forEach((w) => {
      all[w.id] = true;
    });
    setCollapsedWeeks(all);
  };

  const resetAllProgress = () => {
    if (window.confirm("Reset all checkmarks for this roadmap?")) {
      allItemKeys.forEach((item) => {
        localStorage.removeItem(item.key);
      });
      setCompletedItems({});
      toast.success("Progress reset successfully");
    }
  };

  // Filter weeks based on search query
  const filteredWeeks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return GENAI_ROADMAP_WEEKS;

    return GENAI_ROADMAP_WEEKS.filter((w) => {
      const matchTitle = w.title.toLowerCase().includes(q);
      const matchBadge = w.badge.toLowerCase().includes(q);
      const matchDesc = w.description.toLowerCase().includes(q);
      const matchMission = w.mission.toLowerCase().includes(q);
      const matchDeliv = w.deliverable.toLowerCase().includes(q);
      const matchTopics = w.topics.some((t) => t.toLowerCase().includes(q));
      const matchBuild = w.buildTasks.some((b) => b.toLowerCase().includes(q));
      const matchRes = w.resources.some(
        (r) => r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.kind.toLowerCase().includes(q)
      );
      const matchPaper = w.papers.some(
        (p) => p.title.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q)
      );

      return (
        matchTitle ||
        matchBadge ||
        matchDesc ||
        matchMission ||
        matchDeliv ||
        matchTopics ||
        matchBuild ||
        matchRes ||
        matchPaper
      );
    });
  }, [searchQuery]);

  // Calculate per-week completion
  const getWeekStats = (weekId: string) => {
    const weekItems = allItemKeys.filter((i) => i.weekId === weekId);
    const completed = weekItems.filter((i) => completedItems[i.key]).length;
    return {
      completed,
      total: weekItems.length,
      pct: weekItems.length ? Math.round((completed / weekItems.length) * 100) : 0,
    };
  };

  // Map item keys to week items
  let itemCounter = 0;

  return (
    <div className="w-full text-foreground">
      {/* ─── Hero Section ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 via-card/50 to-background/90 p-6 md:p-10 shadow-2xl backdrop-blur-xl mb-10">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-mono text-[11px] tracking-widest uppercase">
              <Sparkles size={13} className="text-primary animate-pulse" />
              <span>OFFICIAL 2026 CURRICULUM</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/genai-roadmap.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                title="Open clean standalone HTML version"
              >
                <FileCode2 size={13} className="text-primary" />
                <span>Standalone HTML</span>
                <ArrowUpRight size={12} />
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Printer size={13} className="text-primary" />
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {GENAI_ROADMAP_META.title}: <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">8-Week Roadmap</span>
          </h1>

          <p className="mt-3 text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {GENAI_ROADMAP_META.description}
          </p>

          <p className="mt-2 text-xs font-mono text-primary/80">
            Weekly topics → selected videos and reading → implementation → deliverable. Focus on building and evaluating, not watching everything.
          </p>

          {/* Metrics & Progress Bar */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl border border-border/60 bg-background/50">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Duration</div>
              <div className="mt-0.5 text-lg font-bold text-foreground">8 Weeks Intensive</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Capstone Deliverables</div>
              <div className="mt-0.5 text-lg font-bold text-foreground">8 Projects</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Key Research Papers</div>
              <div className="mt-0.5 text-lg font-bold text-foreground">18 Curated Papers</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Tasks Progress</span>
                <span className="text-xs font-mono font-semibold text-primary">{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/50 border border-border/40">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground text-right font-mono">
                {completedCount} / {totalTasks} checked
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Controls ─── */}
      <div className="sticky top-20 z-30 mb-8 rounded-2xl border border-border/80 bg-card/90 p-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search weekly topics, papers, tools, deliverables, videos (e.g. LangGraph, RAG, MCP)..."
              className="w-full rounded-xl border border-border bg-background/80 py-2 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Collapse All
            </button>
            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetAllProgress}
                className="p-2 rounded-xl border border-border bg-background hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-muted-foreground transition-colors"
                title="Reset checkmarks"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Quick jump navigation */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mr-1">Jump to:</span>
          {GENAI_ROADMAP_WEEKS.map((w) => {
            const stats = getWeekStats(w.id);
            return (
              <a
                key={w.id}
                href={`#${w.id}`}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-background/60 hover:border-primary/50 hover:bg-primary/5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>W{w.weekNumber}</span>
                {stats.pct === 100 ? (
                  <CheckCircle2 size={11} className="text-emerald-400" />
                ) : stats.completed > 0 ? (
                  <span className="text-[9px] font-mono text-primary">{stats.completed}/{stats.total}</span>
                ) : null}
              </a>
            );
          })}
        </div>
      </div>

      {/* ─── Week Cards List ─── */}
      <div className="space-y-8">
        {filteredWeeks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Compass size={32} className="mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No matches found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try searching with different terms like "RAG", "Embeddings", "LangGraph", or "MCP".
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredWeeks.map((week) => {
            const isCollapsed = collapsedWeeks[week.id];
            const stats = getWeekStats(week.id);

            return (
              <article
                key={week.id}
                id={week.id}
                className="scroll-mt-36 group relative rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-xl transition-all duration-300 hover:border-primary/40"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-border/60">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-extrabold tracking-widest uppercase text-emerald-400 font-mono">
                        {week.badge}
                      </span>
                      <span className="text-border">·</span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {stats.completed}/{stats.total} done
                      </span>
                    </div>

                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                      <span>{week.title}</span>
                    </h2>

                    <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                      {week.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-xs font-semibold">
                      <Trophy size={13} className="text-emerald-400" />
                      {week.deliverable}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleCollapse(week.id)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
                    >
                      <span>{isCollapsed ? "Expand Week" : "Collapse"}</span>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {/* Outcome Mission Banner */}
                <div className="my-5 rounded-xl border-l-4 border-emerald-400 bg-emerald-950/20 dark:bg-emerald-950/30 p-3.5 text-sm text-emerald-100 flex items-start gap-2.5">
                  <span className="font-bold text-emerald-400 font-mono text-xs shrink-0 mt-0.5">MISSION:</span>
                  <span className="leading-snug">{week.mission}</span>
                </div>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {/* Grid: Topics & Build Tasks (Left) vs Resources & Papers (Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
                        {/* ─── Left Column: Checklists (7 cols) ─── */}
                        <div className="lg:col-span-7 space-y-6">
                          {/* Topics to Learn */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-foreground flex items-center gap-2">
                                <BookOpen size={14} className="text-primary" />
                                Topics to Learn
                              </h3>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {week.topics.length} core concepts
                              </span>
                            </div>

                            <ul className="space-y-2">
                              {week.topics.map((topic, i) => {
                                // Find item key in global list
                                const itemObj = allItemKeys.find(
                                  (it) => it.weekId === week.id && it.text === topic
                                );
                                const key = itemObj ? itemObj.key : `topic-${week.id}-${i}`;
                                const checked = !!completedItems[key];

                                return (
                                  <li
                                    key={key}
                                    className={`group/li flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                                      checked
                                        ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground line-through decoration-emerald-500/50"
                                        : "border-border/70 bg-background/60 hover:border-primary/40 hover:bg-card text-foreground"
                                    }`}
                                    onClick={() => toggleCheck(key)}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {checked ? (
                                        <div className="h-4 w-4 rounded-md bg-emerald-500 flex items-center justify-center text-black">
                                          <Check size={11} strokeWidth={3} />
                                        </div>
                                      ) : (
                                        <div className="h-4 w-4 rounded-md border border-muted-foreground/40 group-hover/li:border-primary transition-colors" />
                                      )}
                                    </div>
                                    <span className="text-xs leading-relaxed">{topic}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>

                          {/* Build Tasks */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-foreground flex items-center gap-2">
                                <Terminal size={14} className="text-primary" />
                                Build Tasks & Implementation
                              </h3>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {week.buildTasks.length} deliverables
                              </span>
                            </div>

                            <ul className="space-y-2">
                              {week.buildTasks.map((task, i) => {
                                const itemObj = allItemKeys.find(
                                  (it) => it.weekId === week.id && it.text === task
                                );
                                const key = itemObj ? itemObj.key : `build-${week.id}-${i}`;
                                const checked = !!completedItems[key];

                                return (
                                  <li
                                    key={key}
                                    className={`group/li flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                                      checked
                                        ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground line-through decoration-emerald-500/50"
                                        : "border-border/70 bg-background/60 hover:border-primary/40 hover:bg-card text-foreground"
                                    }`}
                                    onClick={() => toggleCheck(key)}
                                  >
                                    <div className="mt-0.5 shrink-0">
                                      {checked ? (
                                        <div className="h-4 w-4 rounded-md bg-emerald-500 flex items-center justify-center text-black">
                                          <Check size={11} strokeWidth={3} />
                                        </div>
                                      ) : (
                                        <div className="h-4 w-4 rounded-md border border-muted-foreground/40 group-hover/li:border-primary transition-colors" />
                                      )}
                                    </div>
                                    <span className="text-xs font-mono leading-relaxed">{task}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>

                        {/* ─── Right Column: Resources & Papers (5 cols) ─── */}
                        <div className="lg:col-span-5 space-y-6">
                          {/* Watch / Read / Use */}
                          <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-foreground flex items-center gap-2 mb-3">
                              <Bookmark size={14} className="text-primary" />
                              Watch / Read / Use
                            </h3>

                            <div className="space-y-2.5">
                              {week.resources.map((res, i) => (
                                <div
                                  key={i}
                                  className={`rounded-xl border p-3.5 transition-all duration-200 ${
                                    res.isCampusX
                                      ? "border-emerald-500/40 bg-emerald-950/20"
                                      : res.isPaper
                                      ? "border-indigo-500/30 bg-indigo-950/15"
                                      : "border-border/70 bg-background/80 hover:border-primary/40 hover:bg-card"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                                      res.isCampusX ? "text-emerald-400" : res.isPaper ? "text-indigo-400" : "text-primary"
                                    }`}>
                                      {res.kind}
                                    </span>
                                    <a
                                      href={res.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Open link in new tab"
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>

                                  <h4 className="mt-1 text-xs font-semibold text-foreground hover:text-primary transition-colors">
                                    <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                                      <span>{res.title}</span>
                                      <ArrowUpRight size={11} className="shrink-0 text-muted-foreground" />
                                    </a>
                                  </h4>

                                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                    {res.desc}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Research Papers */}
                          {week.papers && week.papers.length > 0 && (
                            <div>
                              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-foreground flex items-center gap-2 mb-3">
                                <Cpu size={14} className="text-primary" />
                                Research Paper(s)
                              </h3>

                              <div className="space-y-2">
                                {week.papers.map((p) => (
                                  <a
                                    key={p.number}
                                    href={p.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group/paper block rounded-xl border border-border/80 bg-background/90 hover:border-primary/50 hover:bg-card p-3 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs font-semibold text-foreground group-hover/paper:text-primary transition-colors flex items-center gap-1.5">
                                        <span className="font-mono text-primary font-bold">{p.number}.</span>
                                        <span>{p.title}</span>
                                      </div>
                                      <ArrowUpRight size={12} className="text-muted-foreground group-hover/paper:text-primary group-hover/paper:translate-x-0.5 group-hover/paper:-translate-y-0.5 transition-transform" />
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                                      {p.notes}
                                    </p>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Definition of Done Box */}
                      <div className="mt-8 rounded-2xl border border-border/80 bg-background/70 p-4 md:p-5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle2 size={15} className="text-emerald-400" />
                          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                            Definition of Done
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                          {week.definitionOfDone}
                        </p>
                      </div>

                      {/* Day Plan Strip */}
                      <div className="mt-5">
                        <div className="flex items-center gap-2 mb-2.5">
                          <Calendar size={13} className="text-primary" />
                          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                            7-Day Implementation Schedule
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                          {week.dayPlan.map((d, i) => (
                            <div
                              key={i}
                              className="rounded-xl border border-border/60 bg-background/60 p-2.5 hover:border-primary/30 transition-colors"
                            >
                              <div className="text-[10px] font-mono font-bold text-primary">
                                {d.day}
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                {d.task}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })
        )}
      </div>

      {/* ─── Footer completion callout ─── */}
      <div className="mt-12 rounded-3xl border border-border bg-gradient-to-r from-card via-card/70 to-background p-8 text-center shadow-lg">
        <Trophy size={36} className="mx-auto text-primary mb-3" />
        <h3 className="text-xl font-bold text-foreground">Complete the 8-Week Capstone</h3>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-1">
          By following each week systematically and building each deliverable, you establish production-tested mastery over the entire modern GenAI and Agentic AI landscape.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/genai-roadmap.html"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <span>Download / Print Clean Roadmap</span>
            <ArrowUpRight size={13} />
          </a>
          <a
            href="/resources"
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors"
          >
            Explore AI Club Resources
          </a>
        </div>
      </div>
    </div>
  );
}
