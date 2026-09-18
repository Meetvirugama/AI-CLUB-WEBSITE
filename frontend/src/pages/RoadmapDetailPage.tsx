import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  BookOpen,
  Route,
  Sparkles,
} from "lucide-react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { getApiUrl } from "../lib/api";

type RoadmapPhase = {
  phase: string;
  title: string;
  duration: string;
  color: string;
  topics: string[];
};

const ROADMAP_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    description: string;
    number: string;
  }
> = {
  ml: {
    title: "Machine Learning",
    subtitle: "End-to-End ML Framework",
    description:
      "A structured path through machine learning fundamentals, algorithms, evaluation, feature engineering and production workflows.",
    number: "01",
  },

  dl: {
    title: "Deep Learning",
    subtitle: "Neural Networks & Architectures",
    description:
      "Understand neural networks from first principles through modern deep learning architectures.",
    number: "02",
  },

  rl: {
    title: "Reinforcement Learning",
    subtitle: "Agents & Environments",
    description:
      "Learn how agents make decisions, interact with environments and optimize long-term rewards.",
    number: "03",
  },

  nlp: {
    title: "Natural Language Processing",
    subtitle: "Text & Language Fundamentals",
    description:
      "Build the foundations required to work with text, language representations and NLP systems.",
    number: "04",
  },

  transformers: {
    title: "Transformers",
    subtitle: "Attention & Sequence Models",
    description:
      "Understand the architecture behind modern language and multimodal AI.",
    number: "05",
  },

  genai: {
    title: "Generative AI",
    subtitle: "GenAI & Foundation Models",
    description:
      "Learn the technologies behind modern generative AI systems, from embeddings and RAG to foundation models.",
    number: "06",
  },

  llm: {
    title: "Large Language Models",
    subtitle: "Architecture & Optimization",
    description:
      "Go deeper into how large language models are trained, optimized and deployed.",
    number: "07",
  },

  "agentic-ai": {
    title: "Agentic AI",
    subtitle: "AI Agents & Multi-Agent Systems",
    description:
      "Understand agents, tools, memory, planning, reasoning and multi-agent architectures.",
    number: "08",
  },
};

