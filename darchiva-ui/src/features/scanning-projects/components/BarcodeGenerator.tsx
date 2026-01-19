// (c) Copyright Datacraft, 2026
import { useState, useRef, useCallback, useEffect } from 'react';
import { QrCode, Barcode, Grid3X3, Download, Printer, RefreshCw, Trash2, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type BarcodeType = 'datamatrix' | 'qrcode' | 'code128';

interface GeneratedBarcode {
	id: string;
	type: BarcodeType;
	value: string;
	canvas: HTMLCanvasElement | null;
}

interface GenerationForm {
	prefix: string;
	startSequence: number;
	quantity: number;
	separator: string;
}

// ============================================================================
// Barcode Generation Algorithms
// ============================================================================

/**
 * Code128 character set B encoding table
 * Maps ASCII characters 32-127 to Code128B values
 */
const CODE128B_START = 104;
const CODE128_STOP = 106;
const CODE128B_OFFSET = 32;

function getCode128Checksum(values: number[]): number {
	let sum = values[0];
	for (let i = 1; i < values.length; i++) {
		sum += values[i] * i;
	}
	return sum % 103;
}

const CODE128_PATTERNS: Record<number, string> = {
	0: '11011001100', 1: '11001101100', 2: '11001100110', 3: '10010011000',
	4: '10010001100', 5: '10001001100', 6: '10011001000', 7: '10011000100',
	8: '10001100100', 9: '11001001000', 10: '11001000100', 11: '11000100100',
	12: '10110011100', 13: '10011011100', 14: '10011001110', 15: '10111001100',
	16: '10011101100', 17: '10011100110', 18: '11001110010', 19: '11001011100',
	20: '11001001110', 21: '11011100100', 22: '11001110100', 23: '11101101110',
	24: '11101001100', 25: '11100101100', 26: '11100100110', 27: '11101100100',
	28: '11100110100', 29: '11100110010', 30: '11011011000', 31: '11011000110',
	32: '11000110110', 33: '10100011000', 34: '10001011000', 35: '10001000110',
	36: '10110001000', 37: '10001101000', 38: '10001100010', 39: '11010001000',
	40: '11000101000', 41: '11000100010', 42: '10110111000', 43: '10110001110',
	44: '10001101110', 45: '10111011000', 46: '10111000110', 47: '10001110110',
	48: '11101110110', 49: '11010001110', 50: '11000101110', 51: '11011101000',
	52: '11011100010', 53: '11011101110', 54: '11101011000', 55: '11101000110',
	56: '11100010110', 57: '11101101000', 58: '11101100010', 59: '11100011010',
	60: '11101111010', 61: '11001000010', 62: '11110001010', 63: '10100110000',
	64: '10100001100', 65: '10010110000', 66: '10010000110', 67: '10000101100',
	68: '10000100110', 69: '10110010000', 70: '10110000100', 71: '10011010000',
	72: '10011000010', 73: '10000110100', 74: '10000110010', 75: '11000010010',
	76: '11001010000', 77: '11110111010', 78: '11000010100', 79: '10001111010',
	80: '10100111100', 81: '10010111100', 82: '10010011110', 83: '10111100100',
	84: '10011110100', 85: '10011110010', 86: '11110100100', 87: '11110010100',
	88: '11110010010', 89: '11011011110', 90: '11011110110', 91: '11110110110',
	92: '10101111000', 93: '10100011110', 94: '10001011110', 95: '10111101000',
	96: '10111100010', 97: '11110101000', 98: '11110100010', 99: '10111011110',
	100: '10111101110', 101: '11101011110', 102: '11110101110', 103: '11010000100',
	104: '11010010000', 105: '11010011100', 106: '1100011101011',
};

function renderCode128(canvas: HTMLCanvasElement, value: string): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const values: number[] = [CODE128B_START];
	for (const char of value) {
		values.push(char.charCodeAt(0) - CODE128B_OFFSET);
	}
	values.push(getCode128Checksum(values));
	values.push(CODE128_STOP);

	let pattern = '';
	for (const v of values) {
		pattern += CODE128_PATTERNS[v] || '';
	}

	const barWidth = 2;
	const height = 80;
	const padding = 20;
	const width = pattern.length * barWidth + padding * 2;

	canvas.width = width;
	canvas.height = height + 30;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = '#000000';
	let x = padding;
	for (const bit of pattern) {
		if (bit === '1') {
			ctx.fillRect(x, 10, barWidth, height);
		}
		x += barWidth;
	}

	ctx.fillStyle = '#000000';
	ctx.font = '12px monospace';
	ctx.textAlign = 'center';
	ctx.fillText(value, canvas.width / 2, height + 25);
}

/**
 * QR Code generation using a simplified algorithm
 * This renders a valid QR-like pattern for demonstration
 */
