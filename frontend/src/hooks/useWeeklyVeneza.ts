import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface WeeklyResource {
  id: number;
  week_id: number;
  title: string;
  description: string;
  resource_type: string;
  url: string;
  est_minutes: number;
  order_no: number;
}

export interface WeeklyVenezaWeek {
  id: number;
  week_number: number;
  title: string;
  description?: string;
  target_date?: string;
  is_current: boolean;
  status: string; // "past", "current", "upcoming"
  order_no: number;
  resources: WeeklyResource[];
}

export function useWeeklyVenezaData() {
  return useQuery<WeeklyVenezaWeek[]>({
    queryKey: ["weekly-veneza"],
    queryFn: async () => {
      return await api.get<WeeklyVenezaWeek[]>("/api/weekly-veneza");
    },
    retry: 1,
  });
}

export function useWeeklyVenezaProgress() {
  return useQuery<number[]>({
    queryKey: ["weekly-veneza-progress"],
    queryFn: async () => {
      try {
        return await api.get<number[]>("/api/weekly-veneza/progress");
      } catch {
        return [];
      }
    },
    retry: 1,
  });
}

export function useToggleWeeklyProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId }: { resourceId: number }) => {
      return await api.post(`/api/weekly-veneza/${resourceId}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-veneza-progress"] });
    },
  });
}

export function useResetWeeklyProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return await api.post("/api/weekly-veneza/reset");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-veneza-progress"] });
    },
  });
}
