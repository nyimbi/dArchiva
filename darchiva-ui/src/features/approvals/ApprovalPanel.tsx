// (c) Copyright Datacraft, 2026
// Multi-step document approval workflow panel
import { useAuth } from '@/features/auth';
import { useUsers } from '@/features/users/api';
import type { User } from '@/features/users/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Clock,
	Loader2,
	Mail,
	MessageSquare,
	Plus,
	Search,
	Trash2,
	UserRound,
	X,
	XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { ApprovalStep, ApprovalWorkflow, StepIn } from './api';
import {
	useApproveStep,
	useCreateApprovalWorkflow,
	useDocumentApprovals,
	useRejectStep,
} from './api';

interface ApprovalPanelProps {
	documentId: string;
}

type DisplayStatus = 'pending' | 'approved' | 'rejected' | 'expired';

function displayNameForUser(user: User) {
	const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
	return fullName || user.username || user.email;
}

function workflowDisplayStatus(status: ApprovalWorkflow['status']): DisplayStatus {
	if (status === 'approved' || status === 'rejected' || status === 'expired') return status;
	return 'pending';
}

function workflowDate(workflow: ApprovalWorkflow) {
	return workflow.completed_at ?? workflow.created_at;
}

function StepIcon({ status }: { status: ApprovalStep['status'] }) {
	if (status === 'approved') return <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />;
	if (status === 'rejected') return <XCircle className="h-4 w-4 text-red-600 shrink-0" />;
	if (status === 'expired') return <Clock className="h-4 w-4 text-gray-500 shrink-0" />;
	return <Clock className="h-4 w-4 text-amber-500 shrink-0" />;
}

function StatusBadge({ status }: { status: DisplayStatus }) {
	const cls: Record<DisplayStatus, string> = {
		pending: 'bg-amber-100 text-amber-800 ring-amber-200',
		approved: 'bg-green-100 text-green-800 ring-green-200',
		rejected: 'bg-red-100 text-red-800 ring-red-200',
		expired: 'bg-gray-100 text-gray-700 ring-gray-200',
	};

	return (
		<span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1', cls[status])}>
			{status}
		</span>
	);
}

interface RejectDialogProps {
	busy: boolean;
	approver: string;
	onCancel: () => void;
	onReject: (comment: string) => void;
}

function RejectDialog({ busy, approver, onCancel, onReject }: RejectDialogProps) {
	const [comment, setComment] = useState('');

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
			<div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h4 className="text-base font-semibold text-gray-900">Reject approval</h4>
						<p className="mt-1 text-sm text-gray-500">Add a reason for rejecting {approver}.</p>
					</div>
					<button type="button" onClick={onCancel} className="rounded p-1 text-gray-400 hover:text-gray-600">
						<X className="h-4 w-4" />
					</button>
				</div>
				<textarea
					value={comment}
					onChange={(event) => setComment(event.target.value)}
					rows={4}
					autoFocus
					placeholder="Reason for rejection"
					className="mt-4 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
				/>
				<div className="mt-4 flex justify-end gap-2">
					<button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onReject(comment.trim())}
						disabled={busy || !comment.trim()}
						className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					>
						{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						Reject
					</button>
				</div>
			</div>
		</div>
	);
}

interface StepRowProps {
	step: ApprovalStep;
	workflowId: string;
	documentId: string;
	currentUserId: string | undefined;
	isWorkflowActive: boolean;
}

function StepRow({ step, workflowId, documentId, currentUserId, isWorkflowActive }: StepRowProps) {
	const [rejectOpen, setRejectOpen] = useState(false);
	const approveMutation = useApproveStep(documentId);
	const rejectMutation = useRejectStep(documentId);

	const isMyStep =
		isWorkflowActive &&
		step.status === 'pending' &&
		currentUserId &&
		step.approver_user_id === currentUserId;
	const busy = approveMutation.isPending || rejectMutation.isPending;
	const approver = step.approver_email || 'this approver';

	const handleApprove = async () => {
		await approveMutation.mutateAsync({ workflowId, stepId: step.id });
	};

	const handleReject = async (comment: string) => {
		if (!comment) return;
		await rejectMutation.mutateAsync({ workflowId, stepId: step.id, comment });
		setRejectOpen(false);
	};

	return (
		<div className="rounded-md border border-gray-100 bg-white px-3 py-2">
			<div className="flex items-start gap-3">
				<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
					{step.step_order}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<StepIcon status={step.status} />
						<span className="truncate text-sm font-medium text-gray-900">{step.approver_email}</span>
						<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-600">
							{step.status}
						</span>
						{step.decided_at && (
							<span className="text-xs text-gray-400">
								{format(new Date(step.decided_at), 'dd MMM yyyy, HH:mm')}
							</span>
						)}
					</div>
					{step.comment && (
						<p className="mt-1 flex gap-1 text-xs text-gray-500">
							<MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span className="break-words">{step.comment}</span>
						</p>
					)}
					{isMyStep && (
						<div className="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={handleApprove}
								disabled={busy}
								className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
							>
								<CheckCircle className="h-3.5 w-3.5" />
								Approve
							</button>
							<button
								type="button"
								onClick={() => setRejectOpen(true)}
								disabled={busy}
								className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
							>
								<XCircle className="h-3.5 w-3.5" />
								Reject
							</button>
						</div>
					)}
				</div>
			</div>
			{rejectOpen && (
				<RejectDialog
					busy={busy}
					approver={approver}
					onCancel={() => setRejectOpen(false)}
					onReject={handleReject}
				/>
			)}
		</div>
	);
}

