import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';

import type { Member } from './Team';

interface TeamGlobeProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  isHomepage?: boolean;
}

/* ============================================================
   ROLE META
============================================================ */

const roleMeta: Record<string, { label: string; classes: string }> = {
  'Convenor': {
    label: 'Convenor',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },

  'Deputy Convenor': {
    label: 'Deputy Convenor',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
  },

  'Core Member': {
    label: 'Core Member',
    classes: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },

  'Extended Core Member': {
    label: 'Extended Core Member',
    classes: 'bg-purple-50 text-purple-700 border-purple-200',
  },

  'Member': {
    label: 'Member',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },

  'Ex Convenor': {
    label: 'Ex Convenor',
    classes: 'bg-amber-100/70 text-amber-800 border-amber-300',
  },

  'Ex Deputy Convenor': {
    label: 'Ex Deputy Convenor',
    classes: 'bg-blue-100/70 text-blue-800 border-blue-300',
  },

  'Ex Core Member': {
    label: 'Ex Core Member',
    classes: 'bg-indigo-100/70 text-indigo-800 border-indigo-300',
  },

  'Alumni': {
    label: 'Alumni',
    classes: 'bg-emerald-100/80 text-emerald-800 border-emerald-300',
  },
};

/* ============================================================
   PHOTO OVERRIDES
============================================================ */

const MEMBER_PHOTO_OVERRIDES: Record<string, string> = {
  'Anmol Ghogare':
    'https://lh3.googleusercontent.com/d/1ff8W6U26StDc86Im77NNMcUd6jCLxCgx',

  'Bhagyashree Khemwani':
    '/bhagyashree-khemwani.png?v=latest',
};

/* ============================================================
   GOOGLE DRIVE URL HANDLER
============================================================ */

function getDriveUrls(url: string): string[] {
  if (!url) return [];

  const driveMatch = url.match(
    /(?:id=|\/d\/|src=)([a-zA-Z0-9_-]{25,})/
  );

  if (driveMatch) {
    const id = driveMatch[1];

    return [
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=800`,
      `https://drive.google.com/uc?export=view&id=${id}`,
    ];
  }

  return [url];
}

/* ============================================================
   NETWORK POINT
============================================================ */

interface NetworkPoint {
  x: number;
  y: number;
  z: number;
}

/* ============================================================
   CYLINDRICAL NEURAL NETWORK
============================================================ */

