// (c) Copyright Datacraft, 2026
// Multi-step document approval workflow panel
import { useAuth } from '@/features/auth';
import { format } from 'date-fns';
import { CheckCircle, ChevronDown, ChevronUp, Clock, Plus, Trash2, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import type { ApprovalStep, ApprovalWorkflow, StepIn } from './api';
import {
	useApproveStep,
	useCreateApprovalWorkflow,
	useDocumentApprovals,
	useRejectStep,
} from './api';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ApprovalPanelProps {
	documentId: string;
}

// ── Step status icon ──────────────────────────────────────────────────────────

function StepIcon({ status }: { status: ApprovalStep['status'] }) {
	if (status === 'approved')
		return <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />;
	if (status === 'rejected')
		return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
	if (status === 'skipped')
		return <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />;
	return <Clock className="h-5 w-5 text-yellow-500 shrink-0" />;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ApprovalWorkflow['status'] }) {
	const cls = {
		in_review: 'bg-yellow-100 text-yellow-800',
		approved: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800',
	}[status] ?? 'bg-gray-100 text-gray-700';

	const label = {
		in_review: 'In Review',
		approved: 'Approved',
		rejected: 'Rejected',
	}[status] ?? status;

	return (
		<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
			{label}
		</span>
	);
}

// ── Step row ──────────────────────────────────────────────────────────────────

interface StepRowProps {
	step: ApprovalStep;
	workflowId: string;
	documentId: string;
	currentUserId: string | undefined;
	isWorkflowActive: boolean;
}

