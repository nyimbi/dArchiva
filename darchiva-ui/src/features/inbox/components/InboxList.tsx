// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
    Inbox,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    MoreHorizontal,
    MessageSquare,
    FileText,
    Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkflowTasks, useTaskAction } from '@/features/home/api/hooks';
import type { WorkflowTask, TaskPriority } from '@/features/home/types';

export function InboxList() {
    const { data: tasks, isLoading } = useWorkflowTasks();
    const taskAction = useTaskAction();
    const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');

    const filteredTasks = tasks?.filter(task => {
        if (filter === 'all') return true;
        if (filter === 'pending') return task.status === 'pending';
        if (filter === 'overdue') return task.status === 'overdue';
        return true;
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-2">
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                >
                    All Tasks
                </Button>
                <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                >
                    Pending
                </Button>
                <Button
                    variant={filter === 'overdue' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('overdue')}
                >
                    Overdue
                </Button>
            </div>

            {/* List */}
            {!filteredTasks || filteredTasks.length === 0 ? (
                <div className="text-center py-20 glass-card">
                    <Inbox className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Your inbox is empty</h3>
                    <p className="text-sm text-slate-500">No tasks awaiting your attention</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredTasks.map((task) => (
                        <TaskRow
                            key={task.id}
                            task={task}
                            onAction={(actionId) => taskAction.mutate({ task_id: task.id, action_id: actionId })}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function TaskRow({ task, onAction }: { task: WorkflowTask; onAction: (id: string) => void }) {
    const navigate = useNavigate();
    const priorityColors: Record<TaskPriority, string> = {
        urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
        high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    };

    return (
        <div className={cn(
            'group glass-card p-4 flex items-center gap-4 hover:border-brass-500/30 transition-all cursor-pointer',
            task.status === 'overdue' && 'border-red-500/30'
        )}
            onClick={() => navigate(`/documents?nodeId=${task.document_id}`)}
        >
            <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                task.status === 'overdue' ? 'bg-red-500/10 text-red-500' : 'bg-brass-500/10 text-brass-500'
            )}>
                {task.status === 'overdue' ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-slate-200 truncate">{task.title}</h4>
                    <Badge variant="outline" className={cn('text-3xs uppercase tracking-tighter', priorityColors[task.priority])}>
                        {task.priority}
                    </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {task.document_title}
                    </span>
                    <span>•</span>
                    <span>Assigned {formatDistanceToNow(new Date(task.assigned_at), { addSuffix: true })}</span>
                    {task.due_date && (
                        <>
                            <span>•</span>
                            <span className={cn(task.status === 'overdue' && 'text-red-400 font-medium')}>
                                Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {task.actions.map((action) => (
                    <Button
                        key={action.id}
                        size="sm"
                        variant={action.id === 'approve' ? 'default' : 'outline'}
                        className={cn(
                            'h-8 px-3 text-xs',
                            action.id === 'approve' && 'bg-green-600 hover:bg-green-700 text-white border-none'
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction(action.id);
                        }}
                    >
                        {action.label}
                    </Button>
                ))}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); /* Add comment logic */ }}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Add Comment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/documents?nodeId=${task.document_id}`); }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Document
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-slate-400 transition-colors" />
        </div>
    );
}
