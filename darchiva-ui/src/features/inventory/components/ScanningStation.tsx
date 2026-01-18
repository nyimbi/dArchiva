// (c) Copyright Datacraft, 2026
/**
 * Scanning station workflow interface for processing physical documents.
 * Provides a streamlined scanning workflow with batch management.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Scan,
	ChevronRight,
	ChevronLeft,
	Check,
	AlertTriangle,
	Camera,
	RotateCcw,
	ZoomIn,
	ZoomOut,
	Trash2,
	Save,
	Package,
	FileImage,
	Settings,
	Clock,
	CheckCircle,
	Pause,
	Play,
} from 'lucide-react';

interface ScanSession {
	id: string;
	batchId: string;
	startedAt: Date;
	operator: string;
	scannedCount: number;
	pendingCount: number;
	errorCount: number;
	status: 'active' | 'paused' | 'completed';
}

interface ScannedDocument {
	id: string;
	sequence: number;
	thumbnailUrl: string;
	status: 'pending' | 'processed' | 'error';
	quality: number;
	barcode?: string;
	errorMessage?: string;
}

interface ScanSettings {
	resolution: 200 | 300 | 400 | 600;
	colorMode: 'color' | 'grayscale' | 'blackwhite';
	autoRotate: boolean;
	autoCrop: boolean;
	deskew: boolean;
	removeBlankPages: boolean;
	duplex: boolean;
}

const defaultSettings: ScanSettings = {
	resolution: 300,
	colorMode: 'color',
	autoRotate: true,
	autoCrop: true,
	deskew: true,
	removeBlankPages: true,
	duplex: false,
};

function SessionStats({ session }: { session: ScanSession }) {
	const elapsedMinutes = Math.floor(
		(Date.now() - session.startedAt.getTime()) / 60000
	);
	const pagesPerHour = session.scannedCount > 0
		? Math.round((session.scannedCount / elapsedMinutes) * 60)
		: 0;

	return (
		<div className="flex items-center gap-6 text-sm">
			<div className="flex items-center gap-2 text-gray-600">
				<Clock className="w-4 h-4" />
				<span>{elapsedMinutes} min</span>
			</div>
			<div className="flex items-center gap-2 text-emerald-600">
				<CheckCircle className="w-4 h-4" />
				<span>{session.scannedCount} scanned</span>
			</div>
			<div className="flex items-center gap-2 text-amber-600">
				<Package className="w-4 h-4" />
				<span>{session.pendingCount} pending</span>
			</div>
			{session.errorCount > 0 && (
				<div className="flex items-center gap-2 text-red-600">
					<AlertTriangle className="w-4 h-4" />
					<span>{session.errorCount} errors</span>
				</div>
			)}
			<div className="flex items-center gap-2 text-blue-600">
				<span>{pagesPerHour} pages/hour</span>
			</div>
		</div>
	);
}

function DocumentThumbnail({
	doc,
	isSelected,
	onClick,
}: {
	doc: ScannedDocument;
	isSelected: boolean;
	onClick: () => void;
}) {
	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			onClick={onClick}
			className={`relative rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
				isSelected
					? 'border-blue-500 shadow-lg shadow-blue-100'
					: 'border-gray-200 hover:border-gray-300'
			}`}
		>
			<div className="aspect-[3/4] bg-gray-100">
				{doc.thumbnailUrl ? (
					<img
						src={doc.thumbnailUrl}
						alt={`Page ${doc.sequence}`}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<FileImage className="w-8 h-8 text-gray-300" />
					</div>
				)}
			</div>

			{/* Quality indicator */}
			<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
				<div className="flex items-center justify-between">
					<span className="text-xs text-white font-medium">#{doc.sequence}</span>
					<div className="flex items-center gap-1">
						<div
							className={`w-2 h-2 rounded-full ${
								doc.quality >= 80
									? 'bg-emerald-400'
									: doc.quality >= 60
										? 'bg-amber-400'
										: 'bg-red-400'
							}`}
						/>
						<span className="text-xs text-white">{doc.quality}%</span>
					</div>
				</div>
			</div>

			{/* Status badge */}
			{doc.status === 'error' && (
				<div className="absolute top-2 right-2 p-1 bg-red-500 rounded-full">
					<AlertTriangle className="w-3 h-3 text-white" />
				</div>
			)}
			{doc.status === 'processed' && (
				<div className="absolute top-2 right-2 p-1 bg-emerald-500 rounded-full">
					<Check className="w-3 h-3 text-white" />
				</div>
			)}
		</motion.div>
	);
}

