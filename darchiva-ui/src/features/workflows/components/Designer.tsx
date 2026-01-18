// (c) Copyright Datacraft, 2026
/**
 * Visual workflow designer using React Flow.
 */
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	Panel,
	useNodesState,
	useEdgesState,
	addEdge,
	type Connection,
	type Edge,
	type Node,
	MarkerType,
	BackgroundVariant,
	useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Save,
	Play,
	Pause,
	Undo2,
	Redo2,
	ZoomIn,
	ZoomOut,
	Maximize2,
	Grid3X3,
	Plus,
	Settings,
	Trash2,
	Copy,
	X,
	ChevronRight,
	FileInput,
	Wand2,
	Scan,
	Brain,
	Tag,
	CheckCircle2,
	GitBranch,
	Database,
	Search,
	Bell,
	Shuffle,
	GitMerge,
	UserCheck,
	Split,
	Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowNodeView } from './WorkflowNode';
import { NodeConfigPanel } from './NodeConfigPanel';
import { useWorkflowStore } from '../store';
import type { WorkflowNodeType, WorkflowNode as WFNode } from '../types';
import { NODE_METADATA, NODE_CATEGORIES } from '../types';

const nodeTypes = {
	workflowNode: WorkflowNodeView,
};

const ICONS: Record<WorkflowNodeType, typeof FileInput> = {
	source: FileInput,
	preprocess: Wand2,
	ocr: Scan,
	nlp: Brain,
	classify: Tag,
	validate: CheckCircle2,
	route: GitBranch,
	store: Database,
	index: Search,
	notify: Bell,
	transform: Shuffle,
	condition: GitMerge,
	approval: UserCheck,
	merge: GitMerge,
	split: Split,
};

interface DesignerProps {
	workflowId?: string;
	onSave?: (nodes: WFNode[], edges: any[]) => void;
	onRun?: (nodes: WFNode[], edges: any[]) => void;
	isReadOnly?: boolean;
}

