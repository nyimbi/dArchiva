// (c) Copyright Datacraft, 2026
/**
 * Panel showing auto-fixable exceptions with a bulk "Apply fixes" action.
 * Calls GET /exceptions/auto-fixable and POST /exceptions/auto-fix-all.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Zap, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface AutoFixableException {
  id: string;
  exceptionType: string;
  documentId: string | null;
  defects: Record<string, unknown> | null;
  qualityScore: number | null;
}

interface AutoFixResult {
  fixed: number;
  skipped: number;
  failed: number;
  total: number;
}

const DEFECT_LABELS: Record<string, string> = {
  skewed: 'Skewed',
  low_contrast: 'Low contrast',
  background_noise: 'Background noise',
  orientation_error: 'Orientation error',
};

export function AutoFixPanel() {
  const qc = useQueryClient();

  const { data: fixable, isLoading } = useQuery<AutoFixableException[]>({
    queryKey: ['auto-fixable-exceptions'],
    queryFn: async () => {
      const { data } = await apiClient.get<AutoFixableException[]>('/exceptions/auto-fixable');
      return data;
    },
  });

  const fixMutation = useMutation({
    mutationFn: async (): Promise<AutoFixResult> => {
      const { data } = await apiClient.post<AutoFixResult>('/exceptions/auto-fix-all');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto-fixable-exceptions'] });
      qc.invalidateQueries({ queryKey: ['exceptions'] });
    },
  });

  const count = fixable?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Auto-fixable Exceptions
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defects that can be corrected without rescanning (skew, contrast, orientation).
          </p>
        </div>
        <Button
          size="sm"
          disabled={count === 0 || fixMutation.isPending}
          onClick={() => fixMutation.mutate()}
        >
          {fixMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Fixing…</>
          ) : (
            <><Zap className="w-4 h-4 mr-1.5" />Fix all ({count})</>
          )}
        </Button>
      </div>

      {fixMutation.data && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800">
            Fixed {fixMutation.data.fixed} exception{fixMutation.data.fixed !== 1 ? 's' : ''}.
            {fixMutation.data.skipped > 0 && ` ${fixMutation.data.skipped} skipped.`}
            {fixMutation.data.failed > 0 && ` ${fixMutation.data.failed} failed.`}
          </span>
        </div>
      )}

      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : count === 0 ? (
        <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm">No auto-fixable exceptions.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(fixable ?? []).map((ex) => {
            const defectKeys = Object.keys(ex.defects ?? {});
            return (
              <Card key={ex.id}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{ex.exceptionType.replace(/_/g, ' ')}</span>
                      {defectKeys.map((d) => (
                        <Badge key={d} variant="outline" className="text-xs">
                          {DEFECT_LABELS[d] ?? d}
                        </Badge>
                      ))}
                    </div>
                    {ex.documentId && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {ex.documentId.slice(0, 12)}…
                      </p>
                    )}
                  </div>
                  {ex.qualityScore !== null && (
                    <Badge
                      variant={ex.qualityScore > 0.6 ? 'secondary' : 'destructive'}
                      className="text-xs flex-shrink-0"
                    >
                      {Math.round((ex.qualityScore ?? 0) * 100)}%
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
