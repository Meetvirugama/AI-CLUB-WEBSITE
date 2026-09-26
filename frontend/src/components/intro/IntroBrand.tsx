// IntroBrand.tsx
// ElectricLogo (AI CLUB identity) + sequential typing of supporting brand text.
// Sequence:
//   1. ElectricLogo reveals "AI CLUB" with electric lightning (BRAND phase)
//   2. "DA-IICT" types below it (~300ms after logo appears)
//   3. "ARTIFICIAL INTELLIGENCE CLUB" types beneath that (~200ms after DA-IICT)

import { useState } from 'react';
import ElectricLogo from './ElectricLogo';
import { TypingText } from './TypingText';
import { ELECTRIC_LOGO_PROPS, INTRO_COLORS } from './intro.config';
import type { IntroPhase } from './hooks/useIntroState';

const BRAND_PHASES: IntroPhase[] = [
  'BRAND', 'COMMUNITY', 'ORANGE_PULSE', 'EXPAND', 'WEBSITE_REVEAL',
];

interface IntroBrandProps { phase: IntroPhase; }

export function IntroBrand({ phase }: IntroBrandProps) {
  const visible = BRAND_PHASES.includes(phase);
  const fading = phase === 'EXPAND' || phase === 'WEBSITE_REVEAL';

  // Track completion of first line before starting second
  const [line1Done, setLine1Done] = useState(false);

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 10,
        opacity: fading ? 0 : visible ? 1 : 0,
        transition: fading
          ? 'opacity 500ms ease-in'
          : 'opacity 380ms ease-out',
        pointerEvents: 'none',
      }}
    >
      {/* ── Full-screen ElectricLogo — white with indigo glow (IS the "AI CLUB" reveal) */}
      <ElectricLogo
        src="/ai-club-logo.svg"
        {...ELECTRIC_LOGO_PROPS}
      />

      {/* ── Supporting typed identity — positioned below the logo ── */}
      {visible && (
        <div style={{
          position: 'absolute',
          bottom: '20%',
          left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          userSelect: 'none',
        }}>
          {/* Line 1: DA-IICT — types in 300ms after logo appears */}
          <div style={{
            fontFamily: '"JetBrains Mono", "Courier New", monospace',
            fontSize: 'clamp(13px, 1.8vw, 18px)',
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: INTRO_COLORS.indigoLight,
            textShadow: `0 0 14px ${INTRO_COLORS.indigo}55`,
          }}>
            <TypingText
              text="DA-IICT"
              startDelay={300}
              charDelay={50}
              characterDuration={100}
              cursor
              onComplete={() => setLine1Done(true)}
            />
          </div>

          {/* Line 2: ARTIFICIAL INTELLIGENCE CLUB — starts 200ms after DA-IICT finishes */}
          {line1Done && (
            <div style={{
              fontFamily: '"JetBrains Mono", "Courier New", monospace',
              fontSize: 'clamp(9px, 1.1vw, 12px)',
              fontWeight: 400,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INTRO_COLORS.mutedText,
            }}>
              <TypingText
                text="Artificial Intelligence Club"
                startDelay={200}
                charDelay={28}
                characterDuration={80}
                cursor={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
