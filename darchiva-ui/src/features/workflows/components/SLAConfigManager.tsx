// (c) Copyright Datacraft, 2026
/**
 * SLA Configuration Manager - Create and edit SLA configurations
 * for workflow deadline monitoring and escalation.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Clock, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  createSLAConfig,
  getSLAConfigs,
  listWorkflows,
  type SLAConfig,
  type SLAConfigCreate,
} from '../api';

interface SLAConfigManagerProps {
	workflowId?: string;
	className?: string;
}

const REMINDER_THRESHOLDS = [50, 75, 90];
const inputClassName =
	'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

function normalizeWorkflowId(workflowId?: string) {
	return workflowId && workflowId !== 'all' ? workflowId : undefined;
}

export function SLAConfigManager({ workflowId, className }: SLAConfigManagerProps) {
	const effectiveWorkflowId = normalizeWorkflowId(workflowId);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const { data: configs, isLoading, isError } = useQuery({
		queryKey: ['sla-configs', effectiveWorkflowId],
		queryFn: () => getSLAConfigs(effectiveWorkflowId),
	});

	const createMutation = useMutation({
		mutationFn: createSLAConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
			setIsModalOpen(false);
			toast.success('SLA configuration created');
		},
		onError: () => {
			toast.error('Failed to create SLA configuration');
		},
	});

	const handleToggleExpand = useCallback((id: string) => {
		setExpandedId(prev => prev === id ? null : id);
	}, []);

	return (
		<Card className={cn('border-slate-800 bg-slate-900/80 text-slate-200 shadow-none', className)}>
			<CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-slate-800 p-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
						<Clock className="h-4 w-4" />
					</div>
					<CardTitle className="text-base text-slate-100">SLA Configurations</CardTitle>
				</div>
				<Button
					size="sm"
					className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
					onClick={() => setIsModalOpen(true)}
				>
					<Plus className="h-4 w-4" />
					New Config
				</Button>
			</CardHeader>

			<CardContent className="p-4">
				{isLoading ? (
					<LoadingState label="Loading configurations..." />
				) : isError ? (
					<ErrorState label="Failed to load SLA configurations." />
				) : !configs?.length ? (
					<EmptyState />
				) : (
					<div className="space-y-3">
						{configs.map(config => (
							<ConfigCard
								key={config.id}
								config={config}
								isExpanded={expandedId === config.id}
								onToggle={() => handleToggleExpand(config.id)}
							/>
						))}
					</div>
				)}
			</CardContent>

			{isModalOpen && (
				<ConfigModal
					onClose={() => setIsModalOpen(false)}
					onSave={createMutation.mutate}
					isSaving={createMutation.isPending}
					workflowId={effectiveWorkflowId}
				/>
			)}
		</Card>
	);
}

function LoadingState({ label }: { label: string }) {
	return (
		<div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
			<Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
			{label}
		</div>
	);
}

function ErrorState({ label }: { label: string }) {
	return (
		<div className="flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-8 text-sm text-red-300">
			<AlertCircle className="h-5 w-5" />
			{label}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-700 px-4 py-10 text-center text-slate-400">
			<Clock className="mb-3 h-9 w-9 text-slate-500" />
			<p className="text-sm">No SLA configurations defined yet</p>
		</div>
	);
}

interface ConfigCardProps {
	config: SLAConfig;
	isExpanded: boolean;
	onToggle: () => void;
}

function ConfigCard({ config, isExpanded, onToggle }: ConfigCardProps) {
	return (
		<Card className="border-slate-800 bg-slate-950/70 shadow-none">
			<button
				type="button"
				className="flex w-full items-start justify-between gap-4 p-4 text-left"
				onClick={onToggle}
			>
				<div className="min-w-0 space-y-2">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								'h-2.5 w-2.5 rounded-full',
								config.is_active ? 'bg-emerald-400' : 'bg-slate-600',
							)}
						/>
						<span className="truncate font-medium text-slate-100">{config.name}</span>
					</div>
					<div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
						<Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
							<Clock className="mr-1 h-3 w-3" />
							{config.target_hours}h target
						</Badge>
						<Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300">
							{config.warning_threshold_percent}% warning
						</Badge>
						<Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300">
							{config.critical_threshold_percent}% critical
						</Badge>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
						onClick={event => event.stopPropagation()}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
						onClick={event => event.stopPropagation()}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</button>

			{isExpanded && (
				<div className="grid gap-3 border-t border-slate-800 p-4 text-sm sm:grid-cols-3">
					<DetailItem label="Reminders">
						{config.reminder_enabled ? (
							<div className="flex flex-wrap gap-1.5">
								{config.reminder_thresholds?.map(threshold => (
									<Badge key={threshold} className="bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">
										{threshold}%
									</Badge>
								))}
							</div>
						) : (
							<span className="text-slate-500">Disabled</span>
						)}
					</DetailItem>
					<DetailItem label="Escalation Chain">
						<span className="text-slate-300">{config.escalation_chain_id ? 'Linked' : 'None'}</span>
					</DetailItem>
					<DetailItem label="Created">
						<span className="text-slate-300">{new Date(config.created_at).toLocaleDateString()}</span>
					</DetailItem>
				</div>
			)}
		</Card>
	);
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="space-y-1">
			<span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
			{children}
		</div>
	);
}

interface ConfigModalProps {
	onClose: () => void;
	onSave: (data: SLAConfigCreate) => void;
	isSaving: boolean;
	workflowId?: string;
}

function ConfigModal({ onClose, onSave, isSaving, workflowId }: ConfigModalProps) {
	const [formData, setFormData] = useState<SLAConfigCreate>({
		name: '',
		workflow_id: workflowId,
		target_hours: 24,
		warning_threshold_percent: 75,
		critical_threshold_percent: 90,
		reminder_enabled: true,
		reminder_thresholds: [50, 75, 90],
	});

	const { data: workflows, isError: isWorkflowsError } = useQuery({
		queryKey: ['workflows'],
		queryFn: () => listWorkflows(),
		enabled: !workflowId,
	});

	const toggleThreshold = (threshold: number) => {
		const current = formData.reminder_thresholds || [];
		const updated = current.includes(threshold)
			? current.filter(t => t !== threshold)
			: [...current, threshold].sort((a, b) => a - b);
		setFormData(prev => ({ ...prev, reminder_thresholds: updated }));
	};

	const handleSubmit = () => {
		if (formData.name && formData.target_hours > 0) {
			onSave(formData);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
			<Card
				className="w-full max-w-lg border-slate-700 bg-slate-900 text-slate-200 shadow-xl"
				onClick={event => event.stopPropagation()}
			>
				<CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-800 p-4">
					<CardTitle className="text-base text-slate-100">New SLA Configuration</CardTitle>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</Button>
				</CardHeader>

				<CardContent className="space-y-4 p-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-300">Configuration Name</label>
						<input
							type="text"
							value={formData.name}
							onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))}
							placeholder="e.g., Standard Review SLA"
							className={inputClassName}
						/>
					</div>

					{!workflowId && (
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-300">Workflow (Optional)</label>
							<select
								value={formData.workflow_id || ''}
								onChange={event => setFormData(prev => ({ ...prev, workflow_id: event.target.value || undefined }))}
								className={inputClassName}
							>
								<option value="">All Workflows</option>
								{workflows?.items.map(workflow => (
									<option key={workflow.id} value={workflow.id}>{workflow.name}</option>
								))}
							</select>
							{isWorkflowsError && (
								<p className="flex items-center gap-1.5 text-xs text-red-300">
									<AlertCircle className="h-3.5 w-3.5" />
									Failed to load workflows.
								</p>
							)}
						</div>
					)}

					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-300">Target Hours</label>
						<input
							type="number"
							value={formData.target_hours}
							onChange={event => setFormData(prev => ({ ...prev, target_hours: parseInt(event.target.value, 10) || 0 }))}
							min="1"
							className={inputClassName}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-300">Warning Threshold (%)</label>
							<input
								type="number"
								value={formData.warning_threshold_percent}
								onChange={event => setFormData(prev => ({ ...prev, warning_threshold_percent: parseInt(event.target.value, 10) || 75 }))}
								min="1"
								max="99"
								className={inputClassName}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-300">Critical Threshold (%)</label>
							<input
								type="number"
								value={formData.critical_threshold_percent}
								onChange={event => setFormData(prev => ({ ...prev, critical_threshold_percent: parseInt(event.target.value, 10) || 90 }))}
								min="1"
								max="99"
								className={inputClassName}
							/>
						</div>
					</div>

					<div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
						<span className="text-sm text-slate-300">Enable Reminders</span>
						<Switch
							checked={formData.reminder_enabled}
							onCheckedChange={checked => setFormData(prev => ({ ...prev, reminder_enabled: checked }))}
							className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-700"
						/>
					</div>

					{formData.reminder_enabled && (
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-300">Reminder Thresholds</label>
							<div className="flex flex-wrap gap-2">
								{REMINDER_THRESHOLDS.map(threshold => (
									<Button
										key={threshold}
										type="button"
										variant="outline"
										size="sm"
										className={cn(
											'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100',
											formData.reminder_thresholds?.includes(threshold) && 'border-cyan-500 bg-cyan-500/10 text-cyan-300',
										)}
										onClick={() => toggleThreshold(threshold)}
									>
										{threshold}%
									</Button>
								))}
							</div>
						</div>
					)}
				</CardContent>

				<div className="flex justify-end gap-2 border-t border-slate-800 p-4">
					<Button
						type="button"
						variant="ghost"
						className="text-slate-400 hover:bg-slate-800 hover:text-slate-100"
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
						onClick={handleSubmit}
						disabled={isSaving || !formData.name}
					>
						{isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
						{isSaving ? 'Saving...' : 'Create Configuration'}
					</Button>
				</div>
			</Card>
		</div>
	);
}

export default SLAConfigManager;
