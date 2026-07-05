// (c) Copyright Datacraft, 2026
// Document segmentation — React Query hooks

import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Segment,
  SegmentationJob,
  SegmentationJobResponse,
  SegmentationRequest,
  SegmentationStats,
  SegmentCreateDocumentRequest,
  SegmentListResponse,
  SegmentUpdateRequest,
  SegmentVerifyRequest,
} from './types';

// ── Query key factory ─────────────────────────────────────────────────────────

export const segmentationKeys = {
  all: ['segmentation'] as const,
  jobs: () => [...segmentationKeys.all, 'jobs'] as const,
  job: (id: string) => [...segmentationKeys.jobs(), id] as const,
  segments: (documentId?: string, page?: number) =>
    [...segmentationKeys.all, 'segments', documentId, page] as const,
  segment: (id: string) => [...segmentationKeys.all, 'segment', id] as const,
  stats: () => [...segmentationKeys.all, 'stats'] as const,
};

// ── Raw API functions ─────────────────────────────────────────────────────────

async function fetchJobs(): Promise<SegmentationJob[]> {
  const { data } = await apiClient.get<SegmentationJob[]>('/segmentation/jobs');
  return data;
}

async function fetchJob(jobId: string): Promise<SegmentationJob> {
  const { data } = await apiClient.get<SegmentationJob>(`/segmentation/jobs/${jobId}`);
  return data;
}

async function fetchSegments(
  documentId?: string,
  page = 1,
  pageSize = 50,
): Promise<SegmentListResponse> {
  const params: Record<string, string | number> = { page, page_size: pageSize };
  if (documentId) params['document_id'] = documentId;
  const { data } = await apiClient.get<SegmentListResponse>('/segmentation/segments', { params });
  return data;
}

async function fetchStats(): Promise<SegmentationStats> {
  const { data } = await apiClient.get<SegmentationStats>('/segmentation/stats');
  return data;
}

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useSegmentationJobs() {
  return useQuery({
    queryKey: segmentationKeys.jobs(),
    queryFn: fetchJobs,
  });
}

export function useSegmentationJob(jobId: string) {
  return useQuery({
    queryKey: segmentationKeys.job(jobId),
    queryFn: () => fetchJob(jobId),
    enabled: !!jobId,
  });
}

export function useJobSegments(documentId?: string, page = 1) {
  return useQuery({
    queryKey: segmentationKeys.segments(documentId, page),
    queryFn: () => fetchSegments(documentId, page),
    enabled: !!documentId,
  });
}

export function useSegmentationStats() {
  return useQuery({
    queryKey: segmentationKeys.stats(),
    queryFn: fetchStats,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useStartSegmentation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: SegmentationRequest): Promise<SegmentationJobResponse> => {
      const { data } = await apiClient.post<SegmentationJobResponse>('/segmentation/analyze', req);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: segmentationKeys.jobs() });
    },
  });
}

export function useVerifySegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      segmentId,
      req,
    }: {
      segmentId: string;
      req: SegmentVerifyRequest;
    }): Promise<Segment> => {
      const { data } = await apiClient.post<Segment>(
        `/segmentation/segments/${segmentId}/verify`,
        req,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: segmentationKeys.all });
    },
  });
}

export function useUpdateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      segmentId,
      req,
    }: {
      segmentId: string;
      req: SegmentUpdateRequest;
    }): Promise<Segment> => {
      const { data } = await apiClient.patch<Segment>(
        `/segmentation/segments/${segmentId}`,
        req,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: segmentationKeys.all });
    },
  });
}

export function useCreateDocumentFromSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      req: SegmentCreateDocumentRequest,
    ): Promise<{ document_id: string; segment_id: string }> => {
      const { data } = await apiClient.post<{ document_id: string; segment_id: string }>(
        `/segmentation/segments/${req.segment_id}/create-document`,
        req,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: segmentationKeys.all });
    },
  });
}

export function useDeskewDocument() {
  return useMutation({
    mutationFn: async (file: File): Promise<Blob> => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<Blob>('/segmentation/deskew', formData, {
        responseType: 'blob',
      });
      return data;
    },
  });
}
