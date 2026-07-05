// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	useReactFlow,
	type Edge,
	type Node,
	type NodeProps,
	type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Download, Filter, GitBranch, Maximize2, Network, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type EntityType = 'document' | 'person' | 'organization' | 'date' | 'location';
type RelationshipLabel = 'authored_by' | 'mentions' | 'related_to' | 'references' | 'signed_by';

interface EntityNodeData extends Record<string, unknown> {
	label: string;
	type: EntityType;
	summary: string;
	linkedDocs: string[];
}

type EntityGraphNode = Node<EntityNodeData, EntityType>;
type EntityGraphEdge = Edge<{ relationship: RelationshipLabel }>;

const typeStyles: Record<EntityType, { bg: string; border: string; text: string; color: string }> = {
	document: { bg: 'bg-sky-500/15', border: 'border-sky-400/60', text: 'text-sky-200', color: '#38bdf8' },
	person: { bg: 'bg-emerald-500/15', border: 'border-emerald-400/60', text: 'text-emerald-200', color: '#22c55e' },
	organization: { bg: 'bg-orange-500/15', border: 'border-orange-400/60', text: 'text-orange-200', color: '#f97316' },
	date: { bg: 'bg-purple-500/15', border: 'border-purple-400/60', text: 'text-purple-200', color: '#a855f7' },
	location: { bg: 'bg-red-500/15', border: 'border-red-400/60', text: 'text-red-200', color: '#ef4444' },
};

const initialNodes: EntityGraphNode[] = [
	{ id: 'doc-1', type: 'document', position: { x: 80, y: 190 }, data: { label: 'Meridian Lease Amendment', type: 'document', summary: 'Contract packet with renewal, signatures, and filing metadata.', linkedDocs: ['DOC-CON-2026-21903'] } },
	{ id: 'doc-2', type: 'document', position: { x: 380, y: 30 }, data: { label: 'Invoice 83914', type: 'document', summary: 'Vendor invoice received through AP email ingestion.', linkedDocs: ['DOC-INV-2026-88412'] } },
	{ id: 'person-1', type: 'person', position: { x: 420, y: 250 }, data: { label: 'Amina Patel', type: 'person', summary: 'Records manager and contract signatory.', linkedDocs: ['DOC-CON-2026-21903', 'DOC-GOV-2026-0307'] } },
	{ id: 'person-2', type: 'person', position: { x: 710, y: 140 }, data: { label: 'Samuel Mwangi', type: 'person', summary: 'Facilities approver mentioned in lease routing.', linkedDocs: ['DOC-CON-2026-21903'] } },
	{ id: 'org-1', type: 'organization', position: { x: 700, y: 350 }, data: { label: 'Meridian Properties Ltd', type: 'organization', summary: 'Counterparty organization in lease and permits.', linkedDocs: ['DOC-CON-2026-21903', 'DOC-PRM-2026-77X'] } },
	{ id: 'date-1', type: 'date', position: { x: 1030, y: 190 }, data: { label: '2026-09-30', type: 'date', summary: 'Lease renewal effective date extracted from section 4.', linkedDocs: ['DOC-CON-2026-21903'] } },
	{ id: 'loc-1', type: 'location', position: { x: 980, y: 420 }, data: { label: 'Mombasa Depot', type: 'location', summary: 'Physical location referenced in lease and permit documents.', linkedDocs: ['DOC-CON-2026-21903', 'DOC-PRM-2026-77X'] } },
];

const initialEdges: EntityGraphEdge[] = [
	{ id: 'e1', source: 'doc-1', target: 'person-1', label: 'signed_by', data: { relationship: 'signed_by' }, type: 'smoothstep', animated: true },
	{ id: 'e2', source: 'doc-1', target: 'org-1', label: 'mentions', data: { relationship: 'mentions' }, type: 'smoothstep' },
	{ id: 'e3', source: 'doc-1', target: 'date-1', label: 'references', data: { relationship: 'references' }, type: 'smoothstep' },
	{ id: 'e4', source: 'doc-1', target: 'loc-1', label: 'related_to', data: { relationship: 'related_to' }, type: 'smoothstep' },
	{ id: 'e5', source: 'doc-2', target: 'person-2', label: 'authored_by', data: { relationship: 'authored_by' }, type: 'smoothstep' },
	{ id: 'e6', source: 'org-1', target: 'loc-1', label: 'related_to', data: { relationship: 'related_to' }, type: 'smoothstep' },
];

function EntityNode({ data, selected }: NodeProps<EntityGraphNode>) {
	const style = typeStyles[data.type];
	return (
		<div className={cn('min-w-[170px] rounded-xl border px-4 py-3 shadow-xl shadow-slate-950/40', style.bg, style.border)}>
			<div className="flex items-center gap-2">
				<span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
				<span className={cn('text-[11px] font-semibold uppercase tracking-[0.16em]', style.text)}>{data.type}</span>
			</div>
			<p className="mt-2 text-sm font-semibold text-slate-100">{data.label}</p>
			<p className="mt-1 line-clamp-2 text-xs text-slate-400">{data.summary}</p>
			{selected ? <div className="mt-2 h-1 rounded-full bg-brass-500" /> : null}
		</div>
	);
}

const nodeTypes: NodeTypes = {
	document: EntityNode,
	person: EntityNode,
	organization: EntityNode,
	date: EntityNode,
	location: EntityNode,
};

