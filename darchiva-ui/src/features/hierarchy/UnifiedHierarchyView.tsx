// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Archive, ChevronDown, ChevronRight, FileText, Folder, MoreHorizontal, Search, SquarePen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type HierarchyType = 'Cabinet' | 'Folder' | 'SubFolder' | 'Document';

interface HierarchyNode {
	id: string;
	name: string;
	type: HierarchyType;
	docs: number;
	gb: number;
	children?: HierarchyNode[];
}

interface FlatNode {
	node: HierarchyNode;
	level: number;
	parentIds: string[];
}

const tree: HierarchyNode[] = [
	{
		id: 'cab-fin',
		name: 'Finance Cabinet',
		type: 'Cabinet',
		docs: 28420,
		gb: 218.4,
		children: [
			{ id: 'fold-ap', name: 'Accounts Payable', type: 'Folder', docs: 12840, gb: 88.4, children: [
				{ id: 'sf-2026', name: '2026', type: 'SubFolder', docs: 5240, gb: 33.2, children: [
					{ id: 'doc-inv-88412', name: 'Kiboko Logistics Invoice 83914.pdf', type: 'Document', docs: 1, gb: 0.02 },
					{ id: 'doc-inv-88413', name: 'Rift Valley Supplies Statement.pdf', type: 'Document', docs: 1, gb: 0.03 },
				] },
				{ id: 'sf-2025', name: '2025', type: 'SubFolder', docs: 7600, gb: 55.2 },
			] },
			{ id: 'fold-ar', name: 'Accounts Receivable', type: 'Folder', docs: 15580, gb: 130.0 },
		],
	},
	{
		id: 'cab-legal',
		name: 'Legal Cabinet',
		type: 'Cabinet',
		docs: 18102,
		gb: 172.1,
		children: [
			{ id: 'fold-contracts', name: 'Contracts', type: 'Folder', docs: 10980, gb: 92.8, children: [
				{ id: 'doc-lease', name: 'Meridian Lease Amendment.pdf', type: 'Document', docs: 1, gb: 0.04 },
			] },
			{ id: 'fold-claims', name: 'Claims', type: 'Folder', docs: 7122, gb: 79.3 },
		],
	},
	{ id: 'cab-hr', name: 'People Operations Cabinet', type: 'Cabinet', docs: 9360, gb: 51.2 },
];

function flatten(nodes: HierarchyNode[], expanded: Set<string>, level = 0, parentIds: string[] = []): FlatNode[] {
	return nodes.flatMap((node) => {
		const current: FlatNode = { node, level, parentIds };
		if (!node.children?.length || !expanded.has(node.id)) return [current];
		return [current, ...flatten(node.children, expanded, level + 1, [...parentIds, node.id])];
	});
}

function filterTree(nodes: HierarchyNode[], query: string): HierarchyNode[] {
	if (!query.trim()) return nodes;
	const needle = query.toLowerCase();
	return nodes
		.map((node) => {
			const children = node.children ? filterTree(node.children, query) : [];
			if (node.name.toLowerCase().includes(needle) || children.length) return { ...node, children };
			return null;
		})
		.filter((node): node is HierarchyNode => node !== null);
}

function nodeIcon(type: HierarchyType) {
	if (type === 'Document') return <FileText className="h-4 w-4 text-sky-400" />;
	if (type === 'Cabinet') return <Archive className="h-4 w-4 text-brass-500" />;
	return <Folder className="h-4 w-4 text-emerald-400" />;
}

