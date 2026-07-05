// (c) Copyright Datacraft, 2026
// Document segmentation review UI — jobs, segment verification, document creation.

import { useState } from 'react';
import {
  Check,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Scissors,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

import {
  useCreateDocumentFromSegment,
  useJobSegments,
  useSegmentationJobs,
  useSegmentationStats,
  useStartSegmentation,
  useVerifySegment,
} from './api';
import type {
  Segment,
  SegmentationJob,
  SegmentationMethod,
  SegmentStatus,
} from './types';

// ── Badge helpers ─────────────────────────────────────────────────────────────

function confidenceBadge(confidence: number) {
  const pct = `${(confidence * 100).toFixed(0)}%`;
  if (confidence >= 0.8)
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        {pct}
      </Badge>
    );
  if (confidence >= 0.6)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {pct}
      </Badge>
    );
  return <Badge variant="destructive">{pct}</Badge>;
}

function segmentStatusBadge(status: SegmentStatus) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Approved
        </Badge>
      );
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    case 'merged':
    case 'split':
      return <Badge variant="outline">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

function jobStatusBadge(status: string) {
  switch (status) {
    case 'processing':
      return <Badge>Processing</Badge>;
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Completed
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(s: string, n = 20) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ── SegmentCard sub-component ─────────────────────────────────────────────────

interface SegmentCardProps {
  segment: Segment;
  title: string;
  onTitleChange: (title: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onCreateDocument: () => void;
  isProcessing: boolean;
}

function SegmentCard({
  segment,
  title,
  onTitleChange,
  onApprove,
  onReject,
  onCreateDocument,
  isProcessing,
}: SegmentCardProps) {
  return (
    <Card className={segment.needs_review ? 'border-yellow-400' : ''}>
      <CardContent className="pt-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-medium text-sm">
            Segment {segment.segment_number} of {segment.total_segments}
            {segment.original_page_number > 0 && (
              <span className="text-muted-foreground font-normal ml-1.5">
                (page {segment.original_page_number})
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {confidenceBadge(segment.segmentation_confidence)}
            {segmentStatusBadge(segment.status)}
          </div>
        </div>

        {/* Editable title */}
        <div>
          <Label className="text-xs text-muted-foreground">Document Title</Label>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter document title"
            className="mt-1 h-8 text-sm"
            disabled={segment.status === 'rejected'}
          />
        </div>

        {segment.document_type_hint && (
          <p className="text-xs text-muted-foreground">
            Type hint: {segment.document_type_hint}
          </p>
        )}

        {segment.was_deskewed && (
          <p className="text-xs text-muted-foreground">Deskewed · angle {segment.rotation_angle.toFixed(1)}°</p>
        )}

        {/* Actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={onApprove}
            disabled={isProcessing || segment.status === 'approved'}
          >
            {isProcessing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Approve</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onReject}
            disabled={isProcessing || segment.status === 'rejected'}
          >
            <X className="h-3.5 w-3.5" />
            <span className="ml-1">Reject</span>
          </Button>

          {segment.status === 'approved' && !segment.document_id && (
            <Button size="sm" className="ml-auto" onClick={onCreateDocument} disabled={isProcessing}>
              <FileText className="h-3.5 w-3.5 mr-1" />
              Create Doc
            </Button>
          )}

          {segment.document_id && (
            <Badge
              variant="outline"
              className="ml-auto text-xs text-green-600 border-green-300"
            >
              Doc created
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DEFAULT_START_FORM = {
  document_id: '',
  method: 'hybrid' as SegmentationMethod,
  min_confidence: 0.6,
  deskew: true,
  auto_create_documents: false,
};

export function SegmentationPage() {
  const { toast } = useToast();

  // Tab / selection state
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedJob, setSelectedJob] = useState<SegmentationJob | null>(null);

  // Per-segment loading tracking (approve / reject)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const markProcessing = (id: string) =>
    setProcessingIds((prev) => new Set([...prev, id]));
  const unmarkProcessing = (id: string) =>
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  // Editable per-segment titles (user overrides)
  const [segmentTitles, setSegmentTitles] = useState<Record<string, string>>({});

  // Start dialog
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [startForm, setStartForm] = useState(DEFAULT_START_FORM);

  // Create-document dialog (single segment)
  const [createDocTarget, setCreateDocTarget] = useState<{
    segmentId: string;
    defaultTitle: string;
  } | null>(null);
  const [createDocFolderId, setCreateDocFolderId] = useState('');
  const [createDocTitle, setCreateDocTitle] = useState('');

  // Bulk create folder
  const [bulkFolderId, setBulkFolderId] = useState('');

  // ── Queries ──
  const {
    data: jobs = [],
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useSegmentationJobs();

  const {
    data: segmentsList,
    isLoading: isLoadingSegments,
  } = useJobSegments(selectedJob?.source_document_id);

  const segments: Segment[] = segmentsList?.items ?? [];

  const { data: stats, isLoading: isLoadingStats } = useSegmentationStats();

  // ── Mutations ──
  const startMutation = useStartSegmentation();
  const verifyMutation = useVerifySegment();
  const createDocMutation = useCreateDocumentFromSegment();

  // ── Derived counts ──
  const pendingCount = segments.filter((s) => s.status === 'pending').length;
  const approvedCount = segments.filter((s) => s.status === 'approved').length;
  const approvedWithoutDoc = segments.filter(
    (s) => s.status === 'approved' && !s.document_id,
  ).length;
  const rejectedCount = segments.filter((s) => s.status === 'rejected').length;

  // ── Helpers ──
  const getSegmentTitle = (segment: Segment) =>
    segmentTitles[segment.id] ??
    segment.document_type_hint ??
    `Segment ${segment.segment_number}`;

  function handleSelectJob(job: SegmentationJob) {
    setSelectedJob(job);
    setActiveTab('review');
  }

  // ── Handlers ──

  async function handleStartSubmit() {
    if (!startForm.document_id.trim()) {
      toast({ title: 'Document ID is required', variant: 'destructive' });
      return;
    }
    try {
      await startMutation.mutateAsync({
        document_id: startForm.document_id.trim(),
        method: startForm.method,
        min_confidence: startForm.min_confidence,
        deskew: startForm.deskew,
        auto_create_documents: startForm.auto_create_documents,
      });
      toast({ title: 'Segmentation job started' });
      setShowStartDialog(false);
      setStartForm(DEFAULT_START_FORM);
    } catch {
      toast({ title: 'Failed to start segmentation', variant: 'destructive' });
    }
  }

  async function handleApprove(segmentId: string) {
    markProcessing(segmentId);
    try {
      await verifyMutation.mutateAsync({ segmentId, req: { approved: true } });
      toast({ title: 'Segment approved' });
    } catch {
      toast({ title: 'Failed to approve segment', variant: 'destructive' });
    } finally {
      unmarkProcessing(segmentId);
    }
  }

  async function handleReject(segmentId: string) {
    markProcessing(segmentId);
    try {
      await verifyMutation.mutateAsync({ segmentId, req: { approved: false } });
      toast({ title: 'Segment rejected' });
    } catch {
      toast({ title: 'Failed to reject segment', variant: 'destructive' });
    } finally {
      unmarkProcessing(segmentId);
    }
  }

  async function handleApproveAll() {
    const pending = segments.filter((s) => s.status === 'pending');
    if (!pending.length) return;
    pending.forEach((s) => markProcessing(s.id));
    try {
      await Promise.all(
        pending.map((s) =>
          verifyMutation.mutateAsync({ segmentId: s.id, req: { approved: true } }),
        ),
      );
      toast({ title: `${pending.length} segments approved` });
    } catch {
      toast({ title: 'Some segments failed to approve', variant: 'destructive' });
    } finally {
      pending.forEach((s) => unmarkProcessing(s.id));
    }
  }

  async function handleCreateDocSubmit() {
    if (!createDocTarget) return;
    if (!createDocFolderId.trim()) {
      toast({ title: 'Folder ID is required', variant: 'destructive' });
      return;
    }
    try {
      await createDocMutation.mutateAsync({
        segment_id: createDocTarget.segmentId,
        folder_id: createDocFolderId.trim(),
        title: createDocTitle.trim() || createDocTarget.defaultTitle,
      });
      toast({ title: 'Document created successfully' });
      setCreateDocTarget(null);
    } catch {
      toast({ title: 'Failed to create document', variant: 'destructive' });
    }
  }

  async function handleCreateAllApproved() {
    if (!bulkFolderId.trim()) {
      toast({ title: 'Enter a destination folder ID first', variant: 'destructive' });
      return;
    }
    const eligible = segments.filter((s) => s.status === 'approved' && !s.document_id);
    if (!eligible.length) {
      toast({ title: 'No approved segments without documents' });
      return;
    }
    try {
      await Promise.all(
        eligible.map((s) =>
          createDocMutation.mutateAsync({
            segment_id: s.id,
            folder_id: bulkFolderId.trim(),
            title: getSegmentTitle(s),
          }),
        ),
      );
      toast({ title: `${eligible.length} documents created` });
    } catch {
      toast({ title: 'Some documents failed to create', variant: 'destructive' });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Segmentation</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="review">
            Review
            {selectedJob && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {truncate(selectedJob.source_document_id, 8)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Jobs ─────────────────────────────────────────────────── */}
        <TabsContent value="jobs" className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowStartDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Start New
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchJobs()}
              disabled={isLoadingJobs}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingJobs ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Document</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Segments</TableHead>
                  <TableHead className="text-right">Docs Detected</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingJobs ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No segmentation jobs yet. Start one to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelectJob(job)}
                    >
                      <TableCell className="font-mono text-xs">
                        {truncate(job.source_document_id, 24)}
                      </TableCell>
                      <TableCell className="capitalize text-sm">{job.method.replace('_', ' ')}</TableCell>
                      <TableCell>{jobStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-right">{job.segments_created}</TableCell>
                      <TableCell className="text-right">{job.documents_detected}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(job.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Tab 2: Review ───────────────────────────────────────────────── */}
        <TabsContent value="review" className="mt-4">
          {!selectedJob ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Scissors className="h-10 w-10 opacity-25" />
              <p className="text-sm">Select a job from the Jobs tab to review its segments.</p>
            </div>
          ) : (
            <div className="flex gap-4 h-[calc(100vh-280px)]">
              {/* Left: Segments list */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {isLoadingSegments ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-lg" />
                  ))
                ) : segments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <Scissors className="h-8 w-8 opacity-25" />
                    <p className="text-sm">No segments found for this document.</p>
                  </div>
                ) : (
                  segments.map((segment) => (
                    <SegmentCard
                      key={segment.id}
                      segment={segment}
                      title={getSegmentTitle(segment)}
                      onTitleChange={(t) =>
                        setSegmentTitles((prev) => ({ ...prev, [segment.id]: t }))
                      }
                      onApprove={() => handleApprove(segment.id)}
                      onReject={() => handleReject(segment.id)}
                      onCreateDocument={() => {
                        const defaultTitle = getSegmentTitle(segment);
                        setCreateDocTarget({
                          segmentId: segment.id,
                          defaultTitle,
                        });
                        setCreateDocTitle(defaultTitle);
                      }}
                      isProcessing={processingIds.has(segment.id)}
                    />
                  ))
                )}
              </div>

              {/* Right: Info + bulk actions */}
              <div className="w-72 space-y-4 overflow-y-auto">
                {/* Job info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Job Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method</span>
                      <span className="capitalize">{selectedJob.method.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {jobStatusBadge(selectedJob.status)}
                    </div>
                    {selectedJob.processing_time_ms != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span>{(selectedJob.processing_time_ms / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary counts */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
                    {[
                      { label: 'Total', value: segments.length, color: '' },
                      { label: 'Approved', value: approvedCount, color: 'text-green-600' },
                      { label: 'Pending', value: pendingCount, color: '' },
                      { label: 'Rejected', value: rejectedCount, color: 'text-destructive' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-medium ${color}`}>{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Bulk actions */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bulk Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={handleApproveAll}
                      disabled={pendingCount === 0}
                    >
                      <Check className="h-4 w-4 mr-1.5" />
                      Approve All ({pendingCount})
                    </Button>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Destination Folder ID
                      </Label>
                      <Input
                        placeholder="Folder ID"
                        value={bulkFolderId}
                        onChange={(e) => setBulkFolderId(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>

                    <Button
                      className="w-full"
                      size="sm"
                      onClick={handleCreateAllApproved}
                      disabled={approvedWithoutDoc === 0 || createDocMutation.isPending}
                    >
                      {createDocMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-1.5" />
                      )}
                      Create All Approved ({approvedWithoutDoc})
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Stats ────────────────────────────────────────────────── */}
        <TabsContent value="stats" className="mt-4">
          {isLoadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : !stats ? (
            <p className="text-muted-foreground text-sm">No statistics available.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Segments', value: stats.total_segments },
                { label: 'Pending Review', value: stats.pending_review },
                { label: 'Approved', value: stats.approved },
                { label: 'Rejected', value: stats.rejected },
                {
                  label: 'Avg Confidence',
                  value: `${(stats.avg_confidence * 100).toFixed(1)}%`,
                },
                { label: 'Documents Created', value: stats.documents_created },
                { label: 'Multi-doc Scans', value: stats.multi_document_scans },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Start Segmentation Dialog ────────────────────────────────────── */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Segmentation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document ID</Label>
              <Input
                placeholder="Enter document ID"
                value={startForm.document_id}
                onChange={(e) =>
                  setStartForm((f) => ({ ...f, document_id: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select
                value={startForm.method}
                onValueChange={(v) =>
                  setStartForm((f) => ({ ...f, method: v as SegmentationMethod }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Hybrid (recommended)</SelectItem>
                  <SelectItem value="vlm">VLM</SelectItem>
                  <SelectItem value="edge_detection">Edge Detection</SelectItem>
                  <SelectItem value="contour">Contour</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Min Confidence (0 – 1)</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={startForm.min_confidence}
                onChange={(e) =>
                  setStartForm((f) => ({
                    ...f,
                    min_confidence: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="deskew"
                checked={startForm.deskew}
                onCheckedChange={(v) => setStartForm((f) => ({ ...f, deskew: v }))}
              />
              <Label htmlFor="deskew">Auto-deskew segments</Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="auto-create"
                checked={startForm.auto_create_documents}
                onCheckedChange={(v) =>
                  setStartForm((f) => ({ ...f, auto_create_documents: v }))
                }
              />
              <Label htmlFor="auto-create">Auto-create documents</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartSubmit} disabled={startMutation.isPending}>
              {startMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Document Dialog (single segment) ──────────────────────── */}
      <Dialog
        open={!!createDocTarget}
        onOpenChange={(open) => { if (!open) setCreateDocTarget(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Document from Segment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Destination Folder ID</Label>
              <Input
                placeholder="Enter folder ID"
                value={createDocFolderId}
                onChange={(e) => setCreateDocFolderId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Document Title{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                placeholder={createDocTarget?.defaultTitle ?? 'Auto-generated'}
                value={createDocTitle}
                onChange={(e) => setCreateDocTitle(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDocTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDocSubmit} disabled={createDocMutation.isPending}>
              {createDocMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
