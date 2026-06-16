// (c) Copyright Datacraft, 2026
import { useBundles, type Case } from '@/features/cases/api';
import { formatRelativeTime } from '@/lib/utils';
import { Briefcase, FileStack, FolderOpen, Loader2, X } from 'lucide-react';

interface Props {
	onClose: () => void;
	case_: Case;
}

const STATUS_COLORS: Record<string, string> = {
	open: 'badge-green',
	closed: 'badge-gray',
	pending: 'badge-brass',
	on_hold: 'badge-blue',
};

export function ViewCaseModal({ onClose, case_ }: Props) {
	const { data: bundlesData, isLoading } = useBundles(case_.id);
	const bundles = bundlesData?.items ?? [];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-slate-700/50">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-brass-500/10 rounded-lg">
							<Briefcase className="w-5 h-5 text-brass-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-slate-100">{case_.title}</h2>
							<p className="text-xs text-slate-500">Case #{case_.caseNumber}</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className={`badge ${STATUS_COLORS[case_.status] ?? 'badge-gray'}`}>
							{case_.status.replace('_', ' ')}
						</span>
						<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded">
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{case_.description && (
						<p className="text-sm text-slate-400">{case_.description}</p>
					)}

					{/* Stats */}
					<div className="grid grid-cols-3 gap-4">
						{[
							{ label: 'Documents', value: case_.documentCount, icon: FolderOpen },
							{ label: 'Bundles', value: case_.bundleCount, icon: FileStack },
							{ label: 'Created', value: formatRelativeTime(case_.createdAt), icon: null },
						].map(({ label, value, icon: Icon }) => (
							<div key={label} className="bg-slate-800/40 rounded-lg p-3 text-center">
								{Icon && <Icon className="w-4 h-4 text-slate-500 mx-auto mb-1" />}
								<p className="text-xl font-semibold text-slate-100">{value}</p>
								<p className="text-xs text-slate-500">{label}</p>
							</div>
						))}
					</div>

					{/* Bundles */}
					<div>
						<h3 className="text-sm font-medium text-slate-300 mb-3">Bundles</h3>
						{isLoading ? (
							<div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
						) : bundles.length === 0 ? (
							<p className="text-sm text-slate-500 text-center py-4">No bundles in this case</p>
						) : (
							<div className="space-y-2">
								{bundles.map((b) => (
									<div key={b.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
										<div>
											<p className="text-sm font-medium text-slate-200">{b.name}</p>
											<p className="text-xs text-slate-500">{b.documentCount} documents · {b.pageCount} pages</p>
										</div>
										<span className="badge badge-gray text-2xs">{b.status}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="p-4 border-t border-slate-700/50">
					<button onClick={onClose} className="btn-secondary w-full">Close</button>
				</div>
			</div>
		</div>
	);
}
