// (c) Copyright Datacraft, 2026
/**
 * BatchTemplateManager — CRUD table for scan batch templates.
 * Used as a "Templates" tab inside ProjectDetails.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { BatchTemplate, CreateBatchTemplateInput, UpdateBatchTemplateInput } from '../api';
import {
	useBatchTemplates,
	useCreateBatchTemplate,
	useDeleteBatchTemplate,
	useUpdateBatchTemplate,
} from '../hooks';

// ── constants ──────────────────────────────────────────────────────────────

const DPI_OPTIONS = [150, 200, 300, 400, 600] as const;
const COLOR_MODE_LABELS: Record<string, string> = {
	color: 'Color',
	grayscale: 'Grayscale',
	black_white: 'Black & White',
};
const PAPER_SIZE_LABELS: Record<string, string> = {
	A4: 'A4',
	A3: 'A3',
	Letter: 'Letter',
	Legal: 'Legal',
	auto: 'Auto-detect',
};

// ── blank form ──────────────────────────────────────────────────────────────

const BLANK: CreateBatchTemplateInput = {
	name: '',
	description: '',
	dpi: 300,
	color_mode: 'color',
	paper_size: 'A4',
	quality_threshold: 60,
	barcode_enabled: false,
	auto_deskew: true,
	auto_enhance: false,
	expected_pages_per_document: undefined,
	notes_template: '',
};

// ── form dialog ─────────────────────────────────────────────────────────────

interface TemplateFormDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	initial?: BatchTemplate | null;
	onSubmit: (values: CreateBatchTemplateInput) => Promise<void>;
	isPending: boolean;
}

function TemplateFormDialog({ open, onOpenChange, initial, onSubmit, isPending }: TemplateFormDialogProps) {
	const [form, setForm] = useState<CreateBatchTemplateInput>(() =>
		initial
			? {
					name: initial.name,
					description: initial.description ?? '',
					dpi: initial.dpi,
					color_mode: initial.color_mode,
					paper_size: initial.paper_size,
					quality_threshold: initial.quality_threshold,
					barcode_enabled: initial.barcode_enabled,
					auto_deskew: initial.auto_deskew,
					auto_enhance: initial.auto_enhance,
					expected_pages_per_document: initial.expected_pages_per_document ?? undefined,
					notes_template: initial.notes_template ?? '',
				}
			: { ...BLANK }
	);

	const set = <K extends keyof CreateBatchTemplateInput>(k: K, v: CreateBatchTemplateInput[K]) =>
		setForm((prev) => ({ ...prev, [k]: v }));

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSubmit(form);
	};

	const inputCls =
		'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500 text-sm';
	const labelCls = 'block text-xs font-medium text-slate-400 mb-1';
	const toggleCls = (on: boolean) =>
		`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${on ? 'bg-brass-500' : 'bg-slate-700'}`;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
				<Dialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
					<Dialog.Title className="text-lg font-semibold text-slate-100 mb-5">
						{initial ? 'Edit Template' : 'New Batch Template'}
					</Dialog.Title>

					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Name + Description */}
						<div>
							<label className={labelCls}>Name *</label>
							<input
								className={inputCls}
								value={form.name}
								onChange={(e) => set('name', e.target.value)}
								placeholder="e.g., Standard A4 Color 300dpi"
								required
							/>
						</div>
						<div>
							<label className={labelCls}>Description</label>
							<textarea
								className={`${inputCls} resize-none`}
								rows={2}
								value={form.description ?? ''}
								onChange={(e) => set('description', e.target.value)}
								placeholder="Optional description..."
							/>
						</div>

						{/* DPI + Color Mode */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className={labelCls}>DPI</label>
								<select
									className={inputCls}
									value={form.dpi}
									onChange={(e) => set('dpi', Number(e.target.value))}
								>
									{DPI_OPTIONS.map((d) => (
										<option key={d} value={d}>{d} dpi</option>
									))}
								</select>
							</div>
							<div>
								<label className={labelCls}>Color Mode</label>
								<select
									className={inputCls}
									value={form.color_mode}
									onChange={(e) => set('color_mode', e.target.value as CreateBatchTemplateInput['color_mode'])}
								>
									{Object.entries(COLOR_MODE_LABELS).map(([val, label]) => (
										<option key={val} value={val}>{label}</option>
									))}
								</select>
							</div>
						</div>

						{/* Paper Size + Expected Pages */}
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className={labelCls}>Paper Size</label>
								<select
									className={inputCls}
									value={form.paper_size}
									onChange={(e) => set('paper_size', e.target.value as CreateBatchTemplateInput['paper_size'])}
								>
									{Object.entries(PAPER_SIZE_LABELS).map(([val, label]) => (
										<option key={val} value={val}>{label}</option>
									))}
								</select>
							</div>
							<div>
								<label className={labelCls}>Expected Pages / Doc</label>
								<input
									type="number"
									className={inputCls}
									value={form.expected_pages_per_document ?? ''}
									onChange={(e) =>
										set('expected_pages_per_document', e.target.value ? Number(e.target.value) : undefined)
									}
									min={1}
									placeholder="Optional"
								/>
							</div>
						</div>

						{/* Quality Threshold Slider */}
						<div>
							<label className={labelCls}>
								Quality Threshold — {form.quality_threshold?.toFixed(0)}%
							</label>
							<input
								type="range"
								min={0}
								max={100}
								step={5}
								value={form.quality_threshold ?? 60}
								onChange={(e) => set('quality_threshold', Number(e.target.value))}
								className="w-full accent-brass-500"
							/>
							<div className="flex justify-between text-xs text-slate-500 mt-0.5">
								<span>0%</span><span>100%</span>
							</div>
						</div>

						{/* Toggles */}
						<div className="grid grid-cols-3 gap-3">
							{(
								[
									['barcode_enabled', 'Barcode'],
									['auto_deskew', 'Auto Deskew'],
									['auto_enhance', 'Auto Enhance'],
								] as [keyof CreateBatchTemplateInput, string][]
							).map(([key, label]) => (
								<div key={key} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
									<span className="text-xs text-slate-300">{label}</span>
									<button
										type="button"
										onClick={() => set(key, !form[key] as CreateBatchTemplateInput[typeof key])}
										className={toggleCls(!!form[key])}
										aria-label={`Toggle ${label}`}
									>
										<span
											className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
												form[key] ? 'translate-x-4' : 'translate-x-1'
											}`}
										/>
									</button>
								</div>
							))}
						</div>

						{/* Notes Template */}
						<div>
							<label className={labelCls}>Default Notes (pre-fills batch notes)</label>
							<textarea
								className={`${inputCls} resize-none`}
								rows={3}
								value={form.notes_template ?? ''}
								onChange={(e) => set('notes_template', e.target.value)}
								placeholder="Any default handling instructions..."
							/>
						</div>

						<div className="flex justify-end gap-3 pt-2">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="px-4 py-2 text-slate-400 hover:text-slate-100 text-sm transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isPending || !form.name.trim()}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
							>
								{isPending ? 'Saving...' : initial ? 'Save Changes' : 'Create Template'}
							</button>
						</div>
					</form>

					<Dialog.Close asChild>
						<button className="absolute top-4 right-4 text-slate-500 hover:text-slate-100">
							<X className="w-4 h-4" />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// ── main component ──────────────────────────────────────────────────────────

export function BatchTemplateManager() {
	const { data: templates = [], isLoading } = useBatchTemplates();
	const createMut = useCreateBatchTemplate();
	const updateMut = useUpdateBatchTemplate();
	const deleteMut = useDeleteBatchTemplate();

	const [showCreate, setShowCreate] = useState(false);
	const [editing, setEditing] = useState<BatchTemplate | null>(null);

	const handleCreate = async (values: CreateBatchTemplateInput) => {
		try {
			await createMut.mutateAsync(values);
			toast.success('Template created');
			setShowCreate(false);
		} catch {
			toast.error('Failed to create template');
		}
	};

	const handleUpdate = async (values: CreateBatchTemplateInput) => {
		if (!editing) return;
		try {
			await updateMut.mutateAsync({ id: editing.id, input: values as UpdateBatchTemplateInput });
			toast.success('Template updated');
			setEditing(null);
		} catch {
			toast.error('Failed to update template');
		}
	};

	const handleDuplicate = async (tpl: BatchTemplate) => {
		try {
			await createMut.mutateAsync({
				name: `${tpl.name} (copy)`,
				description: tpl.description ?? undefined,
				dpi: tpl.dpi,
				color_mode: tpl.color_mode,
				paper_size: tpl.paper_size,
				quality_threshold: tpl.quality_threshold,
				barcode_enabled: tpl.barcode_enabled,
				auto_deskew: tpl.auto_deskew,
				auto_enhance: tpl.auto_enhance,
				expected_pages_per_document: tpl.expected_pages_per_document ?? undefined,
				notes_template: tpl.notes_template ?? undefined,
			});
			toast.success('Template duplicated');
		} catch {
			toast.error('Failed to duplicate template');
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this template?')) return;
		try {
			await deleteMut.mutateAsync(id);
			toast.success('Template deleted');
		} catch {
			toast.error('Failed to delete template');
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-32 text-slate-500 text-sm">
				Loading templates...
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-base font-semibold text-slate-100">Batch Templates</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						Save reusable scan configs. Apply a template when creating a new batch.
					</p>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors"
				>
					<Plus className="w-4 h-4" />
					New Template
				</button>
			</div>

			{/* Table */}
			{templates.length === 0 ? (
				<div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700 rounded-xl">
					No templates yet. Create one to reuse scan settings across batches.
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-slate-800">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-800 text-left">
								{['Name', 'DPI', 'Color Mode', 'Paper', 'Quality', 'Barcode', 'Used', ''].map((h) => (
									<th key={h} className="px-4 py-2.5 text-xs font-medium text-slate-500 whitespace-nowrap">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{templates.map((tpl) => (
								<tr key={tpl.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
									<td className="px-4 py-3">
										<div className="font-medium text-slate-200 truncate max-w-[160px]">{tpl.name}</div>
										{tpl.description && (
											<div className="text-xs text-slate-500 truncate max-w-[160px]">{tpl.description}</div>
										)}
									</td>
									<td className="px-4 py-3 text-slate-400 whitespace-nowrap">{tpl.dpi}</td>
									<td className="px-4 py-3 text-slate-400 whitespace-nowrap">
										{COLOR_MODE_LABELS[tpl.color_mode] ?? tpl.color_mode}
									</td>
									<td className="px-4 py-3 text-slate-400 whitespace-nowrap">
										{PAPER_SIZE_LABELS[tpl.paper_size] ?? tpl.paper_size}
									</td>
									<td className="px-4 py-3">
										<div
											className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
												tpl.quality_threshold >= 80
													? 'bg-emerald-900/40 text-emerald-400'
													: tpl.quality_threshold >= 60
													? 'bg-yellow-900/40 text-yellow-400'
													: 'bg-red-900/40 text-red-400'
											}`}
										>
											{tpl.quality_threshold.toFixed(0)}%
										</div>
									</td>
									<td className="px-4 py-3">
										{tpl.barcode_enabled ? (
											<span className="text-xs text-emerald-400">On</span>
										) : (
											<span className="text-xs text-slate-600">Off</span>
										)}
									</td>
									<td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
										{tpl.usage_count}×
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center gap-1 justify-end">
											<button
												onClick={() => setEditing(tpl)}
												className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
												title="Edit"
											>
												<Edit2 className="w-3.5 h-3.5" />
											</button>
											<button
												onClick={() => handleDuplicate(tpl)}
												className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
												title="Duplicate"
											>
												<Copy className="w-3.5 h-3.5" />
											</button>
											<button
												onClick={() => handleDelete(tpl.id)}
												className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
												title="Delete"
											>
												<Trash2 className="w-3.5 h-3.5" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Create dialog */}
			<TemplateFormDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				initial={null}
				onSubmit={handleCreate}
				isPending={createMut.isPending}
			/>

			{/* Edit dialog */}
			{editing && (
				<TemplateFormDialog
					open={!!editing}
					onOpenChange={(v) => { if (!v) setEditing(null); }}
					initial={editing}
					onSubmit={handleUpdate}
					isPending={updateMut.isPending}
				/>
			)}
		</div>
	);
}
