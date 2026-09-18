import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Terminal, Sparkles, Activity, Layers, ArrowRight, Zap, Code, Database } from 'lucide-react';
import AuraLogo from './AuraLogo';



const inputChips = ['transformer', 'attention_is_all_you_need', 'pytorch_2.4', 'cuda_12', 'vLLM', 'diffusion'];

export default function Hero() {
  const [activeToken, setActiveToken] = useState(0);
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveToken((prev) => (prev + 1) % inputChips.length);
      setActiveNode((prev) => (prev + 1) % 4);
    }, 1600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-screen pt-16 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-50 via-indigo-50/40 to-slate-100/80"
    >
      {/* Ambient background aura glows */}
      <div className="absolute top-1/4 left-10 w-96 h-96 rounded-full pointer-events-none animate-pulse duration-[6000ms]" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)' }} />
      <div className="absolute top-1/3 right-12 w-[30rem] h-[30rem] rounded-full pointer-events-none animate-pulse duration-[8000ms]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0) 70%)' }} />

      {/* Main hero grid */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10 pb-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        
        {/* Left Column: Headline & CTA */}
        <div className="lg:col-span-7 space-y-7">
          
          {/* Top Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.04, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-indigo-200 text-indigo-700 shadow-sm cursor-pointer"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
            <span className="font-mono text-xs font-bold tracking-wide uppercase">DA-IICT · Dhirubhai Ambani University</span>
            <span className="bg-indigo-600 text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full font-extrabold shadow-xs">AI Club</span>
          </motion.div>

          {/* INPUT Chips Row */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <span className="font-mono text-xs font-extrabold text-slate-500 tracking-wider uppercase mr-1 flex items-center gap-1.5">
              <Terminal size={14} className="text-indigo-600" /> INPUT_TOKENS:
            </span>
            {inputChips.map((chip, idx) => (
              <motion.span
                key={chip}
                whileHover={{ scale: 1.12, y: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveToken(idx)}
                className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none ${
                  activeToken === idx
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 font-bold scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                }`}
              >
                #{chip}
              </motion.span>
            ))}
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="border-l-4 border-orange-500 pl-6 space-y-4"
          >
            <h1 className="font-serif font-extrabold text-4xl sm:text-6xl lg:text-7xl text-slate-900 leading-[1.08] tracking-tight">
              One Assistant for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Everything at </span>DAU.
            </h1>

            <p className="font-sans text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Built by students, for everyone. AURA is the official AI assistant of Dhirubhai Ambani University, bringing everything students need into one intelligent platform.
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            <motion.a
              href="https://aura.dau.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-slate-900 text-white font-mono text-sm font-bold rounded-xl hover:bg-orange-500 shadow-md hover:shadow-xl hover:shadow-orange-500/30 transition-colors duration-200 group"
            >
              <span>Try AURA</span>
              <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
            </motion.a>

            <motion.div
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/aura"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-800 font-mono text-sm font-bold rounded-xl border border-slate-300 hover:border-orange-500 hover:bg-orange-50/60 hover:text-orange-600 shadow-sm hover:shadow-md transition-colors duration-200"
              >
                <span>About AURA</span>
              </Link>
            </motion.div>

            <div className="w-full sm:w-auto flex items-center gap-2 text-xs font-mono text-slate-500 pt-2 sm:pt-0 sm:ml-4">
              <Sparkles size={15} className="text-orange-500 animate-spin duration-[6000ms]" />
              <span>University AI Assistant</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: AURA Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
          className="lg:col-span-5 relative flex justify-center items-center"
        >
          <div className="w-full max-w-lg relative group flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl transition-all duration-500 opacity-50 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0) 70%)' }} />
            <div className="relative z-10 w-full transform scale-110 md:scale-125 pt-10">
              <AuraLogo />
            </div>
          </div>
        </motion.div>
      </div>


    </section>
  );
}
