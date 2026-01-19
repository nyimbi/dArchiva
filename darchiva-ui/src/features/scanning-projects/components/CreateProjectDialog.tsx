// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCreateScanningProject } from '../hooks';
import type { CreateScanningProjectInput } from '../api';

interface CreateProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Generate a project code from the name (uppercase, no spaces, max 20 chars)
function generateCode(name: string): string {
	return name
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 20) || 'PROJECT';
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
	const createProject = useCreateScanningProject();
	const [form, setForm] = useState<CreateScanningProjectInput>({
		code: '',
		name: '',
		description: '',
		estimated_pages: 0,
		target_dpi: 300,
		color_mode: 'grayscale',
		quality_sampling_rate: 0.05,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		// Auto-generate code from name if not set
		const submitData = {
			...form,
			code: form.code || generateCode(form.name),
		};
		await createProject.mutateAsync(submitData);
		onOpenChange(false);
		setForm({ code: '', name: '', description: '', estimated_pages: 0, target_dpi: 300, color_mode: 'grayscale', quality_sampling_rate: 0.05 });
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">Create Scanning Project</Dialog.Title>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Project Name</label>
							<input
								type="text"
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
								placeholder="e.g., Historical Records 2024"
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
							<textarea
								value={form.description}
								onChange={(e) => setForm({ ...form, description: e.target.value })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500 resize-none"
								rows={3}
								placeholder="Brief description of the project..."
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Estimated Pages</label>
								<input
									type="number"
									value={form.estimated_pages}
									onChange={(e) => setForm({ ...form, estimated_pages: parseInt(e.target.value) || 0 })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
									min={0}
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Target DPI</label>
								<select
									value={form.target_dpi}
									onChange={(e) => setForm({ ...form, target_dpi: parseInt(e.target.value) })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
								>
									<option value={200}>200 DPI</option>
									<option value={300}>300 DPI</option>
									<option value={400}>400 DPI</option>
									<option value={600}>600 DPI</option>
								</select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Color Mode</label>
								<select
									value={form.color_mode}
									onChange={(e) => setForm({ ...form, color_mode: e.target.value as 'bitonal' | 'grayscale' | 'color' })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
								>
									<option value="bitonal">Bitonal (B&W)</option>
									<option value="grayscale">Grayscale</option>
									<option value="color">Color</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">QC Sample Rate</label>
								<div className="flex items-center gap-2">
									<input
										type="number"
										value={Math.round((form.quality_sampling_rate || 0) * 100)}
										onChange={(e) => setForm({ ...form, quality_sampling_rate: (parseInt(e.target.value) || 0) / 100 })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
										min={1}
										max={100}
									/>
									<span className="text-slate-400">%</span>
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
								<input
									type="date"
									value={form.start_date || ''}
									onChange={(e) => setForm({ ...form, start_date: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Target End Date</label>
								<input
									type="date"
									value={form.target_end_date || ''}
									onChange={(e) => setForm({ ...form, target_end_date: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
								/>
							</div>
						</div>
						<div className="flex justify-end gap-3 pt-4">
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={createProject.isPending}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
							>
								{createProject.isPending ? 'Creating...' : 'Create Project'}
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