function PhaseSection({
  phase,
  index,
}: {
  phase: RoadmapPhase;
  index: number;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-50px",
      }}
      transition={{
        duration: 0.45,
      }}
      className="relative"
    >
      <div className="grid grid-cols-[42px_1fr] gap-5">
        {/* phase number */}

        <div className="relative flex justify-center">
          <div
            className="
              relative
              z-10
              grid
              h-8
              w-8
              place-items-center
              rounded-full
              border
              border-primary/30
              bg-card
              font-mono
              text-[9px]
              font-semibold
              text-primary
            "
          >
            {String(index + 1).padStart(2, "0")}
          </div>

          {index !== 0 && (
            <div className="absolute bottom-full top-[-50px] w-px bg-border" />
          )}

          <div className="absolute bottom-[-35px] top-8 w-px bg-border" />
        </div>

        {/* content */}

        <div
          className="
            mb-10
            overflow-hidden
            border
            border-border
            bg-card
          "
        >
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="
              flex
              w-full
              items-center
              gap-4
              p-5
              text-left
            "
          >
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="mono-label">
                  {phase.phase}
                </span>

                {phase.duration && phase.duration !== "TBD" && (
                  <>
                    <span className="text-border">
                      /
                    </span>

                    <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground">
                      <Clock3 size={10} />
                      {phase.duration}
                    </span>
                  </>
                )}
              </div>

              <h2
                className="
                  font-display
                  text-xl
                  font-bold
                  text-foreground
                "
              >
                {phase.title}
              </h2>
            </div>

            <div className="grid h-8 w-8 shrink-0 place-items-center border border-border">
              <motion.div
                animate={{
                  rotate: open ? 180 : 0,
                }}
              >
                <ChevronDown size={15} />
              </motion.div>
            </div>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{
                  height: 0,
                  opacity: 0,
                }}
                animate={{
                  height: "auto",
                  opacity: 1,
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
              >
                <div className="border-t border-border px-5 py-5">
                  <div className="mb-4 flex items-center gap-2">
                    <BookOpen
                      size={13}
                      className="text-primary"
                    />

                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      Topics to master
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {phase.topics.map(
                      (topic, topicIndex) => (
                        <motion.div
                          key={`${topic}-${topicIndex}`}
                          initial={{
                            opacity: 0,
                            x: -5,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              topicIndex * 0.035,
                          }}
                          className="
                            flex
                            items-start
                            gap-3
                            border
                            border-border
                            bg-background
                            px-3
                            py-3
                            text-[12px]
                            text-muted-foreground
                          "
                        >
                          <CheckCircle2
                            size={13}
                            className="mt-0.5 shrink-0 text-primary"
                          />

                          <span>{topic}</span>
                        </motion.div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function RoadmapDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const meta =
    ROADMAP_META[slug || ""];

  const [phases, setPhases] = useState<
    RoadmapPhase[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        const response = await fetch(
          getApiUrl("/api/roadmaps")
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch roadmap"
          );
        }

        const data = await response.json();

        const roadmapType = Object.keys(
          ROADMAP_META
        ).find((key) => {
          const map: Record<string, string> = {
            ml: "ML",
            dl: "DL",
            rl: "RL",
            nlp: "NLP",
            transformers: "TRANSFORMER",
            genai: "GENAI",
            llm: "LLM",
            "agentic-ai": "AGENTIC",
          };

          return map[key] === data?.[0]?.roadmap_type;
        });

        const typeMap: Record<string, string> = {
          ml: "ML",
          dl: "DL",
          rl: "RL",
          nlp: "NLP",
          transformers: "TRANSFORMER",
          genai: "GENAI",
          llm: "LLM",
          "agentic-ai": "AGENTIC",
        };

        const type = typeMap[slug || ""];

        const filtered = data
          .filter(
            (item: any) =>
              item.roadmap_type === type
          )
          .map((item: any) => ({
            phase: item.phase,
            title: item.title,
            duration: item.duration || "",
            color:
              item.color ||
              "hsl(var(--primary))",
            topics: Array.isArray(item.topics)
              ? item.topics
              : [],
          }));

        setPhases(filtered);
      } catch (error) {
        console.error(
          "Failed to load roadmap:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadRoadmap();
  }, [slug]);

  const topicCount = useMemo(
    () =>
      phases.reduce(
        (total, phase) =>
          total +
          (phase.topics?.length || 0),
        0
      ),
    [phases]
  );

  if (!meta) {
    return (
      <div className="section-container text-center pt-32">
        <h1 className="headline-md">
          Roadmap not found
        </h1>

        <button
          onClick={() => navigate("/#roadmaps")}
          className="btn-primary mt-6"
        >
          Back to Roadmaps
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-32 pb-24">
      <div className="section-container">
        {/* Back */}

        <motion.button
          initial={{
            opacity: 0,
            x: -10,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          onClick={() => navigate("/#roadmaps")}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-transparent border border-border/50 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-primary/30 hover:from-primary/15 transition-all duration-300 group mb-12"
        >
          <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform duration-300 text-primary" />
          <span>All Roadmaps</span>
        </motion.button>

        {/* Hero */}

        <motion.header
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="mb-16"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="section-label mb-0">
              {meta.number} — Learning Path
            </span>

            <span className="h-px w-10 bg-border" />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="headline-lg">
                {meta.title}
              </h1>

              <p className="mt-3 font-mono text-xs text-primary">
                {meta.subtitle}
              </p>
            </div>

            <p className="max-w-lg text-sm leading-7 text-muted-foreground">
              {meta.description}
            </p>
          </div>

          {/* Stats */}

          <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-border py-5">
            <div className="flex items-center gap-2">
              <Route
                size={13}
                className="text-primary"
              />

              <span className="font-mono text-[10px] text-muted-foreground">
                {phases.length} PHASES
              </span>
            </div>

            <span className="text-border">/</span>

            <div className="flex items-center gap-2">
              <BookOpen
                size={13}
                className="text-primary"
              />

              <span className="font-mono text-[10px] text-muted-foreground">
                {topicCount} TOPICS
              </span>
            </div>
          </div>
        </motion.header>

        {/* Content */}

        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="shimmer h-28"
                  />
                )
              )}
            </div>
          ) : (
            phases.map((phase, index) => (
              <PhaseSection
                key={`${phase.phase}-${index}`}
                phase={phase}
                index={index}
              />
            ))
          )}
        </div>

        {/* Bottom */}

        {!loading && phases.length > 0 && (
          <div className="mx-auto mt-8 max-w-4xl border-t border-border pt-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="mono-label">
                  Roadmap complete
                </span>

                <p className="mt-1 text-sm text-muted-foreground">
                  Master each phase before moving
                  to the next.
                </p>
              </div>

              <button
                onClick={() => navigate("/#roadmaps")}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-transparent border border-border/50 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-primary/30 hover:from-primary/15 transition-all duration-300 group mt-4 sm:mt-0"
              >
                <ArrowLeft size={11} className="group-hover:-translate-x-1 transition-transform duration-300 text-primary" />
                <span>All Roadmaps</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
