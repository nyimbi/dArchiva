// (c) Copyright Datacraft, 2026
// Named legal hold management panel for a document
import { format } from 'date-fns';
import { AlertTriangle, Lock, Plus, Shield, Unlock } from 'lucide-react';
import React, { useState } from 'react';
import type { LegalHold, PlaceHoldPayload } from './api';
import { useLegalHolds, usePlaceLegalHold, useReleaseLegalHold } from './api';

// ── Props ─────────────────────────────────────────────────────────────────────

interface LegalHoldPanelProps {
	documentId: string;
}

// ── Place Hold Dialog ─────────────────────────────────────────────────────────

interface PlaceHoldDialogProps {
	documentId: string;
	onClose: () => void;
}

function PlaceHoldDialog({ documentId, onClose }: PlaceHoldDialogProps) {
	const [holdName, setHoldName] = useState('');
	const [holdReason, setHoldReason] = useState('');
	const placeMutation = usePlaceLegalHold(documentId);

	const valid = holdName.trim().length > 0 && holdReason.trim().length > 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!valid) return;
		const payload: PlaceHoldPayload = {
			hold_name: holdName.trim(),
			hold_reason: holdReason.trim(),
		};
		await placeMutation.mutateAsync(payload);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
				<form onSubmit={handleSubmit}>
					<div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
						<Lock className="h-5 w-5 text-red-600 shrink-0" />
						<h2 className="text-lg font-semibold">Place Legal Hold</h2>
					</div>

					<div className="px-6 py-4 flex flex-col gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Hold Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								value={holdName}
								onChange={(e) => setHoldName(e.target.value)}
								placeholder="e.g. Litigation Hold — Acme Corp v. Widgets Ltd"
								required
								autoFocus
								className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Reason <span className="text-red-500">*</span>
							</label>
							<textarea
								value={holdReason}
								onChange={(e) => setHoldReason(e.target.value)}
								placeholder="Describe the legal or regulatory basis for this hold…"
								required
								rows={4}
								className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
							/>
						</div>

						{placeMutation.isError && (
							<div className="flex items-center gap-2 text-sm text-red-600">
								<AlertTriangle className="h-4 w-4 shrink-0" />
								Failed to place hold. Please try again.
							</div>
						)}
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
							disabled={!valid || placeMutation.isPending}
							className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
						>
							<Lock className="h-3.5 w-3.5" />
							{placeMutation.isPending ? 'Placing…' : 'Place Hold'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ── Release Confirmation Dialog ───────────────────────────────────────────────

interface ReleaseConfirmDialogProps {
	hold: LegalHold;
	documentId: string;
	onClose: () => void;
}

function ReleaseConfirmDialog({ hold, documentId, onClose }: ReleaseConfirmDialogProps) {
	const releaseMutation = useReleaseLegalHold(documentId);

	const handleRelease = async () => {
		await releaseMutation.mutateAsync(hold.id);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
				<div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
					<Unlock className="h-5 w-5 text-yellow-600 shrink-0" />
					<h2 className="text-lg font-semibold">Release Hold</h2>
				</div>

				<div className="px-6 py-4">
					<p className="text-sm text-gray-700">
						Release the legal hold <span className="font-medium">"{hold.hold_name}"</span>?
						This will allow the document to be deleted or modified again.
					</p>
					{releaseMutation.isError && (
						<div className="mt-3 flex items-center gap-2 text-sm text-red-600">
							<AlertTriangle className="h-4 w-4 shrink-0" />
							Failed to release hold. Please try again.
						</div>
					)}
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
						onClick={handleRelease}
						disabled={releaseMutation.isPending}
						className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
					>
						<Unlock className="h-3.5 w-3.5" />
						{releaseMutation.isPending ? 'Releasing…' : 'Release Hold'}
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Active Hold Row ───────────────────────────────────────────────────────────

interface ActiveHoldRowProps {
	hold: LegalHold;
	documentId: string;
}

function ActiveHoldRow({ hold, documentId }: ActiveHoldRowProps) {
	const [showConfirm, setShowConfirm] = useState(false);

	return (
		<>
			<div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<Shield className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-medium text-sm text-gray-900 truncate">
									{hold.hold_name}
								</span>
								<span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
									Active
								</span>
							</div>
							<p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{hold.hold_reason}</p>
							<p className="mt-1 text-xs text-gray-400">
								Placed {format(new Date(hold.held_at), 'dd MMM yyyy, HH:mm')}
							</p>
						</div>
					</div>

					<button
						onClick={() => setShowConfirm(true)}
						className="flex items-center gap-1 px-2.5 py-1 text-xs text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors shrink-0"
						title="Release this hold"
					>
						<Unlock className="h-3.5 w-3.5" />
						Release
					</button>
				</div>
			</div>

			{showConfirm && (
				<ReleaseConfirmDialog
					hold={hold}
					documentId={documentId}
					onClose={() => setShowConfirm(false)}
				/>
			)}
		</>
	);
}

// ── Released Hold Row ─────────────────────────────────────────────────────────

function ReleasedHoldRow({ hold }: { hold: LegalHold }) {
	return (
		<div className="border border-gray-100 bg-gray-50 rounded-lg px-4 py-3 opacity-60">
			<div className="flex items-start gap-2">
				<Shield className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-medium text-sm text-gray-500 truncate line-through">
							{hold.hold_name}
						</span>
						<span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
							Released
						</span>
					</div>
					<p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{hold.hold_reason}</p>
					<p className="mt-1 text-xs text-gray-400">
						Released {hold.released_at
							? format(new Date(hold.released_at), 'dd MMM yyyy, HH:mm')
							: '—'}
					</p>
				</div>
			</div>
		</div>
	);
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function LegalHoldPanel({ documentId }: LegalHoldPanelProps) {
	const { data: holds, isLoading, error } = useLegalHolds(documentId);
	const [showPlace, setShowPlace] = useState(false);

	const activeHolds = holds?.filter((h) => h.released_at === null) ?? [];
	const releasedHolds = holds?.filter((h) => h.released_at !== null) ?? [];

	return (
		<div className="flex flex-col gap-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h3 className="text-base font-semibold text-gray-900">Legal Holds</h3>
					{activeHolds.length > 0 && (
						<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
							<Shield className="h-3 w-3 mr-1" />
							{activeHolds.length} active
						</span>
					)}
				</div>
				<button
					onClick={() => setShowPlace(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
				>
					<Plus className="h-4 w-4" />
					Place Hold
				</button>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="text-sm text-gray-500 py-4 text-center">Loading holds…</div>
			)}

			{/* Error */}
			{error && (
				<div className="flex items-center gap-2 text-sm text-red-600 py-2">
					<AlertTriangle className="h-4 w-4 shrink-0" />
					Failed to load legal holds. Please try again.
				</div>
			)}

			{/* Empty state */}
			{!isLoading && !error && activeHolds.length === 0 && releasedHolds.length === 0 && (
				<div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-lg text-center gap-2">
					<Shield className="h-8 w-8 text-gray-300" />
					<p className="text-sm text-gray-400">No legal holds active</p>
					<p className="text-xs text-gray-400">
						Place a hold to prevent deletion or modification of this document.
					</p>
				</div>
			)}

			{/* Active holds */}
			{activeHolds.length > 0 && (
				<div className="flex flex-col gap-2">
					{activeHolds.map((hold) => (
						<ActiveHoldRow key={hold.id} hold={hold} documentId={documentId} />
					))}
				</div>
			)}

			{/* Released holds */}
			{releasedHolds.length > 0 && (
				<div className="flex flex-col gap-2">
					<p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
						Released Holds
					</p>
					{releasedHolds.map((hold) => (
						<ReleasedHoldRow key={hold.id} hold={hold} />
					))}
				</div>
			)}

			{/* Place hold dialog */}
			{showPlace && (
				<PlaceHoldDialog documentId={documentId} onClose={() => setShowPlace(false)} />
			)}
		</div>
	);
}
