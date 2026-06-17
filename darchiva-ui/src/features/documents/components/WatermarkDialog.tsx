// (c) Copyright Datacraft, 2026
// WatermarkDialog — apply a text watermark to a document PDF
import { useState } from 'react';
import { Loader2, Stamp, X, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApplyWatermark, type WatermarkPosition } from '../api/watermark';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
	documentId: string;
	open: boolean;
	onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
	{ label: 'Gray',  value: '#808080' },
	{ label: 'Red',   value: '#cc0000' },
	{ label: 'Blue',  value: '#0055cc' },
	{ label: 'Green', value: '#007a33' },
];

const POSITION_OPTIONS: { value: WatermarkPosition; label: string; desc: string }[] = [
	{ value: 'diagonal', label: 'Diagonal (full page)', desc: 'Centered, 45° rotation' },
	{ value: 'header',   label: 'Header',               desc: 'Top center' },
	{ value: 'footer',   label: 'Footer',               desc: 'Bottom center' },
	{ value: 'corner',   label: 'Corner',               desc: 'Bottom right' },
];

const FONT_SIZES = [24, 36, 48, 72];

// Parse a page-range string like "1-5, 8" into an array of 1-based ints.
// Returns "all" if the string is empty or literally "all".
function parsePageRange(raw: string): string | number[] {
	const trimmed = raw.trim();
	if (!trimmed || trimmed.toLowerCase() === 'all') return 'all';
	const indices: Set<number> = new Set();
	for (const part of trimmed.split(',')) {
		const p = part.trim();
		if (p.includes('-')) {
			const [lo, hi] = p.split('-').map(s => parseInt(s.trim(), 10));
			if (!isNaN(lo) && !isNaN(hi)) {
				for (let i = lo; i <= hi; i++) indices.add(i);
			}
		} else {
			const n = parseInt(p, 10);
			if (!isNaN(n)) indices.add(n);
		}
	}
	return indices.size > 0 ? Array.from(indices).sort((a, b) => a - b) : 'all';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WatermarkDialog({ documentId, open, onClose }: Props) {
	const [text, setText] = useState('CONFIDENTIAL');
	const [position, setPosition] = useState<WatermarkPosition>('diagonal');
	const [opacity, setOpacity] = useState(0.3);
	const [fontSize, setFontSize] = useState(36);
	const [color, setColor] = useState('#808080');
	const [customColor, setCustomColor] = useState('');
	const [allPages, setAllPages] = useState(true);
	const [pageRange, setPageRange] = useState('');
	const [result, setResult] = useState<{ taskId: string } | null>(null);

	const { mutateAsync: applyWatermark, isPending, error } = useApplyWatermark();

	const effectiveColor = customColor.match(/^#[0-9a-fA-F]{6}$/) ? customColor : color;

	const handleApply = async () => {
		const pages = allPages ? 'all' : parsePageRange(pageRange);
		const res = await applyWatermark({
			documentId,
			params: {
				text: text.trim() || 'WATERMARK',
				position,
				opacity,
				pages,
				font_size: fontSize,
				color: effectiveColor,
			},
		});
		setResult({ taskId: res.task_id });
	};

	const handleClose = () => {
		setResult(null);
		onClose();
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
			<div className="doc-modal relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
				<div className="p-6">

					{/* Header */}
					<div className="flex items-center gap-3 mb-5">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--doc-accent)]/10">
							<Stamp className="w-5 h-5 text-[var(--doc-accent)]" />
						</div>
						<div>
							<h3 className="font-display text-lg font-semibold text-[var(--doc-text)]">
								Apply Watermark
							</h3>
							<p className="text-sm text-[var(--doc-muted)]">
								Creates a new watermarked copy of this document
							</p>
						</div>
						<button
							onClick={handleClose}
							className="ml-auto text-[var(--doc-muted)] hover:text-[var(--doc-text)] transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Success state */}
					{result ? (
						<div className="space-y-4">
							<div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
								<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-green-800 dark:text-green-300">
										Watermark queued successfully
									</p>
									<p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
										The watermarked document will appear in the same folder once processing completes.
									</p>
								</div>
							</div>
							<div className="flex items-center justify-end gap-3 pt-1">
								<Button variant="ghost" onClick={handleClose}>
									Close
								</Button>
								<Button
									className="doc-btn-primary gap-2"
									onClick={handleClose}
								>
									<ExternalLink className="w-4 h-4" />
									View Documents
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-4">

							{/* Watermark text */}
							<div>
								<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
									Watermark text
								</label>
								<Input
									value={text}
									onChange={e => setText(e.target.value)}
									placeholder="CONFIDENTIAL"
									className="doc-input"
									maxLength={200}
								/>
								<p className="text-xs text-[var(--doc-muted)] mt-1">
									e.g. CONFIDENTIAL, DRAFT, COPY
								</p>
							</div>

							{/* Position */}
							<div>
								<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
									Position
								</label>
								<div className="grid grid-cols-2 gap-2">
									{POSITION_OPTIONS.map(opt => (
										<button
											key={opt.value}
											onClick={() => setPosition(opt.value)}
											className={[
												'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors',
												position === opt.value
													? 'border-[var(--doc-accent)] bg-[var(--doc-accent)]/5 text-[var(--doc-text)]'
													: 'border-[var(--doc-border)] bg-[var(--doc-surface)] text-[var(--doc-muted)] hover:border-[var(--doc-accent)]/50',
											].join(' ')}
										>
											<span className="text-sm font-medium">{opt.label}</span>
											<span className="text-xs opacity-70">{opt.desc}</span>
										</button>
									))}
								</div>
							</div>

							{/* Opacity */}
							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-sm font-medium text-[var(--doc-text)]">
										Opacity
									</label>
									<span className="text-sm text-[var(--doc-muted)] font-mono">
										{Math.round(opacity * 100)}%
									</span>
								</div>
								<input
									type="range"
									min={10}
									max={60}
									step={5}
									value={Math.round(opacity * 100)}
									onChange={e => setOpacity(parseInt(e.target.value, 10) / 100)}
									className="w-full accent-[var(--doc-accent)]"
								/>
								<div className="flex justify-between text-xs text-[var(--doc-muted)] mt-0.5">
									<span>10% (subtle)</span>
									<span>60% (strong)</span>
								</div>
							</div>

							{/* Font size */}
							<div>
								<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
									Font size
								</label>
								<div className="flex gap-2">
									{FONT_SIZES.map(size => (
										<button
											key={size}
											onClick={() => setFontSize(size)}
											className={[
												'flex-1 py-1.5 rounded-lg border text-sm font-mono transition-colors',
												fontSize === size
													? 'border-[var(--doc-accent)] bg-[var(--doc-accent)]/5 text-[var(--doc-text)] font-semibold'
													: 'border-[var(--doc-border)] bg-[var(--doc-surface)] text-[var(--doc-muted)] hover:border-[var(--doc-accent)]/50',
											].join(' ')}
										>
											{size}pt
										</button>
									))}
								</div>
							</div>

							{/* Color */}
							<div>
								<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
									Color
								</label>
								<div className="flex items-center gap-2 flex-wrap">
									{PRESET_COLORS.map(c => (
										<button
											key={c.value}
											onClick={() => { setColor(c.value); setCustomColor(''); }}
											title={c.label}
											className={[
												'w-7 h-7 rounded-full border-2 transition-transform',
												effectiveColor === c.value
													? 'border-[var(--doc-text)] scale-110'
													: 'border-transparent hover:scale-105',
											].join(' ')}
											style={{ backgroundColor: c.value }}
										/>
									))}
									<div className="flex items-center gap-1.5 ml-1">
										<span className="text-xs text-[var(--doc-muted)]">Custom:</span>
										<input
											type="text"
											value={customColor}
											onChange={e => setCustomColor(e.target.value)}
											placeholder="#RRGGBB"
											maxLength={7}
											className="w-20 text-xs font-mono px-2 py-1 rounded border border-[var(--doc-border)] bg-[var(--doc-surface)] text-[var(--doc-text)] focus:outline-none focus:border-[var(--doc-accent)]"
										/>
										{customColor.match(/^#[0-9a-fA-F]{6}$/) && (
											<span
												className="w-5 h-5 rounded border border-[var(--doc-border)] flex-shrink-0"
												style={{ backgroundColor: customColor }}
											/>
										)}
									</div>
								</div>
							</div>

							{/* Pages */}
							<div>
								<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
									Pages
								</label>
								<div className="flex items-center gap-4">
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											checked={allPages}
											onChange={() => setAllPages(true)}
											className="accent-[var(--doc-accent)]"
										/>
										<span className="text-sm text-[var(--doc-text)]">All pages</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											checked={!allPages}
											onChange={() => setAllPages(false)}
											className="accent-[var(--doc-accent)]"
										/>
										<span className="text-sm text-[var(--doc-text)]">Specific pages</span>
									</label>
								</div>
								{!allPages && (
									<div className="mt-2">
										<Input
											value={pageRange}
											onChange={e => setPageRange(e.target.value)}
											placeholder="e.g. 1-5, 8, 10-12"
											className="doc-input"
										/>
										<p className="text-xs text-[var(--doc-muted)] mt-1">
											Comma-separated page numbers or ranges (1-based)
										</p>
									</div>
								)}
							</div>

							{/* Preview swatch */}
							<div className="relative flex items-center justify-center h-16 rounded-lg border border-dashed border-[var(--doc-border)] bg-[var(--doc-surface)] overflow-hidden select-none">
								<span
									className="text-center font-bold tracking-widest pointer-events-none"
									style={{
										color: effectiveColor,
										fontSize: `${Math.min(fontSize * 0.4, 28)}px`,
										opacity,
										transform: position === 'diagonal' ? 'rotate(-20deg)' : 'none',
									}}
								>
									{text || 'WATERMARK'}
								</span>
								<span className="absolute bottom-1 right-2 text-xs text-[var(--doc-muted)] opacity-50">
									preview
								</span>
							</div>

							{/* Error */}
							{error && (
								<div className="doc-warning-box-sm">
									<span className="text-sm text-red-600 dark:text-red-400">
										{(error as any)?.response?.data?.detail ?? (error as Error).message}
									</span>
								</div>
							)}

							{/* Actions */}
							<div className="flex items-center justify-end gap-3 pt-1">
								<Button variant="ghost" onClick={handleClose} disabled={isPending}>
									Cancel
								</Button>
								<Button
									onClick={handleApply}
									disabled={isPending || !text.trim()}
									className="doc-btn-primary gap-2"
								>
									{isPending ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Applying…
										</>
									) : (
										<>
											<Stamp className="w-4 h-4" />
											Apply Watermark
										</>
									)}
								</Button>
							</div>

						</div>
					)}
				</div>
			</div>
		</div>
	);
}
