import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export type ClubResource = {
  id: number;
  title: string;
  description: string;
  resource_type: string;
  url: string;
  group_name: string;
  order_no: number;
};

export function useCurriculumResources() {
  return useQuery({
    queryKey: ["curriculumResources"],
    queryFn: async (): Promise<ClubResource[]> => {
      const res = await fetch(getApiUrl("/api/resources"));
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });
}

export function useCurriculumProgress() {
  return useQuery({
    queryKey: ["curriculumProgress"],
    queryFn: async (): Promise<number[]> => {
      const res = await fetch(getApiUrl("/api/resources/progress"), {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    }
  });
}

export function useToggleProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resourceId,
    }: {
      resourceId: number;
    }) => {
      const res = await fetch(getApiUrl(`/api/resources/${resourceId}/toggle`), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["curriculumProgress"],
      });
    },
  });
}

export function useResetProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/resources/reset"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset progress");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["curriculumProgress"],
      });
    },
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<ClubResource, "id">) => {
      const res = await fetch(getApiUrl("/api/admin/resources"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculumResources"] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: ClubResource) => {
      const res = await fetch(getApiUrl(`/api/admin/resources/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculumResources"] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/admin/resources/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete resource");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculumResources"] });
    },
  });
}

