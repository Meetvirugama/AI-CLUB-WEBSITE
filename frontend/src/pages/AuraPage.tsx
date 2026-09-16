import { useCallback, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { Activity, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuraNetwork, createTeamNodes } from './AuraNetwork';
import { AnimatedCounter, FloatingParticles, LoadingSequence, useMousePosition, facultyMembers, getInitials } from './auraParts';

const AuraPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const mousePosition = useMousePosition();
  const px = useSpring(mousePosition.nX * 20, {
    damping: 30,
    stiffness: 100,
  });
  const py = useSpring(mousePosition.nY * 20, {
    damping: 30,
    stiffness: 100,
  });

  const nodes = createTeamNodes();

  const finishLoading = useCallback(() => setIsLoading(false), []);

  if (isLoading) {
    return <LoadingSequence onComplete={finishLoading} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-50">
      {!shouldReduceMotion && (
        <motion.div
          className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none mix-blend-screen z-50"
          style={{
            background:
              'radial-gradient(circle, rgba(232,121,46,0.1) 0%, rgba(0,0,0,0) 70%)',
            x: mousePosition.x - 250,
            y: mousePosition.y - 250,
          }}
          transition={{
            type: 'tween',
            ease: 'backOut',
            duration: 0.1,
          }}
        />
      )}

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.04] mix-blend-overlay" />

        <motion.div
          animate={{
            x: ['-20%', '10%', '-20%'],
            y: ['-10%', '20%', '-10%'],
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full mix-blend-screen"
          style={{
            background:
              'radial-gradient(circle, rgba(234,88,12,0.2) 0%, rgba(234,88,12,0) 70%)',
          }}
        />

        <motion.div
          animate={{
            x: ['20%', '-10%', '20%'],
            y: ['20%', '-20%', '20%'],
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-[10%] right-[10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen"
          style={{
            background:
              'radial-gradient(circle, rgba(217,119,6,0.15) 0%, rgba(217,119,6,0) 70%)',
          }}
        />

        <FloatingParticles />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505] z-10" />
      </div>

      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-600 via-orange-400 to-amber-400 origin-left z-[60]"
        style={{ scaleX }}
      />

      <header
        className="fixed top-0 w-full z-50 border-b border-white/5 transition-all duration-300"
        style={{
          backgroundColor: 'rgba(5,5,5,0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-3 text-white/50 hover:text-white transition-colors rounded-full py-2 px-4 hover:bg-white/5 relative overflow-hidden"
          >
            <motion.div
              whileHover={{ x: -4 }}
              transition={{ type: 'spring' }}
            >
              <ArrowLeft size={16} />
            </motion.div>

            <span className="font-medium text-sm tracking-wide relative z-10">
              Back to Home
            </span>

            <motion.div className="absolute bottom-0 left-0 w-full h-[1px] bg-orange-500 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300" />
          </Link>

          <motion.img
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            src="/aura-logo.png"
            alt="AURA"
            className="h-10 md:h-12 w-auto opacity-100"
          />
        </div>
      </header>

      <main className="relative z-10 w-full pt-32">
        {/* HERO SECTION */}
        <section className="relative w-full min-h-[90dvh] flex flex-col items-center justify-center px-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square pointer-events-none opacity-30">
            {[1, 2, 3].map((index) => (
              <motion.div
                key={`ring-${index}`}
                className="absolute inset-0 rounded-full border border-orange-500/20"
                style={{ scale: 1 + index * 0.4 }}
                animate={{ rotate: index % 2 === 0 ? [360, 0] : [0, 360] }}
                transition={{
                  duration: 20 + index * 15,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          <motion.div
            style={{
              x: shouldReduceMotion ? 0 : px,
              y: shouldReduceMotion ? 0 : py,
            }}
            className="relative z-10 flex flex-col items-center w-full max-w-4xl"
          >
            <motion.div
              initial={{
                scale: 0.5,
                filter: 'blur(20px)',
                opacity: 0,
              }}
              animate={{
                scale: [0.5, 1.08, 1],
                filter: 'blur(0px)',
                opacity: 1,
              }}
              transition={{
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative w-24 h-24 md:w-32 md:h-32 mb-10 flex items-center justify-center"
            >
              <motion.img
                src="/aura-logo.png"
                alt="AURA Mark"
                className="w-full h-full object-contain relative z-10"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              <motion.div
                className="absolute inset-0 rounded-full z-0"
                style={{
                  background:
                    'radial-gradient(circle, rgba(234,88,12,0.4) 0%, rgba(234,88,12,0) 70%)',
                }}
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [0.8, 1.2, 0.8],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            <h1 className="text-6xl sm:text-7xl md:text-[96px] font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-6 text-center leading-none flex overflow-hidden">
              {['A', 'U', 'R', 'A'].map((letter, index) => (
                <motion.span
                  key={letter + index}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.2 + index * 0.1,
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </h1>

            <div className="overflow-hidden mb-10">
              <motion.p
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.6,
                }}
                className="text-lg md:text-xl text-orange-400 font-mono tracking-[0.2em] uppercase text-center"
              >
                University AI Assistant
              </motion.p>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="max-w-[650px] text-center text-white/50 text-base md:text-lg leading-relaxed mb-12"
            >
              One intelligent assistant for everything at DAU.
              <span className="block mt-3 text-white/30 text-sm md:text-base">
                Search · Courses · Faculty · Labs · Events · Timetable · Research · Resources
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="mb-20"
            >
              <a
                href="https://aura.dau.ac.in"
                target="_blank"
                rel="noreferrer"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group px-10 py-4 bg-transparent border-none rounded-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full blur-[10px] group-hover:blur-[20px] transition-all duration-300 opacity-60 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full" />

                  <div className="relative flex items-center gap-3 text-white font-medium text-lg">
                    <Activity size={18} />
                    Launch AURA
                  </div>
                </motion.button>
              </a>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={{
                show: {
                  transition: { staggerChildren: 0.1 },
                },
              }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full"
            >
              {[
                { label: 'Version', value: '1' },
                { label: 'Students', value: '1,200+' },
                { label: 'Developers', value: '14' },
                { label: 'Faculty Mentors', value: '3' },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={{
                    hidden: {
                      opacity: 0,
                      y: 40,
                      filter: 'blur(10px)',
                    },
                    show: {
                      opacity: 1,
                      y: 0,
                      filter: 'blur(0px)',
                      transition: {
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                  whileHover={{
                    y: -6,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}
                  className="flex flex-col items-center justify-center p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-xl transition-all cursor-default relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <span className="text-3xl md:text-4xl font-bold text-white/90 mb-2">
                    <AnimatedCounter value={stat.value} />
                  </span>

                  <span className="text-[10px] md:text-xs text-white/40 uppercase font-mono tracking-widest text-center">
                    {stat.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <AuraNetwork onSelectNode={setSelectedNode} />

        {/* FACULTY SECTION */}
        <section className="relative w-full min-h-screen py-32 bg-[#050505] z-10 px-6">
          <div className="text-center mb-20 relative z-20">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-orange-400 font-mono tracking-widest uppercase text-sm mb-4"
            >
              FACULTY & MENTORS
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold text-white mb-6"
            >
              Guided by Experience
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/50 text-xl font-serif italic max-w-2xl mx-auto"
            >
              "The faculty members and mentors who transformed AURA from an idea into a scalable university AI platform."
            </motion.p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facultyMembers.map((faculty, index) => (
              <motion.div
                key={faculty.id}
                initial={{
                  opacity: 0,
                  y: 40,
                  filter: 'blur(10px)',
                  scale: 0.95,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                }}
                whileHover={{ y: -10 }}
                className="group relative rounded-[40px] p-[1px] overflow-hidden bg-white/5 cursor-default"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative h-full bg-[#080808]/90 backdrop-blur-3xl rounded-[39px] p-8 flex flex-col z-10 border border-transparent group-hover:border-orange-500/10">
                  <div className="flex items-center gap-5 mb-8">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring' }}
                      className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shrink-0"
                    >
                      {faculty.photo ? (
                        <img
                          src={faculty.photo}
                          alt={faculty.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-white font-bold">
                          {getInitials(faculty.name)}
                        </div>
                      )}
                    </motion.div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                        {faculty.name}
                      </h3>
                      <p className="text-sm text-white/70 font-medium mb-1">
                        {faculty.designation}
                      </p>
                      <p className="text-xs text-white/40">
                        {faculty.department}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-mono tracking-wider mb-1">
                        Role
                      </p>
                      <p className="text-sm text-orange-400">
                        {faculty.roleInAura}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-white/40 uppercase font-mono tracking-wider mb-1">
                        Experience
                      </p>
                      <p className="text-sm text-white/90">
                        {faculty.experience}
                      </p>
                    </div>
                  </div>

                  <div className="mb-8 flex-grow">
                    <p className="text-[10px] text-white/40 uppercase font-mono tracking-wider mb-3">
                      Expertise
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {faculty.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 text-[11px] font-medium text-white/70 bg-orange-500/10 border border-orange-500/20 rounded-full group-hover:shadow-[0_0_10px_rgba(249,115,22,0.2)] transition-shadow"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.5 + index * 0.1,
                    }}
                    className="pt-6 border-t border-white/10"
                  >
                    <p className="text-sm text-white/60 italic leading-relaxed">
                      "{faculty.quote}"
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* TIMELINE */}
          <div className="relative z-20 w-full max-w-4xl mx-auto mt-32 px-6 pb-20">
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-white/5 -translate-y-1/2" />

              <motion.div
                className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-orange-600 to-amber-400 -translate-y-1/2 origin-left"
                style={{ scaleX }}
              />

              {['Vision', 'Architecture', 'Infrastructure', 'Launch'].map(
                (step, index) => (
                  <div
                    key={step}
                    className="relative z-10 flex flex-col items-center gap-4 group"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: index * 0.3,
                        type: 'spring',
                        bounce: 0.5,
                      }}
                      className="w-5 h-5 rounded-full bg-[#050505] border-2 border-orange-500 relative flex items-center justify-center"
                    >
                      <motion.div className="absolute inset-0 rounded-full bg-orange-500 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />

                      <motion.div
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: index * 0.2,
                        }}
                        className="w-2 h-2 rounded-full bg-orange-500"
                      />
                    </motion.div>

                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        delay: index * 0.3 + 0.2,
                      }}
                      className="text-xs font-mono tracking-widest text-white/50 uppercase absolute top-8 whitespace-nowrap group-hover:text-orange-400 transition-colors"
                    >
                      {step}
                    </motion.span>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {selectedNode !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-2xl"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
                y: 20,
              }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 300,
              }}
              className="w-full max-w-lg bg-[#0A0A0A]/90 border border-white/10 rounded-[32px] p-8 relative overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-20"
                aria-label="Close profile"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-6 mb-8 relative z-10">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-white/5 shrink-0">
                  {nodes[selectedNode].image ? (
                    <img
                      src={nodes[selectedNode].image}
                      alt={nodes[selectedNode].name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white">
                      {getInitials(nodes[selectedNode].name)}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {nodes[selectedNode].name}
                  </h3>

                  <p className="text-sm font-mono text-orange-400 uppercase tracking-widest">
                    {nodes[selectedNode].role}
                  </p>
                </div>
              </div>

              <div className="relative z-10 space-y-6">
                <p className="text-white/70 leading-relaxed text-sm">
                  {nodes[selectedNode].bio}
                </p>

                <div className="flex gap-4 pt-4 border-t border-white/10">
                  {nodes[selectedNode].linkedin && (
                    <a
                      href={nodes[selectedNode].linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <span className="flex w-full py-3 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors">
                        LinkedIn
                      </span>
                    </a>
                  )}

                  {nodes[selectedNode].github && (
                    <a
                      href={nodes[selectedNode].github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <span className="flex w-full py-3 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors">
                        GitHub
                      </span>
                    </a>
                  )}

                  {nodes[selectedNode].website && (
                    <a
                      href={nodes[selectedNode].website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1"
                    >
                      <span className="flex w-full py-3 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-colors">
                        Website
                      </span>
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuraPage;