function ScanSettingsPanel({
	settings,
	onChange,
	onClose,
}: {
	settings: ScanSettings;
	onChange: (settings: ScanSettings) => void;
	onClose: () => void;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 20 }}
			className="absolute top-0 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-6 z-10"
		>
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-semibold text-gray-900">Scan Settings</h3>
				<button onClick={onClose} className="text-gray-400 hover:text-gray-600">
					×
				</button>
			</div>

			<div className="space-y-4">
				{/* Resolution */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Resolution (DPI)
					</label>
					<select
						value={settings.resolution}
						onChange={(e) =>
							onChange({ ...settings, resolution: Number(e.target.value) as ScanSettings['resolution'] })
						}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value={200}>200 DPI (Fast)</option>
						<option value={300}>300 DPI (Standard)</option>
						<option value={400}>400 DPI (High)</option>
						<option value={600}>600 DPI (Archival)</option>
					</select>
				</div>

				{/* Color mode */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Color Mode
					</label>
					<select
						value={settings.colorMode}
						onChange={(e) =>
							onChange({ ...settings, colorMode: e.target.value as ScanSettings['colorMode'] })
						}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="color">Full Color</option>
						<option value="grayscale">Grayscale</option>
						<option value="blackwhite">Black & White</option>
					</select>
				</div>

				{/* Toggles */}
				<div className="space-y-3">
					{[
						{ key: 'autoRotate' as const, label: 'Auto-rotate pages' },
						{ key: 'autoCrop' as const, label: 'Auto-crop to content' },
						{ key: 'deskew' as const, label: 'Deskew tilted scans' },
						{ key: 'removeBlankPages' as const, label: 'Remove blank pages' },
						{ key: 'duplex' as const, label: 'Duplex scanning' },
					].map(({ key, label }) => (
						<label key={key} className="flex items-center justify-between">
							<span className="text-sm text-gray-600">{label}</span>
							<button
								onClick={() => onChange({ ...settings, [key]: !settings[key] })}
								className={`relative w-10 h-6 rounded-full transition-colors ${
									settings[key] ? 'bg-blue-600' : 'bg-gray-300'
								}`}
							>
								<motion.div
									layout
									className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
									style={{ left: settings[key] ? 20 : 4 }}
								/>
							</button>
						</label>
					))}
				</div>
			</div>
		</motion.div>
	);
}

