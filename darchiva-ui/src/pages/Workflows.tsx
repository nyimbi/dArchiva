// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	GitBranch,
	Clock,
	CheckCircle2,
	XCircle,
	AlertCircle,
	ArrowRight,
	User,
	Users,
	Play,
	Pause,
	MoreVertical,
	FileText,
	ChevronRight,
	MessageSquare,
	RotateCcw,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { PendingTask, WorkflowInstance } from '@/types';

// Mock data
const mockWorkflows = [
	{ id: '1', name: 'Document Approval', description: 'Standard document approval workflow', steps: 3, instanceCount: 12, isActive: true },
	{ id: '2', name: 'Contract Review', description: 'Legal review for contracts', steps: 4, instanceCount: 5, isActive: true },
	{ id: '3', name: 'Invoice Processing', description: 'Finance approval for invoices', steps: 2, instanceCount: 23, isActive: true },
	{ id: '4', name: 'HR Onboarding', description: 'New employee document processing', steps: 5, instanceCount: 3, isActive: false },
];

const mockPendingTasks: PendingTask[] = [
	{ id: '1', instanceId: 'i1', stepName: 'Manager Approval', documentId: 'd1', documentTitle: 'Contract_Amendment.pdf', workflowName: 'Contract Review', assignedAt: new Date(Date.now() - 3600000).toISOString(), deadline: new Date(Date.now() + 86400000).toISOString(), priority: 'high' },
	{ id: '2', instanceId: 'i2', stepName: 'Finance Review', documentId: 'd2', documentTitle: 'Invoice_Q1_2024.pdf', workflowName: 'Invoice Processing', assignedAt: new Date(Date.now() - 7200000).toISOString(), priority: 'normal' },
	{ id: '3', instanceId: 'i3', stepName: 'Legal Sign-off', documentId: 'd3', documentTitle: 'NDA_Vendor_2024.pdf', workflowName: 'Contract Review', assignedAt: new Date(Date.now() - 14400000).toISOString(), deadline: new Date(Date.now() + 172800000).toISOString(), priority: 'normal' },
	{ id: '4', instanceId: 'i4', stepName: 'Department Head Approval', documentId: 'd4', documentTitle: 'Policy_Update_v2.docx', workflowName: 'Document Approval', assignedAt: new Date(Date.now() - 28800000).toISOString(), priority: 'low' },
];

const mockInstances: WorkflowInstance[] = [
	{ id: 'i1', workflowId: '2', workflowName: 'Contract Review', documentId: 'd1', documentTitle: 'Contract_Amendment.pdf', currentStep: 2, status: 'active', startedAt: new Date(Date.now() - 86400000).toISOString() },
	{ id: 'i2', workflowId: '3', workflowName: 'Invoice Processing', documentId: 'd2', documentTitle: 'Invoice_Q1_2024.pdf', currentStep: 1, status: 'active', startedAt: new Date(Date.now() - 43200000).toISOString() },
	{ id: 'i5', workflowId: '1', workflowName: 'Document Approval', documentId: 'd5', documentTitle: 'Annual_Report.pdf', currentStep: 3, status: 'completed', startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 3600000).toISOString() },
];

