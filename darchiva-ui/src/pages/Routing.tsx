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
	MoreVertical,
	GripVertical,
	TestTube,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useRoutingRules,
	useRoutingStats,
	useToggleRoutingRule,
	useTestRoutingRules,
} from '@/features/routing';
import type { RoutingRule } from '@/types';

type RoutingMode = 'operational' | 'archival';

const destinationIcons = {
	folder: FolderOpen,
	workflow: GitBranch,
	user_inbox: User,
};

function RuleCard({ rule, index }: { rule: RoutingRule; index: number }) {
	const DestIcon = destinationIcons[rule.destinationType as keyof typeof destinationIcons] || FolderOpen;
	const toggleRule = useToggleRoutingRule();

	const handleToggle = () => {
		toggleRule.mutate({ id: rule.id, isActive: !rule.isActive });
	};

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
							<button
								onClick={handleToggle}
								disabled={toggleRule.isPending}
								className={cn(
									'p-1.5 rounded',
									rule.isActive
										? 'text-slate-500 hover:text-orange-400 hover:bg-orange-500/10'
										: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
								)}
							>
								{toggleRule.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : rule.isActive ? (
									<Pause className="w-4 h-4" />
								) : (
									<Play className="w-4 h-4" />
								)}
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
	const [testForm, setTestForm] = useState<{
		documentType: string;
		tags: string;
		metadata: string;
		mode: RoutingMode;
	}>({
		documentType: '',
		tags: '',
		metadata: '',
		mode: 'operational',
	});

	const { data: rulesData, isLoading: rulesLoading } = useRoutingRules();
	const { data: stats, isLoading: statsLoading } = useRoutingStats();
	const testRules = useTestRoutingRules();

	const rules = rulesData?.items || [];

	const displayStats = stats || {
		total: rules.length,
		active: rules.filter((r: RoutingRule) => r.isActive).length,
		operational: rules.filter((r: RoutingRule) => r.mode === 'operational' || r.mode === 'both').length,
		archival: rules.filter((r: RoutingRule) => r.mode === 'archival' || r.mode === 'both').length,
	};

	const handleTestRules = () => {
		testRules.mutate({
			documentType: testForm.documentType || undefined,
			tags: testForm.tags ? testForm.tags.split(',').map(t => t.trim()) : undefined,
			metadata: testForm.metadata ? JSON.parse(testForm.metadata) : undefined,
			mode: testForm.mode,
		});
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
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.total}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Active</p>
					<p className="mt-1 text-2xl font-display font-semibold text-emerald-400">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.active}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Operational Mode</p>
					<p className="mt-1 text-2xl font-display font-semibold text-brass-400">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.operational}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Archival Mode</p>
					<p className="mt-1 text-2xl font-display font-semibold text-blue-400">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.archival}
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
								value={testForm.documentType}
								onChange={(e) => setTestForm({ ...testForm, documentType: e.target.value })}
								className="input-field"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Tags (comma-separated)</label>
							<input
								type="text"
								placeholder="e.g., urgent, needs_review"
								value={testForm.tags}
								onChange={(e) => setTestForm({ ...testForm, tags: e.target.value })}
								className="input-field"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Metadata (JSON)</label>
							<input
								type="text"
								placeholder='{"department": "hr"}'
								value={testForm.metadata}
								onChange={(e) => setTestForm({ ...testForm, metadata: e.target.value })}
								className="input-field font-mono text-sm"
							/>
						</div>
						<div>
							<label className="text-sm text-slate-400 mb-1 block">Mode</label>
							<select
								value={testForm.mode}
								onChange={(e) => setTestForm({ ...testForm, mode: e.target.value as RoutingMode })}
								className="input-field"
							>
								<option value="operational">Operational</option>
								<option value="archival">Archival</option>
							</select>
						</div>
					</div>
					<button
						onClick={handleTestRules}
						disabled={testRules.isPending}
						className="mt-4 btn-primary"
					>
						{testRules.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<TestTube className="w-4 h-4" />
						)}
						Test Rules
					</button>

					{testRules.data && (
						<div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
							<p className="text-sm text-slate-300">
								{testRules.data.matchedRules.length > 0 ? (
									<>
										Matched {testRules.data.matchedRules.length} rule(s).
										{testRules.data.destination && (
											<> Destination: {testRules.data.destination.type} - {testRules.data.destination.name}</>
										)}
									</>
								) : (
									'No rules matched.'
								)}
							</p>
						</div>
					)}
				</motion.div>
			)}

			{/* Rules list */}
			<div className="space-y-3">
				<div className="flex items-center justify-between px-4">
					<p className="text-xs text-slate-500 uppercase tracking-wider">
						Rules (ordered by priority)
					</p>
				</div>

				{rulesLoading ? (
					<div className="flex justify-center py-16">
						<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
					</div>
				) : rules.length === 0 ? (
					<div className="text-center py-16 text-slate-500">
						<Route className="w-12 h-12 mx-auto mb-4" />
						<p>No routing rules configured</p>
					</div>
				) : (
					rules
						.sort((a: RoutingRule, b: RoutingRule) => a.priority - b.priority)
						.map((rule: RoutingRule, index: number) => (
							<RuleCard key={rule.id} rule={rule} index={index} />
						))
				)}
			</div>
		</div>
	);
}
