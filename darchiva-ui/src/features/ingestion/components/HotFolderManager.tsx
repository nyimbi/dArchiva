// (c) Copyright Datacraft, 2026
/**
 * Manage hot-folder ingestion source registrations.
 * Uses existing /ingestion/sources API filtered by source_type=hot_folder.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, Loader2, Plus, Trash2 } from 'lucide-react';

interface IngestionSource {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  config: Record<string, unknown>;
  documentsImported: number;
  lastSyncAt: string | null;
  errorCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-700',
};

export function HotFolderManager() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [watchPath, setWatchPath] = useState('');

  const { data: sources, isLoading } = useQuery<IngestionSource[]>({
    queryKey: ['ingestion-sources', 'hot_folder'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: IngestionSource[] }>(
        '/ingestion/sources?source_type=hot_folder&page_size=50'
      );
      return (data?.items ?? []).filter((s) => s.sourceType === 'hot_folder');
    },
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/ingestion/sources', {
        name,
        source_type: 'hot_folder',
        config: { watch_path: watchPath },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingestion-sources', 'hot_folder'] });
      setName('');
      setWatchPath('');
      setShowForm(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/ingestion/sources/${id}/stop`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingestion-sources', 'hot_folder'] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-500" />
            Hot Folder Watchers
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Files dropped into watched directories are automatically ingested.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add folder
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-3 px-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="hf-name" className="text-xs">Name</Label>
              <Input
                id="hf-name"
                placeholder="Scan inbox 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="hf-path" className="text-xs">Watch path</Label>
              <Input
                id="hf-path"
                placeholder="/mnt/scan-inbox"
                value={watchPath}
                onChange={(e) => setWatchPath(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!name.trim() || !watchPath.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : null}
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
            {createMutation.isError && (
              <p className="text-xs text-destructive">Failed to add hot folder.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-20 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
        </div>
      ) : !sources?.length ? (
        <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground border border-dashed rounded-lg">
          <FolderOpen className="w-6 h-6" />
          <span className="text-sm">No hot folders registered.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sources.map((src) => (
            <Card key={src.id}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{src.name}</span>
                    <Badge
                      className={`text-xs ${STATUS_COLORS[src.status] ?? STATUS_COLORS.inactive}`}
                      variant="outline"
                    >
                      {src.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {String(src.config?.watchPath ?? src.config?.watch_path ?? '—')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {src.documentsImported} docs imported
                    {src.lastSyncAt
                      ? ` · last sync ${new Date(src.lastSyncAt).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive flex-shrink-0"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(src.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
