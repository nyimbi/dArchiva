// DataTable - Reusable table with sorting, selection, pagination
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export interface Column<T> {
	key: string;
	header: string;
	sortable?: boolean;
	width?: string;
	render?: (row: T) => React.ReactNode;
}

export interface SortState {
	column: string | null;
	direction: 'asc' | 'desc' | null;
}

interface Props<T> {
	data: T[];
	columns: Column<T>[];
	getRowId: (row: T) => string;
	loading?: boolean;
	emptyMessage?: string;
	// Sorting
	sorting?: SortState;
	onSortChange?: (sort: SortState) => void;
	// Selection
	selectable?: boolean;
	selectedRows?: Set<string>;
	onSelectionChange?: (selection: Set<string>) => void;
	// Pagination
	pagination?: {
		page: number;
		pageSize: number;
		total: number;
		onPageChange: (page: number) => void;
		onPageSizeChange?: (size: number) => void;
	};
	className?: string;
}

export function DataTable<T>({
	data,
	columns,
	getRowId,
	loading,
	emptyMessage = 'No data',
	sorting,
	onSortChange,
	selectable,
	selectedRows,
	onSelectionChange,
	pagination,
	className,
}: Props<T>) {
	const allSelected = data.length > 0 && data.every(row => selectedRows?.has(getRowId(row)));
	const someSelected = data.some(row => selectedRows?.has(getRowId(row)));

	const toggleAll = useCallback(() => {
		if (!onSelectionChange) return;
		if (allSelected) {
			onSelectionChange(new Set());
		} else {
			onSelectionChange(new Set(data.map(getRowId)));
		}
	}, [data, getRowId, allSelected, onSelectionChange]);

	const toggleRow = useCallback((id: string) => {
		if (!onSelectionChange || !selectedRows) return;
		const next = new Set(selectedRows);
		next.has(id) ? next.delete(id) : next.add(id);
		onSelectionChange(next);
	}, [selectedRows, onSelectionChange]);

	const handleSort = (key: string) => {
		if (!onSortChange) return;
		if (sorting?.column === key) {
			onSortChange({
				column: key,
				direction: sorting.direction === 'asc' ? 'desc' : sorting.direction === 'desc' ? null : 'asc',
			});
		} else {
			onSortChange({ column: key, direction: 'asc' });
		}
	};

	const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

	return (
		<div className={cn('dt-container', className)}>
			<div className="dt-wrapper">
				<table className="dt-table">
					<thead>
						<tr className="dt-header-row">
							{selectable && (
								<th className="dt-th dt-th-checkbox">
									<input
										type="checkbox"
										checked={allSelected}
										ref={el => el && (el.indeterminate = someSelected && !allSelected)}
										onChange={toggleAll}
										className="dt-checkbox"
									/>
								</th>
							)}
							{columns.map(col => (
								<th
									key={col.key}
									className={cn('dt-th', col.sortable && 'dt-th-sortable')}
									style={{ width: col.width }}
									onClick={() => col.sortable && handleSort(col.key)}
								>
									<span className="dt-th-content">
										{col.header}
										{col.sortable && sorting?.column === col.key && (
											sorting.direction === 'asc'
												? <ChevronUp className="dt-sort-icon" />
												: <ChevronDown className="dt-sort-icon" />
										)}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={columns.length + (selectable ? 1 : 0)} className="dt-loading">
									<Loader2 className="w-6 h-6 animate-spin" />
								</td>
							</tr>
						) : data.length === 0 ? (
							<tr>
								<td colSpan={columns.length + (selectable ? 1 : 0)} className="dt-empty">
									{emptyMessage}
								</td>
							</tr>
						) : (
							data.map(row => {
								const id = getRowId(row);
								const isSelected = selectedRows?.has(id);
								return (
									<tr
										key={id}
										className={cn('dt-row', isSelected && 'dt-row-selected')}
									>
										{selectable && (
											<td className="dt-td dt-td-checkbox">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleRow(id)}
													className="dt-checkbox"
												/>
											</td>
										)}
										{columns.map(col => (
											<td key={col.key} className="dt-td">
												{col.render ? col.render(row) : (row as any)[col.key]}
											</td>
										))}
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{pagination && totalPages > 1 && (
				<div className="dt-pagination">
					<span className="dt-page-info">
						Page {pagination.page} of {totalPages}
					</span>
					<div className="dt-page-controls">
						<button
							onClick={() => pagination.onPageChange(pagination.page - 1)}
							disabled={pagination.page <= 1}
							className="dt-page-btn"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<button
							onClick={() => pagination.onPageChange(pagination.page + 1)}
							disabled={pagination.page >= totalPages}
							className="dt-page-btn"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
