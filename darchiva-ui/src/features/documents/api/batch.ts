// (c) Copyright Datacraft, 2026
/**
 * Batch document operations — POST /api/v1/documents/batch
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentKeys } from '../api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatchOperation = 'tag' | 'move' | 'classify' | 'delete' | 'export';
export type TagAction = 'add' | 'remove' | 'set';

export interface BatchTagParams {
  tag_ids: string[];
  action: TagAction;
}

export interface BatchMoveParams {
  destination_folder_id: string;
}

export interface BatchClassifyParams {
  document_type_id: string;
}

export interface BatchOperationRequest {
  operation: BatchOperation;
  document_ids: string[];
  params: BatchTagParams | BatchMoveParams | BatchClassifyParams | Record<string, never>;
}

export interface BatchOperationResponse {
  operation_id: string;
  /** "completed" for < 50 docs; "queued" for larger batches or export */
  status: 'queued' | 'completed';
  affected: int;
  errors: string[];
}

// Re-export so callers can do a single import from this file
type int = number;

// ---------------------------------------------------------------------------
// Mutation hook
// ---------------------------------------------------------------------------

/**
 * useBatchOperation
 *
 * Unified mutation for all batch document operations.
 * On success the documents list is invalidated so the UI reflects changes.
 *
 * Usage:
 *   const batch = useBatchOperation();
 *   batch.mutate({ operation: 'delete', document_ids: [...], params: {} });
 */
export function useBatchOperation() {
  const queryClient = useQueryClient();

  return useMutation<BatchOperationResponse, Error, BatchOperationRequest>({
    mutationFn: async (req) => {
      const { data } = await apiClient.post<BatchOperationResponse>(
        '/documents/batch',
        req,
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      // Always refresh the document list
      queryClient.invalidateQueries({ queryKey: documentKeys.all });

      // For export, the caller can read operation_id from the response
      // and poll /nodes/bulk-export/{operation_id} for status.
      if (variables.operation === 'export') {
        // No additional invalidation needed — export doesn't mutate document list
        return;
      }
    },
  });
}
