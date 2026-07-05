// (c) Copyright Datacraft, 2026
import {
  useCreatePortfolio,
  useDeletePortfolio,
  usePortfolios,
  usePortfolioStats,
  useUpdatePortfolio,
  type Portfolio,
  type PortfolioStatus,
} from '@/features/portfolios';
import { useCases, type Case, type CaseStatus } from '@/features/cases';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useSearchDocuments } from '@/features/search/api';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const STATUS_LABELS: Record<PortfolioStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  on_hold: 'On Hold',
};

const STATUS_VARIANTS: Record<
  PortfolioStatus,
  'default' | 'secondary' | 'outline'
> = {
  active: 'default',
  archived: 'outline',
  on_hold: 'secondary',
};

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

interface PortfolioFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Portfolio;
}

function PortfolioFormDialog({ open, onOpenChange, initial }: PortfolioFormDialogProps) {
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [tags, setTags] = useState('');

  const isEdit = !!initial;
  const isPending = createPortfolio.isPending || updatePortfolio.isPending;

  const reset = () => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setTags('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEdit && initial) {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        tags: parseTags(tags),
      };
      await updatePortfolio.mutateAsync({
        id: initial.id,
        data: payload,
      });
    } else {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        tags: parseTags(tags),
      };
      await createPortfolio.mutateAsync(payload);
    }
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Portfolio' : 'Create Portfolio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pf-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pf-name"
              placeholder="e.g. Corporate Legal 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-desc">Description</Label>
            <Textarea
              id="pf-desc"
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-tags">Tags</Label>
            <Input
              id="pf-tags"
              placeholder="legal, compliance, 2026 (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated tags for quick filtering
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
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Portfolio Document Picker ────────────────────────────────────────────────

