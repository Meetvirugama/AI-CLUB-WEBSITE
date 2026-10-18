import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/api';

export interface HomeTopic {
  id: number;
  label: string;
  order_no: number;
  is_active: boolean;
}

/** Shown until an admin adds topics (or if the request fails), so the strip is never empty. */
export const DEFAULT_TOPICS = [
  'Kaggle contests',
  'Buildathons',
  'Edge AI · Kiran Trivedi',
  'WorldQuant BRAIN',
  'iPrompt',
  'AI Triathlon',
  'Speaker sessions',
  'Lecture series',
];

export const HOME_TOPICS_KEY = ['home-topics'];

export function useHomeTopicLabels() {
  const { data } = useQuery<HomeTopic[]>({
    queryKey: HOME_TOPICS_KEY,
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/home-topics'));
      if (!res.ok) throw new Error('home topics');
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  return data && data.length ? data.map(t => t.label) : DEFAULT_TOPICS;
}
