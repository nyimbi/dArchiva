// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCreateBatch } from '../hooks';
import type { CreateBatchInput } from '../api';

interface CreateBatchDialogProps {
	projectId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateBatchDialog({ projectId, open, onOpenChange }: CreateBatchDialogProps) {
	const createBatch = useCreateBatch();
	const [form, setForm] = useState<CreateBatchInput>({
		batchNumber: '',
		type: 'box',
		physicalLocation: '',
		barcode: '',
		estimatedPages: 0,
		notes: '',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await createBatch.mutateAsync({ projectId, input: form });
		onOpenChange(false);
		setForm({ batchNumber: '', type: 'box', physicalLocation: '', barcode: '', estimatedPages: 0, notes: '' });
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">Add Batch</Dialog.Title>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Batch Number</label>
								<input
									type="text"
									value={form.batchNumber}
									onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
									placeholder="e.g., BOX-001"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
								<select
									value={form.type}
									onChange={(e) => setForm({ ...form, type: e.target.value as 'box' | 'folder' | 'volume' })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
								>
									<option value="box">Box</option>
									<option value="folder">Folder</option>
									<option value="volume">Volume</option>
								</select>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Physical Location</label>
							<input
								type="text"
								value={form.physicalLocation}
								onChange={(e) => setForm({ ...form, physicalLocation: e.target.value })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
								placeholder="e.g., Archive Room A, Shelf 3"
								required
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Barcode (optional)</label>
								<input
									type="text"
									value={form.barcode}
									onChange={(e) => setForm({ ...form, barcode: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
									placeholder="Scan or enter barcode"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Estimated Pages</label>
								<input
									type="number"
									value={form.estimatedPages}
									onChange={(e) => setForm({ ...form, estimatedPages: parseInt(e.target.value) || 0 })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
									min={0}
									required
								/>
							</div>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
							<textarea
								value={form.notes}
								onChange={(e) => setForm({ ...form, notes: e.target.value })}
								className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500 resize-none"
								rows={2}
								placeholder="Any special handling instructions..."
							/>
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
								disabled={createBatch.isPending}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors disabled:opacity-50"
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
