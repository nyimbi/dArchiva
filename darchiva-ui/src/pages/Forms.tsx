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
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Mock extraction data
const mockExtraction = {
	id: 'ext1',
	documentId: 'doc1',
	documentTitle: 'Insurance_Application_2024.pdf',
	templateName: 'Insurance Application Form',
	confidence: 0.87,
	status: 'needs_review',
	pageCount: 4,
	currentPage: 1,
	fieldValues: [
		{ fieldName: 'applicant_name', label: 'Applicant Name', value: 'John M. Smith', confidence: 0.95, wasCorrected: false },
		{ fieldName: 'date_of_birth', label: 'Date of Birth', value: '1985-03-15', confidence: 0.92, wasCorrected: false },
		{ fieldName: 'ssn', label: 'Social Security Number', value: '***-**-1234', confidence: 0.88, wasCorrected: false },
		{ fieldName: 'address', label: 'Address', value: '123 Main Street, Suite 400', confidence: 0.78, wasCorrected: false },
		{ fieldName: 'city', label: 'City', value: 'New York', confidence: 0.91, wasCorrected: false },
		{ fieldName: 'state', label: 'State', value: 'NY', confidence: 0.98, wasCorrected: false },
		{ fieldName: 'zip_code', label: 'ZIP Code', value: '10001', confidence: 0.65, wasCorrected: false },
		{ fieldName: 'policy_type', label: 'Policy Type', value: 'Comprehensive', confidence: 0.82, wasCorrected: false },
		{ fieldName: 'coverage_amount', label: 'Coverage Amount', value: '$500,000', confidence: 0.73, wasCorrected: false },
		{ fieldName: 'premium', label: 'Monthly Premium', value: '$247.50', confidence: 0.89, wasCorrected: false },
	],
	signatures: [
		{ id: 's1', pageNumber: 4, signerName: 'John M. Smith', verified: true, signatureType: 'handwritten' },
		{ id: 's2', pageNumber: 4, signerName: 'Agent: Mary Johnson', verified: true, signatureType: 'handwritten' },
	],
};

const mockTemplates = [
	{ id: 't1', name: 'Insurance Application Form', category: 'Insurance', fieldCount: 24, isActive: true },
	{ id: 't2', name: 'Invoice Template', category: 'Finance', fieldCount: 12, isActive: true },
	{ id: 't3', name: 'Contract Header', category: 'Legal', fieldCount: 8, isActive: true },
	{ id: 't4', name: 'Employee Onboarding', category: 'HR', fieldCount: 32, isActive: false },
];

