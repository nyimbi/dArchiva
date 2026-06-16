// (c) Copyright Datacraft, 2026
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, CheckCircle, Crosshair, Loader2, RefreshCw, X } from 'lucide-react';
import { useRef, useState } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

const CALIBRATED_DPI_KEY = 'darchiva_calibrated_dpi';

export function loadCalibratedDpi(): number | null {
	try {
		const raw = localStorage.getItem(CALIBRATED_DPI_KEY);
		if (!raw) return null;
		const n = parseInt(raw, 10);
		return isNaN(n) ? null : n;
	} catch {
		return null;
	}
}

function saveCalibratedDpi(dpi: number): void {
	localStorage.setItem(CALIBRATED_DPI_KEY, String(dpi));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationResult {
	detected_dpi: number | null;
	width_px: number | null;
	height_px: number | null;
	known_width_mm: number | null;
	known_height_mm: number | null;
	confidence: 'high' | 'low' | null;
	error: string | null;
}

type WizardStep = 'prepare' | 'processing' | 'done';

interface CalibrationWizardProps {
	projectId: string;
	onClose: () => void;
	onCalibrated: (dpi: number) => void;
}

// ─── Step indicators ─────────────────────────────────────────────────────────

const STEPS: { id: WizardStep; label: string }[] = [
	{ id: 'prepare', label: 'Prepare' },
	{ id: 'processing', label: 'Calibrate' },
	{ id: 'done', label: 'Done' },
];

function StepIndicator({ current }: { current: WizardStep }) {
	const currentIdx = STEPS.findIndex(s => s.id === current);
	return (
		<div className="flex items-center gap-0 mb-6">
			{STEPS.map((step, i) => {
				const done = i < currentIdx;
				const active = i === currentIdx;
				return (
					<div key={step.id} className="flex items-center">
						<div className={cn(
							'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border-2 transition-colors',
							done
								? 'border-brass-500 bg-brass-500 text-slate-900'
								: active
									? 'border-brass-400 bg-brass-500/10 text-brass-400'
									: 'border-slate-700 bg-slate-800 text-slate-500'
						)}>
							{done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
						</div>
						<span className={cn(
							'ml-1.5 text-xs font-medium',
							active ? 'text-slate-200' : done ? 'text-brass-400' : 'text-slate-500'
						)}>
							{step.label}
						</span>
						{i < STEPS.length - 1 && (
							<div className={cn(
								'mx-3 h-px w-8',
								done ? 'bg-brass-500' : 'bg-slate-700'
							)} />
						)}
					</div>
				);
			})}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CalibrationWizard({ projectId, onClose, onCalibrated }: CalibrationWizardProps) {
	const [step, setStep] = useState<WizardStep>('prepare');
	const [knownWidthMm, setKnownWidthMm] = useState(210);
	const [knownHeightMm, setKnownHeightMm] = useState(297);
	const [result, setResult] = useState<CalibrationResult | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const runCalibration = async (file: File) => {
		setStep('processing');
		setUploadError(null);
		setResult(null);

		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('known_width_mm', String(knownWidthMm));
			fd.append('known_height_mm', String(knownHeightMm));

			const resp = await fetch(`/api/v1/scanning-projects/${projectId}/calibrate`, {
				method: 'POST',
				body: fd,
				credentials: 'include',
			});

			if (!resp.ok) {
				const detail = await resp.text().catch(() => resp.statusText);
				throw new Error(`Server error ${resp.status}: ${detail}`);
			}

			const data: CalibrationResult = await resp.json();
			setResult(data);
		} catch (err) {
			setUploadError(err instanceof Error ? err.message : 'Calibration request failed');
			setStep('prepare');
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		// Reset so re-selecting same file still fires
		e.target.value = '';
		void runCalibration(file);
	};

	const handleAccept = () => {
		if (!result?.detected_dpi) return;
		saveCalibratedDpi(result.detected_dpi);
		onCalibrated(result.detected_dpi);
		setStep('done');
	};

	const handleRetry = () => {
		setResult(null);
		setUploadError(null);
		setStep('prepare');
	};

	return (
		<Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
				<Dialog.Content
					className={cn(
						'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
						'bg-slate-900/95 backdrop-blur border border-slate-700/80 rounded-2xl shadow-2xl',
						'w-full max-w-lg p-7',
					)}
				>
					{/* Header */}
					<div className="flex items-start justify-between mb-5">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-brass-500/10 rounded-xl border border-brass-500/20">
								<Crosshair className="w-5 h-5 text-brass-400" />
							</div>
							<div>
								<Dialog.Title className="text-lg font-semibold text-slate-100">
									Scanner DPI Calibration
								</Dialog.Title>
								<Dialog.Description className="text-xs text-slate-400 mt-0.5">
									Measure real scanner resolution from a reference target
								</Dialog.Description>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>

					<StepIndicator current={step} />

					{/* ── Step 1: Prepare ── */}
					{step === 'prepare' && (
						<div className="space-y-5">
							<div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-slate-300 space-y-2 leading-relaxed">
								<p className="font-medium text-slate-200">Before capturing:</p>
								<ol className="list-decimal ml-4 space-y-1 text-slate-400">
									<li>Place a flat, clean sheet of known size (A4, Letter, or ISO test card) on the scanner platen or within the camera frame.</li>
									<li>Ensure the document fills as much of the frame as possible with no obstructions.</li>
									<li>Scan or photograph at your intended working resolution, then upload the result.</li>
								</ol>
							</div>

							{/* Physical dimensions */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-medium text-slate-400 mb-1.5">
										Known width (mm)
									</label>
									<input
										type="number"
										min={10}
										max={1200}
										value={knownWidthMm}
										onChange={e => setKnownWidthMm(Number(e.target.value))}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500/30"
									/>
								</div>
								<div>
									<label className="block text-xs font-medium text-slate-400 mb-1.5">
										Known height (mm)
									</label>
									<input
										type="number"
										min={10}
										max={1800}
										value={knownHeightMm}
										onChange={e => setKnownHeightMm(Number(e.target.value))}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brass-500 focus:ring-1 focus:ring-brass-500/30"
									/>
								</div>
							</div>

							{/* Quick presets */}
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs text-slate-500">Presets:</span>
								{[
									{ label: 'A4', w: 210, h: 297 },
									{ label: 'A3', w: 297, h: 420 },
									{ label: 'Letter', w: 216, h: 279 },
									{ label: 'Legal', w: 216, h: 356 },
								].map(p => (
									<button
										key={p.label}
										onClick={() => { setKnownWidthMm(p.w); setKnownHeightMm(p.h); }}
										className={cn(
											'px-2.5 py-1 rounded-lg border text-xs transition-colors',
											knownWidthMm === p.w && knownHeightMm === p.h
												? 'border-brass-500 bg-brass-500/10 text-brass-400'
												: 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
										)}
									>
										{p.label}
									</button>
								))}
							</div>

							{uploadError && (
								<div className="flex items-start gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
									<AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
									<span>{uploadError}</span>
								</div>
							)}

							{/* Hidden file input */}
							<input
								ref={fileRef}
								type="file"
								accept="image/jpeg,image/png,image/tiff"
								className="hidden"
								onChange={handleFileChange}
							/>

							<button
								onClick={() => fileRef.current?.click()}
								className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brass-500 text-slate-900 rounded-xl font-semibold text-sm hover:bg-brass-400 transition-colors"
							>
								<Crosshair className="w-4 h-4" />
								Capture &amp; Calibrate
							</button>
						</div>
					)}

					{/* ── Step 2: Processing / Results ── */}
					{step === 'processing' && (
						<div className="space-y-5">
							{!result ? (
								<div className="flex flex-col items-center justify-center py-10 gap-4">
									<Loader2 className="w-10 h-10 text-brass-400 animate-spin" />
									<p className="text-slate-400 text-sm">Analysing calibration image…</p>
								</div>
							) : result.error ? (
								<div className="space-y-4">
									<div className="flex items-start gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
										<AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
										<span>{result.error}</span>
									</div>
									<button
										onClick={handleRetry}
										className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
									>
										<RefreshCw className="w-4 h-4" />
										Retry
									</button>
								</div>
							) : (
								<div className="space-y-5">
									{/* Result card */}
									<div className="p-5 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-4">
										<div className="flex items-center justify-between">
											<span className="text-sm text-slate-400">Detected DPI</span>
											<span className="text-3xl font-bold text-brass-400 tabular-nums">
												{result.detected_dpi}
											</span>
										</div>
										<div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
											<div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
												<div className="text-slate-500">Measured size</div>
												<div className="text-slate-300 font-medium">
													{result.width_px} × {result.height_px} px
												</div>
											</div>
											<div className="bg-slate-900/50 rounded-lg p-2.5 space-y-1">
												<div className="text-slate-500">Reference size</div>
												<div className="text-slate-300 font-medium">
													{result.known_width_mm} × {result.known_height_mm} mm
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs text-slate-500">Confidence</span>
											<span className={cn(
												'px-2 py-0.5 rounded-full text-xs font-medium',
												result.confidence === 'high'
													? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
													: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
											)}>
												{result.confidence === 'high' ? 'High' : 'Low — consider retrying with better framing'}
											</span>
										</div>
									</div>

									<div className="flex gap-3">
										<button
											onClick={handleRetry}
											className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors"
										>
											<RefreshCw className="w-4 h-4" />
											Retry
										</button>
										<button
											onClick={handleAccept}
											className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brass-500 text-slate-900 rounded-xl font-semibold text-sm hover:bg-brass-400 transition-colors"
										>
											<CheckCircle className="w-4 h-4" />
											Accept {result.detected_dpi} DPI
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* ── Step 3: Done ── */}
					{step === 'done' && result?.detected_dpi && (
						<div className="flex flex-col items-center gap-5 py-4">
							<div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
								<CheckCircle className="w-8 h-8 text-emerald-400" />
							</div>
							<div className="text-center space-y-1">
								<p className="text-lg font-semibold text-slate-100">
									Calibration saved
								</p>
								<p className="text-sm text-slate-400">
									Scanner resolution set to{' '}
									<span className="text-brass-400 font-semibold">{result.detected_dpi} DPI</span>
								</p>
							</div>
							<button
								onClick={onClose}
								className="px-6 py-2.5 bg-brass-500 text-slate-900 rounded-xl font-semibold text-sm hover:bg-brass-400 transition-colors"
							>
								Close
							</button>
						</div>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
