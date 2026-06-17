// (c) Copyright Datacraft, 2026
/**
 * RelatedDocumentsPanel — shows and manages document relationships.
 * Intended to be embedded in a DocumentDetail sidebar panel.
 */
import { useState } from 'react';
import { FileText, Link2, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import {
	useDocumentRelationships,
	useCreateRelationship,
	useDeleteRelationship,
	RELATIONSHIP_LABELS,
	type DocumentRelationship,
	type RelationshipType,
} from '../api/relationships';

interface Props {
	documentId: string;
}

// Badge colour per relationship type
const TYPE_VARIANT: Record<RelationshipType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
	related: 'secondary',
	supersedes: 'default',
	amendment_of: 'outline',
	attachment_to: 'secondary',
	version_of: 'outline',
};

function RelationshipItem({
	rel,
	currentDocumentId,
	onDelete,
	deleting,
}: {
	rel: DocumentRelationship;
	currentDocumentId: string;
	onDelete: (id: string) => void;
	deleting: boolean;
}) {
	const isSource = rel.source_document_id === currentDocumentId;
	const otherTitle = isSource ? rel.target_title : rel.source_title;
	const otherId = isSource ? rel.target_document_id : rel.source_document_id;
	const directionLabel = isSource ? '' : '(incoming)';

	return (
		<div className="flex items-start gap-2 py-2">
			<FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-sm font-medium" title={otherId}>
					{otherTitle ?? otherId.slice(0, 8) + '…'}
				</span>
				<div className="flex items-center gap-1.5">
					<Badge variant={TYPE_VARIANT[rel.relationship_type]} className="text-xs">
						{RELATIONSHIP_LABELS[rel.relationship_type]}
					</Badge>
					{directionLabel && (
						<span className="text-xs text-muted-foreground">{directionLabel}</span>
					)}
				</div>
				{rel.note && (
					<p className="text-xs text-muted-foreground line-clamp-2">{rel.note}</p>
				)}
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
				disabled={deleting}
				onClick={() => onDelete(rel.id)}
				aria-label="Remove relationship"
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

function LinkDocumentModal({
	open,
	onClose,
	documentId,
}: {
	open: boolean;
	onClose: () => void;
	documentId: string;
}) {
	const [targetId, setTargetId] = useState('');
	const [relType, setRelType] = useState<RelationshipType>('related');
	const [note, setNote] = useState('');
	const [error, setError] = useState<string | null>(null);

	const create = useCreateRelationship(documentId);

	const handleSubmit = async () => {
		setError(null);
		const trimmed = targetId.trim();
		if (!trimmed) {
			setError('Target document ID is required.');
			return;
		}
		try {
			await create.mutateAsync({
				target_document_id: trimmed,
				relationship_type: relType,
				note: note.trim() || undefined,
			});
			setTargetId('');
			setNote('');
			setRelType('related');
			onClose();
		} catch (e: unknown) {
			const msg =
				(e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
				'Failed to create relationship.';
			setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-4 w-4" />
						Link Document
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-col gap-4 py-2">
					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor="target-doc-id">
							Target Document ID
						</label>
						<Input
							id="target-doc-id"
							placeholder="UUID of the document to link"
							value={targetId}
							onChange={(e) => setTargetId(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Paste the UUID of the document you want to link to.
						</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium">Relationship Type</label>
						<Select
							value={relType}
							onValueChange={(v) => setRelType(v as RelationshipType)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.entries(RELATIONSHIP_LABELS) as [RelationshipType, string][]).map(
									([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									),
								)}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5">
						<label className="text-sm font-medium" htmlFor="rel-note">
							Note <span className="font-normal text-muted-foreground">(optional)</span>
						</label>
						<Textarea
							id="rel-note"
							placeholder="Explain why these documents are related…"
							rows={3}
							value={note}
							onChange={(e) => setNote(e.target.value)}
						/>
					</div>

					{error && (
						<div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
							<AlertCircle className="h-4 w-4 shrink-0" />
							{error}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={create.isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={create.isPending}>
						{create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Link
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function RelatedDocumentsPanel({ documentId }: Props) {
	const [modalOpen, setModalOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const { data: relationships, isLoading, isError } = useDocumentRelationships(documentId);
	const deleteRel = useDeleteRelationship(documentId);

	const handleDelete = async (relId: string) => {
		setDeletingId(relId);
		try {
			await deleteRel.mutateAsync(relId);
		} finally {
			setDeletingId(null);
		}
	};

	// Group by relationship type
	const grouped = (relationships ?? []).reduce<Record<string, DocumentRelationship[]>>(
		(acc, rel) => {
			const type = rel.relationship_type;
			if (!acc[type]) acc[type] = [];
			acc[type].push(rel);
			return acc;
		},
		{},
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-foreground">Related Documents</h3>
				<Button
					variant="outline"
					size="sm"
					className="h-7 gap-1 text-xs"
					onClick={() => setModalOpen(true)}
				>
					<Plus className="h-3.5 w-3.5" />
					Link Document
				</Button>
			</div>

			{isLoading && (
				<div className="flex flex-col gap-2">
					{[0, 1, 2].map((i) => (
						<Skeleton key={i} className="h-10 w-full rounded-md" />
					))}
				</div>
			)}

			{isError && (
				<div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load relationships.
				</div>
			)}

			{!isLoading && !isError && (relationships?.length ?? 0) === 0 && (
				<p className="py-4 text-center text-sm text-muted-foreground">
					No linked documents yet.
				</p>
			)}

			{!isLoading &&
				Object.entries(grouped).map(([type, rels], idx) => (
					<div key={type}>
						{idx > 0 && <Separator className="my-1" />}
						<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							{RELATIONSHIP_LABELS[type as RelationshipType]}
						</p>
						{rels.map((rel) => (
							<RelationshipItem
								key={rel.id}
								rel={rel}
								currentDocumentId={documentId}
								onDelete={handleDelete}
								deleting={deletingId === rel.id}
							/>
						))}
					</div>
				))}

			<LinkDocumentModal
				open={modalOpen}
				onClose={() => setModalOpen(false)}
				documentId={documentId}
			/>
		</div>
	);
}

export default RelatedDocumentsPanel;
