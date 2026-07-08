// (c) Copyright Datacraft, 2026
import type { QCIssue, QualityControlSample } from '@/types';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	CheckCircle,
	CheckSquare,
	FileImage,
	RotateCcw,
	XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useScanningProject, useQCSamples, useUpdateQCSample } from '../hooks';

// ── Constants ──────────────────────────────────────────────────────────────────

const issueTypes = ['skew', 'blur', 'cutoff', 'dark', 'light', 'missing', 'duplicate', 'other'] as const;
const severityOptions = ['minor', 'major', 'critical'] as const;

type StatusFilter = 'all' | QualityControlSample['reviewStatus'];

const STATUS_LABELS: Record<QualityControlSample['reviewStatus'], string> = {
	pending: 'Pending',
	passed: 'Passed',
	failed: 'Failed',
	needs_rescan: 'Needs Rescan',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: QualityControlSample['reviewStatus']) {
	const variants: Record<QualityControlSample['reviewStatus'], string> = {
		pending:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
		passed:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
		failed:       'bg-rose-500/10 text-rose-400 border-rose-500/20',
		needs_rescan: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
	};
	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${variants[status]}`}>
			{STATUS_LABELS[status]}
		</span>
	);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString('en-US', {
		month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
	});
}

function qcSampleImageUrl(sample: QualityControlSample) {
	return `/api/v1/thumbnails/${sample.pageId}`;
}

// ── Review dialog ──────────────────────────────────────────────────────────────

interface ReviewForm {
	reviewStatus: QualityControlSample['reviewStatus'];
	imageQuality: number;
	ocrAccuracy: number;
	issues: QCIssue[];
	notes: string;
}

function ReviewDialog({
	sample,
	open,
	onOpenChange,
	onSubmit,
	isPending,
}: {
	sample: QualityControlSample | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onSubmit: (form: ReviewForm) => void;
	isPending: boolean;
}) {
	const [form, setForm] = useState<ReviewForm>({
		reviewStatus: sample?.reviewStatus ?? 'pending',
		imageQuality: sample?.imageQuality ?? 85,
		ocrAccuracy: sample?.ocrAccuracy ?? 95,
		issues: sample?.issues ?? [],
		notes: sample?.notes ?? '',
	});

	// Reset form whenever the sample changes (new sample opened)
	useEffect(() => {
		if (!sample) return;
		setForm({
			reviewStatus: sample.reviewStatus,
			imageQuality: sample.imageQuality,
			ocrAccuracy: sample.ocrAccuracy ?? 95,
			issues: sample.issues ?? [],
			notes: sample.notes ?? '',
		});
	}, [sample?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const addIssue = (type: QCIssue['type']) => {
		setForm((f) => ({
			...f,
			issues: [...f.issues, { id: crypto.randomUUID(), type, description: '', severity: 'minor' }],
		}));
	};

	const removeIssue = (id: string) => {
		setForm((f) => ({ ...f, issues: f.issues.filter((i) => i.id !== id) }));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
				<DialogHeader>
					<DialogTitle className="text-slate-100">
						Review — Page {sample?.pageNumber}
					</DialogTitle>
				</DialogHeader>

				{/* Page image preview */}
				<div className="h-40 bg-slate-800 rounded-lg border border-slate-700 mb-2 overflow-hidden">
					{sample ? (
						<AuthenticatedImage
							src={qcSampleImageUrl(sample)}
							alt={`Page ${sample.pageNumber}`}
							className="w-full h-full object-contain bg-slate-800"
							fallback={
								<div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500">
									<FileImage className="w-8 h-8" />
									<span className="text-xs">Page image unavailable</span>
								</div>
							}
						/>
					) : (
						<Skeleton className="w-full h-full" />
					)}
				</div>

				<div className="space-y-4">
					{/* Decision buttons */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Decision</label>
						<div className="flex gap-2">
							{([
								{ value: 'passed',       label: 'Pass',   icon: CheckCircle, cls: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
								{ value: 'failed',       label: 'Fail',   icon: XCircle,     cls: 'border-rose-500 bg-rose-500/10 text-rose-400' },
								{ value: 'needs_rescan', label: 'Rescan', icon: RotateCcw,   cls: 'border-blue-500 bg-blue-500/10 text-blue-400' },
							] as const).map(({ value, label, icon: Icon, cls }) => (
								<button
									key={value}
									onClick={() => setForm((f) => ({ ...f, reviewStatus: value }))}
									className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors ${
										form.reviewStatus === value ? cls : 'border-slate-700 text-slate-400 hover:border-slate-600'
									}`}
								>
									<Icon className="w-4 h-4" />
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Quality sliders */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Image Quality: <span className="text-brass-400">{form.imageQuality}%</span>
						</label>
						<input
							type="range" min={0} max={100} value={form.imageQuality}
							onChange={(e) => setForm((f) => ({ ...f, imageQuality: parseInt(e.target.value) }))}
							className="w-full accent-amber-400"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							OCR Accuracy: <span className="text-brass-400">{form.ocrAccuracy}%</span>
						</label>
						<input
							type="range" min={0} max={100} value={form.ocrAccuracy}
							onChange={(e) => setForm((f) => ({ ...f, ocrAccuracy: parseInt(e.target.value) }))}
							className="w-full accent-amber-400"
						/>
					</div>

					{/* Issues */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Flag Issues</label>
						<div className="flex flex-wrap gap-1 mb-2">
							{issueTypes.map((type) => (
								<button
									key={type}
									onClick={() => addIssue(type)}
									className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded hover:bg-slate-700 capitalize"
								>
									+ {type}
								</button>
							))}
						</div>
						{form.issues.map((issue) => (
							<div key={issue.id} className="flex items-center gap-2 p-2 bg-slate-800 rounded mb-1.5">
								<AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
								<span className="text-sm text-slate-300 capitalize flex-1">{issue.type}</span>
								<select
									value={issue.severity}
									onChange={(e) => setForm((f) => ({
										...f,
										issues: f.issues.map((i) =>
											i.id === issue.id ? { ...i, severity: e.target.value as QCIssue['severity'] } : i,
										),
									}))}
									className="text-xs bg-slate-700 border-none rounded px-2 py-0.5 text-slate-300"
								>
									{severityOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
								</select>
								<button onClick={() => removeIssue(issue.id)} className="text-rose-400 hover:text-rose-300">
									<XCircle className="w-4 h-4" />
								</button>
							</div>
						))}
					</div>

					{/* Notes */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
						<Textarea
							value={form.notes}
							onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
							rows={3}
							placeholder="Optional reviewer notes…"
						/>
					</div>

					<Separator className="bg-slate-800" />

					<div className="flex justify-end gap-3">
						<Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button
							onClick={() => onSubmit(form)}
							disabled={form.reviewStatus === 'pending' || isPending}
						>
							{isPending ? 'Saving…' : 'Submit Review'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function QCReview() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project, isError: projectError } = useScanningProject(projectId!);
	const { data: samples = [], isLoading, isError: samplesError } = useQCSamples(projectId!);
	const updateSample = useUpdateQCSample();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [reviewTarget, setReviewTarget] = useState<QualityControlSample | null>(null);

	// ── Filtering ──────────────────────────────────────────────────────────────
	const filtered = statusFilter === 'all'
		? samples
		: samples.filter((s) => s.reviewStatus === statusFilter);

	const pendingCount = samples.filter((s) => s.reviewStatus === 'pending').length;

	// ── Selection helpers ──────────────────────────────────────────────────────
	const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

	const toggleAll = () => {
		if (allSelected) {
			setSelected(new Set());
		} else {
			setSelected(new Set(filtered.map((s) => s.id)));
		}
	};

	const toggleOne = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	// ── Actions ────────────────────────────────────────────────────────────────
	const submitReview = async (form: {
		reviewStatus: QualityControlSample['reviewStatus'];
		imageQuality: number;
		ocrAccuracy: number;
		issues: QCIssue[];
		notes: string;
	}) => {
		if (!reviewTarget) return;
		await updateSample.mutateAsync({
			projectId: projectId!,
			sampleId: reviewTarget.id,
			input: form,
		});
		setReviewTarget(null);
	};

	const batchApprove = async () => {
		const selectedSamples = samples.filter(
			(sample) => selected.has(sample.id) && sample.reviewStatus === 'pending',
		);
		await Promise.all(
			selectedSamples.map((sample) =>
				updateSample.mutateAsync({
					projectId: projectId!,
					sampleId: sample.id,
					input: {
						reviewStatus: 'passed',
						imageQuality: sample.imageQuality ?? 90,
						ocrAccuracy: sample.ocrAccuracy ?? 95,
						issues: [],
						notes: 'Batch approved',
					},
				}),
			),
		);
		setSelected(new Set());
	};

	const quickAction = async (
		sample: QualityControlSample,
		status: 'passed' | 'failed' | 'needs_rescan',
	) => {
		await updateSample.mutateAsync({
			projectId: projectId!,
			sampleId: sample.id,
			input: {
				reviewStatus: status,
				imageQuality: sample.imageQuality,
				ocrAccuracy: sample.ocrAccuracy ?? 95,
				issues: sample.issues ?? [],
				notes: sample.notes ?? '',
			},
		});
	};

	// ── Render ─────────────────────────────────────────────────────────────────
	if (isLoading) {
		return (
			<div className="p-8 space-y-4">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	if (projectError || samplesError) {
		return (
			<div className="p-8 space-y-4">
				{projectError && (
					<div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
						<AlertCircle className="h-4 w-4 shrink-0" />
						Failed to load project details. Refresh and try again.
					</div>
				)}
				{samplesError && (
					<div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
						<AlertCircle className="h-4 w-4 shrink-0" />
						Failed to load QC samples. Refresh and try again.
					</div>
				)}
			</div>
		);
	}

	const selectedPendingCount = [...selected].filter(
		(id) => samples.find((s) => s.id === id)?.reviewStatus === 'pending',
	).length;

	return (
		<div className="p-8 space-y-5">
			{/* Breadcrumb */}
			<Link
				to={`/scanning-projects/${projectId}`}
				className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100 text-sm"
			>
				<ArrowLeft className="w-4 h-4" />
				Back to {project?.name ?? 'Project'}
			</Link>

			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Quality Control Review</h1>
					<p className="text-slate-400 mt-1">
						{pendingCount} sample{pendingCount !== 1 ? 's' : ''} pending review
					</p>
				</div>
				{selected.size > 0 && selectedPendingCount > 0 && (
					<Button
						onClick={batchApprove}
						disabled={updateSample.isPending}
						className="gap-2"
					>
						<CheckSquare className="w-4 h-4" />
						Approve {selectedPendingCount} selected
					</Button>
				)}
			</div>

			{/* Filter bar */}
			<div className="flex items-center gap-3">
				<Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setSelected(new Set()); }}>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Samples</SelectItem>
						<SelectItem value="pending">Needs Review</SelectItem>
						<SelectItem value="passed">Approved</SelectItem>
						<SelectItem value="failed">Rejected</SelectItem>
						<SelectItem value="needs_rescan">Needs Rescan</SelectItem>
					</SelectContent>
				</Select>
				<span className="text-sm text-slate-500">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
			</div>

			{/* Table */}
			{filtered.length === 0 ? (
				<div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
					<CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
					<h3 className="text-lg font-medium text-slate-300 mb-1">All caught up!</h3>
					<p className="text-slate-500 text-sm">No samples match the current filter.</p>
				</div>
			) : (
				<div className="border border-slate-800 rounded-xl overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="border-slate-800 hover:bg-transparent">
								<TableHead className="w-10">
									<Checkbox
										checked={allSelected}
										onCheckedChange={toggleAll}
										aria-label="Select all"
									/>
								</TableHead>
								<TableHead className="text-slate-400">Page</TableHead>
								<TableHead className="text-slate-400">Status</TableHead>
								<TableHead className="text-slate-400 text-right">Image Quality</TableHead>
								<TableHead className="text-slate-400 text-right">OCR Confidence</TableHead>
								<TableHead className="text-slate-400">Issues</TableHead>
								<TableHead className="text-slate-400">Reviewer</TableHead>
								<TableHead className="text-slate-400">Scanned At</TableHead>
								<TableHead className="text-slate-400 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filtered.map((sample) => (
								<TableRow key={sample.id} className="border-slate-800 hover:bg-slate-800/40">
									{/* Checkbox */}
									<TableCell>
										<Checkbox
											checked={selected.has(sample.id)}
											onCheckedChange={() => toggleOne(sample.id)}
											aria-label={`Select page ${sample.pageNumber}`}
										/>
									</TableCell>

									{/* Page thumbnail + number */}
									<TableCell>
										<button
											onClick={() => setReviewTarget(sample)}
											className="flex items-center gap-3 group"
										>
											<div className="w-10 h-14 bg-slate-800 border border-slate-700 rounded flex items-center justify-center flex-shrink-0 group-hover:border-brass-500 transition-colors">
												<FileImage className="w-4 h-4 text-slate-500" />
											</div>
											<div className="text-left">
												<div className="text-sm font-medium text-slate-200 group-hover:text-brass-300 transition-colors">
													Page {sample.pageNumber}
												</div>
												<div className="text-xs text-slate-500 font-mono">{sample.batchId.slice(0, 8)}</div>
											</div>
										</button>
									</TableCell>

									{/* Status badge */}
									<TableCell>{statusBadge(sample.reviewStatus)}</TableCell>

									{/* Image quality */}
									<TableCell className="text-right">
										<span className={`text-sm font-medium ${sample.imageQuality >= 80 ? 'text-emerald-400' : sample.imageQuality >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
											{sample.imageQuality}%
										</span>
									</TableCell>

									{/* OCR accuracy */}
									<TableCell className="text-right">
										{sample.ocrAccuracy !== undefined ? (
											<span className={`text-sm font-medium ${sample.ocrAccuracy >= 80 ? 'text-emerald-400' : sample.ocrAccuracy >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
												{sample.ocrAccuracy}%
											</span>
										) : (
											<span className="text-slate-600 text-sm">—</span>
										)}
									</TableCell>

									{/* Flagged issues */}
									<TableCell>
										{sample.issues?.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{sample.issues.map((issue) => (
													<Badge
														key={issue.id}
														variant="outline"
														className={`text-[10px] capitalize ${
															issue.severity === 'critical' ? 'border-rose-500/50 text-rose-400' :
															issue.severity === 'major'    ? 'border-amber-500/50 text-amber-400' :
															'border-slate-600 text-slate-400'
														}`}
													>
														{issue.type}
													</Badge>
												))}
											</div>
										) : (
											<span className="text-slate-600 text-sm">None</span>
										)}
									</TableCell>

									{/* Reviewer */}
									<TableCell>
										<span className="text-sm text-slate-400">
											{sample.reviewerName ?? '—'}
										</span>
									</TableCell>

									{/* Created at */}
									<TableCell>
										<span className="text-sm text-slate-400">{formatDate(sample.createdAt)}</span>
									</TableCell>

									{/* Row actions */}
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											{sample.reviewStatus === 'pending' && (
												<>
													<button
														onClick={() => quickAction(sample, 'passed')}
														disabled={updateSample.isPending}
														title="Approve"
														className="p-1.5 rounded hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-40"
													>
														<CheckCircle className="w-4 h-4" />
													</button>
													<button
														onClick={() => quickAction(sample, 'failed')}
														disabled={updateSample.isPending}
														title="Reject"
														className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-40"
													>
														<XCircle className="w-4 h-4" />
													</button>
													<button
														onClick={() => quickAction(sample, 'needs_rescan')}
														disabled={updateSample.isPending}
														title="Flag for rescan"
														className="p-1.5 rounded hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-colors disabled:opacity-40"
													>
														<RotateCcw className="w-4 h-4" />
													</button>
												</>
											)}
											<button
												onClick={() => setReviewTarget(sample)}
												className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
											>
												Detail
											</button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Review dialog */}
			<ReviewDialog
				sample={reviewTarget}
				open={!!reviewTarget}
				onOpenChange={(v) => { if (!v) setReviewTarget(null); }}
				onSubmit={submitReview}
				isPending={updateSample.isPending}
			/>
		</div>
	);
}
