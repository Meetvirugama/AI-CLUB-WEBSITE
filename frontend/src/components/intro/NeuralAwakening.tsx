// NeuralAwakening.tsx
// Single coherent intro pipeline:
//   SIGNAL → NETWORK → CONVERGENCE → IDENTITY → BRAND → COMMUNITY → ORANGE_PULSE
//   → EXPAND → WEBSITE_REVEAL → COMPLETE → onComplete()

import { useEffect, useRef } from 'react';
import { useIntroStore, shouldShowIntro, schedulePhases } from './hooks/useIntroState';
import { IntroBackground } from './IntroBackground';
import { IntroBrand } from './IntroBrand';
import { IntroEnergy } from './IntroEnergy';
import { INTRO_COLORS } from './intro.config';
import type { IntroPhase } from './hooks/useIntroState';

interface NeuralAwakeningProps {
  /** Called automatically when the intro animation finishes */
  onComplete: () => void;
}

// Signal dot — tiny indigo point that appears first
function SignalDot({ phase }: { phase: IntroPhase }) {
  const show = phase === 'SIGNAL' || phase === 'NETWORK';
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 5,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: INTRO_COLORS.indigo,
        opacity: show ? 1 : 0,
        transform: show ? 'scale(1)' : 'scale(0)',
        transition: 'opacity 180ms ease-out, transform 180ms ease-out',
        boxShadow: `0 0 12px 4px ${INTRO_COLORS.indigo}60`,
      }} />
    </div>
  );
}

// Central convergence glow — grows during CONVERGENCE and IDENTITY phases
function ConvergenceGlow({ phase }: { phase: IntroPhase }) {
  const active = phase === 'CONVERGENCE' || phase === 'IDENTITY';
  const fading = phase === 'BRAND' || phase === 'COMMUNITY'
              || phase === 'ORANGE_PULSE' || phase === 'EXPAND'
              || phase === 'WEBSITE_REVEAL';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      opacity: fading ? 0 : active ? 1 : 0,
      transition: fading
        ? 'opacity 400ms ease-in'
        : 'opacity 240ms ease-out',
    }}>
      <div style={{
        width: '24vmin', height: '24vmin',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${INTRO_COLORS.indigo}28 0%, transparent 68%)`,
        transform: active ? 'scale(1)' : 'scale(0.2)',
        transition: 'transform 260ms cubic-bezier(0.16,1,0.3,1)',
      }} />
    </div>
  );
}

export function NeuralAwakening({ onComplete }: NeuralAwakeningProps) {
  const { phase, setPhase, skipIntro } = useIntroStore();
  const completedRef = useRef(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !shouldShowIntro()) {
      skipIntro();
      return;
    }
    setPhase('SIGNAL');
    return schedulePhases(setPhase);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'COMPLETE' && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [phase, onComplete]);

  const isActive      = phase !== 'IDLE' && phase !== 'COMPLETE';
  const overlayFading = phase === 'EXPAND' || phase === 'WEBSITE_REVEAL';
  const isNetwork     = ['NETWORK', 'CONVERGENCE', 'IDENTITY', 'BRAND',
                          'COMMUNITY', 'ORANGE_PULSE', 'EXPAND',
                          'WEBSITE_REVEAL'].includes(phase);
  const isConvergence = ['CONVERGENCE', 'IDENTITY', 'BRAND', 'COMMUNITY',
                          'ORANGE_PULSE', 'EXPAND', 'WEBSITE_REVEAL'].includes(phase);

  if (!isActive) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: INTRO_COLORS.background,
        overflow: 'hidden',
        opacity: overlayFading ? 0 : 1,
        transition: 'opacity 500ms ease-in',
        zIndex: 9999,
      }}
    >
      {/* Layer 1: Neural thread background */}
      <IntroBackground visible={isNetwork} convergence={isConvergence} />

      {/* Layer 2: Convergence glow */}
      <ConvergenceGlow phase={phase} />

      {/* Layer 3: Signal dot — first thing visible */}
      <SignalDot phase={phase} />

      {/* Layer 4: Orange community energy pulse */}
      <IntroEnergy phase={phase} />

      {/* Layer 5: AI Club identity — ElectricLogo */}
      <IntroBrand phase={phase} />
    </div>
  );
}
