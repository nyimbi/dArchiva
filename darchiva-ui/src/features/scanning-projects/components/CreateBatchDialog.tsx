// (c) Copyright Datacraft, 2026
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import type { BatchTemplate, CreateBatchInput } from '../api';
import { useCreateBatch, useBatchTemplates } from '../hooks';

interface CreateBatchDialogProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const BLANK: CreateBatchInput = {
	batchNumber: '',
	type: 'box',
	physicalLocation: '',
	barcode: '',
	estimatedPages: 0,
	notes: '',
	template_id: undefined,
};

export function CreateBatchDialog({ projectId, open, onOpenChange }: CreateBatchDialogProps) {
	const createBatch = useCreateBatch();
	const { data: templates = [] } = useBatchTemplates();
	const [form, setForm] = useState<CreateBatchInput>({ ...BLANK });
	const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<BatchTemplate | null>(null);

	const applyTemplate = (tpl: BatchTemplate) => {
		setSelectedTemplate(tpl);
		setForm((prev) => ({
			...prev,
			notes: tpl.notes_template ?? prev.notes,
			template_id: tpl.id,
		}));
		setTemplatePickerOpen(false);
	};

	const clearTemplate = () => {
		setSelectedTemplate(null);
		setForm((prev) => ({ ...prev, template_id: undefined }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await createBatch.mutateAsync({ projectId, input: form });
		onOpenChange(false);
		setForm({ ...BLANK });
		setSelectedTemplate(null);
	};

	const inputCls =
		'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500 text-sm';
	const labelCls = 'block text-sm font-medium text-slate-300 mb-1';

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">Add Batch</Dialog.Title>

					{/* Template picker strip */}
					{templates.length > 0 && (
						<div className="mb-5">
							<div className="flex items-center gap-2">
								<Wand2 className="w-4 h-4 text-brass-500 shrink-0" />
								<span className="text-xs text-slate-400">Use a template to pre-fill settings</span>
							</div>
							<div className="relative mt-2">
								<button
									type="button"
									onClick={() => setTemplatePickerOpen((v) => !v)}
									className="flex items-center justify-between w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-brass-500 transition-colors"
								>
									<span>
										{selectedTemplate ? (
											<span className="text-brass-400 font-medium">{selectedTemplate.name}</span>
										) : (
											<span className="text-slate-500">Select a template...</span>
										)}
									</span>
									<ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${templatePickerOpen ? 'rotate-180' : ''}`} />
								</button>

								{templatePickerOpen && (
									<div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
										{templates.map((tpl) => (
											<button
												key={tpl.id}
												type="button"
												onClick={() => applyTemplate(tpl)}
												className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors"
											>
												<div className="flex items-center justify-between">
													<span className="text-sm text-slate-200 font-medium">{tpl.name}</span>
													<span className="text-xs text-slate-500">{tpl.dpi}dpi · {tpl.color_mode}</span>
												</div>
												{tpl.description && (
													<div className="text-xs text-slate-500 truncate">{tpl.description}</div>
												)}
											</button>
										))}
									</div>
								)}
							</div>

							{selectedTemplate && (
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<div className="flex flex-wrap gap-1.5 text-xs">
										{[
											`${selectedTemplate.dpi} dpi`,
											selectedTemplate.color_mode,
											selectedTemplate.paper_size,
											`Q≥${selectedTemplate.quality_threshold.toFixed(0)}%`,
											selectedTemplate.barcode_enabled ? 'Barcode on' : null,
											selectedTemplate.auto_deskew ? 'Deskew' : null,
										]
											.filter(Boolean)
											.map((tag) => (
												<span
													key={tag!}
													className="px-2 py-0.5 bg-brass-900/30 text-brass-400 border border-brass-700/30 rounded-full"
												>
													{tag}
												</span>
											))}
									</div>
									<button
										type="button"
										onClick={clearTemplate}
										className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
									>
										Clear
									</button>
								</div>
							)}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className={labelCls}>Batch Number</label>
								<input
									type="text"
									value={form.batchNumber}
									onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
									className={inputCls}
									placeholder="e.g., BOX-001"
									required
								/>
							</div>
							<div>
								<label className={labelCls}>Type</label>
								<select
									value={form.type}
									onChange={(e) => setForm({ ...form, type: e.target.value as 'box' | 'folder' | 'volume' })}
									className={inputCls}
								>
									<option value="box">Box</option>
									<option value="folder">Folder</option>
									<option value="volume">Volume</option>
								</select>
							</div>
						</div>
						<div>
							<label className={labelCls}>Physical Location</label>
							<input
								type="text"
								value={form.physicalLocation}
								onChange={(e) => setForm({ ...form, physicalLocation: e.target.value })}
								className={inputCls}
								placeholder="e.g., Archive Room A, Shelf 3"
								required
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className={labelCls}>Barcode (optional)</label>
								<input
									type="text"
									value={form.barcode}
									onChange={(e) => setForm({ ...form, barcode: e.target.value })}
									className={inputCls}
									placeholder="Scan or enter barcode"
								/>
							</div>
							<div>
								<label className={labelCls}>Estimated Pages</label>
								<input
									type="number"
									value={form.estimatedPages}
									onChange={(e) => setForm({ ...form, estimatedPages: parseInt(e.target.value) || 0 })}
									className={inputCls}
									min={0}
									required
								/>
							</div>
						</div>
						<div>
							<label className={labelCls}>Notes</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								className={`${inputCls} resize-none`}
								rows={2}
								placeholder="Any special handling instructions..."
							/>
						</div>
						<div className="flex justify-end gap-3 pt-4">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors text-sm"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={createBatch.isPending}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors disabled:opacity-50 text-sm"
							>
								{createBatch.isPending ? 'Adding...' : 'Add Batch'}
							</button>
						</div>
					</form>
					<Dialog.Close asChild>
						<button className="absolute top-4 right-4 text-slate-400 hover:text-slate-100">
							<X className="w-5 h-5" />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
