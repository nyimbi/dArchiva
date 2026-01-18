// (c) Copyright Datacraft, 2026
/**
 * Documents API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/api/v1';

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
			const response = await axios.get<FolderTreeResponse>(`${API_BASE}/nodes/tree`);
			return response.data.nodes;
		},
	});
}

export function useDocuments(folderId?: string, page = 1, pageSize = 50) {
	return useQuery({
		queryKey: documentKeys.list(folderId, page),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (folderId) params.parent_id = folderId;
			const response = await axios.get<DocumentListResponse>(`${API_BASE}/nodes`, { params });
			return response.data;
		},
	});
}

export function useDocument(id: string) {
	return useQuery({
		queryKey: documentKeys.detail(id),
		queryFn: async () => {
			const response = await axios.get<Document>(`${API_BASE}/nodes/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useCreateFolder() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { title: string; parent_id?: string }) => {
			const response = await axios.post<Document>(`${API_BASE}/nodes/folders`, data);
			return response.data;
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
			const response = await axios.post<Document>(`${API_BASE}/documents/upload`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			return response.data;
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
			await axios.delete(`${API_BASE}/nodes/${id}`);
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
			const response = await axios.patch<Document>(`${API_BASE}/nodes/${data.id}/move`, {
				parent_id: data.parent_id,
			});
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}
