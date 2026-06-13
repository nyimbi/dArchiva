// (c) Copyright Datacraft, 2026
/**
 * Multi-image document stitching UI.
 * Uploads 2–8 overlapping images, stitches them server-side via OpenCV,
 * previews the result, then adds to the current batch.
 */
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, X, ArrowRight, Layers, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface StitchResult {
  status: 'ok' | 'failed' | 'need_more_images' | 'not_enough_overlap';
  imageBase64?: string;
  confidence?: number;
  imagesUsed?: number;
  errorMessage?: string;
}

interface ImageStitcherProps {
  batchId?: string;
  onAccept?: (imageBase64: string) => void;
  onClose?: () => void;
}

const STATUS_MESSAGES: Record<string, string> = {
  need_more_images: 'At least 2 images are required for stitching.',
  not_enough_overlap: 'Images need at least 15% overlap. Try recapturing with more overlap between shots.',
  failed: 'Stitching failed. Images may have insufficient matching features.',
};

export function ImageStitcher({ batchId, onAccept, onClose }: ImageStitcherProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const stitchMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      form.append('output_format', 'jpeg');
      form.append('min_overlap', '0.15');
      const res = await fetch('/api/v1/scanning-projects/stitch-images/from-uploads', {
        method: 'POST',
        body: form,
        headers: { Accept: 'image/jpeg, application/json' },
      });
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok) {
        const detail = await res.json().catch(() => ({ detail: 'Unknown error' }));
        return {
          status: 'failed',
          errorMessage: detail.detail ?? 'Stitch failed',
        } as StitchResult;
      }
      if (contentType.startsWith('image/')) {
        const blob = await res.blob();
        const b64 = await blobToBase64(blob);
        const confidence = parseFloat(res.headers.get('x-stitch-confidence') ?? '0');
        const imagesUsed = parseInt(res.headers.get('x-stitch-images-used') ?? '0', 10);
        return { status: 'ok', imageBase64: b64, confidence, imagesUsed } as StitchResult;
      }
      const json = await res.json();
      return { status: json.status ?? 'failed', errorMessage: json.detail } as StitchResult;
    },
    onSuccess: (data) => setResult(data),
  });

  const addFile = useCallback((newFiles: File[]) => {
    const images = newFiles.filter((f) => f.type.startsWith('image/'));
    const capped = images.slice(0, Math.max(0, 8 - files.length));
    if (!capped.length) return;
    setFiles((prev) => [...prev, ...capped]);
    capped.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
    setResult(null);
  }, [files.length]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFile(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold">Multi-Image Stitching</h3>
        <p className="text-sm text-muted-foreground">
          Upload 2–8 overlapping captures of a large document to stitch into one image.
          Ensure ≥15% overlap between adjacent shots.
        </p>
      </div>

      <Separator />

      {/* Drop zone */}
      {files.length < 8 && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={[
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
          ].join(' ')}
          onClick={() => document.getElementById('stitch-file-input')?.click()}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop images here or <span className="text-primary underline">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">{files.length}/8 images added</p>
          <input
            id="stitch-file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => addFile(Array.from(e.target.files ?? []))}
          />
        </div>
      )}

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Image ${i + 1}`}
                className="w-full h-24 object-cover rounded border"
              />
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs rounded px-1">
                {i + 1}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stitch button */}
      {files.length >= 2 && !result && (
        <Button
          onClick={() => stitchMutation.mutate()}
          disabled={stitchMutation.isPending}
          className="w-full"
        >
          {stitchMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Stitching…
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-2" />
              Stitch {files.length} Images
            </>
          )}
        </Button>
      )}

      {/* Result */}
      {result && (
        <Card>
          <CardContent className="pt-4">
            {result.status === 'ok' && result.imageBase64 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">Stitching successful</span>
                  {result.confidence !== undefined && (
                    <Badge variant="outline" className="ml-auto">
                      {Math.round(result.confidence * 100)}% confidence
                    </Badge>
                  )}
                </div>
                <img
                  src={`data:image/jpeg;base64,${result.imageBase64}`}
                  alt="Stitched document"
                  className="w-full rounded border max-h-64 object-contain"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = `data:image/jpeg;base64,${result.imageBase64}`;
                      a.download = 'stitched-document.jpg';
                      a.click();
                    }}
                  >
                    Download
                  </Button>
                  {onAccept && (
                    <Button
                      size="sm"
                      onClick={() => onAccept(result.imageBase64!)}
                      className="flex-1"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Add to Batch
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Stitching failed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {STATUS_MESSAGES[result.status] ?? result.errorMessage ?? 'Unknown error.'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