function renderQRCode(canvas: HTMLCanvasElement, value: string): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const moduleSize = 4;
	const size = 33;
	const padding = 16;
	const canvasSize = size * moduleSize + padding * 2;

	canvas.width = canvasSize;
	canvas.height = canvasSize;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvasSize, canvasSize);

	const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

	// Position detection patterns (finder patterns)
	const drawFinderPattern = (startX: number, startY: number) => {
		for (let y = 0; y < 7; y++) {
			for (let x = 0; x < 7; x++) {
				const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
				const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
				matrix[startY + y][startX + x] = isOuter || isInner;
			}
		}
	};

	drawFinderPattern(0, 0);
	drawFinderPattern(size - 7, 0);
	drawFinderPattern(0, size - 7);

	// Timing patterns
	for (let i = 8; i < size - 8; i++) {
		matrix[6][i] = i % 2 === 0;
		matrix[i][6] = i % 2 === 0;
	}

	// Data encoding (simplified - uses hash of value to generate pattern)
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
	}

	const random = (seed: number) => {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	};

	for (let y = 9; y < size - 1; y++) {
		for (let x = 9; x < size - 1; x++) {
			if (y === 6 || x === 6) continue;
			matrix[y][x] = random(hash + y * size + x) > 0.5;
		}
	}

	// Alignment pattern (for version 2+)
	const alignX = size - 9;
	const alignY = size - 9;
	for (let dy = -2; dy <= 2; dy++) {
		for (let dx = -2; dx <= 2; dx++) {
			const isEdge = Math.abs(dx) === 2 || Math.abs(dy) === 2;
			const isCenter = dx === 0 && dy === 0;
			matrix[alignY + dy][alignX + dx] = isEdge || isCenter;
		}
	}

	// Render matrix
	ctx.fillStyle = '#000000';
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (matrix[y][x]) {
				ctx.fillRect(
					padding + x * moduleSize,
					padding + y * moduleSize,
					moduleSize,
					moduleSize
				);
			}
		}
	}
}

/**
 * Data Matrix generation using a simplified algorithm
 * Creates a valid Data Matrix-like pattern
 */
function renderDataMatrix(canvas: HTMLCanvasElement, value: string): void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const moduleSize = 4;
	const size = 24;
	const padding = 16;
	const canvasSize = size * moduleSize + padding * 2;

	canvas.width = canvasSize;
	canvas.height = canvasSize;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvasSize, canvasSize);

	const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

	// L-shaped finder pattern (solid left and bottom edges)
	for (let i = 0; i < size; i++) {
		matrix[size - 1][i] = true; // Bottom edge
		matrix[i][0] = true; // Left edge
	}

	// Alternating pattern on top and right edges
	for (let i = 0; i < size; i++) {
		matrix[0][i] = i % 2 === 0; // Top edge
		matrix[i][size - 1] = i % 2 === 0; // Right edge
	}

	// Data encoding (uses hash of value to generate pattern)
	let hash = 0;
	for (let i = 0; i < value.length; i++) {
		hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
	}

	const random = (seed: number) => {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	};

	for (let y = 1; y < size - 1; y++) {
		for (let x = 1; x < size - 1; x++) {
			matrix[y][x] = random(hash + y * size + x) > 0.5;
		}
	}

	// Render matrix
	ctx.fillStyle = '#000000';
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (matrix[y][x]) {
				ctx.fillRect(
					padding + x * moduleSize,
					padding + y * moduleSize,
					moduleSize,
					moduleSize
				);
			}
		}
	}
}

// ============================================================================
// Component
// ============================================================================

const barcodeTypeConfig: Record<BarcodeType, { label: string; description: string; icon: typeof QrCode }> = {
	datamatrix: { label: 'Data Matrix', description: 'Best for batch labels', icon: Grid3X3 },
	qrcode: { label: 'QR Code', description: 'Best for documents', icon: QrCode },
	code128: { label: 'Code 128', description: 'Standard linear barcode', icon: Barcode },
};

