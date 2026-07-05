// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNotifications,
  useMarkAllAsRead,
  useDismissNotification,
  useMarkAsRead,
} from '@/features/notifications/api/hooks';
import { useWorkflowTasks, useTaskAction } from '@/features/home/api/hooks';
import type { Notification } from '@/features/notifications/types';
import type { WorkflowTask } from '@/features/home/types';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle,
  ExternalLink,
  FileText,
  Info,
  Inbox as InboxIcon,
  Paperclip,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Unified inbox message type
// ---------------------------------------------------------------------------

type InboxTab = 'all' | 'unread' | 'approvals' | 'mentions' | 'system';
type MessageCategory = 'approval' | 'system' | 'mention' | 'info';

interface InboxMessage {
  id: string;
  category: MessageCategory;
  from: string;
  fromInitials: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  read: boolean;
  hasAttachment: boolean;
  link?: string;
  documentId?: string;
  task?: WorkflowTask;
  notif?: Notification;
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

const NOTIF_CATEGORY: Record<string, MessageCategory> = {
  expiry_reminder: 'system',
  ocr_complete: 'info',
  classification_done: 'info',
  batch_complete: 'info',
  auto_routing: 'info',
  system: 'system',
  success: 'info',
  error: 'system',
  warning: 'system',
  info: 'info',
};

function notifToMessage(n: Notification): InboxMessage {
  const body = n.body ?? n.message;
  return {
    id: `notif-${n.id}`,
    category: NOTIF_CATEGORY[n.type] ?? 'info',
    from: 'System',
    fromInitials: 'SY',
    subject: n.title,
    preview: body.slice(0, 120),
    body,
    timestamp: n.timestamp,
    read: n.read,
    hasAttachment: false,
    link: n.link,
    documentId: n.data?.document_id,
    notif: n,
  };
}

function taskToMessage(t: WorkflowTask): InboxMessage {
  const name = t.assigned_by?.name ?? 'Workflow Engine';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const body =
    t.description ??
    `Approval required for "${t.document_title ?? t.title}". Workflow: ${t.workflow_name}.`;
  return {
    id: `task-${t.id}`,
    category: 'approval',
    from: name,
    fromInitials: initials,
    subject: t.title,
    preview: body.slice(0, 120),
    body,
    timestamp: t.assigned_at,
    // pending tasks are "unread" — not yet actioned
    read: t.status !== 'pending',
    hasAttachment: !!t.document_id,
    documentId: t.document_id,
    task: t,
  };
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

interface CategoryMeta {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colour: string;
}

const CAT_META: Record<MessageCategory, CategoryMeta> = {
  approval: { label: 'Approval',  Icon: CheckCircle,  colour: 'text-green-400'  },
  system:   { label: 'System',    Icon: AlertTriangle, colour: 'text-orange-400' },
  mention:  { label: 'Mention',   Icon: Tag,           colour: 'text-blue-400'   },
  info:     { label: 'Info',      Icon: Info,          colour: 'text-slate-400'  },
};

const BADGE_STYLE: Record<MessageCategory, string> = {
  approval: 'bg-green-500/10 text-green-400 border-green-500/20',
  system:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  mention:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  info:     'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function filterMessages(
  messages: InboxMessage[],
  tab: InboxTab,
  query: string,
): InboxMessage[] {
  let result = messages;

  if (tab === 'unread')    result = result.filter((m) => !m.read);
  else if (tab === 'approvals') result = result.filter((m) => m.category === 'approval');
  else if (tab === 'mentions')  result = result.filter((m) => m.category === 'mention');
  else if (tab === 'system')    result = result.filter((m) => m.category === 'system');

  const q = query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q),
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Empty-state copy per tab
// ---------------------------------------------------------------------------

const EMPTY_COPY: Record<InboxTab, { title: string; desc: string }> = {
  all:       { title: 'Inbox is empty',           desc: 'No messages or tasks yet'                        },
  unread:    { title: 'All caught up',             desc: 'No unread messages'                              },
  approvals: { title: 'No approvals pending',      desc: 'Documents assigned to you will appear here'     },
  mentions:  { title: 'No mentions',               desc: 'When someone mentions you it will appear here'  },
  system:    { title: 'No system alerts',           desc: 'System notifications will appear here'         },
};

// ---------------------------------------------------------------------------
// MessageRow — left panel item
// ---------------------------------------------------------------------------

function MessageRow({
  msg,
  selected,
  active,
  onSelect,
  onClick,
}: {
  msg: InboxMessage;
  selected: boolean;
  active: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
}) {
  const meta = CAT_META[msg.category];

  let ago = '';
  try {
    ago = formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true });
  } catch { /* ignore malformed timestamps */ }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(
        'group relative flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-slate-800/50 transition-colors',
        active
          ? 'bg-brass-500/10 border-l-2 border-l-brass-500'
          : 'hover:bg-slate-800/40',
        !msg.read && !active && 'bg-slate-900/60',
      )}
    >
      {/* Checkbox — visible on hover or when any row selected */}
      <div
        className={cn(
          'mt-0.5 transition-opacity',
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(!!v)}
          className="h-4 w-4 border-slate-600"
        />
      </div>

      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-semibold bg-slate-700 text-slate-300">
          {msg.fromInitials}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'text-xs truncate',
              msg.read ? 'text-slate-400 font-normal' : 'text-slate-200 font-semibold',
            )}
          >
            {msg.from}
          </span>
          <span className="text-[10px] text-slate-600 shrink-0">{ago}</span>
        </div>

        <div
          className={cn(
            'text-xs truncate mb-1',
            msg.read ? 'text-slate-500' : 'text-slate-300 font-medium',
          )}
        >
          {msg.subject}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-600 truncate flex-1">{msg.preview}</span>
          {msg.hasAttachment && <Paperclip className="h-3 w-3 text-slate-600 shrink-0" />}
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1 py-0 h-4 leading-none shrink-0 border',
              BADGE_STYLE[msg.category],
            )}
          >
            {meta.label}
          </Badge>
        </div>
      </div>

      {/* Unread dot */}
      {!msg.read && (
        <div className="mt-2 h-2 w-2 rounded-full bg-brass-500 shrink-0" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageDetail — right panel
// ---------------------------------------------------------------------------

function MessageDetail({
  msg,
  onDismiss,
  onTaskAction,
}: {
  msg: InboxMessage;
  onDismiss: () => void;
  onTaskAction: (taskId: string, actionId: string) => void;
}) {
  const navigate = useNavigate();
  const meta = CAT_META[msg.category];
  const Icon = meta.Icon;

  let dateStr = '';
  try {
    dateStr = format(new Date(msg.timestamp), 'PPpp');
  } catch { /* ignore */ }

  const { task, notif } = msg;
  const taskDocId = task?.document_id;

  const dueDateStr = task?.due_date
    ? (() => {
        try {
          return formatDistanceToNow(new Date(task.due_date), { addSuffix: true });
        } catch {
          return '';
        }
      })()
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('mt-0.5 rounded-full p-1.5 bg-slate-800/80', meta.colour)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-100 leading-tight">{msg.subject}</h2>
            <Badge
              variant="outline"
              className={cn('mt-1 text-[10px] border', BADGE_STYLE[msg.category])}
            >
              {meta.label}
            </Badge>
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-xs ml-1">
          <span className="font-medium text-slate-500">From</span>
          <span className="text-slate-300">{msg.from}</span>

          <span className="font-medium text-slate-500">To</span>
          <span className="text-slate-300">You</span>

          <span className="font-medium text-slate-500">Date</span>
          <span className="text-slate-300">{dateStr}</span>

          {task?.document_title && (
            <>
              <span className="font-medium text-slate-500">Document</span>
              <span className="text-slate-300 flex items-center gap-1">
                <FileText className="h-3 w-3 shrink-0 text-slate-500" />
                {task.document_title}
              </span>
            </>
          )}

          {dueDateStr && (
            <>
              <span className="font-medium text-slate-500">Due</span>
              <span
                className={cn(
                  'text-slate-300',
                  task?.status === 'overdue' && 'text-red-400 font-semibold',
                )}
              >
                {dueDateStr}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 py-5 overflow-y-auto">
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
      </div>

      <Separator className="bg-slate-800/50" />

      {/* Action bar */}
      <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
        {/* Approval task actions */}
        {task &&
          task.actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.type === 'approve' ? 'default' : 'outline'}
              className={cn(
                action.type === 'approve' &&
                  'bg-green-600 hover:bg-green-700 text-white border-none',
                action.type === 'reject' &&
                  'border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300',
              )}
              onClick={() => onTaskAction(task.id, action.id)}
            >
              {action.label}
            </Button>
          ))}

        {/* View Document for tasks */}
        {taskDocId && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => navigate(`/documents?nodeId=${taskDocId}`)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            View Document
          </Button>
        )}

        {/* Notification actions */}
        {notif && !task && (
          <>
            {(notif.data?.document_id || notif.link) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const docId = notif.data?.document_id;
                  if (docId) {
                    navigate(`/documents?nodeId=${docId}`);
                  } else if (notif.link) {
                    window.open(notif.link, '_blank');
                  }
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {notif.data?.document_id ? 'View Document' : 'Open Link'}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-slate-500 hover:text-slate-300"
              onClick={onDismiss}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Dismiss
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox page
// ---------------------------------------------------------------------------

const TABS: { key: InboxTab; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'unread',    label: 'Unread'    },
  { key: 'approvals', label: 'Approvals' },
  { key: 'mentions',  label: 'Mentions'  },
  { key: 'system',    label: 'System'    },
];

export function Inbox() {
  const [activeTab, setActiveTab]         = useState<InboxTab>('all');
  const [query, setQuery]                 = useState('');
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const { data: rawNotifs = [], isLoading: notifsLoading } = useNotifications();
  const { data: rawTasks  = [], isLoading: tasksLoading  } = useWorkflowTasks();
  const markAsRead    = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const dismiss       = useDismissNotification();
  const taskAction    = useTaskAction();

  const isLoading = notifsLoading || tasksLoading;

  // Merge & sort descending
  const allMessages = useMemo<InboxMessage[]>(() => {
    const notifMessages = rawNotifs.map(notifToMessage);
    const taskMessages  = rawTasks.map(taskToMessage);
    return [...notifMessages, ...taskMessages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [rawNotifs, rawTasks]);

  const filtered = useMemo(
    () => filterMessages(allMessages, activeTab, query),
    [allMessages, activeTab, query],
  );

  const activeMessage = allMessages.find((m) => m.id === activeMessageId) ?? null;

  const counts = useMemo(
    () => ({
      all:       allMessages.length,
      unread:    allMessages.filter((m) => !m.read).length,
      approvals: allMessages.filter((m) => m.category === 'approval').length,
      mentions:  allMessages.filter((m) => m.category === 'mention').length,
      system:    allMessages.filter((m) => m.category === 'system').length,
    }),
    [allMessages],
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0;

  function handleSelectMessage(id: string) {
    setActiveMessageId(id);
    const msg = allMessages.find((m) => m.id === id);
    if (!msg?.read && msg?.notif) {
      markAsRead.mutate(msg.notif.id);
    }
  }

  function handleToggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map((m) => m.id)));
    else setSelectedIds(new Set());
  }

  function handleMarkAllRead() {
    markAllAsRead.mutate();
    setSelectedIds(new Set());
  }

  function handleDeleteSelected() {
    selectedIds.forEach((id) => {
      const msg = allMessages.find((m) => m.id === id);
      if (msg?.notif) dismiss.mutate(msg.notif.id);
    });
    if (activeMessageId && selectedIds.has(activeMessageId)) setActiveMessageId(null);
    setSelectedIds(new Set());
  }

  function handleDismissMessage(msg: InboxMessage) {
    if (msg.notif) dismiss.mutate(msg.notif.id);
    if (activeMessageId === msg.id) setActiveMessageId(null);
  }

  function handleTaskAction(taskId: string, actionId: string) {
    taskAction.mutate({ task_id: taskId, action_id: actionId });
    setActiveMessageId(null);
  }

  function switchTab(tab: InboxTab) {
    setActiveTab(tab);
    setActiveMessageId(null);
    setSelectedIds(new Set());
  }

  const empty = EMPTY_COPY[activeTab];

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Messages, approvals, and workflow tasks assigned to you
          </p>
        </div>
        {counts.unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Main split panel */}
      <div className="glass-card overflow-hidden flex h-[calc(100vh-13rem)]">
        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-800/50">
          {/* Search */}
          <div className="px-3 py-3 border-b border-slate-800/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages…"
                className="pl-8 h-8 text-xs bg-slate-900/50 border-slate-700/50 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => switchTab(v as InboxTab)}
            className="border-b border-slate-800/50"
          >
            <TabsList className="w-full h-auto flex rounded-none bg-transparent p-0 gap-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className={cn(
                    'flex-1 rounded-none border-b-2 border-transparent py-2 px-0.5 text-[11px] font-medium',
                    'text-slate-500 bg-transparent shadow-none',
                    'data-[state=active]:border-brass-500 data-[state=active]:text-brass-400',
                    'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                    'hover:text-slate-300 transition-colors',
                  )}
                >
                  {tab.label}
                  {counts[tab.key] > 0 && (
                    <span
                      className={cn(
                        'ml-1 rounded-full px-1 text-[9px] font-bold leading-none',
                        tab.key === 'unread'
                          ? 'bg-brass-500 text-slate-950'
                          : 'bg-slate-700 text-slate-400',
                      )}
                    >
                      {counts[tab.key]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Bulk action bar */}
          {someSelected && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 bg-brass-500/5">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={(v) => handleSelectAll(!!v)}
                className="h-4 w-4 border-slate-600"
              />
              <span className="text-xs text-slate-400 flex-1">
                {selectedIds.size} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-slate-400 hover:text-slate-200"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Read
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {/* Message list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-3 py-3 border-b border-slate-800/50"
                >
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                <InboxIcon className="h-10 w-10 text-slate-700 mb-3" />
                <p className="text-sm font-medium text-slate-400">{empty.title}</p>
                <p className="text-xs text-slate-600 mt-1">{empty.desc}</p>
              </div>
            ) : (
              filtered.map((msg) => (
                <MessageRow
                  key={msg.id}
                  msg={msg}
                  selected={selectedIds.has(msg.id)}
                  active={activeMessageId === msg.id}
                  onSelect={(checked) => handleToggleSelect(msg.id, checked)}
                  onClick={() => handleSelectMessage(msg.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeMessage ? (
            <MessageDetail
              msg={activeMessage}
              onDismiss={() => handleDismissMessage(activeMessage)}
              onTaskAction={handleTaskAction}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="rounded-full bg-slate-800/40 p-6 mb-4">
                <Bell className="h-10 w-10 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">Select a message to read</p>
              <p className="text-xs text-slate-600 mt-1">
                {filtered.length === 0 && !isLoading
                  ? empty.title
                  : 'Choose a message from the left panel'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Inbox;
