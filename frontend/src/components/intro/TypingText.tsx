// TypingText.tsx
// Premium character-by-character brand reveal.
// variant="electric" — each character gets a bright electric flash on appear.
// variant="default"  — smooth opacity/translateY/blur transition.
// Respects prefers-reduced-motion — shows full text immediately.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface TypingTextProps {
  text: string;
  startDelay?:       number;   // ms before first character
  charDelay?:        number;   // ms between characters
  characterDuration?: number;  // ms for each character's transition
  variant?:         'default' | 'electric';
  cursor?:          boolean;
  onComplete?:      () => void;
  style?:           CSSProperties;
  className?:       string;
}

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TypingText({
  text,
  startDelay       = 0,
  charDelay        = 45,
  characterDuration = 110,
  variant          = 'default',
  cursor           = true,
  onComplete,
  style,
  className        = '',
}: TypingTextProps) {
  const [revealed, setRevealed] = useState(reducedMotion ? text.length : 0);
  const [done,     setDone]     = useState(reducedMotion);
  // Track which characters have already fired their flash (so it only fires once)
  const [flashed,  setFlashed]  = useState<Set<number>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    if (reducedMotion) {
      setRevealed(text.length);
      setDone(true);
      setFlashed(new Set(Array.from({ length: text.length }, (_, i) => i)));
      onComplete?.();
      return;
    }

    setRevealed(0);
    setDone(false);
    setFlashed(new Set());

    for (let i = 0; i < text.length; i++) {
      const t = setTimeout(() => {
        setRevealed(i + 1);
        setFlashed(prev => new Set(prev).add(i));
        if (i === text.length - 1) {
          setDone(true);
          onComplete?.();
        }
      }, startDelay + i * charDelay);
      timers.current.push(t);
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, startDelay, charDelay]);

  const chars = Array.from(text);
  const isElectric = variant === 'electric';

  return (
    <span
      className={className}
      style={{ display: 'inline-block', whiteSpace: 'pre', ...style }}
      aria-label={text}
      role="text"
    >
      {chars.map((char, i) => {
        const isVisible = i < revealed;
        const hasFlashed = flashed.has(i);

        if (isElectric) {
          return (
            <span
              key={i}
              aria-hidden="true"
              style={{
                display: 'inline-block',
                opacity: isVisible ? 1 : 0,
                // Trigger CSS animation only when this character first appears
                animation: hasFlashed
                  ? `introElectricChar ${characterDuration + 200}ms cubic-bezier(0.16,1,0.3,1) forwards`
                  : 'none',
                minWidth: char === ' ' ? '0.3em' : undefined,
              }}
            >
              {char}
            </span>
          );
        }

        // Default variant
        return (
          <span
            key={i}
            aria-hidden="true"
            style={{
              display: 'inline-block',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
              filter: isVisible ? 'blur(0px)' : 'blur(3px)',
              transition: isVisible
                ? `opacity ${characterDuration}ms ease-out,
                   transform ${characterDuration}ms cubic-bezier(0.16,1,0.3,1),
                   filter ${characterDuration}ms ease-out`
                : 'none',
              minWidth: char === ' ' ? '0.28em' : undefined,
            }}
          >
            {char}
          </span>
        );
      })}

      {/* Blinking caret */}
      {cursor && !done && revealed > 0 && (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: '2px',
            height: '0.85em',
            background: '#6366F1',
            marginLeft: '3px',
            verticalAlign: 'middle',
            borderRadius: '1px',
            animation: 'introCaret 0.85s ease-in-out infinite',
            boxShadow: '0 0 8px #6366F1',
          }}
        />
      )}

      <style>{`
        @keyframes introCaret {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        /* Electric flash per character:
           instant bright surge → settles to glowing state */
        @keyframes introElectricChar {
          0%   {
            opacity: 0;
            filter: blur(10px) brightness(4);
            transform: scale(1.15) translateY(-4px);
            text-shadow:
              0 0 20px #818CF8,
              0 0 40px #6366F1,
              0 0 80px #4F46E5;
          }
          18%  {
            opacity: 1;
            filter: blur(2px) brightness(2.5);
            transform: scale(1.06) translateY(-1px);
            text-shadow:
              0 0 12px #818CF8,
              0 0 24px #6366F1;
          }
          55%  {
            opacity: 1;
            filter: blur(0.5px) brightness(1.4);
            transform: scale(1.01) translateY(0);
            text-shadow:
              0 0 8px #6366F1AA,
              0 0 16px #6366F155;
          }
          100% {
            opacity: 1;
            filter: blur(0px) brightness(1);
            transform: scale(1) translateY(0);
            text-shadow:
              0 0 6px #6366F180,
              0 0 12px #6366F130;
          }
        }
      `}</style>
    </span>
  );
}
