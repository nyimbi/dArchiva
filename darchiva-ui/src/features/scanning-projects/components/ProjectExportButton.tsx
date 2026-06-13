// (c) Copyright Datacraft, 2026
/**
 * Export project batch manifest as CSV or JSON.
 * Triggers a direct download from the server.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Loader2, FileText, FileJson } from 'lucide-react';

interface ProjectExportButtonProps {
  projectId: string;
  projectCode?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ProjectExportButton({
  projectId,
  projectCode,
  variant = 'outline',
  size = 'sm',
}: ProjectExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const download = async (format: 'csv' | 'json') => {
    setLoading(true);
    try {
      const url = `/api/v1/scanning-projects/${projectId}/export.${format}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
        },
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
      const blob = await res.blob();
      const filename = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? `${projectCode ?? projectId}-batches.${format}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => download('csv')}>
          <FileText className="w-4 h-4 mr-2" />
          Batch manifest CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download('json')} disabled>
          <FileJson className="w-4 h-4 mr-2" />
          Full project JSON
          <span className="ml-auto text-xs text-muted-foreground">soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
