// (c) Copyright Datacraft, 2026
import { useCallback, useRef, useState } from 'react';
import { PanelLeft, X, ArrowLeftRight } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

interface DualPanelProps {
	mainPanel: React.ReactNode;
	secondaryPanel?: React.ReactNode;
	className?: string;
}

export function DualPanel({ mainPanel, secondaryPanel, className }: DualPanelProps) {
	const {
		secondaryPanelVisible,
		setSecondaryPanelVisible,
		mainPanelWidth,
		setMainPanelWidth,
		swapPanels,
	} = useStore();

	const containerRef = useRef<HTMLDivElement>(null);
	const [isResizing, setIsResizing] = useState(false);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);

		const handleMouseMove = (e: MouseEvent) => {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
			setMainPanelWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}, [setMainPanelWidth]);

	return (
		<div ref={containerRef} className={cn('flex h-full relative', className)}>
			{/* Main Panel */}
			<div
				className="h-full overflow-hidden"
				style={{ width: secondaryPanelVisible ? `${mainPanelWidth}%` : '100%' }}
			>
				<div className="h-full overflow-auto">{mainPanel}</div>
			</div>

			{/* Resizer */}
			{secondaryPanelVisible && (
				<div
					className={cn(
						'w-1 flex-shrink-0 bg-slate-800 hover:bg-brass-500/50 cursor-col-resize transition-colors relative group',
						isResizing && 'bg-brass-500'
					)}
					onMouseDown={handleMouseDown}
				>
					{/* Resizer handle */}
					<div className="absolute inset-y-0 -left-1 -right-1" />

					{/* Swap button */}
					<button
						onClick={swapPanels}
						className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-brass-500 hover:text-slate-900 transition-all flex items-center justify-center"
						title="Swap panels"
					>
						<ArrowLeftRight className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Secondary Panel */}
			{secondaryPanelVisible && (
				<div
					className="h-full overflow-hidden border-l border-slate-800"
					style={{ width: `${100 - mainPanelWidth}%` }}
				>
					<div className="h-full flex flex-col">
						<div className="flex items-center justify-end px-2 py-1 bg-slate-900/50 border-b border-slate-800">
							<button
								onClick={() => setSecondaryPanelVisible(false)}
								className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
								title="Close panel"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
						<div className="flex-1 overflow-auto">{secondaryPanel}</div>
					</div>
				</div>
			)}

			{/* Toggle secondary panel button (when hidden) */}
			{!secondaryPanelVisible && (
				<button
					onClick={() => setSecondaryPanelVisible(true)}
					className="absolute right-2 top-2 p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-slate-100 transition-colors"
					title="Open secondary panel"
				>
					<PanelLeft className="w-5 h-5" />
				</button>
			)}
		</div>
	);
}
