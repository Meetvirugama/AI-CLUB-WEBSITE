import { useCurriculumResources, useCurriculumProgress } from "@/hooks/useCurriculum";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Sparkles, Award, Clock, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

export default function ProgressTrackerCard() {
  const { data: resources = [], isLoading: loadingResources } = useCurriculumResources();
  const { data: progress = [], isLoading: loadingProgress } = useCurriculumProgress();

  const totalResources = resources.length;
  const totalCompleted = progress.length;
  const progressPercentage = totalResources > 0 ? Math.round((totalCompleted / totalResources) * 100) : 0;

  // Study hours calculation
  const totalTimeSpent = useMemo(() => {
    return progress.reduce((acc, resourceId) => {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return acc;
      const type = resource.resource_type.toUpperCase();
      let mins = 60;
      if (type === "VIDEO") mins = 45;
      else if (type === "COURSE") mins = 480;
      else if (type === "BOOK") mins = 300;
      else if (type === "PAPER") mins = 120;
      return acc + mins;
    }, 0);
  }, [progress, resources]);

  const totalHours = Math.round(totalTimeSpent / 60);

  // Dynamic encouragement message based on progress
  const message = useMemo(() => {
    if (progressPercentage === 0) return "Begin your AI learning journey today!";
    if (progressPercentage < 25) return "Great start! Building solid foundations.";
    if (progressPercentage < 50) return "Making progress. Keep exploring new fields!";
    if (progressPercentage < 75) return "You're over halfway! Outstanding dedication.";
    if (progressPercentage < 100) return "Almost there! Master the remaining topics.";
    return "Curriculum Complete! You're officially an AI Master! 🎓";
  }, [progressPercentage]);

  if (loadingResources || totalResources === 0) return null;

  return (
    <section className="py-16 bg-slate-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-72 rounded-full bg-indigo-200/20 blur-3xl -z-10"></div>
      <div className="absolute top-12 right-0 w-96 h-96 rounded-full bg-emerald-100/10 blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-indigo-900/5 border border-slate-100 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-10"
        >
          {/* Decorative Corner Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-[10rem] pointer-events-none"></div>

          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-xs font-bold mb-5 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-indigo-500 animate-pulse" />
              Learning Tracker
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight mb-4">
              Track Your AI Curriculum
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mb-8 leading-relaxed font-medium">
              We've compiled everything you need to transition from AI enthusiast to building production AI models. Mark steps as done to visualize your roadmap.
            </p>

            {/* Quick Metrics Panel */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 mb-8 border border-slate-100 bg-slate-50/50 p-4 rounded-2xl">
              <div className="text-center lg:text-left">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Completed</span>
                <span className="text-xl font-extrabold text-slate-950 block mt-0.5">{totalCompleted} items</span>
              </div>
              <div className="w-px h-8 bg-slate-200 self-center justify-self-center"></div>
              <div className="text-center lg:text-left">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Study Invested</span>
                <span className="text-xl font-extrabold text-slate-950 block mt-0.5">~{totalHours} hrs</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                to="/curriculum"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/10 hover:shadow-xl active:scale-98 duration-200"
              >
                Go to Curriculum
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Large Progress Widget */}
          <div className="relative flex-shrink-0 flex items-center justify-center bg-indigo-50/30 p-8 rounded-[2rem] border border-indigo-50/50 max-w-sm w-full">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-white stroke-current"
                  strokeWidth="8"
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                ></circle>
                <circle
                  className="text-indigo-600 stroke-current"
                  strokeWidth="8"
                  strokeLinecap="round"
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercentage / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-4xl font-black text-slate-950 tracking-tight">{progressPercentage}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Total Progress</span>
              </div>
            </div>
            
            {/* Overlay tag for motivation */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-100 flex items-center space-x-2 w-[85%] text-center justify-center">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse flex-shrink-0" />
              <span className="text-[11px] font-bold text-slate-700 truncate">{message}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
