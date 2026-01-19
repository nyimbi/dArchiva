// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, CheckCircle, AlertTriangle, Calendar, Gauge, Wand2 } from 'lucide-react';
import { useScanningProject, useScanningProjectMetrics, useProjectBatches, useProjectMilestones } from '../hooks';
import { BatchCard, MilestoneTimeline, CreateBatchDialog, AIProjectPlanner } from '../components';
import { cn } from '@/lib/utils';

function formatDate(date: string): string {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ProjectDetails() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isLoading: projectLoading } = useScanningProject(projectId!);
	const { data: metrics } = useScanningProjectMetrics(projectId!);
	const { data: batches } = useProjectBatches(projectId!);
	const { data: milestones } = useProjectMilestones(projectId!);
	const [showAddBatch, setShowAddBatch] = useState(false);
	const [showAIPlanner, setShowAIPlanner] = useState(false);
	const [activeTab, setActiveTab] = useState<'batches' | 'milestones' | 'metrics'>('batches');

	if (projectLoading || !project) {
		return (
			<div className="p-8">
				<div className="animate-pulse space-y-4">
					<div className="h-8 w-48 bg-slate-800 rounded" />
					<div className="h-32 bg-slate-800 rounded-lg" />
				</div>
			</div>
		);
	}

	// Use actual field names with defaults for optional fields
	const estimatedPages = project.estimatedPages ?? 0;
	const scannedPages = project.scannedPages ?? 0;
	const verifiedPages = project.verifiedPages ?? 0;
	const rejectedPages = project.rejectedPages ?? 0;
	const targetDpi = project.targetDpi ?? 300;
	const colorMode = project.colorMode ?? 'color';
	const qualitySamplingRate = project.qualitySamplingRate ?? 0.1;

	const progress = estimatedPages > 0
		? Math.round((scannedPages / estimatedPages) * 100)
		: 0;

	return (
		<div className="p-8">
			<Link to="/scanning-projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100 mb-4">
				<ArrowLeft className="w-4 h-4" />
				Back to Projects
			</Link>

			<div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
				<div className="flex items-start justify-between mb-4">
					<div>
						<h1 className="text-2xl font-semibold text-slate-100">{project.name}</h1>
						{project.description && (
							<p className="text-slate-400 mt-1">{project.description}</p>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setShowAIPlanner(true)}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:border-cyan-400/50 transition-colors"
						>
							<Wand2 className="w-4 h-4" />
							AI Plan
						</button>
						<span className={cn(
							'px-3 py-1 rounded-full text-sm font-medium capitalize',
							project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
							project.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
							project.status === 'on_hold' ? 'bg-rose-500/10 text-rose-400' :
							'bg-slate-500/10 text-slate-400'
						)}>
							{project.status.replace('_', ' ')}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
					<div className="bg-slate-800/50 rounded-lg p-4">
						<div className="flex items-center gap-2 text-slate-400 mb-1">
							<FileText className="w-4 h-4" />
							<span className="text-sm">Scanned</span>
						</div>
						<div className="text-xl font-semibold text-slate-100">
							{scannedPages.toLocaleString()}
							<span className="text-sm text-slate-400 font-normal"> / {estimatedPages.toLocaleString()}</span>
						</div>
					</div>
					<div className="bg-slate-800/50 rounded-lg p-4">
						<div className="flex items-center gap-2 text-slate-400 mb-1">
							<CheckCircle className="w-4 h-4" />
							<span className="text-sm">Verified</span>
						</div>
						<div className="text-xl font-semibold text-emerald-400">{verifiedPages.toLocaleString()}</div>
					</div>
					<div className="bg-slate-800/50 rounded-lg p-4">
						<div className="flex items-center gap-2 text-slate-400 mb-1">
							<AlertTriangle className="w-4 h-4" />
							<span className="text-sm">Rejected</span>
						</div>
						<div className="text-xl font-semibold text-rose-400">{rejectedPages.toLocaleString()}</div>
					</div>
					<div className="bg-slate-800/50 rounded-lg p-4">
						<div className="flex items-center gap-2 text-slate-400 mb-1">
							<Gauge className="w-4 h-4" />
							<span className="text-sm">Progress</span>
						</div>
						<div className="text-xl font-semibold text-slate-100">{progress}%</div>
					</div>
				</div>

				<div className="flex items-center gap-4 text-sm text-slate-400">
					<span>{targetDpi} DPI</span>
					<span className="capitalize">{colorMode}</span>
					<span>{Math.round(qualitySamplingRate * 100)}% QC sample rate</span>
					{project.targetEndDate && (
						<span className="ml-auto flex items-center gap-1">
							<Calendar className="w-4 h-4" />
							Target: {formatDate(project.targetEndDate)}
						</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-4 border-b border-slate-800 mb-6">
				{(['batches', 'milestones', 'metrics'] as const).map((tab) => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={cn(
							'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
							activeTab === tab
								? 'border-brass-500 text-brass-400'
								: 'border-transparent text-slate-400 hover:text-slate-100'
						)}
					>
						{tab}
					</button>
				))}
				{activeTab === 'batches' && (
					<button
						onClick={() => setShowAddBatch(true)}
						className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add Batch
					</button>
				)}
			</div>

			{activeTab === 'batches' && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{batches?.map((batch) => (
						<BatchCard key={batch.id} batch={batch} projectId={project.id} />
					))}
					{batches?.length === 0 && (
						<div className="col-span-full text-center py-12 text-slate-500">
							No batches yet. Add your first batch to get started.
						</div>
					)}
				</div>
			)}

			{activeTab === 'milestones' && (
				<div className="max-w-2xl">
					{milestones && milestones.length > 0 ? (
						<MilestoneTimeline milestones={milestones} />
					) : (
						<div className="text-center py-12 text-slate-500">
							No milestones defined yet.
						</div>
					)}
				</div>
			)}

			{activeTab === 'metrics' && metrics && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<h3 className="text-sm font-medium text-slate-400 mb-2">Batches</h3>
						<div className="text-2xl font-semibold text-slate-100">{metrics.completedBatches} / {metrics.totalBatches}</div>
						<p className="text-sm text-slate-500">completed</p>
					</div>
					<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<h3 className="text-sm font-medium text-slate-400 mb-2">Avg Pages/Day</h3>
						<div className="text-2xl font-semibold text-slate-100">{metrics.averagePagesPerDay.toLocaleString()}</div>
					</div>
					<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<h3 className="text-sm font-medium text-slate-400 mb-2">QC Pass Rate</h3>
						<div className="text-2xl font-semibold text-emerald-400">{metrics.qcPassRate}%</div>
					</div>
					<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
						<h3 className="text-sm font-medium text-slate-400 mb-2">Avg Image Quality</h3>
						<div className="text-2xl font-semibold text-slate-100">{metrics.avgImageQuality}%</div>
					</div>
					{metrics.avgOcrAccuracy !== undefined && (
						<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
							<h3 className="text-sm font-medium text-slate-400 mb-2">Avg OCR Accuracy</h3>
							<div className="text-2xl font-semibold text-slate-100">{metrics.avgOcrAccuracy}%</div>
						</div>
					)}
					{metrics.estimatedCompletionDate && (
						<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
							<h3 className="text-sm font-medium text-slate-400 mb-2">Est. Completion</h3>
							<div className="text-xl font-semibold text-slate-100">
								{formatDate(metrics.estimatedCompletionDate)}
							</div>
						</div>
					)}
				</div>
			)}

			<CreateBatchDialog projectId={project.id} open={showAddBatch} onOpenChange={setShowAddBatch} />
			<AIProjectPlanner
				projectId={project.id}
				projectName={project.name}
				open={showAIPlanner}
				onOpenChange={setShowAIPlanner}
				initialConfig={{
					startDate: project.startDate,
					endDate: project.targetEndDate,
					totalPages: estimatedPages,
				}}
			/>
		</div>
	);
}
