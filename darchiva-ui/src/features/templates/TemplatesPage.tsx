// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	FileText,
	Plus,
	Pencil,
	Trash2,
	Loader2,
	X,
	GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	useTemplates,
	useCreateTemplate,
	useUpdateTemplate,
	useDeleteTemplate,
	type DocumentTemplate,
	type FieldDefinition,
	type TemplateCreate,
} from './api';
import { CreateFromTemplateDialog } from './CreateFromTemplateDialog';

// ─────────────────────── Field types ─────────────────────────────

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'checkbox', 'textarea'] as const;
const CATEGORY_SUGGESTIONS = ['general', 'legal', 'finance', 'hr', 'contracts', 'compliance', 'reports'];

// ─────────────────────── Empty field factory ─────────────────────

function emptyField(): FieldDefinition {
	return { name: '', label: '', type: 'text', required: false, default_value: '' };
}

// ─────────────────── Field Definitions Builder ───────────────────

interface FieldBuilderProps {
	fields: FieldDefinition[];
	onChange: (fields: FieldDefinition[]) => void;
}

function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
	function update(index: number, patch: Partial<FieldDefinition>) {
		const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
		onChange(next);
	}

	function remove(index: number) {
		onChange(fields.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-2">
			{fields.map((field, i) => (
				<div key={i} className="flex gap-2 items-start border rounded-md p-2 bg-muted/30">
					<GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
					<div className="flex-1 grid grid-cols-2 gap-2">
						<Input
							placeholder="Field name (no spaces)"
							value={field.name}
							onChange={(e) =>
								update(i, { name: e.target.value.replace(/\s+/g, '_').toLowerCase() })
							}
						/>
						<Input
							placeholder="Label"
							value={field.label}
							onChange={(e) => update(i, { label: e.target.value })}
						/>
						<Select
							value={field.type}
							onValueChange={(v) => update(i, { type: v as FieldDefinition['type'] })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FIELD_TYPES.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							placeholder="Default value"
							value={field.default_value}
							onChange={(e) => update(i, { default_value: e.target.value })}
						/>
						<div className="flex items-center gap-2 col-span-2">
							<Switch
								checked={field.required}
								onCheckedChange={(v) => update(i, { required: v })}
								id={`req-${i}`}
							/>
							<Label htmlFor={`req-${i}`} className="text-sm">
								Required
							</Label>
						</div>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="shrink-0"
						onClick={() => remove(i)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onChange([...fields, emptyField()])}
			>
				<Plus className="h-4 w-4 mr-2" />
				Add field
			</Button>
		</div>
	);
}

// ─────────────────── Template Preview ────────────────────────────

interface TemplatePreviewProps {
	name: string;
	fields: FieldDefinition[];
}

function TemplatePreview({ name, fields }: TemplatePreviewProps) {
	return (
		<div className="border rounded-md p-4 bg-muted/30 h-full space-y-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				Live Preview
			</p>
			<div className="border rounded-md bg-background p-4 space-y-4 min-h-[200px]">
				<h3 className="text-sm font-semibold text-foreground border-b pb-2">
					{name.trim() || 'Untitled Template'}
				</h3>
				{fields.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-8">
						Add fields on the left to see a preview.
					</p>
				) : (
					<div className="space-y-3">
						{fields.map((field, i) => {
							const displayLabel = field.label || field.name || `Field ${i + 1}`;
							return (
								<div key={i} className="space-y-1">
									<label className="text-xs font-medium text-foreground">
										{displayLabel}
										{field.required && (
											<span className="text-destructive ml-1">*</span>
										)}
									</label>
									{field.type === 'checkbox' ? (
										<div className="flex items-center gap-2">
											<input
												type="checkbox"
												disabled
												className="rounded border-input"
											/>
											<span className="text-xs text-muted-foreground">
												{field.default_value || displayLabel}
											</span>
										</div>
									) : field.type === 'textarea' ? (
										<textarea
											disabled
											placeholder={field.default_value || `Enter ${displayLabel}…`}
											className="w-full text-xs border rounded px-2 py-1 bg-muted/40 resize-none h-14 text-muted-foreground"
										/>
									) : field.type === 'select' ? (
										<select
											disabled
											className="w-full text-xs border rounded px-2 py-1 bg-muted/40 text-muted-foreground h-8"
										>
											<option value="">
												{field.default_value || `Select ${displayLabel}…`}
											</option>
										</select>
									) : (
										<input
											type={
												field.type === 'date'
													? 'date'
													: field.type === 'number'
													? 'number'
													: 'text'
											}
											disabled
											placeholder={field.default_value || `Enter ${displayLabel}…`}
											className="w-full text-xs border rounded px-2 py-1 bg-muted/40 text-muted-foreground h-8"
										/>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

// ─────────────────── Template Form Dialog ────────────────────────

interface TemplateFormDialogProps {
	open: boolean;
	onClose: () => void;
	initial?: DocumentTemplate | null;
}

function TemplateFormDialog({ open, onClose, initial }: TemplateFormDialogProps) {
	const isEdit = !!initial;
	const [name, setName] = useState(initial?.name ?? '');
	const [description, setDescription] = useState(initial?.description ?? '');
	const [category, setCategory] = useState(initial?.category ?? 'general');
	const [fields, setFields] = useState<FieldDefinition[]>(
		initial?.field_definitions ?? [],
	);

	const createMutation = useCreateTemplate();
	const updateMutation = useUpdateTemplate();

	const isPending = createMutation.isPending || updateMutation.isPending;
	const error = createMutation.error || updateMutation.error;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload: TemplateCreate = {
			name,
			description,
			category,
			field_definitions: fields,
		};
		if (isEdit && initial) {
			await updateMutation.mutateAsync({ id: initial.id, data: payload });
		} else {
			await createMutation.mutateAsync(payload);
		}
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Template' : 'New Template'}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-6 items-start">
						{/* ── Left: editor ── */}
						<div className="space-y-4">
							<div className="space-y-1">
								<Label htmlFor="tpl-name">
									Name <span className="text-destructive">*</span>
								</Label>
								<Input
									id="tpl-name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									placeholder="Template name"
								/>
							</div>

							<div className="space-y-1">
								<Label htmlFor="tpl-desc">Description</Label>
								<Textarea
									id="tpl-desc"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									rows={2}
									placeholder="Brief description of this template"
								/>
							</div>

							<div className="space-y-1">
								<Label htmlFor="tpl-cat">Category</Label>
								<Input
									id="tpl-cat"
									list="category-suggestions"
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									placeholder="e.g. legal, finance, hr"
								/>
								<datalist id="category-suggestions">
									{CATEGORY_SUGGESTIONS.map((c) => (
										<option key={c} value={c} />
									))}
								</datalist>
							</div>

							<div className="space-y-2">
								<Label>Field definitions</Label>
								<FieldBuilder fields={fields} onChange={setFields} />
							</div>
						</div>

						{/* ── Right: live preview ── */}
						<TemplatePreview name={name} fields={fields} />
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
							{isEdit ? 'Save changes' : 'Create template'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ─────────────────── Template Card ───────────────────────────────

interface TemplateCardProps {
	template: DocumentTemplate;
	onUse: (t: DocumentTemplate) => void;
	onEdit: (t: DocumentTemplate) => void;
	onDelete: (t: DocumentTemplate) => void;
}

function TemplateCard({ template, onUse, onEdit, onDelete }: TemplateCardProps) {
	return (
		<Card className="flex flex-col hover:shadow-md transition-shadow">
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<FileText className="h-5 w-5 text-primary shrink-0" />
						<CardTitle className="text-base truncate">{template.name}</CardTitle>
					</div>
					<Badge variant="secondary" className="shrink-0 text-xs capitalize">
						{template.category}
					</Badge>
				</div>
				{template.description && (
					<CardDescription className="line-clamp-2 mt-1 text-sm">
						{template.description}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="flex flex-col gap-3 flex-1">
				<div className="text-xs text-muted-foreground space-y-1">
					<span>
						{template.field_definitions.length} field
						{template.field_definitions.length !== 1 ? 's' : ''}
					</span>
					{' · '}
					<span>Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}</span>
				</div>
				<div className="flex items-center gap-2 mt-auto pt-2">
					<Button size="sm" className="flex-1" onClick={() => onUse(template)}>
						Use Template
					</Button>
					<Button size="icon" variant="outline" onClick={() => onEdit(template)}>
						<Pencil className="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={() => onDelete(template)}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

// ─────────────────── Main Page ────────────────────────────────────

export function TemplatesPage() {
	const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
	const [page] = useState(1);

	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<DocumentTemplate | null>(null);
	const [useTarget, setUseTarget] = useState<DocumentTemplate | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DocumentTemplate | null>(null);

	const { data, isLoading, isError } = useTemplates(activeCategory, page);
	const deleteMutation = useDeleteTemplate();

	const templates = data?.items ?? [];

	// Derive unique categories from loaded templates for tabs
	const allCategories = Array.from(
		new Set(templates.map((t) => t.category)),
	).sort();

	function openCreate() {
		setEditTarget(null);
		setFormOpen(true);
	}

	function openEdit(t: DocumentTemplate) {
		setEditTarget(t);
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
					<h1 className="text-2xl font-semibold">Document Templates</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Create reusable templates to quickly generate new documents.
					</p>
				</div>
				<Button onClick={openCreate}>
					<Plus className="h-4 w-4 mr-2" />
					New Template
				</Button>
			</div>

			{/* Category filter tabs */}
			{allCategories.length > 0 && (
				<Tabs
					value={activeCategory ?? '__all__'}
					onValueChange={(v) => setActiveCategory(v === '__all__' ? undefined : v)}
				>
					<TabsList>
						<TabsTrigger value="__all__">All</TabsTrigger>
						{allCategories.map((cat) => (
							<TabsTrigger key={cat} value={cat} className="capitalize">
								{cat}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			)}

			{/* Content */}
			{isLoading && (
				<div className="flex items-center justify-center h-40">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{isError && (
				<div className="rounded-md border border-destructive bg-destructive/10 p-3">
					<p className="text-sm text-destructive">Failed to load templates. Please try again.</p>
				</div>
			)}

			{!isLoading && !isError && templates.length === 0 && (
				<div className="flex flex-col items-center justify-center h-60 text-center gap-3">
					<FileText className="h-12 w-12 text-muted-foreground/40" />
					<p className="text-muted-foreground">No templates yet.</p>
					<Button variant="outline" onClick={openCreate}>
						<Plus className="h-4 w-4 mr-2" />
						Create your first template
					</Button>
				</div>
			)}

			{!isLoading && templates.length > 0 && (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{templates.map((t) => (
						<TemplateCard
							key={t.id}
							template={t}
							onUse={setUseTarget}
							onEdit={openEdit}
							onDelete={setDeleteTarget}
						/>
					))}
				</div>
			)}

			{/* Template form dialog (create / edit) */}
			<TemplateFormDialog
				open={formOpen}
				onClose={() => {
					setFormOpen(false);
					setEditTarget(null);
				}}
				initial={editTarget}
			/>

			{/* Use template dialog */}
			{useTarget && (
				<CreateFromTemplateDialog
					template={useTarget}
					open={!!useTarget}
					onClose={() => setUseTarget(null)}
				/>
			)}

			{/* Delete confirmation */}
			<AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete template?</AlertDialogTitle>
						<AlertDialogDescription>
							&ldquo;{deleteTarget?.name}&rdquo; will be deactivated. This cannot be undone.
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
