// (c) Copyright Datacraft, 2026
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface ThumbnailStripProps {
	documentId: string;
	pageCount: number;
	currentPage: number;
	onPageSelect: (page: number) => void;
}

export function ThumbnailStrip({ documentId, pageCount, currentPage, onPageSelect }: ThumbnailStripProps) {
	const stripRef = useRef<HTMLDivElement>(null);
	const activeRef = useRef<HTMLButtonElement>(null);

	// Auto-scroll active thumbnail into view
	useEffect(() => {
		activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, [currentPage]);

	return (
		<div
			ref={stripRef}
			className="w-[72px] flex-shrink-0 flex flex-col gap-1 overflow-y-auto overflow-x-hidden py-2 bg-slate-925 border-r border-slate-800 h-full"
			aria-label="Page thumbnails"
		>
			{Array.from({ length: pageCount }, (_, i) => {
				const page = i + 1;
				const isActive = page === currentPage;
				return (
					<button
						key={page}
						ref={isActive ? activeRef : undefined}
						onClick={() => onPageSelect(page)}
						className={cn(
							'flex-shrink-0 mx-1.5 rounded overflow-hidden border-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brass-400',
							isActive
								? 'border-brass-500 shadow-[0_0_0_1px_theme(colors.brass.600)]'
								: 'border-transparent hover:border-slate-600',
						)}
						title={`Page ${page}`}
						aria-label={`Go to page ${page}`}
						aria-current={isActive ? 'true' : undefined}
					>
						<img
							src={`/api/v1/documents/${documentId}/pages/${page}/image?dpi=48&format=jpeg`}
							alt={`Page ${page}`}
							loading="lazy"
							className="w-full block"
							onError={(e) => {
								// Fallback: hide broken image, show placeholder
								const target = e.currentTarget;
								target.style.display = 'none';
								const sibling = target.nextElementSibling as HTMLElement | null;
								if (sibling) sibling.style.display = 'flex';
							}}
						/>
						{/* Fallback placeholder (hidden by default) */}
						<div
							className="w-full h-12 bg-slate-800 items-center justify-center text-slate-600 text-[9px]"
							style={{ display: 'none' }}
						>
							{page}
						</div>
						<span className="block text-center text-[9px] text-slate-400 py-0.5 bg-slate-900/80">
							{page}
						</span>
					</button>
				);
			})}
		</div>
	);
}
