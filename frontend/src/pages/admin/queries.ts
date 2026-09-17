import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../../lib/api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'dashboardMetrics'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/admin/dashboard'), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    },
  });
};

export const useSupabaseCounts = () => {
  return useQuery({
    queryKey: ['admin', 'supabaseCounts'],
    queryFn: async () => {
      const [memRes, projRes, pastRes] = await Promise.all([
        fetch(getApiUrl('/api/members')).catch(() => null),
        fetch(getApiUrl('/api/projects')).catch(() => null),
        fetch(getApiUrl('/api/past-events')).catch(() => null),
      ]);
      
      let memberCount = 0;
      let projCount = 0;
      let pastCount = 0;
      
      if (memRes?.ok) {
        const memData = await memRes.json();
        memberCount = memData.length || 0;
      }
      if (projRes?.ok) {
        const projData = await projRes.json();
        projCount = projData.length || 0;
      }
      if (pastRes?.ok) {
        const pastData = await pastRes.json();
        pastCount = pastData.length || 0;
      }
      
      return {
        members: memberCount,
        projects: projCount,
        pastEvents: pastCount,
      };
    },
  });
};

export const useAdminEvents = () => {
  return useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/events?limit=100'), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
  });
};

export const useAdminRegistrations = (eventId: number | '', search: string, page: number, limit: number = 20) => {
  return useQuery({
    queryKey: ['admin', 'registrations', eventId, search, page, limit],
    queryFn: async () => {
      if (!eventId) return { registrations: [], total: 0, total_pages: 1 };
      
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await fetch(
        getApiUrl(`/api/admin/events/${eventId}/registrations?limit=${limit}&page=${page}${searchParam}`),
        {
          headers: getAuthHeaders(),
          credentials: 'include'
        }
      );
      if (!res.ok) throw new Error('Failed to fetch registrations');
      return res.json();
    },
    enabled: !!eventId,
    placeholderData: (prev) => prev, // keeps old data while fetching new page
  });
};