export function UnifiedHierarchyView() {
	const [expanded, setExpanded] = useState<Set<string>>(new Set(['cab-fin', 'fold-ap', 'sf-2026', 'cab-legal', 'fold-contracts']));
	const [selectedId, setSelectedId] = useState('doc-inv-88412');
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [names, setNames] = useState<Record<string, string>>({});
	const [query, setQuery] = useState('');
	const filtered = useMemo(() => filterTree(tree, query), [query]);
	const rows = useMemo(() => flatten(filtered, expanded), [expanded, filtered]);
	const selected = rows.find((row) => row.node.id === selectedId)?.node ?? rows[0]?.node;
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => document.getElementById('hierarchy-scroll'),
		estimateSize: () => 44,
		overscan: 12,
	});

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[460px_1fr]">
				<section className="rounded-xl border border-slate-800/50 bg-slate-900">
					<div className="border-b border-slate-800/50 p-5">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-medium text-brass-500">Unified hierarchy</p>
								<h1 className="mt-1 text-2xl font-semibold tracking-tight">Archive Tree</h1>
							</div>
							<button type="button" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">New Folder</button>
						</div>
						<div className="relative mt-4">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hierarchy..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm outline-none focus:border-brass-500/70" />
						</div>
					</div>
					<div id="hierarchy-scroll" className="h-[720px] overflow-auto p-2">
						<div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
							{virtualizer.getVirtualItems().map((virtualRow) => {
								const row = rows[virtualRow.index];
								const hasChildren = Boolean(row.node.children?.length);
								const isOpen = expanded.has(row.node.id);
								const isSelected = selectedId === row.node.id;
								const displayName = names[row.node.id] ?? row.node.name;
								return (
									<div
										key={row.node.id}
										draggable
										onDragStart={(event) => event.dataTransfer.setData('text/plain', row.node.id)}
										onDragOver={(event) => event.preventDefault()}
										onDrop={(event) => {
											event.preventDefault();
											setSelectedId(row.node.id);
										}}
										style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
										className={cn('group flex items-center gap-2 rounded-lg px-2 text-sm hover:bg-slate-800/80', isSelected && 'bg-brass-500/10 text-brass-200')}
									>
										<button
											type="button"
											onClick={() =>
												setExpanded((current) => {
													const next = new Set(current);
													if (next.has(row.node.id)) next.delete(row.node.id);
													else next.add(row.node.id);
													return next;
												})
											}
											className="flex h-8 w-6 items-center justify-center text-slate-500"
											style={{ marginLeft: row.level * 18 }}
										>
											{hasChildren ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : null}
										</button>
										<button type="button" onClick={() => setSelectedId(row.node.id)} onDoubleClick={() => setRenamingId(row.node.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
											{nodeIcon(row.node.type)}
											{renamingId === row.node.id ? (
												<input
													autoFocus
													value={displayName}
													onChange={(event) => setNames((current) => ({ ...current, [row.node.id]: event.target.value }))}
													onBlur={() => setRenamingId(null)}
													onKeyDown={(event) => {
														if (event.key === 'Enter' || event.key === 'Escape') setRenamingId(null);
													}}
													className="w-full rounded border border-brass-500/60 bg-slate-950 px-2 py-1 text-sm outline-none"
												/>
											) : (
												<span className="truncate">{displayName}</span>
											)}
										</button>
										<span className="hidden shrink-0 tabular-nums text-xs text-slate-500 md:inline">{row.node.docs.toLocaleString()} docs</span>
										<span className="hidden shrink-0 tabular-nums text-xs text-slate-600 md:inline">{row.node.gb.toFixed(1)} GB</span>
										<div className="hidden items-center gap-1 group-hover:flex">
											<button type="button" onClick={() => setRenamingId(row.node.id)} title="Rename (F2)" className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-100"><SquarePen className="h-3.5 w-3.5" /></button>
											<button type="button" title="Context menu" className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-100"><MoreHorizontal className="h-3.5 w-3.5" /></button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</section>

				<section className="rounded-xl border border-slate-800/50 bg-slate-900 p-5">
					{selected ? (
						<div className="space-y-6">
							<div className="flex flex-col gap-4 border-b border-slate-800/50 pb-5 lg:flex-row lg:items-start lg:justify-between">
								<div>
									<div className="flex items-center gap-2 text-sm text-brass-400">{nodeIcon(selected.type)}{selected.type}</div>
									<h2 className="mt-2 text-3xl font-semibold text-slate-100">{names[selected.id] ?? selected.name}</h2>
									<p className="mt-2 text-sm text-slate-400">Drag nodes into this panel or use the context menu for New Folder, Rename, Move, Delete, and Properties.</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<button type="button" onClick={() => setRenamingId(selected.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-brass-500/70">Rename</button>
									<button type="button" className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-brass-500/70">Move</button>
									<button type="button" className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Delete</button>
								</div>
							</div>
							<div className="grid gap-4 md:grid-cols-3">
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Documents</p><p className="mt-3 text-3xl font-semibold tabular-nums text-slate-100">{selected.docs.toLocaleString()}</p></div>
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Storage</p><p className="mt-3 text-3xl font-semibold tabular-nums text-brass-400">{selected.gb.toFixed(1)} GB</p></div>
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">Children</p><p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-400">{selected.children?.length ?? 0}</p></div>
							</div>
							<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
								<h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">Context menu</h3>
								<div className="mt-4 grid gap-3 md:grid-cols-5">
									{['New Folder', 'Rename', 'Move', 'Delete', 'Properties'].map((action) => (
										<button key={action} type="button" className="rounded-lg border border-slate-800 px-3 py-3 text-sm text-slate-300 hover:border-brass-500/70 hover:text-slate-100">{action}</button>
									))}
								</div>
							</div>
						</div>
					) : (
						<div className="flex min-h-[620px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">Select a hierarchy node to view properties.</div>
					)}
				</section>
			</div>
		</div>
	);
}