export function ScanningStation() {
	const [session, setSession] = useState<ScanSession | null>(null);
	const [documents, setDocuments] = useState<ScannedDocument[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [settings, setSettings] = useState<ScanSettings>(defaultSettings);
	const [showSettings, setShowSettings] = useState(false);
	const [batchId, setBatchId] = useState('');
	const [zoom, setZoom] = useState(100);

	const selectedDoc = documents.find((d) => d.id === selectedId);

	const startSession = useCallback(() => {
		if (!batchId.trim()) return;

		setSession({
			id: crypto.randomUUID(),
			batchId: batchId.trim(),
			startedAt: new Date(),
			operator: 'Current User',
			scannedCount: 0,
			pendingCount: 0,
			errorCount: 0,
			status: 'active',
		});
	}, [batchId]);

	const simulateScan = useCallback(() => {
		if (!session) return;

		const newDoc: ScannedDocument = {
			id: crypto.randomUUID(),
			sequence: documents.length + 1,
			thumbnailUrl: '',
			status: 'pending',
			quality: Math.floor(Math.random() * 30) + 70,
		};

		setDocuments((prev) => [...prev, newDoc]);
		setSession((prev) =>
			prev
				? {
						...prev,
						scannedCount: prev.scannedCount + 1,
						pendingCount: prev.pendingCount + 1,
					}
				: null
		);

		// Simulate processing
		setTimeout(() => {
			setDocuments((prev) =>
				prev.map((d) =>
					d.id === newDoc.id
						? { ...d, status: 'processed' as const }
						: d
				)
			);
			setSession((prev) =>
				prev
					? { ...prev, pendingCount: Math.max(0, prev.pendingCount - 1) }
					: null
			);
		}, 1500);
	}, [session, documents.length]);

	const handleDeleteSelected = useCallback(() => {
		if (!selectedId) return;
		setDocuments((prev) => prev.filter((d) => d.id !== selectedId));
		setSelectedId(null);
	}, [selectedId]);

	const handlePauseResume = useCallback(() => {
		setSession((prev) =>
			prev
				? {
						...prev,
						status: prev.status === 'active' ? 'paused' : 'active',
					}
				: null
		);
	}, []);

	const handleCompleteSession = useCallback(() => {
		setSession((prev) =>
			prev ? { ...prev, status: 'completed' } : null
		);
	}, []);

	// No session - show start screen
	if (!session) {
		return (
			<div className="h-full flex items-center justify-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center max-w-md"
				>
					<div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
						<Scan className="w-10 h-10 text-blue-600" />
					</div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						Start Scanning Session
					</h2>
					<p className="text-gray-500 mb-6">
						Enter a batch ID to begin scanning documents. All scanned documents
						will be associated with this batch.
					</p>

					<div className="space-y-4">
						<input
							type="text"
							value={batchId}
							onChange={(e) => setBatchId(e.target.value)}
							placeholder="Batch ID (e.g., BATCH-2026-001)"
							className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
						<button
							onClick={startSession}
							disabled={!batchId.trim()}
							className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Start Session
						</button>
					</div>
				</motion.div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-lg font-semibold text-gray-900">
							Scanning Station
						</h1>
						<span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
							{session.batchId}
						</span>
						{session.status === 'paused' && (
							<span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
								Paused
							</span>
						)}
						{session.status === 'completed' && (
							<span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
								Completed
							</span>
						)}
					</div>
					<SessionStats session={session} />
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowSettings(!showSettings)}
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<Settings className="w-5 h-5" />
					</button>
					<button
						onClick={handlePauseResume}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
							session.status === 'active'
								? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
								: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
						}`}
					>
						{session.status === 'active' ? (
							<>
								<Pause className="w-4 h-4" />
								Pause
							</>
						) : (
							<>
								<Play className="w-4 h-4" />
								Resume
							</>
						)}
					</button>
					<button
						onClick={handleCompleteSession}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<Save className="w-4 h-4" />
						Complete
					</button>
				</div>
			</div>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden relative">
				{/* Thumbnail strip */}
				<div className="w-48 bg-gray-50 border-r border-gray-200 overflow-y-auto p-3">
					<div className="grid gap-2">
						{documents.map((doc) => (
							<DocumentThumbnail
								key={doc.id}
								doc={doc}
								isSelected={doc.id === selectedId}
								onClick={() => setSelectedId(doc.id)}
							/>
						))}
						{documents.length === 0 && (
							<div className="text-center py-8 text-gray-400 text-sm">
								No scans yet
							</div>
						)}
					</div>
				</div>

				{/* Preview area */}
				<div className="flex-1 bg-gray-100 flex flex-col">
					{selectedDoc ? (
						<>
							{/* Toolbar */}
							<div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
								<div className="flex items-center gap-2">
									<button
										onClick={() => {
											const idx = documents.findIndex((d) => d.id === selectedId);
											if (idx > 0) setSelectedId(documents[idx - 1].id);
										}}
										disabled={documents.findIndex((d) => d.id === selectedId) === 0}
										className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
									>
										<ChevronLeft className="w-5 h-5" />
									</button>
									<span className="text-sm text-gray-600">
										{documents.findIndex((d) => d.id === selectedId) + 1} of{' '}
										{documents.length}
									</span>
									<button
										onClick={() => {
											const idx = documents.findIndex((d) => d.id === selectedId);
											if (idx < documents.length - 1) setSelectedId(documents[idx + 1].id);
										}}
										disabled={
											documents.findIndex((d) => d.id === selectedId) ===
											documents.length - 1
										}
										className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
									>
										<ChevronRight className="w-5 h-5" />
									</button>
								</div>

								<div className="flex items-center gap-2">
									<button
										onClick={() => setZoom((z) => Math.max(25, z - 25))}
										className="p-1 text-gray-500 hover:text-gray-700"
									>
										<ZoomOut className="w-5 h-5" />
									</button>
									<span className="text-sm text-gray-600 w-12 text-center">
										{zoom}%
									</span>
									<button
										onClick={() => setZoom((z) => Math.min(200, z + 25))}
										className="p-1 text-gray-500 hover:text-gray-700"
									>
										<ZoomIn className="w-5 h-5" />
									</button>
									<div className="w-px h-4 bg-gray-300 mx-2" />
									<button className="p-1 text-gray-500 hover:text-gray-700">
										<RotateCcw className="w-5 h-5" />
									</button>
									<button
										onClick={handleDeleteSelected}
										className="p-1 text-red-500 hover:text-red-700"
									>
										<Trash2 className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Preview */}
							<div className="flex-1 flex items-center justify-center p-8 overflow-auto">
								<div
									className="bg-white shadow-lg"
									style={{ transform: `scale(${zoom / 100})` }}
								>
									{selectedDoc.thumbnailUrl ? (
										<img
											src={selectedDoc.thumbnailUrl}
											alt={`Page ${selectedDoc.sequence}`}
											className="max-w-full"
										/>
									) : (
										<div className="w-[400px] h-[550px] flex items-center justify-center text-gray-300">
											<FileImage className="w-24 h-24" />
										</div>
									)}
								</div>
							</div>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-gray-400">
							<Camera className="w-16 h-16 mb-4 opacity-50" />
							<p className="mb-2">Select a scan to preview</p>
							<p className="text-sm">or press Scan to add a new page</p>
						</div>
					)}
				</div>

				{/* Settings panel */}
				<AnimatePresence>
					{showSettings && (
						<ScanSettingsPanel
							settings={settings}
							onChange={setSettings}
							onClose={() => setShowSettings(false)}
						/>
					)}
				</AnimatePresence>
			</div>

			{/* Footer with scan button */}
			<div className="flex items-center justify-center py-6 bg-white border-t border-gray-200">
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={simulateScan}
					disabled={session.status !== 'active'}
					className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					<Scan className="w-6 h-6" />
					<span className="text-lg">Scan Document</span>
				</motion.button>
			</div>
		</div>
	);
}
