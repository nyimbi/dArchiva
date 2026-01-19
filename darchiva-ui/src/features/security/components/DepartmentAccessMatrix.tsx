// (c) Copyright Datacraft, 2026
/**
 * Department access matrix showing user cross-department permissions.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, User, Plus, X, Clock, CheckCircle, Search } from 'lucide-react';
import type { DepartmentAccess, Department, User as UserType } from '../types';
import { grantDepartmentAccess, revokeDepartmentAccess, fetchUserDepartmentAccess } from '../api';

// Mock data for demonstration - in real app these would come from API
const MOCK_DEPARTMENTS: Department[] = [
	{ id: 'dept-1', name: 'Engineering', parentId: null, headUserId: null, userCount: 25 },
	{ id: 'dept-2', name: 'Legal', parentId: null, headUserId: null, userCount: 12 },
	{ id: 'dept-3', name: 'Finance', parentId: null, headUserId: null, userCount: 18 },
	{ id: 'dept-4', name: 'HR', parentId: null, headUserId: null, userCount: 8 },
	{ id: 'dept-5', name: 'Operations', parentId: null, headUserId: null, userCount: 30 },
];

const MOCK_USERS = [
	{ id: 'user-1', name: 'Alice Johnson', department: 'Engineering' },
	{ id: 'user-2', name: 'Bob Smith', department: 'Legal' },
	{ id: 'user-3', name: 'Carol White', department: 'Finance' },
	{ id: 'user-4', name: 'David Brown', department: 'HR' },
];

interface GrantModalProps {
	onGrant: (userId: string, departmentId: string, reason?: string, expiresAt?: string) => Promise<void>;
	onClose: () => void;
}

function GrantModal({ onGrant, onClose }: GrantModalProps) {
	const [userId, setUserId] = useState('');
	const [departmentId, setDepartmentId] = useState('');
	const [reason, setReason] = useState('');
	const [expiresIn, setExpiresIn] = useState('7');
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!userId || !departmentId) return;

		setSubmitting(true);
		try {
			const expiresAt = expiresIn
				? new Date(Date.now() + Number(expiresIn) * 24 * 60 * 60 * 1000).toISOString()
				: undefined;
			await onGrant(userId, departmentId, reason || undefined, expiresAt);
			onClose();
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm"
		>
			<motion.div
				initial={{ scale: 0.95 }}
				animate={{ scale: 1 }}
				exit={{ scale: 0.95 }}
				className="w-full max-w-md rounded-2xl border-2 border-charcoal/10 bg-cream p-6 shadow-2xl"
			>
				<div className="flex items-center justify-between">
					<h3 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
						Grant Department Access
					</h3>
					<button onClick={onClose} className="rounded-lg p-2 text-charcoal/40 hover:bg-charcoal/5">
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label className="block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
							User
						</label>
						<select
							value={userId}
							onChange={(e) => setUserId(e.target.value)}
							required
							className="mt-1 w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
						>
							<option value="">Select user...</option>
							{MOCK_USERS.map(user => (
								<option key={user.id} value={user.id}>
									{user.name} ({user.department})
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
							Grant Access To
						</label>
						<select
							value={departmentId}
							onChange={(e) => setDepartmentId(e.target.value)}
							required
							className="mt-1 w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
						>
							<option value="">Select department...</option>
							{MOCK_DEPARTMENTS.map(dept => (
								<option key={dept.id} value={dept.id}>{dept.name}</option>
							))}
						</select>
					</div>

					<div>
						<label className="block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
							Expires In (days)
						</label>
						<select
							value={expiresIn}
							onChange={(e) => setExpiresIn(e.target.value)}
							className="mt-1 w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
						>
							<option value="">Never expires</option>
							<option value="1">1 day</option>
							<option value="7">7 days</option>
							<option value="30">30 days</option>
							<option value="90">90 days</option>
						</select>
					</div>

					<div>
						<label className="block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
							Reason (optional)
						</label>
						<textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Why is this access being granted?"
							className="mt-1 h-20 w-full resize-none rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2 font-['DM_Sans'] text-sm text-charcoal placeholder:text-charcoal/30 focus:border-charcoal/30 focus:outline-none"
						/>
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg px-4 py-2 font-['DM_Sans'] text-sm font-medium text-charcoal/60 transition-colors hover:bg-charcoal/5"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting || !userId || !departmentId}
							className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90 disabled:opacity-50"
						>
							<CheckCircle className="h-4 w-4" />
							{submitting ? 'Granting...' : 'Grant Access'}
						</button>
					</div>
				</form>
			</motion.div>
		</motion.div>
	);
}

interface AccessRowProps {
	access: DepartmentAccess;
	onRevoke: (userId: string, deptId: string) => Promise<void>;
}

function AccessRow({ access, onRevoke }: AccessRowProps) {
	const [revoking, setRevoking] = useState(false);

	const handleRevoke = async () => {
		if (!confirm('Revoke this department access?')) return;
		setRevoking(true);
		try {
			await onRevoke(access.user_id, access.department_id);
		} finally {
			setRevoking(false);
		}
	};

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const isExpiringSoon = access.expires_at && new Date(access.expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

	return (
		<motion.tr
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="border-b border-charcoal/5 transition-colors hover:bg-cream/50"
		>
			<td className="py-4 pl-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal/5">
						<User className="h-4 w-4 text-charcoal/60" />
					</div>
					<div>
						<span className="font-['DM_Sans'] text-sm font-medium text-charcoal">
							{access.user_name || access.user_id.slice(0, 8)}
						</span>
					</div>
				</div>
			</td>
			<td className="py-4">
				<div className="flex items-center gap-2">
					<Building2 className="h-4 w-4 text-charcoal/40" />
					<span className="font-['DM_Sans'] text-sm text-charcoal">
						{access.department_name || access.department_id.slice(0, 8)}
					</span>
				</div>
			</td>
			<td className="py-4">
				<span className={`font-['DM_Sans'] text-sm ${isExpiringSoon ? 'text-gold' : 'text-charcoal/60'}`}>
					{formatDate(access.expires_at)}
					{isExpiringSoon && (
						<span className="ml-1 text-xs">(soon)</span>
					)}
				</span>
			</td>
			<td className="py-4 font-['DM_Sans'] text-sm text-charcoal/50">
				{formatDate(access.granted_at)}
			</td>
			<td className="py-4 pr-4">
				<button
					onClick={handleRevoke}
					disabled={revoking}
					className="rounded-lg px-3 py-1.5 font-['DM_Sans'] text-xs font-medium text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
				>
					{revoking ? 'Revoking...' : 'Revoke'}
				</button>
			</td>
		</motion.tr>
	);
}

export function DepartmentAccessMatrix() {
	const [grants, setGrants] = useState<DepartmentAccess[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [showGrantModal, setShowGrantModal] = useState(false);

	// In real app, this would fetch all grants for the tenant
	useEffect(() => {
		// Simulating API call
		setTimeout(() => {
			setGrants([
				{
					id: 'grant-1',
					user_id: 'user-1',
					user_name: 'Alice Johnson',
					department_id: 'dept-2',
					department_name: 'Legal',
					granted_by: 'admin',
					granted_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
					expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
					reason: 'Project collaboration',
				},
				{
					id: 'grant-2',
					user_id: 'user-2',
					user_name: 'Bob Smith',
					department_id: 'dept-3',
					department_name: 'Finance',
					granted_by: 'admin',
					granted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
					expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
					reason: 'Audit review',
				},
			]);
			setLoading(false);
		}, 500);
	}, []);

	const handleGrant = async (userId: string, departmentId: string, reason?: string, expiresAt?: string) => {
		const newGrant = await grantDepartmentAccess({
			user_id: userId,
			department_id: departmentId,
			reason,
			expires_at: expiresAt,
		});
		setGrants(prev => [...prev, newGrant]);
	};

	const handleRevoke = async (userId: string, departmentId: string) => {
		await revokeDepartmentAccess(userId, departmentId);
		setGrants(prev => prev.filter(g => !(g.user_id === userId && g.department_id === departmentId)));
	};

	const filteredGrants = grants.filter(g => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return (
			g.user_name?.toLowerCase().includes(q) ||
			g.department_name?.toLowerCase().includes(q)
		);
	});

	return (
		<div className="overflow-hidden rounded-xl border-2 border-charcoal/10 bg-parchment">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal/10 bg-cream/50 px-5 py-4">
				<div className="flex items-center gap-3">
					<Building2 className="h-5 w-5 text-charcoal/60" />
					<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
						Cross-Department Access
					</h2>
					<span className="rounded-full bg-charcoal/10 px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-charcoal/60">
						{grants.length} active
					</span>
				</div>

				<button
					onClick={() => setShowGrantModal(true)}
					className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90"
				>
					<Plus className="h-4 w-4" /> Grant Access
				</button>
			</div>

			{/* Search */}
			<div className="border-b border-charcoal/10 px-5 py-3">
				<div className="relative max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
					<input
						type="text"
						placeholder="Search users or departments..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-charcoal/10 bg-cream py-2 pl-9 pr-4 font-['DM_Sans'] text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal/30 focus:outline-none"
					/>
				</div>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
				</div>
			) : filteredGrants.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Building2 className="h-12 w-12 text-charcoal/20" />
					<h3 className="mt-4 font-['Newsreader'] text-lg font-semibold text-charcoal">
						No Cross-Department Access
					</h3>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/50">
						Grant users access to departments outside their own
					</p>
				</div>
			) : (
				<table className="w-full">
					<thead>
						<tr className="border-b border-charcoal/10 bg-cream/30 text-left">
							<th className="py-3 pl-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
								User
							</th>
							<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
								Department
							</th>
							<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
								Expires
							</th>
							<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
								Granted
							</th>
							<th className="py-3 pr-4" />
						</tr>
					</thead>
					<tbody>
						<AnimatePresence>
							{filteredGrants.map(grant => (
								<AccessRow
									key={grant.id}
									access={grant}
									onRevoke={handleRevoke}
								/>
							))}
						</AnimatePresence>
					</tbody>
				</table>
			)}

			{/* Grant Modal */}
			<AnimatePresence>
				{showGrantModal && (
					<GrantModal
						onGrant={handleGrant}
						onClose={() => setShowGrantModal(false)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
