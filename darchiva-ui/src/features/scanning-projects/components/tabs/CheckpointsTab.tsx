import { cn } from '@/lib/utils';
import { useProjectCheckpoints, useUpdateCheckpoint } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import type { ProjectCheckpoint, CheckpointStatus } from '../../types';
import {
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  SkipForwardIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
} from 'lucide-react';

interface CheckpointsTabProps {
  projectId: string;
}

const statusIcons: Record<CheckpointStatus, typeof FlagIcon> = {
  pending: ClockIcon,
  passed: CheckCircleIcon,
  failed: XCircleIcon,
  skipped: SkipForwardIcon,
};

const statusColors: Record<CheckpointStatus, { line: string; dot: string; bg: string }> = {
  pending: { line: 'bg-white/10', dot: 'bg-white/30 border-white/50', bg: 'bg-white/[0.02]' },
  passed: { line: 'bg-emerald-400', dot: 'bg-emerald-400 border-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { line: 'bg-red-400', dot: 'bg-red-400 border-red-400', bg: 'bg-red-500/10' },
  skipped: { line: 'bg-slate-400', dot: 'bg-slate-400 border-slate-400', bg: 'bg-slate-500/10' },
};

export function CheckpointsTab({ projectId }: CheckpointsTabProps) {
  const { data: checkpoints, isLoading } = useProjectCheckpoints(projectId);
  const updateMutation = useUpdateCheckpoint();

  const sortedCheckpoints = checkpoints?.sort((a, b) => a.checkpoint_number - b.checkpoint_number) ?? [];
  const passedCount = sortedCheckpoints.filter(c => c.status === 'passed').length;
  const totalCount = sortedCheckpoints.length;
  const nextPending = sortedCheckpoints.find(c => c.status === 'pending');

  const handleApprove = (checkpoint: ProjectCheckpoint) => {
    updateMutation.mutate({
      checkpointId: checkpoint.id,
      data: {
        status: 'passed',
        actual_date: new Date().toISOString(),
        actual_percentage: checkpoint.target_percentage,
      },
    });
  };

  const handleFail = (checkpoint: ProjectCheckpoint) => {
    updateMutation.mutate({
      checkpointId: checkpoint.id,
      data: {
        status: 'failed',
        actual_date: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Checkpoint Progress</h3>
          <span className="text-lg font-mono font-bold text-cyan-400">
            {passedCount} / {totalCount}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(passedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        {nextPending && (
          <div className="mt-3 pt-3 border-t border-white/5 text-sm text-white/60">
            <span className="text-white/40">Next:</span>{' '}
            <span className="text-white font-medium">{nextPending.name}</span> - Target:{' '}
            <span className="font-mono">{new Date(nextPending.target_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Project Checkpoints</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Checkpoint
        </button>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sortedCheckpoints.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <FlagIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No checkpoints defined</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-white/10" />

          <div className="space-y-4">
            {sortedCheckpoints.map((checkpoint, idx) => {
              const Icon = statusIcons[checkpoint.status];
              const colors = statusColors[checkpoint.status];
              const isOverdue = checkpoint.status === 'pending' &&
                new Date(checkpoint.target_date) < new Date();

              return (
                <div
                  key={checkpoint.id}
                  className={cn(
                    'relative pl-14 pr-4 py-4 rounded-lg border transition-all',
                    colors.bg,
                    checkpoint.status === 'pending' && isOverdue && 'border-red-500/30 bg-red-500/10',
                    checkpoint.status === 'pending' && !isOverdue && 'border-white/10',
                    checkpoint.status === 'passed' && 'border-emerald-500/30',
                    checkpoint.status === 'failed' && 'border-red-500/30',
                    checkpoint.status === 'skipped' && 'border-slate-500/30'
                  )}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'absolute left-4 top-6 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      colors.dot
                    )}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-white/40">#{checkpoint.checkpoint_number}</span>
                        <span className="font-semibold text-white">{checkpoint.name}</span>
                        <StatusBadge status={checkpoint.status} size="sm" />
                        {isOverdue && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      {checkpoint.description && (
                        <p className="text-sm text-white/60 mb-2">{checkpoint.description}</p>
                      )}

                      {/* Dates and Progress */}
                      <div className="flex items-center gap-4 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Target: {new Date(checkpoint.target_date).toLocaleDateString()}
                        </span>
                        {checkpoint.actual_date && (
                          <span>Actual: {new Date(checkpoint.actual_date).toLocaleDateString()}</span>
                        )}
                        <span className="font-mono">
                          {checkpoint.target_percentage}% target
                          {checkpoint.actual_percentage !== undefined && (
                            <> / {checkpoint.actual_percentage}% actual</>
                          )}
                        </span>
                      </div>

                      {/* Review Info */}
                      {checkpoint.reviewed_by_name && (
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-white/40">
                          <UserIcon className="w-3 h-3" />
                          Reviewed by {checkpoint.reviewed_by_name} on{' '}
                          {checkpoint.reviewed_at && new Date(checkpoint.reviewed_at).toLocaleDateString()}
                        </div>
                      )}

                      {/* Review Notes */}
                      {checkpoint.review_notes && (
                        <div className="mt-2 p-2 bg-black/20 rounded text-sm text-white/60">
                          {checkpoint.review_notes}
                        </div>
                      )}
                    </div>

                    {/* Actions for pending */}
                    {checkpoint.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(checkpoint)}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-sm transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Pass
                        </button>
                        <button
                          onClick={() => handleFail(checkpoint)}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          Fail
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
