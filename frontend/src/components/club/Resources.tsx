import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpen,
  Search,
  Video,
  FileText,
  GraduationCap,
  Wrench,
  Database,
  X,
} from "lucide-react";
import { getApiUrl } from "../../lib/api";

/* ============================================================
   TYPES
============================================================ */

type ResourceItem = {
  title: string;
  description: string;
  type: string;
  href: string;
};

type ResourceGroup = {
  group: string;
  items: ResourceItem[];
};

/* ============================================================
   RESOURCE TYPE CONFIG
============================================================ */

const RESOURCE_TYPE_CONFIG: Record<
  string,
  {
    color: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  VIDEO: {
    color: "hsl(243 75% 59%)",
    icon: Video,
    label: "Video",
  },

  COURSE: {
    color: "hsl(243 75% 59%)",
    icon: GraduationCap,
    label: "Course",
  },

  BOOK: {
    color: "hsl(243 75% 59%)",
    icon: BookOpen,
    label: "Book",
  },

  PAPER: {
    color: "hsl(330 45% 50%)",
    icon: FileText,
    label: "Paper",
  },

  PAPERS: {
    color: "hsl(330 45% 50%)",
    icon: FileText,
    label: "Papers",
  },

  ESSAYS: {
    color: "hsl(200 75% 50%)",
    icon: FileText,
    label: "Essays",
  },

  TOOLS: {
    color: "hsl(150 60% 45%)",
    icon: Wrench,
    label: "Tools",
  },

  DATA: {
    color: "hsl(40 80% 45%)",
    icon: Database,
    label: "Data",
  },
};

/* ============================================================
   FALLBACK
============================================================ */

const DEFAULT_RESOURCE_TYPE = {
  color: "hsl(var(--primary))",
  icon: BookOpen,
  label: "Resource",
};

/* ============================================================
   RESOURCE ITEM
============================================================ */

function ResourceRow({
  item,
  index,
}: {
  item: ResourceItem;
  index: number;
}) {
  const config =
    RESOURCE_TYPE_CONFIG[item.type?.toUpperCase()] ||
    DEFAULT_RESOURCE_TYPE;

  const Icon = config.icon;

  return (
    <motion.a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{
        opacity: 0,
        y: 8,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: "-30px",
      }}
      transition={{
        duration: 0.35,
        delay: index * 0.035,
      }}
      whileHover={{
        x: 3,
      }}
      className="
        group
        relative
        flex
        items-start
        gap-4
        border-t
        border-border
        px-3
        py-5
        text-left
        no-underline
        transition-colors
        duration-200
        hover:bg-card
      "
    >
      {/* Resource icon */}

      <div
        className="
          mt-0.5
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          border
          bg-background
          transition-colors
          duration-200
          group-hover:bg-card
        "
        style={{
          borderColor: `${config.color}35`,
        }}
      >
        <Icon
          size={16}
          strokeWidth={1.6}
          style={{
            color: config.color,
          }}
        />
      </div>

      {/* Content */}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start gap-3">
          <h3
            className="
              min-w-0
              font-display
              text-[15px]
              font-bold
              leading-snug
              text-foreground
              transition-colors
              duration-200
              group-hover:text-primary
            "
          >
            {item.title}
          </h3>
        </div>

        {item.description && (
          <p
            className="
              max-w-3xl
              text-[13px]
              leading-6
              text-muted-foreground
            "
          >
            {item.description}
          </p>
        )}
      </div>

      {/* Type */}

      <div className="hidden shrink-0 items-center gap-3 pt-1 sm:flex">
        <span
          className="
            border
            px-2
            py-1
            font-mono
            text-[8px]
            uppercase
            tracking-[0.1em]
          "
          style={{
            color: config.color,
            borderColor: `${config.color}35`,
            background: `${config.color}08`,
          }}
        >
          {config.label}
        </span>

        <ArrowUpRight
          size={15}
          className="
            text-muted-foreground
            transition-all
            duration-200
            group-hover:-translate-y-0.5
            group-hover:translate-x-0.5
            group-hover:text-primary
          "
        />
      </div>

      {/* Mobile arrow */}

      <ArrowUpRight
        size={15}
        className="
          mt-1
          shrink-0
          text-muted-foreground
          sm:hidden
        "
      />
    </motion.a>
  );
}

/* ============================================================
   RESOURCE GROUP
============================================================ */

