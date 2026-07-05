// (c) Copyright Datacraft, 2026
import {
  Designer,
  useActivateWorkflow,
  useCancelExecution,
  useCreateWorkflow,
  useDeactivateWorkflow,
  useDeleteWorkflow,
  useExecutions,
  usePendingTasks,
  useProcessWorkflowAction,
  useRunWorkflow,
  useWorkflows,
} from '@/features/workflows';
import {
  EscalationChainBuilder,
  SLAConfigManager,
  SLADashboard,
  WorkflowAlertsList,
} from '@/features/workflows/components';
import { EmptyState } from '@/components/EmptyState';
import type { PendingTask } from '@/features/workflows/api';
import type { Workflow, WorkflowEdge, WorkflowExecution, WorkflowNode } from '@/features/workflows/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn, formatRelativeTime } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  GitBranch,
  Loader2,
  MoreVertical,
  Pause,
  PenTool,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Timer,
  Trash2,
  Upload,
  Webhook,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '—';
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function getWorkflowStats(executions: WorkflowExecution[]) {
  const total = executions.length;
  const successful = executions.filter((e) => e.status === 'completed').length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : null;
  const sorted = [...executions].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
  return { total, successRate, lastRun: sorted[0] ?? null };
}

const TRIGGER_META: Record<string, { label: string; Icon: React.ElementType }> = {
  document_upload: { label: 'Document Upload', Icon: Upload },
  folder_watch:    { label: 'Folder Watch',    Icon: FolderOpen },
  schedule:        { label: 'Scheduled',        Icon: Calendar },
  manual:          { label: 'Manual',           Icon: Play },
  api:             { label: 'Webhook',          Icon: Webhook },
};

const TRIGGER_OPTIONS = [
  { value: 'document_upload' as const, label: 'Document Created', Icon: Upload,   description: 'Triggers on new document upload' },
  { value: 'folder_watch'    as const, label: 'Document Tagged',  Icon: FolderOpen, description: 'Triggers when a tag is applied' },
  { value: 'schedule'        as const, label: 'Scheduled',        Icon: Calendar, description: 'Runs on a cron schedule' },
  { value: 'manual'          as const, label: 'Manual',           Icon: Play,     description: 'Triggered manually via Run Now' },
  { value: 'api'             as const, label: 'Webhook',          Icon: Webhook,  description: 'Triggered by external webhook call' },
];

type TriggerType = typeof TRIGGER_OPTIONS[number]['value'];

// ── TaskCard ─────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: PendingTask;
  onApprove: (task: PendingTask, comments?: string) => void;
  onReject: (task: PendingTask, comments?: string) => void;
  onReturn: (task: PendingTask, comments?: string) => void;
  isProcessing: boolean;
}

