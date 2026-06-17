// (c) Copyright Datacraft, 2026
/**
 * SeparatorConfig — per-project separator sheet and blank page detection settings.
 *
 * Renders two sections:
 *   1. Separator Sheet Detection  (mode select + optional barcode prefix input)
 *   2. Blank Page Removal         (auto-remove toggle + threshold slider)
 *
 * Persists via PATCH /api/v1/scanning-projects/{projectId}
 * using the quality_config sub-object.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, FlaskConical, Loader2, ScanLine, Scissors } from 'lucide-react';

import { useScanningProject } from '../hooks';
import { useUpdateProjectScanConfig } from '../hooks';
import type { SeparatorMode } from '../types';

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function modeLabel(mode: SeparatorMode): string {
  switch (mode) {
    case 'none':       return 'None';
    case 'blank_page': return 'Blank Page';
    case 'barcode':    return 'Barcode Separator';
    case 'both':       return 'Both';
  }
}

function barcodeEnabled(mode: SeparatorMode): boolean {
  return mode === 'barcode' || mode === 'both';
}

// ── component ─────────────────────────────────────────────────────────────────

export function SeparatorConfig({ projectId }: Props) {
  const { data: project, isLoading: projectLoading } = useScanningProject(projectId);
  const updateConfig = useUpdateProjectScanConfig();

  // Local form state — hydrated from project.quality_config when available
  const [separatorMode, setSeparatorMode]       = useState<SeparatorMode>('none');
  const [barcodePrefix, setBarcodePrefix]       = useState('');
  const [projectCodePattern, setProjectCodePattern] = useState('');
  const [autoRemove, setAutoRemove]             = useState(false);
  // threshold stored as 0–100 integer for the slider; converted to 0.0–1.0 on save
  const [thresholdPct, setThresholdPct]         = useState(97);
  const [saved, setSaved]                       = useState(false);

  // "Test Barcode" mini-tester state
  const [testBarcode, setTestBarcode]   = useState('');
  const [testResult, setTestResult]     = useState<string | null>(null);

  // Hydrate from server once project data arrives
  useEffect(() => {
    if (!project) return;
    // quality_config arrives as an opaque dict from the backend
    const cfg = (project as unknown as { quality_config?: Record<string, unknown> }).quality_config ?? {};
    setSeparatorMode((cfg.separator_mode as SeparatorMode | undefined) ?? 'none');
    setBarcodePrefix((cfg.separator_barcode_prefix as string | undefined) ?? '');
    setProjectCodePattern((cfg.project_code_pattern as string | undefined) ?? '');
    setAutoRemove((cfg.auto_remove_blanks as boolean | undefined) ?? false);
    const raw = cfg.blank_threshold as number | undefined;
    setThresholdPct(raw !== undefined ? Math.round(raw * 100) : 97);
  }, [project]);

  const isDirty = !!project; // always allow save once loaded

  function handleSave() {
    updateConfig.mutate(
      {
        projectId,
        input: {
          quality_config: {
            separator_mode: separatorMode,
            separator_barcode_prefix: barcodePrefix,
            project_code_pattern: projectCodePattern,
            auto_remove_blanks: autoRemove,
            blank_threshold: thresholdPct / 100,
          },
        },
      },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  }

  if (projectLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading project…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Separator Sheet Detection ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4 text-primary" />
            Separator Sheet Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="separator-mode">Detection mode</Label>
            <Select
              value={separatorMode}
              onValueChange={(v) => setSeparatorMode(v as SeparatorMode)}
            >
              <SelectTrigger id="separator-mode" className="w-full max-w-xs">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {(['none', 'blank_page', 'barcode', 'both'] as SeparatorMode[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {modeLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When a separator is detected the scanner station flags the page and
              triggers a batch split at that point.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode-prefix">
              Separator barcode prefix
            </Label>
            <Input
              id="barcode-prefix"
              placeholder="e.g. SEP-"
              value={barcodePrefix}
              onChange={(e) => setBarcodePrefix(e.target.value)}
              disabled={!barcodeEnabled(separatorMode)}
              className="max-w-xs font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Barcodes whose value starts with this prefix are treated as
              separator sheets.  Leave blank to match any barcode.
              {!barcodeEnabled(separatorMode) && (
                <span className="ml-1 italic">
                  (Enable Barcode or Both mode to use this field.)
                </span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-code-pattern">
              Project code pattern
            </Label>
            <Input
              id="project-code-pattern"
              placeholder="e.g. PROJ-"
              value={projectCodePattern}
              onChange={(e) => {
                setProjectCodePattern(e.target.value);
                setTestResult(null);
              }}
              disabled={!barcodeEnabled(separatorMode)}
              className="max-w-xs font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Prefix used to extract a project code from the barcode value.
              E.g. prefix <code className="px-1 bg-muted rounded">PROJ-</code> extracts{' '}
              <code className="px-1 bg-muted rounded">2024-001</code> from{' '}
              <code className="px-1 bg-muted rounded">PROJ-2024-001-SEP</code>.
            </p>
          </div>

          {/* Test Barcode mini-tool */}
          {barcodeEnabled(separatorMode) && projectCodePattern && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FlaskConical className="h-4 w-4" />
                Test barcode extraction
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste a sample barcode value…"
                  value={testBarcode}
                  onChange={(e) => {
                    setTestBarcode(e.target.value);
                    setTestResult(null);
                  }}
                  className="max-w-xs font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!testBarcode.trim() || !projectCodePattern) {
                      setTestResult(null);
                      return;
                    }
                    // Mirror the Python regex: ^{pattern}(.+?)(-SEP)?$
                    try {
                      const escaped = projectCodePattern.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&',
                      );
                      const rx = new RegExp(`^${escaped}(.+?)(-SEP)?$`);
                      const m = rx.exec(testBarcode.trim());
                      setTestResult(m ? m[1] : null);
                    } catch {
                      setTestResult(null);
                    }
                  }}
                >
                  Test
                </Button>
              </div>
              {testBarcode && (
                <p className="text-xs">
                  {testResult !== null ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Extracted code: <strong>{testResult}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      No match — barcode does not start with the pattern.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Blank Page Removal ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4 text-primary" />
            Blank Page Removal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-remove-blanks">Auto-remove blank pages</Label>
              <p className="text-xs text-muted-foreground">
                Pages that exceed the whiteness threshold are silently discarded
                at ingestion time rather than stored for review.
              </p>
            </div>
            <Switch
              id="auto-remove-blanks"
              checked={autoRemove}
              onCheckedChange={setAutoRemove}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Blank threshold</Label>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">
                {thresholdPct}%
              </span>
            </div>
            <Slider
              min={90}
              max={99}
              step={1}
              value={[thresholdPct]}
              onValueChange={([v]) => setThresholdPct(v)}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Percentage of near-white pixels (≥ 240/255) required to classify
              a page as blank.  Higher values are more conservative (fewer false
              positives).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateConfig.isPending || !isDirty}
        >
          {updateConfig.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Saved
            </>
          ) : (
            'Save configuration'
          )}
        </Button>
        {updateConfig.isError && (
          <p className="text-sm text-destructive">
            Save failed — please try again.
          </p>
        )}
      </div>
    </div>
  );
}

export default SeparatorConfig;
