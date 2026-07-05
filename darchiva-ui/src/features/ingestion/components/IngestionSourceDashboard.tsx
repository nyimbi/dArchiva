// (c) Copyright Datacraft, 2026
/**
 * Ingestion source status dashboard — shows all configured sources
 * (email, webhook, hot-folder) with last-sync time, document counts, errors.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Webhook,
  FolderOpen,
  RefreshCw,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type SourceType = 'email' | 'webhook' | 'hot_folder' | 'api_push';
type SourceStatus = 'active' | 'inactive' | 'error' | 'syncing';

interface IngestionSource {
  id: string;
  name: string;
  sourceType: SourceType;
  status: SourceStatus;
  lastSyncAt: string | null;
  documentsIngested: number;
  errorCount: number;
  lastError: string | null;
  config: Record<string, unknown>;
}

interface IngestionStats {
  totalSources: number;
  activeSources: number;
  documentsToday: number;
  errorsToday: number;
}

const SOURCE_ICONS: Record<SourceType, React.FC<{ className?: string }>> = {
  email: Mail,
  webhook: Webhook,
  hot_folder: FolderOpen,
  api_push: FileText,
};

const SOURCE_LABELS: Record<SourceType, string> = {
  email: 'Email (IMAP)',
  webhook: 'Webhook',
  hot_folder: 'Hot Folder',
  api_push: 'API Push',
};

const STATUS_BADGE: Record<SourceStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  active: { variant: 'default', label: 'Active' },
  inactive: { variant: 'secondary', label: 'Inactive' },
  error: { variant: 'destructive', label: 'Error' },
  syncing: { variant: 'outline', label: 'Syncing' },
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function IngestionSourceDashboard() {
  const qc = useQueryClient();

  const { data: sources, isLoading } = useQuery<IngestionSource[]>({
    queryKey: ['ingestion-sources'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: IngestionSource[] }>('/ingestion/sources');
      return data.items ?? data;
    },
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery<IngestionStats>({
    queryKey: ['ingestion-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<IngestionStats>('/ingestion/stats');
      return data;
    },
    refetchInterval: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiClient.post(`/ingestion/sources/${sourceId}/trigger`),
    onSuccess: () => {
      toast.success('Sync triggered');
      qc.invalidateQueries({ queryKey: ['ingestion-sources'] });
    },
    onError: () => toast.error('Sync failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiClient.post(`/ingestion/sources/${id}/${active ? 'stop' : 'start'}`),
    onSuccess: () => {
      toast.success('Source updated');
      qc.invalidateQueries({ queryKey: ['ingestion-sources'] });
    },
    onError: () => toast.error('Failed to update source'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sources…
      </div>
    );
  }

  const sourceList = sources ?? [];

  return (
    <div className="flex flex-col gap-5 p-4">
      <div>
        <h2 className="text-xl font-semibold">Ingestion Sources</h2>
        <p className="text-sm text-muted-foreground">
          Monitor and manage all document ingestion channels.
        </p>
      </div>

      {/* Summary row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total sources', value: stats.totalSources, icon: FileText },
            { label: 'Active', value: stats.activeSources, icon: CheckCircle2 },
            { label: 'Documents today', value: stats.documentsToday, icon: Clock },
            { label: 'Errors today', value: stats.errorsToday, icon: AlertCircle },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {sourceList.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No ingestion sources configured.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sourceList.map((src) => {
            const Icon = SOURCE_ICONS[src.sourceType] ?? FileText;
            const badge = STATUS_BADGE[src.status];
            const isActive = src.status === 'active' || src.status === 'syncing';

            return (
              <Card key={src.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{src.name}</span>
                        <Badge variant={badge.variant} className="text-xs">
                          {src.status === 'syncing' && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {badge.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {SOURCE_LABELS[src.sourceType]}
                        </span>
                      </div>

                      <div className="flex gap-4 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelative(src.lastSyncAt)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {src.documentsIngested.toLocaleString()} docs
                        </span>
                        {src.errorCount > 0 && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {src.errorCount} error{src.errorCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {src.lastError && (
                        <p className="text-xs text-destructive mt-1.5 truncate" title={src.lastError}>
                          {src.lastError}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Sync now"
                        disabled={syncMutation.isPending || src.status === 'syncing'}
                        onClick={() => syncMutation.mutate(src.id)}
                      >
                        <RefreshCw className={[
                          'w-3.5 h-3.5',
                          syncMutation.isPending ? 'animate-spin' : '',
                        ].join(' ')} />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title={isActive ? 'Stop source' : 'Start source'}
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: src.id, active: isActive })}
                      >
                        {isActive ? (
                          <PowerOff className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <Power className="w-3.5 h-3.5 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
