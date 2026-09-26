// IntroEnergy.tsx — restrained orange community pulse
// Appears only during COMMUNITY and ORANGE_PULSE phases.
// One thin radial ring expanding outward — communicates people, community, energy.

import type { IntroPhase } from './hooks/useIntroState';
import { INTRO_COLORS } from './intro.config';

interface IntroEnergyProps { phase: IntroPhase; }

export function IntroEnergy({ phase }: IntroEnergyProps) {
  const show  = phase === 'COMMUNITY' || phase === 'ORANGE_PULSE';
  const pulse = phase === 'ORANGE_PULSE';

  if (!show) return null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Primary expanding ring */}
      <div style={{
        position: 'absolute',
        width: pulse ? '140vmax' : '0',
        height: pulse ? '140vmax' : '0',
        borderRadius: '50%',
        border: `1px solid ${INTRO_COLORS.orange}`,
        opacity: pulse ? 0 : 0.22,
        transition: pulse
          ? 'width 900ms cubic-bezier(0.16,1,0.3,1), height 900ms cubic-bezier(0.16,1,0.3,1), opacity 900ms ease-out'
          : 'none',
        boxShadow: `0 0 18px 2px ${INTRO_COLORS.orange}28`,
      }} />

      {/* Soft inner glow — restrained */}
      <div style={{
        position: 'absolute',
        width: '28vmin', height: '28vmin',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${INTRO_COLORS.orange}14 0%, transparent 70%)`,
        opacity: show ? 1 : 0,
        transition: 'opacity 350ms ease',
      }} />

      {/* Keyframe for ring pulse */}
      <style>{`
        @keyframes introPulseRing {
          0%   { transform: scale(0);   opacity: 0.22; }
          100% { transform: scale(1);   opacity: 0;    }
        }
      `}</style>
    </div>
  );
}