export function Designer({ workflowId, onSave, onRun, isReadOnly }: DesignerProps) {
	const reactFlowWrapper = useRef<HTMLDivElement>(null);
	const [showNodePalette, setShowNodePalette] = useState(true);
	const [showMiniMap, setShowMiniMap] = useState(true);
	const [expandedCategory, setExpandedCategory] = useState<string | null>('input');

	const {
		nodes: storeNodes,
		edges: storeEdges,
		selectedNodeId,
		isDirty,
		addNode,
		updateNode,
		deleteNode,
		addEdge: storeAddEdge,
		deleteEdge,
		selectNode,
		undo,
		redo,
		copy,
		paste,
		history,
		historyIndex,
	} = useWorkflowStore();

	// Convert store nodes to React Flow format
	const initialNodes: Node[] = useMemo(
		() =>
			storeNodes.map((node) => ({
				id: node.id,
				type: 'workflowNode',
				position: node.position,
				data: {
					type: node.type,
					label: node.label,
					config: node.config,
				},
			})),
		[storeNodes]
	);

	const initialEdges: Edge[] = useMemo(
		() =>
			storeEdges.map((edge) => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
				sourceHandle: edge.sourceHandle,
				targetHandle: edge.targetHandle,
				label: edge.label,
				labelStyle: { fill: '#94a3b8', fontSize: 10 },
				labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
				style: {
					stroke: '#64748b',
					strokeWidth: 2,
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
					color: '#64748b',
				},
				animated: false,
			})),
		[storeEdges]
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Sync with store
	useEffect(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	const onConnect = useCallback(
		(params: Connection) => {
			if (!params.source || !params.target) return;
			storeAddEdge(
				params.source,
				params.target,
				params.sourceHandle ?? undefined,
				params.targetHandle ?? undefined
			);
		},
		[storeAddEdge]
	);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node) => {
			selectNode(node.id);
		},
		[selectNode]
	);

	const onPaneClick = useCallback(() => {
		selectNode(null);
	}, [selectNode]);

	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}, []);

	const onDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();

			const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
			if (!type) return;

			const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
			if (!reactFlowBounds) return;

			const position = {
				x: event.clientX - reactFlowBounds.left - 75,
				y: event.clientY - reactFlowBounds.top - 25,
			};

			addNode(type, position);
		},
		[addNode]
	);

	const handleDeleteSelected = useCallback(() => {
		if (selectedNodeId) {
			deleteNode(selectedNodeId);
		}
	}, [selectedNodeId, deleteNode]);

	const handleSave = useCallback(() => {
		onSave?.(storeNodes, storeEdges);
	}, [storeNodes, storeEdges, onSave]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isReadOnly) return;

			if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
				e.preventDefault();
				if (e.shiftKey) {
					redo();
				} else {
					undo();
				}
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
				e.preventDefault();
				copy();
			}
			if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
				e.preventDefault();
				paste({ x: 100, y: 100 });
			}
			if (e.key === 'Delete' || e.key === 'Backspace') {
				if (selectedNodeId) {
					e.preventDefault();
					handleDeleteSelected();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [undo, redo, copy, paste, selectedNodeId, handleDeleteSelected, isReadOnly]);

	const selectedNode = useMemo(
		() => storeNodes.find((n) => n.id === selectedNodeId),
		[storeNodes, selectedNodeId]
	);

	return (
		<div className="h-full flex flex-col bg-slate-900">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1">
						<button
							onClick={() => setShowNodePalette(!showNodePalette)}
							className={cn(
								'p-2 rounded-lg transition-colors',
								showNodePalette
									? 'bg-brass-500/20 text-brass-400'
									: 'text-slate-400 hover:bg-slate-700/50'
							)}
							title="Toggle Node Palette"
						>
							<Layers className="w-4 h-4" />
						</button>
						<button
							onClick={() => setShowMiniMap(!showMiniMap)}
							className={cn(
								'p-2 rounded-lg transition-colors',
								showMiniMap
									? 'bg-brass-500/20 text-brass-400'
									: 'text-slate-400 hover:bg-slate-700/50'
							)}
							title="Toggle Mini Map"
						>
							<Grid3X3 className="w-4 h-4" />
						</button>
					</div>

					<div className="h-6 w-px bg-slate-700" />

					<div className="flex items-center gap-1">
						<button
							onClick={undo}
							disabled={historyIndex <= 0 || isReadOnly}
							className="p-2 rounded-lg text-slate-400 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							title="Undo (Ctrl+Z)"
						>
							<Undo2 className="w-4 h-4" />
						</button>
						<button
							onClick={redo}
							disabled={historyIndex >= history.length - 1 || isReadOnly}
							className="p-2 rounded-lg text-slate-400 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							title="Redo (Ctrl+Shift+Z)"
						>
							<Redo2 className="w-4 h-4" />
						</button>
					</div>

					<div className="h-6 w-px bg-slate-700" />

					<button
						onClick={handleDeleteSelected}
						disabled={!selectedNodeId || isReadOnly}
						className="p-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
						title="Delete Selected"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				</div>

				<div className="flex items-center gap-3">
					{isDirty && (
						<span className="text-xs text-amber-400 flex items-center gap-1">
							<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
							Unsaved changes
						</span>
					)}

					<button
						onClick={() => onRun?.(storeNodes, storeEdges)}
						disabled={isReadOnly || storeNodes.length === 0}
						className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
					>
						<Play className="w-4 h-4" />
						Test Run
					</button>

					<button
						onClick={handleSave}
						disabled={!isDirty || isReadOnly}
						className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brass-500 text-slate-900 font-medium hover:bg-brass-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<Save className="w-4 h-4" />
						Save
					</button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Node Palette */}
				<AnimatePresence>
					{showNodePalette && (
						<motion.div
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 220, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							className="border-r border-slate-700/50 bg-slate-800/30 overflow-hidden"
						>
							<div className="p-3 border-b border-slate-700/50">
								<h3 className="text-sm font-medium text-slate-300">Node Types</h3>
							</div>
							<div className="p-2 space-y-1 overflow-y-auto h-full">
								{Object.entries(NODE_CATEGORIES).map(([category, types]) => (
									<div key={category}>
										<button
											onClick={() =>
												setExpandedCategory(
													expandedCategory === category ? null : category
												)
											}
											className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-medium text-slate-400 hover:bg-slate-700/50 capitalize"
										>
											{category}
											<ChevronRight
												className={cn(
													'w-3 h-3 transition-transform',
													expandedCategory === category && 'rotate-90'
												)}
											/>
										</button>
										<AnimatePresence>
											{expandedCategory === category && (
												<motion.div
													initial={{ height: 0 }}
													animate={{ height: 'auto' }}
													exit={{ height: 0 }}
													className="overflow-hidden"
												>
													<div className="space-y-1 py-1">
														{types.map((type) => {
															const metadata = NODE_METADATA[type as WorkflowNodeType];
															const Icon = ICONS[type as WorkflowNodeType];
															return (
																<div
																	key={type}
																	draggable={!isReadOnly}
																	onDragStart={(e) => {
																		e.dataTransfer.setData('application/reactflow', type);
																		e.dataTransfer.effectAllowed = 'move';
																	}}
																	className={cn(
																		'flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors',
																		'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600',
																		isReadOnly && 'cursor-not-allowed opacity-50'
																	)}
																>
																	<Icon className="w-4 h-4 text-slate-400" />
																	<span className="text-sm text-slate-300">
																		{metadata.label}
																	</span>
																</div>
															);
														})}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Canvas */}
				<div ref={reactFlowWrapper} className="flex-1">
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeClick={onNodeClick}
						onPaneClick={onPaneClick}
						onDragOver={onDragOver}
						onDrop={onDrop}
						nodeTypes={nodeTypes}
						fitView
						snapToGrid
						snapGrid={[15, 15]}
						defaultEdgeOptions={{
							type: 'smoothstep',
							markerEnd: { type: MarkerType.ArrowClosed },
						}}
						className="bg-slate-900"
					>
						<Background
							variant={BackgroundVariant.Dots}
							gap={20}
							size={1}
							color="#334155"
						/>
						<Controls
							showInteractive={false}
							className="!bg-slate-800/80 !border-slate-700/50 !rounded-lg overflow-hidden [&>button]:!bg-slate-800 [&>button]:!border-slate-700/50 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700"
						/>
						{showMiniMap && (
							<MiniMap
								nodeColor={(node) => {
									const type = node.data?.type as WorkflowNodeType;
									const color = NODE_METADATA[type]?.color || 'slate';
									const colorMap: Record<string, string> = {
										blue: '#3b82f6',
										purple: '#8b5cf6',
										emerald: '#10b981',
										pink: '#ec4899',
										amber: '#f59e0b',
										green: '#22c55e',
										cyan: '#06b6d4',
										slate: '#64748b',
										indigo: '#6366f1',
										orange: '#f97316',
										violet: '#8b5cf6',
										yellow: '#eab308',
										brass: '#f59e0b',
										teal: '#14b8a6',
										rose: '#f43f5e',
									};
									return colorMap[color] || '#64748b';
								}}
								maskColor="rgba(15, 23, 42, 0.8)"
								className="!bg-slate-800/80 !border-slate-700/50 !rounded-lg"
							/>
						)}
					</ReactFlow>
				</div>

				{/* Config Panel */}
				<AnimatePresence>
					{selectedNode && !isReadOnly && (
						<motion.div
							initial={{ width: 0, opacity: 0 }}
							animate={{ width: 300, opacity: 1 }}
							exit={{ width: 0, opacity: 0 }}
							className="border-l border-slate-700/50 bg-slate-800/30 overflow-hidden"
						>
							<NodeConfigPanel
								node={selectedNode}
								onUpdate={(updates) => updateNode(selectedNode.id, updates)}
								onClose={() => selectNode(null)}
								onDelete={() => deleteNode(selectedNode.id)}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
