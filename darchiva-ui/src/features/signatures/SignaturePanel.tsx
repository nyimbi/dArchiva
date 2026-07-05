import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2 } from 'lucide-react';
import {
	useSignatureRequests,
	useSendSignatureReminder,
	type SignatureRequest,
} from './api';
import { SignatureRequestDialog } from './SignatureRequestDialog';
import { toast } from 'sonner';

interface Props {
	documentId: string;
}

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function PendingRow({ req }: { req: SignatureRequest }) {
	const reminderMutation = useSendSignatureReminder();

	const handleReminder = async () => {
		try {
			await reminderMutation.mutateAsync(req.id);
			toast.success('Reminder sent to signer');
		} catch {
			toast.error('Failed to send reminder');
		}
	};

	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<div className="min-w-0">
				<p className="text-sm font-medium truncate">{req.requestedFromEmail}</p>
				{req.requestedFromName && (
					<p className="text-xs text-muted-foreground truncate">{req.requestedFromName}</p>
				)}
				<p className="text-xs text-muted-foreground mt-0.5">
					Requested {formatDate(req.createdAt)} · Page {req.signaturePage}
				</p>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<Badge variant="outline" className="text-yellow-700 border-yellow-400 bg-yellow-50">
					Pending
				</Badge>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 text-xs"
					onClick={handleReminder}
					disabled={reminderMutation.isPending}
				>
					{reminderMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
					Send Reminder
				</Button>
			</div>
		</div>
	);
}

function SignedRow({ req }: { req: SignatureRequest }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<div className="min-w-0">
				<p className="text-sm font-medium truncate">
					{req.requestedFromName || req.requestedFromEmail}
				</p>
				<p className="text-xs text-muted-foreground truncate">{req.requestedFromEmail}</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					Signed {formatDate(req.signedAt)}
				</p>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">
					Signed
				</Badge>
				{req.signedDocumentId && (
					<Button
						size="sm"
						variant="ghost"
						className="h-7 text-xs"
						onClick={() => {
							// Navigate to the signed document — exact route depends on app router.
							window.location.href = `/documents/${req.signedDocumentId}`;
						}}
					>
						View Signed
					</Button>
				)}
			</div>
		</div>
	);
}

function DeclinedRow({ req }: { req: SignatureRequest }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<div className="min-w-0">
				<p className="text-sm font-medium truncate">{req.requestedFromEmail}</p>
				<p className="text-xs text-muted-foreground mt-0.5">
					Declined {formatDate(req.declinedAt)}
				</p>
				{req.declineReason && (
					<p className="text-xs text-muted-foreground italic mt-0.5">
						"{req.declineReason}"
					</p>
				)}
			</div>
			<Badge variant="outline" className="text-red-700 border-red-400 bg-red-50 shrink-0">
				Declined
			</Badge>
		</div>
	);
}

export function SignaturePanel({ documentId }: Props) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: requests, isLoading, error } = useSignatureRequests(documentId);

	const pending = requests?.filter((r) => r.status === 'pending') ?? [];
	const signed = requests?.filter((r) => r.status === 'signed') ?? [];
	const declined = requests?.filter((r) => r.status === 'declined') ?? [];

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Signatures</h3>
				<Button size="sm" onClick={() => setDialogOpen(true)}>
					Request Signature
				</Button>
			</div>

			{isLoading && (
				<p className="text-sm text-muted-foreground">Loading…</p>
			)}

			{error && (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load signature requests. Check your connection and try refreshing.
				</div>
			)}

			{!isLoading && !error && requests?.length === 0 && (
				<p className="text-sm text-muted-foreground">
					No signature requests yet.
				</p>
			)}

			{pending.length > 0 && (
				<section>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
						Pending ({pending.length})
					</p>
					<div className="divide-y">
						{pending.map((req) => (
							<PendingRow key={req.id} req={req} />
						))}
					</div>
				</section>
			)}

			{signed.length > 0 && (
				<>
					{pending.length > 0 && <Separator />}
					<section>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Signed ({signed.length})
						</p>
						<div className="divide-y">
							{signed.map((req) => (
								<SignedRow key={req.id} req={req} />
							))}
						</div>
					</section>
				</>
			)}

			{declined.length > 0 && (
				<>
					{(pending.length > 0 || signed.length > 0) && <Separator />}
					<section>
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
							Declined ({declined.length})
						</p>
						<div className="divide-y">
							{declined.map((req) => (
								<DeclinedRow key={req.id} req={req} />
							))}
						</div>
					</section>
				</>
			)}

			<SignatureRequestDialog
				documentId={documentId}
				open={dialogOpen}
				onClose={() => setDialogOpen(false)}
			/>
		</div>
	);
}
