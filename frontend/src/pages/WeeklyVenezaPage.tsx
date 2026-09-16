import { useMemo, useState, useEffect } from "react";
import { 
  useWeeklyVenezaData, 
  useWeeklyVenezaProgress, 
  useToggleWeeklyProgress, 
  useResetWeeklyProgress,
  WeeklyVenezaWeek,
  WeeklyResource
} from "@/hooks/useWeeklyVeneza";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  RotateCcw,
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  Sparkles,
  Trophy,
  Clock,
  Zap,
  Check,
  Calendar,
  Layers,
  Code,
  Newspaper
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/club/Footer";

// Resource type details & colors
const TYPE_DETAILS: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  VIDEO: { icon: Video, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "Video" },
  COURSE: { icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Course" },
  BOOK: { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Book" },
  PAPER: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", label: "Paper" },
  ARTICLE: { icon: Newspaper, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", label: "Article" },
  CODE: { icon: Code, color: "text-cyan-500", bg: "bg-cyan-500/10", border: "border-cyan-500/20", label: "Code" },
  DEFAULT: { icon: Layers, color: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20", label: "Resource" }
};

// Continuous Ticking Clock Widget
function TickingClockDivider({ currentWeek }: { currentWeek?: WeeklyVenezaWeek }) {
  const [time, setTime] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentWeek?.target_date) {
      // Default countdown end of week (Sunday midnight)
      const target = new Date();
      target.setDate(target.getDate() + (7 - target.getDay()));
      target.setHours(23, 59, 59, 999);
      
      const updateCountdown = () => {
        const now = new Date();
        const diff = Math.max(0, target.getTime() - now.getTime());
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      };
      
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    } else {
      const target = new Date(currentWeek.target_date);
      const updateCountdown = () => {
        const now = new Date();
        const diff = Math.max(0, target.getTime() - now.getTime());
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [currentWeek]);

  return (
    <div className="my-12 relative">
      {/* Visual glowing divider line */}
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-indigo-200/60 dark:border-indigo-900/60" />
      </div>

      <div className="relative flex justify-center">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-indigo-500/30 max-w-2xl w-full relative overflow-hidden backdrop-blur-xl"
        >
          {/* Ambient neon gradient glow background */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Live Clock Section */}
            <div className="flex items-center space-x-4">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <Clock className="w-6 h-6 animate-pulse text-indigo-400" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/60">
                    Live System Ticker
                  </span>
                </div>
                <div className="text-2xl font-black font-mono tracking-wider text-slate-100 mt-1">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Current Week Deadline Countdown */}
            <div className="flex flex-col items-center md:items-end">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 mb-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>{currentWeek ? `Week ${currentWeek.week_number} Target Remaining` : "Current Week Countdown"}</span>
              </div>
              <div className="flex items-center space-x-2 font-mono">
                <div className="flex flex-col items-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-base font-black text-white">{String(timeLeft.days).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Days</span>
                </div>
                <span className="text-slate-500 font-bold">:</span>
                <div className="flex flex-col items-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-base font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Hours</span>
                </div>
                <span className="text-slate-500 font-bold">:</span>
                <div className="flex flex-col items-center bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-base font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">Mins</span>
                </div>
                <span className="text-slate-500 font-bold">:</span>
                <div className="flex flex-col items-center bg-indigo-600/30 px-3 py-1.5 rounded-xl border border-indigo-500/50">
                  <span className="text-base font-black text-indigo-300 animate-pulse">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold text-indigo-400">Secs</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Divider label */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
              ⚡ Completed resources automatically record to your profile metrics
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function WeeklyVenezaPage() {
  const { data: weeks = [], isLoading: loadingWeeks } = useWeeklyVenezaData();
  const token = localStorage.getItem("access_token");
  const { data: remoteProgress = [], isLoading: loadingProgress } = useWeeklyVenezaProgress(token);
  const toggleProgressMutation = useToggleWeeklyProgress();
  const resetProgressMutation = useResetWeeklyProgress();
  const { toast } = useToast();

  // Local storage state for guest user support
  const [localProgress, setLocalProgress] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("weekly_veneza_local_progress");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Effective progress: remote if authenticated, local if guest
  const progress = useMemo(() => {
    return token ? remoteProgress : localProgress;
  }, [token, remoteProgress, localProgress]);

  const [openWeeks, setOpenWeeks] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Flatten all resources across all weeks
  const allResources = useMemo(() => {
    const list: WeeklyResource[] = [];
    weeks.forEach(w => {
      if (w.resources) {
        list.push(...w.resources);
      }
    });
    return list;
  }, [weeks]);

  // Identify current week
  const currentWeek = useMemo(() => {
    return weeks.find(w => w.is_current) || weeks.find(w => w.status === "current") || weeks[0];
  }, [weeks]);

  // Separate weeks into Past, Current, and Upcoming
  const pastWeeks = useMemo(() => weeks.filter(w => !w.is_current && w.week_number < (currentWeek?.week_number || 999)), [weeks, currentWeek]);
  const activeCurrentWeek = useMemo(() => weeks.find(w => w.id === currentWeek?.id), [weeks, currentWeek]);
  const upcomingWeeks = useMemo(() => weeks.filter(w => !w.is_current && w.week_number > (currentWeek?.week_number || 0)), [weeks, currentWeek]);

  // Expand current week by default
  useEffect(() => {
    if (weeks.length > 0 && openWeeks.length === 0) {
      if (currentWeek) {
        setOpenWeeks([currentWeek.id]);
      } else {
        setOpenWeeks([weeks[0].id]);
      }
    }
  }, [weeks, currentWeek]);

  // Auto expand all when filtering or searching
  useEffect(() => {
    if (searchQuery || selectedType !== "ALL") {
      setOpenWeeks(weeks.map(w => w.id));
    }
  }, [searchQuery, selectedType, weeks]);

  // Progress metrics calculation
  const totalResourcesCount = allResources.length;
  const completedResourcesCount = progress.length;
  const progressPercentage = totalResourcesCount > 0 ? Math.round((completedResourcesCount / totalResourcesCount) * 100) : 0;

  const totalStudyMinutes = useMemo(() => {
    return progress.reduce((acc, resId) => {
      const res = allResources.find(r => r.id === resId);
      return acc + (res?.est_minutes || 45);
    }, 0);
  }, [progress, allResources]);

  const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;

  // Trigger celebration modal on 100% completion
  useEffect(() => {
    if (progressPercentage === 100 && totalResourcesCount > 0) {
      setCelebrate(true);
    } else {
      setCelebrate(false);
    }
  }, [progressPercentage, totalResourcesCount]);

  const toggleWeekExpand = (weekId: number) => {
    setOpenWeeks(prev => prev.includes(weekId) ? prev.filter(id => id !== weekId) : [...prev, weekId]);
  };

  const handleToggleResource = async (resourceId: number) => {
    if (token) {
      try {
        await toggleProgressMutation.mutateAsync({ resourceId, token });
        const isCompletedNow = !progress.includes(resourceId);
        toast({
          title: isCompletedNow ? "Resource Completed! 🎉" : "Resource Unchecked",
          description: isCompletedNow ? "Your weekly progress has been saved." : "Progress updated.",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update progress.",
          variant: "destructive"
        });
      }
    } else {
      // Guest mode - toggle local state
      const isCompleted = localProgress.includes(resourceId);
      const next = isCompleted 
        ? localProgress.filter(id => id !== resourceId)
        : [...localProgress, resourceId];
      setLocalProgress(next);
      localStorage.setItem("weekly_veneza_local_progress", JSON.stringify(next));
      toast({
        title: isCompleted ? "Resource Unchecked" : "Resource Completed! 🎉",
        description: isCompleted ? "Local progress updated." : "Great job! Sign in to sync across devices.",
      });
    }
  };

  const handleResetProgress = async () => {
    if (token) {
      try {
        await resetProgressMutation.mutateAsync(token);
        setShowResetConfirm(false);
        toast({
          title: "Progress Reset",
          description: "All your Weekly Veneza progress has been cleared.",
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to reset progress.",
          variant: "destructive"
        });
      }
    } else {
      setLocalProgress([]);
      localStorage.removeItem("weekly_veneza_local_progress");
      setShowResetConfirm(false);
      toast({
        title: "Progress Reset",
        description: "Local progress cleared successfully.",
      });
    }
  };

  // Helper to filter resources inside a week
  const filterWeekResources = (resourcesList: WeeklyResource[]) => {
    return resourcesList.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "ALL" || r.resource_type.toUpperCase() === selectedType.toUpperCase();
      return matchesSearch && matchesType;
    });
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50/50 overflow-hidden pb-20">
      
      {/* Celebration Modal */}
      <AnimatePresence>
        {celebrate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Veneza Champion!</h2>
              <p className="text-slate-600 mb-6 font-medium">
                Outstanding dedication! You have finished all weekly resources in Weekly Veneza with <span className="font-bold text-indigo-600">~{totalStudyHours} hours</span> of study time.
              </p>
              <button
                onClick={() => setCelebrate(false)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                Keep Up the Momentum!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        {/* Page Hero Header */}
        <div className="mb-10 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-4"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Weekly Veneza Learning Tracker</span>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-900">
            Weekly Veneza
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Curated weekly curriculum, hands-on resources, and live ticking progress tracking.
          </p>
        </div>

        {/* Sophisticated Progress Dashboard Card (Matches Attached Screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Main Progress Ring Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 flex items-center justify-between col-span-1 md:col-span-2">
            <div className="flex-1">
              <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">OVERALL COMPLETION</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1 mb-4">Your AI Journey</h3>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-3xl font-black text-slate-950">{completedResourcesCount}</span>
                  <span className="text-slate-400 font-medium"> / {totalResourcesCount} items</span>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                <div className="flex items-center text-slate-600 font-medium">
                  <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>~{totalStudyHours}h Study Time</span>
                </div>
              </div>
            </div>
            
            {/* SVG Circular Progress Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0 ml-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-slate-100 stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                />
                <circle
                  className="text-indigo-600 stroke-current"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black text-slate-900">{progressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Settings & Actions Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">SETTINGS & ACTIONS</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Manage Progress</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {token ? "Your progress is saved to your account." : "Working as guest. Sign in to sync across devices."}
              </p>
            </div>
            
            <div className="mt-6">
              {showResetConfirm ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetProgress}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={progress.length === 0}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:text-rose-600 hover:border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Progress</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Filter Chips & Live Search Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 hidden lg:inline flex-shrink-0">
              Type:
            </span>
            {["ALL", "VIDEO", "COURSE", "BOOK", "PAPER", "ARTICLE", "CODE"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex-shrink-0 ${
                  selectedType === type
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {type === "ALL" ? "All Resources" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search weekly resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loadingWeeks || loadingProgress ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <span className="text-sm font-semibold text-slate-500">Loading Weekly Veneza curriculum...</span>
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. THE SEXY TICKING CLOCK DIVIDER & CURRENT ACTIVE WEEK SECTION (FIRST / TOP) */}
            <TickingClockDivider currentWeek={activeCurrentWeek} />

            {activeCurrentWeek && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-2 px-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2"></span>
                    Current Active Week
                  </span>
                  <div className="flex-1 h-px bg-indigo-200"></div>
                </div>

                {(() => {
                  const filteredRes = filterWeekResources(activeCurrentWeek.resources || []);
                  const completedCount = (activeCurrentWeek.resources || []).filter(r => progress.includes(r.id)).length;
                  const totalCount = (activeCurrentWeek.resources || []).length;
                  const isWeekDone = completedCount === totalCount && totalCount > 0;
                  const isOpen = openWeeks.includes(activeCurrentWeek.id);

                  return (
                    <WeekCard 
                      week={activeCurrentWeek}
                      filteredRes={filteredRes}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      isWeekDone={isWeekDone}
                      isOpen={isOpen}
                      onToggle={() => toggleWeekExpand(activeCurrentWeek.id)}
                      progress={progress}
                      onResourceToggle={handleToggleResource}
                      isCurrentHighlight={true}
                    />
                  );
                })()}
              </div>
            )}

            {/* 2. PREVIOUS WEEKS SECTION (BELOW CURRENT WEEK) */}
            {pastWeeks.length > 0 && (
              <div className="space-y-4 pt-8">
                <div className="flex items-center space-x-3 mb-2 px-1">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Previous Weeks</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                {pastWeeks.map((week) => {
                  const filteredRes = filterWeekResources(week.resources || []);
                  if (filteredRes.length === 0 && (searchQuery || selectedType !== "ALL")) return null;

                  const completedCount = (week.resources || []).filter(r => progress.includes(r.id)).length;
                  const totalCount = (week.resources || []).length;
                  const isWeekDone = completedCount === totalCount && totalCount > 0;
                  const isOpen = openWeeks.includes(week.id);

                  return (
                    <WeekCard 
                      key={week.id}
                      week={week}
                      filteredRes={filteredRes}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      isWeekDone={isWeekDone}
                      isOpen={isOpen}
                      onToggle={() => toggleWeekExpand(week.id)}
                      progress={progress}
                      onResourceToggle={handleToggleResource}
                    />
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      <Footer short />
    </div>
  );
}

// Reusable Component for Week Card Accordion
function WeekCard({
  week,
  filteredRes,
  completedCount,
  totalCount,
  isWeekDone,
  isOpen,
  onToggle,
  progress,
  onResourceToggle,
  isCurrentHighlight = false
}: {
  week: WeeklyVenezaWeek;
  filteredRes: WeeklyResource[];
  completedCount: number;
  totalCount: number;
  isWeekDone: boolean;
  isOpen: boolean;
  onToggle: () => void;
  progress: number[];
  onResourceToggle: (id: number) => void;
  isCurrentHighlight?: boolean;
}) {
  const weekProgressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className={`bg-white rounded-3xl border transition-all overflow-hidden ${
      isCurrentHighlight
        ? "border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20"
        : "border-slate-200/80 shadow-sm hover:shadow-md"
    }`}>
      
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center space-x-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
            isWeekDone 
              ? "bg-emerald-500 text-white" 
              : isCurrentHighlight 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                : "bg-slate-100 text-slate-700"
          }`}>
            {isWeekDone ? <Check className="w-5 h-5 stroke-[3]" /> : `W${week.week_number}`}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{week.title}</h3>
              {isCurrentHighlight && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {completedCount} of {totalCount} completed
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isWeekDone ? "bg-emerald-500" : "bg-indigo-600"}`}
                style={{ width: `${weekProgressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-400 w-8 text-right">
              {weekProgressPercent}%
            </span>
          </div>

          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-slate-100 bg-slate-50/40 p-6 space-y-3">
              {week.description && (
                <p className="text-xs text-slate-500 mb-4 italic leading-relaxed">
                  {week.description}
                </p>
              )}

              {filteredRes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No resources match your filters for this week.</p>
              ) : (
                filteredRes.map((item) => {
                  const isCompleted = progress.includes(item.id);
                  const typeKey = item.resource_type.toUpperCase();
                  const detail = TYPE_DETAILS[typeKey] || TYPE_DETAILS.DEFAULT;
                  const IconComp = detail.icon;

                  return (
                    <div 
                      key={item.id}
                      className={`flex items-start sm:items-center justify-between p-4 bg-white rounded-2xl border transition-all ${
                        isCompleted 
                          ? "border-emerald-200 bg-emerald-50/20" 
                          : "border-slate-200/70 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <button
                          onClick={() => onResourceToggle(item.id)}
                          className="mt-0.5 sm:mt-0 focus:outline-none transition-transform active:scale-90"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-600 transition-colors" />
                          )}
                        </button>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`font-bold text-sm sm:text-base ${
                              isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}>
                              {item.title}
                            </h4>

                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${detail.color} ${detail.bg} ${detail.border}`}>
                              <IconComp className="w-3 h-3 mr-1" />
                              {detail.label}
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-4 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-200 flex-shrink-0"
                        title="Open Resource Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
