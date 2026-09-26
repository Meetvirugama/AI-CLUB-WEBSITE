// useIntroState.ts — single source of truth for intro phase state

import { create } from 'zustand';
import { INTRO_TIMINGS, INTRO_KEY } from '../intro.config';

export type IntroPhase =
  | 'IDLE'
  | 'SIGNAL'
  | 'NETWORK'
  | 'CONVERGENCE'
  | 'IDENTITY'
  | 'BRAND'
  | 'COMMUNITY'
  | 'ORANGE_PULSE'
  | 'EXPAND'
  | 'WEBSITE_REVEAL'
  | 'COMPLETE';

interface IntroState {
  phase: IntroPhase;
  setPhase: (p: IntroPhase) => void;
  skipIntro: () => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  phase: 'IDLE',
  setPhase: (phase) => set({ phase }),
  skipIntro: () => set({ phase: 'COMPLETE' }),
}));

/** Returns true on first page visit per browser session */
export function shouldShowIntro(): boolean {
  try {
    if (sessionStorage.getItem(INTRO_KEY)) return false;
    sessionStorage.setItem(INTRO_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

const PHASE_ORDER: IntroPhase[] = [
  'SIGNAL',
  'NETWORK',
  'CONVERGENCE',
  'IDENTITY',
  'BRAND',
  'COMMUNITY',
  'ORANGE_PULSE',
  'EXPAND',
  'WEBSITE_REVEAL',
  'COMPLETE',
];

/** Schedule all phase transitions. Returns cleanup function. */
export function schedulePhases(setPhase: (p: IntroPhase) => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const phase of PHASE_ORDER) {
    const delay = INTRO_TIMINGS[phase as keyof typeof INTRO_TIMINGS] ?? 0;
    timers.push(setTimeout(() => setPhase(phase), delay));
  }
  return () => timers.forEach(clearTimeout);
}
