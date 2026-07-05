import { cn } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ChevronDownIcon,ChevronsUpDownIcon,ChevronUpIcon } from 'lucide-react';
import { useId,useMemo,useState,type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  caption?: string;
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  compact?: boolean;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;
type PersistedSort = { column: string | null; direction: SortDirection };

export function DataTable<T extends { id: string }>({
  columns,
  data,
  caption = 'Data table',
  loading = false,
  emptyMessage = 'No data available',
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  stickyHeader = true,
  compact = false,
  className,
}: DataTableProps<T>) {
  const tableId = useId();
  const location = useLocation();
  const preferences = useUserPreferences();
  const sortPreferenceKey = `table_sort:${location.pathname}:${caption}`;
  const [sortState, setSortState] = useState<PersistedSort>(() =>
    preferences.get<PersistedSort>(sortPreferenceKey, { column: null, direction: null })
  );
  const sortKey = sortState.column;
  const sortDirection = sortState.direction;

  const handleSort = (key: string) => {
    setSortState(prev => {
      const next: PersistedSort = prev.column === key
        ? {
            column: prev.direction === 'desc' ? null : key,
            direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc',
          }
        : { column: key, direction: 'asc' };
      preferences.set(sortPreferenceKey, next);
      return next;
    });
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDirection]);

  const allSelected = data.length > 0 && data.every(row => selectedIds.has(row.id));
  const someSelected = data.some(row => selectedIds.has(row.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? new Set() : new Set(data.map(row => row.id)));
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className={cn('relative overflow-auto', className)}>
      <table className="w-full border-collapse font-mono text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
          <tr className="bg-white/[0.02] border-b border-white/10">
            {selectable && (
              <th scope="col" className={cn('w-10', cellPadding)}>
                <label htmlFor={`${tableId}-select-all-table-rows`} className="sr-only">
                  Select all rows
                </label>
                <input
                  id={`${tableId}-select-all-table-rows`}
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-white/20 bg-transparent accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  cellPadding,
                  'text-xs font-semibold text-white/50 uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  col.sortable && 'cursor-pointer select-none hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500'
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col.key)}
                onKeyDown={(e) => {
                  if (!col.sortable) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSort(col.key);
                  }
                }}
                tabIndex={col.sortable ? 0 : undefined}
                scope="col"
                aria-sort={
                  col.sortable && sortKey === col.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : sortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                    : col.sortable
                      ? 'none'
                      : undefined
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-white/30">
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDownIcon className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className={cn(cellPadding, 'text-center text-white/40')}>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className={cn(cellPadding, 'text-center text-white/40')}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-white/5 transition-colors',
                  selectedIds.has(row.id) ? 'bg-cyan-400/10' : 'hover:bg-white/[0.02]',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className={cellPadding} onClick={e => e.stopPropagation()}>
                    <label htmlFor={`${tableId}-select-table-row-${row.id}`} className="sr-only">
                      Select row
                    </label>
                    <input
                      id={`${tableId}-select-table-row-${row.id}`}
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="w-4 h-4 rounded border-white/20 bg-transparent accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      cellPadding,
                      'text-white/80',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.render
                      ? col.render(row, idx)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
