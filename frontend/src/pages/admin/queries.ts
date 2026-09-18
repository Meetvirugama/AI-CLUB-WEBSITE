import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { api } from '../../lib/apiClient';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['admin', 'dashboardMetrics'],
    queryFn: () => api.get('/api/admin/dashboard'),
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
    queryFn: () => api.get('/api/events?limit=100'),
  });
};

interface RegistrationsResponse {
  registrations: any[];
  total: number;
  total_pages: number;
}

export const useAdminRegistrations = (eventId: number | '', search: string, page: number, limit: number = 20) => {
  return useQuery<RegistrationsResponse>({
    queryKey: ['admin', 'registrations', eventId, search, page, limit],
    queryFn: async (): Promise<RegistrationsResponse> => {
      if (!eventId) return { registrations: [], total: 0, total_pages: 1 };
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      return api.get(`/api/admin/events/${eventId}/registrations?limit=${limit}&page=${page}${searchParam}`) as Promise<RegistrationsResponse>;
    },
    enabled: !!eventId,
    placeholderData: (prev) => prev,
  });
};

// Keep getAuthHeaders and getApiUrl re-exported for RegistrationsTab direct fetch calls
export { getAuthHeaders, getApiUrl };
