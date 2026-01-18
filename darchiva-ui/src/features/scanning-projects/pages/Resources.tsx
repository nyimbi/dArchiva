// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Plus, User, Printer, Monitor } from 'lucide-react';
import { useResources, useCreateResource, useUpdateResource } from '../hooks';
import { ResourceCard } from '../components';
import type { ScanningResource } from '@/types';
import * as Dialog from '@radix-ui/react-dialog';
import type { CreateResourceInput } from '../api';

export function Resources() {
	const { data: resources, isLoading } = useResources();
	const createResource = useCreateResource();
	const updateResource = useUpdateResource();
	const [showCreate, setShowCreate] = useState(false);
	const [selectedResource, setSelectedResource] = useState<ScanningResource | null>(null);
	const [form, setForm] = useState<CreateResourceInput>({
		type: 'operator',
		name: '',
		description: '',
	});
	const [filter, setFilter] = useState<string>('all');

	const filteredResources = resources?.filter((r) => filter === 'all' || r.type === filter);

	const handleCreate = async () => {
		await createResource.mutateAsync(form);
		setShowCreate(false);
		setForm({ type: 'operator', name: '', description: '' });
	};

	const handleStatusChange = async (resource: ScanningResource, status: ScanningResource['status']) => {
		await updateResource.mutateAsync({ id: resource.id, input: { status } });
	};

	if (isLoading) {
		return <div className="p-8"><div className="animate-pulse h-48 bg-slate-800 rounded-lg" /></div>;
	}

	const operators = resources?.filter((r) => r.type === 'operator') || [];
	const scanners = resources?.filter((r) => r.type === 'scanner') || [];
	const workstations = resources?.filter((r) => r.type === 'workstation') || [];

	return (
		<div className="p-8">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Resources</h1>
					<p className="text-slate-400 mt-1">Manage operators, scanners, and workstations</p>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
				>
					<Plus className="w-5 h-5" />
					Add Resource
				</button>
			</div>

			<div className="grid grid-cols-3 gap-4 mb-6">
				{[
					{ type: 'operator', icon: User, label: 'Operators', count: operators.length, available: operators.filter((o) => o.status === 'available').length },
					{ type: 'scanner', icon: Printer, label: 'Scanners', count: scanners.length, available: scanners.filter((s) => s.status === 'available').length },
					{ type: 'workstation', icon: Monitor, label: 'Workstations', count: workstations.length, available: workstations.filter((w) => w.status === 'available').length },
				].map(({ type, icon: Icon, label, count, available }) => (
					<button
						key={type}
						onClick={() => setFilter(filter === type ? 'all' : type)}
						className={`p-4 rounded-lg border transition-colors text-left ${filter === type ? 'bg-brass-500/10 border-brass-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
					>
						<div className="flex items-center gap-3">
							<div className={`w-10 h-10 rounded-lg flex items-center justify-center ${filter === type ? 'bg-brass-500/20' : 'bg-slate-800'}`}>
								<Icon className={`w-5 h-5 ${filter === type ? 'text-brass-400' : 'text-slate-400'}`} />
							</div>
							<div>
								<div className="text-lg font-semibold text-slate-100">{count}</div>
								<div className="text-sm text-slate-400">{label} ({available} available)</div>
							</div>
						</div>
					</button>
				))}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filteredResources?.map((resource) => (
					<ResourceCard key={resource.id} resource={resource} onClick={setSelectedResource} />
				))}
			</div>

			<Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
					<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl">
						<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">Add Resource</Dialog.Title>
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
								<select
									value={form.type}
									onChange={(e) => setForm({ ...form, type: e.target.value as ScanningResource['type'] })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
								>
									<option value="operator">Operator</option>
									<option value="scanner">Scanner</option>
									<option value="workstation">Workstation</option>
								</select>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
								<input
									type="text"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
								<textarea
									value={form.description}
									onChange={(e) => setForm({ ...form, description: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 resize-none"
									rows={2}
								/>
							</div>
							{form.type === 'scanner' && (
								<>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-slate-300 mb-1">Model</label>
											<input
												type="text"
												value={form.model || ''}
												onChange={(e) => setForm({ ...form, model: e.target.value })}
												className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-slate-300 mb-1">Max DPI</label>
											<input
												type="number"
												value={form.maxDPI || ''}
												onChange={(e) => setForm({ ...form, maxDPI: parseInt(e.target.value) || undefined })}
												className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
											/>
										</div>
									</div>
									<div className="flex gap-4">
										<label className="flex items-center gap-2 text-slate-300">
											<input type="checkbox" checked={form.supportsColor} onChange={(e) => setForm({ ...form, supportsColor: e.target.checked })} />
											Color Support
										</label>
										<label className="flex items-center gap-2 text-slate-300">
											<input type="checkbox" checked={form.supportsDuplex} onChange={(e) => setForm({ ...form, supportsDuplex: e.target.checked })} />
											Duplex Support
										</label>
									</div>
								</>
							)}
							{form.type === 'operator' && (
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
									<input
										type="email"
										value={form.email || ''}
										onChange={(e) => setForm({ ...form, email: e.target.value })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
									/>
								</div>
							)}
							{form.type === 'workstation' && (
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
									<input
										type="text"
										value={form.location || ''}
										onChange={(e) => setForm({ ...form, location: e.target.value })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
									/>
								</div>
							)}
							<div className="flex justify-end gap-3 pt-4">
								<button onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-300 hover:text-slate-100">Cancel</button>
								<button
									onClick={handleCreate}
									disabled={!form.name || createResource.isPending}
									className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 disabled:opacity-50"
								>
									{createResource.isPending ? 'Adding...' : 'Add Resource'}
								</button>
							</div>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
