// (c) Copyright Datacraft, 2026
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ThumbnailGridDocument {
	id: string;
	title: string;
	pageCount?: number;
	updatedAt: string;
	tags?: Array<{ name: string; color: string }>;
}

interface ThumbnailGridProps {
	documents: ThumbnailGridDocument[];
	selectedIds?: Set<string>;
	onToggleSelect?: (id: string) => void;
	isSelectMode?: boolean;
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return dateStr;
	}
}

function DocumentCard({
	doc,
	isSelected,
	isSelectMode,
	onToggleSelect,
}: {
	doc: ThumbnailGridDocument;
	isSelected: boolean;
	isSelectMode: boolean;
	onToggleSelect?: (id: string) => void;
}) {
	const navigate = useNavigate();
	const [imgError, setImgError] = useState(false);
	const [hovered, setHovered] = useState(false);

	const visibleTags = doc.tags?.slice(0, 3) ?? [];
	const overflowCount = (doc.tags?.length ?? 0) - visibleTags.length;

	function handleClick(e: React.MouseEvent) {
		if (isSelectMode) {
			e.preventDefault();
			onToggleSelect?.(doc.id);
		} else {
			navigate(`/document/${doc.id}`);
		}
	}

	function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
		e.stopPropagation();
		onToggleSelect?.(doc.id);
	}

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={handleClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick(e as unknown as React.MouseEvent);
				}
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className={cn(
				'group relative flex flex-col rounded-lg overflow-hidden border-2 bg-slate-900 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-400',
				isSelected
					? 'border-brass-500 shadow-[0_0_0_1px_theme(colors.brass.600)]'
					: 'border-slate-800 hover:border-slate-600',
			)}
			aria-selected={isSelected}
		>
			{/* Selection checkbox — top-left, shown when in select mode or hovered */}
			{(isSelectMode || hovered) && (
				<div
					className="absolute top-2 left-2 z-20"
					onClick={(e) => e.stopPropagation()}
				>
					<input
						type="checkbox"
						checked={isSelected}
						onChange={handleCheckboxChange}
						className="w-4 h-4 rounded accent-brass-500 cursor-pointer"
						aria-label={`Select ${doc.title}`}
					/>
				</div>
			)}

			{/* Thumbnail */}
			<div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-800">
				{!imgError ? (
					<img
						src={`/api/v1/documents/${doc.id}/pages/1/image?format=jpeg&dpi=72`}
						alt={doc.title}
						loading="lazy"
						onError={() => setImgError(true)}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<FileText className="w-12 h-12 text-slate-600" />
					</div>
				)}

				{/* Hover overlay */}
				<div
					className={cn(
						'absolute inset-0 bg-slate-950/60 flex items-center justify-center transition-opacity',
						hovered && !isSelectMode ? 'opacity-100' : 'opacity-0 pointer-events-none',
					)}
				>
					<span className="px-3 py-1.5 rounded-md bg-brass-500 text-slate-950 text-sm font-medium">
						Open
					</span>
				</div>
			</div>

			{/* Card body */}
			<div className="flex flex-col gap-1.5 p-3">
				{/* Title */}
				<p
					className="text-sm font-medium text-slate-100 leading-snug"
					style={{
						display: '-webkit-box',
						WebkitLineClamp: 2,
						WebkitBoxOrient: 'vertical',
						overflow: 'hidden',
					}}
					title={doc.title}
				>
					{doc.title}
				</p>

				{/* Metadata row */}
				<div className="flex items-center gap-2 text-xs text-slate-400">
					{doc.pageCount != null && (
						<span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
							{doc.pageCount}p
						</span>
					)}
					<span className="truncate">{formatDate(doc.updatedAt)}</span>
				</div>

				{/* Tags row */}
				{visibleTags.length > 0 && (
					<div className="flex items-center flex-wrap gap-1 mt-0.5">
						{visibleTags.map((tag) => (
							<span
								key={tag.name}
								className="px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none"
								style={{
									backgroundColor: `${tag.color}26`,
									color: tag.color,
									border: `1px solid ${tag.color}4d`,
								}}
							>
								{tag.name}
							</span>
						))}
						{overflowCount > 0 && (
							<span className="px-1.5 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800">
								+{overflowCount}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export function ThumbnailGrid({
	documents,
	selectedIds = new Set(),
	onToggleSelect,
	isSelectMode = false,
}: ThumbnailGridProps) {
	if (documents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-slate-500">
				<FileText className="w-12 h-12 mb-3 opacity-40" />
				<p className="text-sm">No documents</p>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{documents.map((doc) => (
				<DocumentCard
					key={doc.id}
					doc={doc}
					isSelected={selectedIds.has(doc.id)}
					isSelectMode={isSelectMode}
					onToggleSelect={onToggleSelect}
				/>
			))}
		</div>
	);
}
