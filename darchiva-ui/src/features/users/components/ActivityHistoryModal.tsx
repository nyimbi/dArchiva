// (c) Copyright Datacraft, 2026
import { useActivityFeed } from '@/features/home/api/hooks';
import { cn, formatRelativeTime } from '@/lib/utils';
import { FileText, GitBranch, Loader2, Upload, X, Zap } from 'lucide-react';

interface Props {
	onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
	document_uploaded: Upload,
	document_viewed: FileText,
	workflow_completed: GitBranch,
	form_extracted: Zap,
	case_created: FileText,
};

const TYPE_COLORS: Record<string, string> = {
	document_uploaded: 'text-brass-400 bg-brass-500/10',
	document_viewed: 'text-slate-400 bg-slate-700/50',
	workflow_completed: 'text-emerald-400 bg-emerald-500/10',
	form_extracted: 'text-purple-400 bg-purple-500/10',
	case_created: 'text-blue-400 bg-blue-500/10',
};

export function ActivityHistoryModal({ onClose }: Props) {
	const { data: events, isLoading } = useActivityFeed({ limit: 50 });

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col">
				<div className="flex items-center justify-between p-5 border-b border-slate-700/50">
					<h2 className="text-lg font-semibold text-slate-100">Activity History</h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
					) : !events?.length ? (
						<p className="text-center text-slate-500 py-12">No activity recorded</p>
					) : (
						<div className="divide-y divide-slate-700/30">
							{events.map((event) => {
								const Icon = TYPE_ICONS[event.type] ?? FileText;
								const color = TYPE_COLORS[event.type] ?? 'text-slate-400 bg-slate-700/50';
								return (
									<div key={event.id} className="flex items-start gap-3 px-5 py-4">
										<div className={cn('p-2 rounded-lg shrink-0', color)}>
											<Icon className="w-4 h-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-200">{event.title}</p>
											{event.description && (
												<p className="text-xs text-slate-500 mt-0.5 truncate">{event.description}</p>
											)}
											{event.actor && (
												<p className="text-xs text-slate-600 mt-0.5">by {event.actor.name}</p>
											)}
										</div>
										<span className="text-xs text-slate-600 shrink-0">{formatRelativeTime(event.timestamp)}</span>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="p-4 border-t border-slate-700/50">
					<button onClick={onClose} className="btn-secondary w-full">Close</button>
				</div>
			</div>
		</div>
	);
}
