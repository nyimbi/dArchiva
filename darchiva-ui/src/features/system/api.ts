// (c) Copyright Datacraft, 2026
/**
 * System Health API hooks.
 *
 * Calls:
 *   GET /system/health   — full snapshot
 *   GET /system/queues   — queue depths only
 *   GET /system/workers  — worker list only
 */
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

const API_BASE = '/system';

// ---------------------------------------------------------------------------
// Types — mirror papermerge.core.features.system.schema (snake_case from API,
// camelCased by the snakeToCamel transformer in api-client.ts)
// ---------------------------------------------------------------------------

export interface WorkerInfo {
  id: string;
  name: string;
  queue: string;
  status: string; // 'running' | 'stopped' | 'error' | 'unknown'
  concurrency: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  lastTaskAt: string | null;
  currentTask: string | null;
  memoryMb: number | null;
  cpuPercent: number | null;
  startedAt: string | null;
}

export interface QueueInfo {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  priorityPending: Record<string, number>;
  oldestMessageAgeSeconds: number | null;
  consumers: number;
}

export interface DatabaseHealth {
  connected: boolean;
  latencyMs: number;
  activeConnections: number;
  maxConnections: number;
  diskUsageBytes: number;
  diskTotalBytes: number;
  replicationLagMs: number | null;
  lastBackup: string | null;
}

export interface StorageHealth {
  available: boolean;
  latencyMs: number;
  usedBytes: number;
  totalBytes: number;
  objectsCount: number;
}

export interface CacheHealth {
  connected: boolean;
  latencyMs: number;
  memoryUsedBytes: number;
  memoryMaxBytes: number;
  hitRate: number;
  keysCount: number;
}

export interface SystemHealth {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  workers: WorkerInfo[];
  queues: QueueInfo[];
  database: DatabaseHealth;
  storage: StorageHealth;
  cache: CacheHealth;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const systemHealthKeys = {
  all: ['system-health'] as const,
  health: () => [...systemHealthKeys.all, 'health'] as const,
  queues: () => [...systemHealthKeys.all, 'queues'] as const,
  workers: () => [...systemHealthKeys.all, 'workers'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Full system health snapshot — refetches every 30 s. */
export function useSystemHealth(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: systemHealthKeys.health(),
    queryFn: async () => {
      const { data } = await apiClient.get<SystemHealth>(`${API_BASE}/health`);
      return data;
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    // Never throw — degrade gracefully so the dashboard always renders
    retry: 1,
  });
}

/** Queue depths only — lightweight, suitable for fast polling. */
export function useSystemQueues(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: systemHealthKeys.queues(),
    queryFn: async () => {
      const { data } = await apiClient.get<QueueInfo[]>(`${API_BASE}/queues`);
      return data ?? [];
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
  });
}

/** Worker list only. */
export function useSystemWorkers(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: systemHealthKeys.workers(),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkerInfo[]>(`${API_BASE}/workers`);
      return data ?? [];
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
  });
}
