// (c) Copyright Datacraft, 2026
// Project-level RBAC — members management tab

import { useState } from 'react';
import {
  useProjectMembers,
  useAddProjectMember,
  useUpdateMemberRole,
  useRemoveProjectMember,
  type ProjectRole,
  type ProjectMember,
} from '../api/members';

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_ORDER: ProjectRole[] = ['owner', 'supervisor', 'operator', 'viewer'];

const ROLE_BADGE: Record<ProjectRole, { bg: string; text: string; label: string }> = {
  owner:      { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Owner' },
  supervisor: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Supervisor' },
  operator:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Operator' },
  viewer:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Viewer' },
};

// Roles the current actor is allowed to assign.
// owner can set any role; supervisor can only set operator/viewer.
function assignableRoles(actorRole: ProjectRole | undefined): ProjectRole[] {
  if (actorRole === 'owner') return ROLE_ORDER;
  if (actorRole === 'supervisor') return ['operator', 'viewer'];
  return [];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(member: ProjectMember): string {
  if (member.username) {
    const parts = member.username.split(/[\s._-]+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }
  if (member.email) return member.email[0].toUpperCase();
  return '?';
}

function avatarBg(userId: string): string {
  const colors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: ProjectRole }) {
  const m = ROLE_BADGE[role] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: role };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function Avatar({ member }: { member: ProjectMember }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarBg(member.user_id)}`}
      title={member.email ?? member.user_id}
    >
      {initials(member)}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ProjectMembersTabProps {
  projectId: string;
  /** ID of the currently authenticated user — used to derive what the actor can do. */
  currentUserId?: string;
}

export function ProjectMembersTab({ projectId, currentUserId }: ProjectMembersTabProps) {
  const { data: members = [], isLoading, isError } = useProjectMembers(projectId);

  const addMutation    = useAddProjectMember(projectId);
  const updateMutation = useUpdateMemberRole(projectId);
  const removeMutation = useRemoveProjectMember(projectId);

  // Add-member form state
  const [newUserId, setNewUserId]   = useState('');
  const [newRole, setNewRole]       = useState<ProjectRole>('operator');
  const [addError, setAddError]     = useState<string | null>(null);

  // Derive current actor's role for permission gating
  const actorMember = members.find((m) => m.user_id === currentUserId);
  const actorRole   = actorMember?.role as ProjectRole | undefined;
  const canManage   = actorRole === 'owner' || actorRole === 'supervisor';
  const canAdd      = canManage;
  const rolesForNew = assignableRoles(actorRole);

  function canChangeRole(target: ProjectMember): boolean {
    if (!canManage) return false;
    // supervisor cannot change owners or other supervisors
    if (actorRole === 'supervisor' && (target.role === 'owner' || target.role === 'supervisor')) return false;
    return true;
  }

  function canRemove(target: ProjectMember): boolean {
    if (!canManage) return false;
    if (actorRole === 'supervisor' && (target.role === 'owner' || target.role === 'supervisor')) return false;
    return true;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (!newUserId.trim()) { setAddError('User ID is required'); return; }
    try {
      await addMutation.mutateAsync({ user_id: newUserId.trim(), role: newRole });
      setNewUserId('');
      setNewRole('operator');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Failed to add member';
      setAddError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  async function handleRoleChange(member: ProjectMember, role: ProjectRole) {
    await updateMutation.mutateAsync({ memberId: member.id, role });
  }

  async function handleRemove(member: ProjectMember) {
    if (!window.confirm(`Remove ${member.email ?? member.user_id} from this project?`)) return;
    await removeMutation.mutateAsync(member.id);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Loading members…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Failed to load project members.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Member table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Invited</th>
              {canManage && (
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {members.length === 0 && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-gray-400">
                  No members yet. Add the first member below.
                </td>
              </tr>
            )}
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                {/* Avatar + identity */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar member={member} />
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.username ?? member.email ?? member.user_id}
                      </div>
                      {member.email && member.username && (
                        <div className="text-xs text-gray-400">{member.email}</div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="px-4 py-3">
                  {canChangeRole(member) ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value as ProjectRole)}
                      disabled={updateMutation.isPending}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {assignableRoles(actorRole).map((r) => (
                        <option key={r} value={r}>{ROLE_BADGE[r].label}</option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={member.role as ProjectRole} />
                  )}
                </td>

                {/* Invited date */}
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                    : '—'}
                </td>

                {/* Remove button */}
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {canRemove(member) ? (
                      <button
                        onClick={() => handleRemove(member)}
                        disabled={removeMutation.isPending}
                        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add member form ───────────────────────────────────────────────── */}
      {canAdd && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Add Member</h3>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                User ID
              </label>
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Paste user UUID…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as ProjectRole)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {rolesForNew.map((r) => (
                  <option key={r} value={r}>{ROLE_BADGE[r].label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={addMutation.isPending || !newUserId.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {addMutation.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>

          {addError && (
            <p className="mt-2 text-xs text-red-600">{addError}</p>
          )}
        </div>
      )}

      {/* Open-access notice when no members exist */}
      {members.length === 0 && (
        <p className="text-xs text-gray-400">
          No members are configured — this project is currently open to all tenant users.
        </p>
      )}
    </div>
  );
}
