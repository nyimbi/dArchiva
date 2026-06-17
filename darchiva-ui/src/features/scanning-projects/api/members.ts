// (c) Copyright Datacraft, 2026
// Project-level RBAC — members API + React Query hooks

import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectRole = 'owner' | 'supervisor' | 'operator' | 'viewer';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  invited_by_id: string | null;
  accepted_at: string | null;
  tenant_id: string;
  created_at: string;
  email: string | null;
  username: string | null;
}

export interface AddMemberInput {
  user_id: string;
  role: ProjectRole;
}

export interface UpdateRoleInput {
  role: ProjectRole;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const memberKeys = {
  all: (projectId: string) => ['scanning-projects', projectId, 'members'] as const,
};

// ─── API calls ───────────────────────────────────────────────────────────────

async function fetchMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await apiClient.get<ProjectMember[]>(
    `/scanning-projects/${projectId}/members`,
  );
  return res.data;
}

async function addMember(projectId: string, body: AddMemberInput): Promise<ProjectMember> {
  const res = await apiClient.post<ProjectMember>(
    `/scanning-projects/${projectId}/members`,
    body,
  );
  return res.data;
}

async function updateMemberRole(
  projectId: string,
  memberId: string,
  body: UpdateRoleInput,
): Promise<ProjectMember> {
  const res = await apiClient.patch<ProjectMember>(
    `/scanning-projects/${projectId}/members/${memberId}`,
    body,
  );
  return res.data;
}

async function removeMember(projectId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/scanning-projects/${projectId}/members/${memberId}`);
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: memberKeys.all(projectId),
    queryFn: () => fetchMembers(projectId),
    enabled: Boolean(projectId),
  });
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMemberInput) => addMember(projectId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.all(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      updateMemberRole(projectId, memberId, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.all(projectId) });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(projectId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.all(projectId) });
    },
  });
}
