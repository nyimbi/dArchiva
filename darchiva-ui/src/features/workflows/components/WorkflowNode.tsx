// (c) Copyright Datacraft, 2026
/**
 * Custom workflow node component for React Flow.
 */
import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { motion } from 'framer-motion';
import {
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowNodeType } from '../types';
import { NODE_METADATA } from '../types';

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

const COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
	blue: {
		bg: 'bg-blue-500/20',
		border: 'border-blue-500/50 hover:border-blue-400',
		text: 'text-blue-400',
		glow: 'shadow-blue-500/30',
	},
	purple: {
		bg: 'bg-purple-500/20',
		border: 'border-purple-500/50 hover:border-purple-400',
		text: 'text-purple-400',
		glow: 'shadow-purple-500/30',
	},
	emerald: {
		bg: 'bg-emerald-500/20',
		border: 'border-emerald-500/50 hover:border-emerald-400',
		text: 'text-emerald-400',
		glow: 'shadow-emerald-500/30',
	},
	pink: {
		bg: 'bg-pink-500/20',
		border: 'border-pink-500/50 hover:border-pink-400',
		text: 'text-pink-400',
		glow: 'shadow-pink-500/30',
	},
	amber: {
		bg: 'bg-amber-500/20',
		border: 'border-amber-500/50 hover:border-amber-400',
		text: 'text-amber-400',
		glow: 'shadow-amber-500/30',
	},
	green: {
		bg: 'bg-green-500/20',
		border: 'border-green-500/50 hover:border-green-400',
		text: 'text-green-400',
		glow: 'shadow-green-500/30',
	},
	cyan: {
		bg: 'bg-cyan-500/20',
		border: 'border-cyan-500/50 hover:border-cyan-400',
		text: 'text-cyan-400',
		glow: 'shadow-cyan-500/30',
	},
	slate: {
		bg: 'bg-slate-500/20',
		border: 'border-slate-500/50 hover:border-slate-400',
		text: 'text-slate-400',
		glow: 'shadow-slate-500/30',
	},
	indigo: {
		bg: 'bg-indigo-500/20',
		border: 'border-indigo-500/50 hover:border-indigo-400',
		text: 'text-indigo-400',
		glow: 'shadow-indigo-500/30',
	},
	orange: {
		bg: 'bg-orange-500/20',
		border: 'border-orange-500/50 hover:border-orange-400',
		text: 'text-orange-400',
		glow: 'shadow-orange-500/30',
	},
	violet: {
		bg: 'bg-violet-500/20',
		border: 'border-violet-500/50 hover:border-violet-400',
		text: 'text-violet-400',
		glow: 'shadow-violet-500/30',
	},
	yellow: {
		bg: 'bg-yellow-500/20',
		border: 'border-yellow-500/50 hover:border-yellow-400',
		text: 'text-yellow-400',
		glow: 'shadow-yellow-500/30',
	},
	brass: {
		bg: 'bg-brass-500/20',
		border: 'border-brass-500/50 hover:border-brass-400',
		text: 'text-brass-400',
		glow: 'shadow-brass-500/30',
	},
	teal: {
		bg: 'bg-teal-500/20',
		border: 'border-teal-500/50 hover:border-teal-400',
		text: 'text-teal-400',
		glow: 'shadow-teal-500/30',
	},
	rose: {
		bg: 'bg-rose-500/20',
		border: 'border-rose-500/50 hover:border-rose-400',
		text: 'text-rose-400',
		glow: 'shadow-rose-500/30',
	},
};

interface WorkflowNodeData extends Record<string, unknown> {
	type: WorkflowNodeType;
	label: string;
	config?: Record<string, unknown>;
	isRunning?: boolean;
	isCompleted?: boolean;
	hasError?: boolean;
}

