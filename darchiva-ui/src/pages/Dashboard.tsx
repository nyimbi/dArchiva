// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import {
	FileText,
	FolderOpen,
	GitBranch,
	HardDrive,
	TrendingUp,
	Clock,
	CheckCircle2,
	AlertCircle,
	ArrowUpRight,
	FileSearch,
} from 'lucide-react';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';

// Mock data for demonstration
const mockStats = {
	totalDocuments: 12847,
	documentsThisMonth: 423,
	pendingTasks: 7,
	storageUsedBytes: 45.2 * 1024 * 1024 * 1024,
	storageQuotaBytes: 100 * 1024 * 1024 * 1024,
	activeWorkflows: 12,
	ocrProcessed: 892,
};

const mockActivity = [
	{ id: '1', type: 'document_uploaded', description: 'Invoice_2024_001.pdf uploaded', timestamp: new Date(Date.now() - 300000).toISOString(), userName: 'Alice' },
	{ id: '2', type: 'workflow_completed', description: 'Contract approval completed', timestamp: new Date(Date.now() - 1800000).toISOString(), userName: 'Bob' },
	{ id: '3', type: 'form_extracted', description: 'Insurance form data extracted', timestamp: new Date(Date.now() - 3600000).toISOString(), userName: 'System' },
	{ id: '4', type: 'case_created', description: 'New case #2024-0892 created', timestamp: new Date(Date.now() - 7200000).toISOString(), userName: 'Carol' },
	{ id: '5', type: 'document_viewed', description: 'Annual_Report_2023.pdf viewed', timestamp: new Date(Date.now() - 14400000).toISOString(), userName: 'Dave' },
];

const mockPendingTasks = [
	{ id: '1', documentTitle: 'Contract_Amendment.pdf', workflowName: 'Legal Review', stepName: 'Manager Approval', deadline: new Date(Date.now() + 86400000).toISOString(), priority: 'high' as const },
	{ id: '2', documentTitle: 'Expense_Report_Q4.xlsx', workflowName: 'Finance Approval', stepName: 'CFO Sign-off', deadline: new Date(Date.now() + 172800000).toISOString(), priority: 'normal' as const },
	{ id: '3', documentTitle: 'Policy_Update_v3.docx', workflowName: 'Policy Review', stepName: 'Department Review', priority: 'low' as const },
];

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.1 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
	const storagePercentage = (mockStats.storageUsedBytes / mockStats.storageQuotaBytes!) * 100;

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Welcome back. Here's your document management overview.
					</p>
				</div>
			</div>

			{/* Stats grid */}
			<motion.div
				variants={itemVariants}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
			>
				{/* Total Documents */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">Total Documents</p>
							<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
								{mockStats.totalDocuments.toLocaleString()}
							</p>
							<p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
								<TrendingUp className="w-3 h-3" />
								+{mockStats.documentsThisMonth} this month
							</p>
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<FileText className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* Active Workflows */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">Active Workflows</p>
							<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
								{mockStats.activeWorkflows}
							</p>
							<p className="mt-1 flex items-center gap-1 text-xs text-brass-400">
								<Clock className="w-3 h-3" />
								{mockStats.pendingTasks} pending tasks
							</p>
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<GitBranch className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* OCR Processed */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">OCR Processed</p>
							<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
								{mockStats.ocrProcessed.toLocaleString()}
							</p>
							<p className="mt-1 text-xs text-slate-500">
								Documents this month
							</p>
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<FileSearch className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* Storage */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<p className="text-sm text-slate-500">Storage Used</p>
							<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
								{formatBytes(mockStats.storageUsedBytes)}
							</p>
							<div className="mt-3">
								<div className="progress-bar">
									<div
										className="progress-bar-fill"
										style={{ width: `${storagePercentage}%` }}
									/>
								</div>
								<p className="mt-1 text-xs text-slate-500">
									{storagePercentage.toFixed(1)}% of {formatBytes(mockStats.storageQuotaBytes!)}
								</p>
							</div>
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<HardDrive className="w-5 h-5" />
						</div>
					</div>
				</div>
			</motion.div>

			{/* Main content grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Pending Tasks */}
				<motion.div variants={itemVariants} className="lg:col-span-2 glass-card">
					<div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
						<h2 className="font-display font-semibold text-slate-100">Pending Tasks</h2>
						<a href="/workflows" className="flex items-center gap-1 text-sm text-brass-400 hover:text-brass-300">
							View all <ArrowUpRight className="w-4 h-4" />
						</a>
					</div>
					<div className="divide-y divide-slate-800/50">
						{mockPendingTasks.map((task, idx) => (
							<motion.div
								key={task.id}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.1 * idx }}
								className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
							>
								<div className="flex items-start gap-4">
									<div className={cn(
										'mt-0.5 p-1.5 rounded-lg',
										task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
										task.priority === 'urgent' ? 'bg-orange-500/10 text-orange-400' :
										'bg-slate-700/50 text-slate-400'
									)}>
										<AlertCircle className="w-4 h-4" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-slate-200 truncate">
											{task.documentTitle}
										</p>
										<p className="mt-1 text-xs text-slate-500">
											{task.workflowName} • {task.stepName}
										</p>
									</div>
									<div className="text-right">
										<span className={cn(
											'badge',
											task.priority === 'high' ? 'badge-red' :
											task.priority === 'urgent' ? 'badge-brass' :
											'badge-gray'
										)}>
											{task.priority}
										</span>
										{task.deadline && (
											<p className="mt-1 text-xs text-slate-500">
												Due {formatRelativeTime(task.deadline)}
											</p>
										)}
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>

				{/* Recent Activity */}
				<motion.div variants={itemVariants} className="glass-card">
					<div className="p-4 border-b border-slate-700/50">
						<h2 className="font-display font-semibold text-slate-100">Recent Activity</h2>
					</div>
					<div className="divide-y divide-slate-800/50">
						{mockActivity.map((activity, idx) => (
							<motion.div
								key={activity.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.05 * idx }}
								className="p-4 hover:bg-slate-800/30 transition-colors"
							>
								<div className="flex items-start gap-3">
									<div className={cn(
										'mt-0.5 w-2 h-2 rounded-full',
										activity.type === 'document_uploaded' ? 'bg-emerald-400' :
										activity.type === 'workflow_completed' ? 'bg-brass-400' :
										activity.type === 'form_extracted' ? 'bg-blue-400' :
										'bg-slate-400'
									)} />
									<div className="flex-1 min-w-0">
										<p className="text-sm text-slate-300 truncate">
											{activity.description}
										</p>
										<p className="mt-1 text-xs text-slate-500">
											{activity.userName} • {formatRelativeTime(activity.timestamp)}
										</p>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>

			{/* Quick actions */}
			<motion.div variants={itemVariants} className="glass-card p-4">
				<h2 className="font-display font-semibold text-slate-100 mb-4">Quick Actions</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ icon: FileText, label: 'Upload Document', color: 'brass' },
						{ icon: FolderOpen, label: 'Create Folder', color: 'blue' },
						{ icon: GitBranch, label: 'Start Workflow', color: 'emerald' },
						{ icon: FileSearch, label: 'Extract Forms', color: 'purple' },
					].map((action, idx) => (
						<button
							key={action.label}
							className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-brass-500/30 transition-all group"
						>
							<action.icon className="w-6 h-6 text-slate-400 group-hover:text-brass-400 transition-colors" />
							<span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
								{action.label}
							</span>
						</button>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}
