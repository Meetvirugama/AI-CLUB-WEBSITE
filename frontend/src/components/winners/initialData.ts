import { ShowcaseEvent } from './types';

export const INITIAL_SHOWCASE_EVENTS: ShowcaseEvent[] = [
  {
    id: 'past-6',
    title: 'AI Buildathon 2026',
    edition: '2026',
    date: 'July 2026',
    status: 'completed',
    category: 'Competition',
    featured: true,
    description:
      'Flagship 48-hour summer AI buildathon where participants engineered full-stack artificial intelligence systems to solve campus and civic challenges.',
    winners: [
      {
        id: 'past-6-w1',
        eventId: 'past-6',
        name: 'Cheetah Sprinter',
        placement: 1,
        category: 'Official Placement',
        award: '1st Place Winner',
        projectTitle: 'DAU Pulse',
      },
      {
        id: 'past-6-w2',
        eventId: 'past-6',
        name: 'Chaos',
        placement: 2,
        category: 'Official Placement',
        award: '2nd Place Runner-Up',
        projectTitle: 'ProcastiSense',
      },
      {
        id: 'past-6-w3',
        eventId: 'past-6',
        name: '0/1',
        placement: 3,
        category: 'Official Placement',
        award: '3rd Place',
        projectTitle: 'Echo Notes',
      },
    ],
  },
  {
    id: 'past-3',
    title: 'Kaggle Contest',
    edition: '2026',
    date: 'June,2026',
    status: 'completed',
    category: 'Competition',
    featured: false,
    description:
      'DAU AI Club competitive machine learning tournament on Kaggle, benchmarking feature engineering and predictive models.',
    winners: [
      {
        id: 'past-3-w1',
        eventId: 'past-3',
        name: 'Dhruvil Patel',
        placement: 1,
        category: 'Official Placement',
        award: '1st Place Winner',
      },
      {
        id: 'past-3-w2',
        eventId: 'past-3',
        name: 'Saumya Tinna',
        placement: 2,
        category: 'Official Placement',
        award: '2nd Place Runner-Up',
      },
      {
        id: 'past-3-w3',
        eventId: 'past-3',
        name: 'Dhairya Shah',
        placement: 3,
        category: 'Official Placement',
        award: '3rd Place',
      },
    ],
  },
  {
    id: 'past-2',
    title: 'Integration Bee',
    edition: '2025',
    date: 'September 15, 2025',
    status: 'completed',
    category: 'Competition',
    featured: false,
    description:
      'The 2nd season of AI Club’s Integration Bee — high-energy whiteboard showdown testing mathematical skill and calculus under pressure.',
    winners: [
      {
        id: 'past-2-w1',
        eventId: 'past-2',
        name: 'Dirgh Patel',
        placement: 1,
        category: 'Official Placement',
        award: '1st Place Winner · Prize: ₹500',
      },
      {
        id: 'past-2-w2',
        eventId: 'past-2',
        name: 'Mann Chauhan',
        placement: 2,
        category: 'Official Placement',
        award: '2nd Place Runner-Up · Prize: ₹300',
      },
      {
        id: 'past-2-w3',
        eventId: 'past-2',
        name: 'Krishiv Sheth',
        placement: 3,
        category: 'Official Placement',
        award: '3rd Place · Prize: ₹200',
      },
    ],
  },
];

