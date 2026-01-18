// (c) Copyright Datacraft, 2026
/**
 * Interactive access graph visualization using React Flow.
 * Shows relationships between users, roles, groups, departments, and resources.
 */
import { useCallback, useMemo, useState } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	Handle,
	Position,
	type Node,
	type Edge,
	type NodeProps,
	MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
	User,
	Users,
	Shield,
	Building2,
	FileText,
	GitBranch,
	X,
	Maximize2,
	Filter,
	Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccessGraphNode, AccessGraphEdge } from '../types';

interface AccessGraphProps {
	nodes: AccessGraphNode[];
	edges: AccessGraphEdge[];
	onNodeClick?: (node: AccessGraphNode) => void;
	onEdgeClick?: (edge: AccessGraphEdge) => void;
	selectedUserId?: string;
	selectedResourceId?: string;
}

interface AccessNodeData extends Record<string, unknown> {
	label: string;
	type: 'user' | 'role' | 'group' | 'department' | 'resource';
	highlighted?: boolean;
}

const NODE_ICONS = {
	user: User,
	role: Shield,
	group: Users,
	department: Building2,
	resource: FileText,
};

const NODE_COLORS = {
	user: {
		bg: 'bg-blue-500/20',
		border: 'border-blue-500/50',
		text: 'text-blue-400',
		glow: 'shadow-blue-500/20',
	},
	role: {
		bg: 'bg-brass-500/20',
		border: 'border-brass-500/50',
		text: 'text-brass-400',
		glow: 'shadow-brass-500/20',
	},
	group: {
		bg: 'bg-purple-500/20',
		border: 'border-purple-500/50',
		text: 'text-purple-400',
		glow: 'shadow-purple-500/20',
	},
	department: {
		bg: 'bg-emerald-500/20',
		border: 'border-emerald-500/50',
		text: 'text-emerald-400',
		glow: 'shadow-emerald-500/20',
	},
	resource: {
		bg: 'bg-cyan-500/20',
		border: 'border-cyan-500/50',
		text: 'text-cyan-400',
		glow: 'shadow-cyan-500/20',
	},
};

const EDGE_COLORS = {
	member_of: '#f59e0b',
	has_role: '#3b82f6',
	belongs_to: '#8b5cf6',
	can_access: '#10b981',
	owns: '#ef4444',
	manages: '#06b6d4',
};

