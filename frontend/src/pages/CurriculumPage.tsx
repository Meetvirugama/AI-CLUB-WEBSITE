import { useMemo, useState, useEffect } from "react";
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
  VIDEO: { icon: Video, color: "text-rose-500 bg-rose-50 border-rose-100", label: "Video", estMinutes: 45 },
  COURSE: { icon: GraduationCap, color: "text-amber-500 bg-amber-50 border-amber-100", label: "Course", estMinutes: 480 },
  BOOK: { icon: BookOpen, color: "text-emerald-500 bg-emerald-50 border-emerald-100", label: "Book", estMinutes: 300 },
  PAPER: { icon: FileText, color: "text-blue-500 bg-blue-50 border-blue-100", label: "Paper", estMinutes: 120 },
  DEFAULT: { icon: BookOpen, color: "text-indigo-500 bg-indigo-50 border-indigo-100", label: "Resource", estMinutes: 60 }
};

export default function CurriculumPage() {
  const { data: resources = [], isLoading: loadingResources } = useCurriculumResources();
  const token = localStorage.getItem("access_token");
  const { data: progress = [], isLoading: loadingProgress } = useCurriculumProgress(token);
  const toggleProgress = useToggleProgress();
  const resetProgress = useResetProgress();
  const { toast } = useToast();

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
    const currentToken = localStorage.getItem("access_token");
    if (!currentToken) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save your progress.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await toggleProgress.mutateAsync({ resourceId, token: currentToken });
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
    const currentToken = localStorage.getItem("access_token");
    if (!currentToken) return;

    try {
      await resetProgress.mutateAsync(currentToken);
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
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50/50 overflow-hidden pb-16">
      
      {/* Dynamic Celebration Header Modal */}
      <AnimatePresence>
        {celebrate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-yellow-200/40 blur-2xl"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-emerald-200/40 blur-2xl"></div>
              
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Curriculum Master!</h2>
              <p className="text-slate-600 mb-6 font-medium">
                Incredible job! You have fully completed the AI Club learning sheet and invested roughly <span className="font-bold text-indigo-600">{totalHours} hours</span> of self-guided study.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setCelebrate(false)}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
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
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-sm font-semibold mb-4"
          >
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Interactive Learning Sheet</span>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-indigo-950 to-indigo-900">
            My Curriculum Progress
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium">
            Learn at your own pace. Discover resources, tick them off, and track your metrics.
          </p>
        </div>

        {/* Sophisticated Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          
          {/* Main Progress Circle Card */}
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex items-center justify-between col-span-1 md:col-span-2">
            <div className="flex-1">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">Overall Completion</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 mb-3">Your AI Journey</h3>
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-3xl font-black text-slate-950">{totalCompleted}</span>
                  <span className="text-slate-400 font-medium"> / {totalResources} items</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="flex items-center text-slate-600 font-medium">
                  <Clock className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>~{totalHours}h Study Time</span>
                </div>
              </div>
            </div>
            
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-slate-100 stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                ></circle>
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
                ></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black text-slate-900">{progressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Quick Controls Card */}
          <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Settings & Actions</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Manage Progress</h3>
              <p className="text-xs text-slate-400 mt-1">
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
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={!token || progress.length === 0}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 hover:text-rose-600 hover:border-rose-200 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200 disabled:bg-slate-50/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Progress</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100/80 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-thin">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 hidden lg:inline flex-shrink-0">
              Type:
            </span>
            {["ALL", "VIDEO", "COURSE", "BOOK", "PAPER"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex-shrink-0 ${
                  selectedType === type
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                    : "bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100/80"
                }`}
              >
                {type === "ALL" ? "All Resources" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium placeholder-slate-400"
            />
          </div>
        </div>

        {/* Topics & Resource Grid */}
        <div className="space-y-4">
          {loadingResources || loadingProgress ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <span className="text-sm font-semibold text-slate-500">Loading curriculum details...</span>
            </div>
          ) : groupedResources.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">No resources found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
                We couldn't find any resources matching your search or filters. Try adjusting your settings.
              </p>
            </div>
          ) : (
            groupedResources.map((group, index) => {
              const isOpen = openTopics.includes(group.topic);
              const isGroupCompleted = group.completedCount === group.totalCount && group.totalCount > 0;
              const groupProgress = group.totalCount > 0 ? (group.completedCount / group.totalCount) * 100 : 0;

              return (
                <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-150/40 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-200/50">
                  
                  {/* Topic Header Row */}
                  <button
                    onClick={() => toggleTopic(group.topic)}
                    className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isGroupCompleted ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                      }`}>
                        {isGroupCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5 text-indigo-300" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">{group.topic}</h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">
                          {group.completedCount} of {group.totalCount} completed
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {/* Topic Progress Bar */}
                      <div className="hidden sm:flex items-center space-x-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${isGroupCompleted ? "bg-emerald-500" : "bg-indigo-600"}`}
                            style={{ width: `${groupProgress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-400 w-8 text-right">
                          {Math.round(groupProgress)}%
                        </span>
                      </div>
                      
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
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
                        <div className="border-t border-slate-100 bg-slate-50/20 px-6 py-4">
                          <ul className="space-y-3">
                            {group.items.map((item) => {
                              const isCompleted = progress.includes(item.id);
                              const type = item.resource_type.toUpperCase();
                              const detail = TYPE_DETAILS[type] || TYPE_DETAILS.DEFAULT;
                              const ResourceIcon = detail.icon;

                              return (
                                <li 
                                  key={item.id} 
                                  className={`flex items-start sm:items-center justify-between p-4 bg-white rounded-xl border transition-all duration-200 group ${
                                    isCompleted 
                                      ? "border-emerald-100 bg-emerald-50/5/10" 
                                      : "border-slate-200/60 hover:border-slate-300"
                                  }`}
                                >
                                  <div className="flex items-start space-x-4">
                                    {/* Tick Checkbox Box */}
                                    <button
                                      onClick={() => handleToggleResource(item.id)}
                                      className="mt-0.5 sm:mt-0 flex-shrink-0 focus:outline-none transition-transform active:scale-95"
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" />
                                      ) : (
                                        <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-600 transition-colors" />
                                      )}
                                    </button>
                                    
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className={`font-bold text-sm sm:text-base transition-colors ${
                                          isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-indigo-900'
                                        }`}>
                                          {item.title}
                                        </h4>
                                        {/* Resource Type Tag */}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${detail.color}`}>
                                          <ResourceIcon className="w-2.5 h-2.5 mr-1" />
                                          {detail.label}
                                        </span>
                                      </div>
                                      
                                      <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-3xl">
                                        {item.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Open Link icon */}
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-4 flex-shrink-0 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100"
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
