// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	Shield,
	Key,
	RefreshCw,
	Eye,
	Clock,
	CheckCircle2,
	AlertCircle,
	Lock,
	FileText,
	UserCheck,
	X,
	Loader2,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
	useEncryptionKeys,
	useEncryptionStats,
	useAccessRequests,
	useEncryptedDocuments,
	useRotateKey,
	useResolveAccessRequest,
	type EncryptionKey,
	type AccessRequest,
	type EncryptedDocument,
} from '@/features/encryption';

export function Encryption() {
	const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'access' | 'documents'>('overview');
	const [showRotateModal, setShowRotateModal] = useState(false);
	const [expiryDays, setExpiryDays] = useState(30);

	const { data: keys, isLoading: keysLoading } = useEncryptionKeys();
	const { data: stats, isLoading: statsLoading } = useEncryptionStats();
	const { data: accessRequests, isLoading: accessLoading } = useAccessRequests();
	const { data: encryptedDocs, isLoading: docsLoading } = useEncryptedDocuments();
	const rotateKey = useRotateKey();
	const resolveRequest = useResolveAccessRequest();

	const currentKey = keys?.find(k => k.status === 'active');
	const pendingRequests = accessRequests?.filter(r => r.status === 'pending').length || 0;

	const handleRotateKey = () => {
		rotateKey.mutate(undefined, {
			onSuccess: () => setShowRotateModal(false),
		});
	};

	const handleResolveRequest = (id: string, action: 'approve' | 'deny') => {
		resolveRequest.mutate({ id, action });
	};

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
								{keysLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `v${currentKey?.version || 1}`}
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
								{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.totalEncryptedDocs || 0}
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
								{accessLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : pendingRequests}
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
						{keysLoading ? (
							<div className="flex justify-center py-8">
								<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
							</div>
						) : currentKey ? (
							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
									<div className="flex items-center gap-3">
										<Key className="w-6 h-6 text-emerald-400" />
										<div>
											<p className="font-medium text-emerald-400">Version {currentKey.version}</p>
											<p className="text-sm text-slate-500">{currentKey.algorithm}</p>
										</div>
									</div>
									<span className="badge badge-green">Active</span>
								</div>
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<p className="text-slate-500">Created</p>
										<p className="text-slate-200">{formatDate(currentKey.createdAt)}</p>
									</div>
									<div>
										<p className="text-slate-500">Documents Encrypted</p>
										<p className="text-slate-200">
											{encryptedDocs?.items?.filter((d: EncryptedDocument) => d.keyVersion === currentKey.version).length || 0}
										</p>
									</div>
								</div>
							</div>
						) : (
							<p className="text-slate-500 text-center py-8">No active encryption key</p>
						)}
					</div>

					{/* Recent Activity */}
					<div className="glass-card p-6">
						<h3 className="font-display font-semibold text-slate-100 mb-4">
							Recent Access Requests
						</h3>
						{accessLoading ? (
							<div className="flex justify-center py-8">
								<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
							</div>
						) : accessRequests && accessRequests.length > 0 ? (
							<div className="space-y-3">
								{accessRequests.slice(0, 3).map((request) => (
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
												{request.requesterName} • {formatRelativeTime(request.createdAt)}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-slate-500 text-center py-8">No recent requests</p>
						)}
					</div>
				</div>
			)}

			{activeTab === 'keys' && (
				<div className="glass-card overflow-hidden">
					{keysLoading ? (
						<div className="flex justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
						</div>
					) : keys && keys.length > 0 ? (
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
								{keys.map((key) => (
									<tr key={key.id}>
										<td>
											<span className="font-mono text-slate-200">v{key.version}</span>
										</td>
										<td>
											<span className={cn(
												'badge',
												key.status === 'active' ? 'badge-green' : 'badge-gray'
											)}>
												{key.status === 'active' ? 'Active' : 'Expired'}
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
											{encryptedDocs?.items?.filter((d: EncryptedDocument) => d.keyVersion === key.version).length || 0}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<p className="text-slate-500 text-center py-12">No encryption keys</p>
					)}
				</div>
			)}

			{activeTab === 'access' && (
				<div className="space-y-4">
					{accessLoading ? (
						<div className="flex justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
						</div>
					) : accessRequests && accessRequests.length > 0 ? (
						accessRequests.map((request) => (
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
													Requested by {request.requesterName} • {formatRelativeTime(request.createdAt)}
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

										{request.status === 'approved' && request.resolvedAt && (
											<p className="mt-2 text-xs text-slate-500">
												Approved {formatRelativeTime(request.resolvedAt)}
											</p>
										)}

										{request.status === 'pending' && (
											<div className="mt-4 flex gap-2">
												<button
													onClick={() => handleResolveRequest(request.id, 'approve')}
													disabled={resolveRequest.isPending}
													className="btn-primary py-1.5"
												>
													{resolveRequest.isPending ? (
														<Loader2 className="w-4 h-4 animate-spin" />
													) : (
														<CheckCircle2 className="w-4 h-4" />
													)}
													Approve
												</button>
												<button
													onClick={() => handleResolveRequest(request.id, 'deny')}
													disabled={resolveRequest.isPending}
													className="btn-ghost py-1.5 text-red-400 hover:bg-red-500/10"
												>
													<X className="w-4 h-4" />
													Deny
												</button>
											</div>
										)}
									</div>
								</div>
							</motion.div>
						))
					) : (
						<p className="text-slate-500 text-center py-12">No access requests</p>
					)}
				</div>
			)}

			{activeTab === 'documents' && (
				<div className="glass-card overflow-hidden">
					{docsLoading ? (
						<div className="flex justify-center py-12">
							<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
						</div>
					) : encryptedDocs && encryptedDocs.items?.length > 0 ? (
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
								{encryptedDocs.items.map((doc: EncryptedDocument) => (
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
												AES-256
											</span>
										</td>
										<td className="text-slate-400">{formatDate(doc.encryptedAt)}</td>
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
					) : (
						<p className="text-slate-500 text-center py-12">No encrypted documents</p>
					)}
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
									value={expiryDays}
									onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
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
							<button
								onClick={handleRotateKey}
								disabled={rotateKey.isPending}
								className="btn-primary"
							>
								{rotateKey.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								Rotate Key
							</button>
						</div>
					</motion.div>
				</div>
			)}
		</div>
	);
}
