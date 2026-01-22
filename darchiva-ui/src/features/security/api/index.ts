// (c) Copyright Datacraft, 2026
/**
 * Security API functions for policies, encryption, and audit.
 */
import { apiClient } from '@/lib/api-client';
import type {
	PBACPolicy, PolicyApproval, PolicyAnalytics, EvaluationLog,
	EncryptionKey, HiddenAccessRequest, DepartmentAccess,
	PolicyStatus, PolicyEffect, PBACRule
} from '../types';

// --- Policy API ---

export async function fetchPolicies(params?: {
	status?: PolicyStatus;
	effect?: PolicyEffect;
	limit?: number;
	offset?: number;
}): Promise<{ items: PBACPolicy[]; total: number }> {
	const searchParams = new URLSearchParams();
	if (params?.status) searchParams.set('status', params.status);
	if (params?.effect) searchParams.set('effect', params.effect);
	if (params?.limit) searchParams.set('limit', String(params.limit));
	if (params?.offset) searchParams.set('offset', String(params.offset));
	const { data } = await apiClient.get<{ items: PBACPolicy[]; total: number }>(`/policies?${searchParams}`);
	return data;
}

export async function fetchPolicy(id: string): Promise<PBACPolicy> {
	const { data } = await apiClient.get<PBACPolicy>(`/policies/${id}`);
	return data;
}

export async function createPolicy(policyData: {
	name: string;
	description?: string;
	effect: PolicyEffect;
	priority?: number;
	rules: PBACRule[];
	actions: string[];
	resource_types: string[];
	valid_from?: string;
	valid_until?: string;
}): Promise<PBACPolicy> {
	const { data } = await apiClient.post<PBACPolicy>('/policies', policyData);
	return data;
}

export async function createPolicyFromDSL(policyData: {
	name: string;
	description?: string;
	dsl_text: string;
	priority?: number;
	valid_from?: string;
	valid_until?: string;
}): Promise<PBACPolicy> {
	const { data } = await apiClient.post<PBACPolicy>('/policies/from-dsl', policyData);
	return data;
}

export async function updatePolicy(id: string, policyData: Partial<PBACPolicy>): Promise<PBACPolicy> {
	const { data } = await apiClient.patch<PBACPolicy>(`/policies/${id}`, policyData);
	return data;
}

export async function deletePolicy(id: string): Promise<void> {
	await apiClient.delete(`/policies/${id}`);
}

export async function validateDSL(dsl_text: string): Promise<{
	valid: boolean;
	error?: string;
	effect?: string;
	actions?: string[];
	resource_types?: string[];
	rule_count?: number;
}> {
	const { data } = await apiClient.post<{
		valid: boolean;
		error?: string;
		effect?: string;
		actions?: string[];
		resource_types?: string[];
		rule_count?: number;
	}>('/policies/validate-dsl', { dsl_text });
	return data;
}

export async function convertToDSL(policyId: string): Promise<{ dsl: string }> {
	const { data } = await apiClient.post<{ dsl: string }>(`/policies/convert-to-dsl?policy_id=${policyId}`, {});
	return data;
}

// --- Policy Approval API ---

export async function submitForApproval(policyId: string, changesSummary?: string): Promise<PolicyApproval> {
	const { data } = await apiClient.post<PolicyApproval>(`/policies/${policyId}/submit-for-approval`, { changes_summary: changesSummary });
	return data;
}

export async function fetchPendingApprovals(): Promise<PolicyApproval[]> {
	const { data } = await apiClient.get<PolicyApproval[]>('/policies/approvals/pending');
	return data;
}

export async function approvePolicy(approvalId: string, comments?: string): Promise<PolicyApproval> {
	const { data } = await apiClient.post<PolicyApproval>(`/policies/approvals/${approvalId}/approve`, { comments });
	return data;
}

export async function rejectPolicy(approvalId: string, comments?: string): Promise<PolicyApproval> {
	const { data } = await apiClient.post<PolicyApproval>(`/policies/approvals/${approvalId}/reject`, { comments });
	return data;
}

// --- Policy Analytics API ---

