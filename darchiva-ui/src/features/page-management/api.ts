// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExtractPageRequest, MovePageRequest, PageAndRotOp } from './types';

/**
 * POST /pages/
 * Reorder, rotate, and/or delete pages.
 * Pass only the pages to keep, in the desired order, with optional angle deltas.
 */
export function useApplyPageOps(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ops: PageAndRotOp[]) => {
      const { data } = await apiClient.post('/pages/', ops);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', documentId] });
      qc.invalidateQueries({ queryKey: ['document-pages', documentId] });
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * POST /pages/extract
 * Extract selected pages to a new document in a target folder.
 */
export function useExtractPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: ExtractPageRequest) => {
      const { data } = await apiClient.post('/pages/extract', req);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/**
 * POST /pages/move
 * Move pages from one document to another.
 */
export function useMovePages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: MovePageRequest) => {
      const { data } = await apiClient.post('/pages/move', req);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
