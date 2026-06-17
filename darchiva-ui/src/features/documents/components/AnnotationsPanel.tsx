// (c) Copyright Datacraft, 2026
/**
 * AnnotationsPanel — lists document annotations grouped by page.
 * Intended to be embedded in a DocumentDetail sidebar panel.
 */
import { useState } from 'react';
import {
	Highlighter,
	StickyNote,
	Square,
	Underline,
	Trash2,
	Loader2,
	AlertCircle,
	MessageSquare,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import {
	useDocumentAnnotations,
	useDeleteAnnotation,
	type AnnotationType,
	type DocumentAnnotation,
} from '../api/annotations';

interface Props {
	documentId: string;
	onJumpToPage?: (page: number) => void;
}

// ── type metadata ────────────────────────────────────────────────────────────

const TYPE_META: Record<
	AnnotationType,
	{ label: string; badgeClass: string; Icon: React.ElementType }
> = {
	highlight: {
		label: 'Highlight',
		badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
		Icon: Highlighter,
	},
	note: {
		label: 'Note',
		badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
		Icon: StickyNote,
	},
	rect: {
		label: 'Rectangle',
		badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
		Icon: Square,
	},
	underline: {
		label: 'Underline',
		badgeClass: 'bg-green-100 text-green-800 border-green-300',
		Icon: Underline,
	},
};

// ── sub-components ───────────────────────────────────────────────────────────

function AnnotationItem({
	annotation,
	onDelete,
	deleting,
	onClick,
}: {
	annotation: DocumentAnnotation;
	onDelete: (id: string) => void;
	deleting: boolean;
	onClick: () => void;
}) {
	const meta = TYPE_META[annotation.annotation_type as AnnotationType] ?? TYPE_META.note;
	const { Icon } = meta;

	return (
		<div
			className="group flex cursor-pointer items-start gap-2 rounded-md px-1 py-2 hover:bg-muted/50"
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
		>
			{/* colour swatch */}
			<span
				className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border"
				style={{ backgroundColor: annotation.color }}
				aria-hidden
			/>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center gap-1.5">
					<Badge
						variant="outline"
						className={`gap-1 px-1.5 py-0 text-xs font-medium ${meta.badgeClass}`}
					>
						<Icon className="h-3 w-3" />
						{meta.label}
					</Badge>
					<span className="text-xs text-muted-foreground">p.{annotation.page_number}</span>
				</div>

				{annotation.content && (
					<p className="line-clamp-2 text-sm text-foreground">{annotation.content}</p>
				)}

				{!annotation.content && (
					<p className="text-xs italic text-muted-foreground">No note text</p>
				)}
			</div>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
				disabled={deleting}
				onClick={(e) => {
					e.stopPropagation();
					onDelete(annotation.id);
				}}
				aria-label="Delete annotation"
			>
				{deleting ? (
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
				) : (
					<Trash2 className="h-3.5 w-3.5" />
				)}
			</Button>
		</div>
	);
}

// ── main component ───────────────────────────────────────────────────────────

export function AnnotationsPanel({ documentId, onJumpToPage }: Props) {
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const { data: annotations, isLoading, isError } = useDocumentAnnotations(documentId);
	const deleteAnnotation = useDeleteAnnotation(documentId);

	const handleDelete = async (annotationId: string) => {
		setDeletingId(annotationId);
		try {
			await deleteAnnotation.mutateAsync(annotationId);
		} finally {
			setDeletingId(null);
		}
	};

	// Group by page number, sorted ascending
	const byPage = (annotations ?? []).reduce<Record<number, DocumentAnnotation[]>>(
		(acc, ann) => {
			const pg = ann.page_number;
			if (!acc[pg]) acc[pg] = [];
			acc[pg].push(ann);
			return acc;
		},
		{},
	);
	const sortedPages = Object.keys(byPage)
		.map(Number)
		.sort((a, b) => a - b);

	const total = annotations?.length ?? 0;

	return (
		<div className="flex flex-col gap-3">
			{/* header */}
			<div className="flex items-center justify-between">
				<h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
					<MessageSquare className="h-4 w-4" />
					Annotations
					{total > 0 && (
						<Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
							{total}
						</Badge>
					)}
				</h3>
			</div>

			{/* loading skeletons */}
			{isLoading && (
				<div className="flex flex-col gap-2">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-12 w-full rounded-md" />
					))}
				</div>
			)}

			{/* error */}
			{isError && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load annotations.
				</div>
			)}

			{/* empty state */}
			{!isLoading && !isError && total === 0 && (
				<p className="py-6 text-center text-sm text-muted-foreground">
					No annotations yet. Select text or draw on a page to annotate.
				</p>
			)}

			{/* grouped by page */}
			{!isLoading &&
				sortedPages.map((page, idx) => (
					<div key={page}>
						{idx > 0 && <Separator className="my-1" />}
						<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Page {page}
						</p>
						{byPage[page].map((ann) => (
							<AnnotationItem
								key={ann.id}
								annotation={ann}
								onDelete={handleDelete}
								deleting={deletingId === ann.id}
								onClick={() => onJumpToPage?.(ann.page_number)}
							/>
						))}
					</div>
				))}
		</div>
	);
}

export default AnnotationsPanel;
