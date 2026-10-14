import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurriculumResources, useCurriculumProgress, useToggleProgress, useResetProgress } from "@/hooks/useCurriculum";
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
  Award,
  Clock,
  Sparkles,
  Trophy,
  Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "@/components/club/Footer";

// Map types to icons and estimated completion times
const TYPE_DETAILS: Record<string, { icon: any; color: string; label: string; estMinutes: number }> = {
  VIDEO: { icon: Video, color: "text-rose-400 bg-rose-500/10 border-rose-500/20", label: "Video", estMinutes: 45 },
  COURSE: { icon: GraduationCap, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Course", estMinutes: 480 },
  BOOK: { icon: BookOpen, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Book", estMinutes: 300 },
  PAPER: { icon: FileText, color: "text-blue-400 bg-blue-500/10 border-blue-500/20", label: "Paper", estMinutes: 120 },
  DEFAULT: { icon: BookOpen, color: "text-primary bg-primary/10 border-primary/20", label: "Resource", estMinutes: 60 }
};

export default function CurriculumPage() {
  const { data: resources = [], isLoading: loadingResources } = useCurriculumResources();
  const { data: progress = [], isLoading: loadingProgress } = useCurriculumProgress();
  const toggleProgress = useToggleProgress();
  const resetProgress = useResetProgress();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [openTopics, setOpenTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Filter and group resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "ALL" || r.resource_type.toUpperCase() === selectedType.toUpperCase();
      return matchesSearch && matchesType;
    });
  }, [resources, searchQuery, selectedType]);

  // Group filtered resources by topic
  const groupedResources = useMemo(() => {
    const groups: Record<string, typeof filteredResources> = {};
    filteredResources.forEach((r) => {
      if (!groups[r.group_name]) groups[r.group_name] = [];
      groups[r.group_name].push(r);
    });
    
    return Object.entries(groups).map(([topic, items]) => {
      const topicCompleted = items.filter((item) => progress.includes(item.id)).length;
      return {
        topic,
        items,
        completedCount: topicCompleted,
        totalCount: items.length,
      };
    });
  }, [filteredResources, progress]);

  // Auto-expand all topics if searching or filtering
  useEffect(() => {
    if (searchQuery || selectedType !== "ALL") {
      setOpenTopics(groupedResources.map(g => g.topic));
    } else if (resources.length > 0 && openTopics.length === 0) {
      // Open the first topic by default
      const uniqueTopics = Array.from(new Set(resources.map(r => r.group_name)));
      if (uniqueTopics.length > 0) {
        setOpenTopics([uniqueTopics[0]]);
      }
    }
  }, [searchQuery, selectedType, resources]);

  // Calculate overall progress
  const totalResources = resources.length;
  const totalCompleted = progress.length;
  const progressPercentage = totalResources > 0 ? Math.round((totalCompleted / totalResources) * 100) : 0;

  // Trigger celebration on 100% completion
  useEffect(() => {
    if (progressPercentage === 100 && totalResources > 0) {
      setCelebrate(true);
    } else {
      setCelebrate(false);
    }
  }, [progressPercentage, totalResources]);

  // Estimate total hours saved/invested
  const totalTimeSpent = useMemo(() => {
    return progress.reduce((acc, resourceId) => {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return acc;
      const type = resource.resource_type.toUpperCase();
      const mins = TYPE_DETAILS[type]?.estMinutes || TYPE_DETAILS.DEFAULT.estMinutes;
      return acc + mins;
    }, 0);
  }, [progress, resources]);

  const totalHours = Math.round(totalTimeSpent / 60);

  const toggleTopic = (topic: string) => {
    setOpenTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleToggleResource = async (resourceId: number) => {
    try {
      await toggleProgress.mutateAsync({ resourceId });
      toast({
        title: progress.includes(resourceId) ? "Resource Unmarked" : "Resource Completed! 🎉",
        description: progress.includes(resourceId) 
          ? "Your progress has been updated." 
          : "Keep going, you're doing great!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update progress.",
        variant: "destructive",
      });
    }
  };

  const handleResetProgress = async () => {
    try {
      await resetProgress.mutateAsync();
      setShowResetConfirm(false);
      toast({
        title: "Progress Reset",
        description: "All your progress has been successfully cleared.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to reset progress.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative font-sans text-foreground bg-background overflow-hidden pb-16">
      
      {/* Dynamic Celebration Header Modal */}
      <AnimatePresence>
        {celebrate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-foreground mb-2">Curriculum Master!</h2>
              <p className="text-muted-foreground mb-6 font-medium">
                Incredible job! You have fully completed the AI Club learning sheet and invested roughly <span className="font-bold text-primary">{totalHours} hours</span> of self-guided study.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setCelebrate(false)}
                  className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-md"
                >
                  Awesome!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        {/* Page Header */}
        <div className="mb-10 text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span>Interactive Learning Sheet</span>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-3">
            My Curriculum Progress
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto font-medium">
            Learn at your own pace. Discover resources, tick them off, and track your metrics.
          </p>
        </div>

        {/* Sophisticated Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Main Progress Circle Card */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex items-center justify-between col-span-1 md:col-span-2">
            <div className="flex-1">
              <span className="text-xs font-semibold text-primary tracking-wider uppercase">Overall Completion</span>
              <h3 className="text-2xl font-bold text-foreground mt-1 mb-3">Your AI Journey</h3>
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-3xl font-black text-foreground">{totalCompleted}</span>
                  <span className="text-muted-foreground font-medium"> / {totalResources} items</span>
                </div>
                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center text-muted-foreground font-medium">
                  <Clock className="w-4 h-4 mr-2 text-primary" />
                  <span>~{totalHours}h Study Time</span>
                </div>
              </div>
            </div>
            
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-border stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                ></circle>
                <circle
                  className="text-primary stroke-current"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black text-foreground">{progressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Quick Controls Card */}
          <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Settings & Actions</span>
              <h3 className="text-lg font-bold text-foreground mt-1">Manage Progress</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Need to clear your progress data and restart your learning?
              </p>
            </div>
            
            <div className="mt-4">
              {showResetConfirm ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetProgress}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={!isAuthenticated || progress.length === 0}
                  className="w-full py-2.5 bg-secondary/50 hover:bg-secondary text-foreground/80 border border-border hover:text-rose-500 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:border-border disabled:bg-secondary/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Progress</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-thin">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2 hidden lg:inline flex-shrink-0">
              Type:
            </span>
            {["ALL", "VIDEO", "COURSE", "BOOK", "PAPER"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex-shrink-0 ${
                  selectedType === type
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary/60 text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >
                {type === "ALL" ? "All Resources" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-secondary/50 border border-border rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Topics & Resource Grid */}
        <div className="space-y-4">
          {loadingResources || loadingProgress ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
              <span className="text-sm font-semibold text-muted-foreground">Loading curriculum details...</span>
            </div>
          ) : groupedResources.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border shadow-sm">
              <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">No resources found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                We couldn't find any resources matching your search or filters. Try adjusting your settings.
              </p>
            </div>
          ) : (
            groupedResources.map((group, index) => {
              const isOpen = openTopics.includes(group.topic);
              const isGroupCompleted = group.completedCount === group.totalCount && group.totalCount > 0;
              const groupProgress = group.totalCount > 0 ? (group.completedCount / group.totalCount) * 100 : 0;

              return (
                <div key={index} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-200 hover:border-border/80">
                  
                  {/* Topic Header Row */}
                  <button
                    onClick={() => toggleTopic(group.topic)}
                    className="w-full px-6 py-5 flex items-center justify-between bg-card hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isGroupCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      }`}>
                        {isGroupCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5 text-primary/40" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">{group.topic}</h3>
                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                          {group.completedCount} of {group.totalCount} completed
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {/* Topic Progress Bar */}
                      <div className="hidden sm:flex items-center space-x-2">
                        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isGroupCompleted ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${groupProgress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground w-8 text-right">
                          {Math.round(groupProgress)}%
                        </span>
                      </div>
                      
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {/* Topic Items Expandable Content */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t border-border bg-secondary/20 px-6 py-4">
                          <ul className="space-y-3">
                            {group.items.map((item) => {
                              const isCompleted = progress.includes(item.id);
                              const type = item.resource_type.toUpperCase();
                              const detail = TYPE_DETAILS[type] || TYPE_DETAILS.DEFAULT;
                              const ResourceIcon = detail.icon;

                              return (
                                <li 
                                  key={item.id} 
                                  className={`flex items-start sm:items-center justify-between p-4 bg-card rounded-xl border transition-all duration-200 group ${
                                    isCompleted 
                                      ? "border-emerald-500/20 bg-emerald-500/5" 
                                      : "border-border hover:border-border/90"
                                  }`}
                                >
                                  <div className="flex items-start space-x-4">
                                    {/* Tick Checkbox Box */}
                                    <button
                                      onClick={() => handleToggleResource(item.id)}
                                      className="mt-0.5 sm:mt-0 flex-shrink-0 focus:outline-none transition-transform active:scale-95"
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                      ) : (
                                        <Circle className="w-6 h-6 text-muted-foreground/40 hover:text-primary transition-colors" />
                                      )}
                                    </button>
                                    
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className={`font-bold text-sm sm:text-base transition-colors ${
                                          isCompleted ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-primary'
                                        }`}>
                                          {item.title}
                                        </h4>
                                        {/* Resource Type Tag */}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${detail.color}`}>
                                          <ResourceIcon className="w-2.5 h-2.5 mr-1" />
                                          {detail.label}
                                        </span>
                                      </div>
                                      
                                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed max-w-3xl">
                                        {item.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Open Link icon */}
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-4 flex-shrink-0 p-2.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-xl transition-all border border-transparent hover:border-border"
                                    title="Open Resource"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </main>
      
      <Footer short />
    </div>
  );
}