function TaskCard({ task }: { task: PendingTask }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<motion.div
			layout
			className="glass-card overflow-hidden"
		>
			<div
				className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-start gap-4">
					<div className={cn(
						'mt-0.5 p-2 rounded-lg',
						task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
						task.priority === 'urgent' ? 'bg-orange-500/10 text-orange-400' :
						task.priority === 'low' ? 'bg-slate-700/50 text-slate-400' :
						'bg-brass-500/10 text-brass-400'
					)}>
						<AlertCircle className="w-5 h-5" />
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<span className="badge badge-brass">{task.workflowName}</span>
							<ChevronRight className="w-3 h-3 text-slate-600" />
							<span className="text-sm text-slate-400">{task.stepName}</span>
						</div>
						<h3 className="mt-2 text-base font-medium text-slate-200">
							{task.documentTitle}
						</h3>
						<div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
							<span className="flex items-center gap-1">
								<Clock className="w-3 h-3" />
								Assigned {formatRelativeTime(task.assignedAt)}
							</span>
							{task.deadline && (
								<span className={cn(
									'flex items-center gap-1',
									new Date(task.deadline) < new Date(Date.now() + 86400000) && 'text-red-400'
								)}>
									<AlertCircle className="w-3 h-3" />
									Due {formatRelativeTime(task.deadline)}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button className="btn-primary py-1.5 px-3">
							<CheckCircle2 className="w-4 h-4" />
							Approve
						</button>
						<button className="btn-ghost py-1.5 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10">
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
									<p className="text-xs text-slate-500 mb-2">Actions</p>
									<div className="space-y-2">
										<button className="w-full btn-ghost justify-start">
											<MessageSquare className="w-4 h-4" />
											Add Comment
										</button>
										<button className="w-full btn-ghost justify-start">
											<RotateCcw className="w-4 h-4" />
											Return for Changes
										</button>
										<button className="w-full btn-ghost justify-start text-slate-400">
											<FileText className="w-4 h-4" />
											View Document
										</button>
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

function WorkflowCard({ workflow }: { workflow: typeof mockWorkflows[0] }) {
	return (
		<div className="doc-card">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className={cn(
						'p-2 rounded-lg',
						workflow.isActive ? 'bg-brass-500/10 text-brass-400' : 'bg-slate-700/50 text-slate-400'
					)}>
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
							{Array.from({ length: workflow.steps }).map((_, i) => (
								<div key={i} className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-2xs text-slate-400">
									{i + 1}
								</div>
							))}
						</div>
						<span>{workflow.steps} steps</span>
					</div>
				</div>

				<div className="text-right">
					<p className="text-lg font-semibold text-slate-200">{workflow.instanceCount}</p>
					<p className="text-xs text-slate-500">active instances</p>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<span className={cn(
					'badge',
					workflow.isActive ? 'badge-green' : 'badge-gray'
				)}>
					{workflow.isActive ? 'Active' : 'Paused'}
				</span>
				<button className="btn-ghost text-xs">
					{workflow.isActive ? (
						<><Pause className="w-3 h-3" /> Pause</>
					) : (
						<><Play className="w-3 h-3" /> Activate</>
					)}
				</button>
			</div>
		</div>
	);
}

export function Workflows() {
	const [activeTab, setActiveTab] = useState<'tasks' | 'workflows' | 'instances'>('tasks');

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Workflows
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage document workflows and approval processes
					</p>
				</div>
				<button className="btn-primary">
					<GitBranch className="w-4 h-4" />
					Create Workflow
				</button>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
				{[
					{ id: 'tasks', label: 'My Tasks', count: mockPendingTasks.length },
					{ id: 'workflows', label: 'Workflows', count: mockWorkflows.length },
					{ id: 'instances', label: 'Active', count: mockInstances.filter(i => i.status === 'active').length },
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
							<span className={cn(
								'ml-2 px-1.5 py-0.5 text-2xs rounded',
								activeTab === tab.id
									? 'bg-brass-500 text-slate-900'
									: 'bg-slate-700 text-slate-400'
							)}>
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
						{mockPendingTasks.map((task) => (
							<TaskCard key={task.id} task={task} />
						))}
					</motion.div>
				)}

				{activeTab === 'workflows' && (
					<motion.div
						key="workflows"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						{mockWorkflows.map((workflow) => (
							<WorkflowCard key={workflow.id} workflow={workflow} />
						))}
					</motion.div>
				)}

				{activeTab === 'instances' && (
					<motion.div
						key="instances"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="glass-card overflow-hidden"
					>
						<table className="data-table">
							<thead>
								<tr>
									<th>Document</th>
									<th>Workflow</th>
									<th>Progress</th>
									<th>Status</th>
									<th>Started</th>
									<th className="w-24">Actions</th>
								</tr>
							</thead>
							<tbody>
								{mockInstances.map((instance) => (
									<tr key={instance.id}>
										<td>
											<div className="flex items-center gap-2">
												<FileText className="w-4 h-4 text-slate-500" />
												<span className="text-slate-200">{instance.documentTitle}</span>
											</div>
										</td>
										<td className="text-slate-400">{instance.workflowName}</td>
										<td>
											<div className="flex items-center gap-2">
												<div className="progress-bar w-20">
													<div
														className="progress-bar-fill"
														style={{ width: `${(instance.currentStep / 4) * 100}%` }}
													/>
												</div>
												<span className="text-xs text-slate-500">
													Step {instance.currentStep}
												</span>
											</div>
										</td>
										<td>
											<span className={cn(
												'badge',
												instance.status === 'active' ? 'badge-brass' :
												instance.status === 'completed' ? 'badge-green' :
												'badge-red'
											)}>
												{instance.status}
											</span>
										</td>
										<td className="text-slate-400">
											{formatRelativeTime(instance.startedAt)}
										</td>
										<td>
											<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
												<MoreVertical className="w-4 h-4" />
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
