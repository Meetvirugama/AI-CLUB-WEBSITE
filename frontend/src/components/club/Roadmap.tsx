import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Sparkles,
  Layers,
  Cpu,
  Bot,
  Network,
  BookOpen,
  Code2,
  Route,
  Clock3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../../lib/api";

type RoadmapPhase = {
  phase: string;
  title: string;
  duration: string;
  color: string;
  icon: React.ElementType;
  topics: string[];
};

type RoadmapConfig = {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  number: string;
  slug: string;
};

const ROADMAP_CONFIG: Record<string, RoadmapConfig> = {
  ML: {
    title: "Machine Learning",
    subtitle: "End-to-End ML Framework",
    description:
      "Learn the complete machine learning workflow from fundamentals and data preparation to model evaluation and deployment.",
    icon: Brain,
    accent: "hsl(var(--primary))",
    number: "01",
    slug: "ml",
  },

  DL: {
    title: "Deep Learning",
    subtitle: "Neural Networks & Architectures",
    description:
      "Build a strong understanding of neural networks, CNNs, sequence models, architectures and modern deep learning systems.",
    icon: Cpu,
    accent: "hsl(160 55% 38%)",
    number: "02",
    slug: "dl",
  },

  RL: {
    title: "Reinforcement Learning",
    subtitle: "Agents & Environments",
    description:
      "Understand how intelligent agents learn through interaction, rewards, environments and sequential decision making.",
    icon: Network,
    accent: "hsl(12 70% 48%)",
    number: "03",
    slug: "rl",
  },

  NLP: {
    title: "Natural Language Processing",
    subtitle: "Text & Language Fundamentals",
    description:
      "Explore language representation, text processing, embeddings, sequence models and modern NLP systems.",
    icon: BookOpen,
    accent: "hsl(170 55% 36%)",
    number: "04",
    slug: "nlp",
  },

  TRANSFORMER: {
    title: "Transformers",
    subtitle: "Attention & Sequence Models",
    description:
      "Understand attention, self-attention, positional encoding, encoder-decoder architectures and transformer internals.",
    icon: Layers,
    accent: "hsl(265 55% 52%)",
    number: "05",
    slug: "transformers",
  },

  GENAI: {
    title: "Generative AI",
    subtitle: "GenAI & Foundation Models",
    description:
      "Learn the foundations of generative models, prompting, embeddings, RAG, multimodal AI and foundation models.",
    icon: Sparkles,
    accent: "hsl(330 55% 48%)",
    number: "06",
    slug: "genai",
  },

  LLM: {
    title: "Large Language Models",
    subtitle: "Architecture & Optimization",
    description:
      "Go deeper into LLM architecture, training, fine-tuning, inference, evaluation and optimization.",
    icon: Code2,
    accent: "hsl(195 65% 40%)",
    number: "07",
    slug: "llm",
  },

  AGENTIC: {
    title: "Agentic AI",
    subtitle: "AI Agents & Multi-Agent Systems",
    description:
      "Learn how modern AI agents reason, use tools, maintain memory and collaborate across multi-agent systems.",
    icon: Bot,
    accent: "hsl(42 75% 42%)",
    number: "08",
    slug: "agentic-ai",
  },
};

const ROADMAP_ORDER = [
  "ML",
  "DL",
  "RL",
  "NLP",
  "TRANSFORMER",
  "GENAI",
  "LLM",
  "AGENTIC",
];

