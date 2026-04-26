"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEntries, createEntry, updateEntry, deleteEntry } from "@/lib/api";
import type { TimeEntry } from "@/lib/types";

export function useEntries() {
  const query = useQuery({
    queryKey: ["entries"],
    queryFn: fetchEntries,
    staleTime: 30_000,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: Omit<TimeEntry, "timestamp">) => createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ timestamp, ...updates }: { timestamp: string } & Partial<Omit<TimeEntry, "timestamp">>) =>
      updateEntry(timestamp, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (timestamp: string) => deleteEntry(timestamp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}
