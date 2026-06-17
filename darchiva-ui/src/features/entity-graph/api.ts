import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { EntityGraphResponse, EntityDocumentsResponse } from './types';

export function useEntityGraph(entityType?: string) {
  return useQuery({
    queryKey: ['entity-graph', entityType],
    queryFn: async () => {
      const { data } = await apiClient.get<EntityGraphResponse>('/entities/graph', {
        params: entityType ? { entity_type: entityType } : undefined,
      });
      return data;
    },
    staleTime: 120000,
  });
}

export function useEntityDocuments(entityId: string | null) {
  return useQuery({
    queryKey: ['entity-documents', entityId],
    queryFn: async () => {
      const { data } = await apiClient.get<EntityDocumentsResponse>(`/entities/${entityId}/documents`);
      return data;
    },
    enabled: !!entityId,
  });
}
