// (c) Copyright Datacraft, 2026
/**
 * DuplicatesPanel — shows potential duplicates for a document.
 * Intended to be embedded in a DocumentDetail sidebar panel.
 */
import { useState } from 'react';
import { CheckCircle, AlertCircle, FileText, ExternalLink, X, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useDocumentDuplicates, type DuplicateEntry, type MatchType } from '../api/dedup';

interface Props {
	documentId: string;
}

const MATCH_BADGE: Record<MatchType, { label: string; variant: 'destructive' | 'secondary' }> = {
	exact: { label: 'Exact match', variant: 'destructive' },
	content: { label: 'Content match', variant: 'secondary' },
};

function DuplicateItem({
	entry,
	onDismiss,
	dismissing,
}: {
	entry: DuplicateEntry;
	onDismiss: (id: string) => void;
	dismissing: boolean;
}) {
	const badge = MATCH_BADGE[entry.match_type];
	const displayTitle = entry.title ?? entry.document_id.slice(0, 8) + '…';
	const formattedDate = entry.created_at
		? new Date(entry.created_at).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
		  })
		: null;

	return (
		<div className="flex items-start gap-2 py-2">
			<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					className="truncate text-sm font-medium"
					title={entry.document_id}
				>
					{displayTitle}
				</span>
				<div className="flex items-center gap-1.5">
					<Badge variant={badge.variant} className="text-xs">
						{badge.label}
					</Badge>
					{formattedDate && (
						<span className="text-xs text-muted-foreground">{formattedDate}</span>
					)}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-foreground"
					asChild
					aria-label="View document"
				>
					<a href={`/documents/${entry.document_id}`} target="_blank" rel="noreferrer">
						<ExternalLink className="h-3.5 w-3.5" />
					</a>
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-destructive"
					disabled={dismissing}
					onClick={() => onDismiss(entry.document_id)}
					aria-label="Mark as not duplicate"
				>
					{dismissing ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<X className="h-3.5 w-3.5" />
					)}
				</Button>
			</div>
		</div>
	);
}

export function DuplicatesPanel({ documentId }: Props) {
	// Track locally dismissed entries (client-side only — no backend dismiss endpoint yet)
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const [dismissingId, setDismissingId] = useState<string | null>(null);

	const { data: duplicates, isLoading, isError } = useDocumentDuplicates(documentId);

	const visible = (duplicates ?? []).filter((d) => !dismissed.has(d.document_id));
	const count = visible.length;

	const handleDismiss = (id: string) => {
		setDismissingId(id);
		// Simulate brief async feel then remove
		setTimeout(() => {
			setDismissed((prev) => new Set([...prev, id]));
			setDismissingId(null);
		}, 300);
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<h3 className="text-sm font-semibold text-foreground">Potential Duplicates</h3>
				{!isLoading && !isError && (
					<Badge variant={count > 0 ? 'destructive' : 'secondary'} className="text-xs">
						{count}
					</Badge>
				)}
			</div>

			{isLoading && (
				<div className="flex flex-col gap-2">
					{[0, 1].map((i) => (
						<Skeleton key={i} className="h-10 w-full rounded-md" />
					))}
				</div>
			)}

			{isError && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load duplicate check.
				</div>
			)}

			{!isLoading && !isError && count === 0 && (
				<div className="flex flex-col items-center gap-1.5 py-5 text-center">
					<CheckCircle className="h-6 w-6 text-emerald-500" />
					<p className="text-sm text-muted-foreground">No duplicates detected</p>
				</div>
			)}

			{!isLoading &&
				!isError &&
				visible.map((entry: DuplicateEntry) => (
					<DuplicateItem
						key={entry.document_id}
						entry={entry}
						onDismiss={handleDismiss}
						dismissing={dismissingId === entry.document_id}
					/>
				))}
		</div>
	);
}

export default DuplicatesPanel;
