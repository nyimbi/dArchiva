// (c) Copyright Datacraft, 2026
/**
 * ClassificationPanel — shows current document classification and lets users
 * submit corrections that feed back into model improvement.
 *
 * Props:
 *   documentId  — UUID of the document
 *   documentType — optional current type from the parent (avoids double-fetch)
 *   predictedConfidence — optional 0-1 confidence from the classifier
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, ChevronDown, Clock, Tag } from 'lucide-react';
import { useState } from 'react';
import {
	useDocumentClassificationFeedback,
	useDocumentTypes,
	useSubmitClassificationFeedback,
} from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelative(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

function ConfidenceBar({ value }: { value: number }) {
	const pct = Math.round(value * 100);
	const color =
		pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
	return (
		<div className="flex items-center gap-2 mt-1">
			<div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
				<div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
			</div>
			<span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassificationPanelProps {
	documentId: string;
	documentType?: { id: string; name: string } | null;
	predictedConfidence?: number | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassificationPanel({
	documentId,
	documentType,
	predictedConfidence,
}: ClassificationPanelProps) {
	const { toast } = useToast();
	const [selectedType, setSelectedType] = useState<string>('');
	const [submitted, setSubmitted] = useState<string | null>(null);
	const [historyOpen, setHistoryOpen] = useState(false);

	const { data: docTypes, isLoading: typesLoading } = useDocumentTypes();
	const { data: history, isLoading: historyLoading } =
		useDocumentClassificationFeedback(documentId);
	const submitMutation = useSubmitClassificationFeedback(documentId);

	const typeList = docTypes?.items ?? (docTypes as { id: string; name: string }[] | undefined) ?? [];

	async function handleSubmit() {
		if (!selectedType) return;
		try {
			await submitMutation.mutateAsync({
				corrected_type: selectedType,
				predicted_type: documentType?.name ?? undefined,
				predicted_confidence: predictedConfidence ?? undefined,
			});
			setSubmitted(selectedType);
			setSelectedType('');
			toast({ title: `Classification updated to "${selectedType}"` });
		} catch {
			toast({
				title: 'Failed to submit correction',
				variant: 'destructive',
			});
		}
	}

	return (
		<div className="space-y-4 p-1">
			{/* Current classification */}
			<div>
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
					Current Classification
				</p>
				{documentType ? (
					<div>
						<Badge
							variant="secondary"
							className="flex items-center gap-1.5 w-fit text-sm px-2.5 py-1"
						>
							<Tag className="h-3.5 w-3.5" />
							{documentType.name}
						</Badge>
						{predictedConfidence != null && (
							<ConfidenceBar value={predictedConfidence} />
						)}
					</div>
				) : (
					<Badge variant="outline" className="text-muted-foreground">
						Unclassified
					</Badge>
				)}
			</div>

			{/* Success flash */}
			{submitted && (
				<div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
					<CheckCircle2 className="h-4 w-4 flex-shrink-0" />
					Classification updated to <strong>{submitted}</strong>
				</div>
			)}

			{/* Correction form */}
			<div>
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
					Correct Classification
				</p>
				<p className="text-xs text-muted-foreground mb-2">
					This looks like:
				</p>
				{typesLoading ? (
					<Skeleton className="h-9 w-full" />
				) : (
					<Select value={selectedType} onValueChange={setSelectedType}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select document type…" />
						</SelectTrigger>
						<SelectContent>
							{typeList.map((t: { id: string; name: string }) => (
								<SelectItem key={t.id} value={t.name}>
									{t.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<Button
					className="w-full mt-2"
					size="sm"
					disabled={!selectedType || submitMutation.isPending}
					onClick={handleSubmit}
				>
					{submitMutation.isPending ? 'Submitting…' : 'Submit Correction'}
				</Button>
			</div>

			{/* Correction history */}
			<div>
				<button
					className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
					onClick={() => setHistoryOpen((v) => !v)}
				>
					<Clock className="h-3.5 w-3.5" />
					Correction History
					<ChevronDown
						className={`h-3.5 w-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
					/>
				</button>

				{historyOpen && (
					<div className="mt-2 space-y-2">
						{historyLoading && (
							<>
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</>
						)}
						{!historyLoading && (!history || history.length === 0) && (
							<p className="text-xs text-muted-foreground py-2">
								No corrections recorded yet.
							</p>
						)}
						{history?.map((record) => (
							<div
								key={record.id}
								className="rounded-md border bg-muted/30 px-3 py-2 text-xs"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium">{record.corrected_type}</span>
									<span className="text-muted-foreground tabular-nums">
										{formatRelative(record.created_at)}
									</span>
								</div>
								{record.predicted_type && (
									<p className="text-muted-foreground mt-0.5">
										was: {record.predicted_type}
										{record.predicted_confidence != null && (
											<span className="ml-1">
												({Math.round(record.predicted_confidence * 100)}%)
											</span>
										)}
									</p>
								)}
								<p className="text-muted-foreground mt-0.5 truncate">
									by {record.feedback_by_id}
								</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