function WorkflowNodeComponent({ data, selected }: NodeProps<Node<WorkflowNodeData>>) {
	const nodeType = data.type;
	const metadata = NODE_METADATA[nodeType];
	const Icon = ICONS[nodeType] || FileInput;
	const colors = COLORS[metadata.color] || COLORS.slate;

	const handlePositions = useMemo(() => {
		const inputs: Position[] = [];
		const outputs: Position[] = [];

		// Input handles
		if (metadata.inputs === 1) {
			inputs.push(Position.Top);
		} else if (metadata.inputs > 1) {
			// Multiple inputs on left
			for (let i = 0; i < metadata.inputs; i++) {
				inputs.push(Position.Left);
			}
		}

		// Output handles
		if (metadata.outputs === 1) {
			outputs.push(Position.Bottom);
		} else if (metadata.outputs === 2) {
			outputs.push(Position.Bottom);
			outputs.push(Position.Right);
		} else if (metadata.outputs > 2) {
			outputs.push(Position.Bottom);
			outputs.push(Position.Right);
			outputs.push(Position.Left);
		}

		return { inputs, outputs };
	}, [metadata]);

	return (
		<motion.div
			initial={{ scale: 0.8, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			className={cn(
				'relative px-1.5 py-1 rounded border backdrop-blur-sm transition-all duration-200 cursor-pointer',
				colors.bg,
				colors.border,
				selected && `ring-1 ring-offset-1 ring-offset-slate-900 ring-brass-500 shadow-md ${colors.glow}`,
				data.isRunning && 'animate-pulse',
				data.hasError && 'border-red-500/50 bg-red-500/10'
			)}
		>
			{/* Input handles */}
			{handlePositions.inputs.map((pos, idx) => (
				<Handle
					key={`input-${idx}`}
					type="target"
					position={pos}
					id={`input-${idx}`}
					className={cn(
						'!w-2 !h-2 !rounded-full !border transition-colors',
						'!bg-slate-700 !border-slate-500',
						'hover:!bg-slate-600 hover:!border-slate-400'
					)}
					style={
						pos === Position.Left
							? { top: `${30 + idx * 20}%` }
							: undefined
					}
				/>
			))}

			{/* Content */}
			<div className="flex items-center gap-1">
				<div className={cn('p-0.5 rounded', colors.bg)}>
					<Icon className={cn('w-2.5 h-2.5', colors.text)} />
				</div>
				<p className="text-[7px] font-medium text-slate-100 truncate max-w-[60px]">
					{data.label}
				</p>
			</div>

			{/* Status indicators */}
			{data.isCompleted && (
				<div className="absolute -top-1 -right-1">
					<div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center">
						<CheckCircle2 className="w-2 h-2 text-white" />
					</div>
				</div>
			)}
			{data.hasError && (
				<div className="absolute -top-1 -right-1">
					<div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold">
						!
					</div>
				</div>
			)}
			{data.isRunning && (
				<div className="absolute -top-1 -right-1">
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
						className="w-3 h-3 rounded-full border border-brass-400 border-t-transparent"
					/>
				</div>
			)}

			{/* Output handles */}
			{handlePositions.outputs.map((pos, idx) => {
				const labels = ['', 'Y', 'N'];
				return (
					<Handle
						key={`output-${idx}`}
						type="source"
						position={pos}
						id={`output-${idx}`}
						className={cn(
							'!w-2 !h-2 !rounded-full !border transition-colors',
							'!bg-slate-700 !border-slate-500',
							'hover:!bg-brass-500 hover:!border-brass-400'
						)}
						style={
							pos === Position.Right
								? { top: '50%' }
								: pos === Position.Left
								? { top: '50%' }
								: undefined
						}
					>
						{metadata.outputs > 1 && idx > 0 && (
							<span className="absolute top-2 left-1/2 -translate-x-1/2 text-[6px] text-slate-500 whitespace-nowrap">
								{labels[idx] || idx}
							</span>
						)}
					</Handle>
				);
			})}
		</motion.div>
	);
}

export const WorkflowNodeView = memo(WorkflowNodeComponent);
