// (c) Copyright Datacraft, 2026
/**
 * Dialog for generating and printing QR code labels.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	X,
	QrCode,
	Printer,
	Download,
	Copy,
	Check,
	ChevronDown,
	FileSpreadsheet,
	Grid,
	LayoutGrid,
} from 'lucide-react';
import { useGenerateQRCode, useGenerateLabelSheet } from '../api';
import type { QRCodeRequest, LabelSheetRequest } from '../types';

type SheetType = 'letter' | 'a4' | 'avery5160';
type LabelFormat = 'qr' | 'datamatrix';

interface QRPrintDialogProps {
	isOpen: boolean;
	onClose: () => void;
	documents: Array<{
		id: string;
		title: string;
		batchId?: string;
		locationCode?: string;
	}>;
}

const sheetTypes: Record<SheetType, { name: string; labelsPerPage: number; size: string }> = {
	letter: { name: 'Letter (8.5" × 11")', labelsPerPage: 30, size: '1" × 2.625"' },
	a4: { name: 'A4 (210 × 297mm)', labelsPerPage: 24, size: '63.5 × 33.9mm' },
	avery5160: { name: 'Avery 5160', labelsPerPage: 30, size: '1" × 2.625"' },
};

function PreviewGrid({
	documents,
	labelsPerPage,
}: {
	documents: QRPrintDialogProps['documents'];
	labelsPerPage: number;
}) {
	const rows = labelsPerPage === 30 ? 10 : 8;
	const cols = labelsPerPage === 30 ? 3 : 3;
	const totalSlots = rows * cols;

	return (
		<div
			className="bg-white border border-gray-300 rounded-lg p-4 aspect-[8.5/11]"
			style={{
				display: 'grid',
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				gridTemplateRows: `repeat(${rows}, 1fr)`,
				gap: '4px',
			}}
		>
			{Array.from({ length: totalSlots }, (_, i) => {
				const doc = documents[i];
				return (
					<div
						key={i}
						className={`border rounded flex items-center justify-center text-xs ${
							doc
								? 'border-blue-200 bg-blue-50'
								: 'border-dashed border-gray-200'
						}`}
					>
						{doc && (
							<div className="flex items-center gap-1 p-1 overflow-hidden">
								<QrCode className="w-3 h-3 text-blue-600 flex-shrink-0" />
								<span className="truncate text-gray-600">{doc.title.slice(0, 8)}</span>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

export function QRPrintDialog({ isOpen, onClose, documents }: QRPrintDialogProps) {
	const [sheetType, setSheetType] = useState<SheetType>('letter');
	const [labelFormat, setLabelFormat] = useState<LabelFormat>('qr');
	const [includeText, setIncludeText] = useState(true);
	const [includeLocation, setIncludeLocation] = useState(true);
	const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
		new Set(documents.map((d) => d.id))
	);
	const [copied, setCopied] = useState(false);

	const qrMutation = useGenerateQRCode();
	const sheetMutation = useGenerateLabelSheet();

	const selectedDocuments = documents.filter((d) => selectedDocs.has(d.id));
	const sheetInfo = sheetTypes[sheetType];
	const pagesNeeded = Math.ceil(selectedDocuments.length / sheetInfo.labelsPerPage);

	const toggleDoc = useCallback((id: string) => {
		setSelectedDocs((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const toggleAll = useCallback(() => {
		if (selectedDocs.size === documents.length) {
			setSelectedDocs(new Set());
		} else {
			setSelectedDocs(new Set(documents.map((d) => d.id)));
		}
	}, [documents, selectedDocs.size]);

	const handleGenerateSingle = useCallback(
		async (doc: QRPrintDialogProps['documents'][0]) => {
			const blob = await qrMutation.mutateAsync({
				documentId: doc.id,
				batchId: doc.batchId,
				locationCode: doc.locationCode,
				includeLabel: includeText,
				size: 300,
			});

			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `qr-${doc.id.slice(0, 8)}.png`;
			a.click();
			URL.revokeObjectURL(url);
		},
		[qrMutation, includeText]
	);

	const handleGenerateSheet = useCallback(async () => {
		const request: LabelSheetRequest = {
			documents: selectedDocuments.map((doc, i) => ({
				documentId: doc.id,
				batchId: doc.batchId,
				locationCode: includeLocation ? doc.locationCode : undefined,
				sequenceNumber: i + 1,
			})),
			sheetType,
			includeText,
		};

		const blob = await sheetMutation.mutateAsync(request);

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `labels-${sheetType}-${Date.now()}.pdf`;
		a.click();
		URL.revokeObjectURL(url);
	}, [selectedDocuments, sheetType, includeText, includeLocation, sheetMutation]);

	const handleCopyIds = useCallback(() => {
		const ids = selectedDocuments.map((d) => d.id).join('\n');
		navigator.clipboard.writeText(ids);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [selectedDocuments]);

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
				onClick={onClose}
			>
				<motion.div
					initial={{ opacity: 0, scale: 0.95, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 20 }}
					className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-100 rounded-lg">
								<QrCode className="w-5 h-5 text-blue-600" />
							</div>
							<div>
								<h2 className="text-lg font-semibold text-gray-900">
									Print QR Labels
								</h2>
								<p className="text-sm text-gray-500">
									{selectedDocuments.length} of {documents.length} documents selected
								</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Content */}
					<div className="flex divide-x divide-gray-200 max-h-[calc(90vh-140px)]">
						{/* Left: Document list */}
						<div className="w-1/2 overflow-y-auto p-4">
							<div className="flex items-center justify-between mb-3">
								<h3 className="font-medium text-gray-900">Documents</h3>
								<button
									onClick={toggleAll}
									className="text-sm text-blue-600 hover:text-blue-700"
								>
									{selectedDocs.size === documents.length ? 'Deselect All' : 'Select All'}
								</button>
							</div>

							<div className="space-y-2">
								{documents.map((doc) => (
									<label
										key={doc.id}
										className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
											selectedDocs.has(doc.id)
												? 'border-blue-200 bg-blue-50'
												: 'border-gray-200 hover:border-gray-300'
										}`}
									>
										<input
											type="checkbox"
											checked={selectedDocs.has(doc.id)}
											onChange={() => toggleDoc(doc.id)}
											className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
										/>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-gray-900 truncate">
												{doc.title}
											</p>
											<p className="text-xs text-gray-500 truncate">
												{doc.id.slice(0, 12)}...
												{doc.locationCode && ` • ${doc.locationCode}`}
											</p>
										</div>
										{selectedDocs.has(doc.id) && (
											<button
												onClick={(e) => {
													e.preventDefault();
													handleGenerateSingle(doc);
												}}
												className="p-1 text-gray-400 hover:text-blue-600"
												title="Download single QR"
											>
												<Download className="w-4 h-4" />
											</button>
										)}
									</label>
								))}
							</div>
						</div>

						{/* Right: Settings and preview */}
						<div className="w-1/2 overflow-y-auto p-4 bg-gray-50">
							{/* Settings */}
							<div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
								<h3 className="font-medium text-gray-900 mb-4">Label Settings</h3>

								<div className="space-y-4">
									{/* Sheet type */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Paper Size
										</label>
										<div className="relative">
											<select
												value={sheetType}
												onChange={(e) => setSheetType(e.target.value as SheetType)}
												className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
											>
												{Object.entries(sheetTypes).map(([key, info]) => (
													<option key={key} value={key}>
														{info.name} ({info.labelsPerPage} labels)
													</option>
												))}
											</select>
											<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
										</div>
									</div>

									{/* Label format */}
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Label Format
										</label>
										<div className="flex gap-2">
											<button
												onClick={() => setLabelFormat('qr')}
												className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
													labelFormat === 'qr'
														? 'border-blue-500 bg-blue-50 text-blue-700'
														: 'border-gray-300 hover:border-gray-400'
												}`}
											>
												<Grid className="w-4 h-4" />
												QR Code
											</button>
											<button
												onClick={() => setLabelFormat('datamatrix')}
												className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${
													labelFormat === 'datamatrix'
														? 'border-blue-500 bg-blue-50 text-blue-700'
														: 'border-gray-300 hover:border-gray-400'
												}`}
											>
												<LayoutGrid className="w-4 h-4" />
												Data Matrix
											</button>
										</div>
									</div>

									{/* Options */}
									<div className="space-y-3">
										<label className="flex items-center justify-between">
											<span className="text-sm text-gray-600">Include text label</span>
											<button
												onClick={() => setIncludeText(!includeText)}
												className={`relative w-10 h-6 rounded-full transition-colors ${
													includeText ? 'bg-blue-600' : 'bg-gray-300'
												}`}
											>
												<motion.div
													layout
													className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
													style={{ left: includeText ? 20 : 4 }}
												/>
											</button>
										</label>
										<label className="flex items-center justify-between">
											<span className="text-sm text-gray-600">Include location code</span>
											<button
												onClick={() => setIncludeLocation(!includeLocation)}
												className={`relative w-10 h-6 rounded-full transition-colors ${
													includeLocation ? 'bg-blue-600' : 'bg-gray-300'
												}`}
											>
												<motion.div
													layout
													className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
													style={{ left: includeLocation ? 20 : 4 }}
												/>
											</button>
										</label>
									</div>
								</div>
							</div>

							{/* Preview */}
							<div className="bg-white rounded-xl border border-gray-200 p-4">
								<div className="flex items-center justify-between mb-3">
									<h3 className="font-medium text-gray-900">Preview</h3>
									<span className="text-sm text-gray-500">
										{pagesNeeded} page{pagesNeeded !== 1 ? 's' : ''}
									</span>
								</div>
								<div className="w-48 mx-auto">
									<PreviewGrid
										documents={selectedDocuments}
										labelsPerPage={sheetInfo.labelsPerPage}
									/>
								</div>
								<p className="text-xs text-gray-400 text-center mt-2">
									Label size: {sheetInfo.size}
								</p>
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
						<div className="flex items-center gap-2">
							<button
								onClick={handleCopyIds}
								className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
							>
								{copied ? (
									<Check className="w-4 h-4 text-emerald-600" />
								) : (
									<Copy className="w-4 h-4" />
								)}
								{copied ? 'Copied!' : 'Copy IDs'}
							</button>
							<button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
								<FileSpreadsheet className="w-4 h-4" />
								Export CSV
							</button>
						</div>

						<div className="flex items-center gap-3">
							<button
								onClick={onClose}
								className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleGenerateSheet}
								disabled={selectedDocuments.length === 0 || sheetMutation.isPending}
								className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<Printer className="w-4 h-4" />
								{sheetMutation.isPending ? 'Generating...' : 'Generate PDF'}
							</button>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
