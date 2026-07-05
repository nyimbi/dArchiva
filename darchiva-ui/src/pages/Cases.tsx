// (c) Copyright Datacraft, 2026
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api-client';
import {
  useBundles,
  useCases,
  type Bundle,
  type Case,
  type CaseStatus,
} from '@/features/cases';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useStore } from '@/hooks/useStore';
import { formatDate } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Pencil,
  FileText,
  Filter,
  FolderOpen,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CaseFiltersAppliedDetail } from '@/features/cases/components/modals/CaseFiltersModal';

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  open: { label: 'Open', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
  on_hold: { label: 'On Hold', variant: 'secondary' },
};

const CASE_STATUSES: CaseStatus[] = ['open', 'pending', 'closed', 'on_hold'];

type CreateCasePayload = {
  title: string;
  description?: string;
  type: string;
  priority: string;
  assignee?: string | null;
  dueDate?: string | null;
};

type UpdateCasePayload = {
  title: string;
  status: CaseStatus;
  assignee?: string | null;
  dueDate?: string | null;
};

function useCreateCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCasePayload) => {
      const { data: createdCase } = await apiClient.post<Case>('/cases', data);
      return createdCase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

function useUpdateCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCasePayload }) => {
      const { data: updatedCase } = await apiClient.patch<Case>(`/cases/${id}`, data);
      return updatedCase;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases', 'detail', id] });
    },
  });
}

function useDeleteCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/cases/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

function BundleRow({ bundle }: { bundle: Bundle }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{bundle.name}</p>
        {bundle.description && (
          <p className="text-xs text-muted-foreground truncate">{bundle.description}</p>
        )}
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        {bundle.documentCount} docs
      </Badge>
    </div>
  );
}

function CreateCaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createCase = useCreateCaseMutation();
  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState('legal');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [docIds, setDocIds] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  const reset = () => {
    setTitle('');
    setCaseType('legal');
    setPriority('medium');
    setDescription('');
    setDocIds('');
    setAssignee('');
    setDueDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createCase.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      type: caseType,
      priority,
      assignee: assignee.trim() || null,
      dueDate: dueDate || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="case-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="case-title"
              placeholder="e.g. Q4 Compliance Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-type">Type</Label>
            <Select value={caseType} onValueChange={setCaseType}>
              <SelectTrigger id="case-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="case-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-desc">Description</Label>
            <Textarea
              id="case-desc"
              placeholder="Brief description of the case…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-assignee">Assignee</Label>
            <Input
              id="case-assignee"
              placeholder="Name or email"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-due-date">Due Date</Label>
            <Input
              id="case-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="case-docs">Document IDs</Label>
            <Input
              id="case-docs"
              placeholder="doc-abc123, doc-def456 (comma separated)"
              value={docIds}
              onChange={(e) => setDocIds(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optionally link existing document IDs to this case
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCase.isPending || !title.trim()}>
              {createCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCaseDialog({
  caseData,
  open,
  onOpenChange,
  onUpdated,
}: {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: (caseData: Case) => void;
}) {
  const updateCase = useUpdateCaseMutation();
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<CaseStatus>('open');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (!caseData) return;
    setTitle(caseData.title);
    setStatus(caseData.status);
    setAssignee(caseData.assignee ?? '');
    setDueDate(caseData.dueDate ?? '');
  }, [caseData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !title.trim()) return;

    const updatedCase = await updateCase.mutateAsync({
      id: caseData.id,
      data: {
        title: title.trim(),
        status,
        assignee: assignee.trim() || null,
        dueDate: dueDate || null,
      },
    });
    onUpdated(updatedCase);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Edit Case</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-case-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-case-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-case-status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CaseStatus)}>
              <SelectTrigger id="edit-case-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CASE_STATUSES.map((caseStatus) => (
                  <SelectItem key={caseStatus} value={caseStatus}>
                    {STATUS_CONFIG[caseStatus].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-case-assignee">Assignee</Label>
            <Input
              id="edit-case-assignee"
              placeholder="Name or email"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-case-due-date">Due Date</Label>
            <Input
              id="edit-case-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCase.isPending || !title.trim()}>
              {updateCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CaseActions({
  caseData,
  onEdit,
  onDeleted,
}: {
  caseData: Case;
  onEdit: (caseData: Case) => void;
  onDeleted: (caseId: string) => void;
}) {
  const deleteCase = useDeleteCaseMutation();

  const handleDelete = async () => {
    await deleteCase.mutateAsync(caseData.id);
    onDeleted(caseData.id);
  };

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" onClick={() => onEdit(caseData)} aria-label="Edit case">
        <Pencil className="w-4 h-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Delete case">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete case?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{caseData.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCase.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteCase.isPending}>
              {deleteCase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CaseDetailSheet({
  caseData,
  open,
  onOpenChange,
}: {
  caseData: Case | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: bundlesData, isLoading: bundlesLoading, isError: bundlesError, refetch: refetchBundles } =
    useBundles(caseData?.id);
  const bundles = bundlesData?.items || [];

  if (!caseData) return null;

  const status = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.open;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start gap-3">
            <Briefcase className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-left leading-snug">{caseData.title}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Case Number</span>
              <span className="font-mono text-xs">{caseData.caseNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Documents</span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                {caseData.documentCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Bundles</span>
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
                {caseData.bundleCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created By</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {caseData.createdBy}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {formatDate(caseData.createdAt)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{formatDate(caseData.updatedAt)}</span>
            </div>
          </div>

          {caseData.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {caseData.description}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Document Bundles */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Document Bundles
            </h4>
            {bundlesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : bundlesError ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">Could not load bundles</p>
                <Button variant="outline" size="sm" onClick={() => refetchBundles()}>
                  Retry
                </Button>
              </div>
            ) : bundles.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No bundles yet"
                description="Add documents to create a bundle."
              />
            ) : (
              <div className="divide-y">
                {bundles.map((b: Bundle) => (
                  <BundleRow key={b.id} bundle={b} />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Activity Timeline */}
          <div>
            <h4 className="text-sm font-medium mb-4">Activity Timeline</h4>
            <ol className="relative border-l border-border ml-3 space-y-4">
              <li className="ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
                <p className="text-sm font-medium">Case created</p>
                <p className="text-xs text-muted-foreground">{formatDate(caseData.createdAt)}</p>
              </li>
              {caseData.updatedAt !== caseData.createdAt && (
                <li className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground" />
                  <p className="text-sm font-medium">Last updated</p>
                  <p className="text-xs text-muted-foreground">{formatDate(caseData.updatedAt)}</p>
                </li>
              )}
              {caseData.status === 'closed' && (
                <li className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-muted" />
                  <p className="text-sm font-medium">Case closed</p>
                </li>
              )}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Cases() {
  const { openModal } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [portfolioFilter, setPortfolioFilter] = useState('');
  const [createdAfterFilter, setCreatedAfterFilter] = useState('');
  const [createdBeforeFilter, setCreatedBeforeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editCase, setEditCase] = useState<Case | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handleCaseFiltersApplied = (event: Event) => {
      const detail = (event as CustomEvent<Partial<CaseFiltersAppliedDetail>>).detail ?? {};
      const nextStatus = detail.status && CASE_STATUSES.includes(detail.status as CaseStatus)
        ? detail.status
        : 'all';

      setStatusFilter(nextStatus);
      setPortfolioFilter(detail.portfolioId || detail.portfolio || '');
      setCreatedAfterFilter(detail.createdAfter || detail.dateFrom || '');
      setCreatedBeforeFilter(detail.createdBefore || detail.dateTo || '');
    };

    window.addEventListener('case-filters-applied', handleCaseFiltersApplied);
    return () => window.removeEventListener('case-filters-applied', handleCaseFiltersApplied);
  }, []);

  const {
    data: casesData,
    isLoading,
    isError,
    refetch,
  } = useCases(
    1,
    50,
    statusFilter !== 'all' ? (statusFilter as CaseStatus) : undefined,
    portfolioFilter || undefined,
    debouncedSearch || undefined,
    typeFilter !== 'all' ? typeFilter : undefined,
    createdAfterFilter || undefined,
    createdBeforeFilter || undefined,
  );

  const cases = casesData?.items || [];
  const activeFilterCount = [
    statusFilter !== 'all',
    typeFilter !== 'all',
    !!portfolioFilter,
    !!createdAfterFilter,
    !!createdBeforeFilter,
    !!debouncedSearch,
  ].filter(Boolean).length;
  const hasFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPortfolioFilter('');
    setCreatedAfterFilter('');
    setCreatedBeforeFilter('');
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const handleRowClick = (c: Case) => {
    setSelectedCase(c);
    setDetailOpen(true);
  };

  const handleEdit = (c: Case) => {
    setEditCase(c);
    setEditOpen(true);
  };

  const handleUpdated = (updatedCase: Case) => {
    setSelectedCase((current) => (current?.id === updatedCase.id ? updatedCase : current));
  };

  const handleDeleted = (caseId: string) => {
    if (selectedCase?.id === caseId) {
      setSelectedCase(null);
      setDetailOpen(false);
    }
    if (editCase?.id === caseId) {
      setEditCase(null);
      setEditOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Cases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage legal cases and document bundles
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cases…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="hr">HR</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="compliance">Compliance</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => openModal('case-filters')} className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 justify-center px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Cases table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Case #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-24 text-right">Documents</TableHead>
              <TableHead className="w-24 text-right">Bundles</TableHead>
              <TableHead className="w-36">Created By</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                    <p className="text-sm text-muted-foreground">Could not load cases</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <EmptyState
                    icon={Briefcase}
                    title={hasFilters ? 'No cases match your filters' : 'No cases yet'}
                    description={
                      hasFilters
                        ? 'Try changing the search or status filters.'
                        : 'Create a case to organize documents, bundles, and review activity.'
                    }
                    action={!hasFilters ? { label: 'New Case', onClick: () => setCreateOpen(true) } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c: Case) => {
                const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(c)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {c.caseNumber}
                    </TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        {c.documentCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <FolderOpen className="w-3.5 h-3.5" />
                        {c.bundleCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[120px]">{c.createdBy}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <CaseActions caseData={c} onEdit={handleEdit} onDeleted={handleDeleted} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCaseDialog
        caseData={editCase}
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditCase(null);
          setEditOpen(open);
        }}
        onUpdated={handleUpdated}
      />
      <CaseDetailSheet
        caseData={selectedCase}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
