// (c) Copyright Datacraft, 2026
/**
 * Physical inventory management interface.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	QrCode,
	FileSearch,
	ClipboardCheck,
	Upload,
	Download,
	Printer,
	AlertTriangle,
	CheckCircle,
	XCircle,
	Info,
	ChevronDown,
	ChevronRight,
	RefreshCw,
} from 'lucide-react';
import {
	useGenerateQRCode,
	useGenerateLabelSheet,
	useReconcileInventory,
	useResolveDiscrepancy,
} from '../api';
import type {
	Discrepancy,
	DiscrepancySeverity,
	ReconciliationResult,
	PhysicalRecordInput,
} from '../types';

const severityConfig: Record<
	DiscrepancySeverity,
	{ icon: React.ElementType; color: string; bg: string }
> = {
	info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
	warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
	error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
	critical: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-200' },
};

function DiscrepancyCard({
	discrepancy,
	onResolve,
}: {
	discrepancy: Discrepancy;
	onResolve: (id: string, notes: string) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [notes, setNotes] = useState('');
	const config = severityConfig[discrepancy.severity];
	const Icon = config.icon;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white border border-gray-200 rounded-lg overflow-hidden"
		>
			<div
				className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center gap-3">
					<div className={`p-2 rounded-lg ${config.bg}`}>
						<Icon className={`w-5 h-5 ${config.color}`} />
					</div>
					<div>
						<p className="font-medium text-gray-900">{discrepancy.type.replace(/_/g, ' ')}</p>
						<p className="text-sm text-gray-500">{discrepancy.description}</p>
					</div>
				</div>
				<button className="text-gray-400">
					{expanded ? (
						<ChevronDown className="w-5 h-5" />
					) : (
						<ChevronRight className="w-5 h-5" />
					)}
				</button>
			</div>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="border-t border-gray-200"
					>
						<div className="p-4 space-y-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								{discrepancy.physicalBarcode && (
									<div>
										<span className="text-gray-500">Physical Barcode:</span>{' '}
										<span className="font-mono">{discrepancy.physicalBarcode}</span>
									</div>
								)}
								{discrepancy.digitalId && (
									<div>
										<span className="text-gray-500">Digital ID:</span>{' '}
										<span className="font-mono">{discrepancy.digitalId.slice(0, 12)}...</span>
									</div>
								)}
							</div>

							<div className="bg-gray-50 rounded-lg p-3">
								<p className="text-sm text-gray-600">
									<strong>Suggested Action:</strong> {discrepancy.suggestedAction}
								</p>
							</div>

							<div className="space-y-2">
								<label className="block text-sm font-medium text-gray-700">
									Resolution Notes
								</label>
								<textarea
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									rows={2}
									placeholder="Describe how this was resolved..."
								/>
								<button
									onClick={() => onResolve(discrepancy.id, notes)}
									disabled={!notes.trim()}
									className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									Mark as Resolved
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

function ReconciliationSummary({
	result,
}: {
	result: ReconciliationResult;
}) {
	return (
		<div className="grid grid-cols-4 gap-4">
			<div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
				<p className="text-3xl font-bold text-gray-900">{result.matched}</p>
				<p className="text-sm text-gray-500 mt-1">Matched</p>
			</div>
			<div className="bg-white border border-red-200 rounded-lg p-4 text-center">
				<p className="text-3xl font-bold text-red-600">{result.missingDigitalCount}</p>
				<p className="text-sm text-gray-500 mt-1">Missing Digital</p>
			</div>
			<div className="bg-white border border-amber-200 rounded-lg p-4 text-center">
				<p className="text-3xl font-bold text-amber-600">{result.missingPhysicalCount}</p>
				<p className="text-sm text-gray-500 mt-1">Missing Physical</p>
			</div>
			<div className="bg-white border border-purple-200 rounded-lg p-4 text-center">
				<p className="text-3xl font-bold text-purple-600">{result.otherIssuesCount}</p>
				<p className="text-sm text-gray-500 mt-1">Other Issues</p>
			</div>
		</div>
	);
}

export function InventoryManager() {
	const [activeTab, setActiveTab] = useState<'qr' | 'duplicates' | 'reconcile'>('qr');
	const [reconcileResult, setReconcileResult] = useState<ReconciliationResult | null>(null);
	const [physicalRecords, setPhysicalRecords] = useState<PhysicalRecordInput[]>([]);

	const qrMutation = useGenerateQRCode();
	const labelSheetMutation = useGenerateLabelSheet();
	const reconcileMutation = useReconcileInventory();
	const resolveMutation = useResolveDiscrepancy();

	const handleGenerateQR = async (documentId: string) => {
		const blob = await qrMutation.mutateAsync({
			documentId,
			includeLabel: true,
		});
		// Download the QR code
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qr-${documentId.slice(0, 8)}.png`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleReconcile = async () => {
		const result = await reconcileMutation.mutateAsync({
			physicalRecords,
			matchBy: ['barcode'],
			pageCountTolerance: 0,
		});
		setReconcileResult(result);
	};

	const handleResolve = async (id: string, notes: string) => {
		await resolveMutation.mutateAsync({
			discrepancyId: id,
			resolutionNotes: notes,
		});
		// Remove from list
		if (reconcileResult) {
			setReconcileResult({
				...reconcileResult,
				discrepancies: reconcileResult.discrepancies.filter((d) => d.id !== id),
			});
		}
	};

	const tabs = [
		{ id: 'qr', label: 'QR Labels', icon: QrCode },
		{ id: 'duplicates', label: 'Duplicate Check', icon: FileSearch },
		{ id: 'reconcile', label: 'Reconciliation', icon: ClipboardCheck },
	] as const;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Physical Inventory</h1>
				<p className="text-gray-500 mt-1">
					Manage physical document tracking, labels, and reconciliation
				</p>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-2 border-b border-gray-200">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
							activeTab === tab.id
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'
						}`}
					>
						<tab.icon className="w-4 h-4" />
						{tab.label}
					</button>
				))}
			</div>

			{/* Content */}
			<AnimatePresence mode="wait">
				{activeTab === 'qr' && (
					<motion.div
						key="qr"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="space-y-6"
					>
						<div className="bg-white border border-gray-200 rounded-xl p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">
								Generate QR Labels
							</h2>
							<p className="text-gray-500 mb-6">
								Create QR codes or Data Matrix labels for physical documents.
								Labels can be printed on standard label sheets.
							</p>

							<div className="grid grid-cols-2 gap-4">
								<button className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
									<QrCode className="w-8 h-8 text-gray-400" />
									<div className="text-left">
										<p className="font-medium text-gray-900">Single QR Code</p>
										<p className="text-sm text-gray-500">Generate for one document</p>
									</div>
								</button>
								<button className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
									<Printer className="w-8 h-8 text-gray-400" />
									<div className="text-left">
										<p className="font-medium text-gray-900">Label Sheet</p>
										<p className="text-sm text-gray-500">Print multiple labels</p>
									</div>
								</button>
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === 'duplicates' && (
					<motion.div
						key="duplicates"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="space-y-6"
					>
						<div className="bg-white border border-gray-200 rounded-xl p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">
								Duplicate Detection
							</h2>
							<p className="text-gray-500 mb-6">
								Upload documents to check for duplicates using perceptual hashing.
								Identifies visually similar documents even if not byte-identical.
							</p>

							<div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
								<Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600 mb-2">
									Drag and drop files here, or click to select
								</p>
								<p className="text-sm text-gray-400">
									Supports PDF, PNG, JPG, TIFF
								</p>
								<button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
									Select Files
								</button>
							</div>
						</div>
					</motion.div>
				)}

				{activeTab === 'reconcile' && (
					<motion.div
						key="reconcile"
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="space-y-6"
					>
						{reconcileResult ? (
							<>
								{/* Summary */}
								<ReconciliationSummary result={reconcileResult} />

								{/* Discrepancies */}
								{reconcileResult.discrepancies.length > 0 && (
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<h2 className="text-lg font-semibold text-gray-900">
												Discrepancies ({reconcileResult.discrepancies.length})
											</h2>
											<button
												onClick={() => setReconcileResult(null)}
												className="text-sm text-blue-600 hover:text-blue-700"
											>
												New Reconciliation
											</button>
										</div>
										<div className="space-y-3">
											{reconcileResult.discrepancies.map((d) => (
												<DiscrepancyCard
													key={d.id}
													discrepancy={d}
													onResolve={handleResolve}
												/>
											))}
										</div>
									</div>
								)}

								{reconcileResult.discrepancies.length === 0 && (
									<div className="text-center py-12 bg-emerald-50 rounded-xl">
										<CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
										<h3 className="text-xl font-semibold text-emerald-700">
											All Records Match!
										</h3>
										<p className="text-emerald-600 mt-2">
											No discrepancies found between physical and digital records.
										</p>
									</div>
								)}
							</>
						) : (
							<div className="bg-white border border-gray-200 rounded-xl p-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4">
									Inventory Reconciliation
								</h2>
								<p className="text-gray-500 mb-6">
									Compare physical inventory records with digital documents to
									identify discrepancies and missing items.
								</p>

								<div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
									<Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
									<p className="text-gray-600 mb-2">
										Upload physical inventory CSV or Excel file
									</p>
									<p className="text-sm text-gray-400 mb-4">
										Required columns: barcode, location_code
									</p>
									<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
										Upload Inventory
									</button>
								</div>

								<div className="mt-6 flex justify-end">
									<button
										onClick={handleReconcile}
										disabled={physicalRecords.length === 0}
										className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
									>
										<RefreshCw className="w-4 h-4" />
										Run Reconciliation
									</button>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
