// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentComment, CreateCommentPayload, MentionUser, UpdateCommentPayload } from './types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const commentKeys = {
  all: ['document-comments'] as const,
  byDocument: (documentId: string) => ['document-comments', documentId] as const,
  mentionUsers: (query: string) => ['comment-mention-users', query] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useDocumentComments(documentId: string, pageNumber?: number) {
  return useQuery({
    queryKey: commentKeys.byDocument(documentId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (pageNumber != null) params.page_number = pageNumber;
      const { data } = await apiClient.get<DocumentComment[]>(
        `/documents/${documentId}/comments`,
        { params },
      );
      return data;
    },
    enabled: !!documentId,
  });
}

export function useCreateComment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateCommentPayload) => {
      const { data } = await apiClient.post<DocumentComment>(
        `/documents/${documentId}/comments`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byDocument(documentId) });
    },
  });
}

export function useUpdateComment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      ...body
    }: UpdateCommentPayload & { commentId: string }) => {
      const { data } = await apiClient.patch<DocumentComment>(
        `/documents/${documentId}/comments/${commentId}`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byDocument(documentId) });
    },
  });
}

export function useDeleteComment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/documents/${documentId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byDocument(documentId) });
    },
  });
}

export function useReactToComment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, emoji }: { commentId: string; emoji: string }) => {
      const { data } = await apiClient.post<DocumentComment>(
        `/documents/${documentId}/comments/${commentId}/reactions`,
        { emoji },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.byDocument(documentId) });
    },
  });
}

export function useMentionUsers(query: string) {
  return useQuery({
    queryKey: commentKeys.mentionUsers(query),
    queryFn: async () => {
      const { data } = await apiClient.get<{ items?: MentionUser[] } | MentionUser[]>(
        '/users/',
        { params: { search: query } },
      );
      return Array.isArray(data) ? data : data.items ?? [];
    },
    enabled: query.trim().length > 0,
    staleTime: 30_000,
  });
}