function NeuralNetwork({
  radius,
  height,
}: {
  radius: number;
  height: number;
}) {
  const points = useMemo<NetworkPoint[]>(() => {
    const result: NetworkPoint[] = [];

    const columns = 10;
    const rows = 4;

    for (let row = 0; row < rows; row++) {
      const y =
        ((row / (rows - 1)) - 0.5) *
        height *
        0.65;

      for (let column = 0; column < columns; column++) {
        const angle =
          (column / columns) *
          Math.PI *
          2;

        const x =
          Math.sin(angle) *
          radius *
          0.82;

        const z =
          Math.cos(angle) *
          radius *
          0.82;

        result.push({
          x,
          y,
          z,
        });
      }
    }

    return result;
  }, [radius, height]);

  const connections = useMemo(() => {
    const result: {
      a: NetworkPoint;
      b: NetworkPoint;
    }[] = [];

    points.forEach((point, index) => {
      const nearest = points
        .map((target, targetIndex) => {
          if (index === targetIndex) return null;

          const dx = target.x - point.x;
          const dy = target.y - point.y;
          const dz = target.z - point.z;

          const distance = Math.sqrt(
            dx * dx +
            dy * dy +
            dz * dz
          );

          return {
            targetIndex,
            distance,
          };
        })
        .filter(Boolean)
        .sort(
          (a: any, b: any) =>
            a.distance - b.distance
        )
        .slice(0, 2);

      nearest.forEach((item: any) => {
        if (index < item.targetIndex) {
          result.push({
            a: point,
            b: points[item.targetIndex],
          });
        }
      });
    });

    return result;
  }, [points]);

  return (
    <>
      {/* NETWORK LINES */}

      {connections.map(({ a, b }, index) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;

        const length = Math.sqrt(
          dx * dx +
          dy * dy +
          dz * dz
        );

        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const cz = (a.z + b.z) / 2;

        const yaw =
          Math.atan2(dz, dx) *
          (180 / Math.PI);

        const pitch =
          -Math.atan2(
            dy,
            Math.sqrt(dx * dx + dz * dz)
          ) *
          (180 / Math.PI);

        return (
          <div
            key={`network-line-${index}`}
            className="
              pointer-events-none
              absolute
              left-0
              top-0
              h-px
              origin-center
              bg-indigo-300/20
            "
            style={{
              width: `${length}px`,
              marginLeft: `${-length / 2}px`,
              marginTop: '-0.5px',

              transform: `
                translate3d(
                  ${cx}px,
                  ${cy}px,
                  ${cz}px
                )
                rotateY(${yaw}deg)
                rotateZ(${pitch}deg)
              `,

              transformStyle: 'preserve-3d',
            }}
          />
        );
      })}

      {/* NETWORK NODES */}

      {points.map((point, index) => (
        <div
          key={`network-node-${index}`}
          className="
            pointer-events-none
            absolute
            left-0
            top-0
            h-[4px]
            w-[4px]
            rounded-full
            bg-indigo-400/40
            shadow-[0_0_10px_rgba(99,102,241,0.20)]
          "
          style={{
            marginLeft: '-2px',
            marginTop: '-2px',

            transform: `
              translate3d(
                ${point.x}px,
                ${point.y}px,
                ${point.z}px
              )
            `,

            transformStyle: 'preserve-3d',
          }}
        />
      ))}
    </>
  );
}

/* ============================================================
   MAIN CYLINDER
============================================================ */