// Custom node component
function AccessNode({ data, selected }: NodeProps<Node<AccessNodeData>>) {
	const nodeType = data.type as keyof typeof NODE_ICONS;
	const Icon = NODE_ICONS[nodeType] || FileText;
	const colors = NODE_COLORS[nodeType] || NODE_COLORS.resource;

	return (
		<div
			className={cn(
				'relative px-4 py-3 rounded-xl border-2 backdrop-blur-sm transition-all duration-200',
				colors.bg,
				colors.border,
				selected && `ring-2 ring-offset-2 ring-offset-slate-900 ring-brass-500 shadow-lg ${colors.glow}`
			)}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-slate-600 !border-slate-500 !w-3 !h-3"
			/>
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-slate-600 !border-slate-500 !w-3 !h-3"
			/>

			<div className="flex items-center gap-3">
				<div className={cn('p-2 rounded-lg', colors.bg)}>
					<Icon className={cn('w-5 h-5', colors.text)} />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-medium text-slate-100 truncate max-w-[120px]">
						{data.label}
					</p>
					<p className="text-xs text-slate-500 capitalize">{data.type}</p>
				</div>
			</div>

			{/* Highlight indicator */}
			{data.highlighted && (
				<motion.div
					initial={{ scale: 1.5, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brass-400 animate-pulse"
				/>
			)}
		</div>
	);
}

const nodeTypes = {
	access: AccessNode,
};

export function AccessGraph({
	nodes: graphNodes,
	edges: graphEdges,
	onNodeClick,
	onEdgeClick,
	selectedUserId,
	selectedResourceId,
}: AccessGraphProps) {
	const [showMiniMap, setShowMiniMap] = useState(true);
	const [showFilters, setShowFilters] = useState(false);
	const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
		new Set(['user', 'role', 'group', 'department', 'resource'])
	);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedNode, setSelectedNode] = useState<AccessGraphNode | null>(null);

	// Transform graph data to React Flow format
	const { initialNodes, initialEdges } = useMemo(() => {
		const filteredNodes = graphNodes.filter(
			(n) =>
				visibleTypes.has(n.type) &&
				(!searchQuery || n.label.toLowerCase().includes(searchQuery.toLowerCase()))
		);
		const nodeIds = new Set(filteredNodes.map((n) => n.id));

		// Layout nodes using dagre-style positioning
		const nodesByType: Record<string, AccessGraphNode[]> = {};
		filteredNodes.forEach((node) => {
			if (!nodesByType[node.type]) nodesByType[node.type] = [];
			nodesByType[node.type].push(node);
		});

		const typeOrder = ['user', 'group', 'department', 'role', 'resource'];
		const nodesWithPosition: Node[] = [];
		let yOffset = 0;

		typeOrder.forEach((type) => {
			const nodesOfType = nodesByType[type] || [];
			nodesOfType.forEach((node, idx) => {
				const isHighlighted =
					node.id === selectedUserId ||
					node.id === selectedResourceId;
				nodesWithPosition.push({
					id: node.id,
					type: 'access',
					position: {
						x: 150 + idx * 220,
						y: yOffset,
					},
					data: {
						...node.data,
						label: node.label,
						type: node.type,
						highlighted: isHighlighted,
					},
				});
			});
			if (nodesOfType.length > 0) {
				yOffset += 150;
			}
		});

		const flowEdges: Edge[] = graphEdges
			.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
			.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
				label: edge.relation.replace(/_/g, ' '),
				labelStyle: { fill: '#94a3b8', fontSize: 10 },
				labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
				style: {
					stroke: EDGE_COLORS[edge.relation as keyof typeof EDGE_COLORS] || '#64748b',
					strokeWidth: edge.inherited ? 1 : 2,
					strokeDasharray: edge.inherited ? '5,5' : undefined,
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: EDGE_COLORS[edge.relation as keyof typeof EDGE_COLORS] || '#64748b',
				},
				animated: !edge.inherited,
			}));

		return { initialNodes: nodesWithPosition, initialEdges: flowEdges };
	}, [graphNodes, graphEdges, visibleTypes, searchQuery, selectedUserId, selectedResourceId]);

	const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const handleNodeClick = useCallback(
		(_event: React.MouseEvent, node: Node) => {
			const graphNode = graphNodes.find((n) => n.id === node.id);
			if (graphNode) {
				setSelectedNode(graphNode);
				onNodeClick?.(graphNode);
			}
		},
		[graphNodes, onNodeClick]
	);

	const handleEdgeClick = useCallback(
		(_event: React.MouseEvent, edge: Edge) => {
			const graphEdge = graphEdges.find((e) => e.id === edge.id);
			if (graphEdge) {
				onEdgeClick?.(graphEdge);
			}
		},
		[graphEdges, onEdgeClick]
	);

	const toggleTypeFilter = useCallback((type: string) => {
		setVisibleTypes((prev) => {
			const next = new Set(prev);
			if (next.has(type)) {
				next.delete(type);
			} else {
				next.add(type);
			}
			return next;
		});
	}, []);

	return (
		<div className="glass-card h-[600px] overflow-hidden relative">
			{/* Header */}
			<div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-slate-900 via-slate-900/90 to-transparent pointer-events-none">
				<div className="flex items-center justify-between pointer-events-auto">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10">
							<GitBranch className="w-5 h-5 text-brass-400" />
						</div>
						<div>
							<h2 className="font-display font-semibold text-slate-100">Access Graph</h2>
							<p className="text-xs text-slate-500 mt-0.5">
								{nodes.length} nodes × {edges.length} relationships
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
							<input
								type="text"
								placeholder="Search nodes..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-40 pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
							/>
						</div>

						{/* Filter Toggle */}
						<button
							onClick={() => setShowFilters(!showFilters)}
							className={cn(
								'p-2 rounded-lg border transition-colors',
								showFilters
									? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
									: 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:bg-slate-700/80'
							)}
						>
							<Filter className="w-4 h-4" />
						</button>

						{/* MiniMap Toggle */}
						<button
							onClick={() => setShowMiniMap(!showMiniMap)}
							className={cn(
								'p-2 rounded-lg border transition-colors',
								showMiniMap
									? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
									: 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:bg-slate-700/80'
							)}
						>
							<Maximize2 className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Filter Panel */}
				<AnimatePresence>
					{showFilters && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className="mt-3 flex items-center gap-2 overflow-hidden"
						>
							{Object.entries(NODE_COLORS).map(([type, colors]) => {
								const Icon = NODE_ICONS[type as keyof typeof NODE_ICONS];
								const isActive = visibleTypes.has(type);
								return (
									<button
										key={type}
										onClick={() => toggleTypeFilter(type)}
										className={cn(
											'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm capitalize transition-all',
											isActive
												? `${colors.bg} ${colors.border} ${colors.text}`
												: 'bg-slate-800/50 border-slate-700/50 text-slate-500'
										)}
									>
										<Icon className="w-4 h-4" />
										{type}s
									</button>
								);
							})}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Graph */}
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onNodeClick={handleNodeClick}
				onEdgeClick={handleEdgeClick}
				nodeTypes={nodeTypes}
				fitView
				fitViewOptions={{ padding: 0.3 }}
				className="bg-slate-900"
			>
				<Background color="#334155" gap={20} size={1} />
				<Controls
					showInteractive={false}
					className="!bg-slate-800/80 !border-slate-700/50 !rounded-lg overflow-hidden [&>button]:!bg-slate-800 [&>button]:!border-slate-700/50 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700"
				/>
				{showMiniMap && (
					<MiniMap
						nodeColor={(node) => {
							const type = node.data?.type as keyof typeof NODE_COLORS;
							if (type === 'user') return '#3b82f6';
							if (type === 'role') return '#f59e0b';
							if (type === 'group') return '#8b5cf6';
							if (type === 'department') return '#10b981';
							return '#06b6d4';
						}}
						maskColor="rgba(15, 23, 42, 0.8)"
						className="!bg-slate-800/80 !border-slate-700/50 !rounded-lg"
					/>
				)}
			</ReactFlow>

			{/* Selected Node Panel */}
			<AnimatePresence>
				{selectedNode && (
					<motion.div
						initial={{ x: 300, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 300, opacity: 0 }}
						className="absolute right-0 top-0 bottom-0 w-72 bg-slate-800/95 backdrop-blur-sm border-l border-slate-700/50 p-4 overflow-y-auto"
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-display font-semibold text-slate-100">Node Details</h3>
							<button
								onClick={() => setSelectedNode(null)}
								className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="space-y-4">
							<div className="flex items-center gap-3">
								{(() => {
									const Icon = NODE_ICONS[selectedNode.type as keyof typeof NODE_ICONS];
									const colors = NODE_COLORS[selectedNode.type as keyof typeof NODE_COLORS];
									return (
										<>
											<div className={cn('p-3 rounded-xl', colors.bg)}>
												<Icon className={cn('w-6 h-6', colors.text)} />
											</div>
											<div>
												<p className="font-medium text-slate-100">{selectedNode.label}</p>
												<p className="text-sm text-slate-500 capitalize">{selectedNode.type}</p>
											</div>
										</>
									);
								})()}
							</div>

							<div className="space-y-3">
								<h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
									Properties
								</h4>
								{Object.entries(selectedNode.data).map(([key, value]) => (
									<div
										key={key}
										className="flex items-center justify-between py-2 border-b border-slate-700/30"
									>
										<span className="text-sm text-slate-400">{key}</span>
										<span className="text-sm text-slate-200 font-mono">
											{String(value)}
										</span>
									</div>
								))}
							</div>

							<div className="space-y-3">
								<h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
									Connections
								</h4>
								<div className="space-y-2">
									{graphEdges
										.filter(
											(e) => e.source === selectedNode.id || e.target === selectedNode.id
										)
										.slice(0, 8)
										.map((edge) => {
											const isOutgoing = edge.source === selectedNode.id;
											const connectedId = isOutgoing ? edge.target : edge.source;
											const connectedNode = graphNodes.find((n) => n.id === connectedId);
											return (
												<div
													key={edge.id}
													className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30"
												>
													<span
														className={cn(
															'text-xs px-1.5 py-0.5 rounded',
															isOutgoing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
														)}
													>
														{isOutgoing ? 'to' : 'from'}
													</span>
													<span className="text-xs text-slate-400">
														{edge.relation.replace(/_/g, ' ')}
													</span>
													<span className="text-sm text-slate-200 truncate flex-1">
														{connectedNode?.label}
													</span>
												</div>
											);
										})}
								</div>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Legend */}
			<div className="absolute bottom-4 left-4 p-3 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg">
				<p className="text-xs text-slate-500 mb-2">Edge Types</p>
				<div className="flex flex-wrap gap-2">
					{Object.entries(EDGE_COLORS).map(([relation, color]) => (
						<div key={relation} className="flex items-center gap-1.5">
							<div
								className="w-4 h-0.5 rounded-full"
								style={{ backgroundColor: color }}
							/>
							<span className="text-[10px] text-slate-400">
								{relation.replace(/_/g, ' ')}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