function ResourceGroupSection({
  group,
  items,
  index,
}: {
  group: string;
  items: ResourceItem[];
  index: number;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 15,
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
        delay: index * 0.05,
      }}
      className="mb-14"
    >
      {/* Group heading */}

      <div className="mb-3 flex items-end justify-between border-b border-border pb-3">
        <div>
          <span className="mono-label">
            Collection {String(index + 1).padStart(2, "0")}
          </span>

          <h2
            className="
              mt-1
              font-display
              text-xl
              font-bold
              text-foreground
            "
          >
            {group}
          </h2>
        </div>

        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
          {items.length}{" "}
          {items.length === 1
            ? "resource"
            : "resources"}
        </span>
      </div>

      {/* Items */}

      <div className="overflow-hidden border-x border-b border-border bg-background">
        {items.map((item, itemIndex) => (
          <ResourceRow
            key={`${item.title}-${itemIndex}`}
            item={item}
            index={itemIndex}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  searchActive,
  clearSearch,
}: {
  searchActive: boolean;
  clearSearch: () => void;
}) {
  return (
    <div className="border border-dashed border-border bg-card px-6 py-16 text-center">
      <div className="mx-auto mb-5 grid h-12 w-12 place-items-center border border-border bg-background">
        <BookOpen
          size={19}
          className="text-muted-foreground"
        />
      </div>

      <h3 className="font-display text-xl font-bold">
        {searchActive
          ? "No resources found"
          : "Resources are being prepared"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {searchActive
          ? "Try a different search term or browse all available resources."
          : "Useful learning resources will appear here soon."}
      </p>

      {searchActive && (
        <button
          type="button"
          onClick={clearSearch}
          className="btn-secondary mt-6"
        >
          <X size={13} />
          Clear Search
        </button>
      )}
    </div>
  );
}

/* ============================================================
   LOADING
============================================================ */

function LoadingState() {
  return (
    <div className="space-y-10">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          <div className="mb-4 border-b border-border pb-4">
            <div className="shimmer h-3 w-24" />
            <div className="mt-2 shimmer h-6 w-40" />
          </div>

          <div className="border border-border">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="
                  flex
                  gap-4
                  border-b
                  border-border
                  p-5
                  last:border-b-0
                "
              >
                <div className="shimmer h-10 w-10 shrink-0" />

                <div className="flex-1">
                  <div className="shimmer h-4 w-48" />
                  <div className="mt-3 shimmer h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function Resources() {
  const [resources, setResources] = useState<
    ResourceGroup[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [activeType, setActiveType] =
    useState("ALL");

  /* ==========================================================
     FETCH
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const fetchResources = async () => {
      try {
        const response = await fetch(
          getApiUrl("/api/resources")
        );

        if (!response.ok) {
          throw new Error(
            "Failed to fetch resources"
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Invalid resources response"
          );
        }

        const grouped: Record<
          string,
          ResourceItem[]
        > = {};

        data.forEach((item: any) => {
          const groupName =
            item.group_name || "Resources";

          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }

          grouped[groupName].push({
            title:
              item.title || "Untitled Resource",
            description:
              item.description || "",
            type:
              item.resource_type || "RESOURCE",
            href: item.url || "#",
          });
        });

        const formatted =
          Object.entries(grouped).map(
            ([group, items]) => ({
              group,
              items,
            })
          );

        if (mounted) {
          setResources(formatted);
        }
      } catch (error) {
        console.error(
          "Failed to fetch resources:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchResources();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     TYPES
  ========================================================== */

  const resourceTypes = useMemo(() => {
    const types = new Set<string>();

    resources.forEach((group) => {
      group.items.forEach((item) => {
        if (item.type) {
          types.add(
            item.type.toUpperCase()
          );
        }
      });
    });

    return Array.from(types);
  }, [resources]);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredGroups = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return resources
      .map((group) => {
        const filteredItems =
          group.items.filter((item) => {
            const matchesSearch =
              !query ||
              item.title
                .toLowerCase()
                .includes(query) ||
              item.description
                .toLowerCase()
                .includes(query) ||
              item.type
                .toLowerCase()
                .includes(query);

            const matchesType =
              activeType === "ALL" ||
              item.type.toUpperCase() ===
                activeType;

            return (
              matchesSearch &&
              matchesType
            );
          });

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter(
        (group) => group.items.length > 0
      );
  }, [
    resources,
    search,
    activeType,
  ]);

  /* ==========================================================
     TOTALS
  ========================================================== */

  const totalResources = resources.reduce(
    (total, group) =>
      total + group.items.length,
    0
  );

  const filteredCount =
    filteredGroups.reduce(
      (total, group) =>
        total + group.items.length,
      0
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <section
      id="resources"
      className="
        relative
        overflow-hidden
        border-t
        border-border
        bg-background
        py-16
      "
    >
      {/* Subtle editorial glow */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-[-180px]
          top-[-180px]
          h-[500px]
          w-[500px]
          rounded-full
          opacity-[0.035]
          blur-3xl
        "
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)), transparent 68%)",
        }}
      />

      <div className="section-container relative z-10 max-w-6xl mx-auto px-6">
        {/* ==================================================
            HEADER
        ================================================== */}

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
            margin: "-80px",
          }}
          transition={{
            duration: 0.55,
          }}
          className="mb-12"
        >
          {/* Eyebrow */}

          <div className="section-label text-sm uppercase tracking-widest text-primary mb-4 block">
            05 — Resources
          </div>

          {/* Heading */}

          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                Curated{" "}
                <span className="text-primary">
                  Resources
                </span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-muted-foreground">
              The resources we actually recommend
              to our members — courses, books,
              papers, tools and more. Everything
              here is free to access.
            </p>
          </div>

          {/* Stats */}

          <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-border pt-5">
            <div className="flex items-center gap-2">
              <strong className="font-mono text-lg font-semibold text-foreground">
                {String(totalResources).padStart(
                  2,
                  "0"
                )}
              </strong>

              <span className="text-xs uppercase tracking-widest text-muted-foreground ml-2">
                Resources
              </span>
            </div>

            <span className="text-border">
              /
            </span>

            <div className="flex items-center gap-2">
              <strong className="font-mono text-lg font-semibold text-foreground">
                {String(
                  resources.length
                ).padStart(2, "0")}
              </strong>

              <span className="text-xs uppercase tracking-widest text-muted-foreground ml-2">
                Collections
              </span>
            </div>

            <span className="text-border">
              /
            </span>

            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              Open access
            </span>
          </div>
        </motion.div>

        {/* ==================================================
            SEARCH / FILTER
        ================================================== */}

        {!loading &&
          resources.length > 0 && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="mb-10"
            >
              <div className="flex flex-col gap-3 lg:flex-row">
                {/* Search */}

                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-muted-foreground
                    "
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search resources..."
                    className="
                      input-field
                      h-11
                      pl-11
                      pr-10
                      w-full
                      border
                      border-border
                      bg-background
                      text-foreground
                      focus-visible:ring-1
                      focus-visible:ring-primary
                      rounded-md
                    "
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                      className="
                        absolute
                        right-3
                        top-1/2
                        grid
                        h-7
                        w-7
                        -translate-y-1/2
                        place-items-center
                        text-muted-foreground
                        hover:text-foreground
                      "
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Type filter */}

                <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[620px] scrollbar-hide">
                  {[
                    "ALL",
                    ...resourceTypes,
                  ].map((type) => {
                    const active =
                      activeType === type;

                    const config =
                      RESOURCE_TYPE_CONFIG[
                        type
                      ] ||
                      DEFAULT_RESOURCE_TYPE;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setActiveType(
                            type
                          )
                        }
                        className={`
                          shrink-0
                          border
                          px-3
                          py-2
                          font-mono
                          text-[9px]
                          uppercase
                          tracking-[0.08em]
                          transition-all
                          duration-200
                          rounded-sm
                          ${
                            active
                              ? "border-primary bg-primary text-primary-foreground font-semibold"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }
                        `}
                        style={
                          !active &&
                          type !== "ALL"
                            ? {
                                color:
                                  config.color,
                              }
                            : undefined
                        }
                      >
                        {type === "ALL"
                          ? "All"
                          : config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter status */}

              {(search ||
                activeType !==
                  "ALL") && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                    Showing{" "}
                    {filteredCount} of{" "}
                    {totalResources} resources
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveType(
                        "ALL"
                      );
                    }}
                    className="
                      font-mono
                      text-[9px]
                      uppercase
                      tracking-[0.08em]
                      text-primary
                      hover:underline
                    "
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </motion.div>
          )}

        {/* ==================================================
            CONTENT
        ================================================== */}

        {loading ? (
          <LoadingState />
        ) : filteredGroups.length === 0 ? (
          <EmptyState
            searchActive={
              Boolean(search) ||
              activeType !== "ALL"
            }
            clearSearch={() => {
              setSearch("");
              setActiveType("ALL");
            }}
          />
        ) : (
          <div>
            {filteredGroups.map(
              (group, index) => (
                <ResourceGroupSection
                  key={group.group}
                  group={group.group}
                  items={group.items}
                  index={index}
                />
              )
            )}
          </div>
        )}

        {/* ==================================================
            FOOTER
        ================================================== */}

        {!loading &&
          filteredGroups.length >
            0 && (
            <div className="mt-4 border-t border-border pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  Curated by AI Club / DAIICT
                </span>

                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  Free resources only
                </span>
              </div>


            </div>
          )}
      </div>
    </section>
  );
}