const mockQueue = [
	{ id: 'q1', documentTitle: 'Application_Smith_2024.pdf', templateName: 'Insurance Application', status: 'completed', confidence: 0.87, createdAt: new Date(Date.now() - 1800000).toISOString() },
	{ id: 'q2', documentTitle: 'Invoice_March_001.pdf', templateName: 'Invoice Template', status: 'completed', confidence: 0.94, createdAt: new Date(Date.now() - 3600000).toISOString() },
	{ id: 'q3', documentTitle: 'Contract_Amendment.pdf', templateName: 'Contract Header', status: 'processing', confidence: 0, createdAt: new Date(Date.now() - 600000).toISOString() },
	{ id: 'q4', documentTitle: 'Application_Jones_2024.pdf', templateName: 'Insurance Application', status: 'needs_review', confidence: 0.72, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

function FieldRow({ field, onEdit }: { field: typeof mockExtraction.fieldValues[0]; onEdit: () => void }) {
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

	const lowConfidenceCount = mockExtraction.fieldValues.filter(f => f.confidence < 0.75).length;

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
									<h3 className="font-medium text-slate-200">
										{mockExtraction.documentTitle}
									</h3>
									<p className="text-xs text-slate-500">
										Template: {mockExtraction.templateName}
									</p>
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
							<div className="flex-1 bg-slate-800/30 p-4 overflow-auto">
								<div
									className="mx-auto bg-white rounded shadow-lg"
									style={{
										width: `${3.5 * (zoom / 100)}in`,
										height: `${4.5 * (zoom / 100)}in`,
									}}
								>
									{/* Mock document content */}
									<div className="p-4 text-slate-800 text-xs">
										<div className="text-center mb-4">
											<p className="font-bold text-sm">INSURANCE APPLICATION</p>
											<p className="text-slate-500">Form #INS-2024</p>
										</div>
										<div className="space-y-2">
											<div className="flex">
												<span className="w-32">Applicant Name:</span>
												<span className="font-medium field-highlight px-1 bg-brass-200/50 rounded">John M. Smith</span>
											</div>
											<div className="flex">
												<span className="w-32">Date of Birth:</span>
												<span className="font-medium">03/15/1985</span>
											</div>
											<div className="flex">
												<span className="w-32">Address:</span>
												<span className="font-medium bg-red-200/50 px-1 rounded">123 Main Street</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Page navigation */}
							<div className="p-3 border-t border-slate-700/50 flex items-center justify-center gap-4">
								<button
									onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<ChevronLeft className="w-5 h-5" />
								</button>
								<span className="text-sm text-slate-400">
									Page {currentPage} of {mockExtraction.pageCount}
								</span>
								<button
									onClick={() => setCurrentPage(p => Math.min(mockExtraction.pageCount, p + 1))}
									disabled={currentPage === mockExtraction.pageCount}
									className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<ChevronRight className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Extraction results */}
						<div className="glass-card flex flex-col max-h-[calc(100vh-16rem)]">
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-medium text-slate-200">Extracted Data</h3>
										<div className="mt-1 flex items-center gap-3 text-xs">
											<span className="flex items-center gap-1 text-slate-500">
												<CheckCircle2 className="w-3 h-3 text-emerald-400" />
												{mockExtraction.fieldValues.length - lowConfidenceCount} verified
											</span>
											{lowConfidenceCount > 0 && (
												<span className="flex items-center gap-1 text-red-400">
													<AlertTriangle className="w-3 h-3" />
													{lowConfidenceCount} needs review
												</span>
											)}
										</div>
									</div>
									<div className="text-right">
										<p className="text-2xl font-display font-semibold text-brass-400">
											{(mockExtraction.confidence * 100).toFixed(0)}%
										</p>
										<p className="text-2xs text-slate-500">overall confidence</p>
									</div>
								</div>
							</div>

							{/* Fields */}
							<div className="flex-1 overflow-y-auto p-4 space-y-2">
								{mockExtraction.fieldValues.map((field) => (
									<FieldRow
										key={field.fieldName}
										field={field}
										onEdit={() => {}}
									/>
								))}
							</div>

							{/* Signatures */}
							<div className="p-4 border-t border-slate-700/50">
								<h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
									<Signature className="w-4 h-4" />
									Signatures Detected
								</h4>
								<div className="space-y-2">
									{mockExtraction.signatures.map((sig) => (
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

							{/* Actions */}
							<div className="p-4 border-t border-slate-700/50 flex gap-2">
								<button className="flex-1 btn-secondary">
									<RotateCcw className="w-4 h-4" />
									Re-extract
								</button>
								<button className="flex-1 btn-primary">
									<Save className="w-4 h-4" />
									Confirm & Save
								</button>
							</div>
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

						{mockTemplates.map((template) => (
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
						))}
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
								{mockQueue.map((item) => (
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
												'badge-blue'
											)}>
												{item.status}
											</span>
										</td>
										<td>
											{item.status === 'processing' ? (
												<div className="flex items-center gap-2">
													<div className="w-4 h-4 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
												</div>
											) : (
												<span className={cn(
													'font-mono',
													item.confidence >= 0.85 ? 'text-emerald-400' :
													item.confidence >= 0.70 ? 'text-brass-400' : 'text-red-400'
												)}>
													{(item.confidence * 100).toFixed(0)}%
												</span>
											)}
										</td>
										<td className="text-slate-400">
											{formatRelativeTime(item.createdAt)}
										</td>
										<td>
											<button className="btn-ghost text-xs">
												Review
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
