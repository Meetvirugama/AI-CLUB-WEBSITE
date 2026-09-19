import { useQuery } from '@tanstack/react-query';
import { getApiUrl, getAuthHeaders } from '../../lib/api';
import { api } from '../../lib/apiClient';

export interface RecentRegistration {
  id: number;
  user_name: string;
  event_title: string;
  created_at: string;
  payment_status: string;
}

export interface DashboardMetrics {
  total_events: number;
  total_registrations: number;
  active_events: number;
  upcoming_events: number;
  recent_registrations: RecentRegistration[];
}

export interface AdminEvent {
  id: number;
  title: string;
  date?: string;
  [key: string]: unknown;
}

export const useDashboardStats = () => {
  return useQuery<DashboardMetrics>({
    queryKey: ['admin', 'dashboardMetrics'],
    queryFn: () => api.get('/api/admin/dashboard') as Promise<DashboardMetrics>,
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
  return useQuery<AdminEvent[]>({
    queryKey: ['admin', 'events'],
    queryFn: () => api.get('/api/events?limit=100') as Promise<AdminEvent[]>,
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
