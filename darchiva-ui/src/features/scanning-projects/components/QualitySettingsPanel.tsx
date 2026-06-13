// (c) Copyright Datacraft, 2026
/**
 * Per-project quality threshold configuration panel.
 * Maps to GET/PUT /{project_id}/quality-config.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Settings2, Shield, Zap } from 'lucide-react';

interface QualityConfig {
  minScore: number;
  minDpi: number;
  autoRejectDefects: string[];
  flagForReviewDefects: string[];
  enableVlmDeepAnalysis: boolean;
  vlmThreshold: number;
  enableDedup: boolean;
  dedupAction: 'block' | 'flag' | 'allow';
}

const ALL_DEFECTS = [
  { key: 'document_cutoff', label: 'Document cutoff' },
  { key: 'glare', label: 'Glare' },
  { key: 'blurry', label: 'Blurry' },
  { key: 'skewed', label: 'Skewed' },
  { key: 'shadow', label: 'Shadow' },
  { key: 'text_too_small', label: 'Text too small' },
  { key: 'background_noise', label: 'Background noise' },
  { key: 'orientation_error', label: 'Orientation error' },
  { key: 'low_contrast', label: 'Low contrast' },
];

const DEDUP_ACTIONS = [
  { value: 'block', label: 'Block', description: 'Reject duplicate before ingestion' },
  { value: 'flag', label: 'Flag', description: 'Ingest but mark as duplicate' },
  { value: 'allow', label: 'Allow', description: 'Ignore duplicates' },
] as const;

interface QualitySettingsPanelProps {
  projectId: string;
}

export function QualitySettingsPanel({ projectId }: QualitySettingsPanelProps) {
  const qc = useQueryClient();
  const [config, setConfig] = useState<QualityConfig | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: remote, isLoading } = useQuery<QualityConfig>({
    queryKey: ['quality-config', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<QualityConfig>(
        `/scanning-projects/${projectId}/quality-config`
      );
      return data;
    },
  });

  useEffect(() => {
    if (remote && !config) setConfig(remote);
  }, [remote, config]);

  const saveMutation = useMutation({
    mutationFn: async (cfg: QualityConfig) => {
      const { data } = await apiClient.put<QualityConfig>(
        `/scanning-projects/${projectId}/quality-config`,
        cfg
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quality-config', projectId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const toggleDefect = (list: 'autoRejectDefects' | 'flagForReviewDefects', key: string) => {
    setConfig((c) => {
      if (!c) return c;
      const current = c[list];
      return {
        ...c,
        [list]: current.includes(key) ? current.filter((d) => d !== key) : [...current, key],
      };
    });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5" /> Quality Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Per-page thresholds and defect routing for this project.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => config && saveMutation.mutate(config)}
          disabled={saveMutation.isPending}
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> Saved</>
          ) : saveMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</>
          ) : (
            'Save'
          )}
        </Button>
      </div>

      <Separator />

      {/* Score thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Score Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">Minimum quality score</label>
              <Badge variant="outline">{Math.round(config.minScore * 100)}%</Badge>
            </div>
            <Slider
              min={0} max={100} step={1}
              value={[Math.round(config.minScore * 100)]}
              onValueChange={([v]) => setConfig({ ...config, minScore: v / 100 })}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">Pages below this go to rescan queue.</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">Minimum DPI</label>
              <Badge variant="outline">{config.minDpi}</Badge>
            </div>
            <Slider
              min={72} max={1200} step={50}
              value={[config.minDpi]}
              onValueChange={([v]) => setConfig({ ...config, minDpi: v })}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Defect routing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Defect Routing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-1">
            {ALL_DEFECTS.map(({ key, label }) => {
              const isAutoReject = config.autoRejectDefects.includes(key);
              const isFlagReview = config.flagForReviewDefects.includes(key);
              return (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-sm">{label}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleDefect('autoRejectDefects', key)}
                      className={[
                        'text-xs px-2 py-0.5 rounded border transition-colors',
                        isAutoReject
                          ? 'bg-destructive/10 border-destructive/40 text-destructive'
                          : 'border-border text-muted-foreground hover:border-destructive/40',
                      ].join(' ')}
                    >
                      Auto-reject
                    </button>
                    <button
                      onClick={() => toggleDefect('flagForReviewDefects', key)}
                      className={[
                        'text-xs px-2 py-0.5 rounded border transition-colors',
                        isFlagReview
                          ? 'bg-amber-50 border-amber-300 text-amber-700'
                          : 'border-border text-muted-foreground hover:border-amber-300',
                      ].join(' ')}
                    >
                      Flag review
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* VLM deep analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" /> VLM Deep Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Enable qwen2.5-VL second pass</p>
              <p className="text-xs text-muted-foreground">Runs on borderline scores for high-confidence QC</p>
            </div>
            <Switch
              checked={config.enableVlmDeepAnalysis}
              onCheckedChange={(v) => setConfig({ ...config, enableVlmDeepAnalysis: v })}
            />
          </div>
          {config.enableVlmDeepAnalysis && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm">VLM trigger threshold</label>
                <Badge variant="outline">{Math.round(config.vlmThreshold * 100)}%</Badge>
              </div>
              <Slider
                min={0} max={100} step={5}
                value={[Math.round(config.vlmThreshold * 100)]}
                onValueChange={([v]) => setConfig({ ...config, vlmThreshold: v / 100 })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Scores below this trigger the VLM pass.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dedup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" /> Deduplication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Enable SHA-256 + pHash dedup</p>
              <p className="text-xs text-muted-foreground">Checks for exact and near-duplicate scans at ingestion</p>
            </div>
            <Switch
              checked={config.enableDedup}
              onCheckedChange={(v) => setConfig({ ...config, enableDedup: v })}
            />
          </div>
          {config.enableDedup && (
            <div className="flex gap-2">
              {DEDUP_ACTIONS.map(({ value, label, description }) => (
                <button
                  key={value}
                  onClick={() => setConfig({ ...config, dedupAction: value })}
                  className={[
                    'flex-1 rounded-lg border p-3 text-left transition-colors',
                    config.dedupAction === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
