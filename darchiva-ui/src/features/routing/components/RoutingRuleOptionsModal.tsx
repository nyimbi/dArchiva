// (c) Copyright Datacraft, 2026
import { useStore } from '@/hooks/useStore';
import type { RoutingRule } from '@/types';
import { Edit2, FlaskConical, ToggleLeft, Trash2, X } from 'lucide-react';

interface Props {
	onClose: () => void;
	rule: RoutingRule;
}

export function RoutingRuleOptionsModal({ onClose, rule }: Props) {
	const { openModal } = useStore();

	const actions = [
		{
			icon: Edit2,
			label: 'Edit Rule',
			onClick: () => { onClose(); openModal('edit-routing-rule', rule); },
		},
		{
			icon: FlaskConical,
			label: 'Test Rule',
			onClick: () => { onClose(); openModal('test-routing-rule', rule); },
		},
		{
			icon: ToggleLeft,
			label: rule.isActive ? 'Disable Rule' : 'Enable Rule',
			onClick: () => { onClose(); /* toggle handled via rule list */ },
		},
		{
			icon: Trash2,
			label: 'Delete Rule',
			danger: true,
			onClick: () => { onClose(); openModal('delete-routing-rule', rule); },
		},
	];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-xs p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-slate-200 truncate">{rule.name}</h3>
					<button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded">
						<X className="w-4 h-4" />
					</button>
				</div>
				<div className="space-y-1">
					{actions.map((action) => (
						<button
							key={action.label}
							onClick={action.onClick}
							className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
								action.danger
									? 'text-red-400 hover:bg-red-500/10'
									: 'text-slate-300 hover:bg-slate-700/50'
							}`}
						>
							<action.icon className="w-4 h-4" />
							{action.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
