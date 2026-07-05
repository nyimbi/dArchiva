// (c) Copyright Datacraft, 2026
/**
 * FilingSuggestionsPanel — smart folder and tag recommendations.
 *
 * Props:
 *   documentId — UUID of the document to suggest filing for
 *
 * Fetches GET /documents/{documentId}/filing-suggestions and renders:
 *   - Suggested folder cards with confidence bar and "Move Here" button
 *   - Suggested tag chips with "Add Tags" button
 *   - "Apply All" button (top folder + all suggested tags)
 *
 * Empty state shown when document has no document_type assigned yet.
 */
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Lightbulb, RefreshCw, Tag } from 'lucide-react';
import {
	useFilingSuggestions,
	useApplyFilingSuggestion,
} from '../api/filingSuggestions';
import type { SuggestedFolder, SuggestedTag } from '../api/filingSuggestions';

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
	const pct = Math.round(value * 100);
	const barClass =
		pct >= 70
			? 'bg-green-500'
			: pct >= 40
				? 'bg-amber-500'
				: 'bg-muted-foreground/40';

	return (
		<div className="flex items-center gap-2 mt-1">
			<div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
				<div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
			</div>
			<span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
				{pct}%
			</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// FolderCard
// ---------------------------------------------------------------------------

interface FolderCardProps {
	folder: SuggestedFolder;
	onMove: () => void;
	isPending: boolean;
}

function FolderCard({ folder, onMove, isPending }: FolderCardProps) {
	return (
		<div className="flex flex-col gap-1 px-3 py-2 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors">
			<div className="flex items-center gap-2 min-w-0">
				<FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
				<span className="text-sm font-medium truncate flex-1" title={folder.folder_path}>
					{folder.folder_path}
				</span>
				<Button
					size="sm"
					variant="outline"
					className="h-6 text-xs shrink-0"
					onClick={onMove}
					disabled={isPending}
				>
					{isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
					Move Here
				</Button>
			</div>
			<div className="flex items-center gap-1 pl-6">
				<span className="text-[11px] text-muted-foreground">
					{folder.document_count} {folder.document_count === 1 ? 'document' : 'documents'}
				</span>
			</div>
			<div className="pl-6">
				<ConfidenceBar value={folder.confidence} />
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// TagChip
// ---------------------------------------------------------------------------

function TagChip({ tag }: { tag: SuggestedTag }) {
	return (
		<Badge
			className="text-xs border-0 font-medium"
			style={{
				backgroundColor: tag.tag_color ?? '#c41fff',
				color: '#fff',
			}}
			title={`${Math.round(tag.confidence * 100)}% of similar documents — ${tag.document_count} docs`}
		>
			{tag.tag_name}
		</Badge>
	);
}

// ---------------------------------------------------------------------------
// FilingSuggestionsPanel
// ---------------------------------------------------------------------------

interface FilingSuggestionsPanelProps {
	documentId: string;
}

export function FilingSuggestionsPanel({ documentId }: FilingSuggestionsPanelProps) {
	const { data, isLoading, isError, refetch } = useFilingSuggestions(documentId);
	const apply = useApplyFilingSuggestion(documentId);

	const folders = data?.suggested_folders ?? [];
	const tags = data?.suggested_tags ?? [];
	const peerCount = data?.peer_count ?? 0;
	const basedOnType = data?.based_on_type ?? null;
	const hasSuggestions = folders.length > 0 || tags.length > 0;

	async function handleMoveToFolder(folderId: string) {
		try {
			await apply.mutateAsync({ folder_id: folderId });
			toast.success('Document moved', { duration: 2500 });
		} catch {
			toast.error('Move failed');
		}
	}

	async function handleAddTags(tagIds: string[]) {
		try {
			const res = await apply.mutateAsync({ tag_ids: tagIds });
			toast.success(`${res.tags_added} tag${res.tags_added !== 1 ? 's' : ''} added`, { duration: 2500 });
		} catch {
			toast.error('Tag update failed');
		}
	}

	async function handleApplyAll() {
		const folderId = folders[0]?.folder_id;
		const tagIds = tags.map((t) => t.tag_id);
		if (!folderId && tagIds.length === 0) return;
		try {
			const res = await apply.mutateAsync({
				...(folderId ? { folder_id: folderId } : {}),
				...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
			});
			const parts: string[] = [];
			if (res.moved) parts.push('moved to folder');
			if (res.tags_added > 0) parts.push(`${res.tags_added} tag${res.tags_added !== 1 ? 's' : ''} added`);
			toast.success(parts.join(', ') || 'Applied', { duration: 2500 });
		} catch {
			toast.error('Apply failed');
		}
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Lightbulb className="h-4 w-4 text-amber-500" />
					<span className="text-sm font-semibold">Smart Filing Suggestions</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={() => refetch()}
						title="Refresh suggestions"
						disabled={isLoading}
					>
						<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
					</Button>
					{hasSuggestions && (
						<Button
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={handleApplyAll}
							disabled={apply.isPending}
						>
							{apply.isPending ? (
								<RefreshCw className="h-3 w-3 mr-1 animate-spin" />
							) : null}
							Apply All
						</Button>
					)}
				</div>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto">
				{isLoading && (
					<div className="space-y-3 p-4">
						<Skeleton className="h-16 w-full rounded-md" />
						<Skeleton className="h-16 w-full rounded-md" />
						<div className="flex gap-2 pt-1">
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="h-6 w-16 rounded-full" />
							<Skeleton className="h-6 w-24 rounded-full" />
						</div>
					</div>
				)}

				{isError && (
					<p className="text-sm text-destructive p-4">
						Failed to load filing suggestions.
					</p>
				)}

				{!isLoading && !isError && !hasSuggestions && (
					<div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
						<Lightbulb className="h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">
							No suggestions available yet.
						</p>
						<p className="text-xs text-muted-foreground/70 max-w-[220px]">
							Suggestions improve as more documents are classified. Assign a document
							type to enable recommendations.
						</p>
					</div>
				)}

				{!isLoading && !isError && hasSuggestions && (
					<div className="flex flex-col gap-4 p-4">
						{/* Based-on badge */}
						{basedOnType && (
							<p className="text-xs text-muted-foreground">
								Based on{' '}
								<span className="font-medium text-foreground">
									{peerCount} similar {basedOnType}{' '}
									{peerCount === 1 ? 'document' : 'documents'}
								</span>
							</p>
						)}

						{/* Suggested folders */}
						{folders.length > 0 && (
							<div className="space-y-2">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									Suggested Folder
								</p>
								{folders.map((folder) => (
									<FolderCard
										key={folder.folder_id}
										folder={folder}
										onMove={() => handleMoveToFolder(folder.folder_id)}
										isPending={apply.isPending}
									/>
								))}
							</div>
						)}

						{/* Suggested tags */}
						{tags.length > 0 && (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										Suggested Tags
									</p>
									<Button
										size="sm"
										variant="outline"
										className="h-6 text-xs"
										onClick={() => handleAddTags(tags.map((t) => t.tag_id))}
										disabled={apply.isPending}
									>
										<Tag className="h-3 w-3 mr-1" />
										Add Tags
									</Button>
								</div>
								<div className="flex flex-wrap gap-1.5">
									{tags.map((tag) => (
										<TagChip key={tag.tag_id} tag={tag} />
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
