// (c) Copyright Datacraft, 2026
/**
 * Workflow designer type definitions.
 */

export type WorkflowNodeType =
	| 'source'
	| 'preprocess'
	| 'ocr'
	| 'nlp'
	| 'classify'
	| 'validate'
	| 'route'
	| 'store'
	| 'index'
	| 'notify'
	| 'transform'
	| 'condition'
	| 'approval'
	| 'merge'
	| 'split';

export interface WorkflowNodeConfig {
	[key: string]: unknown;
}

export interface WorkflowNode {
	id: string;
	type: WorkflowNodeType;
	label: string;
	config: WorkflowNodeConfig;
	position: { x: number; y: number };
}

export interface WorkflowEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string;
	targetHandle?: string;
	label?: string;
	condition?: string;
}

export interface Workflow {
	id: string;
	name: string;
	description: string;
	version: number;
	status: 'draft' | 'active' | 'archived';
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	trigger: WorkflowTrigger;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}

export interface WorkflowTrigger {
	type: 'document_upload' | 'schedule' | 'manual' | 'api' | 'folder_watch';
	config: Record<string, unknown>;
}

export interface WorkflowExecution {
	id: string;
	workflowId: string;
	workflowVersion: number;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	startTime: string;
	endTime?: string;
	currentNodeId?: string;
	documentId?: string;
	error?: string;
	nodeExecutions: NodeExecution[];
}

export interface NodeExecution {
	nodeId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
	startTime?: string;
	endTime?: string;
	input?: Record<string, unknown>;
	output?: Record<string, unknown>;
	error?: string;
}

export interface WorkflowTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	thumbnail?: string;
}

export const NODE_CATEGORIES = {
	input: ['source'],
	processing: ['preprocess', 'ocr', 'nlp', 'transform'],
	classification: ['classify', 'validate'],
	routing: ['route', 'condition', 'split', 'merge'],
	actions: ['store', 'index', 'notify', 'approval'],
};

export const NODE_METADATA: Record<
	WorkflowNodeType,
	{
		label: string;
		description: string;
		icon: string;
		color: string;
		inputs: number;
		outputs: number;
	}
> = {
	source: {
		label: 'Source',
		description: 'Document input source',
		icon: 'file-input',
		color: 'blue',
		inputs: 0,
		outputs: 1,
	},
	preprocess: {
		label: 'Preprocess',
		description: 'Image preprocessing (deskew, denoise)',
		icon: 'wand',
		color: 'purple',
		inputs: 1,
		outputs: 1,
	},
	ocr: {
		label: 'OCR',
		description: 'Optical character recognition',
		icon: 'scan',
		color: 'emerald',
		inputs: 1,
		outputs: 1,
	},
	nlp: {
		label: 'NLP Extract',
		description: 'Extract metadata using NLP',
		icon: 'brain',
		color: 'pink',
		inputs: 1,
		outputs: 1,
	},
	classify: {
		label: 'Classify',
		description: 'Document type classification',
		icon: 'tag',
		color: 'amber',
		inputs: 1,
		outputs: 1,
	},
	validate: {
		label: 'Validate',
		description: 'Data validation rules',
		icon: 'check-circle',
		color: 'green',
		inputs: 1,
		outputs: 2,
	},
	route: {
		label: 'Route',
		description: 'Route to destination',
		icon: 'git-branch',
		color: 'cyan',
		inputs: 1,
		outputs: 3,
	},
	store: {
		label: 'Store',
		description: 'Save to storage',
		icon: 'database',
		color: 'slate',
		inputs: 1,
		outputs: 1,
	},
	index: {
		label: 'Index',
		description: 'Add to search index',
		icon: 'search',
		color: 'indigo',
		inputs: 1,
		outputs: 1,
	},
	notify: {
		label: 'Notify',
		description: 'Send notification',
		icon: 'bell',
		color: 'orange',
		inputs: 1,
		outputs: 1,
	},
	transform: {
		label: 'Transform',
		description: 'Data transformation',
		icon: 'shuffle',
		color: 'violet',
		inputs: 1,
		outputs: 1,
	},
	condition: {
		label: 'Condition',
		description: 'Conditional branching',
		icon: 'git-merge',
		color: 'yellow',
		inputs: 1,
		outputs: 2,
	},
	approval: {
		label: 'Approval',
		description: 'Human approval step',
		icon: 'user-check',
		color: 'brass',
		inputs: 1,
		outputs: 2,
	},
	merge: {
		label: 'Merge',
		description: 'Merge multiple paths',
		icon: 'git-merge',
		color: 'teal',
		inputs: 3,
		outputs: 1,
	},
	split: {
		label: 'Split',
		description: 'Split into parallel paths',
		icon: 'git-fork',
		color: 'rose',
		inputs: 1,
		outputs: 3,
	},
};
