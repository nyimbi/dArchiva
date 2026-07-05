// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import { Combine, GitBranch, Search, Split, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '../types';

interface TagListProps {
	onSelect?: (tag: Tag) => void;
	onEdit?: (tag: Tag) => void;
	selectedId?: string;
}

const mockTags: Tag[] = [
	{ id: 'tag-urgent', name: 'Urgent Review', color: '#ef4444', documentCount: 842, createdAt: '2026-01-08', updatedAt: '2026-07-05', description: 'Time-sensitive documents needing owner review.' },
	{ id: 'tag-ap', name: 'Accounts Payable', color: '#f0a528', documentCount: 12840, createdAt: '2026-01-08', updatedAt: '2026-07-05', description: 'Vendor and payment processing records.' },
	{ id: 'tag-legal', name: 'Legal Hold', color: '#a855f7', documentCount: 1220, createdAt: '2026-02-14', updatedAt: '2026-07-04', description: 'Documents preserved for legal hold.' },
	{ id: 'tag-pii', name: 'Contains PII', color: '#38bdf8', documentCount: 9360, createdAt: '2026-02-20', updatedAt: '2026-07-03', description: 'Personal data handling restrictions apply.' },
	{ id: 'tag-retention', name: 'Retention Review', color: '#22c55e', documentCount: 3184, createdAt: '2026-03-01', updatedAt: '2026-07-01', description: 'Lifecycle review required.' },
	{ id: 'tag-split', name: 'Needs Split', color: '#f97316', documentCount: 214, createdAt: '2026-04-12', updatedAt: '2026-06-28', description: 'Multi-document scans awaiting separation.' },
];

export function TagList({ onSelect, onEdit, selectedId }: TagListProps) {
	const [query, setQuery] = useState('');
	const [activeId, setActiveId] = useState(selectedId ?? mockTags[0].id);
	const filtered = useMemo(
		() => mockTags.filter((tag) => `${tag.name} ${tag.description ?? ''}`.toLowerCase().includes(query.toLowerCase())),
		[query],
	);
	const maxUsage = Math.max(...mockTags.map((tag) => tag.documentCount));

	return (
		<div className="min-h-[680px] rounded-xl border border-slate-800/50 bg-slate-950 p-5 text-slate-100">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
						<TagIcon className="h-4 w-4" />
						Tag manager
					</div>
					<h2 className="mt-2 text-2xl font-semibold tracking-tight">Tags</h2>
					<p className="mt-1 text-sm text-slate-400">Color-coded taxonomy, tag cloud, usage counts, merge, split, and cleanup actions.</p>
				</div>
				<div className="flex gap-2">
					<button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-brass-500/70"><Combine className="h-4 w-4" />Merge tags</button>
					<button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-brass-500/70"><Split className="h-4 w-4" />Split tag</button>
				</div>
			</div>

			<div className="mt-5 grid gap-6 xl:grid-cols-[1fr_360px]">
				<section className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
					<div className="relative mb-4">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
						<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tags..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm outline-none focus:border-brass-500/70" />
					</div>
					<div className="space-y-3">
						{filtered.length ? filtered.map((tag) => {
							const active = tag.id === activeId;
							return (
								<button
									key={tag.id}
									type="button"
									onClick={() => {
										setActiveId(tag.id);
										onSelect?.(tag);
									}}
									onDoubleClick={() => onEdit?.(tag)}
									className={cn('w-full rounded-xl border p-4 text-left transition-colors', active ? 'border-brass-500/60 bg-brass-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700')}
								>
									<div className="flex items-start gap-3">
										<span className="mt-1 h-4 w-4 rounded-full" style={{ backgroundColor: tag.color }} />
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-3">
												<p className="font-medium text-slate-100">{tag.name}</p>
												<span className="tabular-nums text-sm text-slate-400">{tag.documentCount.toLocaleString()} docs</span>
											</div>
											<p className="mt-1 text-sm text-slate-400">{tag.description}</p>
											<div className="mt-3 h-2 rounded-full bg-slate-800">
												<div className="h-2 rounded-full" style={{ width: `${(tag.documentCount / maxUsage) * 100}%`, backgroundColor: tag.color }} />
											</div>
										</div>
									</div>
								</button>
							);
						}) : (
							<div className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-500">No tags match this search. Create a tag to start classifying documents.</div>
						)}
					</div>
				</section>

				<section className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
					<h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">Tag Cloud</h3>
					<div className="mt-4 flex flex-wrap gap-2">
						{mockTags.map((tag) => (
							<button key={tag.id} type="button" onClick={() => setActiveId(tag.id)} className="rounded-full border border-slate-800 px-3 py-2 font-medium hover:border-brass-500/70" style={{ color: tag.color, fontSize: `${12 + (tag.documentCount / maxUsage) * 8}px` }}>
								{tag.name}
							</button>
						))}
					</div>
					<div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
						<p className="flex items-center gap-2 text-sm font-medium text-slate-100"><GitBranch className="h-4 w-4 text-brass-500" />Suggested cleanup</p>
						<p className="mt-2 text-sm text-slate-400">Merge "Urgent Review" with duplicate variants "Urgent" and "Needs Attention"; split "Accounts Payable" into Vendor, Tax, and Statements.</p>
					</div>
				</section>
			</div>
		</div>
	);
}
