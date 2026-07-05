// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Save, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag, TagCreate } from '../types';

interface TagFormProps {
	tag?: Tag;
	onSuccess?: () => void;
	onCancel?: () => void;
}

const colors = ['#ef4444', '#f97316', '#f0a528', '#22c55e', '#14b8a6', '#38bdf8', '#a855f7', '#ec4899', '#64748b'];

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
	const [draft, setDraft] = useState<TagCreate>({
		name: tag?.name ?? '',
		description: tag?.description ?? '',
		color: tag?.color ?? colors[2],
		parentId: tag?.parentId,
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				onSuccess?.();
			}}
			className="space-y-5 rounded-xl border border-slate-800/50 bg-slate-900 p-5 text-slate-100"
		>
			<div>
				<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
					<TagIcon className="h-4 w-4" />
					{tag ? 'Edit tag' : 'Create tag'}
				</div>
				<p className="mt-2 text-sm text-slate-400">Define a clear label, color, and optional hierarchy parent for the tag manager.</p>
			</div>
			<label className="block text-sm text-slate-400">
				Name
				<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-brass-500/70" placeholder="e.g. Legal Hold" />
			</label>
			<label className="block text-sm text-slate-400">
				Description
				<textarea value={draft.description ?? ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-100 outline-none focus:border-brass-500/70" placeholder="When should this tag be used?" />
			</label>
			<div>
				<p className="mb-2 text-sm text-slate-400">Color</p>
				<div className="flex flex-wrap gap-2">
					{colors.map((color) => (
						<button key={color} type="button" onClick={() => setDraft((current) => ({ ...current, color }))} className={cn('h-9 w-9 rounded-full border-2', draft.color === color ? 'border-slate-100' : 'border-slate-800')} style={{ backgroundColor: color }} />
					))}
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-brass-500/70">Cancel</button>
				<button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400"><Save className="h-4 w-4" />Save tag</button>
			</div>
		</form>
	);
}
