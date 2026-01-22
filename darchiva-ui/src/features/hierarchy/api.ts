// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';

export interface HierarchyNode {
	id: string;
	name: string;
	type: 'portfolio' | 'case' | 'bundle' | 'document';
	parent_id?: string;
	children_count: number;
	created_at: string;
	updated_at: string;
	metadata?: Record<string, unknown>;
}

export interface Portfolio extends HierarchyNode {
	type: 'portfolio';
	description?: string;
	status: 'active' | 'archived' | 'closed';
	case_count: number;
}

export interface Case extends HierarchyNode {
	type: 'case';
	portfolio_id: string;
	case_number?: string;
	status: 'open' | 'in_progress' | 'review' | 'closed';
	bundle_count: number;
	assigned_to?: string;
}

export interface Bundle extends HierarchyNode {
	type: 'bundle';
	case_id: string;
	document_count: number;
	total_pages: number;
}

export interface Document extends HierarchyNode {
	type: 'document';
	bundle_id?: string;
	file_type: string;
	page_count: number;
	ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export type AnyHierarchyNode = Portfolio | Case | Bundle | Document;

export interface HierarchyTreeResponse {
	items: AnyHierarchyNode[];
	total: number;
}

// API Functions
export async function getPortfolios(page = 1, pageSize = 50): Promise<HierarchyTreeResponse> {
	const res = await apiClient.get<HierarchyTreeResponse>(`/portfolios?page=${page}&page_size=${pageSize}`);
	return res.data;
}

export async function getPortfolio(id: string): Promise<Portfolio> {
	const res = await apiClient.get<Portfolio>(`/portfolios/${id}`);
	return res.data;
}

export async function getCases(portfolioId: string): Promise<HierarchyTreeResponse> {
	const res = await apiClient.get<HierarchyTreeResponse>(`/portfolios/${portfolioId}/cases`);
	return res.data;
}

export async function getCase(id: string): Promise<Case> {
	const res = await apiClient.get<Case>(`/cases/${id}`);
	return res.data;
}

export async function getBundles(caseId: string): Promise<HierarchyTreeResponse> {
	const res = await apiClient.get<HierarchyTreeResponse>(`/cases/${caseId}/bundles`);
	return res.data;
}

export async function getBundle(id: string): Promise<Bundle> {
	const res = await apiClient.get<Bundle>(`/bundles/${id}`);
	return res.data;
}

export async function getDocuments(bundleId: string): Promise<HierarchyTreeResponse> {
	const res = await apiClient.get<HierarchyTreeResponse>(`/bundles/${bundleId}/documents`);
	return res.data;
}

export async function getDocument(id: string): Promise<Document> {
	const res = await apiClient.get<Document>(`/documents/${id}`);
	return res.data;
}

export async function searchHierarchy(query: string): Promise<AnyHierarchyNode[]> {
	const res = await apiClient.get<AnyHierarchyNode[]>(`/hierarchy/search?q=${encodeURIComponent(query)}`);
	return res.data;
}

export async function moveNode(nodeId: string, targetId: string, nodeType: string): Promise<void> {
	await apiClient.post(`/hierarchy/move`, { node_id: nodeId, target_id: targetId, node_type: nodeType });
}
