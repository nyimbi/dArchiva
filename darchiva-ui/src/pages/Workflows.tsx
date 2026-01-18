// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
	GitBranch,
	Clock,
	CheckCircle2,
	XCircle,
	AlertCircle,
	ChevronRight,
	Play,
	Pause,
	MoreVertical,
	FileText,
	MessageSquare,
	RotateCcw,
	PenTool,
	Plus,
	Loader2,
	RefreshCw,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
	Designer,
	useWorkflows,
	useExecutions,
	usePendingTasks,
	useCreateWorkflow,
	useActivateWorkflow,
	useDeactivateWorkflow,
	useProcessWorkflowAction,
	useTestRun,
	useCancelExecution,
} from '@/features/workflows';
import type { PendingTask } from '@/features/workflows/api';
import type { Workflow, WorkflowNode, WorkflowEdge } from '@/features/workflows/types';

interface TaskCardProps {
	task: PendingTask;
	onApprove: (task: PendingTask, comments?: string) => void;
	onReject: (task: PendingTask, comments?: string) => void;
	onReturn: (task: PendingTask, comments?: string) => void;
	isProcessing: boolean;
}

function TaskCard({ task, onApprove, onReject, onReturn, isProcessing }: TaskCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [comments, setComments] = useState('');

	return (
		<motion.div layout className="glass-card overflow-hidden">
			<div
				className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-start gap-4">
					<div
						className={cn(
							'mt-0.5 p-2 rounded-lg',
							task.priority === 'high'
								? 'bg-red-500/10 text-red-400'
								: task.priority === 'urgent'
									? 'bg-orange-500/10 text-orange-400'
									: task.priority === 'low'
										? 'bg-slate-700/50 text-slate-400'
										: 'bg-brass-500/10 text-brass-400'
						)}
					>
						<AlertCircle className="w-5 h-5" />
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="badge badge-brass">{task.workflow_name}</span>
							<ChevronRight className="w-3 h-3 text-slate-600" />
							<span className="text-sm text-slate-400">{task.step_name}</span>
						</div>
						<h3 className="mt-2 text-base font-medium text-slate-200">
							{task.document_title}
						</h3>
						<div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
							<span className="flex items-center gap-1">
								<Clock className="w-3 h-3" />
								Assigned {formatRelativeTime(task.assigned_at)}
							</span>
							{task.deadline && (
								<span
									className={cn(
										'flex items-center gap-1',
										new Date(task.deadline) < new Date(Date.now() + 86400000) &&
											'text-red-400'
									)}
								>
									<AlertCircle className="w-3 h-3" />
									Due {formatRelativeTime(task.deadline)}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							className="btn-primary py-1.5 px-3"
							onClick={(e) => {
								e.stopPropagation();
								onApprove(task, comments);
							}}
							disabled={isProcessing}
						>
							{isProcessing ? (
								<Loader2 className="w-4 h-4 animate-spin" />
							) : (
								<CheckCircle2 className="w-4 h-4" />
							)}
							Approve
						</button>
						<button
							className="btn-ghost py-1.5 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
							onClick={(e) => {
								e.stopPropagation();
								onReject(task, comments);
							}}
							disabled={isProcessing}
						>
							<XCircle className="w-4 h-4" />
							Reject
						</button>
					</div>
				</div>
			</div>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="border-t border-slate-700/50"
					>
						<div className="p-4 bg-slate-800/20">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs text-slate-500 mb-1">Document Preview</p>
									<div className="aspect-[4/3] bg-slate-800 rounded-lg flex items-center justify-center">
										<FileText className="w-12 h-12 text-slate-600" />
									</div>
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-2">Comments</p>
									<textarea
										className="w-full h-20 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
										placeholder="Add a comment (optional)..."
										value={comments}
										onChange={(e) => setComments(e.target.value)}
										onClick={(e) => e.stopPropagation()}
									/>
									<div className="mt-3 space-y-2">
										<button
											className="w-full btn-ghost justify-start"
											onClick={(e) => {
												e.stopPropagation();
												onReturn(task, comments);
											}}
											disabled={isProcessing}
										>
											<RotateCcw className="w-4 h-4" />
											Return for Changes
										</button>
										<a
											href={`/documents/${task.document_id}`}
											className="w-full btn-ghost justify-start text-slate-400"
											onClick={(e) => e.stopPropagation()}
										>
											<FileText className="w-4 h-4" />
											View Document
										</a>
									</div>
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

interface WorkflowCardProps {
	workflow: Workflow;
	onActivate: (id: string) => void;
	onDeactivate: (id: string) => void;
	isToggling: boolean;
}

function WorkflowCard({ workflow, onActivate, onDeactivate, isToggling }: WorkflowCardProps) {
	const isActive = workflow.status === 'active';

	return (
		<div className="doc-card">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div
						className={cn(
							'p-2 rounded-lg',
							isActive ? 'bg-brass-500/10 text-brass-400' : 'bg-slate-700/50 text-slate-400'
						)}
					>
						<GitBranch className="w-5 h-5" />
					</div>
					<div>
						<h3 className="font-medium text-slate-200">{workflow.name}</h3>
						<p className="text-sm text-slate-500">{workflow.description}</p>
					</div>
				</div>
				<button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>

			<div className="mt-4 flex items-center gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2 text-xs text-slate-500">
						<div className="flex -space-x-1">
							{workflow.nodes.slice(0, 5).map((node, i) => (
								<div
									key={node.id}
									className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-2xs text-slate-400"
								>
									{i + 1}
								</div>
							))}
						</div>
						<span>{workflow.nodes.length} nodes</span>
					</div>
				</div>

				<div className="text-right">
					<p className="text-lg font-semibold text-slate-200">v{workflow.version}</p>
					<p className="text-xs text-slate-500">version</p>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<span className={cn('badge', isActive ? 'badge-green' : 'badge-gray')}>
					{workflow.status}
				</span>
				<button
					className="btn-ghost text-xs"
					onClick={() => (isActive ? onDeactivate(workflow.id) : onActivate(workflow.id))}
					disabled={isToggling}
				>
					{isToggling ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : isActive ? (
						<>
							<Pause className="w-3 h-3" /> Pause
						</>
					) : (
						<>
							<Play className="w-3 h-3" /> Activate
						</>
					)}
				</button>
			</div>
		</div>
	);
}

export function Workflows() {
	const [activeTab, setActiveTab] = useState<'tasks' | 'workflows' | 'instances'>('tasks');
	const [showDesigner, setShowDesigner] = useState(false);
	const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(null);

	// API hooks
	const { data: workflowsData, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows();
	const { data: executionsData, isLoading: executionsLoading, refetch: refetchExecutions } = useExecutions();
	const { data: pendingTasksData, isLoading: tasksLoading, refetch: refetchTasks } = usePendingTasks();

	const createWorkflowMutation = useCreateWorkflow();
	const activateWorkflowMutation = useActivateWorkflow();
	const deactivateWorkflowMutation = useDeactivateWorkflow();
	const processActionMutation = useProcessWorkflowAction();
	const testRunMutation = useTestRun();
	const cancelExecutionMutation = useCancelExecution();

	const workflows = workflowsData?.items ?? [];
	const executions = executionsData?.items ?? [];
	const pendingTasks = pendingTasksData?.tasks ?? [];

	const handleSaveWorkflow = async (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
		try {
			await createWorkflowMutation.mutateAsync({
				name: 'New Workflow',
				description: 'Created from visual designer',
				nodes,
				edges,
			});
			toast.success('Workflow saved successfully');
			setShowDesigner(false);
			refetchWorkflows();
		} catch (error) {
			toast.error('Failed to save workflow');
		}
	};

	const handleTestRun = async (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
		try {
			await testRunMutation.mutateAsync({ nodes, edges });
			toast.success('Test run started');
		} catch (error) {
			toast.error('Failed to start test run');
		}
	};

	const handleActivateWorkflow = async (id: string) => {
		setTogglingWorkflowId(id);
		try {
			await activateWorkflowMutation.mutateAsync(id);
			toast.success('Workflow activated');
		} catch (error) {
			toast.error('Failed to activate workflow');
		} finally {
			setTogglingWorkflowId(null);
		}
	};

	const handleDeactivateWorkflow = async (id: string) => {
		setTogglingWorkflowId(id);
		try {
			await deactivateWorkflowMutation.mutateAsync(id);
			toast.success('Workflow paused');
		} catch (error) {
			toast.error('Failed to pause workflow');
		} finally {
			setTogglingWorkflowId(null);
		}
	};

	const handleApproveTask = async (task: PendingTask, comments?: string) => {
		try {
			await processActionMutation.mutateAsync({
				instanceId: task.instance_id,
				request: {
					execution_id: task.id,
					action: 'approved',
					comments,
				},
			});
			toast.success('Task approved');
		} catch (error) {
			toast.error('Failed to approve task');
		}
	};

	const handleRejectTask = async (task: PendingTask, comments?: string) => {
		try {
			await processActionMutation.mutateAsync({
				instanceId: task.instance_id,
				request: {
					execution_id: task.id,
					action: 'rejected',
					comments,
				},
			});
			toast.success('Task rejected');
		} catch (error) {
			toast.error('Failed to reject task');
		}
	};

	const handleReturnTask = async (task: PendingTask, comments?: string) => {
		try {
			await processActionMutation.mutateAsync({
				instanceId: task.instance_id,
				request: {
					execution_id: task.id,
					action: 'returned',
					comments,
				},
			});
			toast.success('Task returned for changes');
		} catch (error) {
			toast.error('Failed to return task');
		}
	};

	const handleCancelExecution = async (executionId: string) => {
		try {
			await cancelExecutionMutation.mutateAsync(executionId);
			toast.success('Execution cancelled');
		} catch (error) {
			toast.error('Failed to cancel execution');
		}
	};

	if (showDesigner) {
		return (
			<div className="h-[calc(100vh-4rem)] -m-6">
				<div className="h-full flex flex-col">
					<div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
						<h2 className="font-display font-semibold text-slate-100">Workflow Designer</h2>
						<button
							onClick={() => setShowDesigner(false)}
							className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700/50"
						>
							Close Designer
						</button>
					</div>
					<div className="flex-1">
						<Designer
							onSave={handleSaveWorkflow}
							onRun={(nodes, edges) => handleTestRun(nodes, edges)}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">Workflows</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage document workflows and approval processes
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button onClick={() => setShowDesigner(true)} className="btn-ghost">
						<PenTool className="w-4 h-4" />
						Visual Designer
					</button>
					<button className="btn-primary" onClick={() => setShowDesigner(true)}>
						<Plus className="w-4 h-4" />
						Create Workflow
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
				{[
					{ id: 'tasks', label: 'My Tasks', count: pendingTasks.length },
					{ id: 'workflows', label: 'Workflows', count: workflows.length },
					{
						id: 'instances',
						label: 'Active',
						count: executions.filter((e) => e.status === 'running' || e.status === 'pending').length,
					},
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
						{tab.count > 0 && (
							<span
								className={cn(
									'ml-2 px-1.5 py-0.5 text-2xs rounded',
									activeTab === tab.id
										? 'bg-brass-500 text-slate-900'
										: 'bg-slate-700 text-slate-400'
								)}
							>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Content */}
			<AnimatePresence mode="wait">
				{activeTab === 'tasks' && (
					<motion.div
						key="tasks"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="space-y-4"
					>
						<div className="flex justify-end">
							<button
								className="btn-ghost text-xs"
								onClick={() => refetchTasks()}
								disabled={tasksLoading}
							>
								<RefreshCw className={cn('w-3 h-3', tasksLoading && 'animate-spin')} />
								Refresh
							</button>
						</div>
						{tasksLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : pendingTasks.length === 0 ? (
							<div className="glass-card p-12 text-center">
								<CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
								<h3 className="text-lg font-medium text-slate-200">All caught up!</h3>
								<p className="mt-2 text-sm text-slate-500">
									You have no pending workflow tasks.
								</p>
							</div>
						) : (
							pendingTasks.map((task) => (
								<TaskCard
									key={task.id}
									task={task}
									onApprove={handleApproveTask}
									onReject={handleRejectTask}
									onReturn={handleReturnTask}
									isProcessing={processActionMutation.isPending}
								/>
							))
						)}
					</motion.div>
				)}

				{activeTab === 'workflows' && (
					<motion.div
						key="workflows"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
					>
						<div className="flex justify-end mb-4">
							<button
								className="btn-ghost text-xs"
								onClick={() => refetchWorkflows()}
								disabled={workflowsLoading}
							>
								<RefreshCw className={cn('w-3 h-3', workflowsLoading && 'animate-spin')} />
								Refresh
							</button>
						</div>
						{workflowsLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : workflows.length === 0 ? (
							<div className="glass-card p-12 text-center">
								<GitBranch className="w-12 h-12 mx-auto text-slate-500 mb-4" />
								<h3 className="text-lg font-medium text-slate-200">No workflows yet</h3>
								<p className="mt-2 text-sm text-slate-500">
									Create your first workflow to automate document processing.
								</p>
								<button
									className="btn-primary mt-4"
									onClick={() => setShowDesigner(true)}
								>
									<Plus className="w-4 h-4" />
									Create Workflow
								</button>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{workflows.map((workflow) => (
									<WorkflowCard
										key={workflow.id}
										workflow={workflow}
										onActivate={handleActivateWorkflow}
										onDeactivate={handleDeactivateWorkflow}
										isToggling={togglingWorkflowId === workflow.id}
									/>
								))}
							</div>
						)}
					</motion.div>
				)}

				{activeTab === 'instances' && (
					<motion.div
						key="instances"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
					>
						<div className="flex justify-end mb-4">
							<button
								className="btn-ghost text-xs"
								onClick={() => refetchExecutions()}
								disabled={executionsLoading}
							>
								<RefreshCw className={cn('w-3 h-3', executionsLoading && 'animate-spin')} />
								Refresh
							</button>
						</div>
						{executionsLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : executions.length === 0 ? (
							<div className="glass-card p-12 text-center">
								<Play className="w-12 h-12 mx-auto text-slate-500 mb-4" />
								<h3 className="text-lg font-medium text-slate-200">No active executions</h3>
								<p className="mt-2 text-sm text-slate-500">
									Workflow executions will appear here when documents are processed.
								</p>
							</div>
						) : (
							<div className="glass-card overflow-hidden">
								<table className="data-table">
									<thead>
										<tr>
											<th>Workflow</th>
											<th>Status</th>
											<th>Current Node</th>
											<th>Started</th>
											<th className="w-24">Actions</th>
										</tr>
									</thead>
									<tbody>
										{executions.map((execution) => (
											<tr key={execution.id}>
												<td>
													<div className="flex items-center gap-2">
														<GitBranch className="w-4 h-4 text-slate-500" />
														<span className="text-slate-200">
															Workflow v{execution.workflowVersion}
														</span>
													</div>
												</td>
												<td>
													<span
														className={cn(
															'badge',
															execution.status === 'running'
																? 'badge-brass'
																: execution.status === 'completed'
																	? 'badge-green'
																	: execution.status === 'failed'
																		? 'badge-red'
																		: 'badge-gray'
														)}
													>
														{execution.status}
													</span>
												</td>
												<td className="text-slate-400">
													{execution.currentNodeId || '-'}
												</td>
												<td className="text-slate-400">
													{formatRelativeTime(execution.startTime)}
												</td>
												<td>
													{(execution.status === 'running' ||
														execution.status === 'pending') && (
														<button
															className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
															onClick={() => handleCancelExecution(execution.id)}
															disabled={cancelExecutionMutation.isPending}
														>
															<XCircle className="w-4 h-4" />
														</button>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
