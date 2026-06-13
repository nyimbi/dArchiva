// (c) Copyright Datacraft, 2026
/**
 * Generate and download a printable barcode label sheet for a project.
 * Calls POST /scanning-projects/{projectId}/barcode-labels?count=N&prefix=P
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Printer } from 'lucide-react';

interface BarcodeLabelsButtonProps {
  projectId: string;
  projectCode?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function BarcodeLabelsButton({
  projectId,
  projectCode,
  variant = 'outline',
  size = 'sm',
}: BarcodeLabelsButtonProps) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(20);
  const [prefix, setPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ count: String(count) });
      if (prefix) params.set('prefix', prefix);
      const url = `/api/v1/scanning-projects/${projectId}/barcode-labels?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const filename = `${projectCode ?? projectId}-labels.html`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size}>
          <Printer className="w-4 h-4 mr-1.5" />
          Print labels
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Generate barcode labels</p>

          <div className="flex flex-col gap-1">
            <Label htmlFor="lbl-count" className="text-xs">Count (1–200)</Label>
            <Input
              id="lbl-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value))))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="lbl-prefix" className="text-xs">Prefix (optional)</Label>
            <Input
              id="lbl-prefix"
              placeholder="e.g. BOX"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Generating…</>
            ) : (
              <><Printer className="w-4 h-4 mr-1.5" />Generate &amp; Download</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
