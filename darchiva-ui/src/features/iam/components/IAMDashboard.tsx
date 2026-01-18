// IAM Dashboard - Unified admin view
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
	Users, Shield, Building2, Key, Activity, UserPlus, ShieldPlus,
	Mail, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle,
	ChevronRight, MoreHorizontal, Eye,
} from 'lucide-react';
import { MetricCard } from './core/MetricCard';
import { PermissionBadge } from './core/PermissionBadge';
import { useIAMStats, useAccessEvents, useInvitations } from '../api/hooks';
import type { AccessEvent, UserInvitation } from '../types';
import '../styles/theme.css';

interface IAMDashboardProps {
	onNavigate: (section: string, id?: string) => void;
}

export function IAMDashboard({ onNavigate }: IAMDashboardProps) {
	const { data: stats, isLoading } = useIAMStats();
	const { data: eventsData } = useAccessEvents({ pageSize: 10 });
	const { data: invitations } = useInvitations();

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	const pendingInvitations = invitations?.filter(i => i.status === 'pending') || [];

	return (
		<div className="iam-root min-h-screen p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-semibold text-[var(--iam-text-primary)]">
						Identity & Access Management
					</h1>
					<p className="text-sm text-[var(--iam-text-secondary)] mt-1">
						Manage users, roles, groups, and permissions
					</p>
				</div>

				<div className="flex gap-2">
					<QuickActionButton
						icon={<UserPlus className="w-4 h-4" />}
						label="Invite User"
						onClick={() => onNavigate('invite')}
					/>
					<QuickActionButton
						icon={<ShieldPlus className="w-4 h-4" />}
						label="Create Role"
						onClick={() => onNavigate('roles', 'new')}
					/>
				</div>
			</div>

			{/* Metrics Grid */}
			<div className="grid grid-cols-5 gap-4 mb-8 iam-stagger">
				<MetricCard
					label="Total Users"
					value={stats?.total_users || 0}
					icon={<Users className="w-4 h-4" />}
					sparkline={stats?.login_activity?.map(d => d.count)}
				/>
				<MetricCard
					label="Active Sessions"
					value={stats?.active_sessions || 0}
					icon={<Activity className="w-4 h-4" />}
					variant="accent"
				/>
				<MetricCard
					label="Pending Invites"
					value={stats?.pending_invitations || 0}
					icon={<Mail className="w-4 h-4" />}
					variant={stats?.pending_invitations ? 'warning' : 'default'}
				/>
				<MetricCard
					label="Roles"
					value={stats?.total_roles || 0}
					icon={<Shield className="w-4 h-4" />}
				/>
				<MetricCard
					label="Groups"
					value={stats?.total_groups || 0}
					icon={<Building2 className="w-4 h-4" />}
				/>
			</div>

			{/* Main Grid */}
			<div className="grid grid-cols-3 gap-6">
				{/* Role Distribution */}
				<div className="iam-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-[var(--iam-text-primary)]">
							Role Distribution
						</h3>
						<button
							onClick={() => onNavigate('roles')}
							className="text-xs text-[var(--iam-accent)] hover:underline"
						>
							View All
						</button>
					</div>
					<RoleDistributionChart data={stats?.users_by_role || {}} />
				</div>

				{/* Permission Coverage */}
				<div className="iam-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-[var(--iam-text-primary)]">
							Permission Coverage
						</h3>
						<button
							onClick={() => onNavigate('matrix')}
							className="text-xs text-[var(--iam-accent)] hover:underline"
						>
							Matrix
						</button>
					</div>
					<PermissionHeatmap data={stats?.permission_coverage || []} />
				</div>

				{/* User Status */}
				<div className="iam-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-sm font-medium text-[var(--iam-text-primary)]">
							User Status
						</h3>
						<button
							onClick={() => onNavigate('users')}
							className="text-xs text-[var(--iam-accent)] hover:underline"
						>
							Manage
						</button>
					</div>
					<UserStatusChart
						active={stats?.active_users || 0}
						inactive={stats?.inactive_users || 0}
					/>
				</div>
			</div>

			{/* Bottom Grid */}
			<div className="grid grid-cols-2 gap-6 mt-6">
				{/* Recent Access Events */}
				<div className="iam-card">
					<div className="flex items-center justify-between p-4 border-b border-[var(--iam-border-subtle)]">
						<h3 className="text-sm font-medium text-[var(--iam-text-primary)]">
							Recent Access Events
						</h3>
						<button
							onClick={() => onNavigate('audit')}
							className="text-xs text-[var(--iam-accent)] hover:underline"
						>
							View All
						</button>
					</div>
					<div className="divide-y divide-[var(--iam-border-subtle)]">
						{eventsData?.items?.slice(0, 6).map((event) => (
							<AccessEventRow key={event.id} event={event} />
						))}
						{(!eventsData?.items || eventsData.items.length === 0) && (
							<div className="p-8 text-center text-[var(--iam-text-tertiary)] text-sm">
								No recent events
							</div>
						)}
					</div>
				</div>

				{/* Pending Invitations */}
				<div className="iam-card">
					<div className="flex items-center justify-between p-4 border-b border-[var(--iam-border-subtle)]">
						<h3 className="text-sm font-medium text-[var(--iam-text-primary)]">
							Pending Invitations
						</h3>
						<button
							onClick={() => onNavigate('invitations')}
							className="text-xs text-[var(--iam-accent)] hover:underline"
						>
							Manage
						</button>
					</div>
					<div className="divide-y divide-[var(--iam-border-subtle)]">
						{pendingInvitations.slice(0, 5).map((inv) => (
							<InvitationRow key={inv.id} invitation={inv} />
						))}
						{pendingInvitations.length === 0 && (
							<div className="p-8 text-center text-[var(--iam-text-tertiary)] text-sm">
								No pending invitations
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Sub-components
function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--iam-accent-muted)] text-[var(--iam-accent)] hover:bg-[var(--iam-accent)] hover:text-[var(--iam-bg-base)] transition-colors text-sm font-medium"
		>
			{icon}
			{label}
		</button>
	);
}

