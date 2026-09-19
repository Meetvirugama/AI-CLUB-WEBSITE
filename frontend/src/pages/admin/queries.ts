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

export interface StatusBreakdown {
  registration_open?: number;
  upcoming?: number;
  registration_closed?: number;
  completed?: number;
}

export interface DashboardMetrics {
  total_events: number;
  total_registrations: number;
  active_events: number;
  upcoming_events: number;
  recent_registrations: RecentRegistration[];
  status_breakdown?: StatusBreakdown;
}

export interface AdminEvent {
  id: number;
  title: string;
  date?: string;
  event_start_date?: string;
  event_end_date?: string;
  event_date?: string;
  venue?: string;
  event_type?: string;
  category?: string;
  status?: string;
  registration_link?: string | null;
  [key: string]: unknown;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const useDashboardStats = () =>
  useQuery<DashboardMetrics>({
    queryKey: ['admin', 'dashboardMetrics'],
    queryFn: () => api.get('/api/admin/dashboard') as Promise<DashboardMetrics>,
    staleTime: 30_000,
  });

// ─── Events ───────────────────────────────────────────────────────────────────

export const useAdminEvents = () =>
  useQuery<AdminEvent[]>({
    queryKey: ['admin', 'events'],
    // API returns { events: [...], total: N } — extract the array
    queryFn: async () => {
      const data: any = await api.get('/api/events?limit=100');
      return (data?.events ?? data) as AdminEvent[];
    },
    staleTime: 30_000,
  });

// ─── Registrations ────────────────────────────────────────────────────────────

interface RegistrationsResponse {
  registrations: any[];
  total: number;
  total_pages: number;
}

export const useAdminRegistrations = (eventId: number | '', search: string, page: number, limit: number = 20) =>
  useQuery<RegistrationsResponse>({
    queryKey: ['admin', 'registrations', eventId, search, page, limit],
    queryFn: async (): Promise<RegistrationsResponse> => {
      if (!eventId) return { registrations: [], total: 0, total_pages: 1 };
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      return api.get(`/api/admin/events/${eventId}/registrations?limit=${limit}&page=${page}${searchParam}`) as Promise<RegistrationsResponse>;
    },
    enabled: !!eventId,
    placeholderData: (prev) => prev,
  });

// ─── Supabase Counts (sidebar/dashboard stats) ────────────────────────────────

export const useSupabaseCounts = () =>
  useQuery({
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

      return { members: memberCount, projects: projCount, pastEvents: pastCount };
    },
    staleTime: 60_000,
  });

// ─── Members ──────────────────────────────────────────────────────────────────

export interface MemberRecord {
  id: number;
  name: string;
  role: string;
  photo?: string;
  description?: string;
  github?: string;
  linkedin?: string;
  order_no?: number;
}