interface WorkflowCardProps {
	workflow: ApprovalWorkflow;
	documentId: string;
	currentUserId: string | undefined;
	defaultCollapsed?: boolean;
}

function WorkflowCard({ workflow, documentId, currentUserId, defaultCollapsed = false }: WorkflowCardProps) {
	const [collapsed, setCollapsed] = useState(defaultCollapsed);
	const displayStatus = workflowDisplayStatus(workflow.status);

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
			<button
				type="button"
				onClick={() => setCollapsed(!collapsed)}
				className="flex w-full items-center justify-between gap-3 bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100"
			>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="truncate text-sm font-semibold text-gray-900">{workflow.name}</span>
						<StatusBadge status={displayStatus} />
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
						<span>{workflow.steps.length} approver{workflow.steps.length === 1 ? '' : 's'}</span>
						<span>Requested {format(new Date(workflow.created_at), 'dd MMM yyyy')}</span>
						{workflow.deadline_at && <span>Due {format(new Date(workflow.deadline_at), 'dd MMM yyyy')}</span>}
					</div>
				</div>
				{collapsed ? <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />}
			</button>

			{!collapsed && (
				<div className="space-y-3 px-4 py-3">
					{workflow.message && (
						<p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">{workflow.message}</p>
					)}
					<div className="space-y-2">
						{workflow.steps.map((step) => (
							<StepRow
								key={step.id}
								step={step}
								workflowId={workflow.id}
								documentId={documentId}
								currentUserId={currentUserId}
								isWorkflowActive={workflowDisplayStatus(workflow.status) === 'pending'}
							/>
						))}
					</div>
					{workflow.completed_at && (
						<p className="text-xs text-gray-400">
							Completed {format(new Date(workflow.completed_at), 'dd MMM yyyy, HH:mm')}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

interface CreateDialogProps {
	documentId: string;
	onClose: () => void;
}

function CreateDialog({ documentId, onClose }: CreateDialogProps) {
	const [search, setSearch] = useState('');
	const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
	const [deadline, setDeadline] = useState('');
	const [message, setMessage] = useState('');
	const { data: usersData, isLoading } = useUsers({ search, pageSize: 25, is_active: true });
	const createMutation = useCreateApprovalWorkflow(documentId);
	const users = usersData?.items ?? [];

	const selectedIds = useMemo(() => new Set(selectedUsers.map((user) => user.id)), [selectedUsers]);
	const valid = selectedUsers.length > 0;

	const toggleUser = (user: User) => {
		setSelectedUsers((current) => {
			if (current.some((item) => item.id === user.id)) return current.filter((item) => item.id !== user.id);
			return [...current, user];
		});
	};

	const moveSelected = (index: number, direction: -1 | 1) => {
		setSelectedUsers((current) => {
			const nextIndex = index + direction;
			if (nextIndex < 0 || nextIndex >= current.length) return current;
			const copy = [...current];
			[copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
			return copy;
		});
	};

	const removeSelected = (userId: string) => {
		setSelectedUsers((current) => current.filter((user) => user.id !== userId));
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!valid) return;

		const steps: StepIn[] = selectedUsers.map((user) => ({
			approver_email: user.email,
			approver_user_id: user.id,
		}));

		await createMutation.mutateAsync({
			name: 'Document Approval',
			steps,
			deadline_at: deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null,
			message: message.trim() || undefined,
		});
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
			<div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
				<form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
					<div className="border-b border-gray-200 px-6 py-4">
						<h2 className="text-lg font-semibold text-gray-900">Request Approval</h2>
						<p className="mt-1 text-sm text-gray-500">Select approvers in the order they should review this document.</p>
					</div>

					<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-4 md:grid-cols-[1fr_1fr]">
						<div className="space-y-3">
							<label className="block text-sm font-medium text-gray-700" htmlFor="approval-user-search">
								Approvers
							</label>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
								<input
									id="approval-user-search"
									type="search"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Search users"
									className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							</div>
							<div className="max-h-72 overflow-y-auto rounded-md border border-gray-200">
								{isLoading ? (
									<div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading users
									</div>
								) : users.length === 0 ? (
									<p className="px-3 py-4 text-sm text-gray-400">No users found.</p>
								) : (
									users.map((user) => (
										<label key={user.id} className="flex cursor-pointer items-start gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50">
											<input
												type="checkbox"
												checked={selectedIds.has(user.id)}
												onChange={() => toggleUser(user)}
												className="mt-1"
											/>
											<span className="min-w-0">
												<span className="block truncate text-sm font-medium text-gray-900">{displayNameForUser(user)}</span>
												<span className="block truncate text-xs text-gray-500">{user.email}</span>
											</span>
										</label>
									))
								)}
							</div>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700" htmlFor="approval-deadline">
									Deadline
								</label>
								<input
									id="approval-deadline"
									type="date"
									value={deadline}
									onChange={(event) => setDeadline(event.target.value)}
									className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700" htmlFor="approval-message">
									Message
								</label>
								<textarea
									id="approval-message"
									value={message}
									onChange={(event) => setMessage(event.target.value)}
									rows={4}
									placeholder="Add context for approvers"
									className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
								/>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-700">Approval chain</p>
								<div className="mt-2 space-y-2">
									{selectedUsers.length === 0 ? (
										<p className="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-400">No approvers selected.</p>
									) : (
										selectedUsers.map((user, index) => (
											<div key={user.id} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-2">
												<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">{index + 1}</span>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-gray-900">{displayNameForUser(user)}</p>
													<p className="truncate text-xs text-gray-500">{user.email}</p>
												</div>
												<button type="button" onClick={() => moveSelected(index, -1)} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
													<ChevronUp className="h-4 w-4" />
												</button>
												<button type="button" onClick={() => moveSelected(index, 1)} disabled={index === selectedUsers.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
													<ChevronDown className="h-4 w-4" />
												</button>
												<button type="button" onClick={() => removeSelected(user.id)} className="p-1 text-red-400 hover:text-red-600">
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
						<button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900">
							Cancel
						</button>
						<button
							type="submit"
							disabled={!valid || createMutation.isPending}
							className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
							Request Approval
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function ApprovalPanel({ documentId }: ApprovalPanelProps) {
	const { user } = useAuth();
	const { data: workflows, isLoading, error } = useDocumentApprovals(documentId);
	const [showCreate, setShowCreate] = useState(false);
	const sortedWorkflows = useMemo(
		() => [...(workflows ?? [])].sort((a, b) => new Date(workflowDate(b)).getTime() - new Date(workflowDate(a)).getTime()),
		[workflows],
	);
	const currentWorkflow = sortedWorkflows.find((workflow) => workflowDisplayStatus(workflow.status) === 'pending') ?? sortedWorkflows[0];
	const history = sortedWorkflows.filter((workflow) => workflow.id !== currentWorkflow?.id);
	const canRequestApproval = !currentWorkflow || workflowDisplayStatus(currentWorkflow.status) !== 'pending';

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="text-base font-semibold text-gray-900">Approvals</h3>
					{currentWorkflow && (
						<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
							<span>Current status</span>
							<StatusBadge status={workflowDisplayStatus(currentWorkflow.status)} />
						</div>
					)}
				</div>
				{canRequestApproval && (
					<button
						type="button"
						onClick={() => setShowCreate(true)}
						className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						<Plus className="h-4 w-4" />
						Request Approval
					</button>
				)}
			</div>

			{isLoading && <div className="py-4 text-center text-sm text-gray-500">Loading approvals...</div>}

			{error && <div className="py-2 text-sm text-red-600">Failed to load approvals. Please try again.</div>}

			{!isLoading && !error && !currentWorkflow && (
				<div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
					<UserRound className="mx-auto h-8 w-8 text-gray-300" />
					<p className="mt-2 text-sm text-gray-500">No approval chain exists for this document.</p>
					<button
						type="button"
						onClick={() => setShowCreate(true)}
						className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
					>
						<Mail className="h-4 w-4" />
						Request Approval
					</button>
				</div>
			)}

			{currentWorkflow && (
				<section className="space-y-2">
					<h4 className="text-sm font-semibold text-gray-800">Approval chain</h4>
					<WorkflowCard workflow={currentWorkflow} documentId={documentId} currentUserId={user?.id} />
				</section>
			)}

			{history.length > 0 && (
				<section className="space-y-2">
					<h4 className="text-sm font-semibold text-gray-800">History</h4>
					<div className="space-y-2">
						{history.map((workflow) => (
							<WorkflowCard
								key={workflow.id}
								workflow={workflow}
								documentId={documentId}
								currentUserId={user?.id}
								defaultCollapsed
							/>
						))}
					</div>
				</section>
			)}

			{showCreate && <CreateDialog documentId={documentId} onClose={() => setShowCreate(false)} />}
		</div>
	);
}
