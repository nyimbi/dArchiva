// (c) Copyright Datacraft, 2026
/**
 * Documents API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';

export interface TreeNode {
	id: string;
	title: string;
	ctype: 'folder' | 'document';
	children?: TreeNode[];
	parent_id?: string;
}

export interface Document {
	id: string;
	title: string;
	ctype: 'folder' | 'document';
	parent_id?: string;
	created_at: string;
	updated_at: string;
	tags: Array<{ id: string; name: string; color: string }>;
	document_type?: { id: string; name: string };
	page_count?: number;
	ocr_status?: 'pending' | 'processing' | 'completed' | 'failed';
	file_size?: number;
	thumbnail_url?: string;
}

export interface DocumentListResponse {
	items: Document[];
	total: number;
	page: number;
	page_size: number;
}

export interface FolderTreeResponse {
	nodes: TreeNode[];
}

export const documentKeys = {
	all: ['documents'] as const,
	tree: () => [...documentKeys.all, 'tree'] as const,
	lists: () => [...documentKeys.all, 'list'] as const,
	list: (folderId?: string, page?: number) => [...documentKeys.lists(), folderId, page] as const,
	detail: (id: string) => [...documentKeys.all, 'detail', id] as const,
};

export function useFolderTree() {
	return useQuery({
		queryKey: documentKeys.tree(),
		queryFn: async () => {
			const { data } = await apiClient.get<FolderTreeResponse>('/nodes/tree');
			return data.nodes;
		},
	});
}

export function useDocuments(folderId?: string, page = 1, pageSize = 50) {
	return useQuery({
		queryKey: documentKeys.list(folderId, page),
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentListResponse>('/nodes/', {
				params: { page, page_size: pageSize, parent_id: folderId },
			});
			return data;
		},
	});
}

export function useDocument(id: string) {
	return useQuery({
		queryKey: documentKeys.detail(id),
		queryFn: async () => {
			const { data } = await apiClient.get<Document>(`/nodes/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useCreateFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: {
			title: string;
			parent_id?: string;
			portfolio_id?: string;
			case_id?: string;
			bundle_id?: string;
		}) => {
			const { data: result } = await apiClient.post<Document>('/nodes/', {
				...data,
				ctype: 'folder',
			});
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

export function useUploadDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { file: File; parent_id?: string }) => {
			const formData = new FormData();
			formData.append('file', data.file);
			if (data.parent_id) formData.append('parent_id', data.parent_id);
			const { data: result } = await apiClient.post<Document>('/documents/upload', formData);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

export function useDeleteDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/nodes/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

export function useMoveDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { id: string; parent_id: string }) => {
			const { data: result } = await apiClient.patch<Document>(`/nodes/${data.id}/move`, {
				parent_id: data.parent_id,
			});
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

export function useUpdateFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { id: string; title: string }) => {
			const { data: result } = await apiClient.patch<Document>(`/nodes/${data.id}`, {
				title: data.title,
			});
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

export function useDeleteFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			// Backend expects list of UUIDs in request body
			await apiClient.delete('/nodes/', { data: [id] });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

/**
 * Update page OCR text
 */
export interface UpdatePageTextResponse {
	pageId: string;
	text: string;
	success: boolean;
}

export function useUpdatePageText() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { pageId: string; text: string }) => {
			const { data: result } = await apiClient.patch<UpdatePageTextResponse>(
				`/pages/${data.pageId}/text`,
				{ text: data.text }
			);
			return result;
		},
		onSuccess: () => {
			// Invalidate document queries to refresh OCR text
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

/**
 * Standalone function to save page OCR text (for non-hook contexts)
 */
export async function savePageOcrText(pageId: string, text: string): Promise<void> {
	await apiClient.patch(`/pages/${pageId}/text`, { text });
}
