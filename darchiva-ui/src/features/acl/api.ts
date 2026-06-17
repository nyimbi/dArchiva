// (c) Copyright Datacraft, 2026
/**
 * ACL API hooks — per-resource access control lists.
 * Targets: GET/POST /acl/{resource_type}/{resource_id}
 *          PATCH/DELETE /acl/{resource_type}/{resource_id}/{acl_id}
 *          GET /acl/{resource_type}/{resource_id}/my-perms
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResourceType = 'document' | 'folder';
export type PrincipalType = 'user' | 'group';

export interface ACLEntry {
	id: string;
	resource_type: ResourceType;
	resource_id: string;
	principal_type: PrincipalType;
	principal_id: string;
	principal_name: string;
	can_read: boolean;
	can_write: boolean;
	can_delete: boolean;
	can_share: boolean;
	granted_by_id: string;
	tenant_id: string | null;
	created_at: string;
	expires_at: string | null;
}

export interface GrantAccessInput {
	principal_type: PrincipalType;
	principal_id: string;
	principal_name: string;
	can_read?: boolean;
	can_write?: boolean;
	can_delete?: boolean;
	can_share?: boolean;
	expires_at?: string | null;
}

export interface UpdateAccessInput {
	can_read?: boolean;
	can_write?: boolean;
	can_delete?: boolean;
	can_share?: boolean;
	expires_at?: string | null;
	principal_name?: string;
}

export interface EffectivePerms {
	can_read: boolean;
	can_write: boolean;
	can_delete: boolean;
	can_share: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const aclKeys = {
	all: ['acl'] as const,
	byResource: (resourceType: ResourceType, resourceId: string) =>
		[...aclKeys.all, resourceType, resourceId] as const,
	myPerms: (resourceType: ResourceType, resourceId: string) =>
		[...aclKeys.all, 'my-perms', resourceType, resourceId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all ACL entries for a document or folder. */
export function useDocumentACL(resourceType: ResourceType, resourceId: string) {
	return useQuery({
		queryKey: aclKeys.byResource(resourceType, resourceId),
		queryFn: async () => {
			const { data } = await apiClient.get<ACLEntry[]>(
				`/acl/${resourceType}/${resourceId}`,
			);
			return Array.isArray(data) ? data : [];
		},
		enabled: !!resourceId,
	});
}

/** Get effective permissions of the current user on a resource. */
export function useMyPermissions(resourceType: ResourceType, resourceId: string) {
	return useQuery({
		queryKey: aclKeys.myPerms(resourceType, resourceId),
		queryFn: async () => {
			const { data } = await apiClient.get<EffectivePerms>(
				`/acl/${resourceType}/${resourceId}/my-perms`,
			);
			return data;
		},
		enabled: !!resourceId,
	});
}

/** Grant a user or group access to a resource. */
export function useGrantAccess() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			resourceType,
			resourceId,
			input,
		}: {
			resourceType: ResourceType;
			resourceId: string;
			input: GrantAccessInput;
		}) => {
			const { data } = await apiClient.post<ACLEntry>(
				`/acl/${resourceType}/${resourceId}`,
				input,
			);
			return data;
		},
		onSuccess: (_, { resourceType, resourceId }) => {
			queryClient.invalidateQueries({
				queryKey: aclKeys.byResource(resourceType, resourceId),
			});
		},
	});
}

/** Update permission flags on an existing ACL entry. */
export function useUpdateAccess() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			resourceType,
			resourceId,
			aclId,
			input,
		}: {
			resourceType: ResourceType;
			resourceId: string;
			aclId: string;
			input: UpdateAccessInput;
		}) => {
			const { data } = await apiClient.patch<ACLEntry>(
				`/acl/${resourceType}/${resourceId}/${aclId}`,
				input,
			);
			return data;
		},
		onSuccess: (_, { resourceType, resourceId }) => {
			queryClient.invalidateQueries({
				queryKey: aclKeys.byResource(resourceType, resourceId),
			});
		},
	});
}

/** Revoke (hard delete) an ACL entry. */
export function useRevokeAccess() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			resourceType,
			resourceId,
			aclId,
		}: {
			resourceType: ResourceType;
			resourceId: string;
			aclId: string;
		}) => {
			await apiClient.delete(
				`/acl/${resourceType}/${resourceId}/${aclId}`,
			);
		},
		onSuccess: (_, { resourceType, resourceId }) => {
			queryClient.invalidateQueries({
				queryKey: aclKeys.byResource(resourceType, resourceId),
			});
		},
	});
}
