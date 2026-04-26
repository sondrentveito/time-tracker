"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { WorkRulesConfig, FlexBalanceConfig } from "@/lib/types";
import { getDefaultWorkRules } from "@/lib/utils";

async function fetchConfig(key: string): Promise<string | null> {
  const res = await fetch(`/api/config?key=${key}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.value ?? null;
}

async function saveConfig(key: string, value: string): Promise<void> {
  const res = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new Error("Failed to save config");
}

export function useWorkRules() {
  const query = useQuery({
    queryKey: ["config", "work-rules"],
    queryFn: async (): Promise<WorkRulesConfig> => {
      const raw = await fetchConfig("work-rules");
      if (raw) return JSON.parse(raw);
      return getDefaultWorkRules();
    },
    staleTime: 60_000,
  });

  return {
    rules: query.data ?? getDefaultWorkRules(),
    isLoading: query.isLoading,
  };
}

export function useSaveWorkRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: WorkRulesConfig) =>
      saveConfig("work-rules", JSON.stringify(rules)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "work-rules"] });
    },
  });
}

export function useFlexBalance() {
  const query = useQuery({
    queryKey: ["config", "flex-balance"],
    queryFn: async (): Promise<FlexBalanceConfig> => {
      const raw = await fetchConfig("flex-balance");
      if (raw) return JSON.parse(raw);
      return { startBalance: 0, startDate: "01.01.2025" };
    },
    staleTime: 60_000,
  });

  return {
    config: query.data ?? { startBalance: 0, startDate: "01.01.2025" },
    isLoading: query.isLoading,
  };
}

export function useSaveFlexBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: FlexBalanceConfig) =>
      saveConfig("flex-balance", JSON.stringify(config)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "flex-balance"] });
    },
  });
}
