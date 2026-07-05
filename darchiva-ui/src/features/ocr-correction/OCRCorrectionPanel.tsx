// (c) Copyright Datacraft, 2026
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
	AlertCircle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RefreshCw,
	Save,
	ScanText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePageOCRText, useReprocessPageOCR, useSaveOCRCorrection } from './api';

interface OCRCorrectionPanelProps {
	documentId: string;
	pageCount: number;
}

function confidenceBadge(confidence: number) {
	if (confidence >= 0.9) {
		return (
			<Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
				{Math.round(confidence * 100)}% confidence
			</Badge>
		);
	}
	if (confidence >= 0.7) {
		return (
			<Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
				{Math.round(confidence * 100)}% confidence
			</Badge>
		);
	}
	return (
		<Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
			{Math.round(confidence * 100)}% confidence
		</Badge>
	);
}

function wordSpanClass(confidence: number): string {
	if (confidence >= 0.9) return 'text-slate-200';
	if (confidence >= 0.7) return 'bg-yellow-500/25 text-yellow-100 rounded px-0.5';
	return 'bg-red-500/30 text-red-200 rounded px-0.5';
}

export function OCRCorrectionPanel({ documentId, pageCount }: OCRCorrectionPanelProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const [editedText, setEditedText] = useState('');
	const [savedFeedback, setSavedFeedback] = useState(false);

	const { data: ocrData, isLoading, isError } = usePageOCRText(documentId, currentPage);
	const saveMutation = useSaveOCRCorrection(documentId);
	const reprocessMutation = useReprocessPageOCR(documentId);

	// Sync textarea when page data arrives
	useEffect(() => {
		if (ocrData?.rawText !== undefined) {
			setEditedText(ocrData.rawText);
		}
	}, [ocrData?.rawText, currentPage]);

	const isDirty = editedText !== (ocrData?.rawText ?? '');

	const handleSave = () => {
		saveMutation.mutate(
			{ pageNumber: currentPage, correctedText: editedText },
			{
				onSuccess: () => {
					setSavedFeedback(true);
					setTimeout(() => setSavedFeedback(false), 2000);
				},
			},
		);
	};

	const handleReprocess = () => {
		reprocessMutation.mutate(currentPage);
	};

	const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
	const goToNext = () => setCurrentPage((p) => Math.min(pageCount, p + 1));

	return (
		<div className="flex flex-col h-full bg-slate-900">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
				<div className="flex items-center gap-2 text-slate-200">
					<ScanText className="w-4 h-4 text-brass-400" />
					<span className="text-sm font-medium">OCR Correction</span>
				</div>
				{ocrData && confidenceBadge(ocrData.confidence)}
			</div>

			{/* Page navigation */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 shrink-0">
				<button
					onClick={goToPrev}
					disabled={currentPage <= 1}
					className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Previous page"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-xs text-slate-400">
					Page <span className="text-slate-200 font-medium">{currentPage}</span> of{' '}
					<span className="text-slate-200 font-medium">{pageCount}</span>
				</span>
				<button
					onClick={goToNext}
					disabled={currentPage >= pageCount}
					className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
					title="Next page"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-y-auto">
				{isLoading && (
					<>
						<Skeleton className="h-4 w-3/4 bg-slate-800" />
						<Skeleton className="h-4 w-full bg-slate-800" />
						<Skeleton className="h-4 w-2/3 bg-slate-800" />
						<Skeleton className="h-4 w-5/6 bg-slate-800" />
					</>
				)}

				{isError && (
					<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
						<AlertCircle className="w-8 h-8 text-red-400" />
						<p className="text-sm text-slate-400">Failed to load OCR text</p>
					</div>
				)}

				{!isLoading && !isError && ocrData && (
					<>
						{/* Word-level confidence view */}
						{ocrData.words.length > 0 && (
							<div>
								<p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
									Word confidence
								</p>
								<div className="text-xs leading-6 text-slate-300 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 max-h-40 overflow-y-auto">
									{ocrData.words.map((word, i) => (
										<span key={i}>
											<span
												className={wordSpanClass(word.confidence)}
												title={`${Math.round(word.confidence * 100)}% confidence`}
											>
												{word.text}
											</span>
											{i < ocrData.words.length - 1 ? ' ' : ''}
										</span>
									))}
								</div>
								<div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
									<span className="flex items-center gap-1">
										<span className="inline-block w-2 h-2 rounded-sm bg-yellow-500/25" />
										70–90% confidence
									</span>
									<span className="flex items-center gap-1">
										<span className="inline-block w-2 h-2 rounded-sm bg-red-500/30" />
										Below 70%
									</span>
								</div>
							</div>
						)}

						{/* Editable correction textarea */}
						<div className="flex flex-col gap-2 flex-1">
							<p className="text-[10px] uppercase tracking-wider text-slate-500">
								Corrected text
							</p>
							<Textarea
								value={editedText}
								onChange={(e) => setEditedText(e.target.value)}
								rows={10}
								className="resize-none bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 text-xs leading-relaxed focus:border-brass-500/60 focus:ring-0"
								placeholder="OCR text will appear here…"
							/>
						</div>
					</>
				)}

				{!isLoading && !isError && !ocrData && (
					<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
						<ScanText className="w-8 h-8 text-slate-700" />
						<p className="text-sm text-slate-500">No OCR data for this page</p>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="border-t border-slate-800 p-3 flex flex-col gap-2 shrink-0">
				<Button
					onClick={handleSave}
					disabled={!isDirty || saveMutation.isPending || isLoading}
					size="sm"
					className="w-full bg-brass-500/20 text-brass-300 border border-brass-500/30 hover:bg-brass-500/30 hover:text-brass-200 disabled:opacity-40"
				>
					{saveMutation.isPending ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : savedFeedback ? (
						<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
					) : (
						<Save className="w-3.5 h-3.5" />
					)}
					{savedFeedback ? 'Saved' : 'Save Correction'}
				</Button>
				<Button
					onClick={handleReprocess}
					disabled={reprocessMutation.isPending || isLoading}
					variant="outline"
					size="sm"
					className="w-full border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-40"
				>
					{reprocessMutation.isPending ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<RefreshCw className="w-3.5 h-3.5" />
					)}
					Re-run OCR
				</Button>
				{reprocessMutation.isSuccess && (
					<p className="text-[10px] text-center text-green-400">
						OCR re-processing queued
					</p>
				)}
				{reprocessMutation.isError && (
					<p className="text-[10px] text-center text-red-400">
						Failed to queue re-processing
					</p>
				)}
			</div>
		</div>
	);
}
