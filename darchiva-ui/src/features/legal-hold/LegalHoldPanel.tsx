// (c) Copyright Datacraft, 2026
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
	AlertTriangle,
	Briefcase,
	CalendarClock,
	Clock,
	ExternalLink,
	Loader2,
	Lock,
	type LucideIcon,
	Plus,
	Shield,
	Unlock,
	User,
} from 'lucide-react';
import { useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import type { LegalHold, PlaceHoldPayload } from './api';
import { useLegalHolds, usePlaceLegalHold, useReleaseLegalHold } from './api';

interface LegalHoldPanelProps {
	documentId: string;
}

function holdName(hold: LegalHold): string {
	return hold.holdName ?? hold.hold_name;
}

function holdReason(hold: LegalHold): string {
	return hold.holdReason ?? hold.hold_reason;
}

function heldBy(hold: LegalHold): string {
	return hold.heldById ?? hold.held_by_id;
}

function heldAt(hold: LegalHold): string {
	return hold.heldAt ?? hold.held_at;
}

function releasedBy(hold: LegalHold): string | null {
	return hold.releasedById ?? hold.released_by_id;
}

function releasedAt(hold: LegalHold): string | null {
	return hold.releasedAt ?? hold.released_at;
}

function expiresAt(hold: LegalHold): string | null {
	return hold.expiresAt ?? hold.expires_at ?? null;
}

function caseId(hold: LegalHold): string | null {
	return hold.caseId ?? hold.case_id ?? null;
}

function caseReference(hold: LegalHold): string | null {
	return hold.caseReference ?? hold.case_reference ?? null;
}

function releaseReason(hold: LegalHold): string | null {
	return hold.releaseReason ?? hold.release_reason ?? null;
}

function formatDateTime(value: string | null | undefined): string {
	if (!value) return 'Not set';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Not set';
	return format(date, 'dd MMM yyyy, HH:mm');
}

function PlaceHoldDialog({
	documentId,
	open,
	onOpenChange,
}: {
	documentId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState('');
	const [reason, setReason] = useState('');
	const [expiryDate, setExpiryDate] = useState('');
	const [caseRef, setCaseRef] = useState('');
	const placeMutation = usePlaceLegalHold(documentId);
	const valid = name.trim().length > 0 && reason.trim().length > 0;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!valid) return;

		const payload: PlaceHoldPayload = {
			hold_name: name.trim(),
			hold_reason: reason.trim(),
		};
		if (expiryDate) payload.expires_at = new Date(`${expiryDate}T23:59:59`).toISOString();
		if (caseRef.trim()) payload.case_reference = caseRef.trim();

		await placeMutation.mutateAsync(payload);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-red-500" />
							Place Hold
						</DialogTitle>
						<DialogDescription>
							Prevent disposal, deletion, or expiry while a legal matter is active.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<div className="space-y-1.5">
							<Label htmlFor="hold-name">Hold name</Label>
							<Input
								id="hold-name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								placeholder="Litigation hold"
								autoFocus
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="hold-reason">Reason</Label>
							<Textarea
								id="hold-reason"
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								placeholder="Describe the legal or regulatory basis for this hold."
								rows={4}
							/>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="hold-expiry">Expiry date</Label>
								<Input
									id="hold-expiry"
									type="date"
									value={expiryDate}
									onChange={(event) => setExpiryDate(event.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="hold-case-ref">Case reference</Label>
								<Input
									id="hold-case-ref"
									value={caseRef}
									onChange={(event) => setCaseRef(event.target.value)}
									placeholder="CASE-2026-001"
								/>
							</div>
						</div>
					</div>

					{placeMutation.isError && (
						<p className="flex items-center gap-2 text-sm text-destructive">
							<AlertTriangle className="h-4 w-4" />
							Failed to place hold. Please try again.
						</p>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!valid || placeMutation.isPending}>
							{placeMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Lock className="mr-2 h-4 w-4" />
							)}
							Place Hold
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ReleaseHoldDialog({
	hold,
	documentId,
	open,
	onOpenChange,
}: {
	hold: LegalHold | null;
	documentId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [reason, setReason] = useState('');
	const releaseMutation = useReleaseLegalHold(documentId);
	const valid = reason.trim().length > 0;

	async function handleRelease(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		if (!hold || !valid) return;
		await releaseMutation.mutateAsync({ holdId: hold.id, reason: reason.trim() });
		setReason('');
		onOpenChange(false);
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-2">
						<Unlock className="h-5 w-5 text-amber-500" />
						Release Hold
					</AlertDialogTitle>
					<AlertDialogDescription>
						Record a release reason before lifting the hold.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="space-y-3">
					{hold && (
						<p className="rounded-md border bg-muted/40 p-3 text-sm">
							Releasing <span className="font-medium">{holdName(hold)}</span>
						</p>
					)}
					<div className="space-y-1.5">
						<Label htmlFor="release-reason">Release reason</Label>
						<Textarea
							id="release-reason"
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Explain why this hold can be released."
							rows={3}
						/>
					</div>
					{releaseMutation.isError && (
						<p className="flex items-center gap-2 text-sm text-destructive">
							<AlertTriangle className="h-4 w-4" />
							Failed to release hold. Please try again.
						</p>
					)}
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleRelease}
						disabled={!valid || releaseMutation.isPending}
						className="bg-amber-600 text-white hover:bg-amber-700"
					>
						{releaseMutation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Unlock className="mr-2 h-4 w-4" />
						)}
						Release Hold
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function HoldDetail({ label, value, icon: Icon }: { label: string; value: ReactNode; icon: LucideIcon }) {
	return (
		<div className="rounded-md border bg-background/60 p-3">
			<div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				<Icon className="h-3.5 w-3.5" />
				{label}
			</div>
			<div className="text-sm">{value}</div>
		</div>
	);
}

function HoldTimeline({ holds }: { holds: LegalHold[] }) {
	const events = holds
		.flatMap((hold) => {
			const placed = {
				id: `${hold.id}-placed`,
				date: heldAt(hold),
				title: `Placed: ${holdName(hold)}`,
				description: holdReason(hold),
				meta: `By ${heldBy(hold)}`,
				active: releasedAt(hold) === null,
			};
			const released = releasedAt(hold)
				? {
						id: `${hold.id}-released`,
						date: releasedAt(hold)!,
						title: `Released: ${holdName(hold)}`,
						description: releaseReason(hold) ?? 'No release reason recorded',
						meta: releasedBy(hold) ? `By ${releasedBy(hold)}` : 'Released',
						active: false,
					}
				: null;
			return released ? [placed, released] : [placed];
		})
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	if (events.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
				No hold events recorded.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{events.map((event, index) => (
				<div key={event.id} className="grid grid-cols-[1rem_1fr] gap-3">
					<div className="flex flex-col items-center">
						<span
							className={cn(
								'mt-1 h-2.5 w-2.5 rounded-full',
								event.active ? 'bg-red-500' : 'bg-slate-400',
							)}
						/>
						{index < events.length - 1 && <span className="mt-1 h-full w-px bg-border" />}
					</div>
					<div className="pb-3">
						<p className="text-sm font-medium">{event.title}</p>
						<p className="text-xs text-muted-foreground">{formatDateTime(event.date)} - {event.meta}</p>
						<p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
					</div>
				</div>
			))}
		</div>
	);
}

export function LegalHoldPanel({ documentId }: LegalHoldPanelProps) {
	const { data: holds = [], isLoading, error } = useLegalHolds(documentId);
	const [showPlace, setShowPlace] = useState(false);
	const [releaseTarget, setReleaseTarget] = useState<LegalHold | null>(null);

	const activeHolds = holds.filter((hold) => releasedAt(hold) === null);
	const currentHold = activeHolds[0] ?? null;
	const currentCaseId = currentHold ? caseId(currentHold) : null;
	const currentCaseRef = currentHold ? caseReference(currentHold) : null;

	return (
		<div className="space-y-4 p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h3 className="text-base font-semibold">Legal Hold</h3>
					<p className="text-xs text-muted-foreground">Document preservation status</p>
				</div>
				<Button type="button" size="sm" onClick={() => setShowPlace(true)}>
					<Plus className="mr-1.5 h-4 w-4" />
					Place Hold
				</Button>
			</div>

			<div
				className={cn(
					'rounded-lg border p-4 text-center',
					currentHold
						? 'border-red-500/40 bg-red-500/10 text-red-200'
						: 'border-green-500/30 bg-green-500/10 text-green-200',
				)}
			>
				<Badge
					variant="outline"
					className={cn(
						'px-4 py-2 text-base font-semibold tracking-wide',
						currentHold
							? 'border-red-500/50 bg-red-500/15 text-red-200'
							: 'border-green-500/50 bg-green-500/15 text-green-200',
					)}
				>
					<Shield className="mr-2 h-5 w-5" />
					{currentHold ? 'ON HOLD' : 'NOT HELD'}
				</Badge>
			</div>

			{isLoading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading legal holds...
				</div>
			)}

			{error && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertTriangle className="h-4 w-4 shrink-0" />
					Failed to load legal holds.
				</div>
			)}

			{currentHold ? (
				<div className="space-y-3">
					<div className="space-y-2 rounded-lg border bg-card p-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-semibold">{holdName(currentHold)}</p>
								<p className="mt-1 text-sm text-muted-foreground">{holdReason(currentHold)}</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setReleaseTarget(currentHold)}
							>
								<Unlock className="mr-1.5 h-4 w-4" />
								Release
							</Button>
						</div>
					</div>

					<div className="grid gap-2">
						<HoldDetail label="Placed by" value={heldBy(currentHold)} icon={User} />
						<HoldDetail label="Placed at" value={formatDateTime(heldAt(currentHold))} icon={Clock} />
						<HoldDetail label="Expiry" value={formatDateTime(expiresAt(currentHold))} icon={CalendarClock} />
						<HoldDetail
							label="Case"
							icon={Briefcase}
							value={
								currentCaseId ? (
									<a
										href={`/cases?case_id=${encodeURIComponent(currentCaseId)}`}
										className="inline-flex items-center gap-1 text-brass-300 hover:text-brass-200"
									>
										{currentCaseRef ?? currentCaseId}
										<ExternalLink className="h-3.5 w-3.5" />
									</a>
								) : (
									currentCaseRef ?? 'Not linked'
								)
							}
						/>
					</div>

					{activeHolds.length > 1 && (
						<div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
							{activeHolds.length - 1} additional active hold
							{activeHolds.length - 1 === 1 ? '' : 's'} recorded in history.
						</div>
					)}
				</div>
			) : (
				<div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
					This document is not currently blocked by a legal hold.
				</div>
			)}

			<Separator />

			<div className="space-y-3">
				<div>
					<p className="text-sm font-semibold">History</p>
					<p className="text-xs text-muted-foreground">Timeline of hold events for this document</p>
				</div>
				<HoldTimeline holds={holds} />
			</div>

			<PlaceHoldDialog documentId={documentId} open={showPlace} onOpenChange={setShowPlace} />
			<ReleaseHoldDialog
				hold={releaseTarget}
				documentId={documentId}
				open={!!releaseTarget}
				onOpenChange={(open) => !open && setReleaseTarget(null)}
			/>
		</div>
	);
}
