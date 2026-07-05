// (c) Copyright Datacraft, 2026
import {
  useConfirmExtraction,
  useCreateTemplate,
  useExtraction,
  useExtractionQueue,
  useFormTemplates,
  useReExtract,
  type ExtractionQueueItem,
  type ExtractionStatus,
  type FieldValue,
  type FormTemplate,
  type Signature as SignatureType,
} from '@/features/forms';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Signature,
} from 'lucide-react';
import { useState } from 'react';

// ─── Status badge mapping ────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  ExtractionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  needs_review: 'secondary',
  failed: 'destructive',
};

const STATUS_LABEL: Record<ExtractionStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  needs_review: 'Needs Review',
  failed: 'Failed',
};

// ─── Add Form Template Dialog ─────────────────────────────────────────────────

function AddTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createTemplate = useCreateTemplate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState('');

  const reset = () => {
    setName('');
    setCategory('');
    setDescription('');
    setFields('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;
    await createTemplate.mutateAsync({
      name: name.trim(),
      category,
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Form Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              placeholder="e.g. Tax Form 1040, Standard Invoice"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="tpl-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tax Form">Tax Form</SelectItem>
                <SelectItem value="Invoice">Invoice</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="HR Form">HR Form</SelectItem>
                <SelectItem value="Financial">Financial</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Description</Label>
            <Textarea
              id="tpl-desc"
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-fields">Field Definitions</Label>
            <Textarea
              id="tpl-fields"
              placeholder={'One field per line, e.g.\ntaxpayer_name: text\nfiling_date: date\ntotal_income: currency'}
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Format: <code className="bg-muted px-1 rounded">field_name: type</code> — supported
              types: text, date, number, currency, checkbox
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tpl-sample">Sample Document</Label>
            <Input id="tpl-sample" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" />
            <p className="text-xs text-muted-foreground">
              Upload a sample to help train the extractor (PDF or image)
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
            <Button type="submit" disabled={createTemplate.isPending || !name.trim() || !category}>
              {createTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field Row (for review sheet) ────────────────────────────────────────────

function FieldRow({ field, onEdit }: { field: FieldValue; onEdit: () => void }) {
  const confidenceColor =
    field.confidence >= 0.9
      ? 'text-emerald-400'
      : field.confidence >= 0.75
        ? 'text-amber-400'
        : 'text-destructive';

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-colors',
        field.confidence < 0.75 && 'bg-destructive/5 border border-destructive/20',
        field.wasCorrected && 'bg-emerald-500/5 border border-emerald-500/20',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{field.label}</p>
        <p className="mt-0.5 text-sm font-medium truncate">{field.value}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className={cn('text-sm font-mono', confidenceColor)}>
            {(field.confidence * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground">confidence</p>
        </div>
        {field.wasCorrected ? (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/40 text-xs gap-1">
            <Check className="w-3 h-3" /> Corrected
          </Badge>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label="Edit field"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Review Sheet ─────────────────────────────────────────────────────────────

function ReviewSheet({
  extractionId,
  open,
  onOpenChange,
}: {
  extractionId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: extraction, isLoading } = useExtraction(extractionId ?? '');
  const confirmExtraction = useConfirmExtraction();
  const reExtract = useReExtract();

  const lowConfidenceCount = extraction?.fieldValues.filter((f) => f.confidence < 0.75).length ?? 0;

  const handleConfirm = async () => {
    if (extractionId) {
      await confirmExtraction.mutateAsync(extractionId);
      onOpenChange(false);
    }
  };

  const handleReExtract = async () => {
    if (extractionId) {
      await reExtract.mutateAsync(extractionId);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 shrink-0" />
            {isLoading ? 'Loading extraction…' : (extraction?.documentTitle ?? 'Extraction Review')}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : extraction ? (
          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{extraction.templateName}</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    'text-2xl font-bold',
                    extraction.confidence >= 0.85
                      ? 'text-emerald-400'
                      : extraction.confidence >= 0.7
                        ? 'text-amber-400'
                        : 'text-destructive',
                  )}
                >
                  {(extraction.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">overall confidence</p>
              </div>
            </div>

            {lowConfidenceCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {lowConfidenceCount} field{lowConfidenceCount > 1 ? 's' : ''} need review
              </div>
            )}

            <Separator />

            {/* Fields */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Extracted Fields
                </h4>
                <span className="text-xs text-muted-foreground">
                  {extraction.fieldValues.length - lowConfidenceCount} / {extraction.fieldValues.length} verified
                </span>
              </div>
              <div className="space-y-2">
                {extraction.fieldValues.map((field: FieldValue) => (
                  <FieldRow key={field.fieldName} field={field} onEdit={() => {}} />
                ))}
              </div>
            </div>

            {/* Signatures */}
            {extraction.signatures.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Signature className="w-4 h-4" />
                    Signatures Detected
                  </h4>
                  <div className="space-y-2">
                    {extraction.signatures.map((sig: SignatureType) => (
                      <div
                        key={sig.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded flex items-center justify-center',
                            sig.verified
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Signature className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{sig.signerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Page {sig.pageNumber} · {sig.signatureType}
                          </p>
                        </div>
                        {sig.verified && (
                          <Badge
                            variant="outline"
                            className="text-emerald-500 border-emerald-500/40 text-xs"
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReExtract}
                disabled={reExtract.isPending}
              >
                {reExtract.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                Re-extract
              </Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={confirmExtraction.isPending}>
                {confirmExtraction.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Confirm &amp; Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Extraction not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab({ onAddTemplate }: { onAddTemplate: () => void }) {
  const { data: templatesData, isLoading } = useFormTemplates();
  const templates = templatesData?.items || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Add card */}
      <button
        onClick={onAddTemplate}
        className="flex flex-col items-center justify-center gap-3 min-h-[160px] rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/20 transition-colors"
      >
        <div className="p-3 rounded-full bg-muted">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">Add Form Template</span>
      </button>

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))
      ) : templates.length === 0 ? (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No templates configured yet</p>
        </div>
      ) : (
        templates.map((template: FormTemplate) => (
          <div key={template.id} className="rounded-lg border p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'p-2 rounded-lg shrink-0',
                    template.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium truncate">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.category}</p>
                </div>
              </div>
              <Badge variant={template.isActive ? 'default' : 'outline'} className="shrink-0">
                {template.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
            )}
            <div className="mt-auto flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
              <span>{template.fieldCount} fields</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Queue Table (shared by both Queue + Results tabs) ───────────────────────

function QueueTable({
  items,
  isLoading,
  emptyMessage,
  onReview,
  showDownload = false,
}: {
  items: ExtractionQueueItem[];
  isLoading: boolean;
  emptyMessage: string;
  onReview: (id: string) => void;
  showDownload?: boolean;
}) {
  const handleDownload = (item: ExtractionQueueItem) => {
    const json = JSON.stringify(item, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-${item.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-24">Confidence</TableHead>
            <TableHead className="w-32">Submitted</TableHead>
            <TableHead className="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{emptyMessage}</p>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item: ExtractionQueueItem) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate max-w-[200px]">{item.documentTitle}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.templateName}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[item.status]}>
                    {item.status === 'processing' && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : item.confidence > 0 ? (
                    <span
                      className={cn(
                        'font-mono text-sm',
                        item.confidence >= 0.85
                          ? 'text-emerald-400'
                          : item.confidence >= 0.7
                            ? 'text-amber-400'
                            : 'text-destructive',
                      )}
                    >
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {showDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(item)}
                        aria-label="Download JSON"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onReview(item.id)}
                    >
                      Review
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Forms() {
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: queueData, isLoading: queueLoading } = useExtractionQueue();
  const allItems = queueData?.items ?? [];

  const queueItems = allItems.filter(
    (item) => item.status !== 'completed',
  );
  const resultItems = allItems.filter((item) => item.status === 'completed');

  const openReview = (id: string) => {
    setReviewId(id);
    setReviewOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">
            Form Recognition
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered form data extraction and verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          <Button size="sm">
            <FileSearch className="w-4 h-4 mr-2" />
            Extract New
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="queue">
            Recognition Queue
            {queueItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                {queueItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab onAddTemplate={() => setAddTemplateOpen(true)} />
        </TabsContent>

        {/* Recognition Queue Tab */}
        <TabsContent value="queue" className="mt-6">
          <QueueTable
            items={queueItems}
            isLoading={queueLoading}
            emptyMessage="No items in the recognition queue"
            onReview={openReview}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="mt-6">
          <QueueTable
            items={resultItems}
            isLoading={queueLoading}
            emptyMessage="No completed extractions yet"
            onReview={openReview}
            showDownload
          />
        </TabsContent>
      </Tabs>

      {/* Add Template Dialog */}
      <AddTemplateDialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen} />

      {/* Review Sheet */}
      <ReviewSheet
        extractionId={reviewId}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </div>
  );
}
