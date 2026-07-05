// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	Hash,
	Plus,
	Pencil,
	Trash2,
	Loader2,
	RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
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
import { Slider } from '@/components/ui/slider';
import {
	useSerialSequences,
	useCreateSequence,
	useUpdateSequence,
	useDeleteSequence,
} from './api';
import type { SerialNumberSequence } from './types';

// ─────────────────────── Preview helper ─────────────────────────

function buildPreview(prefix: string, padding: number, value: number): string {
	const padded = String(value).padStart(padding, '0');
	return prefix ? `${prefix}${padded}` : padded;
}

// ─────────────────────── Sequence Form Dialog ────────────────────

interface SequenceFormDialogProps {
	open: boolean;
	onClose: () => void;
	initial?: SerialNumberSequence | null;
}

function SequenceFormDialog({ open, onClose, initial }: SequenceFormDialogProps) {
	const isEdit = !!initial;
	const [name, setName] = useState(initial?.name ?? '');
	const [prefix, setPrefix] = useState(initial?.prefix ?? '');
	const [padding, setPadding] = useState(initial?.padding ?? 5);
	const [start, setStart] = useState(initial?.current_value ?? 1);
	const [incrementBy, setIncrementBy] = useState(initial?.increment_by ?? 1);

	const createMutation = useCreateSequence();
	const updateMutation = useUpdateSequence();

	const isPending = createMutation.isPending || updateMutation.isPending;
	const error = createMutation.error || updateMutation.error;

	const preview = buildPreview(prefix, padding, isEdit ? initial!.current_value : start);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (isEdit && initial) {
			await updateMutation.mutateAsync({
				id: initial.id,
				payload: { name, prefix, padding, increment_by: incrementBy },
			});
		} else {
			await createMutation.mutateAsync({
				name,
				prefix,
				padding,
				start,
				increment_by: incrementBy,
			});
		}
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Sequence' : 'New Sequence'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-1">
						<Label htmlFor="seq-name">
							Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id="seq-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder="e.g. Invoice Numbers"
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="seq-prefix">Prefix</Label>
						<Input
							id="seq-prefix"
							value={prefix}
							onChange={(e) => setPrefix(e.target.value.toUpperCase())}
							placeholder="e.g. INV-"
							maxLength={20}
						/>
					</div>

					<div className="space-y-2">
						<Label>Zero-padding (digits): {padding}</Label>
						<Slider
							min={1}
							max={10}
							step={1}
							value={[padding]}
							onValueChange={([v]) => setPadding(v)}
						/>
					</div>

					{!isEdit && (
						<div className="space-y-1">
							<Label htmlFor="seq-start">Start at</Label>
							<Input
								id="seq-start"
								type="number"
								min={0}
								value={start}
								onChange={(e) => setStart(Number(e.target.value))}
							/>
						</div>
					)}

					<div className="space-y-1">
						<Label htmlFor="seq-increment">Increment by</Label>
						<Input
							id="seq-increment"
							type="number"
							min={1}
							value={incrementBy}
							onChange={(e) => setIncrementBy(Number(e.target.value))}
						/>
					</div>

					{/* Live preview */}
					<div className="rounded-md border bg-muted/40 p-3 flex items-center gap-3">
						<Hash className="h-4 w-4 text-muted-foreground shrink-0" />
						<div>
							<p className="text-xs text-muted-foreground">Preview</p>
							<p className="font-mono font-semibold text-sm">{preview}</p>
						</div>
					</div>

					{error && (
						<div className="rounded-md border border-destructive bg-destructive/10 p-3">
							<p className="text-sm text-destructive">
								{(error as Error)?.message ?? 'Something went wrong.'}
							</p>
						</div>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending || !name.trim()}>
							{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{isEdit ? 'Save changes' : 'Create sequence'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ─────────────────────── Sequence Card ───────────────────────────

interface SequenceCardProps {
	seq: SerialNumberSequence;
	onEdit: (s: SerialNumberSequence) => void;
	onDelete: (s: SerialNumberSequence) => void;
}

function SequenceCard({ seq, onEdit, onDelete }: SequenceCardProps) {
	const preview = seq.preview ?? buildPreview(seq.prefix, seq.padding, seq.current_value);

	return (
		<Card className="flex flex-col hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<Hash className="h-5 w-5 text-primary shrink-0" />
						<CardTitle className="text-base truncate">{seq.name}</CardTitle>
					</div>
					<Badge variant="secondary" className="font-mono text-xs shrink-0">
						{preview}
					</Badge>
				</div>
				<CardDescription className="text-xs mt-1">
					Prefix: <span className="font-mono">{seq.prefix || '(none)'}</span>
					{' · '}
					Padding: {seq.padding}
					{' · '}
					Step: {seq.increment_by}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 flex-1">
				<div className="text-xs text-muted-foreground">
					Current value:{' '}
					<span className="font-mono font-medium">{seq.current_value}</span>
				</div>
				<div className="flex items-center gap-2 mt-auto pt-2">
					<Button size="icon" variant="outline" onClick={() => onEdit(seq)} title="Edit sequence">
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={() => onDelete(seq)}
						title="Delete sequence"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ─────────────────────── Skeleton Cards ──────────────────────────

function SequenceSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-5 rounded" />
					<Skeleton className="h-5 w-32" />
				</div>
				<Skeleton className="h-4 w-48 mt-1" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-4 w-24" />
				<div className="flex gap-2 mt-4">
					<Skeleton className="h-8 w-8" />
					<Skeleton className="h-8 w-8" />
				</div>
			</CardContent>
		</Card>
	);
}

// ─────────────────────── Main Page ───────────────────────────────

export function SerialNumbersPage() {
	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<SerialNumberSequence | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<SerialNumberSequence | null>(null);

	const { data: sequences, isLoading, isError, refetch } = useSerialSequences();
	const deleteMutation = useDeleteSequence();

	function openCreate() {
		setEditTarget(null);
		setFormOpen(true);
	}

	function openEdit(seq: SerialNumberSequence) {
		setEditTarget(seq);
		setFormOpen(true);
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		await deleteMutation.mutateAsync(deleteTarget.id);
		setDeleteTarget(null);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Serial Numbers</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Define sequences to auto-assign formatted identifiers to documents.
					</p>
				</div>
				<Button onClick={openCreate}>
					<Plus className="h-4 w-4 mr-2" />
					New Sequence
				</Button>
			</div>

			{/* Error state */}
			{isError && (
				<div className="rounded-md border border-destructive bg-destructive/10 p-4 flex items-center justify-between">
					<p className="text-sm text-destructive">Failed to load sequences.</p>
					<Button variant="ghost" size="sm" onClick={() => refetch()}>
						<RefreshCw className="h-4 w-4 mr-2" />
						Retry
					</Button>
				</div>
			)}

			{/* Sequences grid */}
			<section className="space-y-3">
				<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
					Sequences
				</h2>

				{isLoading && (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<SequenceSkeleton key={i} />
						))}
					</div>
				)}

				{!isLoading && !isError && (!sequences || sequences.length === 0) && (
					<div className="flex flex-col items-center justify-center h-52 text-center gap-3 rounded-lg border border-dashed">
						<Hash className="h-12 w-12 text-muted-foreground/40" />
						<p className="text-muted-foreground">No sequences yet.</p>
						<Button variant="outline" onClick={openCreate}>
							<Plus className="h-4 w-4 mr-2" />
							Create your first sequence
						</Button>
					</div>
				)}

				{!isLoading && sequences && sequences.length > 0 && (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{sequences.map((seq) => (
							<SequenceCard
								key={seq.id}
								seq={seq}
								onEdit={openEdit}
								onDelete={setDeleteTarget}
							/>
						))}
					</div>
				)}
			</section>

			{/* Sequence form dialog */}
			<SequenceFormDialog
				open={formOpen}
				onClose={() => {
					setFormOpen(false);
					setEditTarget(null);
				}}
				initial={editTarget}
			/>

			{/* Delete confirmation */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete sequence?</AlertDialogTitle>
						<AlertDialogDescription>
							&ldquo;{deleteTarget?.name}&rdquo; will be deleted. Documents that have already been
							assigned serials from this sequence will keep their values.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								'Delete'
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
