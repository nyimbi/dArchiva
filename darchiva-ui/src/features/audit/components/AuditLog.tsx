// (c) Copyright Datacraft, 2026
/**
 * Audit log viewer — aligned with backend AuditLog schema.
 *
 * Backend fields: id, table_name, record_id, operation, timestamp, user_id, username
 * Operations: INSERT | UPDATE | DELETE | TRUNCATE
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import {
  Activity,
  Download,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuditLogs, useExportAuditLog } from '../api';
import type { AuditLogEntry, AuditOperation } from '../types';
import {
  ALL_OPERATIONS,
  OPERATION_BADGE_VARIANTS,
  OPERATION_COLORS,
  OPERATION_LABELS,
} from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Deterministic color from a string (for user initials avatars). */
function stringToColor(s: string): string {
  const PALETTE = [
    'bg-violet-600', 'bg-blue-600', 'bg-teal-600', 'bg-emerald-600',
    'bg-amber-600',  'bg-rose-600', 'bg-fuchsia-600', 'bg-cyan-600',
    'bg-indigo-600', 'bg-lime-600',
  ];
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(username: string | undefined): string {
  if (!username) return '?';
  const parts = username.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

/**
 * Map backend table_name + operation → human-readable sentence.
 * e.g. (nodes, INSERT) → "Created document/folder"
 */
function describeAction(tableName: string, operation: AuditOperation): string {
  const opLabel = OPERATION_LABELS[operation] ?? operation;
  const tableMap: Record<string, string> = {
    nodes:         'node',
    documents:     'document',
    document_versions: 'document version',
    pages:         'page',
    users:         'user',
    groups:        'group',
    roles:         'role',
    tags:          'tag',
    folders:       'folder',
    workflows:     'workflow',
    custom_fields: 'custom field',
    document_types:'document type',
    tasks:         'task',
    api_tokens:    'API token',
  };
  const friendly = tableMap[tableName] ?? tableName.replace(/_/g, ' ');
  return `${opLabel} ${friendly}`;
}

// ── component props ───────────────────────────────────────────────────────────

interface AuditLogProps {
  /** Lock to a specific record id (e.g. a document page). */
  recordId?: string;
  /** Lock to a specific user id. */
  userId?: string;
  /** If true, suppress the user filter row (already scoped). */
  hideUserFilter?: boolean;
}

// ── main component ────────────────────────────────────────────────────────────

export function AuditLog({ recordId, userId, hideUserFilter = false }: AuditLogProps) {
  const navigate = useNavigate();

  // ── filter state ────────────────────────────────────────────────────────────
  const [page, setPage]                   = useState(1);
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [userSearch, setUserSearch]       = useState<string>(userId ?? '');
  const [documentSearch, setDocumentSearch] = useState<string>(recordId ?? '');
  const [dateFrom, setDateFrom]           = useState<string>('');
  const [dateTo, setDateTo]               = useState<string>('');
  const [exporting, setExporting]         = useState<'csv' | 'pdf' | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const { exportLogs } = useExportAuditLog();

  const hasActiveFilters =
    operationFilter !== 'all' || userSearch || documentSearch || dateFrom || dateTo;

  function clearFilters() {
    setOperationFilter('all');
    setUserSearch(userId ?? '');
    setDocumentSearch(recordId ?? '');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  // ── query ───────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching, refetch } = useAuditLogs({
    page,
    pageSize: 50,
    filterOperation: operationFilter !== 'all' ? operationFilter : undefined,
    filterUsername:  userSearch && !isUuid(userSearch) ? userSearch : undefined,
    filterUserId:    userSearch &&  isUuid(userSearch) ? userSearch : undefined,
    filterRecordId:  documentSearch || undefined,
    filterTimestampFrom: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
    filterTimestampTo:   dateTo   ? `${dateTo}T23:59:59Z`   : undefined,
  });

  const entries    = data?.items    ?? [];
  const totalItems = data?.totalItems ?? 0;
  const numPages   = data?.numPages   ?? 0;

  // ── export ──────────────────────────────────────────────────────────────────
  function buildExportParams(fmt: 'csv' | 'pdf') {
    return {
      format: fmt,
      filterOperation:     operationFilter !== 'all' ? operationFilter : undefined,
      filterUsername:      userSearch && !isUuid(userSearch) ? userSearch : undefined,
      filterUserId:        userSearch &&  isUuid(userSearch) ? userSearch : undefined,
      filterRecordId:      documentSearch || undefined,
      filterTimestampFrom: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
      filterTimestampTo:   dateTo   ? `${dateTo}T23:59:59Z`   : undefined,
    };
  }

  async function handleExport(fmt: 'csv' | 'pdf') {
    setExporting(fmt);
    try {
      await exportLogs(buildExportParams(fmt));
    } finally {
      setExporting(null);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800">
        <Filter className="h-4 w-4 text-muted-foreground self-center shrink-0" />

        {/* User search */}
        {!hideUserFilter && (
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-user-filter" className="text-xs text-muted-foreground">User</label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="audit-user-filter"
                type="text"
                className="pl-7 w-44 h-8 text-xs"
                placeholder="email or user ID"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        )}

        {/* Operation select */}
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-operation-filter" className="text-xs text-muted-foreground">Operation</label>
          <Select value={operationFilter} onValueChange={(v) => { setOperationFilter(v); setPage(1); }}>
            <SelectTrigger id="audit-operation-filter" className="w-36 h-8 text-xs">
              <SelectValue placeholder="All operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All operations</SelectItem>
              {ALL_OPERATIONS.map((op) => (
                <SelectItem key={op} value={op}>{OPERATION_LABELS[op]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date from */}
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-date-from" className="text-xs text-muted-foreground">From</label>
          <Input
            id="audit-date-from"
            type="date"
            className="w-36 h-8 text-xs"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-date-to" className="text-xs text-muted-foreground">To</label>
          <Input
            id="audit-date-to"
            type="date"
            className="w-36 h-8 text-xs"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>

        {/* Document / record search */}
        {!recordId && (
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-document-filter" className="text-xs text-muted-foreground">Document ID</label>
            <div className="relative">
              <FileText className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                id="audit-document-filter"
                type="text"
                className="pl-7 w-44 h-8 text-xs"
                placeholder="record UUID"
                value={documentSearch}
                onChange={(e) => { setDocumentSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        )}

        {/* Spacer + right-side buttons */}
        <div className="ml-auto flex items-end gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            title="Refresh"
            aria-label="Refresh audit logs"
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={exporting === 'csv'}
            onClick={() => handleExport('csv')}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={exporting === 'pdf'}
            onClick={() => handleExport('pdf')}
          >
            <Printer className="h-3.5 w-3.5" />
            {exporting === 'pdf' ? 'Opening…' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* ── log entries ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">No audit entries found</p>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <AuditEntryRow
              key={entry.id}
              entry={entry}
              onNavigate={(id) => navigate(`/documents/${id}`)}
              onSelect={setSelectedEntry}
            />
          ))}
        </div>
      )}

      {/* ── pagination ──────────────────────────────────────────────────────── */}
      {numPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            {totalItems.toLocaleString()} total entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= numPages}
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── event detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Event Detail</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-5 mt-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Operation</p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', OPERATION_BADGE_VARIANTS[selectedEntry.operation])}>
                    {OPERATION_LABELS[selectedEntry.operation]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Table</p>
                  <p className="font-mono text-xs">{selectedEntry.tableName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">User</p>
                  <p>{selectedEntry.username ?? <span className="italic text-muted-foreground">system</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Timestamp</p>
                  <p className="text-xs">{format(parseISO(selectedEntry.timestamp), 'PPpp')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Record ID</p>
                  <p className="font-mono text-xs break-all">{selectedEntry.recordId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Event ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedEntry.id}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Full JSON Payload</p>
                <pre className="bg-slate-950 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto border border-border/40 max-h-64">
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── row sub-component ─────────────────────────────────────────────────────────

function AuditEntryRow({
  entry,
  onNavigate,
  onSelect,
}: {
  entry: AuditLogEntry;
  onNavigate: (recordId: string) => void;
  onSelect: (entry: AuditLogEntry) => void;
}) {
  const initials   = getInitials(entry.username);
  const avatarBg   = stringToColor(entry.username ?? entry.userId ?? entry.id);
  const opColor    = OPERATION_COLORS[entry.operation]  ?? 'text-muted-foreground';
  const opBadge    = OPERATION_BADGE_VARIANTS[entry.operation] ?? 'bg-slate-500/10 text-slate-400';
  const actionText = describeAction(entry.tableName, entry.operation);

  const ts = parseISO(entry.timestamp);
  const relativeTime = formatDistanceToNow(ts, { addSuffix: true });
  const fullTime     = format(ts, 'PPpp');               // e.g. Jun 17, 2026, 14:35:00 PM

  const isDocumentTable =
    entry.tableName === 'nodes' ||
    entry.tableName === 'documents' ||
    entry.tableName === 'document_versions' ||
    entry.tableName === 'pages';

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-accent/20 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
      onClick={() => onSelect(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(entry);
        }
      }}
    >
      {/* User initials avatar */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full w-8 h-8 shrink-0 text-xs font-semibold text-white',
          avatarBg,
        )}
        title={entry.username ?? entry.userId ?? 'Unknown user'}
      >
        {initials}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Username */}
          <span className="text-sm font-medium truncate max-w-[160px]" title={entry.username ?? undefined}>
            {entry.username ?? <span className="text-muted-foreground italic">system</span>}
          </span>

          {/* Action description */}
          <span className={cn('text-sm', opColor)}>{actionText}</span>

          {/* Operation badge */}
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', opBadge)}>
            {OPERATION_LABELS[entry.operation]}
          </span>

          {/* Document link — only show for document-related tables */}
          {isDocumentTable && entry.recordId && (
            <button
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline truncate max-w-[180px] font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded"
              onClick={(e) => { e.stopPropagation(); onNavigate(entry.recordId); }}
              title={`Open record ${entry.recordId}`}
            >
              {entry.recordId.slice(0, 8)}…
            </button>
          )}
        </div>

        {/* Meta row: timestamp + table */}
        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          {/* Relative time with full datetime tooltip */}
          <span
            title={fullTime}
            className="cursor-default hover:text-foreground transition-colors"
          >
            {relativeTime}
          </span>

          <span className="opacity-40">•</span>

          {/* Table name badge */}
          <span className="font-mono opacity-60">{entry.tableName}</span>
        </div>
      </div>
    </div>
  );
}

// ── util ──────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean { return UUID_RE.test(s.trim()); }
