// (c) Copyright Datacraft, 2026
import {
  useBundles,
  useCases,
  useCreateCase,
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
import { formatDate } from '@/lib/utils';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  FileText,
  Filter,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const STATUS_CONFIG: Record<
  CaseStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  open: { label: 'Open', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
  on_hold: { label: 'On Hold', variant: 'secondary' },
};

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
  const createCase = useCreateCase();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docIds, setDocIds] = useState('');

  const reset = () => {
    setTitle('');
    setDescription('');
    setDocIds('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createCase.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
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
            <Select>
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
            <Select>
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
              <p className="text-sm text-muted-foreground text-center py-4">No bundles yet</p>
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const {
    data: casesData,
    isLoading,
    isError,
    refetch,
  } = useCases(
    1,
    50,
    statusFilter !== 'all' ? (statusFilter as CaseStatus) : undefined,
    undefined,
    debouncedSearch || undefined,
  );

  const cases = casesData?.items || [];
  const hasFilters = statusFilter !== 'all' || !!debouncedSearch;

  const handleRowClick = (c: Case) => {
    setSelectedCase(c);
    setDetailOpen(true);
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
        <Select>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
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
                <TableCell colSpan={7} className="text-center py-16">
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CaseDetailSheet
        caseData={selectedCase}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
