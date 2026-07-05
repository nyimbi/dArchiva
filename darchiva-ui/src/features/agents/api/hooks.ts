import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Agent {
  id: string;
  name: string;
  hostname: string;
  platform: string;
  /** Agent software version */
  version: string;
  /** Scanner driver version */
  driverVersion?: string;
  port: number;
  ipAddress: string | null;
  online: boolean;
  /** Fine-grained status — falls back to online/offline if absent */
  status?: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: string | null;
  lastHeartbeat?: string | null;
  /** Scanner hardware model, e.g. "Fujitsu fi-7600" */
  model?: string;
  /** Office location label, e.g. "Room 4B — Floor 2" */
  location?: string;
  /** Number of pages currently queued */
  queueLength?: number;
  /** Operator currently logged in to this workstation */
  currentOperator?: string | null;
  pushedConfig: {
    serverUrl?: string;
    defaultProjectId?: string;
    hotkeys?: Record<string, string>;
  } | null;
  createdAt: string;
}

export interface MaintenanceLog {
  id: string;
  agentId: string;
  type:
    | 'maintenance_start'
    | 'maintenance_end'
    | 'restart'
    | 'error'
    | 'firmware_update'
    | 'config_push';
  notes: string;
  createdAt: string;
}

export interface RegisterAgentInput {
  name: string;
  model: string;
  ipAddress: string;
  location: string;
  driverVersion?: string;
}

export interface AgentConfigUpdate {
  serverUrl?: string;
  defaultProjectId?: string;
  hotkeys?: Record<string, string>;
}

const AGENTS_KEY = ["agents"] as const;

function maintenanceLogsKey(id: string) {
  return ["agents", id, "maintenance-logs"] as const;
}

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

export function useAgentMaintenanceLogs(agentId: string | null) {
  return useQuery({
    queryKey: maintenanceLogsKey(agentId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<MaintenanceLog[]>(
        `/api/v1/agents/${agentId}/maintenance-logs`
      );
      return data ?? [];
    },
    enabled: !!agentId,
  });
}

export function useRegisterAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterAgentInput) => {
      const { data } = await apiClient.post<Agent>("/api/v1/agents", input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
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

export function usePingAgent() {
  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data } = await apiClient.post<{ latencyMs: number }>(
        `/api/v1/agents/${agentId}/ping`
      );
      return data;
    },
  });
}

export function useRestartAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      await apiClient.post(`/api/v1/agents/${agentId}/restart`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  });
}

export function useSetMaintenanceMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentId,
      enabled,
    }: {
      agentId: string;
      enabled: boolean;
    }) => {
      const { data } = await apiClient.put<Agent>(
        `/api/v1/agents/${agentId}/maintenance`,
        { enabled }
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
