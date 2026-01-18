// (c) Copyright Datacraft, 2026
/**
 * Batch management dashboard with statistics and batch list.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Package,
	Play,
	Pause,
	CheckCircle,
	AlertCircle,
	Clock,
	FileText,
	Layers,
	Plus,
	RefreshCw,
	ChevronRight,
	BarChart3,
	TrendingUp,
} from 'lucide-react';
import { useBatchStats, useBatches, useStartBatch, usePauseBatch, useCompleteBatch } from '../api';
import type { BatchStatus, ScanBatchSummary } from '../types';

const statusConfig: Record<
	BatchStatus,
	{ label: string; color: string; icon: React.ElementType; bg: string }
> = {
	created: {
		label: 'Created',
		color: 'text-gray-600',
		icon: Clock,
		bg: 'bg-gray-100',
	},
	in_progress: {
		label: 'In Progress',
		color: 'text-blue-600',
		icon: Play,
		bg: 'bg-blue-100',
	},
	paused: {
		label: 'Paused',
		color: 'text-amber-600',
		icon: Pause,
		bg: 'bg-amber-100',
	},
	completed: {
		label: 'Completed',
		color: 'text-emerald-600',
		icon: CheckCircle,
		bg: 'bg-emerald-100',
	},
	failed: {
		label: 'Failed',
		color: 'text-red-600',
		icon: AlertCircle,
		bg: 'bg-red-100',
	},
	cancelled: {
		label: 'Cancelled',
		color: 'text-gray-500',
		icon: AlertCircle,
		bg: 'bg-gray-100',
	},
	under_review: {
		label: 'Under Review',
		color: 'text-purple-600',
		icon: Clock,
		bg: 'bg-purple-100',
	},
	approved: {
		label: 'Approved',
		color: 'text-emerald-700',
		icon: CheckCircle,
		bg: 'bg-emerald-200',
	},
};

function StatCard({
	label,
	value,
	icon: Icon,
	trend,
	color = 'text-gray-900',
}: {
	label: string;
	value: string | number;
	icon: React.ElementType;
	trend?: { value: number; label: string };
	color?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
		>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm text-gray-500 font-medium">{label}</p>
					<p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
					{trend && (
						<div className="flex items-center mt-2 text-sm">
							<TrendingUp
								className={`w-4 h-4 mr-1 ${
									trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'
								}`}
							/>
							<span
								className={
									trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
								}
							>
								{trend.value >= 0 ? '+' : ''}
								{trend.value}% {trend.label}
							</span>
						</div>
					)}
				</div>
				<div className="p-3 bg-gray-100 rounded-lg">
					<Icon className="w-6 h-6 text-gray-600" />
				</div>
			</div>
		</motion.div>
	);
}

function BatchRow({
	batch,
	onStart,
	onPause,
	onComplete,
}: {
	batch: ScanBatchSummary;
	onStart: () => void;
	onPause: () => void;
	onComplete: () => void;
}) {
	const config = statusConfig[batch.status];
	const StatusIcon = config.icon;
	const progress =
		batch.totalDocuments > 0
			? Math.round((batch.processedDocuments / batch.totalDocuments) * 100)
			: 0;

	return (
		<motion.div
			layout
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className={`p-2 rounded-lg ${config.bg}`}>
						<Package className={`w-5 h-5 ${config.color}`} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-gray-900">
								{batch.name || batch.batchNumber}
							</h3>
							<span
								className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
							>
								<StatusIcon className="w-3 h-3" />
								{config.label}
							</span>
						</div>
						<p className="text-sm text-gray-500 mt-0.5">
							{batch.batchNumber} • Created{' '}
							{new Date(batch.createdAt).toLocaleDateString()}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-6">
					{/* Stats */}
					<div className="flex items-center gap-4 text-sm text-gray-600">
						<div className="flex items-center gap-1">
							<FileText className="w-4 h-4" />
							<span>{batch.totalDocuments} docs</span>
						</div>
						<div className="flex items-center gap-1">
							<Layers className="w-4 h-4" />
							<span>{batch.totalPages} pages</span>
						</div>
						{batch.averageQualityScore !== null && (
							<div className="flex items-center gap-1">
								<BarChart3 className="w-4 h-4" />
								<span>{batch.averageQualityScore.toFixed(0)}%</span>
							</div>
						)}
					</div>

					{/* Progress bar */}
					{batch.status === 'in_progress' && (
						<div className="w-32">
							<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${progress}%` }}
									className="h-full bg-blue-500 rounded-full"
								/>
							</div>
							<p className="text-xs text-gray-500 mt-1 text-center">
								{progress}% complete
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center gap-2">
						{batch.status === 'created' && (
							<button
								onClick={onStart}
								className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
								title="Start batch"
							>
								<Play className="w-4 h-4" />
							</button>
						)}
						{batch.status === 'in_progress' && (
							<>
								<button
									onClick={onPause}
									className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
									title="Pause batch"
								>
									<Pause className="w-4 h-4" />
								</button>
								<button
									onClick={onComplete}
									className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
									title="Complete batch"
								>
									<CheckCircle className="w-4 h-4" />
								</button>
							</>
						)}
						{batch.status === 'paused' && (
							<button
								onClick={onStart}
								className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
								title="Resume batch"
							>
								<Play className="w-4 h-4" />
							</button>
						)}
						<button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

export function BatchDashboard() {
	const [statusFilter, setStatusFilter] = useState<BatchStatus | undefined>();

	const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useBatchStats();
	const { data: batches, isLoading: batchesLoading, refetch: refetchBatches } = useBatches({
		status: statusFilter,
		limit: 20,
	});

	const startMutation = useStartBatch();
	const pauseMutation = usePauseBatch();
	const completeMutation = useCompleteBatch();

	const handleRefresh = () => {
		refetchStats();
		refetchBatches();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
					<p className="text-gray-500 mt-1">
						Track and manage document scanning batches
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={handleRefresh}
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<RefreshCw className="w-5 h-5" />
					</button>
					<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						<Plus className="w-4 h-4" />
						New Batch
					</button>
				</div>
			</div>

			{/* Stats Grid */}
			{statsLoading ? (
				<div className="grid grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="h-32 bg-gray-100 rounded-xl animate-pulse"
						/>
					))}
				</div>
			) : stats ? (
				<div className="grid grid-cols-4 gap-4">
					<StatCard
						label="Total Batches"
						value={stats.totalBatches}
						icon={Package}
					/>
					<StatCard
						label="Active Batches"
						value={stats.activeBatches}
						icon={Play}
						color="text-blue-600"
					/>
					<StatCard
						label="Documents Scanned"
						value={stats.totalDocumentsScanned.toLocaleString()}
						icon={FileText}
					/>
					<StatCard
						label="Pages Scanned"
						value={stats.totalPagesScanned.toLocaleString()}
						icon={Layers}
					/>
				</div>
			) : null}

			{/* Status by chart */}
			{stats && (
				<div className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4">
						Batches by Status
					</h2>
					<div className="flex items-center gap-4">
						{Object.entries(stats.batchesByStatus).map(([status, count]) => {
							const config = statusConfig[status as BatchStatus];
							if (!config) return null;
							return (
								<button
									key={status}
									onClick={() =>
										setStatusFilter(
											statusFilter === status
												? undefined
												: (status as BatchStatus)
										)
									}
									className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
										statusFilter === status
											? 'border-blue-500 bg-blue-50'
											: 'border-gray-200 hover:border-gray-300'
									}`}
								>
									<config.icon className={`w-4 h-4 ${config.color}`} />
									<span className="font-medium text-gray-900">{count}</span>
									<span className="text-gray-500">{config.label}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Batch List */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold text-gray-900">
						{statusFilter ? `${statusConfig[statusFilter].label} Batches` : 'Recent Batches'}
					</h2>
					{statusFilter && (
						<button
							onClick={() => setStatusFilter(undefined)}
							className="text-sm text-blue-600 hover:text-blue-700"
						>
							Clear filter
						</button>
					)}
				</div>

				{batchesLoading ? (
					<div className="space-y-3">
						{[...Array(5)].map((_, i) => (
							<div
								key={i}
								className="h-20 bg-gray-100 rounded-lg animate-pulse"
							/>
						))}
					</div>
				) : batches && batches.length > 0 ? (
					<AnimatePresence mode="popLayout">
						{batches.map((batch) => (
							<BatchRow
								key={batch.id}
								batch={batch}
								onStart={() => startMutation.mutate(batch.id)}
								onPause={() => pauseMutation.mutate(batch.id)}
								onComplete={() => completeMutation.mutate(batch.id)}
							/>
						))}
					</AnimatePresence>
				) : (
					<div className="text-center py-12 text-gray-500">
						<Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p>No batches found</p>
					</div>
				)}
			</div>
		</div>
	);
}
