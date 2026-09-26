// intro.config.ts — single source of truth for all intro constants

export const INTRO_COLORS = {
  background:   '#080A10',
  indigoDark:   '#312E81',
  indigoMid:    '#4F46E5',
  indigo:       '#6366F1',
  indigoLight:  '#818CF8',
  indigoFaint:  '#A5B4FC',
  white:        '#F5F5F5',
  mutedText:    '#8B91A1',
  orange:       '#F97316',
} as const;

/** Phase timings in ms from intro start — total ~9s */
export const INTRO_TIMINGS = {
  IDLE:            0,
  SIGNAL:          0,
  NETWORK:        350,
  CONVERGENCE:    800,
  IDENTITY:       1200,
  BRAND:         1600,   // logo appears
  COMMUNITY:     2200,
  ORANGE_PULSE:  2800,
  EXPAND:        7000,   // logo holds for ~5.4s then fades
  WEBSITE_REVEAL:8000,
  COMPLETE:      9000,
} as const;

export const ELECTRIC_LOGO_PROPS = {
  color:       '#F5F5F5',
  glowColor:   '#6366F1',
  scale:       0.68,
  strands:     3,
  bend:        0.42,
  crackle:     0.8,
  arcs:        1,
  speed:       1.8,
  intensity:   1.05,
  glow:        1.15,
  thickness:   1.45,
  flicker:     0.25,
  fill:        0,
  interactive: false,
  theme:       'dark' as const,
} as const;

export const WEB_THREADS_PROPS = {
  color1:          '#312E81',
  color2:          '#6366F1',
  color3:          '#A5B4FC',
  speed:           0.10,
  threadCount:     4,
  frequency:       3.2,
  spread:          0.13,
  taper:           0.55,
  position:        0.5,
  fanMode:         'center' as const,
  glow:            0.014,
  falloff:         0.58,
  thickness:       1.15,
  brightness:      0.24,
  opacity:         0.55,
  mirror:          true,
  shimmer:         false,
  grain:           true,
  grainIntensity:  0.015,
  mouseInteraction: false,
  lightMode:       false,
} as const;

export const INTRO_KEY = 'aiclub_intro_v2';
