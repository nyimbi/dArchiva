// Document Q&A — API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
	id: string;
	conversationId: string;
	documentId: string;
	role: 'user' | 'assistant';
	content: string;
	pageReferences: number[];
	createdAt: string;
}

export interface ChatRequest {
	question: string;
	conversation_id?: string;
}

export interface ChatResponse {
	answer: string;
	conversation_id: string;
	message_id: string;
	page_references: number[];
}

export interface ConversationHistoryResponse {
	conversation_id: string;
	messages: Array<{
		id: string;
		conversation_id: string;
		document_id: string;
		role: 'user' | 'assistant';
		content: string;
		page_references: number[];
		created_at: string;
	}>;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const chatKeys = {
	all: ['document-chat'] as const,
	conversation: (documentId: string, conversationId: string) =>
		[...chatKeys.all, documentId, conversationId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useChatWithDocument(documentId: string) {
	return useMutation({
		mutationFn: async (req: ChatRequest): Promise<ChatResponse> => {
			const { data } = await apiClient.post<ChatResponse>(
				`/documents/${documentId}/chat`,
				req,
			);
			return data;
		},
	});
}

export function useConversationHistory(
	documentId: string,
	conversationId: string | null,
) {
	return useQuery({
		queryKey: chatKeys.conversation(documentId, conversationId ?? ''),
		queryFn: async (): Promise<ConversationHistoryResponse> => {
			const { data } = await apiClient.get<ConversationHistoryResponse>(
				`/documents/${documentId}/chat/${conversationId}`,
			);
			return data;
		},
		enabled: !!conversationId,
	});
}

export function useClearConversation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (conversationId: string): Promise<void> => {
			await apiClient.delete(
				`/documents/${documentId}/chat/${conversationId}`,
			);
		},
		onSuccess: (_data, conversationId) => {
			queryClient.removeQueries({
				queryKey: chatKeys.conversation(documentId, conversationId),
			});
		},
	});
}
