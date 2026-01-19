// (c) Copyright Datacraft, 2026
/**
 * Hidden document access request approval queue.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, CheckCircle, XCircle, User, FileText, Clock, MessageSquare } from 'lucide-react';
import type { HiddenAccessRequest } from '../types';
import { fetchPendingAccessRequests, approveHiddenAccess, denyHiddenAccess } from '../api';

interface RequestCardProps {
	request: HiddenAccessRequest;
	onApprove: (id: string, hours: number) => Promise<void>;
	onDeny: (id: string) => Promise<void>;
}

function RequestCard({ request, onApprove, onDeny }: RequestCardProps) {
	const [durationHours, setDurationHours] = useState(24);
	const [processing, setProcessing] = useState<'approve' | 'deny' | null>(null);

	const timeAgo = (dateStr: string) => {
		const diff = Date.now() - new Date(dateStr).getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		if (hours < 1) return 'Just now';
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	};

	const handleApprove = async () => {
		setProcessing('approve');
		try {
			await onApprove(request.id, durationHours);
		} finally {
			setProcessing(null);
		}
	};

	const handleDeny = async () => {
		setProcessing('deny');
		try {
			await onDeny(request.id);
		} finally {
			setProcessing(null);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="overflow-hidden rounded-xl border-2 border-charcoal/10 bg-parchment"
		>
			{/* Header */}
			<div className="flex items-start justify-between border-b border-charcoal/5 bg-cream/50 px-5 py-4">
				<div className="flex items-start gap-3">
					<div className="rounded-lg bg-terracotta/15 p-2">
						<EyeOff className="h-5 w-5 text-terracotta" />
					</div>
					<div>
						<h3 className="font-['Newsreader'] text-lg font-semibold text-charcoal">
							{request.document_name || `Document ${request.document_id.slice(0, 8)}`}
						</h3>
						<div className="mt-1 flex items-center gap-3 text-sm">
							<span className="flex items-center gap-1 text-charcoal/50">
								<User className="h-3.5 w-3.5" />
								{request.requester_name || request.requested_by}
							</span>
							<span className="text-charcoal/30">|</span>
							<span className="text-charcoal/50">{timeAgo(request.requested_at)}</span>
						</div>
					</div>
				</div>

				<span className="rounded-full bg-gold/15 px-3 py-1 font-['DM_Sans'] text-xs font-medium text-gold">
					Pending
				</span>
			</div>

			{/* Reason */}
			<div className="border-b border-charcoal/5 px-5 py-4">
				<div className="flex items-start gap-2">
					<MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-charcoal/40" />
					<div>
						<p className="font-['DM_Sans'] text-xs font-medium uppercase tracking-wider text-charcoal/40">
							Reason for Access
						</p>
						<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal">
							{request.reason}
						</p>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-4 px-5 py-4">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4 text-charcoal/40" />
					<span className="font-['DM_Sans'] text-sm text-charcoal/60">Grant for:</span>
					<select
						value={durationHours}
						onChange={(e) => setDurationHours(Number(e.target.value))}
						className="rounded-lg border border-charcoal/10 bg-cream px-2 py-1 font-['DM_Sans'] text-sm text-charcoal focus:outline-none"
					>
						<option value={1}>1 hour</option>
						<option value={4}>4 hours</option>
						<option value={8}>8 hours</option>
						<option value={24}>24 hours</option>
						<option value={72}>3 days</option>
						<option value={168}>1 week</option>
					</select>
				</div>

				<div className="flex-1" />

				<button
					onClick={handleDeny}
					disabled={processing !== null}
					className="flex items-center gap-2 rounded-lg bg-terracotta/10 px-4 py-2 font-['DM_Sans'] text-sm font-medium text-terracotta transition-colors hover:bg-terracotta/20 disabled:opacity-50"
				>
					<XCircle className="h-4 w-4" />
					{processing === 'deny' ? 'Denying...' : 'Deny'}
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

export function HiddenDocumentRequests() {
	const [requests, setRequests] = useState<HiddenAccessRequest[]>([]);
	const [loading, setLoading] = useState(true);

	const loadRequests = async () => {
		try {
			const data = await fetchPendingAccessRequests();
			setRequests(data.items);
		} catch (err) {
			console.error('Failed to load requests:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadRequests();
	}, []);

	const handleApprove = async (id: string, hours: number) => {
		await approveHiddenAccess(id, hours);
		setRequests(prev => prev.filter(r => r.id !== id));
	};

	const handleDeny = async (id: string) => {
		await denyHiddenAccess(id);
		setRequests(prev => prev.filter(r => r.id !== id));
	};

	if (loading) {
		return (
			<div className="space-y-4">
				{[...Array(2)].map((_, i) => (
					<div key={i} className="h-48 animate-pulse rounded-xl bg-parchment" />
				))}
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-xl border-2 border-charcoal/10 bg-parchment py-12 text-center">
				<div className="rounded-full bg-sage/15 p-4">
					<CheckCircle className="h-8 w-8 text-sage" />
				</div>
				<h3 className="mt-4 font-['Newsreader'] text-lg font-semibold text-charcoal">
					No Pending Requests
				</h3>
				<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/50">
					Hidden document access requests will appear here
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<EyeOff className="h-5 w-5 text-terracotta" />
				<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
					Hidden Document Access
				</h2>
				<span className="rounded-full bg-gold/15 px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-gold">
					{requests.length} pending
				</span>
			</div>

			<AnimatePresence>
				{requests.map(request => (
					<RequestCard
						key={request.id}
						request={request}
						onApprove={handleApprove}
						onDeny={handleDeny}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}
