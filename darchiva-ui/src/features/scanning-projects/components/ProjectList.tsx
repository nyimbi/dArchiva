import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useProjects } from '../api/hooks';
import { StatusBadge } from './core/StatusBadge';
import type { ScanningProject, ProjectStatus, ProjectFilters } from '../types';
import {
  SearchIcon,
  GridIcon,
  ListIcon,
  FilterIcon,
  PlusIcon,
  CalendarIcon,
  FileTextIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
} from 'lucide-react';

interface ProjectListProps {
  onSelectProject: (project: ScanningProject) => void;
  onCreateProject?: () => void;
}

const statusOptions: ProjectStatus[] = ['planning', 'active', 'paused', 'completed', 'archived'];

export function ProjectList({ onSelectProject, onCreateProject }: ProjectListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projectsData, isLoading } = useProjects({
    ...filters,
    search: searchQuery || undefined,
  });

  const projects = projectsData?.items ?? [];

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-400';
    if (percentage >= 50) return 'bg-cyan-400';
    if (percentage >= 25) return 'bg-amber-400';
    return 'bg-white/20';
  };

  const getDaysRemaining = (targetDate?: string) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Scanning Projects</h1>
          <p className="text-sm text-white/50 mt-1">
            {projects.length} projects • {projects.filter(p => p.status === 'active').length} active
          </p>
        </div>
        {onCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-md transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
        {/* Search */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-white/40" />
          <select
            value={filters.status?.join(',') || ''}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value ? e.target.value.split(',') as ProjectStatus[] : undefined }))}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-cyan-400/50"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-md">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60')}
          >
            <GridIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60')}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <FileTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No projects found</p>
          <p className="text-sm mt-1">Create a new project to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, idx) => {
            const progress = project.total_estimated_pages > 0
              ? (project.scanned_pages / project.total_estimated_pages) * 100
              : 0;
            const daysRemaining = getDaysRemaining(project.target_end_date);
            const isOverdue = daysRemaining !== null && daysRemaining < 0;
            const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className={cn(
                  'relative p-4 bg-white/[0.02] border border-white/10 rounded-lg cursor-pointer',
                  'hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200',
                  'group'
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Top accent line */}
                <div className={cn(
                  'absolute top-0 left-0 right-0 h-0.5 rounded-t-lg',
                  project.status === 'active' && 'bg-cyan-400',
                  project.status === 'completed' && 'bg-emerald-400',
                  project.status === 'paused' && 'bg-amber-400',
                  project.status === 'planning' && 'bg-blue-400',
                )} />

                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-white/40">{project.code}</span>
                    <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </h3>
                    {project.client_name && (
                      <p className="text-xs text-white/50 truncate">{project.client_name}</p>
                    )}
                  </div>
                  <StatusBadge status={project.status} size="sm" pulse={project.status === 'active'} />
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/50">Progress</span>
                    <span className="font-mono text-white/70">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', getProgressColor(progress))}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <div className="flex items-center gap-1">
                    <FileTextIcon className="w-3 h-3" />
                    <span className="font-mono">{project.scanned_pages.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUpIcon className="w-3 h-3" />
                    <span className="font-mono">{project.daily_page_target}/day</span>
                  </div>
                </div>

                {/* Deadline indicator */}
                {daysRemaining !== null && (
                  <div className={cn(
                    'mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-xs',
                    isOverdue && 'text-red-400',
                    isUrgent && 'text-amber-400',
                    !isOverdue && !isUrgent && 'text-white/50'
                  )}>
                    {(isOverdue || isUrgent) && <AlertTriangleIcon className="w-3 h-3" />}
                    <CalendarIcon className="w-3 h-3" />
                    <span className="font-mono">
                      {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/50 uppercase tracking-wider">
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Progress</th>
                <th className="text-right px-4 py-3">Pages</th>
                <th className="text-right px-4 py-3">Daily Target</th>
                <th className="text-right px-4 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projects.map(project => {
                const progress = project.total_estimated_pages > 0
                  ? (project.scanned_pages / project.total_estimated_pages) * 100
                  : 0;

                return (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-[10px] font-mono text-white/40 block">{project.code}</span>
                        <span className="text-white font-medium">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={project.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full', getProgressColor(progress))} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="font-mono text-sm text-white/70 w-12">{progress.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                      {project.scanned_pages.toLocaleString()} / {project.total_estimated_pages.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white/70">
                      {project.daily_page_target.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white/50">
                      {project.target_end_date ? new Date(project.target_end_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
