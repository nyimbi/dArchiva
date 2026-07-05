// (c) Copyright Datacraft, 2026
import { type Case } from '@/features/cases/api';
import { useStore } from '@/hooks/useStore';
import { Briefcase, FileStack, Lock, Tag, UserCog, X } from 'lucide-react';

interface Props {
	onClose: () => void;
	case_: Case;
}

export function CaseOptionsModal({ onClose, case_ }: Props) {
	const { openModal } = useStore();

	const actions = [
		{ icon: Briefcase, label: 'View Case Details', onClick: () => { onClose(); openModal('view-case', case_); } },
		{ icon: FileStack, label: 'Create Bundle', onClick: () => { onClose(); openModal('create-bundle', case_); } },
		{ icon: FileStack, label: 'Add Documents', onClick: () => { onClose(); openModal('add-documents-to-case', case_); } },
		{ icon: UserCog, label: 'Manage Access', onClick: () => { onClose(); openModal('manage-case-access', case_); } },
		{ icon: Tag, label: 'Edit Tags', onClick: () => { onClose(); openModal('edit-case-tags', case_); } },
		{ icon: Lock, label: 'Close Case', danger: true, onClick: () => { onClose(); } },
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-xs p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-slate-200 truncate">{case_.title}</h3>
					<button aria-label="Close" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded"><X className="w-4 h-4" /></button>
				</div>
				<div className="space-y-1">
					{actions.map((action) => (
						<button key={action.label} onClick={action.onClick}
							className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${(action as { danger?: boolean }).danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:bg-slate-700/50'}`}>
							<action.icon className="w-4 h-4" />
							{action.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
