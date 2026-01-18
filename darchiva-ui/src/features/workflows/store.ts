// (c) Copyright Datacraft, 2026
/**
 * Zustand store for workflow designer state management.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { WorkflowNode, WorkflowEdge, Workflow, WorkflowNodeType } from './types';
import { NODE_METADATA } from './types';

interface WorkflowDesignerState {
	// Current workflow
	workflow: Workflow | null;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];

	// UI state
	selectedNodeId: string | null;
	selectedEdgeId: string | null;
	isDirty: boolean;
	zoom: number;
	panPosition: { x: number; y: number };

	// Clipboard
	clipboard: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null;

	// History
	history: Array<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>;
	historyIndex: number;

	// Actions
	setWorkflow: (workflow: Workflow) => void;
	addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => string;
	updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
	deleteNode: (id: string) => void;
	addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => string;
	updateEdge: (id: string, updates: Partial<WorkflowEdge>) => void;
	deleteEdge: (id: string) => void;
	selectNode: (id: string | null) => void;
	selectEdge: (id: string | null) => void;
	setZoom: (zoom: number) => void;
	setPanPosition: (position: { x: number; y: number }) => void;
	undo: () => void;
	redo: () => void;
	copy: () => void;
	paste: (position: { x: number; y: number }) => void;
	clearSelection: () => void;
	reset: () => void;
	saveToHistory: () => void;
}

const generateId = () => `node_${Math.random().toString(36).substr(2, 9)}`;

export const useWorkflowStore = create<WorkflowDesignerState>()(
	immer((set, get) => ({
		workflow: null,
		nodes: [],
		edges: [],
		selectedNodeId: null,
		selectedEdgeId: null,
		isDirty: false,
		zoom: 1,
		panPosition: { x: 0, y: 0 },
		clipboard: null,
		history: [],
		historyIndex: -1,

		setWorkflow: (workflow) => {
			set((state) => {
				state.workflow = workflow;
				state.nodes = workflow.nodes;
				state.edges = workflow.edges;
				state.isDirty = false;
				state.history = [{ nodes: workflow.nodes, edges: workflow.edges }];
				state.historyIndex = 0;
			});
		},

		addNode: (type, position) => {
			const id = generateId();
			const metadata = NODE_METADATA[type];

			set((state) => {
				state.nodes.push({
					id,
					type,
					label: metadata.label,
					config: {},
					position,
				});
				state.isDirty = true;
				state.selectedNodeId = id;
			});

			get().saveToHistory();
			return id;
		},

		updateNode: (id, updates) => {
			set((state) => {
				const nodeIndex = state.nodes.findIndex((n) => n.id === id);
				if (nodeIndex !== -1) {
					Object.assign(state.nodes[nodeIndex], updates);
					state.isDirty = true;
				}
			});
			get().saveToHistory();
		},

		deleteNode: (id) => {
			set((state) => {
				state.nodes = state.nodes.filter((n) => n.id !== id);
				state.edges = state.edges.filter((e) => e.source !== id && e.target !== id);
				if (state.selectedNodeId === id) {
					state.selectedNodeId = null;
				}
				state.isDirty = true;
			});
			get().saveToHistory();
		},

		addEdge: (source, target, sourceHandle, targetHandle) => {
			// Prevent duplicate edges
			const existing = get().edges.find(
				(e) => e.source === source && e.target === target
			);
			if (existing) return existing.id;

			const id = `edge_${Math.random().toString(36).substr(2, 9)}`;

			set((state) => {
				state.edges.push({
					id,
					source,
					target,
					sourceHandle,
					targetHandle,
				});
				state.isDirty = true;
			});

			get().saveToHistory();
			return id;
		},

		updateEdge: (id, updates) => {
			set((state) => {
				const edgeIndex = state.edges.findIndex((e) => e.id === id);
				if (edgeIndex !== -1) {
					Object.assign(state.edges[edgeIndex], updates);
					state.isDirty = true;
				}
			});
			get().saveToHistory();
		},

		deleteEdge: (id) => {
			set((state) => {
				state.edges = state.edges.filter((e) => e.id !== id);
				if (state.selectedEdgeId === id) {
					state.selectedEdgeId = null;
				}
				state.isDirty = true;
			});
			get().saveToHistory();
		},

		selectNode: (id) => {
			set((state) => {
				state.selectedNodeId = id;
				state.selectedEdgeId = null;
			});
		},

		selectEdge: (id) => {
			set((state) => {
				state.selectedEdgeId = id;
				state.selectedNodeId = null;
			});
		},

		setZoom: (zoom) => {
			set((state) => {
				state.zoom = Math.max(0.1, Math.min(2, zoom));
			});
		},

		setPanPosition: (position) => {
			set((state) => {
				state.panPosition = position;
			});
		},

		undo: () => {
			const { historyIndex, history } = get();
			if (historyIndex > 0) {
				const newIndex = historyIndex - 1;
				const snapshot = history[newIndex];
				set((state) => {
					state.nodes = snapshot.nodes;
					state.edges = snapshot.edges;
					state.historyIndex = newIndex;
					state.isDirty = true;
				});
			}
		},

		redo: () => {
			const { historyIndex, history } = get();
			if (historyIndex < history.length - 1) {
				const newIndex = historyIndex + 1;
				const snapshot = history[newIndex];
				set((state) => {
					state.nodes = snapshot.nodes;
					state.edges = snapshot.edges;
					state.historyIndex = newIndex;
					state.isDirty = true;
				});
			}
		},

		copy: () => {
			const { selectedNodeId, nodes, edges } = get();
			if (!selectedNodeId) return;

			const nodesToCopy = nodes.filter((n) => n.id === selectedNodeId);
			const nodeIds = new Set(nodesToCopy.map((n) => n.id));
			const edgesToCopy = edges.filter(
				(e) => nodeIds.has(e.source) && nodeIds.has(e.target)
			);

			set((state) => {
				state.clipboard = { nodes: nodesToCopy, edges: edgesToCopy };
			});
		},

		paste: (position) => {
			const { clipboard } = get();
			if (!clipboard || clipboard.nodes.length === 0) return;

			const idMap = new Map<string, string>();

			set((state) => {
				// Paste nodes with new IDs
				const offsetX = position.x - clipboard.nodes[0].position.x;
				const offsetY = position.y - clipboard.nodes[0].position.y;

				clipboard.nodes.forEach((node) => {
					const newId = generateId();
					idMap.set(node.id, newId);
					state.nodes.push({
						...node,
						id: newId,
						position: {
							x: node.position.x + offsetX,
							y: node.position.y + offsetY,
						},
					});
				});

				// Paste edges with updated IDs
				clipboard.edges.forEach((edge) => {
					const newSource = idMap.get(edge.source);
					const newTarget = idMap.get(edge.target);
					if (newSource && newTarget) {
						state.edges.push({
							...edge,
							id: `edge_${Math.random().toString(36).substr(2, 9)}`,
							source: newSource,
							target: newTarget,
						});
					}
				});

				state.isDirty = true;
			});

			get().saveToHistory();
		},

		clearSelection: () => {
			set((state) => {
				state.selectedNodeId = null;
				state.selectedEdgeId = null;
			});
		},

		reset: () => {
			set((state) => {
				state.workflow = null;
				state.nodes = [];
				state.edges = [];
				state.selectedNodeId = null;
				state.selectedEdgeId = null;
				state.isDirty = false;
				state.history = [];
				state.historyIndex = -1;
			});
		},

		saveToHistory: () => {
			const { nodes, edges, historyIndex, history } = get();
			const newHistory = history.slice(0, historyIndex + 1);
			newHistory.push({ nodes: [...nodes], edges: [...edges] });

			// Limit history size
			if (newHistory.length > 50) {
				newHistory.shift();
			}

			set((state) => {
				state.history = newHistory;
				state.historyIndex = newHistory.length - 1;
			});
		},
	}))
);