function RoleDistributionChart({ data }: { data: Record<string, number> }) {
	const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
	const max = Math.max(...entries.map(([, v]) => v), 1);

	if (entries.length === 0) {
		return (
			<div className="text-center text-[var(--iam-text-tertiary)] text-sm py-8">
				No role data available
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{entries.map(([role, count]) => (
				<div key={role} className="group">
					<div className="flex items-center justify-between mb-1">
						<span className="text-xs font-medium text-[var(--iam-text-secondary)] truncate">
							{role}
						</span>
						<span className="text-xs font-mono text-[var(--iam-text-tertiary)]">
							{count}
						</span>
					</div>
					<div className="h-1.5 bg-[var(--iam-bg-surface)] rounded-full overflow-hidden">
						<div
							className="h-full bg-[var(--iam-accent)] rounded-full transition-all group-hover:bg-[var(--iam-info)]"
							style={{ width: `${(count / max) * 100}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function PermissionHeatmap({ data }: { data: { category: string; granted: number; total: number }[] }) {
	if (data.length === 0) {
		return (
			<div className="text-center text-[var(--iam-text-tertiary)] text-sm py-8">
				No permission data
			</div>
		);
	}

	return (
		<div className="grid grid-cols-4 gap-1.5">
			{data.map(({ category, granted, total }) => {
				const pct = total > 0 ? (granted / total) * 100 : 0;
				const intensity = Math.min(pct / 100, 1);

				return (
					<div
						key={category}
						className="iam-heatmap-cell cursor-pointer group relative"
						style={{
							background: `rgba(34, 211, 238, ${0.1 + intensity * 0.6})`,
						}}
						title={`${category}: ${granted}/${total}`}
					>
						<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-[9px] font-mono text-white">
							{Math.round(pct)}%
						</div>
					</div>
				);
			})}
		</div>
	);
}

function UserStatusChart({ active, inactive }: { active: number; inactive: number }) {
	const total = active + inactive;
	const activePct = total > 0 ? (active / total) * 100 : 0;

	return (
		<div className="flex flex-col items-center">
			{/* Ring chart */}
			<div className="relative w-32 h-32 mb-4">
				<svg className="w-full h-full transform -rotate-90">
					<circle
						cx="64"
						cy="64"
						r="56"
						fill="none"
						stroke="var(--iam-danger-muted)"
						strokeWidth="12"
					/>
					<circle
						cx="64"
						cy="64"
						r="56"
						fill="none"
						stroke="var(--iam-success)"
						strokeWidth="12"
						strokeDasharray={`${(activePct / 100) * 352} 352`}
						strokeLinecap="round"
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-2xl font-mono font-semibold text-[var(--iam-text-primary)]">
						{Math.round(activePct)}%
					</span>
					<span className="text-[10px] text-[var(--iam-text-tertiary)] uppercase tracking-wider">
						Active
					</span>
				</div>
			</div>

			{/* Legend */}
			<div className="flex gap-6 text-xs">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-[var(--iam-success)]" />
					<span className="text-[var(--iam-text-secondary)]">Active</span>
					<span className="font-mono text-[var(--iam-text-primary)]">{active}</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-[var(--iam-danger)]" />
					<span className="text-[var(--iam-text-secondary)]">Inactive</span>
					<span className="font-mono text-[var(--iam-text-primary)]">{inactive}</span>
				</div>
			</div>
		</div>
	);
}

function AccessEventRow({ event }: { event: AccessEvent }) {
	const time = new Date(event.timestamp);
	const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--iam-bg-hover)] transition-colors">
			<div className={cn(
				'w-6 h-6 rounded-full flex items-center justify-center',
				event.success ? 'bg-[var(--iam-success-muted)]' : 'bg-[var(--iam-danger-muted)]'
			)}>
				{event.success ? (
					<CheckCircle className="w-3.5 h-3.5 text-[var(--iam-success)]" />
				) : (
					<XCircle className="w-3.5 h-3.5 text-[var(--iam-danger)]" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm text-[var(--iam-text-primary)] truncate">
					<span className="font-medium">{event.user_name}</span>
					<span className="text-[var(--iam-text-secondary)]"> {event.action} </span>
					{event.resource_name && (
						<span className="text-[var(--iam-text-tertiary)]">{event.resource_name}</span>
					)}
				</div>
			</div>
			<span className="text-xs font-mono text-[var(--iam-text-tertiary)]">{timeStr}</span>
		</div>
	);
}

function InvitationRow({ invitation }: { invitation: UserInvitation }) {
	const expiresIn = new Date(invitation.expires_at).getTime() - Date.now();
	const expiresHours = Math.max(0, Math.floor(expiresIn / (1000 * 60 * 60)));
	const isExpiringSoon = expiresHours < 24;

	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--iam-bg-hover)] transition-colors">
			<div className="w-8 h-8 rounded-full bg-[var(--iam-warning-muted)] flex items-center justify-center">
				<Mail className="w-4 h-4 text-[var(--iam-warning)]" />
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm font-medium text-[var(--iam-text-primary)] truncate">
					{invitation.email}
				</div>
				<div className="flex items-center gap-2 text-xs text-[var(--iam-text-tertiary)]">
					<Clock className="w-3 h-3" />
					<span className={isExpiringSoon ? 'text-[var(--iam-warning)]' : ''}>
						Expires in {expiresHours}h
					</span>
				</div>
			</div>
			<button className="p-1.5 rounded hover:bg-[var(--iam-bg-surface)] text-[var(--iam-text-tertiary)]">
				<MoreHorizontal className="w-4 h-4" />
			</button>
		</div>
	);
}

function DashboardSkeleton() {
	return (
		<div className="iam-root min-h-screen p-6 animate-pulse">
			<div className="h-8 w-64 bg-[var(--iam-bg-surface)] rounded mb-8" />
			<div className="grid grid-cols-5 gap-4 mb-8">
				{[1, 2, 3, 4, 5].map(i => (
					<div key={i} className="h-24 bg-[var(--iam-bg-surface)] rounded-lg" />
				))}
			</div>
			<div className="grid grid-cols-3 gap-6">
				{[1, 2, 3].map(i => (
					<div key={i} className="h-64 bg-[var(--iam-bg-surface)] rounded-lg" />
				))}
			</div>
		</div>
	);
}
