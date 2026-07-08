// (c) Copyright Datacraft, 2026
/**
 * Camera capture mode with perspective correction.
 * Uploads a photo, detects document corners, applies homographic correction.
 */
import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Upload,
  Crosshair,
  ArrowRight,
  RotateCcw,
  Settings2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Corner {
  x: number;
  y: number;
}

interface CaptureResult {
  success: boolean;
  detectedCorners: Corner[] | null;
  estimatedDpi: number | null;
  qualityScore: number | null;
  correctedImageBase64: string | null;
  error: string | null;
}

interface CameraDevice {
  index: number;
  width: number;
  height: number;
  fps: number;
  label: string;
}

interface CalibrationResult {
  pixelsPerMm: number;
  estimatedDpiAtCurrentDistance: number;
  instructions: string;
}

interface CameraCaptureProps {
  onAccept?: (imageBase64: string, dpi: number | null) => void;
  onClose?: () => void;
}

export function CameraCapture({ onAccept, onClose }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [knownWidthMm, setKnownWidthMm] = useState<number>(210); // A4 default
  const [targetDpi, setTargetDpi] = useState<number>(300);
  const [autoDetect, setAutoDetect] = useState(true);

  const { data: devices, isError: devicesIsError } = useQuery<CameraDevice[]>({
    queryKey: ['camera-devices'],
    queryFn: async () => {
      const { data } = await apiClient.get<CameraDevice[]>('/scanning-projects/camera/devices');
      return data;
    },
    staleTime: 30_000,
  });

  const processMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const params = new URLSearchParams({
        auto_detect: String(autoDetect),
        target_dpi: String(targetDpi),
        known_width_mm: String(knownWidthMm),
      });
      const res = await fetch(`/api/v1/scanning-projects/camera/process?${params}`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Processing failed');
      }
      return res.json() as Promise<CaptureResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Image processed');
    },
    onError: () => toast.error('Processing failed'),
  });

  const calibrateMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('calibration_image', file);
      const res = await fetch('/api/v1/scanning-projects/camera/calibrate', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Calibration failed');
      return res.json() as Promise<CalibrationResult>;
    },
    onSuccess: () => toast.success('Camera calibrated'),
    onError: () => toast.error('Calibration failed'),
  });

  const handleFileChange = (file: File) => {
    setOriginalFile(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setOriginalPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setOriginalFile(null);
    setOriginalPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const qualityColor = (score: number | null) => {
    if (score === null) return 'outline';
    if (score > 0.7) return 'default';
    if (score > 0.4) return 'secondary';
    return 'destructive';
  };

  if (devicesIsError) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-destructive">
        <AlertCircle className="w-4 h-4" />
        <span>Failed to load camera devices.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Camera Capture</h3>
          <p className="text-sm text-muted-foreground">
            Photograph a document then apply automatic perspective correction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {devices && devices.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />
              {devices.length} camera{devices.length !== 1 ? 's' : ''} detected
            </Badge>
          )}
          {onClose && (
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close camera capture">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Settings */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Settings2 className="w-3 h-3" /> Target DPI
          </label>
          <Select
            value={String(targetDpi)}
            onValueChange={(v) => setTargetDpi(Number(v))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[150, 200, 300, 400, 600].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} DPI</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Known doc width (mm)
          </label>
          <Select
            value={String(knownWidthMm)}
            onValueChange={(v) => setKnownWidthMm(Number(v))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="210">A4 — 210 mm</SelectItem>
              <SelectItem value="216">Letter — 216 mm</SelectItem>
              <SelectItem value="279">Legal — 279 mm</SelectItem>
              <SelectItem value="297">A3 — 297 mm</SelectItem>
              <SelectItem value="420">A2 — 420 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={autoDetect}
          onChange={(event) => setAutoDetect(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Auto-detect document corners before correction
      </label>

      {/* Upload / capture */}
      {!originalPreview ? (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Upload a photo of your document
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ensure the full document is visible with some background margin
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileChange(f);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Before / After */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Original</span>
              <div className="relative">
                <img
                  src={originalPreview}
                  alt="Original"
                  className="w-full rounded border object-contain max-h-48"
                />
                {result?.detectedCorners && (
                  <CornerOverlay
                    corners={result.detectedCorners}
                    imageEl={null}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Corrected</span>
              {result?.correctedImageBase64 ? (
                <img
                  src={`data:image/jpeg;base64,${result.correctedImageBase64}`}
                  alt="Corrected"
                  className="w-full rounded border object-contain max-h-48"
                />
              ) : (
                <div className="w-full max-h-48 h-32 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {processMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Press Process to correct'
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Metadata badges */}
          {result && (
            <div className="flex gap-2 flex-wrap">
              {result.detectedCorners ? (
                <Badge variant="outline" className="text-xs">
                  <Crosshair className="w-3 h-3 mr-1" />
                  Corners detected
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">No corners found — using full image</Badge>
              )}
              {result.estimatedDpi && (
                <Badge variant="outline" className="text-xs">
                  ~{Math.round(result.estimatedDpi)} DPI
                </Badge>
              )}
              {result.qualityScore !== null && (
                <Badge variant={qualityColor(result.qualityScore) as any} className="text-xs">
                  Quality {Math.round((result.qualityScore ?? 0) * 100)}%
                </Badge>
              )}
            </div>
          )}

          {result?.error && (
            <div className="flex items-start gap-2 p-3 rounded bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{result.error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="w-3 h-3 mr-1" />
              New photo
            </Button>
            <Button
              size="sm"
              onClick={() => originalFile && processMutation.mutate(originalFile)}
              disabled={processMutation.isPending || !originalFile}
              className="flex-1"
            >
              {processMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
              ) : (
                <><Crosshair className="w-4 h-4 mr-2" />Process</>
              )}
            </Button>
            {result?.success && result.correctedImageBase64 && onAccept && (
              <Button
                size="sm"
                onClick={() => onAccept(result.correctedImageBase64!, result.estimatedDpi)}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Accept
              </Button>
            )}
          </div>

          {/* Calibration */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">DPI Calibration</p>
            <p className="text-xs text-muted-foreground mb-2">
              Place an A4 sheet flat under your camera and upload a photo to calibrate DPI.
            </p>
            {calibrateMutation.data ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-700">
                  {Math.round(calibrateMutation.data.pixelsPerMm)} px/mm ·{' '}
                  ~{Math.round(calibrateMutation.data.estimatedDpiAtCurrentDistance)} DPI
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={calibrateMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {calibrateMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="w-3 h-3 mr-1" />
                )}
                Calibrate with A4 sheet
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** SVG overlay showing detected document corners on the original image. */
function CornerOverlay({ corners }: { corners: Corner[]; imageEl: HTMLImageElement | null }) {
  if (corners.length !== 4) return null;
  const pts = corners.map((c) => `${c.x},${c.y}`).join(' ');
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points={pts}
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        vectorEffect="non-scaling-stroke"
      />
      {corners.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r="3"
          fill="#22c55e"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