function GraphActions({ onCluster }: { onCluster: () => void }) {
	const { fitView, toObject } = useReactFlow<EntityGraphNode, EntityGraphEdge>();

	function exportGraph(format: 'svg' | 'png') {
		const payload = JSON.stringify(toObject(), null, 2);
		const blob = new Blob([payload], { type: 'application/json' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `entity-graph.${format}.json`;
		link.click();
		URL.revokeObjectURL(link.href);
	}

	return (
		<div className="absolute right-4 top-4 z-10 flex flex-wrap gap-2">
			<button type="button" onClick={() => fitView({ padding: 0.18, duration: 350 })} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">
				<Maximize2 className="h-3.5 w-3.5" />
				Fit
			</button>
			<button type="button" onClick={onCluster} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">
				<Sparkles className="h-3.5 w-3.5" />
				Cluster similar
			</button>
			<button type="button" onClick={() => exportGraph('png')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">
				<Download className="h-3.5 w-3.5" />
				PNG
			</button>
			<button type="button" onClick={() => exportGraph('svg')} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">
				<Download className="h-3.5 w-3.5" />
				SVG
			</button>
		</div>
	);
}

export function EntityGraphPage() {
	const [enabledTypes, setEnabledTypes] = useState<Set<EntityType>>(new Set(['document', 'person', 'organization', 'date', 'location']));
	const [selectedNode, setSelectedNode] = useState<EntityGraphNode | null>(initialNodes[0]);
	const [clustered, setClustered] = useState(false);
	const visibleNodes = useMemo(
		() =>
			initialNodes
				.filter((node) => enabledTypes.has(node.data.type))
				.map((node, index) =>
					clustered
						? {
								...node,
								position: {
									x: 120 + (index % 3) * 310,
									y: 90 + Math.floor(index / 3) * 210,
								},
							}
						: node,
				),
		[clustered, enabledTypes],
	);
	const visibleIds = new Set(visibleNodes.map((node) => node.id));
	const visibleEdges = initialEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1550px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<Network className="h-4 w-4" />
							Entity intelligence
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Document Entity Graph</h1>
						<p className="mt-2 text-sm text-slate-400">Explore document, person, organization, date, and location relationships extracted from OCR and metadata.</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/50 bg-slate-900 p-2">
						<Filter className="h-4 w-4 text-slate-500" />
						{(['document', 'person', 'organization', 'date', 'location'] as EntityType[]).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() =>
									setEnabledTypes((current) => {
										const next = new Set(current);
										if (next.has(type)) next.delete(type);
										else next.add(type);
										return next;
									})
								}
								className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize', enabledTypes.has(type) ? 'bg-brass-500 text-slate-950' : 'bg-slate-800 text-slate-400')}
							>
								{type}
							</button>
						))}
					</div>
				</header>

				<div className="grid min-h-[720px] gap-6 xl:grid-cols-[1fr_340px]">
					<section className="relative overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900">
						<ReactFlowProvider>
							<GraphActions onCluster={() => setClustered((value) => !value)} />
							<ReactFlow
								nodes={visibleNodes}
								edges={visibleEdges}
								nodeTypes={nodeTypes}
								onNodeClick={(_, node) => setSelectedNode(node as EntityGraphNode)}
								fitView
								proOptions={{ hideAttribution: true }}
								defaultEdgeOptions={{
									style: { stroke: '#64748b', strokeWidth: 1.8 },
									labelStyle: { fill: '#cbd5e1', fontSize: 11, fontWeight: 600 },
									labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
								}}
							>
								<Background color="#1e293b" gap={24} />
								<Controls className="!border-slate-700 !bg-slate-900 !text-slate-100" />
								<MiniMap
									nodeColor={(node) => typeStyles[(node.data as EntityNodeData).type].color}
									maskColor="rgba(8, 12, 20, 0.72)"
									className="!border !border-slate-800 !bg-slate-900"
								/>
							</ReactFlow>
						</ReactFlowProvider>
					</section>

					<aside className="rounded-xl border border-slate-800/50 bg-slate-900 p-5">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">Node Detail</h2>
								<p className="mt-1 text-sm text-slate-400">Entity information and linked documents.</p>
							</div>
							{selectedNode ? (
								<button type="button" onClick={() => setSelectedNode(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
									<X className="h-4 w-4" />
								</button>
							) : null}
						</div>
						{selectedNode ? (
							<div className="space-y-4">
								<div className={cn('rounded-xl border p-4', typeStyles[selectedNode.data.type].bg, typeStyles[selectedNode.data.type].border)}>
									<p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', typeStyles[selectedNode.data.type].text)}>{selectedNode.data.type}</p>
									<p className="mt-2 text-xl font-semibold text-slate-100">{selectedNode.data.label}</p>
									<p className="mt-3 text-sm leading-6 text-slate-300">{selectedNode.data.summary}</p>
								</div>
								<div>
									<p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Linked documents</p>
									<div className="space-y-2">
										{selectedNode.data.linkedDocs.map((doc) => (
											<div key={doc} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
												<GitBranch className="h-4 w-4 text-brass-500" />
												{doc}
											</div>
										))}
									</div>
								</div>
							</div>
						) : (
							<div className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-500">Select a graph node to inspect its relationships.</div>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
}

export default EntityGraphPage;
