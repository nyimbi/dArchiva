// (c) Copyright Datacraft, 2026
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSearchDocuments } from '@/features/search/api';
import { ShareDialog } from '@/features/shared-nodes/components/ShareDialog';
import { SharedNodesList } from '@/features/shared-nodes/components/SharedNodesList';
import type { SharedNode } from '@/features/shared-nodes/types';
import { FileText, Loader2, Search, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Inline debounce (avoids importing from SearchPage internals)
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, ms: number): T {
	const [v, setV] = useState<T>(value);
	useEffect(() => {
		const id = setTimeout(() => setV(value), ms);
		return () => clearTimeout(id);
	}, [value, ms]);
	return v;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PickedDoc {
	id: string;
	title: string;
	ctype: 'document' | 'folder';
}

// ---------------------------------------------------------------------------
// Document picker dialog — search → select → hand off to ShareDialog
// ---------------------------------------------------------------------------

interface DocumentPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (doc: PickedDoc) => void;
}

function DocumentPickerDialog({ open, onOpenChange, onSelect }: DocumentPickerDialogProps) {
	const [query, setQuery] = useState('');
	const debouncedQuery = useDebounce(query, 300);

	// Always fetch; with empty query the API returns recent/top docs
	const { data, isLoading } = useSearchDocuments(
		debouncedQuery,
		{},
		1,
		15,
		'date_desc',
	);
	const items = data?.items ?? [];

	function handleClose(open: boolean) {
		onOpenChange(open);
		if (!open) setQuery('');
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Share2 className="h-5 w-5" />
						Share a Document
					</DialogTitle>
					<DialogDescription>
						Search for a document or folder, then configure who to share it with.
					</DialogDescription>
				</DialogHeader>

				{/* Search field */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<Input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search documents…"
						className="pl-9"
					/>
				</div>

				{/* Results */}
				<div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 -mx-1 px-1">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
						</div>
					) : items.length === 0 ? (
						<p className="py-8 text-center text-sm text-muted-foreground">
							{debouncedQuery ? 'No documents found' : 'Start typing to search'}
						</p>
					) : (
						items.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() =>
									onSelect({ id: item.id, title: item.title, ctype: 'document' })
								}
								className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors"
							>
								<FileText className="h-4 w-4 text-muted-foreground shrink-0" />
								<span className="flex-1 text-sm truncate">{item.title}</span>
							</button>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SharedDocuments() {
	const [editingShare, setEditingShare] = useState<SharedNode | null>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [newShareDoc, setNewShareDoc] = useState<PickedDoc | null>(null);

	function handleDocSelected(doc: PickedDoc) {
		setPickerOpen(false);
		setNewShareDoc(doc);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Shared Documents
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage documents shared with you and by you
					</p>
				</div>
				<Button onClick={() => setPickerOpen(true)} className="gap-2">
					<Share2 className="h-4 w-4" />
					Share Document
				</Button>
			</div>

			{/* Main list (tabs: Shared by Me / Shared with Me) */}
			<div className="glass-card p-6">
				<SharedNodesList onEditShare={setEditingShare} />
			</div>

			{/* Step 1: pick which document to share */}
			<DocumentPickerDialog
				open={pickerOpen}
				onOpenChange={(open) => {
					setPickerOpen(open);
					if (!open) setNewShareDoc(null);
				}}
				onSelect={handleDocSelected}
			/>

			{/* Step 2: configure sharing for the picked document */}
			{newShareDoc && (
				<ShareDialog
					nodeId={newShareDoc.id}
					nodeTitle={newShareDoc.title}
					nodeType={newShareDoc.ctype}
					open={!!newShareDoc}
					onOpenChange={(open) => !open && setNewShareDoc(null)}
				/>
			)}

			{/* Edit permissions on an existing share */}
			{editingShare && (
				<ShareDialog
					nodeId={editingShare.node_id}
					nodeTitle={editingShare.node_title}
					nodeType={editingShare.node_type}
					open={!!editingShare}
					onOpenChange={(open) => !open && setEditingShare(null)}
				/>
			)}
		</div>
	);
}

export default SharedDocuments;
