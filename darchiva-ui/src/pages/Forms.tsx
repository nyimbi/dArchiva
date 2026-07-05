// (c) Copyright Datacraft, 2026
import {
  useConfirmExtraction,
  useExtraction,
  useExtractionQueue,
  useFormTemplates,
  useReExtract,
  useToggleTemplate,
  useUpdateTemplate,
  useUpdateFieldValue,
  formKeys,
  type Extraction,
  type ExtractionQueueItem,
  type ExtractionStatus,
  type FieldValue,
  type FormTemplate,
  type Signature as SignatureType,
} from '@/features/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { apiClient } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  Signature,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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

type FieldExtractionMode = 'auto' | 'manual';

interface TemplateFieldDefinition {
  name: string;
  type: string;
  label: string;
}

interface TemplateCreatePayload {
  name: string;
  category: string;
  description?: string;
  fields: TemplateFieldDefinition[];
  sampleDocument?: {
    fileName: string;
    contentType: string;
    data: string;
  };
}

interface RecognitionConfigPayload {
  confidenceThreshold: number;
  fieldExtractionMode: FieldExtractionMode;
  pageRange?: string;
}

const FIELD_TYPES = new Set(['text', 'date', 'number', 'currency', 'checkbox']);

function parseFieldDefinitions(value: string): TemplateFieldDefinition[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawType] = line.split(':');
      const name = rawName.trim();
      const type = rawType?.trim().toLowerCase() || 'text';

      return {
        name,
        type: FIELD_TYPES.has(type) ? type : 'text',
        label: name
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      };
    })
    .filter((field) => field.name.length > 0);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unable to read sample document'));
        return;
      }
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read sample document'));
    reader.readAsDataURL(file);
  });
}

function downloadJsonFile(fileName: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function QueryErrorBanner({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span>{message}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRetry} disabled={isRetrying}>
        <RefreshCw className={cn('w-4 h-4 mr-2', isRetrying && 'animate-spin')} />
        Retry
      </Button>
    </div>
  );
}

// ─── Add Form Template Dialog ─────────────────────────────────────────────────

function AddTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const createTemplate = useMutation({
    mutationFn: async (payload: TemplateCreatePayload) => {
      const { data } = await apiClient.post<FormTemplate>('/forms/templates', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.templates() });
    },
  });
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState('');
  const [sampleFile, setSampleFile] = useState<File | null>(null);

  const reset = () => {
    setName('');
    setCategory('');
    setDescription('');
    setFields('');
    setSampleFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;
    const payload: TemplateCreatePayload = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      fields: parseFieldDefinitions(fields),
    };

    if (sampleFile) {
      payload.sampleDocument = {
        fileName: sampleFile.name,
        contentType: sampleFile.type || 'application/octet-stream',
        data: await fileToBase64(sampleFile),
      };
    }

    try {
      await createTemplate.mutateAsync(payload);
      toast.success('Form template created');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create form template');
    }
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
            <Input
              id="tpl-sample"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
            />
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

function EditTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: FormTemplate | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateTemplate = useUpdateTemplate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!template) return;
    setName(template.name);
    setCategory(template.category);
    setDescription(template.description ?? '');
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template || !name.trim() || !category) return;

    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        data: {
          name: name.trim(),
          category,
          description: description.trim() || undefined,
        },
      });
      toast.success('Template updated');
      onOpenChange(false);
    } catch {
      toast.error('Failed to update template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Form Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-tpl-name">Template Name</Label>
            <Input
              id="edit-tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tpl-category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="edit-tpl-category">
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
            <Label htmlFor="edit-tpl-desc">Description</Label>
            <Textarea
              id="edit-tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTemplate.isPending || !name.trim() || !category}>
              {updateTemplate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecognitionConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [fieldExtractionMode, setFieldExtractionMode] = useState<FieldExtractionMode>('auto');
  const [pageRange, setPageRange] = useState('');
  const saveConfig = useMutation({
    mutationFn: async (payload: RecognitionConfigPayload) => {
      // TODO: Align with backend once the form-recognition config route is finalized.
      const { data } = await apiClient.patch('/forms/config', payload);
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveConfig.mutateAsync({
        confidenceThreshold,
        fieldExtractionMode,
        pageRange: pageRange.trim() || undefined,
      });
      toast.success('Recognition configuration saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save recognition configuration');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Recognition Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-3">
            <Label>Confidence threshold: {confidenceThreshold}%</Label>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[confidenceThreshold]}
              onValueChange={([value]) => setConfidenceThreshold(value ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-extraction-mode">Field extraction mode</Label>
            <Select
              value={fieldExtractionMode}
              onValueChange={(value) => setFieldExtractionMode(value as FieldExtractionMode)}
            >
              <SelectTrigger id="field-extraction-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-range">Page range</Label>
            <Input
              id="page-range"
              placeholder="e.g. 1-3,5 or all"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveConfig.isPending}>
              {saveConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
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
  const {
    data: extraction,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useExtraction(extractionId ?? '');
  const confirmExtraction = useConfirmExtraction();
  const reExtract = useReExtract();
  const updateFieldValue = useUpdateFieldValue();
  const [editField, setEditField] = useState<FieldValue | null>(null);
  const [editValue, setEditValue] = useState('');

  const lowConfidenceCount = extraction?.fieldValues.filter((f) => f.confidence < 0.75).length ?? 0;

  const openEditField = (field: FieldValue) => {
    setEditField(field);
    setEditValue(field.value);
  };

  const closeEditField = () => {
    setEditField(null);
    setEditValue('');
  };

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

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractionId || !editField) return;

    await updateFieldValue.mutateAsync({
      extractionId,
      fieldName: editField.fieldName,
      value: editValue,
    });
    closeEditField();
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
        ) : isError ? (
          <div className="mt-6">
            <QueryErrorBanner
              message="Failed to load extraction details."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
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
                  <FieldRow key={field.fieldName} field={field} onEdit={() => openEditField(field)} />
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
      <Dialog open={!!editField} onOpenChange={(isOpen) => {
        if (!isOpen) closeEditField();
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateField} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="field-label">Field</Label>
              <Input id="field-label" value={editField?.label ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-value">Value</Label>
              <Input
                id="field-value"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              />
            </div>
            {updateFieldValue.isError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                Failed to update field. Please try again.
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditField}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFieldValue.isPending || !editField}>
                {updateFieldValue.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Field
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

// ─── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab({ onAddTemplate }: { onAddTemplate: () => void }) {
  const queryClient = useQueryClient();
  const updateTemplate = useToggleTemplate();
  const [editTemplate, setEditTemplate] = useState<FormTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<FormTemplate | null>(null);
  const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);
  const {
    data: templatesData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useFormTemplates();
  const templates = templatesData?.items || [];
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/forms/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.templates() });
    },
  });

  const handleToggleTemplate = async (template: FormTemplate) => {
    setActionTemplateId(template.id);
    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        isActive: !template.isActive,
      });
      toast.success(`Template ${template.isActive ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update template status');
    } finally {
      setActionTemplateId(null);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    setActionTemplateId(deleteTemplate.id);
    try {
      await deleteTemplateMutation.mutateAsync(deleteTemplate.id);
      toast.success('Template deleted');
      setDeleteTemplate(null);
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setActionTemplateId(null);
    }
  };

  return (
    <>
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
        ) : isError ? (
          <div className="col-span-full">
            <QueryErrorBanner
              message="Failed to load form templates."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </div>
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
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={template.isActive ? 'default' : 'outline'}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Template actions">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setEditTemplate(template)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void handleToggleTemplate(template)}
                        disabled={actionTemplateId === template.id && updateTemplate.isPending}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {template.isActive ? 'Set Inactive' : 'Set Active'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTemplate(template)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
      <EditTemplateDialog
        template={editTemplate}
        open={!!editTemplate}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTemplate(null);
        }}
      />
      <AlertDialog
        open={!!deleteTemplate}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleteTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {deleteTemplate?.name ?? 'this template'} and its field definitions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTemplateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteTemplate()}
              disabled={deleteTemplateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (item: ExtractionQueueItem) => {
    setDownloadingId(item.id);
    try {
      const { data } = await apiClient.get<Extraction>(`/forms/extractions/${item.id}/result`);
      downloadJsonFile(`extraction-${item.id}.json`, data);
      toast.success('Extraction JSON downloaded');
    } catch {
      toast.error('Failed to download extraction JSON');
    } finally {
      setDownloadingId(null);
    }
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
            items.map((item: ExtractionQueueItem) => {
              const isDownloading = downloadingId === item.id;

              return (
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
                        onClick={() => void handleDownload(item)}
                        disabled={isDownloading}
                        aria-label="Download JSON"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
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
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Forms() {
  const queryClient = useQueryClient();
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const extractInputRef = useRef<HTMLInputElement>(null);
  const startExtraction = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      // TODO: Backend currently documents documentId-based extraction; keep this upload endpoint aligned with API support.
      const { data } = await apiClient.post('/forms/extract', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms', 'queue'] });
      toast.success('Extraction queued');
    },
    onError: () => {
      toast.error('Failed to start extraction');
    },
  });

  const {
    data: queueData,
    isLoading: queueLoading,
    isError: queueError,
    isFetching: queueFetching,
    refetch: refetchQueue,
  } = useExtractionQueue();
  const allItems = queueData?.items ?? [];

  const queueItems = allItems.filter(
    (item) => item.status !== 'completed',
  );
  const resultItems = allItems.filter((item) => item.status === 'completed');

  const openReview = (id: string) => {
    setReviewId(id);
    setReviewOpen(true);
  };

  const handleExtractNew = () => {
    extractInputRef.current?.click();
  };

  const handleExtractFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) startExtraction.mutate(file);
    event.target.value = '';
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
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          <Button size="sm" onClick={handleExtractNew} disabled={startExtraction.isPending}>
            {startExtraction.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSearch className="w-4 h-4 mr-2" />
            )}
            Extract New
          </Button>
          <input
            ref={extractInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleExtractFileChange}
          />
        </div>
      </div>

      {queueError && (
        <QueryErrorBanner
          message="Failed to load extraction queue."
          onRetry={() => void refetchQueue()}
          isRetrying={queueFetching}
        />
      )}

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

      {/* Recognition Configuration Dialog */}
      <RecognitionConfigDialog open={configOpen} onOpenChange={setConfigOpen} />

      {/* Review Sheet */}
      <ReviewSheet
        extractionId={reviewId}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </div>
  );
}