interface PortfolioDocumentPickerDialogProps {
  portfolio: Portfolio;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function PortfolioDocumentPickerDialog({
  portfolio,
  open,
  onOpenChange,
}: PortfolioDocumentPickerDialogProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useSearchDocuments(
    debouncedQuery,
    {},
    1,
    15,
    'date_desc',
  );
  const items = data?.items ?? [];

  const addDocuments = useMutation({
    mutationFn: async (documentIds: string[]) => {
      await apiClient.post(`/portfolios/${portfolio.id}/documents`, {
        document_ids: documentIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      onOpenChange(false);
    },
  });

  const reset = () => {
    setQuery('');
    setSelectedIds([]);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const toggleDocument = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    await addDocuments.mutateAsync(selectedIds);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Documents
          </DialogTitle>
          <DialogDescription>
            Search for documents to add to {portfolio.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            className="pl-9"
          />
        </div>

        <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 -mx-1 px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedQuery ? 'No documents found' : 'Start typing to search'}
            </p>
          ) : (
            items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDocument(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent text-left transition-colors"
                >
                  <span
                    className={`h-4 w-4 rounded border shrink-0 ${
                      selected ? 'bg-primary border-primary' : 'border-muted-foreground/50'
                    }`}
                  />
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{item.title}</span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={addDocuments.isPending || selectedIds.length === 0}
            onClick={handleConfirm}
          >
            {addDocuments.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeletePortfolioDialog({
  portfolio,
  open,
  onOpenChange,
}: {
  portfolio: Portfolio | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const deletePortfolio = useDeletePortfolio();

  const handleConfirm = async () => {
    if (!portfolio) return;
    await deletePortfolio.mutateAsync(portfolio.id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold">{portfolio?.name}</span>? This action cannot be
            undone. All cases and documents within this portfolio will be unlinked.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            {deletePortfolio.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Portfolio Folder Sheet ───────────────────────────────────────────────────

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  closed: 'Closed',
  on_hold: 'On Hold',
};

const CASE_STATUS_VARIANTS: Record<
  CaseStatus,
  'default' | 'secondary' | 'outline'
> = {
  open: 'default',
  pending: 'secondary',
  closed: 'outline',
  on_hold: 'secondary',
};

function PortfolioFolderSheet({
  portfolio,
  open,
  onOpenChange,
}: {
  portfolio: Portfolio | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: casesData, isLoading } = useCases(1, 50, undefined, portfolio?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cases = casesData?.items || [];

  if (!portfolio) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <FolderKanban className="w-5 h-5 shrink-0" />
            {portfolio.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Portfolio meta */}
          <div className="space-y-2">
            {portfolio.description && (
              <p className="text-sm text-muted-foreground">{portfolio.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {portfolio.caseCount} cases
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {portfolio.documentCount} documents
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(portfolio.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_VARIANTS[portfolio.status]}>
                {STATUS_LABELS[portfolio.status]}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Cases in this portfolio */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Cases
              </h4>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Documents
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No cases in this portfolio yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-20 text-right">Docs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((c: Case) => {
                      const sv = CASE_STATUS_VARIANTS[c.status] ?? 'outline';
                      const sl = CASE_STATUS_LABELS[c.status] ?? c.status;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{c.title}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {c.caseNumber}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sv}>{sl}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {c.documentCount}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
      <PortfolioDocumentPickerDialog
        portfolio={portfolio}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </Sheet>
  );
}

// ─── Portfolio Card ───────────────────────────────────────────────────────────

function PortfolioCard({
  portfolio,
  onOpen,
  onEdit,
  onDelete,
}: {
  portfolio: Portfolio;
  onOpen: (p: Portfolio) => void;
  onEdit: (p: Portfolio) => void;
  onDelete: (p: Portfolio) => void;
}) {
  return (
    <Card className="flex flex-col group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                className="font-semibold text-base leading-snug truncate cursor-pointer hover:underline"
                onClick={() => onOpen(portfolio)}
              >
                {portfolio.name}
              </h3>
              <Badge
                variant={STATUS_VARIANTS[portfolio.status]}
                className="mt-1 text-xs"
              >
                {STATUS_LABELS[portfolio.status]}
              </Badge>
            </div>
          </div>
          {/* Edit / Delete icon buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(portfolio);
              }}
              aria-label="Edit portfolio"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(portfolio);
              }}
              aria-label="Delete portfolio"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        {portfolio.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {portfolio.description}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/40 rounded-lg">
            <p className="text-2xl font-bold">{portfolio.caseCount}</p>
            <p className="text-xs text-muted-foreground">Cases</p>
          </div>
          <div className="text-center p-3 bg-muted/40 rounded-lg">
            <p className="text-2xl font-bold">{portfolio.documentCount}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(portfolio.createdAt)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => onOpen(portfolio)}
        >
          Open
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Portfolios() {
  const { data: portfoliosData, isLoading: portfoliosLoading, isError: portfoliosError } = usePortfolios();
  const { data: stats, isLoading: statsLoading } = usePortfolioStats();

  const [searchQuery, setSearchQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Portfolio | null>(null);
  const [folderTarget, setFolderTarget] = useState<Portfolio | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  const portfolios = (portfoliosData?.items || []).filter((p: Portfolio) =>
    searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true,
  );

  const handleOpen = (p: Portfolio) => {
    setFolderTarget(p);
    setFolderOpen(true);
  };

  const handleEdit = (p: Portfolio) => {
    setEditTarget(p);
  };

  const handleDelete = (p: Portfolio) => {
    setDeleteTarget(p);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Portfolios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize cases and manage access control
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Portfolio
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search portfolios…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: FolderKanban,
            label: 'Total Portfolios',
            value: statsLoading ? null : (stats?.total ?? portfolios.length),
          },
          {
            icon: Briefcase,
            label: 'Total Cases',
            value: statsLoading
              ? null
              : (stats?.totalCases ??
                portfolios.reduce((acc: number, p: Portfolio) => acc + p.caseCount, 0)),
          },
          {
            icon: Users,
            label: 'Total Documents',
            value: statsLoading
              ? null
              : (stats?.totalDocuments ??
                portfolios.reduce((acc: number, p: Portfolio) => acc + p.documentCount, 0)),
          },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  {value === null ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-2xl font-bold">{value}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Portfolio grid */}
      {portfoliosError && !portfoliosLoading && (
        <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load portfolios. Check your connection and try refreshing.
        </div>
      )}
      {portfoliosLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No portfolios match your search' : 'No portfolios yet'}
          </p>
          {!searchQuery && (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Portfolio
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p: Portfolio) => (
            <PortfolioCard
              key={p.id}
              portfolio={p}
              onOpen={handleOpen}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {/* Add new card */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex flex-col items-center justify-center gap-3 min-h-[200px] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors"
          >
            <div className="p-3 rounded-full bg-muted">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Create New Portfolio</span>
          </button>
        </div>
      )}

      {/* Dialogs */}
      <PortfolioFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <PortfolioFormDialog
        open={!!editTarget}
        onOpenChange={(v) => { if (!v) setEditTarget(null); }}
        initial={editTarget ?? undefined}
      />
      <DeletePortfolioDialog
        portfolio={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      />
      <PortfolioFolderSheet
        portfolio={folderTarget}
        open={folderOpen}
        onOpenChange={setFolderOpen}
      />
    </div>
  );
}
