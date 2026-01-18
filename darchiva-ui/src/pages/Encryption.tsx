// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	Shield,
	Key,
	RefreshCw,
	Eye,
	EyeOff,
	Clock,
	CheckCircle2,
	AlertCircle,
	Lock,
	Unlock,
	FileText,
	UserCheck,
	X,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';

const mockKeys = [
	{ id: 'k1', version: 3, isActive: true, createdAt: new Date(Date.now() - 2592000000).toISOString(), rotatedAt: null, expiresAt: null },
	{ id: 'k2', version: 2, isActive: false, createdAt: new Date(Date.now() - 7776000000).toISOString(), rotatedAt: new Date(Date.now() - 2592000000).toISOString(), expiresAt: new Date(Date.now() + 2592000000).toISOString() },
	{ id: 'k3', version: 1, isActive: false, createdAt: new Date(Date.now() - 15552000000).toISOString(), rotatedAt: new Date(Date.now() - 7776000000).toISOString(), expiresAt: new Date(Date.now() - 5184000000).toISOString() },
];

const mockAccessRequests = [
	{ id: 'a1', documentTitle: 'Confidential_Report.pdf', requestedBy: 'John Smith', requestedAt: new Date(Date.now() - 3600000).toISOString(), reason: 'Need to review for audit purposes', status: 'pending' },
	{ id: 'a2', documentTitle: 'Employee_Salaries.xlsx', requestedBy: 'Jane Doe', requestedAt: new Date(Date.now() - 86400000).toISOString(), reason: 'Annual budget planning', status: 'approved', approvedAt: new Date(Date.now() - 43200000).toISOString(), expiresAt: new Date(Date.now() + 43200000).toISOString() },
	{ id: 'a3', documentTitle: 'Legal_Brief_Draft.pdf', requestedBy: 'Bob Johnson', requestedAt: new Date(Date.now() - 172800000).toISOString(), reason: 'Client requested copy', status: 'denied' },
];

const mockEncryptedDocs = [
	{ id: 'd1', title: 'Confidential_Report.pdf', keyVersion: 3, algorithm: 'AES-256-GCM', createdAt: new Date(Date.now() - 86400000).toISOString() },
	{ id: 'd2', title: 'Employee_Salaries.xlsx', keyVersion: 3, algorithm: 'AES-256-GCM', createdAt: new Date(Date.now() - 172800000).toISOString() },
	{ id: 'd3', title: 'Legal_Brief_Draft.pdf', keyVersion: 2, algorithm: 'AES-256-GCM', createdAt: new Date(Date.now() - 2592000000).toISOString() },
	{ id: 'd4', title: 'Board_Minutes_2024.pdf', keyVersion: 3, algorithm: 'AES-256-GCM', createdAt: new Date(Date.now() - 432000000).toISOString() },
];