function StepRow({ step, workflowId, documentId, currentUserId, isWorkflowActive }: StepRowProps) {
	const [showAction, setShowAction] = useState(false);
	const [comment, setComment] = useState('');
	const approveMutation = useApproveStep(documentId);
	const rejectMutation = useRejectStep(documentId);

	const isMyStep =
		isWorkflowActive &&
		step.status === 'pending' &&
		currentUserId &&
		step.approver_user_id === currentUserId;

	const handleApprove = async () => {
		await approveMutation.mutateAsync({ workflowId, stepId: step.id, comment: comment || undefined });
		setComment('');
		setShowAction(false);
	};

	const handleReject = async () => {
		if (!comment.trim()) return;
		await rejectMutation.mutateAsync({ workflowId, stepId: step.id, comment });
		setComment('');
		setShowAction(false);
	};

	const busy = approveMutation.isPending || rejectMutation.isPending;

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-start gap-3">
				{/* Step number bubble */}
				<div className="flex-none flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
					{step.step_order}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<StepIcon status={step.status} />
						<span className="text-sm font-medium truncate">{step.approver_email}</span>
						{step.status !== 'pending' && step.decided_at && (
							<span className="text-xs text-gray-400">
								{format(new Date(step.decided_at), 'dd MMM yyyy, HH:mm')}
							</span>
						)}
					</div>

					{step.comment && (
						<p className="mt-0.5 text-xs text-gray-500 italic">"{step.comment}"</p>
					)}

					{isMyStep && !showAction && (
						<button
							onClick={() => setShowAction(true)}
							className="mt-1 text-xs text-blue-600 hover:underline"
						>
							Review…
						</button>
					)}

					{isMyStep && showAction && (
						<div className="mt-2 flex flex-col gap-2">
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								placeholder="Comment (required for rejection)"
								rows={2}
								className="w-full text-xs border border-gray-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
							/>
							<div className="flex gap-2">
								<button
									onClick={handleApprove}
									disabled={busy}
									className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
								>
									<CheckCircle className="h-3.5 w-3.5" />
									Approve
								</button>
								<button
									onClick={handleReject}
									disabled={busy || !comment.trim()}
									className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
								>
									<XCircle className="h-3.5 w-3.5" />
									Reject
								</button>
								<button
									onClick={() => { setShowAction(false); setComment(''); }}
									className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ── Workflow card ─────────────────────────────────────────────────────────────

interface WorkflowCardProps {
	workflow: ApprovalWorkflow;
	documentId: string;
	currentUserId: string | undefined;
}

function WorkflowCard({ workflow, documentId, currentUserId }: WorkflowCardProps) {
	const [collapsed, setCollapsed] = useState(false);

	return (
		<div className="border border-gray-200 rounded-lg overflow-hidden">
			{/* Header */}
			<button
				onClick={() => setCollapsed(!collapsed)}
				className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
			>
				<div className="flex items-center gap-2 min-w-0">
					<span className="font-medium text-sm truncate">{workflow.name}</span>
					<StatusBadge status={workflow.status} />
				</div>
				<div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
					<span>{format(new Date(workflow.created_at), 'dd MMM yyyy')}</span>
					{collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
				</div>
			</button>

			{/* Steps */}
			{!collapsed && (
				<div className="px-4 py-3 flex flex-col gap-3 divide-y divide-gray-100">
					{workflow.steps.map((step) => (
						<div key={step.id} className="pt-3 first:pt-0">
							<StepRow
								step={step}
								workflowId={workflow.id}
								documentId={documentId}
								currentUserId={currentUserId}
								isWorkflowActive={workflow.status === 'in_review'}
							/>
						</div>
					))}
					{workflow.completed_at && (
						<p className="pt-2 text-xs text-gray-400">
							Completed {format(new Date(workflow.completed_at), 'dd MMM yyyy, HH:mm')}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

// ── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
	documentId: string;
	onClose: () => void;
}

function CreateDialog({ documentId, onClose }: CreateDialogProps) {
	const [name, setName] = useState('');
	const [steps, setSteps] = useState<StepIn[]>([{ approver_email: '' }]);
	const createMutation = useCreateApprovalWorkflow(documentId);

	const addStep = () => setSteps((s) => [...s, { approver_email: '' }]);

	const removeStep = (i: number) =>
		setSteps((s) => s.filter((_, idx) => idx !== i));

	const moveUp = (i: number) => {
		if (i === 0) return;
		setSteps((s) => {
			const copy = [...s];
			[copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
			return copy;
		});
	};

	const moveDown = (i: number) => {
		setSteps((s) => {
			if (i >= s.length - 1) return s;
			const copy = [...s];
			[copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
			return copy;
		});
	};

	const updateStep = (i: number, field: keyof StepIn, value: string) =>
		setSteps((s) => s.map((step, idx) => idx === i ? { ...step, [field]: value } : step));

	const valid = name.trim().length > 0 && steps.every((s) => s.approver_email.trim().length > 0);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!valid) return;
		await createMutation.mutateAsync({ name: name.trim(), steps });
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
				<form onSubmit={handleSubmit}>
					<div className="px-6 py-4 border-b border-gray-200">
						<h2 className="text-lg font-semibold">Create Approval Workflow</h2>
					</div>

					<div className="px-6 py-4 flex flex-col gap-4">
						{/* Workflow name */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Workflow Name
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Legal Review"
								required
								className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
							/>
						</div>

						{/* Steps builder */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Approval Steps (in order)
							</label>
							<div className="flex flex-col gap-2">
								{steps.map((step, i) => (
									<div key={i} className="flex items-center gap-2">
										<span className="w-5 text-xs text-gray-400 text-right shrink-0">
											{i + 1}.
										</span>
										<input
											type="email"
											value={step.approver_email}
											onChange={(e) => updateStep(i, 'approver_email', e.target.value)}
											placeholder="approver@example.com"
											required
											className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
										/>
										<input
											type="text"
											value={step.approver_user_id ?? ''}
											onChange={(e) => updateStep(i, 'approver_user_id', e.target.value)}
											placeholder="User ID (optional)"
											className="w-32 border border-gray-300 rounded px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
										/>
										<button
											type="button"
											onClick={() => moveUp(i)}
											disabled={i === 0}
											className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
											title="Move up"
										>
											<ChevronUp className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => moveDown(i)}
											disabled={i === steps.length - 1}
											className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
											title="Move down"
										>
											<ChevronDown className="h-4 w-4" />
										</button>
										<button
											type="button"
											onClick={() => removeStep(i)}
											disabled={steps.length === 1}
											className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
											title="Remove step"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
							<button
								type="button"
								onClick={addStep}
								className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:underline"
							>
								<Plus className="h-3.5 w-3.5" />
								Add step
							</button>
						</div>
					</div>

					<div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!valid || createMutation.isPending}
							className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{createMutation.isPending ? 'Creating…' : 'Create Workflow'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function ApprovalPanel({ documentId }: ApprovalPanelProps) {
	const { user } = useAuth();
	const { data: workflows, isLoading, error } = useDocumentApprovals(documentId);
	const [showCreate, setShowCreate] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-base font-semibold text-gray-900">Approval Workflows</h3>
				<button
					onClick={() => setShowCreate(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					<Plus className="h-4 w-4" />
					Create Workflow
				</button>
			</div>

			{/* Content */}
			{isLoading && (
				<div className="text-sm text-gray-500 py-4 text-center">Loading workflows…</div>
			)}

			{error && (
				<div className="text-sm text-red-600 py-2">
					Failed to load workflows. Please try again.
				</div>
			)}

			{!isLoading && !error && (!workflows || workflows.length === 0) && (
				<div className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
					No approval workflows yet. Create one to start the review process.
				</div>
			)}

			{workflows && workflows.length > 0 && (
				<div className="flex flex-col gap-3">
					{workflows.map((wf) => (
						<WorkflowCard
							key={wf.id}
							workflow={wf}
							documentId={documentId}
							currentUserId={user?.id}
						/>
					))}
				</div>
			)}

			{/* Create dialog */}
			{showCreate && (
				<CreateDialog documentId={documentId} onClose={() => setShowCreate(false)} />
			)}
		</div>
	);
}
