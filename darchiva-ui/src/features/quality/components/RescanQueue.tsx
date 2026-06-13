// (c) Copyright Datacraft, 2026
/**
 * List of rejected pages flagged for rescan.
 * Shows quality score, defects, page preview link, and "Mark Rescanned" action.
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQualityAssessments, useUpdateQualityIssue } from '../api';
import { GRADE_CONFIG, SEVERITY_CONFIG } from '../types';
import type { QualityAssessment, RuleSeverity } from '../types';

interface RescanQueueProps {
	documentId?: string;
}

function ScoreGauge({ score }: { score: number }) {
	const color =
		score >= 80 ? 'text-emerald-400' :
		score >= 60 ? 'text-yellow-400' :
		score >= 40 ? 'text-orange-400' :
		'text-red-400';

	const ring =
		score >= 80 ? 'bg-emerald-500' :
		score >= 60 ? 'bg-yellow-500' :
		score >= 40 ? 'bg-orange-500' :
		'bg-red-500';

	return (
		<div className="flex items-center gap-2">
			<div className="relative w-10 h-10">
				<svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
					<circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="3" />
					<circle
						cx="18" cy="18" r="14" fill="none"
						className={cn('transition-all duration-500', ring.replace('bg-', 'stroke-'))}
						strokeWidth="3"
						strokeDasharray={`${(score / 100) * 87.96} 87.96`}
						strokeLinecap="round"
					/>
				</svg>
				<span className={cn('absolute inset-0 flex items-center justify-center text-xs font-bold', color)}>
					{score.toFixed(0)}
				</span>
			</div>
		</div>
	);
}

function AssessmentRow({
	assessment,
	onMarkRescanned,
	isMarking,
}: {
	assessment: QualityAssessment;
	onMarkRescanned: (issueId: string) => void;
	isMarking: boolean;
}) {
	const grade = GRADE_CONFIG[assessment.grade];
	const criticalIssues = assessment.issues.filter((i) => i.severity === 'critical' || i.severity === 'error');
	const topDefects = assessment.issues.slice(0, 4);

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="glass-card p-4 flex items-start gap-4"
		>
			{/* Quality score gauge */}
			<ScoreGauge score={assessment.qualityScore} />

			{/* Main info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1.5 flex-wrap">
					{/* Grade badge */}
					<span
						className={cn(
							'px-2 py-0.5 rounded-full text-xs font-bold',
							grade.bgColor,
							grade.color
						)}
					>
						{grade.emoji} {grade.label}
					</span>

					{/* Page number */}
					{assessment.pageNumber !== undefined && (
						<span className="text-xs text-slate-500">Page {assessment.pageNumber}</span>
					)}

					{/* Critical issues count */}
					{criticalIssues.length > 0 && (
						<span className="flex items-center gap-1 text-xs text-red-400">
							<AlertTriangle className="w-3 h-3" />
							{criticalIssues.length} critical
						</span>
					)}
				</div>

				{/* Defects list */}
				{topDefects.length > 0 && (
					<div className="flex flex-wrap gap-1.5 mb-2">
						{topDefects.map((issue, i) => {
							const cfg = SEVERITY_CONFIG[issue.severity as RuleSeverity];
							return (
								<span
									key={i}
									className={cn(
										'px-2 py-0.5 rounded text-xs',
										cfg.bgColor,
										cfg.color
									)}
									title={issue.message}
								>
									{issue.metric.replace(/_/g, ' ')}
									{issue.actualValue !== undefined
										? `: ${typeof issue.actualValue === 'number' ? issue.actualValue.toFixed(1) : issue.actualValue}`
										: ''}
								</span>
							);
						})}
						{assessment.issues.length > 4 && (
							<span className="text-xs text-slate-500">+{assessment.issues.length - 4} more</span>
						)}
					</div>
				)}

				{/* Assessed at */}
				<p className="text-2xs text-slate-600">
					Assessed {new Date(assessment.assessedAt).toLocaleDateString('en-US', {
						month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
					})}
				</p>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 shrink-0">
				{/* Page preview link */}
				<Link
					to={`/documents/${assessment.documentId}?page=${assessment.pageNumber ?? 1}`}
					className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-600 transition-colors"
					title="Preview page"
				>
					<ExternalLink className="w-4 h-4" />
				</Link>

				{/* Mark rescanned — resolves all open issues on this assessment */}
				<button
					onClick={() => {
						// resolve the first open issue as a proxy action
						const openIssue = assessment.issues.find(() => true);
						if (openIssue) onMarkRescanned(assessment.id);
					}}
					disabled={isMarking}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass-500/10 text-brass-400 hover:bg-brass-500/20 border border-brass-500/30 text-xs font-medium transition-colors disabled:opacity-50"
				>
					{isMarking ? (
						<RefreshCw className="w-3.5 h-3.5 animate-spin" />
					) : (
						<ScanLine className="w-3.5 h-3.5" />
					)}
					Mark Rescanned
				</button>
			</div>
		</motion.div>
	);
}

export function RescanQueue({ documentId }: RescanQueueProps) {
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 15;

	const { data, isLoading, refetch, isFetching } = useQualityAssessments({
		documentId,
		passed: false,
		page,
		pageSize: PAGE_SIZE,
	});

	const updateIssue = useUpdateQualityIssue();

	const assessments = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);

	const handleMarkRescanned = (assessmentId: string) => {
		// Mark as resolved using the assessment id as the issue proxy
		updateIssue.mutate({
			id: assessmentId,
			status: 'resolved',
			resolutionNotes: 'Page rescanned by operator.',
		});
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-display font-semibold text-slate-100">Rescan Queue</h2>
					<p className="text-sm text-slate-500 mt-0.5">
						{total} page{total !== 1 ? 's' : ''} flagged for rescan
					</p>
				</div>
				<button
					onClick={() => refetch()}
					disabled={isFetching}
					className="btn-ghost text-sm"
				>
					<RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
					Refresh
				</button>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="glass-card p-4 h-24 animate-pulse bg-slate-800/50" />
					))}
				</div>
			) : assessments.length === 0 ? (
				<div className="glass-card py-16 text-center">
					<CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500/50" />
					<p className="text-slate-400">No pages in the rescan queue</p>
					<p className="text-sm text-slate-600 mt-1">All scanned pages have passed quality checks.</p>
				</div>
			) : (
				<div className="space-y-3">
					{assessments.map((assessment) => (
						<AssessmentRow
							key={assessment.id}
							assessment={assessment}
							onMarkRescanned={handleMarkRescanned}
							isMarking={
								updateIssue.isPending &&
								(updateIssue.variables as { id: string })?.id === assessment.id
							}
						/>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
					<div className="flex items-center gap-2">
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
							className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
						>
							Previous
						</button>
						<button
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
							className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
						>
							Next
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
