// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { usePendingQCSamples, useUpdateQCSample, useScanningProject } from '../hooks';
import { QCSampleCard } from '../components';
import type { QualityControlSample, QCIssue } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';

const issueTypes = ['skew', 'blur', 'cutoff', 'dark', 'light', 'missing', 'duplicate', 'other'] as const;
const severityOptions = ['minor', 'major', 'critical'] as const;

export function QCReview() {
	const { projectId } = useParams<{ projectId: string }>();
	const { data: project } = useScanningProject(projectId!);
	const { data: samples, isLoading } = usePendingQCSamples(projectId!);
	const updateSample = useUpdateQCSample();
	const [selectedSample, setSelectedSample] = useState<QualityControlSample | null>(null);
	const [reviewForm, setReviewForm] = useState({
		reviewStatus: 'pending' as QualityControlSample['reviewStatus'],
		imageQuality: 85,
		ocrAccuracy: 95,
		issues: [] as QCIssue[],
		notes: '',
	});

	const handleReview = (sample: QualityControlSample) => {
		setSelectedSample(sample);
		setReviewForm({
			reviewStatus: sample.reviewStatus,
			imageQuality: sample.imageQuality,
			ocrAccuracy: sample.ocrAccuracy || 95,
			issues: sample.issues || [],
			notes: sample.notes || '',
		});
	};

	const handleSubmit = async () => {
		if (!selectedSample) return;
		await updateSample.mutateAsync({
			projectId: projectId!,
			sampleId: selectedSample.id,
			input: reviewForm,
		});
		setSelectedSample(null);
	};

	const addIssue = (type: QCIssue['type']) => {
		setReviewForm({
			...reviewForm,
			issues: [...reviewForm.issues, { id: crypto.randomUUID(), type, description: '', severity: 'minor' }],
		});
	};

	const removeIssue = (id: string) => {
		setReviewForm({
			...reviewForm,
			issues: reviewForm.issues.filter((i) => i.id !== id),
		});
	};

	if (isLoading) {
		return <div className="p-8"><div className="animate-pulse h-48 bg-slate-800 rounded-lg" /></div>;
	}

	const pendingSamples = samples?.filter((s) => s.reviewStatus === 'pending') || [];

	return (
		<div className="p-8">
			<Link to={`/scanning-projects/${projectId}`} className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100 mb-4">
				<ArrowLeft className="w-4 h-4" />
				Back to {project?.name || 'Project'}
			</Link>

			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Quality Control Review</h1>
					<p className="text-slate-400 mt-1">{pendingSamples.length} samples pending review</p>
				</div>
			</div>

			{pendingSamples.length === 0 ? (
				<div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-lg">
					<CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-slate-100 mb-2">All caught up!</h3>
					<p className="text-slate-400">No pending QC samples to review.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{pendingSamples.map((sample) => (
						<QCSampleCard key={sample.id} sample={sample} onReview={handleReview} />
					))}
				</div>
			)}

			<Dialog.Root open={!!selectedSample} onOpenChange={() => setSelectedSample(null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
						<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">
							Review Sample - Page {selectedSample?.pageNumber}
						</Dialog.Title>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">Decision</label>
								<div className="flex gap-2">
									{[
										{ value: 'passed', label: 'Pass', icon: CheckCircle, className: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
										{ value: 'failed', label: 'Fail', icon: XCircle, className: 'border-rose-500 bg-rose-500/10 text-rose-400' },
										{ value: 'needs_rescan', label: 'Rescan', icon: RotateCcw, className: 'border-amber-500 bg-amber-500/10 text-amber-400' },
									].map(({ value, label, icon: Icon, className }) => (
										<button
											key={value}
											onClick={() => setReviewForm({ ...reviewForm, reviewStatus: value as QualityControlSample['reviewStatus'] })}
											className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
												reviewForm.reviewStatus === value ? className : 'border-slate-700 text-slate-400 hover:border-slate-600'
											}`}
										>
											<Icon className="w-4 h-4" />
											{label}
										</button>
									))}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">Image Quality: {reviewForm.imageQuality}%</label>
								<input
									type="range"
									min={0}
									max={100}
									value={reviewForm.imageQuality}
									onChange={(e) => setReviewForm({ ...reviewForm, imageQuality: parseInt(e.target.value) })}
									className="w-full"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">OCR Accuracy: {reviewForm.ocrAccuracy}%</label>
								<input
									type="range"
									min={0}
									max={100}
									value={reviewForm.ocrAccuracy}
									onChange={(e) => setReviewForm({ ...reviewForm, ocrAccuracy: parseInt(e.target.value) })}
									className="w-full"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-2">Issues</label>
								<div className="flex flex-wrap gap-1 mb-2">
									{issueTypes.map((type) => (
										<button
											key={type}
											onClick={() => addIssue(type)}
											className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded hover:bg-slate-700 capitalize"
										>
											+ {type}
										</button>
									))}
								</div>
								{reviewForm.issues.map((issue) => (
									<div key={issue.id} className="flex items-center gap-2 p-2 bg-slate-800 rounded mb-2">
										<AlertTriangle className="w-4 h-4 text-amber-400" />
										<span className="text-sm text-slate-300 capitalize">{issue.type}</span>
										<select
											value={issue.severity}
											onChange={(e) => setReviewForm({
												...reviewForm,
												issues: reviewForm.issues.map((i) => i.id === issue.id ? { ...i, severity: e.target.value as QCIssue['severity'] } : i),
											})}
											className="ml-auto text-xs bg-slate-700 border-none rounded px-2 py-1 text-slate-300"
										>
											{severityOptions.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
										</select>
										<button onClick={() => removeIssue(issue.id)} className="text-rose-400 hover:text-rose-300">
											<XCircle className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
								<textarea
									value={reviewForm.notes}
									onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 resize-none"
									rows={3}
								/>
							</div>

							<div className="flex justify-end gap-3 pt-4">
								<button onClick={() => setSelectedSample(null)} className="px-4 py-2 text-slate-300 hover:text-slate-100">Cancel</button>
								<button
									onClick={handleSubmit}
									disabled={reviewForm.reviewStatus === 'pending' || updateSample.isPending}
									className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 disabled:opacity-50"
								>
									{updateSample.isPending ? 'Saving...' : 'Submit Review'}
								</button>
							</div>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