function TaskCard({ task, onApprove, onReject, onReturn, isProcessing }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState('');

  return (
    <motion.div layout className="glass-card overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'mt-0.5 p-2 rounded-lg',
              task.priority === 'high'
                ? 'bg-red-500/10 text-red-400'
                : task.priority === 'urgent'
                  ? 'bg-orange-500/10 text-orange-400'
                  : task.priority === 'low'
                    ? 'bg-slate-700/50 text-slate-400'
                    : 'bg-brass-500/10 text-brass-400',
            )}
          >
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="badge badge-brass">{task.workflow_name}</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-sm text-slate-400">{task.step_name}</span>
            </div>
            <h3 className="mt-2 text-base font-medium text-slate-200">{task.document_title}</h3>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Assigned {formatRelativeTime(task.assigned_at)}
              </span>
              {task.deadline && (
                <span
                  className={cn(
                    'flex items-center gap-1',
                    new Date(task.deadline) < new Date(Date.now() + 86400000) && 'text-red-400',
                  )}
                >
                  <AlertCircle className="w-3 h-3" />
                  Due {formatRelativeTime(task.deadline)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn-primary py-1.5 px-3"
              onClick={(e) => { e.stopPropagation(); onApprove(task, comments); }}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve
            </button>
            <button
              className="btn-ghost py-1.5 px-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={(e) => { e.stopPropagation(); onReject(task, comments); }}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 bg-slate-800/20">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Document Preview</p>
                  <div className="aspect-[4/3] bg-slate-800 rounded-lg flex items-center justify-center">
                    <FileText className="w-12 h-12 text-slate-600" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Comments</p>
                  <textarea
                    className="w-full h-20 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
                    placeholder="Add a comment (optional)..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mt-3 space-y-2">
                    <button
                      className="w-full btn-ghost justify-start"
                      onClick={(e) => { e.stopPropagation(); onReturn(task, comments); }}
                      disabled={isProcessing}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Return for Changes
                    </button>
                    <a
                      href={`/document/${task.document_id}`}
                      className="w-full btn-ghost justify-start text-slate-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="w-4 h-4" />
                      View Document
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── WorkflowCard ──────────────────────────────────────────────────────────────

interface WorkflowCardProps {
  workflow: Workflow;
  executions: WorkflowExecution[];
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  onViewDetail: (workflow: Workflow) => void;
  isToggling: boolean;
}

function WorkflowCard({
  workflow,
  executions,
  onActivate,
  onDeactivate,
  onDelete,
  onRunNow,
  onViewDetail,
  isToggling,
}: WorkflowCardProps) {
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const isActive = workflow.status === 'active';
  const wfExecutions = executions.filter((e) => e.workflowId === workflow.id);
  const stats = getWorkflowStats(wfExecutions);
  const trigger = TRIGGER_META[workflow.trigger?.type] ?? { label: 'Unknown', Icon: GitBranch };
  const TriggerIcon = trigger.Icon;

  return (
    <>
      <div
        className="doc-card cursor-pointer hover:border-brass-500/30 transition-colors"
        onClick={() => onViewDetail(workflow)}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('p-2 rounded-lg flex-shrink-0', isActive ? 'bg-brass-500/10 text-brass-400' : 'bg-slate-700/50 text-slate-400')}>
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-slate-200 truncate">{workflow.name}</h3>
              <p className="text-sm text-slate-500 truncate">{workflow.description || 'No description'}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetail(workflow); }}>
                <FileText className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRunNow(workflow.id); }}>
                <Play className="w-4 h-4 mr-2" />
                Run Now
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  isActive ? onDeactivate(workflow.id) : onActivate(workflow.id);
                }}
                disabled={isToggling}
              >
                {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isActive ? 'Pause' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialog({
                    message: 'Delete this workflow? All associated instances will be cancelled.',
                    onConfirm: () => onDelete(workflow.id),
                  });
                }}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Trigger badge + step count */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
            <TriggerIcon className="w-3 h-3" />
            {trigger.label}
          </span>
          <span className="text-xs text-slate-600">{(workflow.nodes ?? []).length} steps</span>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-base font-semibold text-slate-200">{stats.total}</p>
            <p className="text-2xs text-slate-600">Runs</p>
          </div>
          <div>
            <p className={cn(
              'text-base font-semibold',
              stats.successRate === null ? 'text-slate-500'
              : stats.successRate >= 80   ? 'text-emerald-400'
              : stats.successRate >= 50   ? 'text-amber-400'
              :                             'text-red-400',
            )}>
              {stats.successRate === null ? '—' : `${stats.successRate}%`}
            </p>
            <p className="text-2xs text-slate-600">Success</p>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-200">v{workflow.version}</p>
            <p className="text-2xs text-slate-600">Version</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-700/50">
          <span className={cn('badge', isActive ? 'badge-green' : 'badge-gray')}>{workflow.status}</span>
          <span className="text-2xs text-slate-600">
            {stats.lastRun ? `Last run ${formatRelativeTime(stats.lastRun.startTime)}` : 'Never run'}
          </span>
        </div>
      </div>
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── WorkflowDetailSheet ───────────────────────────────────────────────────────

