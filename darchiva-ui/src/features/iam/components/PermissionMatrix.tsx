// Permission Matrix - Interactive permissions grid
import { useState, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
	Download, Filter, Search, User, Users, ArrowUpDown,
	ChevronLeft, ChevronRight, Eye, Pencil, Shield, Crown, Ban,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PermissionBadge, PermissionSelector } from './core/PermissionBadge';
import { usePermissionMatrix, useUpdatePermissionCell } from '../api/hooks';
import type { PermissionLevel, PermissionMatrixRow } from '../types';
import '../styles/theme.css';

interface PermissionMatrixProps {
	resourceType?: string;
	onExport?: () => void;
}

const RESOURCE_COLUMNS = [
	{ key: 'documents', label: 'Documents' },
	{ key: 'folders', label: 'Folders' },
	{ key: 'tags', label: 'Tags' },
	{ key: 'workflows', label: 'Workflows' },
	{ key: 'scanning', label: 'Scanning' },
	{ key: 'settings', label: 'Settings' },
	{ key: 'users', label: 'Users' },
	{ key: 'billing', label: 'Billing' },
];

export function PermissionMatrix({ resourceType, onExport }: PermissionMatrixProps) {
	const [entityType, setEntityType] = useState<'user' | 'group'>('user');
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<string>('name');
	const [sortDesc, setSortDesc] = useState(false);
	const [scrollPosition, setScrollPosition] = useState(0);

	const { data: matrixData, isLoading } = usePermissionMatrix({
		resource_type: resourceType,
		entity_type: entityType,
	});
	const updateCell = useUpdatePermissionCell();

	const scrollContainerRef = useRef<HTMLDivElement>(null);

	// Filter and sort data
	const processedData = useMemo(() => {
		if (!matrixData) return [];

		let filtered = matrixData;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(row =>
				row.entity_name.toLowerCase().includes(query)
			);
		}

		// Sort
		filtered = [...filtered].sort((a, b) => {
			if (sortBy === 'name') {
				return sortDesc
					? b.entity_name.localeCompare(a.entity_name)
					: a.entity_name.localeCompare(b.entity_name);
			}
			// Sort by permission level for a specific resource
			const levelOrder = { owner: 4, admin: 3, write: 2, read: 1, none: 0 };
			const aLevel = levelOrder[a.permissions[sortBy] as keyof typeof levelOrder] || 0;
			const bLevel = levelOrder[b.permissions[sortBy] as keyof typeof levelOrder] || 0;
			return sortDesc ? bLevel - aLevel : aLevel - bLevel;
		});

		return filtered;
	}, [matrixData, searchQuery, sortBy, sortDesc]);

	const handleCellChange = (row: PermissionMatrixRow, resource: string, level: PermissionLevel) => {
		updateCell.mutate({
			entity_type: row.entity_type,
			entity_id: row.entity_id,
			resource,
			level,
		});
	};

	const handleScroll = (direction: 'left' | 'right') => {
		if (!scrollContainerRef.current) return;
		const scrollAmount = 200;
		const newPosition = direction === 'left'
			? scrollPosition - scrollAmount
			: scrollPosition + scrollAmount;
		scrollContainerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
		setScrollPosition(newPosition);
	};

	const handleExport = () => {
		if (!matrixData) return;

		// Generate CSV
		const headers = ['Entity', 'Type', ...RESOURCE_COLUMNS.map(c => c.label)];
		const rows = matrixData.map(row => [
			row.entity_name,
			row.entity_type,
			...RESOURCE_COLUMNS.map(c => row.permissions[c.key] || 'none'),
		]);

		const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `permission-matrix-${entityType}s.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	if (isLoading) {
		return <MatrixSkeleton />;
	}

	return (
		<div className="iam-root flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b border-[var(--iam-border-subtle)]">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-[var(--iam-text-primary)]">
						Permission Matrix
					</h2>
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Download className="w-4 h-4 mr-2" />
						Export CSV
					</Button>
				</div>

				{/* Filters */}
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Button
							variant={entityType === 'user' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setEntityType('user')}
						>
							<User className="w-4 h-4 mr-1" />
							Users
						</Button>
						<Button
							variant={entityType === 'group' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setEntityType('group')}
						>
							<Users className="w-4 h-4 mr-1" />
							Groups
						</Button>
					</div>

					<div className="relative flex-1 max-w-xs">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--iam-text-tertiary)]" />
						<Input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={`Search ${entityType}s...`}
							className="pl-9 bg-[var(--iam-bg-surface)]"
						/>
					</div>

					<div className="text-xs text-[var(--iam-text-tertiary)]">
						{processedData.length} {entityType}s
					</div>
				</div>
			</div>

			{/* Legend */}
			<div className="px-4 py-2 border-b border-[var(--iam-border-subtle)] flex items-center gap-4 bg-[var(--iam-bg-surface)]">
				<span className="text-xs text-[var(--iam-text-tertiary)]">Permission levels:</span>
				<div className="flex gap-2">
					<PermissionBadge level="none" size="xs" />
					<PermissionBadge level="read" size="xs" />
					<PermissionBadge level="write" size="xs" />
					<PermissionBadge level="admin" size="xs" />
					<PermissionBadge level="owner" size="xs" />
				</div>
				<span className="text-xs text-[var(--iam-text-tertiary)] ml-auto">
					Click cells to edit
				</span>
			</div>

			{/* Matrix */}
			<div className="flex-1 overflow-hidden relative">
				{/* Scroll buttons */}
				<button
					onClick={() => handleScroll('left')}
					className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-[var(--iam-bg-base)] to-transparent flex items-center justify-center hover:from-[var(--iam-bg-surface)]"
				>
					<ChevronLeft className="w-5 h-5 text-[var(--iam-text-tertiary)]" />
				</button>
				<button
					onClick={() => handleScroll('right')}
					className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[var(--iam-bg-base)] to-transparent flex items-center justify-center hover:from-[var(--iam-bg-surface)]"
				>
					<ChevronRight className="w-5 h-5 text-[var(--iam-text-tertiary)]" />
				</button>

				<div
					ref={scrollContainerRef}
					className="overflow-auto h-full px-8"
					onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
				>
					<table className="w-full border-collapse">
						{/* Header */}
						<thead className="sticky top-0 z-10 bg-[var(--iam-bg-base)]">
							<tr>
								<th className="sticky left-0 z-20 bg-[var(--iam-bg-base)] text-left p-3 min-w-[200px]">
									<button
										onClick={() => {
											if (sortBy === 'name') setSortDesc(!sortDesc);
											else { setSortBy('name'); setSortDesc(false); }
										}}
										className="flex items-center gap-1 text-xs font-semibold text-[var(--iam-text-tertiary)] uppercase tracking-wider hover:text-[var(--iam-text-secondary)]"
									>
										{entityType === 'user' ? 'User' : 'Group'}
										{sortBy === 'name' && (
											<ArrowUpDown className={cn('w-3 h-3', sortDesc && 'rotate-180')} />
										)}
									</button>
								</th>
								{RESOURCE_COLUMNS.map(col => (
									<th key={col.key} className="p-3 min-w-[100px]">
										<button
											onClick={() => {
												if (sortBy === col.key) setSortDesc(!sortDesc);
												else { setSortBy(col.key); setSortDesc(false); }
											}}
											className="flex items-center justify-center gap-1 text-xs font-semibold text-[var(--iam-text-tertiary)] uppercase tracking-wider hover:text-[var(--iam-text-secondary)] mx-auto"
										>
											{col.label}
											{sortBy === col.key && (
												<ArrowUpDown className={cn('w-3 h-3', sortDesc && 'rotate-180')} />
											)}
										</button>
									</th>
								))}
							</tr>
						</thead>

						{/* Body */}
						<tbody>
							{processedData.map((row, i) => (
								<tr
									key={row.entity_id}
									className={cn(
										'border-b border-[var(--iam-border-subtle)] hover:bg-[var(--iam-bg-hover)] transition-colors',
										i % 2 === 0 && 'bg-[var(--iam-bg-surface)]/30'
									)}
								>
									<td className="sticky left-0 z-10 bg-[var(--iam-bg-base)] p-3">
										<div className="flex items-center gap-2">
											<div className="w-8 h-8 rounded-full bg-[var(--iam-bg-surface)] flex items-center justify-center">
												{row.entity_type === 'user' ? (
													<User className="w-4 h-4 text-[var(--iam-text-tertiary)]" />
												) : (
													<Users className="w-4 h-4 text-[var(--iam-text-tertiary)]" />
												)}
											</div>
											<span className="font-medium text-sm text-[var(--iam-text-primary)]">
												{row.entity_name}
											</span>
										</div>
									</td>
									{RESOURCE_COLUMNS.map(col => {
										const level = (row.permissions[col.key] || 'none') as PermissionLevel;
										return (
											<td key={col.key} className="p-2 text-center">
												<PermissionCell
													level={level}
													onChange={(newLevel) => handleCellChange(row, col.key, newLevel)}
													isUpdating={updateCell.isPending}
												/>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>

					{processedData.length === 0 && (
						<div className="text-center py-12 text-[var(--iam-text-tertiary)]">
							<Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No {entityType}s found</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function PermissionCell({
	level,
	onChange,
	isUpdating,
}: {
	level: PermissionLevel;
	onChange: (level: PermissionLevel) => void;
	isUpdating: boolean;
}) {
	const [isEditing, setIsEditing] = useState(false);

	if (isEditing) {
		return (
			<div className="inline-flex p-1 rounded-md bg-[var(--iam-bg-surface)] border border-[var(--iam-border-emphasis)]">
				<PermissionSelector
					value={level}
					onChange={(newLevel) => {
						onChange(newLevel);
						setIsEditing(false);
					}}
					disabled={isUpdating}
				/>
			</div>
		);
	}

	return (
		<button
			onClick={() => setIsEditing(true)}
			className="group inline-flex"
			disabled={isUpdating}
		>
			<PermissionBadge
				level={level}
				size="sm"
				className="group-hover:ring-2 group-hover:ring-[var(--iam-accent)] transition-shadow"
			/>
		</button>
	);
}

function MatrixSkeleton() {
	return (
		<div className="iam-root p-6 animate-pulse">
			<div className="flex items-center justify-between mb-6">
				<div className="h-6 w-48 bg-[var(--iam-bg-surface)] rounded" />
				<div className="h-8 w-32 bg-[var(--iam-bg-surface)] rounded" />
			</div>
			<div className="space-y-2">
				<div className="h-10 bg-[var(--iam-bg-surface)] rounded" />
				{[1, 2, 3, 4, 5].map(i => (
					<div key={i} className="h-12 bg-[var(--iam-bg-surface)] rounded" />
				))}
			</div>
		</div>
	);
}