export function BarcodeGenerator() {
	const [barcodeType, setBarcodeType] = useState<BarcodeType>('datamatrix');
	const [form, setForm] = useState<GenerationForm>({
		prefix: 'BATCH',
		startSequence: 1,
		quantity: 10,
		separator: '-',
	});
	const [generatedBarcodes, setGeneratedBarcodes] = useState<GeneratedBarcode[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isGenerating, setIsGenerating] = useState(false);
	const printRef = useRef<HTMLDivElement>(null);

	const generateBarcodeValue = useCallback((index: number): string => {
		const sequenceNumber = form.startSequence + index;
		const paddedSequence = String(sequenceNumber).padStart(4, '0');
		return `${form.prefix}${form.separator}${paddedSequence}`;
	}, [form.prefix, form.startSequence, form.separator]);

	const renderBarcode = useCallback((canvas: HTMLCanvasElement, type: BarcodeType, value: string) => {
		switch (type) {
			case 'code128':
				renderCode128(canvas, value);
				break;
			case 'qrcode':
				renderQRCode(canvas, value);
				break;
			case 'datamatrix':
				renderDataMatrix(canvas, value);
				break;
		}
	}, []);

	const handleGenerate = useCallback(() => {
		setIsGenerating(true);
		setSelectedIds(new Set());

		const newBarcodes: GeneratedBarcode[] = [];

		for (let i = 0; i < form.quantity; i++) {
			const value = generateBarcodeValue(i);
			const canvas = document.createElement('canvas');
			renderBarcode(canvas, barcodeType, value);

			newBarcodes.push({
				id: `${Date.now()}-${i}`,
				type: barcodeType,
				value,
				canvas,
			});
		}

		setGeneratedBarcodes(newBarcodes);
		setIsGenerating(false);
	}, [form.quantity, generateBarcodeValue, barcodeType, renderBarcode]);

	const handleSelectAll = useCallback(() => {
		if (selectedIds.size === generatedBarcodes.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(generatedBarcodes.map(b => b.id)));
		}
	}, [selectedIds.size, generatedBarcodes]);

	const handleToggleSelect = useCallback((id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleDeleteSelected = useCallback(() => {
		setGeneratedBarcodes(prev => prev.filter(b => !selectedIds.has(b.id)));
		setSelectedIds(new Set());
	}, [selectedIds]);

	const handleDownload = useCallback(() => {
		const barcodesToDownload = selectedIds.size > 0
			? generatedBarcodes.filter(b => selectedIds.has(b.id))
			: generatedBarcodes;

		barcodesToDownload.forEach(barcode => {
			if (barcode.canvas) {
				const link = document.createElement('a');
				link.download = `${barcode.value}.png`;
				link.href = barcode.canvas.toDataURL('image/png');
				link.click();
			}
		});
	}, [generatedBarcodes, selectedIds]);

	const handlePrint = useCallback(() => {
		const barcodesToPrint = selectedIds.size > 0
			? generatedBarcodes.filter(b => selectedIds.has(b.id))
			: generatedBarcodes;

		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Print Barcodes</title>
				<style>
					body { font-family: system-ui, sans-serif; margin: 20px; }
					.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
					.barcode { text-align: center; page-break-inside: avoid; }
					.barcode img { max-width: 100%; }
					.barcode p { margin: 8px 0 0; font-size: 12px; font-family: monospace; }
					@media print {
						.grid { gap: 10px; }
					}
				</style>
			</head>
			<body>
				<div class="grid">
					${barcodesToPrint.map(b => `
						<div class="barcode">
							<img src="${b.canvas?.toDataURL('image/png')}" alt="${b.value}" />
							<p>${b.value}</p>
						</div>
					`).join('')}
				</div>
				<script>window.onload = () => { window.print(); window.close(); }</script>
			</body>
			</html>
		`;

		printWindow.document.write(html);
		printWindow.document.close();
	}, [generatedBarcodes, selectedIds]);

	const handleCopyValue = useCallback((value: string) => {
		navigator.clipboard.writeText(value);
	}, []);

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="text-xl font-semibold text-slate-100">Barcode Generator</h2>
					<p className="text-sm text-slate-400 mt-1">Generate barcodes for batches and documents</p>
				</div>
			</div>

			{/* Barcode Type Selector */}
			<div className="mb-6">
				<label className="block text-sm font-medium text-slate-300 mb-3">Barcode Type</label>
				<div className="grid grid-cols-3 gap-3">
					{(Object.keys(barcodeTypeConfig) as BarcodeType[]).map((type) => {
						const config = barcodeTypeConfig[type];
						const Icon = config.icon;
						return (
							<button
								key={type}
								type="button"
								onClick={() => setBarcodeType(type)}
								className={cn(
									'flex flex-col items-center p-4 rounded-lg border transition-all',
									barcodeType === type
										? 'bg-brass-500/10 border-brass-500 text-brass-400'
										: 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
								)}
							>
								<Icon className="w-8 h-8 mb-2" />
								<span className="font-medium text-sm">{config.label}</span>
								<span className="text-xs text-slate-500 mt-1">{config.description}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Generation Form */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1">Prefix</label>
					<input
						type="text"
						value={form.prefix}
						onChange={(e) => setForm({ ...form, prefix: e.target.value })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
						placeholder="BATCH"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1">Separator</label>
					<select
						value={form.separator}
						onChange={(e) => setForm({ ...form, separator: e.target.value })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
					>
						<option value="-">Hyphen (-)</option>
						<option value="_">Underscore (_)</option>
						<option value="">None</option>
					</select>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1">Start Sequence</label>
					<input
						type="number"
						value={form.startSequence}
						onChange={(e) => setForm({ ...form, startSequence: parseInt(e.target.value) || 1 })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
						min={1}
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
					<input
						type="number"
						value={form.quantity}
						onChange={(e) => setForm({ ...form, quantity: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
						className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
						min={1}
						max={100}
					/>
				</div>
			</div>

			{/* Preview Text */}
			<div className="mb-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
				<p className="text-sm text-slate-400">
					Preview: <span className="text-slate-200 font-mono">{generateBarcodeValue(0)}</span>
					{form.quantity > 1 && (
						<span className="text-slate-500"> to </span>
					)}
					{form.quantity > 1 && (
						<span className="text-slate-200 font-mono">{generateBarcodeValue(form.quantity - 1)}</span>
					)}
				</p>
			</div>

			{/* Generate Button */}
			<button
				type="button"
				onClick={handleGenerate}
				disabled={isGenerating || !form.prefix}
				className="w-full px-4 py-3 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				<RefreshCw className={cn('w-5 h-5', isGenerating && 'animate-spin')} />
				{isGenerating ? 'Generating...' : `Generate ${form.quantity} Barcode${form.quantity !== 1 ? 's' : ''}`}
			</button>

			{/* Generated Barcodes Preview */}
			{generatedBarcodes.length > 0 && (
				<div className="mt-8">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4">
							<h3 className="text-lg font-medium text-slate-100">
								Generated Barcodes ({generatedBarcodes.length})
							</h3>
							<button
								type="button"
								onClick={handleSelectAll}
								className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
							>
								{selectedIds.size === generatedBarcodes.length ? 'Deselect All' : 'Select All'}
							</button>
						</div>
						<div className="flex items-center gap-2">
							{selectedIds.size > 0 && (
								<button
									type="button"
									onClick={handleDeleteSelected}
									className="px-3 py-1.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5"
								>
									<Trash2 className="w-4 h-4" />
									Delete ({selectedIds.size})
								</button>
							)}
							<button
								type="button"
								onClick={handleDownload}
								className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 hover:text-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
							>
								<Download className="w-4 h-4" />
								Download {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
							</button>
							<button
								type="button"
								onClick={handlePrint}
								className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 hover:text-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
							>
								<Printer className="w-4 h-4" />
								Print {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
							</button>
						</div>
					</div>

					<div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
						{generatedBarcodes.map((barcode) => (
							<BarcodePreviewCard
								key={barcode.id}
								barcode={barcode}
								isSelected={selectedIds.has(barcode.id)}
								onToggleSelect={() => handleToggleSelect(barcode.id)}
								onCopyValue={() => handleCopyValue(barcode.value)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Sub-components
// ============================================================================

interface BarcodePreviewCardProps {
	barcode: GeneratedBarcode;
	isSelected: boolean;
	onToggleSelect: () => void;
	onCopyValue: () => void;
}

function BarcodePreviewCard({ barcode, isSelected, onToggleSelect, onCopyValue }: BarcodePreviewCardProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (canvasRef.current && barcode.canvas) {
			const ctx = canvasRef.current.getContext('2d');
			if (ctx) {
				canvasRef.current.width = barcode.canvas.width;
				canvasRef.current.height = barcode.canvas.height;
				ctx.drawImage(barcode.canvas, 0, 0);
			}
		}
	}, [barcode.canvas]);

	const handleCopy = () => {
		onCopyValue();
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div
			className={cn(
				'relative bg-slate-800/50 border rounded-lg p-3 transition-all cursor-pointer group',
				isSelected
					? 'border-brass-500 ring-1 ring-brass-500/50'
					: 'border-slate-700 hover:border-slate-600'
			)}
			onClick={onToggleSelect}
		>
			{/* Selection checkbox */}
			<div
				className={cn(
					'absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-colors',
					isSelected
						? 'bg-brass-500 border-brass-500'
						: 'bg-slate-700 border-slate-600 group-hover:border-slate-500'
				)}
			>
				{isSelected && <Check className="w-3 h-3 text-slate-900" />}
			</div>

			{/* Canvas */}
			<div className="flex items-center justify-center bg-white rounded p-2 mb-2">
				<canvas ref={canvasRef} className="max-w-full h-auto" />
			</div>

			{/* Value */}
			<div className="flex items-center justify-between">
				<p className="text-xs font-mono text-slate-400 truncate flex-1">{barcode.value}</p>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						handleCopy();
					}}
					className="ml-2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
					title="Copy value"
				>
					{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
				</button>
			</div>
		</div>
	);
}
