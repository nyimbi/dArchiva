// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	Route,
	Plus,
	Pencil,
	Trash2,
	Play,
	Pause,
	ArrowRight,
	FolderOpen,
	GitBranch,
	User,
	Tag,
	FileText,
	MoreVertical,
	GripVertical,
	TestTube,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { RoutingRule } from '@/types';

const mockRules: RoutingRule[] = [
	{
		id: 'r1',
		name: 'Invoices to Finance',
		description: 'Route all invoices to the Finance folder',
		priority: 10,
		conditions: { document_type: 'invoice' },
		destinationType: 'folder',
		destinationId: 'finance-invoices',
		mode: 'both',
		isActive: true,
	},
	{
		id: 'r2',
		name: 'Contracts to Legal Review',
		description: 'Send contracts through legal approval workflow',
		priority: 20,
		conditions: { document_type: 'contract', tags: ['needs_review'] },
		destinationType: 'workflow',
		destinationId: 'legal-review',
		mode: 'operational',
		isActive: true,
	},
	{
		id: 'r3',
		name: 'HR Documents',
		description: 'Route HR documents to HR manager inbox',
		priority: 30,
		conditions: { metadata: { department: 'hr' } },
		destinationType: 'user_inbox',
		destinationId: 'hr-manager',
		mode: 'both',
		isActive: true,
	},
	{
		id: 'r4',
		name: 'Archive Old Records',
		description: 'Move documents older than 2 years to archive',
		priority: 100,
		conditions: { age_days: { gt: 730 } },
		destinationType: 'folder',
		destinationId: 'archive',
		mode: 'archival',
		isActive: false,
	},
];

const destinationIcons = {
	folder: FolderOpen,
	workflow: GitBranch,
	user_inbox: User,
};

function RuleCard({ rule, index }: { rule: RoutingRule; index: number }) {
	const DestIcon = destinationIcons[rule.destinationType];

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
			className="doc-card group"
		>
			<div className="flex items-start gap-3">
				<button className="mt-1 p-1 text-slate-600 hover:text-slate-400 cursor-grab">
					<GripVertical className="w-4 h-4" />
				</button>

				<div className="flex-1">
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-mono text-slate-600">#{rule.priority}</span>
								<h3 className="font-medium text-slate-200">{rule.name}</h3>
							</div>
							{rule.description && (
								<p className="mt-1 text-sm text-slate-500">{rule.description}</p>
							)}
						</div>
						<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
							<MoreVertical className="w-4 h-4" />
						</button>
					</div>

					{/* Condition and destination */}
					<div className="mt-4 flex items-center gap-4">
						{/* Conditions */}
						<div className="flex-1">
							<p className="text-2xs text-slate-600 uppercase tracking-wider mb-1">
								When
							</p>
							<div className="flex flex-wrap gap-1">
								{Object.entries(rule.conditions).map(([key, value]) => (
									<span
										key={key}
										className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300"
									>
										<Tag className="w-3 h-3 text-slate-500" />
										{key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
									</span>
								))}
							</div>
						</div>

						<ArrowRight className="w-5 h-5 text-slate-600 flex-shrink-0" />

						{/* Destination */}
						<div className="flex-shrink-0">
							<p className="text-2xs text-slate-600 uppercase tracking-wider mb-1">
								Then
							</p>
							<div className="flex items-center gap-2 px-3 py-1.5 bg-brass-500/10 border border-brass-500/20 rounded-lg">
								<DestIcon className="w-4 h-4 text-brass-400" />
								<span className="text-sm text-brass-300">
									{rule.destinationType.replace('_', ' ')}
								</span>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
						<div className="flex items-center gap-3">
							<span className={cn(
								'badge text-2xs',
								rule.mode === 'operational' ? 'badge-brass' :
								rule.mode === 'archival' ? 'badge-blue' : 'badge-gray'
							)}>
								{rule.mode}
							</span>
							<span className={cn(
								'flex items-center gap-1 text-xs',
								rule.isActive ? 'text-emerald-400' : 'text-slate-500'
							)}>
								<div className={cn(
									'w-1.5 h-1.5 rounded-full',
									rule.isActive ? 'bg-emerald-400' : 'bg-slate-600'
								)} />
								{rule.isActive ? 'Active' : 'Paused'}
							</span>
						</div>

						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button className="p-1.5 text-slate-500 hover:text-brass-400 hover:bg-slate-800 rounded">
								<TestTube className="w-4 h-4" />
							</button>
							<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
								<Pencil className="w-4 h-4" />
							</button>
							<button className={cn(
								'p-1.5 rounded',
								rule.isActive
									? 'text-slate-500 hover:text-orange-400 hover:bg-orange-500/10'
									: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
							)}>
								{rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
							</button>
							<button className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded">
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

export function Routing() {
	const [testMode, setTestMode] = useState(false);

	const stats = {
		total: mockRules.length,
		active: mockRules.filter(r => r.isActive).length,
		operational: mockRules.filter(r => r.mode === 'operational' || r.mode === 'both').length,
		archival: mockRules.filter(r => r.mode === 'archival' || r.mode === 'both').length,
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Auto-Routing Rules
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Configure automatic document routing based on metadata and content
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setTestMode(!testMode)}
						className={cn(
							'btn-secondary',
							testMode && 'bg-brass-500/20 border-brass-500/50 text-brass-400'
						)}
					>
						<TestTube className="w-4 h-4" />
						Test Mode
					</button>
					<button className="btn-primary">
						<Plus className="w-4 h-4" />
						Add Rule
					</button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="stat-card">
					<p className="text-sm text-slate-500">Total Rules</p>
					<p className="mt-1 text-2xl font-display font-semibold text-slate-100">
						{stats.total}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Active</p>
					<p className="mt-1 text-2xl font-display font-semibold text-emerald-400">
						{stats.active}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Operational Mode</p>
					<p className="mt-1 text-2xl font-display font-semibold text-brass-400">
						{stats.operational}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Archival Mode</p>
					<p className="mt-1 text-2xl font-display font-semibold text-blue-400">
						{stats.archival}
					</p>
				</div>
			</div>

			{/* Test mode panel */}
			{testMode && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className="glass-card p-4"
				>
					<h3 className="font-medium text-slate-200 mb-3">Test Routing Rules</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Document Type</label>
							<input
								type="text"
								placeholder="e.g., invoice, contract"
								className="input-field"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Tags (comma-separated)</label>
							<input
								type="text"
								placeholder="e.g., urgent, needs_review"
								className="input-field"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Metadata (JSON)</label>
							<input
								type="text"
								placeholder='{"department": "hr"}'
								className="input-field font-mono text-sm"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Mode</label>
							<select className="input-field">
								<option value="operational">Operational</option>
								<option value="archival">Archival</option>
							</select>
						</div>
					</div>
					<button className="mt-4 btn-primary">
						<TestTube className="w-4 h-4" />
						Test Rules
					</button>
				</motion.div>
			)}

			{/* Rules list */}
			<div className="space-y-3">
				<div className="flex items-center justify-between px-4">
					<p className="text-xs text-slate-500 uppercase tracking-wider">
						Rules (ordered by priority)
					</p>
				</div>
				{mockRules
					.sort((a, b) => a.priority - b.priority)
					.map((rule, index) => (
						<RuleCard key={rule.id} rule={rule} index={index} />
					))}
			</div>
		</div>
	);
}
