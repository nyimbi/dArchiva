// (c) Copyright Datacraft, 2026
import { useDeleteSource, useToggleSource, type IngestionSource } from '@/features/ingestion/api';
import { useStore } from '@/hooks/useStore';
import { AlertTriangle, Pause, Play, Settings, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	source: IngestionSource;
}

export function IngestionSourceOptionsModal({ onClose, source }: Props) {
	const { openModal } = useStore();
	const toggleSource = useToggleSource();
	const deleteSource = useDeleteSource();

	const handleToggle = async () => {
		try {
			await toggleSource.mutateAsync({ id: source.id, isActive: !source.isActive });
			toast.success(source.isActive ? 'Source paused' : 'Source activated');
			onClose();
		} catch {
			toast.error('Failed to update source');
		}
	};

	const handleDelete = async () => {
		if (!confirm(`Delete source "${source.name}"?`)) return;
		try {
			await deleteSource.mutateAsync(source.id);
			toast.success('Source deleted');
			onClose();
		} catch {
			toast.error('Failed to delete source');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-xs p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-slate-200 truncate">{source.name}</h3>
					<button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded"><X className="w-4 h-4" /></button>
				</div>
				<div className="space-y-1">
					<button onClick={() => { onClose(); openModal('ingestion-source-settings', source); }}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
						<Settings className="w-4 h-4" /> Settings
					</button>
					<button onClick={handleToggle}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
						{source.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
						{source.isActive ? 'Pause Source' : 'Activate Source'}
					</button>
					<button onClick={handleDelete}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
						<Trash2 className="w-4 h-4" /> Delete Source
					</button>
				</div>
			</div>
		</div>
	);
}