export default function TeamGlobe({
  members,
  onSelectMember,
  isHomepage = false,
}: TeamGlobeProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  /* ----------------------------------------------------------
     ONLY Y ROTATION
  ---------------------------------------------------------- */

  const [rotationY, setRotationY] =
    useState(0);

  const [isDragging, setIsDragging] =
    useState(false);

  const dragStart = useRef({
    x: 0,
    rotation: 0,
  });

  const autoRotateRef =
    useRef<number | null>(null);

  const lastTimeRef =
    useRef<number>(0);

  /* ----------------------------------------------------------
     RESPONSIVE CONTAINER SIZE
  ---------------------------------------------------------- */

  const [size, setSize] = useState({
    width: 1200,
    height: 560,
  });

  const measureContainer =
    useCallback(() => {
      if (!containerRef.current) return;

      const rect =
        containerRef.current.getBoundingClientRect();

      setSize({
        width: rect.width,
        height: rect.height,
      });
    }, []);

  useEffect(() => {
    measureContainer();

    const observer =
      new ResizeObserver(measureContainer);

    if (containerRef.current) {
      observer.observe(
        containerRef.current
      );
    }

    return () =>
      observer.disconnect();
  }, [measureContainer]);

  /* ----------------------------------------------------------
     CYLINDER SIZE
     
     IMPORTANT:
     Radius depends mainly on WIDTH.
     It does NOT increase container height.
  ---------------------------------------------------------- */

  const cylinderRadius = useMemo(() => {
    return Math.max(
      420,
      Math.min(
        size.width * 0.44,
        780
      )
    );
  }, [size.width]);

  /* ----------------------------------------------------------
     CARD SIZE
     
     Card size uses BOTH width and fixed height,
     but never changes the container height.
  ---------------------------------------------------------- */

  const cardHeight = useMemo(() => {
    return Math.max(
      52,
      Math.min(
        82,
        size.height * 0.15
      )
    );
  }, [size.height]);

  const cardWidth = useMemo(() => {
    return Math.max(
      42,
      Math.min(
        64,
        cardHeight * 0.78
      )
    );
  }, [cardHeight]);

  /* ----------------------------------------------------------
     CYLINDER ROWS
  ---------------------------------------------------------- */

  const rows = 7;

  /*
   * Number of cards visible around cylinder.
   *
   * This is deliberately based on width.
   * Wider screen = more horizontal density.
   */

  const cardsPerRow = useMemo(() => {
    return Math.max(
      20,
      Math.min(
        32,
        Math.ceil(size.width / 50)
      )
    );
  }, [size.width]);

  /* ----------------------------------------------------------
     CREATE CYLINDER CARDS
  ---------------------------------------------------------- */

  const items = useMemo(() => {
    if (!members.length) return [];

    const result: {
      member: Member;
      uniqueId: string;
      angle: number;
      y: number;
    }[] = [];

    // Create a randomized pool of members large enough to fill the cylinder
    const totalSlots = rows * cardsPerRow;
    const randomizedPool: Member[] = [];
    while (randomizedPool.length < totalSlots) {
      // Shuffle members and add to pool
      randomizedPool.push(...[...members].sort(() => Math.random() - 0.5));
    }

    let poolIndex = 0;

    for (
      let row = 0;
      row < rows;
      row++
    ) {
      const verticalPosition =
        row / (rows - 1);

      /*
       * Upper and lower rows are slightly
       * closer to the cylinder center.
       */

      const y =
        (verticalPosition - 0.5) *
        size.height *
        0.45;

      for (
        let column = 0;
        column < cardsPerRow;
        column++
      ) {
        const member = randomizedPool[poolIndex++];

        const angle =
          (column / cardsPerRow) *
            360 +
          (row % 2 === 0
            ? 0
            : 360 / cardsPerRow / 2);

        result.push({
          member,

          uniqueId:
            `${member.id}-${row}-${column}`,

          angle,

          y,
        });
      }
    }

    return result;
  }, [
    members,
    cardsPerRow,
    size.height,
  ]);

  /* ----------------------------------------------------------
     RANDOM AI SPOTLIGHT EFFECT
  ---------------------------------------------------------- */
  const [activeHighlights, setActiveHighlights] = useState<Array<{ uniqueId: string, color: string }>>([]);

  useEffect(() => {
    if (!items.length) return;

    let timeoutId: NodeJS.Timeout;

    const neonColors = [
      '249, 115, 22',  // orange
      '59, 130, 246',  // blue
      '16, 185, 129',  // emerald
      '139, 92, 246',  // violet
      '236, 72, 153',  // pink
      '6, 182, 212',   // cyan
      '234, 179, 8',   // yellow
      '239, 68, 68',   // red
      '132, 204, 22',  // lime
    ];

    const spawnHighlight = () => {
      const randomIndex = Math.floor(Math.random() * items.length);
      const uniqueId = items[randomIndex].uniqueId;
      const color = neonColors[Math.floor(Math.random() * neonColors.length)];

      const newHighlight = { uniqueId, color };

      setActiveHighlights(prev => [...prev, newHighlight]);

      setTimeout(() => {
        setActiveHighlights(prev => prev.filter(h => h !== newHighlight));
      }, 1000);

      // Fire a new highlight every 50ms to maintain ~20 active cards
      timeoutId = setTimeout(spawnHighlight, 50);
    };

    // Initial delay
    timeoutId = setTimeout(spawnHighlight, 1000);

    return () => clearTimeout(timeoutId);
  }, [items]);

  /* ----------------------------------------------------------
     AUTO ROTATION
  ---------------------------------------------------------- */

  useEffect(() => {
    if (isDragging) {
      if (autoRotateRef.current !== null) {
        cancelAnimationFrame(
          autoRotateRef.current
        );
      }

      autoRotateRef.current = null;

      return;
    }

    const animate = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const delta =
        time - lastTimeRef.current;

      lastTimeRef.current = time;

      setRotationY(
        (previous) =>
          previous + delta * 0.009
      );

      autoRotateRef.current =
        requestAnimationFrame(
          animate
        );
    };

    autoRotateRef.current =
      requestAnimationFrame(animate);

    return () => {
      if (
        autoRotateRef.current !== null
      ) {
        cancelAnimationFrame(
          autoRotateRef.current
        );
      }
    };
  }, [isDragging]);

  /* ----------------------------------------------------------
     POINTER DOWN
  ---------------------------------------------------------- */

  const handlePointerDown = (
    event: React.PointerEvent
  ) => {
    /*
     * Don't start cylinder dragging when
     * clicking directly on a member card.
     */

    const target =
      event.target as HTMLElement;

    if (
      target.closest(
        '[data-member-card="true"]'
      )
    ) {
      return;
    }

    setIsDragging(true);

    dragStart.current = {
      x: event.clientX,
      rotation: rotationY,
    };

    containerRef.current?.setPointerCapture(
      event.pointerId
    );
  };

  /* ----------------------------------------------------------
     POINTER MOVE
     
     ONLY X IS USED.
     
     Y movement is completely ignored.
  ---------------------------------------------------------- */

  const handlePointerMove = (
    event: React.PointerEvent
  ) => {
    if (!isDragging) return;

    const delta =
      event.clientX -
      dragStart.current.x;

    setRotationY(
      dragStart.current.rotation +
        delta * 0.30
    );
  };

  /* ----------------------------------------------------------
     POINTER UP
  ---------------------------------------------------------- */

  const handlePointerUp = (
    event: React.PointerEvent
  ) => {
    setIsDragging(false);

    if (
      containerRef.current?.hasPointerCapture(
        event.pointerId
      )
    ) {
      containerRef.current.releasePointerCapture(
        event.pointerId
      );
    }

    lastTimeRef.current = 0;
  };

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <div
      ref={containerRef}
      className="
        relative

        h-full
        w-full

        overflow-hidden

        select-none

        cursor-grab
        active:cursor-grabbing
      "
      style={{
        perspective: '1200px',

        /*
         * Horizontal drag only.
         */

        touchAction: 'pan-y',
      }}
      onPointerDown={
        handlePointerDown
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerUp={
        handlePointerUp
      }
      onPointerCancel={
        handlePointerUp
      }
    >
      {/* =====================================================
          CYLINDER LIGHT
      ====================================================== */}

      <div
        className="
          pointer-events-none

          absolute
          left-1/2
          top-1/2

          -translate-x-1/2
          -translate-y-1/2

          rounded-[50%]

          bg-white/75

          blur-[1px]

          shadow-[
            0_0_100px_30px_rgba(255,255,255,0.65)
          ]
        "
        style={{
          width:
            `${Math.min(
              size.width * 0.78,
              1200
            )}px`,

          height:
            `${Math.min(
              size.height * 0.58,
              330
            )}px`,
        }}
      />

      {/* =====================================================
          HORIZONTAL CYLINDER ORBIT
      ====================================================== */}

      <div
        className="
          pointer-events-none

          absolute

          left-1/2
          top-1/2

          -translate-x-1/2
          -translate-y-1/2

          rounded-[50%]

          border
          border-indigo-200/35
        "
        style={{
          width:
            `${Math.min(
              size.width * 0.88,
              1350
            )}px`,

          height:
            `${Math.min(
              size.height * 0.58,
              330
            )}px`,

          transform:
            'translate(-50%, -50%) rotateX(72deg)',
        }}
      />

      {/* =====================================================
          SECOND ORBIT
      ====================================================== */}

      <div
        className="
          pointer-events-none

          absolute

          left-1/2
          top-1/2

          -translate-x-1/2
          -translate-y-1/2

          rounded-[50%]

          border
          border-indigo-100/45
        "
        style={{
          width:
            `${Math.min(
              size.width * 0.72,
              1100
            )}px`,

          height:
            `${Math.min(
              size.height * 0.42,
              240
            )}px`,

          transform:
            'translate(-50%, -50%) rotateX(72deg)',
        }}
      />

      {/* =====================================================
          INSTRUCTION
      ====================================================== */}

      {isHomepage && (
        <div
          className="
            pointer-events-none

            absolute

            left-1/2
            top-4

            z-[100]

            -translate-x-1/2

            whitespace-nowrap

            rounded-full

            border
            border-indigo-100

            bg-white/85

            px-4
            py-1.5

            font-mono

            text-[9px]
            font-bold

            uppercase

            tracking-[0.16em]

            text-indigo-400

            shadow-sm

            backdrop-blur-md
          "
        >
          ← Drag horizontally →

          <span className="mx-2 text-slate-300">
            •
          </span>

          Click for details
        </div>
      )}

      {/* =====================================================
          3D CYLINDER
      ====================================================== */}

      <div
        className="
          absolute

          left-1/2
          top-1/2

          z-20

          h-0
          w-0
        "
        style={{
          transformStyle:
            'preserve-3d',

          transform: `
            translate3d(0, 0, 0)
            rotateY(${rotationY}deg)
          `,

          transition: isDragging
            ? 'none'
            : 'transform 0.08s linear',
        }}
      >
        {/* ===================================================
            NETWORK
        ==================================================== */}

        <NeuralNetwork
          radius={cylinderRadius}
          height={size.height}
        />

        {/* ===================================================
            MEMBER CARDS
        ==================================================== */}

        {items.map(
          ({
            member,
            uniqueId,
            angle,
            y,
          }) => {
            const meta =
              roleMeta[
                member.role
              ] || {
                label: member.role,
                classes:
                  'bg-slate-100 text-slate-600 border-slate-200',
              };

            const normalizedName =
              (member.name || '')
                .trim()
                .toLowerCase();

            const isAnmol =
              normalizedName.includes(
                'anmol'
              ) ||
              normalizedName.includes(
                'ghogare'
              );

            const overridePhoto =
              isAnmol
                ? MEMBER_PHOTO_OVERRIDES[
                    'Anmol Ghogare'
                  ]
                : Object.entries(
                    MEMBER_PHOTO_OVERRIDES
                  ).find(
                    ([key]) =>
                      key.toLowerCase() ===
                      normalizedName
                  )?.[1];

            const rawPhoto =
              overridePhoto ||
              member.photo ||
              '';

            const currentUrl =
              getDriveUrls(
                rawPhoto
              )[0] || '';

            const initials =
              member.name
                .split(' ')
                .map(
                  (part) =>
                    part[0]
                )
                .filter(Boolean)
                .join('')
                .slice(0, 2)
                .toUpperCase();

            /*
             * Important:
             *
             * rotateY(angle)
             * translateZ(radius)
             *
             * creates the horizontal cylinder.
             */

            // activeHighlights array tracks active cards by their specific uniqueId
            const activeData = activeHighlights.find(hc => hc.uniqueId === uniqueId);
            const isActive = !!activeData;
            const cardGlowColor = activeData ? activeData.color : '249, 115, 22';

            return (
              <div
                key={uniqueId}
                data-member-card="true"
                className={`
                  absolute
                  left-0
                  top-0
                  flex
                  cursor-pointer
                  flex-col
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-[14px]
                  bg-white
                  p-1.5
                  transition-all
                  duration-[600ms]
                  ease-out
                  hover:border-indigo-300
                  hover:shadow-[0_16px_38px_rgba(99,102,241,0.18)]
                  ${isActive ? 'z-[60]' : 'z-auto'}
                `}
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  marginLeft: `${-cardWidth / 2}px`,
                  marginTop: `${-cardHeight / 2}px`,

                  border: isActive 
                    ? `1px solid rgba(${cardGlowColor}, 1)` 
                    : '1px solid #e2e8f0',
                    
                  boxShadow: isActive
                    ? `0 0 0 2px rgba(${cardGlowColor},0.40), 0 0 36px 4px rgba(${cardGlowColor},0.60)`
                    : '0 10px 28px rgba(51,65,85,0.12)',

                  transform: `
                    rotateY(${angle}deg)
                    translateZ(${cylinderRadius}px)
                    translateY(${y}px)
                    ${isActive ? 'scale(1.04)' : 'scale(1)'}
                  `,

                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
                onClick={(event) => {
                  event.stopPropagation();

                  onSelectMember(
                    member
                  );
                }}
              >
                {/* =================================================
                    PHOTO
                ================================================== */}

                <div
                  className="
                    relative

                    mb-1.5

                    shrink-0

                    overflow-hidden

                    rounded-full

                    border
                    border-slate-200

                    bg-slate-50

                    ring-2
                    ring-indigo-500/10

                    ring-offset-1

                    ring-offset-white
                  "
                  style={{
                    width:
                      `${Math.floor(
                        cardWidth *
                          0.40
                      )}px`,

                    height:
                      `${Math.floor(
                        cardWidth *
                          0.40
                      )}px`,
                  }}
                >
                  {currentUrl ? (
                    <img
                      src={currentUrl}
                      alt={member.name}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className={`
                        h-full
                        w-full
                        object-cover

                        ${
                          normalizedName.includes(
                            'bhagyashree'
                          )
                            ? 'object-center'
                            : 'object-top'
                        }
                      `}
                    />
                  ) : (
                    <span
                      className="
                        flex
                        h-full
                        w-full

                        items-center
                        justify-center

                        font-bold

                        text-indigo-500
                      "
                      style={{
                        fontSize:
                          `${Math.max(
                            8,
                            cardWidth *
                              0.10
                          )}px`,
                      }}
                    >
                      {initials}
                    </span>
                  )}
                </div>

                {/* =================================================
                    NAME
                ================================================== */}

                <h4
                  className="
                    line-clamp-2

                    w-full

                    text-center

                    font-sans
                    font-bold

                    leading-tight

                    text-slate-800
                  "
                  style={{
                    fontSize:
                      `${Math.max(
                        7,
                        cardWidth *
                          0.085
                      )}px`,
                  }}
                >
                  {member.name}
                </h4>

                {/* =================================================
                    ROLE
                ================================================== */}

                <span
                  className={`
                    mt-1

                    max-w-full

                    truncate

                    rounded-full

                    border

                    px-1.5
                    py-0.5

                    text-center

                    font-bold

                    uppercase

                    tracking-wide

                    ${meta.classes}
                  `}
                  style={{
                    fontSize:
                      `${Math.max(
                        5.5,
                        cardWidth *
                          0.058
                      )}px`,
                  }}
                >
                  {meta.label}
                </span>
              </div>
            );
          }
        )}
      </div>

      {/* =====================================================
          SIDE FADE
      ====================================================== */}

      <div
        className="
          pointer-events-none

          absolute
          inset-y-0
          left-0

          z-[60]

          w-[10%]

          bg-gradient-to-r

          from-[#ECF0F7]

          via-[#ECF0F7]/65

          to-transparent
        "
      />

      <div
        className="
          pointer-events-none

          absolute
          inset-y-0
          right-0

          z-[60]

          w-[10%]

          bg-gradient-to-l

          from-[#ECF0F7]

          via-[#ECF0F7]/65

          to-transparent
        "
      />

      {/* =====================================================
          CENTER LIGHT
      ====================================================== */}

      <div
        className="
          pointer-events-none

          absolute

          left-1/2
          top-1/2

          z-10

          -translate-x-1/2
          -translate-y-1/2

          rounded-full

          bg-indigo-200/10

          blur-3xl
        "
        style={{
          width:
            `${Math.min(
              size.width * 0.45,
              700
            )}px`,

          height:
            `${Math.min(
              size.height * 0.60,
              320
            )}px`,
        }}
      />
    </div>
  );
}
