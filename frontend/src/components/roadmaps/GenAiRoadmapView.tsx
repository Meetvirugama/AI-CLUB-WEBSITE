import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Search,
  RotateCcw,
  Printer,
  Sparkles,
  Trophy,
  Layers,
  ArrowUpRight,
  ChevronRight,
  ChevronDown,
  Cpu,
  Calendar,
  Check,
  Terminal,
  Bookmark,
  Code2,
  FileText,
  Clock,
  Compass,
  Zap,
  ShieldCheck,
  FolderGit2,
  GraduationCap,
  SlidersHorizontal,
  LayoutGrid,
  ListTodo,
  Library,
  Copy,
  CheckSquare,
} from "lucide-react";
import {
  GENAI_ROADMAP_META,
  GENAI_ROADMAP_STAGES,
  GENAI_ROADMAP_WEEKS,
  GenAiWeek,
  RoadmapPaper,
} from "@/data/genaiRoadmapData";
import { toast } from "sonner";

type ViewTab = "weekly" | "deliverables" | "papers" | "schedules";

export default function GenAiRoadmapView() {
  const [activeTab, setActiveTab] = useState<ViewTab>("weekly");
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [paperFilter, setPaperFilter] = useState<string>("ALL");
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  // Generate unique keys for all topics and build tasks across weeks
  const allItemKeys = useMemo(() => {
    const keys: { key: string; weekNum: number; type: "topic" | "build"; text: string }[] = [];
    GENAI_ROADMAP_WEEKS.forEach((w) => {
      w.topics.forEach((t, i) => {
        keys.push({ key: `w${w.weekNumber}-topic-${i}`, weekNum: w.weekNumber, type: "topic", text: t });
      });
      w.buildTasks.forEach((b, i) => {
        keys.push({ key: `w${w.weekNumber}-build-${i}`, weekNum: w.weekNumber, type: "build", text: b });
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

  const resetAllProgress = () => {
    if (window.confirm("Reset all checkmarks for this curriculum?")) {
      allItemKeys.forEach((item) => {
        localStorage.removeItem(item.key);
      });
      setCompletedItems({});
      toast.success("Progress reset successfully");
    }
  };

  // Currently focused week
  const activeWeek = useMemo(() => {
    return GENAI_ROADMAP_WEEKS.find((w) => w.weekNumber === selectedWeekNum) || GENAI_ROADMAP_WEEKS[0];
  }, [selectedWeekNum]);

  // Keys for the current week's topics and build tasks
  const activeWeekItemKeys = useMemo(() => {
    return allItemKeys.filter((i) => i.weekNum === activeWeek.weekNumber).map((i) => i.key);
  }, [allItemKeys, activeWeek.weekNumber]);

  const isWeekFullyCompleted =
    activeWeekItemKeys.length > 0 && activeWeekItemKeys.every((k) => completedItems[k]);

  const toggleAllInWeek = () => {
    const targetVal = !isWeekFullyCompleted;
    setCompletedItems((prev) => {
      const next = { ...prev };
      activeWeekItemKeys.forEach((k) => {
        if (targetVal) {
          next[k] = true;
          localStorage.setItem(k, "1");
        } else {
          delete next[k];
          localStorage.removeItem(k);
        }
      });
      return next;
    });
    toast.success(
      targetVal
        ? `Week 0${activeWeek.weekNumber} marked as completed!`
        : `Week 0${activeWeek.weekNumber} checklist reset`
    );
  };

  const copyWeekPlan = async () => {
    const md = [
      `# AI Club DAU - GenAI Roadmap: Week 0${activeWeek.weekNumber} (${activeWeek.title})`,
      `> Stage: ${activeWeek.stageName} | Effort: ${activeWeek.estHours} | Level: ${activeWeek.difficulty}`,
      ``,
      `### Mission & Intent`,
      activeWeek.mission,
      ``,
      `### Capstone Deliverable: ${activeWeek.deliverableName}`,
      `Done Criteria: ${activeWeek.definitionOfDone}`,
      ``,
      `### Theory Topics to Master:`,
      ...activeWeek.topics.map((t) => `- [ ] ${t}`),
      ``,
      `### Hands-on Build Tasks:`,
      ...activeWeek.buildTasks.map((b) => `- [ ] ${b}`),
      ``,
      `### Curated Resources:`,
      ...activeWeek.resources.map((r) => `- [${r.title}](${r.url}) (${r.kind}): ${r.desc}`),
      ``,
      `### Seminal Research Papers:`,
      ...activeWeek.papers.map((p) => `- Paper #${p.number}: [${p.title}](${p.url}) (${p.venue || "arXiv"}): ${p.notes}`),
      ``,
      `Curriculum: https://aiclub.dau.ac.in/roadmaps/genai`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(md);
      toast.success(`Copied Week 0${activeWeek.weekNumber} syllabus to clipboard!`);
    } catch {
      toast.error("Failed to copy syllabus");
    }
  };

  // Per-week completion calculation
  const getWeekProgress = (weekNum: number) => {
    const weekItems = allItemKeys.filter((i) => i.weekNum === weekNum);
    const completed = weekItems.filter((i) => completedItems[i.key]).length;
    return {
      completed,
      total: weekItems.length,
      pct: weekItems.length ? Math.round((completed / weekItems.length) * 100) : 0,
    };
  };

  // Filtered weeks based on search & difficulty
  const filteredWeeks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GENAI_ROADMAP_WEEKS.filter((w) => {
      const matchesDiff = filterDifficulty === "ALL" || w.difficulty.toUpperCase() === filterDifficulty.toUpperCase();
      if (!matchesDiff) return false;
      if (!q) return true;

      const inTitle = w.title.toLowerCase().includes(q);
      const inBadge = w.badge.toLowerCase().includes(q);
      const inDesc = w.description.toLowerCase().includes(q);
      const inDeliv = w.deliverable.toLowerCase().includes(q) || w.deliverableName.toLowerCase().includes(q);
      const inTopics = w.topics.some((t) => t.toLowerCase().includes(q));
      const inBuild = w.buildTasks.some((b) => b.toLowerCase().includes(q));
      const inStack = w.techStack.some((s) => s.toLowerCase().includes(q));
      const inRes = w.resources.some((r) => r.title.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
      const inPapers = w.papers.some((p) => p.title.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q));

      return inTitle || inBadge || inDesc || inDeliv || inTopics || inBuild || inStack || inRes || inPapers;
    });
  }, [searchQuery, filterDifficulty]);

  // All 18 research papers aggregated
  const allPapers = useMemo(() => {
    const map = new Map<number, RoadmapPaper & { weekNum: number; weekTitle: string }>();
    GENAI_ROADMAP_WEEKS.forEach((w) => {
      w.papers.forEach((p) => {
        if (!map.has(p.number)) {
          map.set(p.number, { ...p, weekNum: w.weekNumber, weekTitle: w.title });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.number - b.number);
  }, []);

  const paperCategories = useMemo(() => {
    const cats = new Set<string>();
    allPapers.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ["ALL", ...Array.from(cats)];
  }, [allPapers]);

  const filteredPapers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allPapers.filter((p) => {
      const matchesCat = paperFilter === "ALL" || p.category === paperFilter;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.venue && p.venue.toLowerCase().includes(q))
      );
    });
  }, [allPapers, paperFilter, searchQuery]);

  return (
    <div className="w-full text-foreground font-sans">
      {/* ─── Hero Header ─── */}
      <section className="relative overflow-hidden rounded-[28px] border border-rd-line bg-rd-card p-6 md:p-10 shadow-xl transition-all mb-8">
        <div
          aria-hidden
          className="absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--rd-cyan)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--rd-magenta)" }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rd-line bg-rd-bg-2 rd-mono text-[10.5px] text-rd-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>OFFICIAL 2026 ACADEMIC CURRICULUM</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyWeekPlan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rd-line bg-rd-card hover:bg-rd-bg-2 text-xs font-semibold text-rd-muted hover:text-rd-fg transition-colors"
                title="Copy current week's study plan as markdown"
              >
                <Copy size={13} className="text-primary" />
                <span>Copy Syllabus</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rd-line bg-rd-card hover:bg-rd-bg-2 text-xs font-semibold text-rd-muted hover:text-rd-fg transition-colors"
                title="Print curriculum or export to PDF"
              >
                <Printer size={13} className="text-primary" />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          <h1 className="rd-display text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-rd-fg">
            GenAI + Agentic AI: <span className="rd-spectrum-text">8-Week Roadmap</span>
          </h1>

          <p className="mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-rd-muted">
            {GENAI_ROADMAP_META.description}
          </p>

          {/* Core Metrics & Live Progress Strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-rd-line pt-6">
            <div className="p-3.5 rounded-2xl border border-rd-line bg-rd-bg-2/60">
              <span className="rd-mono text-[10px] text-rd-faint">STRUCTURE</span>
              <div className="mt-1 text-base font-semibold text-rd-fg">8 Weeks Intensive</div>
              <div className="text-[11px] text-rd-muted">4 Progressive Stages</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-rd-line bg-rd-bg-2/60">
              <span className="rd-mono text-[10px] text-rd-faint">DELIVERABLES</span>
              <div className="mt-1 text-base font-semibold text-rd-fg">8 Production Projects</div>
              <div className="text-[11px] text-rd-muted">Code-first verification</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-rd-line bg-rd-bg-2/60">
              <span className="rd-mono text-[10px] text-rd-faint">LITERATURE</span>
              <div className="mt-1 text-base font-semibold text-rd-fg">18 Seminal Papers</div>
              <div className="text-[11px] text-rd-muted">NeurIPS, ICLR, ACL, TACL</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-rd-line bg-rd-bg-2/60">
              <div className="flex items-center justify-between">
                <span className="rd-mono text-[10px] text-rd-faint">CURRICULUM PROGRESS</span>
                <span className="rd-mono text-xs font-semibold text-primary">{progressPct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-rd-line">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] rd-mono text-rd-muted text-right">
                {completedCount} / {totalTasks} items completed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4-Stage Architecture Strip (Mental Model) ─── */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="rd-mono text-[11px] text-rd-muted flex items-center gap-1.5">
            <Compass size={13} className="text-primary" />
            <span>PROGRESSION MAP · 4 MASTERY STAGES</span>
          </span>
          <span className="text-xs text-rd-faint">Weeks 1 through 8</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {GENAI_ROADMAP_STAGES.map((stage) => {
            const isStageActive = stage.weeks.includes(selectedWeekNum);
            return (
              <div
                key={stage.number}
                className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                  isStageActive
                    ? "border-rd-fg/30 bg-rd-card shadow-lg ring-1 ring-primary/20"
                    : "border-rd-line bg-rd-bg-2/50 hover:border-rd-line/80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="rd-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                  >
                    STAGE 0{stage.number}
                  </span>
                  <span className="rd-mono text-[10px] text-rd-faint">{stage.subtitle}</span>
                </div>

                <h3 className="text-sm font-semibold text-rd-fg">{stage.title}</h3>
                <p className="mt-1 text-xs text-rd-muted leading-relaxed line-clamp-2">
                  {stage.description}
                </p>

                <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-rd-line/60">
                  {stage.weeks.map((wNum) => {
                    const st = getWeekProgress(wNum);
                    const isSelected = selectedWeekNum === wNum;
                    return (
                      <button
                        key={wNum}
                        type="button"
                        onClick={() => {
                          setSelectedWeekNum(wNum);
                          setActiveTab("weekly");
                        }}
                        style={
                          isSelected
                            ? { backgroundColor: stage.color, color: "#ffffff", borderColor: stage.color }
                            : undefined
                        }
                        className={`flex-1 flex items-center justify-between px-2 py-1 rounded-lg text-[10px] rd-mono font-medium transition-all ${
                          isSelected
                            ? "shadow-sm font-semibold"
                            : "bg-rd-card hover:bg-rd-line/50 text-rd-muted hover:text-rd-fg border border-rd-line"
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: isSelected ? "#ffffff" : stage.color }}
                          />
                          <span>W{wNum}</span>
                        </span>
                        {st.pct === 100 ? (
                          <CheckCircle2 size={10} className={isSelected ? "text-white" : "text-emerald-400"} />
                        ) : st.completed > 0 ? (
                          <span className={`text-[9px] ${isSelected ? "text-white/90" : "opacity-80"}`}>
                            {st.pct}%
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Navigation Tabs & Controls ─── */}
      <div className="sticky top-20 z-30 mb-8 rounded-2xl border border-rd-line bg-rd-card/95 p-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main View Mode Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-rd-bg-2 border border-rd-line overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("weekly")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "weekly"
                  ? "bg-rd-card text-rd-fg shadow-sm border border-rd-line"
                  : "text-rd-muted hover:text-rd-fg"
              }`}
            >
              <LayoutGrid size={13} className="text-primary" />
              <span>Weekly Focus</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("deliverables")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "deliverables"
                  ? "bg-rd-card text-rd-fg shadow-sm border border-rd-line"
                  : "text-rd-muted hover:text-rd-fg"
              }`}
            >
              <FolderGit2 size={13} className="text-primary" />
              <span>8 Capstone Projects</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("papers")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "papers"
                  ? "bg-rd-card text-rd-fg shadow-sm border border-rd-line"
                  : "text-rd-muted hover:text-rd-fg"
              }`}
            >
              <GraduationCap size={13} className="text-primary" />
              <span>18 Seminal Papers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("schedules")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === "schedules"
                  ? "bg-rd-card text-rd-fg shadow-sm border border-rd-line"
                  : "text-rd-muted hover:text-rd-fg"
              }`}
            >
              <Calendar size={13} className="text-primary" />
              <span>7-Day Sprints</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rd-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, papers, MCP, tools..."
                className="w-full rounded-xl border border-rd-line bg-rd-bg-2 py-1.5 pl-8 pr-8 text-xs text-rd-fg placeholder:text-rd-faint focus:border-primary focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-rd-faint hover:text-rd-fg font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {completedCount > 0 && (
              <button
                type="button"
                onClick={resetAllProgress}
                className="p-1.5 rounded-xl border border-rd-line bg-rd-bg-2 text-rd-faint hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                title="Reset all checkmarks"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Week Selector Pills (Shown when in Weekly Focus tab) */}
        {activeTab === "weekly" && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-rd-line/50">
            <span className="shrink-0 rd-mono text-[9.5px] text-rd-faint mr-1">WEEK:</span>
            {GENAI_ROADMAP_WEEKS.map((w) => {
              const st = getWeekProgress(w.weekNumber);
              const isSelected = selectedWeekNum === w.weekNumber;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWeekNum(w.weekNumber)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? "border-rd-fg/30 bg-rd-fg text-rd-card font-semibold shadow-sm"
                      : "border-rd-line bg-rd-bg-2 hover:border-rd-fg/20 text-rd-muted hover:text-rd-fg"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: w.accentColor }}
                  />
                  <span className="rd-mono font-bold text-[10.5px]">W0{w.weekNumber}</span>
                  <span className="hidden sm:inline font-medium text-xs truncate max-w-[140px]">{w.title}</span>
                  {st.pct === 100 ? (
                    <CheckCircle2 size={12} className={isSelected ? "text-emerald-300" : "text-emerald-400"} />
                  ) : st.completed > 0 ? (
                    <span className={`text-[9px] rd-mono ${isSelected ? "text-rd-card/70" : "text-primary"}`}>
                      {st.completed}/{st.total}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── TAB 1: WEEKLY FOCUS VIEW (Primary deep dive) ─── */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          <article className="rounded-[28px] border border-rd-line bg-rd-card p-6 md:p-8 shadow-xl">
            {/* Week Headline & Mission Banner */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-rd-line">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rd-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${activeWeek.accentColor}18`, color: activeWeek.accentColor }}
                  >
                    {activeWeek.badge}
                  </span>
                  <span className="text-rd-line">/</span>
                  <span className="rd-mono text-[10px] text-rd-faint">{activeWeek.stageName}</span>
                  <span className="text-rd-line">/</span>
                  <span className="inline-flex items-center gap-1 text-[10px] rd-mono text-rd-muted">
                    <Clock size={11} /> {activeWeek.estHours}
                  </span>
                </div>

                <h2 className="rd-display text-2xl sm:text-3xl font-medium text-rd-fg">
                  {activeWeek.title}
                </h2>

                <p className="text-sm text-rd-muted max-w-2xl leading-relaxed">
                  {activeWeek.description}
                </p>
              </div>

              {/* Deliverable Badge & Tech Stack */}
              <div className="flex flex-col md:items-end gap-2.5 shrink-0">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                  <Trophy size={14} className="text-emerald-400" />
                  <span>{activeWeek.deliverable}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 md:justify-end">
                  {activeWeek.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-2 py-0.5 rounded-lg border border-rd-line bg-rd-bg-2 rd-mono text-[9.5px] text-rd-muted"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mission Objective Callout */}
            <div className="my-6 rounded-2xl border border-rd-line bg-rd-bg-2/70 p-4 sm:p-5 flex items-start gap-3.5">
              <div className="mt-0.5 p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <span className="rd-mono text-[10px] font-bold text-primary tracking-wider uppercase">
                  WEEKLY MISSION & INTENT
                </span>
                <p className="mt-1 text-xs sm:text-sm text-rd-fg leading-relaxed">
                  {activeWeek.mission}
                </p>
              </div>
            </div>

            {/* 2-Column Work Surface: Checklists (Left) vs Resources & Papers (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* ── Left Column: Interactive Checklists (7 cols) ── */}
              <div className="lg:col-span-7 space-y-7">
                {/* Topics to Learn Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold rd-mono tracking-wider text-rd-fg flex items-center gap-2">
                      <BookOpen size={13} className="text-primary" />
                      <span>THEORY & TOPICS TO MASTER</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleAllInWeek}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rd-line bg-rd-bg-2 hover:bg-rd-card text-[10px] rd-mono text-rd-muted hover:text-rd-fg transition-colors"
                        title={isWeekFullyCompleted ? "Reset checkmarks for this week" : "Mark all topics & tasks done for this week"}
                      >
                        <CheckSquare size={11} className={isWeekFullyCompleted ? "text-emerald-400" : "text-primary"} />
                        <span>{isWeekFullyCompleted ? "Reset Week" : "Mark Week Done"}</span>
                      </button>
                      <span className="text-[10px] rd-mono text-rd-faint">
                        {activeWeek.topics.length} CONCEPTS
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeWeek.topics.map((topic, i) => {
                      const itemKey = `w${activeWeek.weekNumber}-topic-${i}`;
                      const checked = !!completedItems[itemKey];

                      return (
                        <div
                          key={itemKey}
                          onClick={() => toggleCheck(itemKey)}
                          className={`group flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            checked
                              ? "border-emerald-500/25 bg-emerald-500/5 text-rd-muted line-through decoration-emerald-500/40"
                              : "border-rd-line bg-rd-bg-2/50 hover:border-rd-fg/30 hover:bg-rd-card text-rd-fg"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {checked ? (
                              <div className="h-4 w-4 rounded-md bg-emerald-400 text-black flex items-center justify-center font-bold">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded-md border border-rd-line group-hover:border-primary transition-colors" />
                            )}
                          </div>
                          <span className="text-xs leading-relaxed">{topic}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Build Tasks Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold rd-mono tracking-wider text-rd-fg flex items-center gap-2">
                      <Terminal size={13} className="text-primary" />
                      <span>HANDS-ON BUILD TASKS</span>
                    </h3>
                    <span className="text-[10px] rd-mono text-rd-faint">
                      {activeWeek.buildTasks.length} MILESTONES
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeWeek.buildTasks.map((task, i) => {
                      const itemKey = `w${activeWeek.weekNumber}-build-${i}`;
                      const checked = !!completedItems[itemKey];

                      return (
                        <div
                          key={itemKey}
                          onClick={() => toggleCheck(itemKey)}
                          className={`group flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            checked
                              ? "border-emerald-500/25 bg-emerald-500/5 text-rd-muted line-through decoration-emerald-500/40"
                              : "border-rd-line bg-rd-bg-2/50 hover:border-rd-fg/30 hover:bg-rd-card text-rd-fg"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {checked ? (
                              <div className="h-4 w-4 rounded-md bg-emerald-400 text-black flex items-center justify-center font-bold">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="h-4 w-4 rounded-md border border-rd-line group-hover:border-primary transition-colors" />
                            )}
                          </div>
                          <span className="text-xs leading-relaxed font-mono">{task}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Definition of Done Quality Box */}
                <div className="rounded-2xl border border-rd-line bg-rd-bg-2/60 p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck size={15} className="text-emerald-400" />
                    <h4 className="text-xs font-bold rd-mono text-rd-fg uppercase tracking-wider">
                      DEFINITION OF DONE & ACCEPTANCE CRITERIA
                    </h4>
                  </div>
                  <p className="text-xs text-rd-muted leading-relaxed pl-6">
                    {activeWeek.definitionOfDone}
                  </p>
                </div>
              </div>

              {/* ── Right Column: Resources & Academic Papers (5 cols) ── */}
              <div className="lg:col-span-5 space-y-7">
                {/* Watch / Read / Learn Hub */}
                <div>
                  <h3 className="text-xs font-bold rd-mono tracking-wider text-rd-fg flex items-center gap-2 mb-3">
                    <Bookmark size={13} className="text-primary" />
                    <span>CURATED STUDY RESOURCES</span>
                  </h3>

                  <div className="space-y-2.5">
                    {activeWeek.resources.map((res, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-rd-line bg-rd-bg-2/60 p-3.5 hover:border-rd-fg/30 hover:bg-rd-card transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rd-mono text-[9.5px] font-bold text-primary">
                            {res.kind}
                          </span>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rd-faint hover:text-primary transition-colors"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>

                        <h4 className="mt-1 text-xs font-semibold text-rd-fg hover:text-primary transition-colors">
                          <a href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
                            <span>{res.title}</span>
                            <ArrowUpRight size={11} className="shrink-0 text-rd-faint" />
                          </a>
                        </h4>

                        <p className="mt-1 text-[11px] text-rd-muted leading-relaxed">
                          {res.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seminal Papers for this week */}
                {activeWeek.papers && activeWeek.papers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold rd-mono tracking-wider text-rd-fg flex items-center gap-2 mb-3">
                      <GraduationCap size={13} className="text-primary" />
                      <span>SEMINAL RESEARCH PAPERS</span>
                    </h3>

                    <div className="space-y-2">
                      {activeWeek.papers.map((p) => (
                        <a
                          key={p.number}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group block rounded-2xl border border-rd-line bg-rd-bg-2/60 hover:border-primary/50 hover:bg-rd-card p-3.5 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rd-mono font-bold text-xs text-primary">
                                #{p.number}
                              </span>
                              <span className="text-xs font-semibold text-rd-fg group-hover:text-primary transition-colors">
                                {p.title}
                              </span>
                            </div>
                            <ArrowUpRight size={12} className="text-rd-faint group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                          </div>

                          <div className="mt-1.5 flex items-center gap-2">
                            {p.venue && (
                              <span className="px-2 py-0.5 rounded-full border border-rd-line bg-rd-card rd-mono text-[9px] text-rd-muted">
                                {p.venue}
                              </span>
                            )}
                            <span className="text-[11px] text-rd-muted">
                              {p.notes}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7-Day Sprint Plan Strip */}
            <div className="mt-8 pt-6 border-t border-rd-line">
              <div className="flex items-center justify-between mb-3">
                <span className="rd-mono text-[10.5px] text-rd-muted flex items-center gap-1.5">
                  <Calendar size={13} className="text-primary" />
                  <span>7-DAY RECOMMENDED EXECUTION PACING</span>
                </span>
                <span className="text-[11px] text-rd-faint">Sprint breakdown</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {activeWeek.dayPlan.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-rd-line bg-rd-bg-2/50 hover:bg-rd-card hover:border-rd-fg/20 transition-colors"
                  >
                    <div className="rd-mono text-[10px] font-bold text-primary">{d.day}</div>
                    <div className="text-[11px] text-rd-fg mt-1 leading-snug">{d.task}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next / Previous Week Quick Switcher */}
            <div className="mt-8 pt-5 border-t border-rd-line flex items-center justify-between">
              {activeWeek.weekNumber > 1 ? (
                <button
                  type="button"
                  onClick={() => setSelectedWeekNum(activeWeek.weekNumber - 1)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-rd-muted hover:text-rd-fg transition-colors"
                >
                  ← Week 0{activeWeek.weekNumber - 1}: {GENAI_ROADMAP_WEEKS[activeWeek.weekNumber - 2]?.title}
                </button>
              ) : (
                <div />
              )}

              {activeWeek.weekNumber < 8 && (
                <button
                  type="button"
                  onClick={() => setSelectedWeekNum(activeWeek.weekNumber + 1)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline transition-colors"
                >
                  Week 0{activeWeek.weekNumber + 1}: {GENAI_ROADMAP_WEEKS[activeWeek.weekNumber]?.title} →
                </button>
              )}
            </div>
          </article>
        </div>
      )}

      {/* ─── TAB 2: DELIVERABLES SHOWCASE (8 Capstone Projects) ─── */}
      {activeTab === "deliverables" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-rd-line bg-rd-card mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-rd-fg">8 Capstone Projects to Build</h2>
              <p className="text-xs text-rd-muted">Every single week culminates in a concrete, runnable engineering artifact.</p>
            </div>
            <span className="rd-mono text-xs text-primary font-semibold">100% Code-First</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GENAI_ROADMAP_WEEKS.map((w) => {
              const st = getWeekProgress(w.weekNumber);
              return (
                <div
                  key={w.id}
                  className="rounded-2xl border border-rd-line bg-rd-card p-5 hover:border-rd-fg/30 transition-all flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="rd-mono text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${w.accentColor}18`, color: w.accentColor }}
                      >
                        WEEK 0{w.weekNumber}
                      </span>
                      <span className="rd-mono text-[10px] text-rd-faint">{w.difficulty}</span>
                    </div>

                    <h3 className="text-base font-semibold text-rd-fg">{w.deliverableName}</h3>
                    <p className="text-xs text-rd-muted mt-1 leading-relaxed">{w.description}</p>

                    <div className="my-3 p-3 rounded-xl bg-rd-bg-2 border border-rd-line text-xs text-rd-fg">
                      <span className="rd-mono text-[9.5px] text-primary font-bold block mb-0.5">DEFINITION OF DONE</span>
                      {w.definitionOfDone}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {w.techStack.map((tech) => (
                        <span key={tech} className="px-2 py-0.5 rounded-md bg-rd-bg-2 rd-mono text-[9px] text-rd-muted">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-rd-line flex items-center justify-between">
                    <span className="text-xs text-rd-muted font-mono">
                      {st.completed}/{st.total} tasks completed
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWeekNum(w.weekNumber);
                        setActiveTab("weekly");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Open Week 0{w.weekNumber}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: 18 SEMINAL PAPERS EXPLORER ─── */}
      {activeTab === "papers" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-rd-line bg-rd-card mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-rd-fg">18 Seminal GenAI & Agentic AI Papers</h2>
              <p className="text-xs text-rd-muted">Read the foundational literature from attention mechanisms to multi-agent swarms.</p>
            </div>

            {/* Filter by Category */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {paperCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPaperFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] rd-mono font-medium transition-colors ${
                    paperFilter === cat
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-rd-bg-2 text-rd-muted hover:text-rd-fg border border-rd-line"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPapers.map((paper) => (
              <a
                key={paper.number}
                href={paper.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-rd-line bg-rd-card p-4 hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rd-mono text-xs font-bold text-primary">
                      PAPER #{paper.number}
                    </span>
                    {paper.venue && (
                      <span className="px-2 py-0.5 rounded-full border border-rd-line bg-rd-bg-2 rd-mono text-[9px] text-rd-muted">
                        {paper.venue}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs font-semibold text-rd-fg group-hover:text-primary transition-colors flex items-start gap-1">
                    <span>{paper.title}</span>
                    <ArrowUpRight size={11} className="shrink-0 text-rd-faint group-hover:text-primary mt-0.5" />
                  </h3>

                  <p className="mt-2 text-[11px] text-rd-muted leading-relaxed">
                    {paper.notes}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-rd-line flex items-center justify-between text-[10px] rd-mono text-rd-faint">
                  <span>From Week 0{paper.weekNum}</span>
                  {paper.category && <span className="text-primary">{paper.category}</span>}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: 7-DAY SPRINTS COMPLETE TIMELINE ─── */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-rd-line bg-rd-card mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-rd-fg">Full 56-Day Implementation Schedule</h2>
              <p className="text-xs text-rd-muted">Daily structured micro-tasks from Day 1 to Day 56.</p>
            </div>
            <span className="rd-mono text-xs text-primary font-semibold">Day 1 → Day 56</span>
          </div>

          <div className="space-y-4">
            {GENAI_ROADMAP_WEEKS.map((w) => (
              <div key={w.id} className="rounded-2xl border border-rd-line bg-rd-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="rd-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${w.accentColor}18`, color: w.accentColor }}
                    >
                      WEEK 0{w.weekNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-rd-fg">{w.title}</h3>
                  </div>
                  <span className="rd-mono text-[10px] text-rd-faint">{w.deliverable}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {w.dayPlan.map((d, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl border border-rd-line bg-rd-bg-2/50 text-xs"
                    >
                      <div className="rd-mono text-[10px] font-bold text-primary">{d.day}</div>
                      <div className="text-[11px] text-rd-muted mt-0.5 leading-snug">{d.task}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom Capstone Callout ─── */}
      <div className="mt-12 rounded-[26px] border border-rd-line bg-rd-card p-8 text-center shadow-lg relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-15 blur-3xl"
          style={{ background: "var(--rd-green)" }}
        />
        <div className="relative z-10">
          <Trophy size={36} className="mx-auto text-primary mb-3" />
          <h3 className="rd-display text-2xl font-medium text-rd-fg">Ready to build production-grade AI?</h3>
          <p className="text-xs sm:text-sm text-rd-muted max-w-xl mx-auto mt-1 leading-relaxed">
            Follow each week's hands-on milestones, complete the 8 deliverables, and cite the 18 research papers to become an elite GenAI & Agentic AI builder.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedWeekNum(1);
                setActiveTab("weekly");
                window.scrollTo({ top: 300, behavior: "smooth" });
              }}
              className="px-5 py-2.5 rounded-xl bg-rd-fg text-rd-card font-semibold text-xs transition-opacity hover:opacity-90"
            >
              Start Week 01 Now
            </button>
            <a
              href="/resources"
              className="px-5 py-2.5 rounded-xl border border-rd-line bg-rd-bg-2 text-rd-fg text-xs font-semibold hover:bg-rd-line/40 transition-colors"
            >
              Browse AI Club Resources
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
