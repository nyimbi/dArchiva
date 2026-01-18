// (c) Copyright Datacraft, 2026
/**
 * Configuration panel for workflow nodes.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
	X,
	Trash2,
	Settings,
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
	Plus,
	ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowNode, WorkflowNodeType } from '../types';
import { NODE_METADATA } from '../types';

interface NodeConfigPanelProps {
	node: WorkflowNode;
	onUpdate: (updates: Partial<WorkflowNode>) => void;
	onClose: () => void;
	onDelete: () => void;
}

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

// Node-specific configuration schemas
const NODE_CONFIGS: Record<WorkflowNodeType, Array<{
	key: string;
	label: string;
	type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'json';
	options?: { value: string; label: string }[];
	default?: unknown;
	placeholder?: string;
	description?: string;
}>> = {
	source: [
		{
			key: 'sourceType',
			label: 'Source Type',
			type: 'select',
			options: [
				{ value: 'upload', label: 'File Upload' },
				{ value: 'folder', label: 'Folder Watch' },
				{ value: 'email', label: 'Email Attachment' },
				{ value: 'api', label: 'API Endpoint' },
				{ value: 'scanner', label: 'Scanner' },
			],
			default: 'upload',
		},
		{
			key: 'allowedFormats',
			label: 'Allowed Formats',
			type: 'text',
			placeholder: 'pdf,jpg,png,tiff',
			description: 'Comma-separated list of file extensions',
		},
	],
	preprocess: [
		{
			key: 'deskew',
			label: 'Auto Deskew',
			type: 'boolean',
			default: true,
		},
		{
			key: 'denoise',
			label: 'Denoise',
			type: 'boolean',
			default: true,
		},
		{
			key: 'contrast',
			label: 'Enhance Contrast',
			type: 'boolean',
			default: false,
		},
		{
			key: 'binarize',
			label: 'Binarize (B&W)',
			type: 'boolean',
			default: false,
		},
		{
			key: 'targetDpi',
			label: 'Target DPI',
			type: 'number',
			default: 300,
		},
	],
	ocr: [
		{
			key: 'engine',
			label: 'OCR Engine',
			type: 'select',
			options: [
				{ value: 'tesseract', label: 'Tesseract' },
				{ value: 'paddleocr', label: 'PaddleOCR' },
				{ value: 'qwen-vl', label: 'Qwen-VL (Vision LLM)' },
				{ value: 'hybrid', label: 'Hybrid (Best Match)' },
			],
			default: 'hybrid',
		},
		{
			key: 'language',
			label: 'Language',
			type: 'select',
			options: [
				{ value: 'eng', label: 'English' },
				{ value: 'deu', label: 'German' },
				{ value: 'fra', label: 'French' },
				{ value: 'spa', label: 'Spanish' },
				{ value: 'auto', label: 'Auto Detect' },
			],
			default: 'auto',
		},
		{
			key: 'pageSegMode',
			label: 'Page Segmentation',
			type: 'select',
			options: [
				{ value: 'auto', label: 'Auto' },
				{ value: 'single_column', label: 'Single Column' },
				{ value: 'single_block', label: 'Single Block' },
				{ value: 'sparse', label: 'Sparse Text' },
			],
			default: 'auto',
		},
	],
	nlp: [
		{
			key: 'model',
			label: 'SpaCy Model',
			type: 'select',
			options: [
				{ value: 'en_core_web_trf', label: 'English Transformer' },
				{ value: 'en_core_web_lg', label: 'English Large' },
				{ value: 'de_core_news_lg', label: 'German Large' },
			],
			default: 'en_core_web_trf',
		},
		{
			key: 'extractEntities',
			label: 'Extract Named Entities',
			type: 'boolean',
			default: true,
		},
		{
			key: 'extractDates',
			label: 'Extract Dates',
			type: 'boolean',
			default: true,
		},
		{
			key: 'extractAmounts',
			label: 'Extract Monetary Amounts',
			type: 'boolean',
			default: true,
		},
		{
			key: 'customPatterns',
			label: 'Custom Patterns (JSON)',
			type: 'json',
			placeholder: '[{"name": "invoice_no", "pattern": "INV-\\\\d+"}]',
		},
	],
	classify: [
		{
			key: 'classifierType',
			label: 'Classifier Type',
			type: 'select',
			options: [
				{ value: 'rule_based', label: 'Rule-Based' },
				{ value: 'ml', label: 'Machine Learning' },
				{ value: 'vlm', label: 'Vision LLM' },
			],
			default: 'vlm',
		},
		{
			key: 'documentTypes',
			label: 'Document Types',
			type: 'textarea',
			placeholder: 'invoice\ncontract\nreceipt\nletter',
			description: 'One document type per line',
		},
		{
			key: 'confidenceThreshold',
			label: 'Confidence Threshold',
			type: 'number',
			default: 0.8,
		},
	],
	validate: [
		{
			key: 'rules',
			label: 'Validation Rules (JSON)',
			type: 'json',
			placeholder: '[{"field": "total", "operator": "gt", "value": 0}]',
		},
		{
			key: 'requiredFields',
			label: 'Required Fields',
			type: 'text',
			placeholder: 'invoice_number,date,total',
		},
		{
			key: 'failAction',
			label: 'On Validation Fail',
			type: 'select',
			options: [
				{ value: 'reject', label: 'Reject Document' },
				{ value: 'flag', label: 'Flag for Review' },
				{ value: 'continue', label: 'Continue Anyway' },
			],
			default: 'flag',
		},
	],
	route: [
		{
			key: 'routingRules',
			label: 'Routing Rules (JSON)',
			type: 'json',
			placeholder: '[{"condition": "type == invoice", "target": "finance"}]',
		},
		{
			key: 'defaultRoute',
			label: 'Default Route',
			type: 'text',
			default: 'general',
		},
	],
	store: [
		{
			key: 'storageBackend',
			label: 'Storage Backend',
			type: 'select',
			options: [
				{ value: 'default', label: 'Default Storage' },
				{ value: 'linode', label: 'Linode Object Storage' },
				{ value: 's3', label: 'AWS S3' },
				{ value: 'r2', label: 'Cloudflare R2' },
			],
			default: 'default',
		},
		{
			key: 'folder',
			label: 'Destination Folder',
			type: 'text',
			placeholder: '/processed/{year}/{month}',
		},
		{
			key: 'retentionDays',
			label: 'Retention (Days)',
			type: 'number',
			default: 365,
		},
	],
	index: [
		{
			key: 'searchBackend',
			label: 'Search Backend',
			type: 'select',
			options: [
				{ value: 'postgres', label: 'PostgreSQL FTS' },
				{ value: 'elasticsearch', label: 'Elasticsearch' },
				{ value: 'meilisearch', label: 'Meilisearch' },
			],
			default: 'postgres',
		},
		{
			key: 'indexFields',
			label: 'Fields to Index',
			type: 'text',
			placeholder: 'content,title,metadata.*',
		},
		{
			key: 'generateEmbeddings',
			label: 'Generate Embeddings',
			type: 'boolean',
			default: true,
		},
	],
	notify: [
		{
			key: 'channel',
			label: 'Notification Channel',
			type: 'select',
			options: [
				{ value: 'email', label: 'Email' },
				{ value: 'slack', label: 'Slack' },
				{ value: 'webhook', label: 'Webhook' },
				{ value: 'in_app', label: 'In-App Notification' },
			],
			default: 'email',
		},
		{
			key: 'recipients',
			label: 'Recipients',
			type: 'text',
			placeholder: 'user@example.com, @channel',
		},
		{
			key: 'template',
			label: 'Message Template',
			type: 'textarea',
			placeholder: 'Document {{title}} has been processed.',
		},
	],
	transform: [
		{
			key: 'transformType',
			label: 'Transform Type',
			type: 'select',
			options: [
				{ value: 'map', label: 'Field Mapping' },
				{ value: 'format', label: 'Format Conversion' },
				{ value: 'merge', label: 'Merge Documents' },
				{ value: 'split', label: 'Split Pages' },
			],
			default: 'map',
		},
		{
			key: 'mapping',
			label: 'Field Mapping (JSON)',
			type: 'json',
			placeholder: '{"source_field": "target_field"}',
		},
	],
	condition: [
		{
			key: 'expression',
			label: 'Condition Expression',
			type: 'text',
			placeholder: 'document.type == "invoice" && document.total > 1000',
		},
		{
			key: 'trueLabel',
			label: 'True Path Label',
			type: 'text',
			default: 'Yes',
		},
		{
			key: 'falseLabel',
			label: 'False Path Label',
			type: 'text',
			default: 'No',
		},
	],
	approval: [
		{
			key: 'approvers',
			label: 'Approvers',
			type: 'text',
			placeholder: 'user@example.com, manager_role',
		},
		{
			key: 'approvalType',
			label: 'Approval Type',
			type: 'select',
			options: [
				{ value: 'any', label: 'Any Approver' },
				{ value: 'all', label: 'All Approvers' },
				{ value: 'sequential', label: 'Sequential' },
			],
			default: 'any',
		},
		{
			key: 'timeoutDays',
			label: 'Timeout (Days)',
			type: 'number',
			default: 7,
		},
		{
			key: 'timeoutAction',
			label: 'On Timeout',
			type: 'select',
			options: [
				{ value: 'escalate', label: 'Escalate' },
				{ value: 'auto_approve', label: 'Auto Approve' },
				{ value: 'auto_reject', label: 'Auto Reject' },
			],
			default: 'escalate',
		},
	],
	merge: [
		{
			key: 'waitForAll',
			label: 'Wait for All Inputs',
			type: 'boolean',
			default: true,
		},
		{
			key: 'timeout',
			label: 'Timeout (seconds)',
			type: 'number',
			default: 300,
		},
	],
	split: [
		{
			key: 'splitType',
			label: 'Split Type',
			type: 'select',
			options: [
				{ value: 'parallel', label: 'Parallel Execution' },
				{ value: 'conditional', label: 'Conditional Branches' },
			],
			default: 'parallel',
		},
	],
};

export function NodeConfigPanel({ node, onUpdate, onClose, onDelete }: NodeConfigPanelProps) {
	const metadata = NODE_METADATA[node.type];
	const Icon = ICONS[node.type];
	const configSchema = NODE_CONFIGS[node.type] || [];

	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));

	const toggleSection = useCallback((section: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(section)) {
				next.delete(section);
			} else {
				next.add(section);
			}
			return next;
		});
	}, []);

	const handleConfigChange = useCallback(
		(key: string, value: unknown) => {
			onUpdate({
				config: {
					...node.config,
					[key]: value,
				},
			});
		},
		[node.config, onUpdate]
	);

	const renderField = useCallback(
		(field: typeof configSchema[0]) => {
			const value = node.config[field.key] ?? field.default ?? '';

			switch (field.type) {
				case 'text':
					return (
						<input
							type="text"
							value={String(value)}
							onChange={(e) => handleConfigChange(field.key, e.target.value)}
							placeholder={field.placeholder}
							className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
						/>
					);

				case 'number':
					return (
						<input
							type="number"
							value={Number(value)}
							onChange={(e) => handleConfigChange(field.key, parseFloat(e.target.value))}
							className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
						/>
					);

				case 'select':
					return (
						<select
							value={String(value)}
							onChange={(e) => handleConfigChange(field.key, e.target.value)}
							className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
						>
							{field.options?.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					);

				case 'boolean':
					return (
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={Boolean(value)}
								onChange={(e) => handleConfigChange(field.key, e.target.checked)}
								className="sr-only peer"
							/>
							<div className="w-9 h-5 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brass-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brass-500" />
						</label>
					);

				case 'textarea':
					return (
						<textarea
							value={String(value)}
							onChange={(e) => handleConfigChange(field.key, e.target.value)}
							placeholder={field.placeholder}
							rows={3}
							className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 resize-none"
						/>
					);

				case 'json':
					return (
						<textarea
							value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
							onChange={(e) => {
								try {
									const parsed = JSON.parse(e.target.value);
									handleConfigChange(field.key, parsed);
								} catch {
									handleConfigChange(field.key, e.target.value);
								}
							}}
							placeholder={field.placeholder}
							rows={4}
							className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 resize-none font-mono"
						/>
					);

				default:
					return null;
			}
		},
		[node.config, handleConfigChange]
	);

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-slate-700/50">
						<Icon className="w-4 h-4 text-slate-300" />
					</div>
					<div>
						<h3 className="text-sm font-medium text-slate-100">{metadata.label}</h3>
						<p className="text-xs text-slate-500">{metadata.description}</p>
					</div>
				</div>
				<button
					onClick={onClose}
					className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* General Section */}
				<div className="space-y-3">
					<button
						onClick={() => toggleSection('general')}
						className="w-full flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider"
					>
						General
						<ChevronDown
							className={cn(
								'w-3 h-3 transition-transform',
								expandedSections.has('general') && 'rotate-180'
							)}
						/>
					</button>
					{expandedSections.has('general') && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							className="space-y-3"
						>
							<div className="space-y-1">
								<label className="text-xs text-slate-500">Label</label>
								<input
									type="text"
									value={node.label}
									onChange={(e) => onUpdate({ label: e.target.value })}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
								/>
							</div>
						</motion.div>
					)}
				</div>

				{/* Configuration Section */}
				{configSchema.length > 0 && (
					<div className="space-y-3">
						<button
							onClick={() => toggleSection('config')}
							className="w-full flex items-center justify-between text-xs font-medium text-slate-400 uppercase tracking-wider"
						>
							Configuration
							<ChevronDown
								className={cn(
									'w-3 h-3 transition-transform',
									expandedSections.has('config') && 'rotate-180'
								)}
							/>
						</button>
						{expandedSections.has('config') && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								className="space-y-4"
							>
								{configSchema.map((field) => (
									<div key={field.key} className="space-y-1">
										<label className="text-xs text-slate-500">{field.label}</label>
										{renderField(field)}
										{field.description && (
											<p className="text-[10px] text-slate-600">{field.description}</p>
										)}
									</div>
								))}
							</motion.div>
						)}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-slate-700/50">
				<button
					onClick={onDelete}
					className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
				>
					<Trash2 className="w-4 h-4" />
					Delete Node
				</button>
			</div>
		</div>
	);
}
