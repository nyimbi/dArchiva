import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useSubProjects, useCreateSubProject } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import { DataTable, type Column } from '../core/DataTable';
import type { SubProject } from '../../types';
import { PlusIcon, ChevronRightIcon, FolderIcon } from 'lucide-react';

interface SubProjectsTabProps {
  projectId: string;
}

export function SubProjectsTab({ projectId }: SubProjectsTabProps) {
  const { data: subProjects, isLoading } = useSubProjects(projectId);
  const createMutation = useCreateSubProject();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const columns: Column<SubProject>[] = [
    {
      key: 'name',
      header: 'Sub-Project',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
            className="p-0.5 text-white/30 hover:text-white/60"
          >
            <ChevronRightIcon className={cn('w-4 h-4 transition-transform', expandedIds.has(row.id) && 'rotate-90')} />
          </button>
          <FolderIcon className="w-4 h-4 text-amber-400/70" />
          <div>
            <span className="text-[10px] font-mono text-white/40 block">{row.code}</span>
            <span className="text-white font-medium">{row.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => row.category || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'progress',
      header: 'Progress',
      align: 'right',
      render: (row) => {
        const progress = row.total_estimated_pages > 0
          ? (row.scanned_pages / row.total_estimated_pages) * 100
          : 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-white/70 w-12 text-right">{progress.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      key: 'pages',
      header: 'Pages',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-white/70">
          {row.scanned_pages.toLocaleString()} / {row.total_estimated_pages.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className={cn(
          'font-mono text-sm',
          row.priority <= 2 && 'text-red-400',
          row.priority === 3 && 'text-amber-400',
          row.priority >= 4 && 'text-white/50'
        )}>
          P{row.priority}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Sub-Projects</h2>
          <p className="text-sm text-white/50">{subProjects?.length ?? 0} sub-projects</p>
        </div>
        <button
          onClick={() => createMutation.mutate({ projectId, data: { code: 'NEW', name: 'New Sub-Project', status: 'planning', priority: 5, total_estimated_pages: 0, scanned_pages: 0, verified_pages: 0, rejected_pages: 0 } })}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Sub-Project
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={subProjects ?? []}
          loading={isLoading}
          emptyMessage="No sub-projects yet"
        />
      </div>
    </div>
  );
}
