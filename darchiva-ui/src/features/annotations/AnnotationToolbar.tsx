// (c) Copyright Datacraft, 2026
import { cn } from '@/lib/utils';
import { Highlighter, MessageSquare, EyeOff, MousePointer } from 'lucide-react';
import type { AnnotationType } from './api';

export type AnnotationMode = 'view' | AnnotationType;

interface AnnotationToolbarProps {
	mode: AnnotationMode;
	onModeChange: (mode: AnnotationMode) => void;
}

const TOOLS: { mode: AnnotationMode; icon: React.ReactNode; label: string; color: string }[] = [
	{
		mode: 'view',
		icon: <MousePointer className="w-4 h-4" />,
		label: 'Select',
		color: '',
	},
	{
		mode: 'highlight',
		icon: <Highlighter className="w-4 h-4" />,
		label: 'Highlight',
		color: 'text-yellow-400',
	},
	{
		mode: 'note',
		icon: <MessageSquare className="w-4 h-4" />,
		label: 'Note',
		color: 'text-blue-400',
	},
	{
		mode: 'redaction',
		icon: <EyeOff className="w-4 h-4" />,
		label: 'Redact',
		color: 'text-red-400',
	},
];

const MODE_CURSORS: Record<AnnotationMode, string> = {
	view: 'cursor-default',
	highlight: 'cursor-crosshair',
	note: 'cursor-crosshair',
	redaction: 'cursor-crosshair',
};

export { MODE_CURSORS };

export function AnnotationToolbar({ mode, onModeChange }: AnnotationToolbarProps) {
	return (
		<div className="flex items-center gap-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
			<span className="text-xs text-slate-500 pr-1 select-none">Annotate</span>
			{TOOLS.map((tool) => (
				<button
					key={tool.mode}
					onClick={() => onModeChange(tool.mode)}
					title={tool.label}
					className={cn(
						'flex items-center gap-1 px-2 py-1.5 rounded text-sm transition-colors',
						tool.color,
						mode === tool.mode
							? 'bg-slate-700 text-slate-100'
							: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
					)}
				>
					{tool.icon}
					<span className="text-xs hidden sm:inline">{tool.label}</span>
				</button>
			))}
		</div>
	);
}
