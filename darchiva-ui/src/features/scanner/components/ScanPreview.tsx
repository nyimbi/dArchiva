// (c) Copyright Datacraft, 2026
/**
 * Live scan preview component.
 */
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCw, Move, Maximize2, Loader2, RefreshCw, Crop } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanPreviewData } from '../types';

interface ScanPreviewProps {
	preview: ScanPreviewData | null;
	isLoading?: boolean;
	onRefresh?: () => void;
	onCropChange?: (crop: { x: number; y: number; width: number; height: number }) => void;
	className?: string;
}

export function ScanPreview({ preview, isLoading, onRefresh, onCropChange, className }: ScanPreviewProps) {
	const [zoom, setZoom] = useState(100);
	const [rotation, setRotation] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [cropMode, setCropMode] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleZoom = (delta: number) => setZoom((z) => Math.max(25, Math.min(400, z + delta)));
	const handleRotate = () => setRotation((r) => (r + 90) % 360);
	const handleReset = () => { setZoom(100); setRotation(0); setPosition({ x: 0, y: 0 }); };

	const handleMouseDown = (e: React.MouseEvent) => {
		if (cropMode) return;
		setIsDragging(true);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return;
		setPosition((p) => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
	};

	const handleMouseUp = () => setIsDragging(false);

	return (
		<div className={cn('flex flex-col bg-slate-900 rounded-xl overflow-hidden', className)}>
			{/* Toolbar */}
			<div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/50">
				<div className="flex items-center gap-1">
					<button onClick={() => handleZoom(-25)} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded" title="Zoom out">
						<ZoomOut className="w-4 h-4" />
					</button>
					<span className="text-xs text-slate-400 w-12 text-center">{zoom}%</span>
					<button onClick={() => handleZoom(25)} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded" title="Zoom in">
						<ZoomIn className="w-4 h-4" />
					</button>
					<div className="w-px h-4 bg-slate-700 mx-1" />
					<button onClick={handleRotate} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded" title="Rotate">
						<RotateCw className="w-4 h-4" />
					</button>
					<button onClick={handleReset} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded" title="Reset view">
						<Maximize2 className="w-4 h-4" />
					</button>
					{onCropChange && (
						<button onClick={() => setCropMode(!cropMode)} className={cn('p-1.5 rounded', cropMode ? 'bg-brass-500/20 text-brass-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50')} title="Crop">
							<Crop className="w-4 h-4" />
						</button>
					)}
				</div>
				{onRefresh && (
					<button onClick={onRefresh} disabled={isLoading} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded">
						{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
					</button>
				)}
			</div>

			{/* Preview Area */}
			<div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-[400px]" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
				{isLoading ? (
					<div className="flex flex-col items-center gap-3 text-slate-500">
						<div className="relative">
							<div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
							<div className="absolute inset-0 w-16 h-16 border-4 border-brass-500 border-t-transparent rounded-full animate-spin" />
						</div>
						<p className="text-sm">Generating preview...</p>
					</div>
				) : preview ? (
					<motion.img
						src={preview.imageUrl}
						alt="Scan preview"
						className="max-w-full max-h-full object-contain shadow-2xl"
						style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100}) rotate(${rotation}deg)` }}
						draggable={false}
					/>
				) : (
					<div className="flex flex-col items-center gap-3 text-slate-500">
						<div className="w-32 h-40 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center">
							<Move className="w-8 h-8 opacity-50" />
						</div>
						<p className="text-sm">Click "Preview" to scan a preview</p>
					</div>
				)}

				{/* Scan lines animation overlay during loading */}
				{isLoading && (
					<motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
						<motion.div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brass-500/50 to-transparent" initial={{ top: 0 }} animate={{ top: '100%' }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
					</motion.div>
				)}
			</div>

			{/* Info Bar */}
			{preview && (
				<div className="px-3 py-2 bg-slate-800/50 border-t border-slate-700/50 text-xs text-slate-500 flex items-center gap-4">
					<span>{preview.width} × {preview.height} px</span>
					<span>{preview.format.toUpperCase()}</span>
				</div>
			)}
		</div>
	);
}