export function Encryption() {
	const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'access' | 'documents'>('overview');
	const [showRotateModal, setShowRotateModal] = useState(false);

	const pendingRequests = mockAccessRequests.filter(r => r.status === 'pending').length;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Encryption & Security
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage encryption keys and hidden document access
					</p>
				</div>
				<button
					onClick={() => setShowRotateModal(true)}
					className="btn-primary"
				>
					<RefreshCw className="w-4 h-4" />
					Rotate Key
				</button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
							<Shield className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-emerald-400">
								Active
							</p>
							<p className="text-sm text-slate-500">Encryption Status</p>
						</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<Key className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-slate-100">
								v{mockKeys[0].version}
							</p>
							<p className="text-sm text-slate-500">Current Key Version</p>
						</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<Lock className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-slate-100">
								{mockEncryptedDocs.length}
							</p>
							<p className="text-sm text-slate-500">Encrypted Documents</p>
						</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<UserCheck className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-brass-400">
								{pendingRequests}
							</p>
							<p className="text-sm text-slate-500">Pending Requests</p>
						</div>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
				{[
					{ id: 'overview', label: 'Overview' },
					{ id: 'keys', label: 'Key History' },
					{ id: 'access', label: 'Access Requests', count: pendingRequests },
					{ id: 'documents', label: 'Encrypted Documents' },
				].map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id as typeof activeTab)}
						className={cn(
							'px-4 py-2 rounded-md text-sm font-medium transition-colors',
							activeTab === tab.id
								? 'bg-slate-700 text-slate-100'
								: 'text-slate-400 hover:text-slate-200'
						)}
					>
						{tab.label}
						{tab.count ? (
							<span className="ml-2 px-1.5 py-0.5 text-2xs rounded bg-brass-500 text-slate-900">
								{tab.count}
							</span>
						) : null}
					</button>
				))}
			</div>

			{/* Content */}
			{activeTab === 'overview' && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Current Key Status */}
					<div className="glass-card p-6">
						<h3 className="font-display font-semibold text-slate-100 mb-4">
							Current Encryption Key
						</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
								<div className="flex items-center gap-3">
									<Key className="w-6 h-6 text-emerald-400" />
									<div>
										<p className="font-medium text-emerald-400">Version {mockKeys[0].version}</p>
										<p className="text-sm text-slate-500">AES-256-GCM</p>
									</div>
								</div>
								<span className="badge badge-green">Active</span>
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-slate-500">Created</p>
									<p className="text-slate-200">{formatDate(mockKeys[0].createdAt)}</p>
								</div>
								<div>
									<p className="text-slate-500">Documents Encrypted</p>
									<p className="text-slate-200">{mockEncryptedDocs.filter(d => d.keyVersion === mockKeys[0].version).length}</p>
								</div>
							</div>
						</div>
					</div>

					{/* Recent Activity */}
					<div className="glass-card p-6">
						<h3 className="font-display font-semibold text-slate-100 mb-4">
							Recent Access Requests
						</h3>
						<div className="space-y-3">
							{mockAccessRequests.slice(0, 3).map((request) => (
								<div key={request.id} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
									<div className={cn(
										'p-2 rounded-lg',
										request.status === 'pending' ? 'bg-brass-500/10 text-brass-400' :
										request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
										'bg-red-500/10 text-red-400'
									)}>
										{request.status === 'pending' ? <Clock className="w-4 h-4" /> :
										 request.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
										 <X className="w-4 h-4" />}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-slate-200 truncate">
											{request.documentTitle}
										</p>
										<p className="text-xs text-slate-500">
											{request.requestedBy} • {formatRelativeTime(request.requestedAt)}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{activeTab === 'keys' && (
				<div className="glass-card overflow-hidden">
					<table className="data-table">
						<thead>
							<tr>
								<th>Version</th>
								<th>Status</th>
								<th>Created</th>
								<th>Rotated</th>
								<th>Expires</th>
								<th>Documents</th>
							</tr>
						</thead>
						<tbody>
							{mockKeys.map((key) => (
								<tr key={key.id}>
									<td>
										<span className="font-mono text-slate-200">v{key.version}</span>
									</td>
									<td>
										<span className={cn(
											'badge',
											key.isActive ? 'badge-green' : 'badge-gray'
										)}>
											{key.isActive ? 'Active' : 'Expired'}
										</span>
									</td>
									<td className="text-slate-400">{formatDate(key.createdAt)}</td>
									<td className="text-slate-400">
										{key.rotatedAt ? formatDate(key.rotatedAt) : '—'}
									</td>
									<td className="text-slate-400">
										{key.expiresAt ? formatDate(key.expiresAt) : '—'}
									</td>
									<td className="text-slate-300">
										{mockEncryptedDocs.filter(d => d.keyVersion === key.version).length}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{activeTab === 'access' && (
				<div className="space-y-4">
					{mockAccessRequests.map((request) => (
						<motion.div
							key={request.id}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="glass-card p-4"
						>
							<div className="flex items-start gap-4">
								<div className={cn(
									'p-2 rounded-lg mt-1',
									request.status === 'pending' ? 'bg-brass-500/10 text-brass-400' :
									request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
									'bg-red-500/10 text-red-400'
								)}>
									<FileText className="w-5 h-5" />
								</div>

								<div className="flex-1">
									<div className="flex items-start justify-between">
										<div>
											<h4 className="font-medium text-slate-200">{request.documentTitle}</h4>
											<p className="text-sm text-slate-500 mt-0.5">
												Requested by {request.requestedBy} • {formatRelativeTime(request.requestedAt)}
											</p>
										</div>
										<span className={cn(
											'badge',
											request.status === 'pending' ? 'badge-brass' :
											request.status === 'approved' ? 'badge-green' : 'badge-red'
										)}>
											{request.status}
										</span>
									</div>

									<p className="mt-3 text-sm text-slate-400 bg-slate-800/30 p-3 rounded-lg">
										"{request.reason}"
									</p>

									{request.status === 'approved' && request.expiresAt && (
										<p className="mt-2 text-xs text-slate-500">
											Access expires {formatRelativeTime(request.expiresAt)}
										</p>
									)}

									{request.status === 'pending' && (
										<div className="mt-4 flex gap-2">
											<button className="btn-primary py-1.5">
												<CheckCircle2 className="w-4 h-4" />
												Approve
											</button>
											<button className="btn-ghost py-1.5 text-red-400 hover:bg-red-500/10">
												<X className="w-4 h-4" />
												Deny
											</button>
										</div>
									)}
								</div>
							</div>
						</motion.div>
					))}
				</div>
			)}

			{activeTab === 'documents' && (
				<div className="glass-card overflow-hidden">
					<table className="data-table">
						<thead>
							<tr>
								<th>Document</th>
								<th>Key Version</th>
								<th>Algorithm</th>
								<th>Encrypted</th>
								<th className="w-24">Actions</th>
							</tr>
						</thead>
						<tbody>
							{mockEncryptedDocs.map((doc) => (
								<tr key={doc.id}>
									<td>
										<div className="flex items-center gap-2">
											<Lock className="w-4 h-4 text-brass-400" />
											<span className="text-slate-200">{doc.title}</span>
										</div>
									</td>
									<td>
										<span className="font-mono text-slate-400">v{doc.keyVersion}</span>
									</td>
									<td>
										<span className="badge badge-gray text-2xs font-mono">
											{doc.algorithm}
										</span>
									</td>
									<td className="text-slate-400">{formatDate(doc.createdAt)}</td>
									<td>
										<button className="btn-ghost text-xs">
											<Eye className="w-3 h-3" />
											View
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Rotate Key Modal */}
			{showRotateModal && (
				<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="glass-card w-full max-w-md p-6"
					>
						<h3 className="text-lg font-display font-semibold text-slate-100 mb-2">
							Rotate Encryption Key
						</h3>
						<p className="text-sm text-slate-500 mb-6">
							This will generate a new encryption key. Existing documents will be re-encrypted with the new key.
						</p>

						<div className="space-y-4">
							<div>
								<label className="text-sm text-slate-400 mb-1 block">
									Expire Old Key After (days)
								</label>
								<input
									type="number"
									defaultValue="30"
									className="input-field"
								/>
							</div>

							<div className="p-3 bg-brass-500/10 border border-brass-500/20 rounded-lg">
								<div className="flex items-start gap-2">
									<AlertCircle className="w-4 h-4 text-brass-400 mt-0.5" />
									<div className="text-sm text-slate-300">
										<p className="font-medium text-brass-400">Important</p>
										<p className="mt-1 text-slate-400">
											Key rotation may take several minutes depending on the number of encrypted documents.
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="mt-6 flex gap-2 justify-end">
							<button
								onClick={() => setShowRotateModal(false)}
								className="btn-ghost"
							>
								Cancel
							</button>
							<button className="btn-primary">
								<RefreshCw className="w-4 h-4" />
								Rotate Key
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
}