export async function fetchPolicyAnalytics(): Promise<PolicyAnalytics> {
	const { data } = await apiClient.get<PolicyAnalytics>('/policies/analytics');
	return data;
}

export async function fetchEvaluationLogs(params?: {
	subject_id?: string;
	resource_id?: string;
	action?: string;
	hours?: number;
	limit?: number;
}): Promise<EvaluationLog[]> {
	const searchParams = new URLSearchParams();
	if (params?.subject_id) searchParams.set('subject_id', params.subject_id);
	if (params?.resource_id) searchParams.set('resource_id', params.resource_id);
	if (params?.action) searchParams.set('action', params.action);
	if (params?.hours) searchParams.set('hours', String(params.hours));
	if (params?.limit) searchParams.set('limit', String(params.limit));
	const { data } = await apiClient.get<EvaluationLog[]>(`/policies/logs?${searchParams}`);
	return data;
}

// --- Encryption API ---

export async function fetchEncryptionKeys(): Promise<{ items: EncryptionKey[]; active_version: number }> {
	const { data } = await apiClient.get<{ items: EncryptionKey[]; active_version: number }>('/encryption/keys');
	return data;
}

export async function rotateEncryptionKey(expireOldInDays?: number): Promise<{
	success: boolean;
	new_version: number;
	message?: string;
}> {
	const { data } = await apiClient.post<{
		success: boolean;
		new_version: number;
		message?: string;
	}>('/encryption/keys/rotate', { expire_old_in_days: expireOldInDays ?? 30 });
	return data;
}

export async function fetchDocumentEncryptionInfo(documentId: string): Promise<{
	document_id: string;
	is_encrypted: boolean;
	key_version?: number;
	algorithm?: string;
	created_at?: string;
}> {
	const { data } = await apiClient.get<{
		document_id: string;
		is_encrypted: boolean;
		key_version?: number;
		algorithm?: string;
		created_at?: string;
	}>(`/encryption/documents/${documentId}`);
	return data;
}

// --- Hidden Document Access API ---

export async function requestHiddenAccess(documentId: string, reason: string, durationHours?: number): Promise<HiddenAccessRequest> {
	const { data } = await apiClient.post<HiddenAccessRequest>('/encryption/hidden-access/request', {
		document_id: documentId,
		reason,
		duration_hours: durationHours ?? 24,
	});
	return data;
}

export async function fetchPendingAccessRequests(page?: number, pageSize?: number): Promise<{
	items: HiddenAccessRequest[];
	total: number;
	page: number;
	page_size: number;
}> {
	const params = new URLSearchParams();
	if (page) params.set('page', String(page));
	if (pageSize) params.set('page_size', String(pageSize));
	const { data } = await apiClient.get<{
		items: HiddenAccessRequest[];
		total: number;
		page: number;
		page_size: number;
	}>(`/encryption/hidden-access/pending?${params}`);
	return data;
}

export async function approveHiddenAccess(requestId: string, durationHours?: number): Promise<HiddenAccessRequest> {
	const { data } = await apiClient.post<HiddenAccessRequest>(`/encryption/hidden-access/${requestId}/approve`, { duration_hours: durationHours ?? 24 });
	return data;
}

export async function denyHiddenAccess(requestId: string): Promise<HiddenAccessRequest> {
	const { data } = await apiClient.post<HiddenAccessRequest>(`/encryption/hidden-access/${requestId}/deny`, {});
	return data;
}

// --- Department Access API ---

export async function grantDepartmentAccess(accessData: {
	user_id: string;
	department_id: string;
	expires_at?: string;
	reason?: string;
}): Promise<DepartmentAccess> {
	const { data } = await apiClient.post<DepartmentAccess>('/policies/department-access', accessData);
	return data;
}

export async function revokeDepartmentAccess(userId: string, departmentId: string): Promise<void> {
	await apiClient.delete(`/policies/department-access/${userId}/${departmentId}`);
}

export async function fetchUserDepartmentAccess(userId: string): Promise<DepartmentAccess[]> {
	const { data } = await apiClient.get<DepartmentAccess[]>(`/policies/department-access/${userId}`);
	return data;
}
