// (c) Copyright Datacraft, 2026
import { toast } from 'sonner';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn, formatDateTime } from '@/lib/utils';
import { AlertCircle, Edit2, GitMerge, Loader2, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCreateTag, useDeleteTag, useMergeTags, useTags, useUpdateTag } from './api';
import type { Tag } from './types';

const PRESET_COLORS = [
	{ name: 'Red', value: '#ef4444' },
	{ name: 'Blue', value: '#3b82f6' },
	{ name: 'Green', value: '#22c55e' },
	{ name: 'Yellow', value: '#eab308' },
	{ name: 'Purple', value: '#8b5cf6' },
	{ name: 'Orange', value: '#f97316' },
];

interface TagDialogState {
	mode: 'create' | 'edit';
	tag?: Tag;
}

function TagFormDialog({
	state,
	onClose,
}: {
	state: TagDialogState | null;
	onClose: () => void;
}) {
	const createTag = useCreateTag();
	const updateTag = useUpdateTag();
	const [name, setName] = useState(state?.tag?.name ?? '');
	const [color, setColor] = useState(state?.tag?.color ?? PRESET_COLORS[1].value);

	const isOpen = Boolean(state);
	const isEdit = state?.mode === 'edit';
	const isPending = createTag.isPending || updateTag.isPending;

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) return;

		try {
			if (isEdit && state?.tag) {
				await updateTag.mutateAsync({
					tagId: state.tag.id,
					data: { name: trimmedName, color },
				});
				toast.success('Tag updated');
			} else {
				await createTag.mutateAsync({ name: trimmedName, color });
				toast.success('Tag created');
			}
			onClose();
		} catch {
			toast.error('Tag save failed');
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Rename the tag or change its color.' : 'Create a tag for organizing documents.'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="tag-name">Name</Label>
						<Input
							id="tag-name"
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Tag name"
						/>
					</div>

					<div className="space-y-2">
						<Label>Color</Label>
						<div className="grid grid-cols-6 gap-2">
							{PRESET_COLORS.map((preset) => (
								<button
									key={preset.value}
									type="button"
									aria-label={preset.name}
									title={preset.name}
									onClick={() => setColor(preset.value)}
									className={cn(
										'h-9 rounded-md border-2 transition',
										color === preset.value ? 'border-slate-100 ring-2 ring-brass-500' : 'border-slate-700',
									)}
									style={{ backgroundColor: preset.value }}
								/>
							))}
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isEdit ? 'Save Changes' : 'Create Tag'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function MergeTagsPanel({ tags }: { tags: Tag[] }) {
	const mergeTags = useMergeTags();
	const [sourceTagId, setSourceTagId] = useState('');
	const [targetTagId, setTargetTagId] = useState('');

	const canMerge = sourceTagId && targetTagId && sourceTagId !== targetTagId;

	const handleMerge = async () => {
		if (!canMerge) return;
		try {
			await mergeTags.mutateAsync({ sourceTagId, targetTagId });
			toast.success('Tags merged');
			setSourceTagId('');
			setTargetTagId('');
		} catch {
			toast.error('Merge failed');
		}
	};

	return (
		<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
			<div className="mb-4 flex items-center gap-2">
				<GitMerge className="h-4 w-4 text-brass-400" />
				<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Merge Tags</h2>
			</div>
			<div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
				<Select value={sourceTagId} onValueChange={setSourceTagId}>
					<SelectTrigger>
						<SelectValue placeholder="Source tag" />
					</SelectTrigger>
					<SelectContent>
						{tags.map((tag) => (
							<SelectItem key={tag.id} value={tag.id}>
								{tag.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={targetTagId} onValueChange={setTargetTagId}>
					<SelectTrigger>
						<SelectValue placeholder="Merge into" />
					</SelectTrigger>
					<SelectContent>
						{tags.map((tag) => (
							<SelectItem key={tag.id} value={tag.id} disabled={tag.id === sourceTagId}>
								{tag.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button onClick={handleMerge} disabled={!canMerge || mergeTags.isPending}>
					{mergeTags.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Merge
				</Button>
			</div>
		</div>
	);
}

export function TagManagementPage() {
	const { data, isLoading, isError } = useTags();
	const deleteTag = useDeleteTag();
	const [dialogState, setDialogState] = useState<TagDialogState | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

	const tags = data?.items ?? [];
	const totalTaggedDocuments = tags.reduce((sum, tag) => sum + tag.documentCount, 0);
	const mostUsedTag = useMemo(
		() => tags.reduce<Tag | null>((best, tag) => (!best || tag.documentCount > best.documentCount ? tag : best), null),
		[tags],
	);
	const documentsWithoutTags = Math.max(0, (data?.total ?? tags.length) - totalTaggedDocuments);

	const handleDelete = async () => {
		if (!deleteTarget) return;
		try {
			await deleteTag.mutateAsync(deleteTarget.id);
			toast.success('Tag deleted');
			setDeleteTarget(null);
		} catch {
			toast.error('Delete failed');
		}
	};

	return (
		<div className="mx-auto max-w-7xl space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Tag Management</h1>
					<p className="mt-1 text-sm text-slate-500">Create, merge, and maintain document tags.</p>
				</div>
				<Button onClick={() => setDialogState({ mode: 'create' })}>
					<Plus className="mr-2 h-4 w-4" />
					Create Tag
				</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
					<p className="text-sm text-slate-500">Total Tags</p>
					<p className="mt-2 text-2xl font-semibold text-slate-100">{tags.length}</p>
				</div>
				<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
					<p className="text-sm text-slate-500">Most Used Tag</p>
					<p className="mt-2 truncate text-2xl font-semibold text-slate-100">
						{mostUsedTag ? mostUsedTag.name : 'None'}
					</p>
					{mostUsedTag && <p className="mt-1 text-xs text-slate-500">{mostUsedTag.documentCount} documents</p>}
				</div>
				<div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
					<p className="text-sm text-slate-500">Documents Without Tags</p>
					<p className="mt-2 text-2xl font-semibold text-slate-100">{documentsWithoutTags}</p>
				</div>
			</div>

			<MergeTagsPanel tags={tags} />

			<div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Tag Name</TableHead>
							<TableHead>Color</TableHead>
							<TableHead>Document Count</TableHead>
							<TableHead>Created At</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={5} className="py-10 text-center text-slate-500">
									<Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
									Loading tags
								</TableCell>
							</TableRow>
						) : isError ? (
							<TableRow>
								<TableCell colSpan={5} className="py-10 text-center">
									<div className="flex items-center justify-center gap-2 text-red-400 text-sm">
										<AlertCircle className="h-4 w-4" />
										Failed to load tags. Try refreshing.
									</div>
								</TableCell>
							</TableRow>
						) : tags.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="py-10 text-center text-slate-500">
									<TagIcon className="mx-auto mb-2 h-6 w-6 opacity-60" />
									No tags yet
								</TableCell>
							</TableRow>
						) : (
							tags.map((tag) => (
								<TableRow key={tag.id}>
									<TableCell className="font-medium text-slate-100">{tag.name}</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span
												className="h-4 w-4 rounded-full border border-slate-700"
												style={{ backgroundColor: tag.color || '#64748b' }}
											/>
											<span className="text-xs text-slate-500">{tag.color || '#64748b'}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="secondary">{tag.documentCount}</Badge>
									</TableCell>
									<TableCell className="text-slate-400">{formatDateTime(tag.createdAt)}</TableCell>
									<TableCell>
										<div className="flex justify-end gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => setDialogState({ mode: 'edit', tag })}
											>
												<Edit2 className="mr-2 h-3.5 w-3.5" />
												Edit
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="border-red-500/40 text-red-400 hover:bg-red-500/10"
												onClick={() => setDeleteTarget(tag)}
											>
												<Trash2 className="mr-2 h-3.5 w-3.5" />
												Delete
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<TagFormDialog state={dialogState} onClose={() => setDialogState(null)} />

			<AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Tag?</AlertDialogTitle>
						<AlertDialogDescription>
							Delete <strong>{deleteTarget?.name}</strong>? {deleteTarget?.documentCount ?? 0} document
							{deleteTarget?.documentCount === 1 ? '' : 's'} will lose this tag.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteTag.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
