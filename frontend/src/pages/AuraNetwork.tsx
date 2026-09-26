import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { AnimatedAuraCore } from '../components/AnimatedAuraCore';
import { getInitials, nodeRoles, teamMembers } from './auraParts';

gsap.registerPlugin(MotionPathPlugin);

type AuraNetworkProps = {
  onSelectNode: (index: number) => void;
};

export type AuraNode = typeof teamMembers[number] & {
  role: (typeof nodeRoles)[number];
  x: number;
  y: number;
};

export const createTeamNodes = (): AuraNode[] =>
  teamMembers.map((member, index) => {
    const angle = (index * Math.PI * 2) / teamMembers.length - Math.PI / 2;
    const radius = 38;

    return {
      ...member,
      role: nodeRoles[index] ?? 'Member',
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });

export const AuraNetwork = ({ onSelectNode }: AuraNetworkProps) => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const nodes = useMemo(createTeamNodes, []);

  /*
   * AURA NETWORK
   *
   * Important accuracy rule:
   * - Node positions are fixed.
   * - SVG uses the exact same 0..100 coordinate system as the nodes.
   * - No GSAP transform is ever applied to the node containers themselves.
   *
   * This prevents the original "lines are here but people moved somewhere else"
   * problem while keeping the animated rings, pulses and travelling particles.
   */
  useEffect(() => {
    // If you need a loading state, pass it as a prop or ignore it here if not applicable
    if (shouldReduceMotion) return;

    const network = containerRef.current;
    if (!network) return;

    let mounted = true;

    const svg = network.querySelector('#flowSvg') as SVGSVGElement | null;
    const pathContainer = network.querySelector('#flowPaths') as SVGGElement | null;
    const particleContainer = network.querySelector('#particles') as SVGGElement | null;
    const auraCore = network.querySelector('#auraCore') as HTMLElement | null;
    const cards = Array.from(
      network.querySelectorAll<HTMLElement>('.person-card'),
    );

    if (!svg || !pathContainer || !particleContainer || !auraCore || !cards.length) {
      return;
    }

    const timelines: gsap.core.Animation[] = [];
    const nodeListeners: Array<() => void> = [];

    const clearNetwork = () => {
      timelines.forEach((animation) => animation.kill());
      timelines.length = 0;
      pathContainer.replaceChildren();
      particleContainer.replaceChildren();
    };

    const createPath = (
      d: string,
      className: string,
      opacity?: number,
    ): SVGPathElement => {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );

      path.setAttribute('d', d);
      path.setAttribute('class', className);

      if (opacity !== undefined) {
        path.style.opacity = String(opacity);
      }

      return path;
    };

    const createParticle = () => {
      const group = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g',
      );

      const halo = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      halo.setAttribute('r', '1.05');
      halo.setAttribute('fill', 'rgba(255, 146, 0, 0.28)');
      halo.setAttribute('filter', 'url(#particleGlow)');

      const core = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      core.setAttribute('r', '0.32');
      core.setAttribute('fill', '#fff7e8');

      group.append(halo, core);
      group.style.opacity = '0';
      particleContainer.appendChild(group);

      return group;
    };

    const curve = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      bend = 0.16,
    ) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 0.001) {
        return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
      }

      const normalX = -dy / distance;
      const normalY = dx / distance;
      const offset = Math.min(distance * bend, 9);

      const cx = (from.x + to.x) / 2 + normalX * offset;
      const cy = (from.y + to.y) / 2 + normalY * offset;

      return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
    };

    const nodePoint = (index: number) => ({
      x: nodes[index].x,
      y: nodes[index].y,
    });

    /*
     * The AURA core is always exactly at 50/50.
     * Do not calculate it from getBoundingClientRect().
     * That was the source of the visual drift when the network/card animation
     * changed transforms.
     */
    const auraPoint = { x: 50, y: 50 };

    const triggerNode = (card: HTMLElement) => {
      const ring = card.querySelector<HTMLElement>('.neural-node-ring');
      const glow = card.querySelector<HTMLElement>('.neural-node-glow');
      const portrait = card.querySelector<HTMLElement>('.neural-node-portrait');

      if (!ring || !glow || !portrait) return;

      gsap.killTweensOf([ring, glow, portrait]);

      const hit = gsap.timeline();
      timelines.push(hit);

      hit
        .fromTo(
          ring,
          {
            scale: 1,
            borderColor: 'rgba(255,146,0,0.3)',
            boxShadow: '0 0 15px rgba(255,146,0,0.1)',
          },
          {
            scale: 1.2,
            borderColor: 'rgba(255,146,0,1)',
            boxShadow: '0 0 32px rgba(255,146,0,0.7)',
            duration: 0.25,
            ease: 'power2.out',
          },
        )
        .to(ring, {
          scale: 1,
          borderColor: 'rgba(255,146,0,0.3)',
          boxShadow: '0 0 15px rgba(255,146,0,0.1)',
          duration: 0.4,
          ease: 'power2.out',
        })
        .fromTo(
          glow,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1.15,
            duration: 0.22,
            ease: 'power2.out',
          },
          0,
        )
        .to(
          glow,
          {
            opacity: 0,
            scale: 1,
            duration: 0.5,
            ease: 'power2.out',
          },
          0.2,
        )
        .to(
          portrait,
          {
            scale: 1.06,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
          },
          0,
        );
    };

    const triggerAura = () => {
      const emitter = network.querySelector<HTMLElement>(
        '.aura-pulse-emitter',
      );

      if (emitter) {
        gsap.killTweensOf(emitter);
        const pulse = gsap.fromTo(
          emitter,
          {
            scale: 0.55,
            opacity: 0.85,
            borderWidth: '3px',
          },
          {
            scale: 3.2,
            opacity: 0,
            borderWidth: '1px',
            duration: 1.8,
            ease: 'power2.out',
          },
        );
        timelines.push(pulse);
      }

      gsap.killTweensOf(auraCore);
      /*
       * Do not animate x/y/scale on the core container.
       * Its translate(-50%, -50%) is the positioning anchor.
       * The core already has its own internal animation; here we only
       * add a short brightness response.
       */
      const corePulse = gsap
        .timeline()
        .to(auraCore, {
          filter: 'brightness(1.22)',
          duration: 0.28,
          ease: 'power2.out',
        })
        .to(auraCore, {
          filter: 'brightness(1)',
          duration: 0.6,
          ease: 'power2.inOut',
        });

      timelines.push(corePulse);
    };

    const buildNetwork = () => {
      clearNetwork();

      /*
       * Base topology.
       * Every person has a direct AURA connection.
       * A small number of secondary connections create the same neural-web
       * feel without turning the network into an inaccurate random graph.
       */
      const baseConnections: Array<[number | 'aura', number | 'aura']> = [
        // Connect everyone to the aura core
        ['aura', 0],
        ['aura', 1],
        ['aura', 2],
        ['aura', 3],
        ['aura', 4],
        ['aura', 5],
        ['aura', 6],
        
        // Original cross-network connection
        [1, 3],
      ];
      
      // Add a circle path connecting all persons in order
      for (let i = 0; i < nodes.length; i++) {
        baseConnections.push([i, (i + 1) % nodes.length]);
      }

      baseConnections.forEach(([from, to]) => {
        const p1 = from === 'aura' ? auraPoint : nodePoint(from);
        const p2 = to === 'aura' ? auraPoint : nodePoint(to);
        pathContainer.appendChild(
          createPath(curve(p1, p2), 'flow-base'),
        );
      });

      // Build adjacency list for random path generation
      const adj = new Map<number | 'aura', Array<number | 'aura'>>();
      const addEdge = (u: number | 'aura', v: number | 'aura') => {
        if (!adj.has(u)) adj.set(u, []);
        if (!adj.has(v)) adj.set(v, []);
        adj.get(u)!.push(v);
        adj.get(v)!.push(u);
      };
      baseConnections.forEach(([u, v]) => addEdge(u, v));

      const generateRandomSequence = () => {
        const seq: Array<number | 'aura'> = ['aura'];
        const length = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4 steps
        let current: number | 'aura' = 'aura';
        
        for (let i = 0; i < length; i++) {
          const neighbors = adj.get(current)!;
          // Try to not immediately go back to the node we just came from
          let next = neighbors[Math.floor(Math.random() * neighbors.length)];
          if (neighbors.length > 1 && seq.length > 1 && next === seq[seq.length - 2]) {
             const filtered = neighbors.filter(n => n !== seq[seq.length - 2]);
             next = filtered[Math.floor(Math.random() * filtered.length)];
          }
          current = next;
          seq.push(current);
        }
        
        // Ensure the sequence ends in aura
        if (current !== 'aura') {
          seq.push('aura');
        }
        return seq;
      };

      const MAX_FLOWS = 4;

      const startRandomFlow = (initialDelay = 0) => {
        if (!pathContainer || !particleContainer) return;

        const sequence = generateRandomSequence();
        const speed = 0.8 + Math.random() * 0.6;
        
        const elementsToClean: Element[] = [];
        
        const timeline = gsap.timeline({
          delay: initialDelay,
          onComplete: () => {
            // Clean up DOM elements
            elementsToClean.forEach(el => el.remove());
            
            // Clean up timeline reference
            const idx = timelines.indexOf(timeline);
            if (idx > -1) timelines.splice(idx, 1);
            
            // Only spawn next flow if component is still mounted
            if (mounted) startRandomFlow(Math.random() * 1.5);
          }
        });
        
        timelines.push(timeline);

        sequence.slice(0, -1).forEach((from, segmentIndex) => {
          const to = sequence[segmentIndex + 1];

          const p1 = from === 'aura' ? auraPoint : nodePoint(from);
          const p2 = to === 'aura' ? auraPoint : nodePoint(to);
          const pathData = curve(p1, p2);

          const activePath = createPath(pathData, 'flow-active', 0);
          pathContainer.appendChild(activePath);
          elementsToClean.push(activePath);

          const particle = createParticle();
          elementsToClean.push(particle);

          timeline.call(() => {
            if (from === 'aura') {
              triggerAura();
            } else {
              triggerNode(cards[from]);
            }
          });

          timeline.to(
            activePath,
            {
              opacity: 0.95,
              duration: 0.16,
              ease: 'power2.out',
            },
            '>'
          );

          timeline.to(
            particle,
            {
              opacity: 1,
              duration: 0.08,
            },
            '<'
          );

          timeline.to(
            particle,
            {
              motionPath: {
                path: pathData,
                align: activePath,
                alignOrigin: [0.5, 0.5],
                autoRotate: false,
              },
              duration: 1.35 * speed,
              ease: 'power1.inOut',
            },
            '<'
          );

          timeline.to(
            particle,
            {
              opacity: 0,
              duration: 0.12,
            },
            '-=0.08'
          );

          timeline.to(
            activePath,
            {
              opacity: 0, // fade out completely since we remove it
              duration: 0.35,
              ease: 'power2.out',
            },
            '-=0.06'
          );

          timeline.call(() => {
            if (to === 'aura') {
              triggerAura();
            }
          });
        });
      };

      // Initialize concurrent flows
      for (let i = 0; i < MAX_FLOWS; i++) {
        startRandomFlow(Math.random() * 2.0);
      }

      /*
       * Permanent ring animation.
       * Only the decorative children move; the node container never moves,
       * so the SVG geometry remains perfectly registered.
       */
      nodeListeners.forEach((remove) => remove());
      nodeListeners.length = 0;

      cards.forEach((card, index) => {
        const ring = card.querySelector<HTMLElement>('.neural-node-ring');
        const portrait = card.querySelector<HTMLElement>('.neural-node-portrait');

        if (ring) {
          const rotation = gsap.to(ring, {
            rotation: index % 2 === 0 ? 360 : -360,
            duration: 10 + index * 0.7,
            repeat: -1,
            ease: 'none',
          });
          timelines.push(rotation);
        }

        if (portrait) {
          const float = gsap.to(portrait, {
            y: -3,
            duration: 2.8 + (index % 3) * 0.35,
            yoyo: true,
            repeat: -1,
            ease: 'sine.inOut',
            delay: index * 0.12,
          });
          timelines.push(float);
        }

        const enter = () => {
          gsap.to(auraCore, {
            filter: 'brightness(1.2)',
            duration: 0.25,
          });
          triggerNode(card);
        };

        const leave = () => {
          gsap.to(auraCore, {
            filter: 'brightness(1)',
            duration: 0.35,
          });
        };

        card.addEventListener('mouseenter', enter);
        card.addEventListener('mouseleave', leave);

        nodeListeners.push(() => {
          card.removeEventListener('mouseenter', enter);
          card.removeEventListener('mouseleave', leave);
        });
      });
    };

    let resizeTimer = 0;

    buildNetwork();

    const resizeObserver = new ResizeObserver(() => {
      /*
       * Geometry is percentage-based, so a resize does not require measuring
       * every card. Rebuild only after the browser has settled.
       */
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildNetwork, 120);
    });

    resizeObserver.observe(network);

    return () => {
      mounted = false;
      window.clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      nodeListeners.forEach((remove) => remove());
      clearNetwork();
    };
  }, [nodes, shouldReduceMotion]);

  return (
<section className="relative w-full min-h-screen py-32 flex flex-col items-center justify-center">
  {/* DEVELOPMENT TEAM */}
  <div className="text-center mb-24 relative z-20">
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-orange-500 font-mono text-sm tracking-[0.3em] mb-4 text-center font-semibold"
    >
      AI ASSISTANT SYSTEM
    </motion.p>

    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 text-center"
    >
      AURA Neural Network
    </motion.h2>

    <motion.p
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
      className="text-white/50 text-xl font-serif italic text-center"
    >
      Energy originating from within.
    </motion.p>
  </div>

  <div
    ref={containerRef}
    className="hidden md:block relative w-full max-w-[1000px] mx-auto aspect-square"
  >
    <svg
      id="flowSvg"
      className="flow-svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="flowGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur1" />
          <feGaussianBlur stdDeviation="1" result="blur2" />
          <feGaussianBlur stdDeviation="0.3" result="blur3" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="blur3" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter
          id="particleGlow"
          x="-200%"
          y="-200%"
          width="400%"
          height="400%"
        >
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g id="flowPaths" />
      <g id="particles" />
    </svg>

    <div
      id="auraCore"
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <AnimatedAuraCore />
    </div>

    {nodes.map((node, index) => (
      <button
        key={node.name}
        type="button"
        className="neural-node-container person-card appearance-none bg-transparent border-0 p-0"
        style={{
          left: `${node.x}%`,
          top: `${node.y}%`,
        }}
        onClick={() => onSelectNode(index)}
        aria-label={`View ${node.name} profile`}
      >
        <div className="neural-node-ring" />
        <div className="neural-node-glow" />

        {node.image ? (
          <img
            src={node.image}
            alt={node.name}
            className="neural-node-portrait"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="neural-node-portrait flex items-center justify-center text-white font-bold">
            {getInitials(node.name)}
          </div>
        )}

        <div className="neural-node-info">
          <div className="neural-node-name">{node.name}</div>
          <div className="neural-node-role">{node.role}</div>
        </div>
      </button>
    ))}
  </div>

  {/* Mobile Layout */}
  <div className="md:hidden flex flex-col gap-6 px-6 w-full mt-10">
    {nodes.map((node, index) => (
      <motion.button
        key={node.name}
        type="button"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        onClick={() => onSelectNode(index)}
        className="text-left p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4"
      >
        <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 border border-white/20">
          {node.image ? (
            <img
              src={node.image}
              alt={node.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-[#111] flex items-center justify-center text-white">
              {getInitials(node.name)}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">
            {node.name}
          </h3>
          <p className="text-xs font-mono text-orange-400 uppercase">
            {node.role}
          </p>
        </div>
      </motion.button>
    ))}
  </div>
</section>

  );
};
