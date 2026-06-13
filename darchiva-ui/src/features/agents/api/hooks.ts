import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Agent {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  version: string;
  port: number;
  ipAddress: string | null;
  online: boolean;
  lastSeen: string | null;
  pushedConfig: {
    serverUrl?: string;
    defaultProjectId?: string;
    hotkeys?: Record<string, string>;
  } | null;
  createdAt: string;
}

export interface AgentConfigUpdate {
  serverUrl?: string;
  defaultProjectId?: string;
  hotkeys?: Record<string, string>;
}

const AGENTS_KEY = ["agents"] as const;

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<Agent[]>("/api/v1/agents");
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useAgent(agentId: string) {
  return useQuery({
    queryKey: [...AGENTS_KEY, agentId],
    queryFn: async () => {
      const { data } = await apiClient.get<Agent>(`/api/v1/agents/${agentId}`);
      return data;
    },
  });
}

export function usePushAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentId,
      config,
    }: {
      agentId: string;
      config: AgentConfigUpdate;
    }) => {
      const { data } = await apiClient.put<Agent>(
        `/api/v1/agents/${agentId}/config`,
        config
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      await apiClient.delete(`/api/v1/agents/${agentId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  });
}