export const useAdminMembers = () =>
  useQuery<MemberRecord[]>({
    queryKey: ['admin', 'members'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/members'));
      if (!res.ok) throw new Error('Failed to fetch members');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface ProjectRecord {
  id: number;
  title: string;
  author?: string;
  author_id?: number | null;
  description?: string;
  tags: string[];
  github_link?: string;
  contributors?: string;
}

export const useAdminProjects = () =>
  useQuery<ProjectRecord[]>({
    queryKey: ['admin', 'projects'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/projects'));
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      return (data || []).map((p: any) => {
        let tagsList: string[] = [];
        if (p.tags) {
          try {
            tagsList = JSON.parse(p.tags);
            if (!Array.isArray(tagsList)) tagsList = [String(tagsList)];
          } catch {
            tagsList = p.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
          }
        }
        return { ...p, tags: tagsList };
      });
    },
    staleTime: 30_000,
  });

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface AchievementRecord {
  id: number;
  title: string;
  student: string;
  description: string;
  category: string;
  icon: string;
  image_url?: string;
  created_at?: string;
}

export const useAdminAchievements = () =>
  useQuery<AchievementRecord[]>({
    queryKey: ['admin', 'achievements'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/achievements'));
      if (!res.ok) throw new Error('Failed to fetch achievements');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── News ─────────────────────────────────────────────────────────────────────

export interface NewsRecord {
  id: number;
  title?: string;
  description?: string;
  link?: string;
  sources?: string;
  image_url?: string;
}

export const useAdminNews = () =>
  useQuery<NewsRecord[]>({
    queryKey: ['admin', 'news'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/news'));
      if (!res.ok) throw new Error('Failed to fetch news');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── Resources ────────────────────────────────────────────────────────────────

export interface ResourceRecord {
  id: number;
  title: string;
  description?: string;
  resource_type: string;
  url?: string;
  group_name?: string;
  order_no?: number;
}

export const useAdminResources = () =>
  useQuery<ResourceRecord[]>({
    queryKey: ['admin', 'resources'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/resources'));
      if (!res.ok) throw new Error('Failed to fetch resources');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── Past Events ──────────────────────────────────────────────────────────────

export interface PastEventRecord {
  id: number;
  title?: string;
  description?: string;
  category?: string;
  date_label?: string;
  image_url?: string;
  speaker?: string;
  participants?: number | null;
  sort_order?: number;
  winners?: string;
  winner_link?: string;
}

export const useAdminPastEvents = () =>
  useQuery<PastEventRecord[]>({
    queryKey: ['admin', 'pastEvents'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/past-events'));
      if (!res.ok) throw new Error('Failed to fetch past events');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── Weekly Veneza ────────────────────────────────────────────────────────────

export interface WeeklyResource {
  id: number;
  week_id: number;
  title: string;
  description?: string;
  resource_type: string;
  url: string;
  est_minutes?: number;
  order_no?: number;
}

export interface WeekRecord {
  id: number;
  week_number: number;
  title: string;
  description?: string;
  target_date?: string;
  is_current: boolean;
  status?: string;
  order_no?: number;
  resources?: WeeklyResource[];
}

export const useAdminWeeklyVeneza = () =>
  useQuery<WeekRecord[]>({
    queryKey: ['admin', 'weeklyVeneza'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/api/weekly-veneza'));
      if (!res.ok) throw new Error('Failed to fetch Weekly Veneza');
      return res.json();
    },
    staleTime: 30_000,
  });

// ─── Chatbot Analytics Types ──────────────────────────────────────────────────

export interface ChatOverview {
  today_requests: number;
  today_successful: number;
  today_failed: number;
  today_input_tokens: number;
  today_output_tokens: number;
  today_total_tokens: number;
  today_avg_latency_ms: number | null;
  today_success_rate: number | null;
  today_fallbacks: number;
  today_rate_limited: number;
  total_requests: number;
  total_tokens: number;
  groq_keys_total: number;
  gemini_keys_total: number;
  provider_pool_ready: boolean;
}

export interface DailyUsagePoint {
  date: string;
  total_requests: number;
  successful: number;
  failed: number;
  rate_limited: number;
  fallbacks: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  groq_requests: number;
  gemini_requests: number;
  avg_latency_ms: number | null;
}

export interface DailyUsageResponse {
  days: number;
  data: DailyUsagePoint[];
}

export interface ProviderSummary {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  rate_limits: number;
  fallbacks: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
}

export interface ModelSummary {
  provider: string;
  model: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  failures: number;
  avg_latency_ms: number | null;
}

export interface ProvidersResponse {
  days: number;
  providers: ProviderSummary[];
  models: ModelSummary[];
}

export interface CategoryBreakdown {
  knowledge: number;
  navigation: number;
  greeting: number;
  out_of_scope: number;
  restricted: number;
  no_answer: number;
  error: number;
  total: number;
}

export interface CategoriesResponse {
  days: number;
  categories: CategoryBreakdown;
}

export interface ActivityEntry {
  id: number;
  created_at: string;
  request_type: string;
  provider: string | null;
  model: string | null;
  key_label: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number | null;
  status: string;
  fallback_used: boolean;
}

export interface ActivityResponse {
  limit: number;
  events: ActivityEntry[];
}

// ─── Chatbot Analytics Hooks ──────────────────────────────────────────────────

export const useChatbotOverview = () =>
  useQuery<ChatOverview>({
    queryKey: ['admin', 'chatbot', 'overview'],
    queryFn: () => api.get('/api/admin/chatbot/overview') as Promise<ChatOverview>,
    refetchInterval: 30_000,
  });

export const useChatbotUsage = (days: number) =>
  useQuery<DailyUsageResponse>({
    queryKey: ['admin', 'chatbot', 'usage', days],
    queryFn: () => api.get(`/api/admin/chatbot/usage?days=${days}`) as Promise<DailyUsageResponse>,
  });

export const useChatbotProviders = (days: number) =>
  useQuery<ProvidersResponse>({
    queryKey: ['admin', 'chatbot', 'providers', days],
    queryFn: () => api.get(`/api/admin/chatbot/providers?days=${days}`) as Promise<ProvidersResponse>,
  });

export const useChatbotCategories = (days: number) =>
  useQuery<CategoriesResponse>({
    queryKey: ['admin', 'chatbot', 'categories', days],
    queryFn: () => api.get(`/api/admin/chatbot/categories?days=${days}`) as Promise<CategoriesResponse>,
  });

export const useChatbotActivity = (limit = 50) =>
  useQuery<ActivityResponse>({
    queryKey: ['admin', 'chatbot', 'activity', limit],
    queryFn: () => api.get(`/api/admin/chatbot/activity?limit=${limit}`) as Promise<ActivityResponse>,
    refetchInterval: 30_000,
  });

// Keep getAuthHeaders and getApiUrl re-exported for RegistrationsTab direct fetch calls
export { getAuthHeaders, getApiUrl };

// ─── First-Party Analytics Types ──────────────────────────────────────────────

export interface TrafficOverview {
  unique_visitors:       number;
  sessions:              number;
  page_views:            number;
  avg_session_duration:  number | null;
  bounce_rate:           number | null;
}

export interface DailyPoint {
  date:            string;
  unique_visitors: number;
  sessions:        number;
  page_views:      number;
}

export interface HourlyPoint {
  hour:     number;
  visitors: number;
  sessions: number;
  events:   number;
}

export interface PageStat {
  page:          string;
  views:         number;
  avg_time_sec:  number | null;
}

export interface ActionCount {
  event_type: string;
  count:      number;
}

export interface DeviceStat {
  device_type: string;
  count:       number;
  pct:         number;
}

export interface BrowserStat {
  browser: string;
  count:   number;
  pct:     number;
}

export interface DeviceBreakdown {
  devices:  DeviceStat[];
  browsers: BrowserStat[];
}

export interface SessionRow {
  session_id:   string;
  visitor_id:   string;
  started_at:   string;
  duration_sec: number | null;
  page_views:   number;
  device_type:  string | null;
  browser:      string | null;
}

export interface EventEntry {
  id:         number;
  event_type: string;
  page:       string | null;
  timestamp:  string;
  meta:       Record<string, unknown> | null;
}

export interface SessionTimeline {
  session_id: string;
  events:     EventEntry[];
}

// ─── First-Party Analytics Hooks ──────────────────────────────────────────────

export const useAnalyticsOverview = (days: number) =>
  useQuery<TrafficOverview>({
    queryKey: ['analytics', 'overview', days],
    queryFn:  () => api.get(`/api/analytics/overview?days=${days}`) as Promise<TrafficOverview>,
    refetchInterval: 60_000,
  });

export const useAnalyticsTraffic = (days: number) =>
  useQuery<DailyPoint[]>({
    queryKey: ['analytics', 'traffic', days],
    queryFn:  () => api.get(`/api/analytics/traffic?days=${days}`) as Promise<DailyPoint[]>,
  });

export const useAnalyticsHourly = (days: number) =>
  useQuery<HourlyPoint[]>({
    queryKey: ['analytics', 'hourly', days],
    queryFn:  () => api.get(`/api/analytics/hourly?days=${days}`) as Promise<HourlyPoint[]>,
  });

export const useAnalyticsPages = (days: number) =>
  useQuery<PageStat[]>({
    queryKey: ['analytics', 'pages', days],
    queryFn:  () => api.get(`/api/analytics/pages?days=${days}`) as Promise<PageStat[]>,
  });

export const useAnalyticsActions = (days: number) =>
  useQuery<ActionCount[]>({
    queryKey: ['analytics', 'actions', days],
    queryFn:  () => api.get(`/api/analytics/actions?days=${days}`) as Promise<ActionCount[]>,
  });

export const useAnalyticsDevices = (days: number) =>
  useQuery<DeviceBreakdown>({
    queryKey: ['analytics', 'devices', days],
    queryFn:  () => api.get(`/api/analytics/devices?days=${days}`) as Promise<DeviceBreakdown>,
  });

export const useAnalyticsSessions = (days: number, limit = 20) =>
  useQuery<SessionRow[]>({
    queryKey: ['analytics', 'sessions', days, limit],
    queryFn:  () => api.get(`/api/analytics/sessions?days=${days}&limit=${limit}`) as Promise<SessionRow[]>,
  });

export const useAnalyticsSessionTimeline = (sessionId: string | null) =>
  useQuery<SessionTimeline>({
    queryKey: ['analytics', 'session', sessionId],
    queryFn:  () => api.get(`/api/analytics/sessions/${sessionId}`) as Promise<SessionTimeline>,
    enabled:  !!sessionId,
  });
