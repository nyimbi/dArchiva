// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	FileSearch,
	CheckCircle2,
	AlertTriangle,
	Pencil,
	Save,
	RotateCcw,
	ZoomIn,
	ZoomOut,
	ChevronLeft,
	ChevronRight,
	FileText,
	Settings,
	Plus,
	Signature,
	Check,
	Loader2,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
	useExtraction,
	useExtractionQueue,
	useFormTemplates,
	useConfirmExtraction,
	useReExtract,
	type FieldValue,
	type FormTemplate,
	type ExtractionQueueItem,
	type Signature as SignatureType,
} from '@/features/forms';

function FieldRow({
	field,
	onEdit,
}: {
	field: FieldValue;
	onEdit: () => void;
}) {
	const confidenceColor = field.confidence >= 0.9 ? 'text-emerald-400' :
		field.confidence >= 0.75 ? 'text-brass-400' : 'text-red-400';

	return (
		<div className={cn(
			'flex items-center gap-4 p-3 rounded-lg transition-colors',
			field.confidence < 0.75 && 'bg-red-500/5 border border-red-500/20',
			field.wasCorrected && 'bg-emerald-500/5 border border-emerald-500/20'
		)}>
			<div className="flex-1 min-w-0">
				<p className="text-xs text-slate-500">{field.label}</p>
				<p className="mt-0.5 text-sm font-medium text-slate-200 truncate">
					{field.value}
				</p>
			</div>
			<div className="flex items-center gap-3">
				<div className="text-right">
					<p className={cn('text-sm font-mono', confidenceColor)}>
						{(field.confidence * 100).toFixed(0)}%
					</p>
					<p className="text-2xs text-slate-600">confidence</p>
				</div>
				{field.wasCorrected ? (
					<span className="badge badge-green text-2xs">
						<Check className="w-3 h-3 mr-0.5" />
						Corrected
					</span>
				) : (
					<button
						onClick={onEdit}
						className="p-1.5 text-slate-500 hover:text-brass-400 hover:bg-slate-800 rounded transition-colors"
					>
						<Pencil className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
}

export function Forms() {
	const [activeTab, setActiveTab] = useState<'review' | 'templates' | 'queue'>('review');
	const [zoom, setZoom] = useState(100);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);

	const { data: queueData, isLoading: queueLoading } = useExtractionQueue();
	const { data: templatesData, isLoading: templatesLoading } = useFormTemplates();
	const { data: extraction, isLoading: extractionLoading } = useExtraction(selectedExtractionId || '');
	const confirmExtraction = useConfirmExtraction();
	const reExtract = useReExtract();

	const queue = queueData?.items || [];
	const templates = templatesData?.items || [];

	// Use the first needs_review item if no selection
	const currentExtraction = extraction || (queue.find(q => q.status === 'needs_review') ? undefined : undefined);
	const lowConfidenceCount = currentExtraction?.fieldValues.filter(f => f.confidence < 0.75).length || 0;

	const handleConfirm = () => {
		if (selectedExtractionId) {
			confirmExtraction.mutate(selectedExtractionId);
		}
	};

	const handleReExtract = () => {
		if (selectedExtractionId) {
			reExtract.mutate(selectedExtractionId);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Form Recognition
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						AI-powered form data extraction and verification
					</p>
				</div>
				<div className="flex gap-2">
					<button className="btn-secondary">
						<Settings className="w-4 h-4" />
						Configure
					</button>
					<button className="btn-primary">
						<FileSearch className="w-4 h-4" />
						Extract New
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
				{[
					{ id: 'review', label: 'Review Extraction' },
					{ id: 'templates', label: 'Templates' },
					{ id: 'queue', label: 'Processing Queue' },
				].map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id as typeof activeTab)}
						className={cn(
							'px-4 py-2 rounded-md text-sm font-medium transition-colors',
							activeTab === tab.id
								? 'bg-slate-700 text-slate-100'
								: 'text-slate-400 hover:text-slate-200'
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Content */}
			<AnimatePresence mode="wait">
				{activeTab === 'review' && (
					<motion.div
						key="review"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="grid grid-cols-1 lg:grid-cols-2 gap-6"
					>
						{/* Document viewer */}
						<div className="glass-card flex flex-col">
							<div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
								<div>
									{extractionLoading ? (
										<div className="h-4 w-48 bg-slate-700 rounded animate-pulse" />
									) : currentExtraction ? (
										<>
											<h3 className="font-medium text-slate-200">
												{currentExtraction.documentTitle}
											</h3>
											<p className="text-xs text-slate-500">
												Template: {currentExtraction.templateName}
											</p>
										</>
									) : (
										<p className="text-slate-500">Select an extraction to review</p>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setZoom(z => Math.max(50, z - 25))}
										className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
									>
										<ZoomOut className="w-4 h-4" />
									</button>
									<span className="text-sm text-slate-400 w-12 text-center">
										{zoom}%
									</span>
									<button
										onClick={() => setZoom(z => Math.min(200, z + 25))}
										className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
									>
										<ZoomIn className="w-4 h-4" />
									</button>
								</div>
							</div>

							{/* Document preview */}
							<div className="flex-1 bg-slate-800/30 p-4 overflow-auto min-h-[300px]">
								{currentExtraction ? (
									<div
										className="mx-auto bg-white rounded shadow-lg"
										style={{
											width: `${3.5 * (zoom / 100)}in`,
											height: `${4.5 * (zoom / 100)}in`,
										}}
									>
										{/* Placeholder document content */}
										<div className="p-4 text-slate-800 text-xs">
											<div className="text-center mb-4">
												<p className="font-bold text-sm">DOCUMENT PREVIEW</p>
												<p className="text-slate-500">Page {currentPage}</p>
											</div>
										</div>
									</div>
								) : (
									<div className="flex items-center justify-center h-full text-slate-500">
										<FileText className="w-12 h-12" />
									</div>
								)}
							</div>

							{/* Page navigation */}
							{currentExtraction && (
								<div className="p-3 border-t border-slate-700/50 flex items-center justify-center gap-4">
									<button
										onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
										disabled={currentPage === 1}
										className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<ChevronLeft className="w-5 h-5" />
									</button>
									<span className="text-sm text-slate-400">
										Page {currentPage} of {currentExtraction.pageCount}
									</span>
									<button
										onClick={() => setCurrentPage(p => Math.min(currentExtraction.pageCount, p + 1))}
										disabled={currentPage === currentExtraction.pageCount}
										className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<ChevronRight className="w-5 h-5" />
									</button>
								</div>
							)}
						</div>

						{/* Extraction results */}
						<div className="glass-card flex flex-col max-h-[calc(100vh-16rem)]">
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-medium text-slate-200">Extracted Data</h3>
										{currentExtraction && (
											<div className="mt-1 flex items-center gap-3 text-xs">
												<span className="flex items-center gap-1 text-slate-500">
													<CheckCircle2 className="w-3 h-3 text-emerald-400" />
													{currentExtraction.fieldValues.length - lowConfidenceCount} verified
												</span>
												{lowConfidenceCount > 0 && (
													<span className="flex items-center gap-1 text-red-400">
														<AlertTriangle className="w-3 h-3" />
														{lowConfidenceCount} needs review
													</span>
												)}
											</div>
										)}
									</div>
									{currentExtraction && (
										<div className="text-right">
											<p className="text-2xl font-display font-semibold text-brass-400">
												{(currentExtraction.confidence * 100).toFixed(0)}%
											</p>
											<p className="text-2xs text-slate-500">overall confidence</p>
										</div>
									)}
								</div>
							</div>

							{/* Fields */}
							<div className="flex-1 overflow-y-auto p-4 space-y-2">
								{extractionLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
									</div>
								) : currentExtraction ? (
									currentExtraction.fieldValues.map((field: FieldValue) => (
										<FieldRow
											key={field.fieldName}
											field={field}
											onEdit={() => {}}
										/>
									))
								) : (
									<p className="text-slate-500 text-center py-8">No extraction selected</p>
								)}
							</div>

							{/* Signatures */}
							{currentExtraction && currentExtraction.signatures.length > 0 && (
								<div className="p-4 border-t border-slate-700/50">
									<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
										<Signature className="w-4 h-4" />
										Signatures Detected
									</h4>
									<div className="space-y-2">
										{currentExtraction.signatures.map((sig: SignatureType) => (
											<div key={sig.id} className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg">
												<div className={cn(
													'w-8 h-8 rounded flex items-center justify-center',
													sig.verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'
												)}>
													<Signature className="w-4 h-4" />
												</div>
												<div className="flex-1">
													<p className="text-sm text-slate-200">{sig.signerName}</p>
													<p className="text-2xs text-slate-500">
														Page {sig.pageNumber} • {sig.signatureType}
													</p>
												</div>
												{sig.verified && (
													<span className="badge badge-green text-2xs">Verified</span>
												)}
											</div>
										))}
									</div>
								</div>
							)}

							{/* Actions */}
							{currentExtraction && (
								<div className="p-4 border-t border-slate-700/50 flex gap-2">
									<button
										onClick={handleReExtract}
										disabled={reExtract.isPending}
										className="flex-1 btn-secondary"
									>
										{reExtract.isPending ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<RotateCcw className="w-4 h-4" />
										)}
										Re-extract
									</button>
									<button
										onClick={handleConfirm}
										disabled={confirmExtraction.isPending}
										className="flex-1 btn-primary"
									>
										{confirmExtraction.isPending ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Save className="w-4 h-4" />
										)}
										Confirm & Save
									</button>
								</div>
							)}
						</div>
					</motion.div>
				)}

				{activeTab === 'templates' && (
					<motion.div
						key="templates"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						{/* Add new template card */}
						<button className="doc-card border-dashed border-2 border-slate-700 hover:border-brass-500/50 flex flex-col items-center justify-center gap-3 min-h-[160px]">
							<div className="p-3 rounded-full bg-slate-800">
								<Plus className="w-6 h-6 text-slate-400" />
							</div>
							<span className="text-slate-400">Create New Template</span>
						</button>

						{templatesLoading ? (
							<div className="col-span-full flex justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : templates.length === 0 ? (
							<div className="col-span-full text-center py-12 text-slate-500">
								No templates configured
							</div>
						) : (
							templates.map((template: FormTemplate) => (
								<div key={template.id} className="doc-card">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div className={cn(
												'p-2 rounded-lg',
												template.isActive ? 'bg-brass-500/10 text-brass-400' : 'bg-slate-700/50 text-slate-400'
											)}>
												<FileText className="w-5 h-5" />
											</div>
											<div>
												<h3 className="font-medium text-slate-200">{template.name}</h3>
												<p className="text-sm text-slate-500">{template.category}</p>
											</div>
										</div>
									</div>
									<div className="mt-4 flex items-center justify-between">
										<span className="text-sm text-slate-400">
											{template.fieldCount} fields
										</span>
										<span className={cn(
											'badge',
											template.isActive ? 'badge-green' : 'badge-gray'
										)}>
											{template.isActive ? 'Active' : 'Inactive'}
										</span>
									</div>
								</div>
							))
						)}
					</motion.div>
				)}

				{activeTab === 'queue' && (
					<motion.div
						key="queue"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="glass-card overflow-hidden"
					>
						{queueLoading ? (
							<div className="flex justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : queue.length === 0 ? (
							<div className="text-center py-12 text-slate-500">
								No items in processing queue
							</div>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th>Document</th>
										<th>Template</th>
										<th>Status</th>
										<th>Confidence</th>
										<th>Submitted</th>
										<th className="w-24">Actions</th>
									</tr>
								</thead>
								<tbody>
									{queue.map((item: ExtractionQueueItem) => (
										<tr key={item.id}>
											<td>
												<div className="flex items-center gap-2">
													<FileText className="w-4 h-4 text-slate-500" />
													<span className="text-slate-200">{item.documentTitle}</span>
												</div>
											</td>
											<td className="text-slate-400">{item.templateName}</td>
											<td>
												<span className={cn(
													'badge',
													item.status === 'completed' ? 'badge-green' :
													item.status === 'processing' ? 'badge-brass' :
													item.status === 'needs_review' ? 'badge-blue' :
													item.status === 'failed' ? 'badge-red' : 'badge-gray'
												)}>
													{item.status.replace('_', ' ')}
												</span>
											</td>
											<td>
												{item.status === 'processing' ? (
													<div className="flex items-center gap-2">
														<div className="w-4 h-4 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
													</div>
												) : item.confidence > 0 ? (
													<span className={cn(
														'font-mono',
														item.confidence >= 0.85 ? 'text-emerald-400' :
														item.confidence >= 0.70 ? 'text-brass-400' : 'text-red-400'
													)}>
														{(item.confidence * 100).toFixed(0)}%
													</span>
												) : (
													<span className="text-slate-500">—</span>
												)}
											</td>
											<td className="text-slate-400">
												{formatRelativeTime(item.createdAt)}
											</td>
											<td>
												<button
													onClick={() => setSelectedExtractionId(item.id)}
													className="btn-ghost text-xs"
												>
													Review
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
