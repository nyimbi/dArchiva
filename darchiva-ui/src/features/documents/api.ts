// (c) Copyright Datacraft, 2026
/**
 * Documents API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
		mutationFn: async (data: { title: string; parent_id?: string }) => {
			const { data: result } = await apiClient.post<Document>('/nodes/folders', data);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

// Upload needs special handling for FormData
const API_BASE = '/api/v1';
const TOKEN_KEY = 'darchiva_token';

export function useUploadDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { file: File; parent_id?: string }) => {
			const formData = new FormData();
			formData.append('file', data.file);
			if (data.parent_id) formData.append('parent_id', data.parent_id);

			const headers: Record<string, string> = {};
			const token = localStorage.getItem(TOKEN_KEY);
			if (token) headers['Authorization'] = `Bearer ${token}`;

			const response = await fetch(`${API_BASE}/documents/upload`, {
				method: 'POST',
				headers,
				body: formData,
			});
			if (!response.ok) throw new Error('Upload failed');
			return response.json();
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