function RoadmapCard({
  type,
  data,
  index,
}: {
  type: string;
  data: RoadmapPhase[];
  index: number;
}) {
  const navigate = useNavigate();
  const config = ROADMAP_CONFIG[type];

  if (!config) return null;

  const Icon = config.icon;

  const topicCount = data.reduce(
    (total, phase) => total + (phase.topics?.length || 0),
    0
  );

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 25,
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
        duration: 0.5,
        delay: (index % 2) * 0.08,
      }}
      whileHover={{
        y: -4,
      }}
      className="group relative"
    >
      <div
        className="
          relative
          h-full
          overflow-hidden
          border
          border-border
          bg-card
          transition-all
          duration-300
          hover:border-primary/40
        "
      >
        {/* Accent line */}

        <div
          className="
            absolute
            left-0
            top-0
            h-full
            w-[3px]
          "
          style={{
            background: config.accent,
          }}
        />

        <div className="p-6 sm:p-7">
          {/* Top row */}

          <div className="mb-7 flex items-start justify-between">
            <div
              className="
                grid
                h-12
                w-12
                place-items-center
                border
                bg-background
              "
              style={{
                borderColor: `${config.accent}45`,
              }}
            >
              <Icon
                size={20}
                strokeWidth={1.6}
                style={{
                  color: config.accent,
                }}
              />
            </div>

            <span
              className="
                font-mono
                text-[11px]
                font-semibold
                tracking-widest
              "
              style={{
                color: config.accent,
              }}
            >
              {config.number}
            </span>
          </div>

          {/* Title */}

          <div className="mb-4">
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {config.subtitle}
            </div>

            <h3
              className="
                font-display
                text-[25px]
                font-bold
                leading-tight
                text-foreground
              "
            >
              {config.title}
            </h3>
          </div>

          {/* Description */}

          <p className="mb-7 max-w-lg text-[13px] leading-6 text-muted-foreground">
            {config.description}
          </p>

          {/* Stats */}

          <div className="mb-6 flex items-center gap-5 border-y border-border py-4">
            <div className="flex items-center gap-2">
              <Route
                size={12}
                className="text-muted-foreground"
              />

              <span className="font-mono text-[10px] text-muted-foreground">
                {data.length} PHASES
              </span>
            </div>

            <span className="text-border">/</span>

            <div className="flex items-center gap-2">
              <BookOpen
                size={12}
                className="text-muted-foreground"
              />

              <span className="font-mono text-[10px] text-muted-foreground">
                {topicCount} TOPICS
              </span>
            </div>
          </div>

          {/* CTA */}

          <button
            type="button"
            onClick={() =>
              navigate(`/roadmaps/${config.slug}`)
            }
            className="
              flex
              w-full
              items-center
              justify-between
              border
              border-border
              bg-background
              px-4
              py-3
              text-left
              transition-all
              duration-200
              hover:border-primary/40
              hover:bg-primary/[0.04]
            "
          >
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground">
              Explore Roadmap
            </span>

            <ArrowRight
              size={15}
              className="
                text-muted-foreground
                transition-transform
                duration-200
                group-hover:translate-x-1
                group-hover:text-primary
              "
            />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function Roadmap({ isHomepage = true }: { isHomepage?: boolean }) {
  const [roadmaps, setRoadmaps] = useState<
    Record<string, RoadmapPhase[]>
  >({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmaps = async () => {
      try {
        const response = await fetch(
          getApiUrl("/api/roadmaps")
        );

        if (!response.ok) {
          throw new Error("Failed to fetch roadmaps");
        }

        const data = await response.json();

        const grouped: Record<
          string,
          RoadmapPhase[]
        > = {};

        data.forEach((item: any) => {
          const phase: RoadmapPhase = {
            phase: item.phase,
            title: item.title,
            duration: item.duration || "",
            color:
              item.color ||
              "hsl(var(--primary))",
            icon: (() => {
              const icons: Record<string, React.ElementType> = {
                Brain,
                Cpu,
                Network,
                BookOpen,
                Layers,
                Sparkles,
                Code2,
                Bot,
              };
              return item.icon_name && icons[item.icon_name]
                ? icons[item.icon_name]
                : BookOpen;
            })(),
            topics: Array.isArray(item.topics)
              ? item.topics
              : [],
          };

          if (!grouped[item.roadmap_type]) {
            grouped[item.roadmap_type] = [];
          }

          grouped[item.roadmap_type].push(phase);
        });

        setRoadmaps(grouped);
      } catch (error) {
        console.error(
          "Roadmap loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmaps();
  }, []);

  const totalTopics = ROADMAP_ORDER.reduce(
    (total, type) =>
      total +
      (roadmaps[type] || []).reduce(
        (sum, phase) =>
          sum + (phase.topics?.length || 0),
        0
      ),
    0
  );

  return (
    <section
      id="roadmaps"
      className={`relative overflow-hidden bg-background ${isHomepage ? "py-16" : "pt-0 pb-16"}`}
    >
      <div className={`section-container relative z-10 max-w-6xl mx-auto px-6 ${!isHomepage ? "!pt-0" : ""}`}>
        {/* HEADER */}

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
          }}
          transition={{
            duration: 0.6,
          }}
          className="mb-14"
        >
          {isHomepage && (
            <div className="section-label text-sm uppercase tracking-widest text-primary mb-4 block">
              04 — Roadmaps
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Learning{" "}
                <span className="text-primary">
                  Roadmaps
                </span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              Structured learning paths designed by
              AI Club DAIICT. Choose a domain and
              follow it from fundamentals to advanced
              systems.
            </p>
          </div>

          {/* overview stats */}

          <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-border pt-5">
            <div>
              <strong className="font-mono text-lg">
                08
              </strong>

              <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                Learning Paths
              </span>
            </div>

            <span className="text-border">/</span>

            <div>
              <strong className="font-mono text-lg">
                {Object.values(roadmaps).reduce(
                  (sum, phases) =>
                    sum + phases.length,
                  0
                )}
              </strong>

              <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                Phases
              </span>
            </div>

            <span className="text-border">/</span>

            <div>
              <strong className="font-mono text-lg">
                {totalTopics}
              </strong>

              <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">
                Topics
              </span>
            </div>
          </div>
        </motion.div>

        {/* CARDS */}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="animate-pulse bg-card h-[360px] rounded-lg border border-border"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ROADMAP_ORDER.map((type, index) => {
              if (
                !roadmaps[type] ||
                roadmaps[type].length === 0
              ) {
                return null;
              }

              return (
                <RoadmapCard
                  key={type}
                  type={type}
                  data={roadmaps[type]}
                  index={index}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
