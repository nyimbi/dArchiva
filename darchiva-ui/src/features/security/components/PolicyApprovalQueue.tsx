// (c) Copyright Datacraft, 2026
/**
 * Policy approval queue for reviewing pending policy changes.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, User, FileText, MessageSquare, Shield, ShieldOff } from 'lucide-react';
import type { PolicyApproval } from '../types';
import { fetchPendingApprovals, approvePolicy, rejectPolicy } from '../api';

interface ApprovalCardProps {
	approval: PolicyApproval;
	onApprove: (id: string, comments?: string) => Promise<void>;
	onReject: (id: string, comments?: string) => Promise<void>;
}

function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
	const [comments, setComments] = useState('');
	const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
	const [showComments, setShowComments] = useState(false);

	const handleApprove = async () => {
		setProcessing('approve');
		try {
			await onApprove(approval.id, comments || undefined);
		} finally {
			setProcessing(null);
		}
	};

	const handleReject = async () => {
		setProcessing('reject');
		try {
			await onReject(approval.id, comments || undefined);
		} finally {
			setProcessing(null);
		}
	};

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="group overflow-hidden rounded-xl border-2 border-charcoal/10 bg-parchment transition-shadow hover:shadow-md"
		>
			{/* Header */}
			<div className="flex items-start justify-between border-b border-charcoal/5 bg-cream/50 px-5 py-4">
				<div className="flex items-start gap-3">
					<div className="rounded-lg bg-gold/15 p-2">
						<Clock className="h-5 w-5 text-gold" />
					</div>
					<div>
						<h3 className="font-['Newsreader'] text-lg font-semibold text-charcoal">
							{approval.policy_name || 'Unnamed Policy'}
						</h3>
						<div className="mt-1 flex items-center gap-3 text-sm">
							<span className="flex items-center gap-1 text-charcoal/50">
								<User className="h-3.5 w-3.5" />
								{approval.requester_name || approval.requested_by || 'Unknown'}
							</span>
							<span className="text-charcoal/30">|</span>
							<span className="text-charcoal/50">{timeAgo(approval.requested_at)}</span>
						</div>
					</div>
				</div>

				<span className="rounded-full bg-gold/15 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-gold">
					Pending Review
				</span>
			</div>

			{/* Changes Summary */}
			{approval.changes_summary && (
				<div className="border-b border-charcoal/5 px-5 py-3">
					<p className="font-['DM_Sans'] text-sm text-charcoal/70">
						<span className="font-medium text-charcoal">Changes: </span>
						{approval.changes_summary}
					</p>
				</div>
			)}

			{/* Comments Input */}
			<AnimatePresence>
				{showComments && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden border-b border-charcoal/5"
					>
						<div className="px-5 py-3">
							<div className="flex items-center gap-2 text-charcoal/60">
								<MessageSquare className="h-4 w-4" />
								<span className="font-['DM_Sans'] text-sm font-medium">Review Comments</span>
							</div>
							<textarea
								value={comments}
								onChange={(e) => setComments(e.target.value)}
								placeholder="Add optional comments for the requester..."
								className="mt-2 h-20 w-full resize-none rounded-lg border border-charcoal/10 bg-cream p-3 font-['DM_Sans'] text-sm text-charcoal placeholder:text-charcoal/30 focus:border-charcoal/30 focus:outline-none"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Actions */}
			<div className="flex items-center gap-3 px-5 py-4">
				<button
					onClick={() => setShowComments(!showComments)}
					className="flex items-center gap-2 rounded-lg px-3 py-2 font-['DM_Sans'] text-sm text-charcoal/50 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
				>
					<MessageSquare className="h-4 w-4" />
					{showComments ? 'Hide' : 'Add'} Comments
				</button>

				<div className="flex-1" />

				<button
					onClick={handleReject}
					disabled={processing !== null}
					className="flex items-center gap-2 rounded-lg bg-terracotta/10 px-4 py-2 font-['DM_Sans'] text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/20 disabled:opacity-50"
				>
					<XCircle className="h-4 w-4" />
					{processing === 'reject' ? 'Rejecting...' : 'Reject'}
				</button>

				<button
					onClick={handleApprove}
					disabled={processing !== null}
					className="flex items-center gap-2 rounded-lg bg-sage px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-sage/90 disabled:opacity-50"
				>
					<CheckCircle className="h-4 w-4" />
					{processing === 'approve' ? 'Approving...' : 'Approve'}
				</button>
			</div>
		</motion.div>
	);
}

export function PolicyApprovalQueue() {
	const [approvals, setApprovals] = useState<PolicyApproval[]>([]);
	const [loading, setLoading] = useState(true);

	const loadApprovals = async () => {
		try {
			const data = await fetchPendingApprovals();
			setApprovals(data);
		} catch (err) {
			console.error('Failed to load approvals:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadApprovals();
	}, []);

	const handleApprove = async (id: string, comments?: string) => {
		await approvePolicy(id, comments);
		setApprovals(prev => prev.filter(a => a.id !== id));
	};

	const handleReject = async (id: string, comments?: string) => {
		await rejectPolicy(id, comments);
		setApprovals(prev => prev.filter(a => a.id !== id));
	};

	if (loading) {
		return (
			<div className="space-y-4">
				{[...Array(2)].map((_, i) => (
					<div key={i} className="h-40 animate-pulse rounded-xl bg-parchment" />
				))}
			</div>
		);
	}

	if (approvals.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border-2 border-charcoal/10 bg-parchment py-12 text-center">
				<div className="rounded-full bg-sage/15 p-4">
					<CheckCircle className="h-8 w-8 text-sage" />
				</div>
				<h3 className="mt-4 font-['Newsreader'] text-lg font-semibold text-charcoal">
					All Caught Up
				</h3>
				<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/50">
					No pending policy approvals at this time
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Clock className="h-5 w-5 text-gold" />
					<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
						Pending Approvals
					</h2>
					<span className="rounded-full bg-gold/15 px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-gold">
						{approvals.length}
					</span>
				</div>
			</div>

			<AnimatePresence>
				{approvals.map(approval => (
					<ApprovalCard
						key={approval.id}
						approval={approval}
						onApprove={handleApprove}
						onReject={handleReject}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}
