/**
 * types.ts
 * --------
 * Strongly typed models for the AI Club Event Winners & Championship Showcase.
 * Strictly conforms to task.md Section 7.
 */

export interface EventWinner {
  id: string;
  eventId: string;
  name: string;
  placement: number;
  category?: string;
  score?: number;
  imageUrl?: string;
  members?: string[];
  projectTitle?: string;
  projectDescription?: string;
  award?: string;
  links?: Record<string, string>;
}

export interface ShowcaseEvent {
  id: string;
  title: string;
  edition: string;
  date?: string;
  status: 'upcoming' | 'completed';
  category?: string;
  description?: string;
  banner?: string;
  winner_link?: string;
  registration_link?: string;
  featured?: boolean;
  winners: EventWinner[];
}

export type ResultsFilterTab = 'all' | 'podium' | 'finalists' | 'awards';