function WorkflowDetailSheet({
  workflow,
  executions,
  onClose,
  onActivate,
  onDeactivate,
  onDelete,
  onRunNow,
  isToggling,
}: {
  workflow: Workflow | null;
  executions: WorkflowExecution[];
  onClose: () => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onDelete: (id: string) => void;
  onRunNow: (id: string) => void;
  isToggling: boolean;
}) {
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const isActive = workflow?.status === 'active';
  const wfExecutions = workflow
    ? executions.filter((e) => e.workflowId === workflow.id)
    : [];
  const stats = workflow ? getWorkflowStats(wfExecutions) : null;
  const trigger = workflow
    ? (TRIGGER_META[workflow.trigger?.type] ?? { label: 'Unknown', Icon: GitBranch })
    : null;
  const TriggerIcon = trigger?.Icon ?? GitBranch;

  return (
    <>
      <Sheet open={!!workflow} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          className="w-[480px] sm:max-w-[480px] bg-slate-900 border-slate-700 flex flex-col overflow-y-auto"
          side="right"
        >
        {workflow && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg flex-shrink-0', isActive ? 'bg-brass-500/10 text-brass-400' : 'bg-slate-700/50 text-slate-400')}>
                  <GitBranch className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-slate-100 truncate">{workflow.name}</SheetTitle>
                  <SheetDescription className="text-slate-500 mt-0.5">
                    {workflow.description || 'No description'}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-5 flex-1">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xl font-semibold text-slate-200">{stats?.total ?? 0}</p>
                  <p className="text-xs text-slate-500">Total Runs</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className={cn(
                    'text-xl font-semibold',
                    stats?.successRate == null ? 'text-slate-500'
                    : stats.successRate >= 80   ? 'text-emerald-400'
                    : stats.successRate >= 50   ? 'text-amber-400'
                    :                             'text-red-400',
                  )}>
                    {stats?.successRate == null ? '—' : `${stats.successRate}%`}
                  </p>
                  <p className="text-xs text-slate-500">Success Rate</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xl font-semibold text-slate-200">v{workflow.version}</p>
                  <p className="text-xs text-slate-500">Version</p>
                </div>
              </div>

              {/* Trigger */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Trigger</p>
                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                  <TriggerIcon className="w-4 h-4 text-brass-400" />
                  <span className="text-sm text-slate-300">{trigger?.label}</span>
                </div>
                {workflow.trigger?.config && Object.keys(workflow.trigger.config).length > 0 && (
                  <pre className="mt-2 p-2 bg-slate-800/30 rounded font-mono text-xs text-slate-400 overflow-x-auto">
                    {JSON.stringify(workflow.trigger.config, null, 2)}
                  </pre>
                )}
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Steps */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Steps ({(workflow.nodes ?? []).length})
                </p>
                {(workflow.nodes ?? []).length === 0 ? (
                  <p className="text-sm text-slate-600">No steps configured — open the visual designer to add steps.</p>
                ) : (
                  <div className="space-y-1">
                    {workflow.nodes.map((node, i) => (
                      <div
                        key={node.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/30"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-sm text-slate-300 flex-1">{node.label}</span>
                        <span className="text-xs text-slate-600 capitalize">{node.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Recent executions */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Recent Executions</p>
                {wfExecutions.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No executions yet"
                    description="Run a workflow to see execution history here."
                  />
                ) : (
                  <div className="space-y-2">
                    {wfExecutions.slice(0, 6).map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg text-xs"
                      >
                        <span className={cn(
                          'badge text-2xs',
                          exec.status === 'completed'  ? 'badge-green'
                          : exec.status === 'running'  ? 'badge-brass'
                          : exec.status === 'failed'   ? 'badge-red'
                          :                              'badge-gray',
                        )}>
                          {exec.status}
                        </span>
                        <span className="text-slate-500 flex-1 font-mono truncate">{exec.id.slice(0, 8)}…</span>
                        <span className="text-slate-500">{formatRelativeTime(exec.startTime)}</span>
                        <span className="text-slate-600 flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {formatDuration(exec.startTime, exec.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 pb-2">
                <button
                  className={cn(
                    'flex-1 btn-ghost text-sm',
                    isActive
                      ? 'text-orange-400 hover:bg-orange-500/10'
                      : 'text-emerald-400 hover:bg-emerald-500/10',
                  )}
                  onClick={() => isActive ? onDeactivate(workflow.id) : onActivate(workflow.id)}
                  disabled={isToggling}
                >
                  {isToggling
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isActive ? 'Pause' : 'Activate'}
                </button>
                <button
                  className="flex-1 btn-primary text-sm"
                  onClick={() => { onClose(); onRunNow(workflow.id); }}
                >
                  <Play className="w-4 h-4" />
                  Run Now
                </button>
                <button
                  className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() =>
                    setConfirmDialog({
                      message: 'Delete this workflow? All associated instances will be cancelled.',
                      onConfirm: () => {
                        onClose();
                        onDelete(workflow.id);
                      },
                    })
                  }
                  title="Delete workflow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── CreateWorkflowDialog ──────────────────────────────────────────────────────

function CreateWorkflowDialog({
  open,
  onOpenChange,
  onConfirm,
  onOpenDesigner,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, trigger: TriggerType) => Promise<void>;
  onOpenDesigner: () => void;
  isCreating: boolean;
}) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('manual');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onConfirm(name.trim(), trigger);
    setName('');
    setTrigger('manual');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-400">Workflow Name</Label>
            <Input
              placeholder="e.g., Invoice Approval"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-400">Trigger Type</Label>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map((opt) => {
                const Icon = opt.Icon;
                const selected = trigger === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTrigger(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      selected
                        ? 'border-brass-500/50 bg-brass-500/10'
                        : 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/60',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', selected ? 'text-brass-400' : 'text-slate-500')} />
                    <div>
                      <p className={cn('text-sm font-medium', selected ? 'text-brass-300' : 'text-slate-300')}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-slate-500">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            className="btn-ghost flex-1"
            type="button"
            onClick={() => { onOpenChange(false); onOpenDesigner(); }}
          >
            <PenTool className="w-4 h-4" />
            Visual Designer
          </button>
          <button
            className="btn-primary flex-1"
            type="button"
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── RunWorkflowDialog ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function RunWorkflowDialog({
  workflowId,
  open,
  onOpenChange,
  onRun,
  isRunning,
}: {
  workflowId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (workflowId: string, documentId: string) => Promise<void>;
  isRunning: boolean;
}) {
  const [documentId, setDocumentId] = useState('');
  const isValid = UUID_RE.test(documentId.trim());

  const handleRun = async () => {
    if (!workflowId || !isValid) return;
    await onRun(workflowId, documentId.trim());
    setDocumentId('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setDocumentId(''); onOpenChange(o); }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Run Workflow Now</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-500">
            Enter the document ID to process through this workflow.
          </p>
          <div className="space-y-1.5">
            <Label className="text-slate-400">Document ID (UUID)</Label>
            <Input
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleRun(); }}
              className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm placeholder:text-slate-600"
              autoFocus
            />
            {documentId && !isValid && (
              <p className="text-xs text-red-400">Must be a valid UUID</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button className="btn-ghost" onClick={() => onOpenChange(false)}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleRun}
            disabled={!isValid || isRunning}
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Workflows (main page) ─────────────────────────────────────────────────────

export function Workflows() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'workflows' | 'instances' | 'sla' | 'alerts'>('tasks');
  const [showDesigner, setShowDesigner] = useState(false);
  const [togglingWorkflowId, setTogglingWorkflowId] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [runTarget, setRunTarget] = useState<string | null>(null);

  // API hooks
  const { data: workflowsData, isLoading: workflowsLoading, isError: workflowsError, refetch: refetchWorkflows } = useWorkflows();
  const { data: executionsData, isLoading: executionsLoading, isError: executionsError, refetch: refetchExecutions } = useExecutions();
  const { data: pendingTasksData, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = usePendingTasks();

  const createWorkflowMutation   = useCreateWorkflow();
  const activateWorkflowMutation = useActivateWorkflow();
  const deactivateWorkflowMutation = useDeactivateWorkflow();
  const deleteWorkflowMutation   = useDeleteWorkflow();
  const processActionMutation    = useProcessWorkflowAction();
  const cancelExecutionMutation  = useCancelExecution();
  const runWorkflowMutation      = useRunWorkflow();

  const workflows    = workflowsData?.items ?? [];
  const executions   = executionsData?.items ?? [];
  const pendingTasks = pendingTasksData?.tasks ?? [];

  // ── Handlers ──

  const handleSaveWorkflow = async (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    try {
      await createWorkflowMutation.mutateAsync({
        name: 'New Workflow',
        description: 'Created from visual designer',
        nodes,
        edges,
      });
      toast.success('Workflow saved successfully');
      setShowDesigner(false);
      refetchWorkflows();
    } catch {
      toast.error('Failed to save workflow');
    }
  };

  const handleCreateWorkflow = async (name: string, triggerType: TriggerType) => {
    try {
      await createWorkflowMutation.mutateAsync({
        name,
        description: '',
        nodes: [],
        edges: [],
        trigger: { type: triggerType, config: {} },
      });
      toast.success('Workflow created');
      setShowCreateDialog(false);
      refetchWorkflows();
    } catch {
      toast.error('Failed to create workflow');
    }
  };

  const handleActivateWorkflow = async (id: string) => {
    setTogglingWorkflowId(id);
    try {
      await activateWorkflowMutation.mutateAsync(id);
      toast.success('Workflow activated');
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow((prev) => prev ? { ...prev, status: 'active' } : null);
      }
    } catch {
      toast.error('Failed to activate workflow');
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  const handleDeactivateWorkflow = async (id: string) => {
    setTogglingWorkflowId(id);
    try {
      await deactivateWorkflowMutation.mutateAsync(id);
      toast.success('Workflow paused');
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow((prev) => prev ? { ...prev, status: 'archived' } : null);
      }
    } catch {
      toast.error('Failed to pause workflow');
    } finally {
      setTogglingWorkflowId(null);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await deleteWorkflowMutation.mutateAsync(id);
      toast.success('Workflow deleted');
      if (selectedWorkflow?.id === id) setSelectedWorkflow(null);
      refetchWorkflows();
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const handleRunWorkflow = async (workflowId: string, documentId: string) => {
    try {
      await runWorkflowMutation.mutateAsync({ id: workflowId, input: { documentId } });
      toast.success('Workflow started');
      setRunTarget(null);
      refetchExecutions();
    } catch {
      toast.error('Failed to start workflow');
    }
  };

  const handleApproveTask = async (task: PendingTask, comments?: string) => {
    try {
      await processActionMutation.mutateAsync({
        instanceId: task.instance_id,
        request: { execution_id: task.id, action: 'approved', comments },
      });
      toast.success('Task approved');
    } catch {
      toast.error('Failed to approve task');
    }
  };

  const handleRejectTask = async (task: PendingTask, comments?: string) => {
    try {
      await processActionMutation.mutateAsync({
        instanceId: task.instance_id,
        request: { execution_id: task.id, action: 'rejected', comments },
      });
      toast.success('Task rejected');
    } catch {
      toast.error('Failed to reject task');
    }
  };

  const handleReturnTask = async (task: PendingTask, comments?: string) => {
    try {
      await processActionMutation.mutateAsync({
        instanceId: task.instance_id,
        request: { execution_id: task.id, action: 'returned', comments },
      });
      toast.success('Task returned for changes');
    } catch {
      toast.error('Failed to return task');
    }
  };

  const handleCancelExecution = async (executionId: string) => {
    try {
      await cancelExecutionMutation.mutateAsync(executionId);
      toast.success('Execution cancelled');
    } catch {
      toast.error('Failed to cancel execution');
    }
  };

  // ── Visual Designer fullscreen ──

  if (showDesigner) {
    return (
      <div className="h-[calc(100vh-4rem)] -m-6">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
            <h2 className="font-display font-semibold text-slate-100">Workflow Designer</h2>
            <button
              onClick={() => setShowDesigner(false)}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700/50"
            >
              Close Designer
            </button>
          </div>
          <div className="flex-1">
            <Designer onSave={handleSaveWorkflow} />
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Workflows</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage document workflows and approval processes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowDesigner(true)} className="btn-ghost">
            <PenTool className="w-4 h-4" />
            Visual Designer
          </button>
          <button className="btn-primary" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        {[
          { id: 'tasks',     label: 'My Tasks',  count: pendingTasks.length },
          { id: 'workflows', label: 'Workflows', count: workflows.length },
          {
            id: 'instances',
            label: 'Active',
            count: executions.filter((e) => e.status === 'running' || e.status === 'pending').length,
          },
          { id: 'sla', label: 'SLA & Config', count: 0 },
          { id: 'alerts', label: 'Alerts & Escalation', count: 0 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-2xs rounded',
                  activeTab === tab.id
                    ? 'bg-brass-500 text-slate-900'
                    : 'bg-slate-700 text-slate-400',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {/* My Tasks */}
        {activeTab === 'tasks' && (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <button
                className="btn-ghost text-xs"
                onClick={() => refetchTasks()}
                disabled={tasksLoading}
              >
                <RefreshCw className={cn('w-3 h-3', tasksLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : tasksError ? (
              <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-400">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-sm">Failed to load workflow tasks.</p>
                <button className="btn-ghost text-xs" onClick={() => refetchTasks()}>
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : pendingTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All caught up"
                description="You have no pending workflow tasks."
              />
            ) : (
              pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onApprove={handleApproveTask}
                  onReject={handleRejectTask}
                  onReturn={handleReturnTask}
                  isProcessing={processActionMutation.isPending}
                />
              ))
            )}
          </motion.div>
        )}

        {/* Workflows */}
        {activeTab === 'workflows' && (
          <motion.div
            key="workflows"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-end mb-4">
              <button
                className="btn-ghost text-xs"
                onClick={() => refetchWorkflows()}
                disabled={workflowsLoading}
              >
                <RefreshCw className={cn('w-3 h-3', workflowsLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>
            {workflowsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : workflowsError ? (
              <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-400">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-sm">Failed to load workflows.</p>
                <button className="btn-ghost text-xs" onClick={() => refetchWorkflows()}>
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : workflows.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No workflows yet"
                description="Create your first workflow to automate document processing."
                action={{ label: 'Create Workflow', onClick: () => setShowCreateDialog(true) }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    executions={executions}
                    onActivate={handleActivateWorkflow}
                    onDeactivate={handleDeactivateWorkflow}
                    onDelete={handleDeleteWorkflow}
                    onRunNow={(id) => setRunTarget(id)}
                    onViewDetail={setSelectedWorkflow}
                    isToggling={togglingWorkflowId === workflow.id}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Active Executions */}
        {activeTab === 'instances' && (
          <motion.div
            key="instances"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex justify-end mb-4">
              <button
                className="btn-ghost text-xs"
                onClick={() => refetchExecutions()}
                disabled={executionsLoading}
              >
                <RefreshCw className={cn('w-3 h-3', executionsLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>
            {executionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : executionsError ? (
              <div className="glass-card p-8 flex flex-col items-center gap-3 text-slate-400">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <p className="text-sm">Failed to load workflow executions.</p>
                <button className="btn-ghost text-xs" onClick={() => refetchExecutions()}>
                  <RefreshCw className="w-3 h-3" />
                  Retry
                </button>
              </div>
            ) : executions.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Play className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-slate-200">No executions</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Workflow executions will appear here when documents are processed.
                </p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Execution ID</th>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Current Step</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th className="w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((execution) => {
                      const wf = workflows.find((w) => w.id === execution.workflowId);
                      return (
                        <tr key={execution.id}>
                          <td className="font-mono text-xs text-slate-500">
                            {execution.id.slice(0, 8)}…
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-slate-500" />
                              <span className="text-slate-200">
                                {wf?.name ?? `v${execution.workflowVersion}`}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={cn(
                              'badge',
                              execution.status === 'running'    ? 'badge-brass'
                              : execution.status === 'completed' ? 'badge-green'
                              : execution.status === 'failed'    ? 'badge-red'
                              :                                    'badge-gray',
                            )}>
                              {execution.status}
                            </span>
                          </td>
                          <td className="text-slate-400 text-sm">
                            {execution.currentNodeId || '—'}
                          </td>
                          <td className="text-slate-400">
                            {formatRelativeTime(execution.startTime)}
                          </td>
                          <td className="text-slate-500 text-sm">
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {formatDuration(execution.startTime, execution.endTime)}
                            </span>
                          </td>
                          <td>
                            {(execution.status === 'running' || execution.status === 'pending') && (
                              <button
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                                onClick={() => handleCancelExecution(execution.id)}
                                disabled={cancelExecutionMutation.isPending}
                                title="Cancel execution"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* SLA & Config */}
        {activeTab === 'sla' && (
          <motion.div
            key="sla"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <SLADashboard />
            <SLAConfigManager workflowId="all" />
          </motion.div>
        )}

        {/* Alerts & Escalation */}
        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <WorkflowAlertsList />
            <EscalationChainBuilder workflowId="all" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workflow detail sheet */}
      <WorkflowDetailSheet
        workflow={selectedWorkflow}
        executions={executions}
        onClose={() => setSelectedWorkflow(null)}
        onActivate={handleActivateWorkflow}
        onDeactivate={handleDeactivateWorkflow}
        onDelete={handleDeleteWorkflow}
        onRunNow={(id) => setRunTarget(id)}
        isToggling={togglingWorkflowId === selectedWorkflow?.id}
      />

      {/* Create workflow dialog */}
      <CreateWorkflowDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onConfirm={handleCreateWorkflow}
        onOpenDesigner={() => { setShowCreateDialog(false); setShowDesigner(true); }}
        isCreating={createWorkflowMutation.isPending}
      />

      {/* Run Now dialog */}
      <RunWorkflowDialog
        workflowId={runTarget}
        open={!!runTarget}
        onOpenChange={(open) => { if (!open) setRunTarget(null); }}
        onRun={handleRunWorkflow}
        isRunning={runWorkflowMutation.isPending}
      />
    </div>
  );
}
