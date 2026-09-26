// IntroBackground.tsx — WebThreads neural field background

import WebThreads from './WebThreads';
import { WEB_THREADS_PROPS } from './intro.config';

interface IntroBackgroundProps {
  visible: boolean;
  convergence: boolean; // true during CONVERGENCE+ — threads intensify slightly
}

export function IntroBackground({ visible, convergence }: IntroBackgroundProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 1,
        opacity: convergence ? 1 : 0,
        transition: 'opacity 240ms ease-in',
      }}
    >
      <WebThreads
        {...WEB_THREADS_PROPS}
        brightness={convergence ? 0.24 : 0.10}
        opacity={convergence ? 0.55 : 0.25}
      />
    </div>
  );
}
