// (c) Copyright Datacraft, 2026
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { ViewerPage } from '@/types';
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  FileOutput,
  Layers,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApplyPageOps, useExtractPages } from './api';
import type { ExtractStrategy, PageState } from './types';

interface PageManagementPanelProps {
  documentId: string;
  pages: ViewerPage[];
}

function initPageStates(pages: ViewerPage[]): PageState[] {
  return pages.map((p) => ({
    id: p.id,
    pageNumber: p.pageNumber,
    angle: 0,
    selected: false,
    thumbnailUrl: p.thumbnailUrl,
  }));
}

export function PageManagementPanel({ documentId, pages }: PageManagementPanelProps) {
  const [pageStates, setPageStates] = useState<PageState[]>(() => initPageStates(pages));
  const [isDirty, setIsDirty] = useState(false);

  // Extract dialog state
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractFolderId, setExtractFolderId] = useState('');
  const [extractTitle, setExtractTitle] = useState('Extracted Document');
  const [extractStrategy, setExtractStrategy] = useState<ExtractStrategy>('all-pages-in-one-doc');

  const applyOps = useApplyPageOps(documentId);
  const extractPages = useExtractPages();

  // Re-sync when pages prop changes (e.g. after save)
  useEffect(() => {
    setPageStates(initPageStates(pages));
    setIsDirty(false);
  }, [pages]);

  // ---- Mutations ----

  const markDirty = () => setIsDirty(true);

  function moveUp(index: number) {
    if (index === 0) return;
    setPageStates((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    markDirty();
  }

  function moveDown(index: number) {
    if (index === pageStates.length - 1) return;
    setPageStates((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    markDirty();
  }

  function rotate(index: number, delta: 90 | -90) {
    setPageStates((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, angle: ((p.angle + delta) % 360 + 360) % 360 } : p,
      ),
    );
    markDirty();
  }

  function toggleSelect(index: number) {
    setPageStates((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)),
    );
  }

  function toggleSelectAll() {
    const allSelected = pageStates.every((p) => p.selected);
    setPageStates((prev) => prev.map((p) => ({ ...p, selected: !allSelected })));
  }

  // Delete: remove selected pages from the list, will be excluded when saving
  function deleteSelected() {
    setPageStates((prev) => prev.filter((p) => !p.selected));
    markDirty();
  }

  // Save: POST /pages/ with current ordered list and accumulated angles
  function handleSave() {
    const ops = pageStates.map((p) => ({
      page: { id: p.id, number: p.pageNumber },
      angle: p.angle,
    }));
    applyOps.mutate(ops, {
      onSuccess: () => setIsDirty(false),
      onError: () => toast.error('Failed to apply page changes'),
    });
  }

  // Extract selected pages
  function handleExtract() {
    const selected = pageStates.filter((p) => p.selected);
    if (selected.length === 0) return;
    if (!extractFolderId.trim()) return;

    extractPages.mutate(
      {
        source_page_ids: selected.map((p) => p.id),
        target_folder_id: extractFolderId.trim(),
        strategy: extractStrategy,
        title_format: extractTitle.trim() || 'Extracted Document',
      },
      {
        onSuccess: () => {
          setExtractOpen(false);
          setExtractFolderId('');
        },
        onError: () => toast.error('Failed to extract pages'),
      },
    );
  }

  const selectedCount = pageStates.filter((p) => p.selected).length;
  const isLoading = pages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-3 py-2 space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brass-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200 flex-1">Manage Pages</span>
          <span className="text-xs text-slate-500">{pageStates.length}pp</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleSave}
            disabled={!isDirty || applyOps.isPending}
          >
            <Save className="w-3 h-3" />
            {applyOps.isPending ? 'Saving…' : 'Save Order'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={toggleSelectAll}
          >
            <CheckSquare className="w-3 h-3" />
            {pageStates.every((p) => p.selected) ? 'Deselect All' : 'Select All'}
          </Button>

          {selectedCount > 0 && (
            <>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs gap-1"
                onClick={deleteSelected}
              >
                <Trash2 className="w-3 h-3" />
                Delete ({selectedCount})
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setExtractOpen(true)}
              >
                <FileOutput className="w-3 h-3" />
                Extract ({selectedCount})
              </Button>
            </>
          )}
        </div>

        {applyOps.isError && (
          <p className="text-xs text-red-400">Save failed. Please try again.</p>
        )}
      </div>

      {/* Page list */}
      <div className="flex-1 px-2 py-2 space-y-1.5">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
            ))
          : pageStates.map((page, idx) => (
              <PageCard
                key={page.id}
                page={page}
                index={idx}
                total={pageStates.length}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
                onRotateLeft={() => rotate(idx, -90)}
                onRotateRight={() => rotate(idx, 90)}
                onToggleSelect={() => toggleSelect(idx)}
              />
            ))}

        {!isLoading && pageStates.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            All pages deleted. Save to confirm.
          </div>
        )}
      </div>

      {/* Extract dialog */}
      <Dialog open={extractOpen} onOpenChange={setExtractOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extract Pages to New Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="extract-folder">Target Folder ID</Label>
              <Input
                id="extract-folder"
                placeholder="Folder UUID"
                value={extractFolderId}
                onChange={(e) => setExtractFolderId(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                UUID of the destination folder in the archive.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="extract-title">Document Title / Format</Label>
              <Input
                id="extract-title"
                placeholder="e.g. Extracted Document"
                value={extractTitle}
                onChange={(e) => setExtractTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Strategy</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="strategy"
                    value="all-pages-in-one-doc"
                    checked={extractStrategy === 'all-pages-in-one-doc'}
                    onChange={() => setExtractStrategy('all-pages-in-one-doc')}
                    className="accent-brass-400"
                  />
                  All in one doc
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="strategy"
                    value="one-page-per-doc"
                    checked={extractStrategy === 'one-page-per-doc'}
                    onChange={() => setExtractStrategy('one-page-per-doc')}
                    className="accent-brass-400"
                  />
                  One page per doc
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExtractOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExtract}
              disabled={!extractFolderId.trim() || extractPages.isPending}
            >
              {extractPages.isPending ? 'Extracting…' : 'Extract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageCard
// ---------------------------------------------------------------------------

interface PageCardProps {
  page: PageState;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onToggleSelect: () => void;
}

function PageCard({
  page,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRotateLeft,
  onRotateRight,
  onToggleSelect,
}: PageCardProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-2 transition-colors ${
        page.selected
          ? 'border-brass-500/60 bg-brass-500/10'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {/* Checkbox */}
      <Checkbox
        checked={page.selected}
        onCheckedChange={onToggleSelect}
        className="shrink-0"
      />

      {/* Thumbnail */}
      <div className="w-12 h-16 shrink-0 bg-slate-700 rounded overflow-hidden flex items-center justify-center">
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.pageNumber}`}
            style={{ transform: `rotate(${page.angle}deg)` }}
            className="w-full h-full object-contain transition-transform"
          />
        ) : (
          <span className="text-xs text-slate-500">{page.pageNumber}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            p{index + 1}
          </Badge>
          {page.angle !== 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 text-brass-400 border-brass-500/40">
              {page.angle}°
            </Badge>
          )}
        </div>

        {/* Rotate controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={onRotateLeft}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            title="Rotate left 90°"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={onRotateRight}
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            title="Rotate right 90°"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Reorder controls */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
