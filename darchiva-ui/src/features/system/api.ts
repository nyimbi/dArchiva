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

// ---------------------------------------------------------------------------
// Admin health — services + metrics  (GET /admin/health/services|metrics)
// ---------------------------------------------------------------------------

export interface ServiceStatus {
  name: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  latencyMs: number;
  details: string;
}

export interface ServicesResponse {
  services: ServiceStatus[];
  degradedCount: number;
  downCount: number;
}

export interface MetricItem {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable' | null;
}

export interface MetricsResponse {
  metrics: MetricItem[];
  collectedAt: string;
}

const ADMIN_HEALTH_BASE = '/admin/health';

export const adminHealthKeys = {
  all: ['admin-health'] as const,
  services: () => [...adminHealthKeys.all, 'services'] as const,
  metrics: () => [...adminHealthKeys.all, 'metrics'] as const,
};

/** Live service dependency checks — one probe per service, runs in parallel on the backend. */
export function useServiceHealth(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: adminHealthKeys.services(),
    queryFn: async () => {
      const { data } = await apiClient.get<ServicesResponse>(`${ADMIN_HEALTH_BASE}/services`);
      return data;
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
  });
}

/** Document and pipeline operational metrics from the DB. */
export function useHealthMetrics(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: adminHealthKeys.metrics(),
    queryFn: async () => {
      const { data } = await apiClient.get<MetricsResponse>(`${ADMIN_HEALTH_BASE}/metrics`);
      return data;
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
  });
}
