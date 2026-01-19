// (c) Copyright Datacraft, 2026
/**
 * Security API functions for policies, encryption, and audit.
 */
import { apiClient } from '@/lib/api-client';
import type {
	PBACPolicy, PolicyApproval, PolicyAnalytics, EvaluationLog,
	EncryptionKey, HiddenAccessRequest, DepartmentAccess, EncryptionStats,
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
	return apiClient.get(`/policies?${searchParams}`);
}

export async function fetchPolicy(id: string): Promise<PBACPolicy> {
	return apiClient.get(`/policies/${id}`);
}

export async function createPolicy(data: {
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
	return apiClient.post('/policies', data);
}

export async function createPolicyFromDSL(data: {
	name: string;
	description?: string;
	dsl_text: string;
	priority?: number;
	valid_from?: string;
	valid_until?: string;
}): Promise<PBACPolicy> {
	return apiClient.post('/policies/from-dsl', data);
}

export async function updatePolicy(id: string, data: Partial<PBACPolicy>): Promise<PBACPolicy> {
	return apiClient.patch(`/policies/${id}`, data);
}

export async function deletePolicy(id: string): Promise<void> {
	return apiClient.delete(`/policies/${id}`);
}

export async function validateDSL(dsl_text: string): Promise<{
	valid: boolean;
	error?: string;
	effect?: string;
	actions?: string[];
	resource_types?: string[];
	rule_count?: number;
}> {
	return apiClient.post('/policies/validate-dsl', { dsl_text });
}

export async function convertToDSL(policyId: string): Promise<{ dsl: string }> {
	return apiClient.post(`/policies/convert-to-dsl?policy_id=${policyId}`, {});
}

// --- Policy Approval API ---

export async function submitForApproval(policyId: string, changesSummary?: string): Promise<PolicyApproval> {
	return apiClient.post(`/policies/${policyId}/submit-for-approval`, { changes_summary: changesSummary });
}

export async function fetchPendingApprovals(): Promise<PolicyApproval[]> {
	return apiClient.get('/policies/approvals/pending');
}

export async function approvePolicy(approvalId: string, comments?: string): Promise<PolicyApproval> {
	return apiClient.post(`/policies/approvals/${approvalId}/approve`, { comments });
}

export async function rejectPolicy(approvalId: string, comments?: string): Promise<PolicyApproval> {
	return apiClient.post(`/policies/approvals/${approvalId}/reject`, { comments });
}

// --- Policy Analytics API ---

export async function fetchPolicyAnalytics(): Promise<PolicyAnalytics> {
	return apiClient.get('/policies/analytics');
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
	return apiClient.get(`/policies/logs?${searchParams}`);
}

// --- Encryption API ---

export async function fetchEncryptionKeys(): Promise<{ items: EncryptionKey[]; active_version: number }> {
	return apiClient.get('/encryption/keys');
}

export async function rotateEncryptionKey(expireOldInDays?: number): Promise<{
	success: boolean;
	new_version: number;
	message?: string;
}> {
	return apiClient.post('/encryption/keys/rotate', { expire_old_in_days: expireOldInDays ?? 30 });
}

export async function fetchDocumentEncryptionInfo(documentId: string): Promise<{
	document_id: string;
	is_encrypted: boolean;
	key_version?: number;
	algorithm?: string;
	created_at?: string;
}> {
	return apiClient.get(`/encryption/documents/${documentId}`);
}

// --- Hidden Document Access API ---

export async function requestHiddenAccess(documentId: string, reason: string, durationHours?: number): Promise<HiddenAccessRequest> {
	return apiClient.post('/encryption/hidden-access/request', {
		document_id: documentId,
		reason,
		duration_hours: durationHours ?? 24,
	});
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
	return apiClient.get(`/encryption/hidden-access/pending?${params}`);
}

export async function approveHiddenAccess(requestId: string, durationHours?: number): Promise<HiddenAccessRequest> {
	return apiClient.post(`/encryption/hidden-access/${requestId}/approve`, { duration_hours: durationHours ?? 24 });
}

export async function denyHiddenAccess(requestId: string): Promise<HiddenAccessRequest> {
	return apiClient.post(`/encryption/hidden-access/${requestId}/deny`, {});
}

// --- Department Access API ---

export async function grantDepartmentAccess(data: {
	user_id: string;
	department_id: string;
	expires_at?: string;
	reason?: string;
}): Promise<DepartmentAccess> {
	return apiClient.post('/policies/department-access', data);
}

export async function revokeDepartmentAccess(userId: string, departmentId: string): Promise<void> {
	return apiClient.delete(`/policies/department-access/${userId}/${departmentId}`);
}

export async function fetchUserDepartmentAccess(userId: string): Promise<DepartmentAccess[]> {
	return apiClient.get(`/policies/department-access/${userId}`);
}
