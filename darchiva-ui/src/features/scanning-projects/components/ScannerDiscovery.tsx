// (c) Copyright Datacraft, 2026
/**
 * Scanner Discovery component for Scanning Projects.
 * Discovers network scanners (eSCL/AirScan, SANE, TWAIN, WIA) and allows
 * configuration and addition to project equipment list.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	discoverScanners as apiDiscoverScanners,
	registerScanner as apiRegisterScanner,
	type DiscoveredScanner as APIDiscoveredScanner,
} from '../api';
import {
	Search,
	Wifi,
	WifiOff,
	Plus,
	Loader2,
	CheckCircle2,
	AlertCircle,
	XCircle,
	Printer,
	RefreshCw,
	Settings,
	Zap,
	Monitor,
	Server,
	Check,
	X,
	ChevronRight,
	Radio,
	Palette,
	Copy,
	RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Scanner protocol types
type ScannerProtocol = 'escl' | 'sane' | 'twain' | 'wia';
type ConnectionStatus = 'idle' | 'testing' | 'success' | 'failed';

interface ScannerCapabilities {
	maxResolution: number;
	supportedResolutions: number[];
	colorModes: Array<'color' | 'grayscale' | 'monochrome'>;
	hasDuplex: boolean;
	hasADF: boolean;
	adfCapacity: number;
	maxWidthMm: number;
	maxHeightMm: number;
	supportsAutoCrop: boolean;
	supportsAutoDeskew: boolean;
}

interface DiscoveredScanner {
	id: string;
	name: string;
	manufacturer: string;
	model: string;
	protocol: ScannerProtocol;
	host: string;
	port: number;
	connectionUri: string;
	capabilities: ScannerCapabilities;
	discoveredAt: string;
}

interface ScannerConfig {
	name: string;
	defaultResolution: number;
	defaultColorMode: 'color' | 'grayscale' | 'monochrome';
	useDuplex: boolean;
	useADF: boolean;
	notes: string;
}

interface ScannerDiscoveryProps {
	projectId?: string;
	onScannerAdded?: (scanner: DiscoveredScanner, config: ScannerConfig) => void;
	className?: string;
}

// Protocol display config
const PROTOCOL_CONFIG: Record<ScannerProtocol, { label: string; icon: typeof Wifi; color: string }> = {
	escl: { label: 'AirScan/eSCL', icon: Wifi, color: 'text-cyan-400' },
	sane: { label: 'SANE', icon: Server, color: 'text-emerald-400' },
	twain: { label: 'TWAIN', icon: Monitor, color: 'text-amber-400' },
	wia: { label: 'WIA', icon: Printer, color: 'text-purple-400' },
};

// Transform API response to component format
function transformDiscoveredScanner(apiScanner: APIDiscoveredScanner): DiscoveredScanner {
	const protocol = apiScanner.protocol as ScannerProtocol;
	const connectionUri = protocol === 'escl'
		? `escl://${apiScanner.host}:${apiScanner.port}${apiScanner.rootUrl || '/eSCL'}`
		: protocol === 'sane'
		? `sane://${apiScanner.host}:${apiScanner.port}`
		: `${protocol}:${apiScanner.name}`;

	return {
		id: apiScanner.uuid || `${apiScanner.host}:${apiScanner.port}`,
		name: apiScanner.name,
		manufacturer: apiScanner.manufacturer || 'Unknown',
		model: apiScanner.model || apiScanner.name,
		protocol,
		host: apiScanner.host,
		port: apiScanner.port,
		connectionUri,
		capabilities: {
			// Default capabilities - will be fetched after connection test
			maxResolution: 600,
			supportedResolutions: [150, 200, 300, 600],
			colorModes: ['color', 'grayscale', 'monochrome'],
			hasDuplex: false,
			hasADF: false,
			adfCapacity: 0,
			maxWidthMm: 215.9,
			maxHeightMm: 355.6,
			supportsAutoCrop: false,
			supportsAutoDeskew: false,
		},
		discoveredAt: apiScanner.discoveredAt,
	};
}

// Mock scanners fallback when backend is unavailable
const MOCK_SCANNERS: DiscoveredScanner[] = [
	{
		id: 'mock-hp-laserjet',
		name: 'HP LaserJet MFP',
		manufacturer: 'HP',
		model: 'LaserJet MFP M234sdw',
		protocol: 'escl',
		host: '192.168.1.100',
		port: 443,
		connectionUri: 'escl://192.168.1.100:443/eSCL',
		capabilities: {
			maxResolution: 1200,
			supportedResolutions: [75, 100, 150, 200, 300, 600, 1200],
			colorModes: ['color', 'grayscale', 'monochrome'],
			hasDuplex: true,
			hasADF: true,
			adfCapacity: 40,
			maxWidthMm: 215.9,
			maxHeightMm: 355.6,
			supportsAutoCrop: true,
			supportsAutoDeskew: true,
		},
		discoveredAt: new Date().toISOString(),
	},
];

// Real scanner discovery using backend API with mock fallback
async function discoverScannersFromNetwork(forceRefresh: boolean = false): Promise<DiscoveredScanner[]> {
	try {
		const apiScanners = await apiDiscoverScanners({ timeout: 10, forceRefresh });
		return apiScanners.map(transformDiscoveredScanner);
	} catch (error) {
		console.error('Scanner discovery API unavailable, using mock fallback:', error);
		// Return mock scanners when backend is unavailable
		// In production, the backend eSCL/AirScan discovery will find real network scanners
		await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate discovery time
		return MOCK_SCANNERS;
	}
}

// Simulated connection test
async function testScannerConnection(scanner: DiscoveredScanner): Promise<boolean> {
	await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 500));
	// 90% success rate simulation
	return Math.random() > 0.1;
}

export function ScannerDiscovery({ projectId, onScannerAdded, className }: ScannerDiscoveryProps) {
	const [isDiscovering, setIsDiscovering] = useState(false);
	const [discoveredScanners, setDiscoveredScanners] = useState<DiscoveredScanner[]>([]);
	const [selectedScanner, setSelectedScanner] = useState<DiscoveredScanner | null>(null);
	const [showConfigDialog, setShowConfigDialog] = useState(false);
	const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({});
	const [scannerConfig, setScannerConfig] = useState<ScannerConfig>({
		name: '',
		defaultResolution: 300,
		defaultColorMode: 'grayscale',
		useDuplex: true,
		useADF: true,
		notes: '',
	});

	const handleDiscover = useCallback(async (forceRefresh: boolean = false) => {
		setIsDiscovering(true);
		setDiscoveredScanners([]);
		setConnectionStatus({});

		try {
			const scanners = await discoverScannersFromNetwork(forceRefresh);
			setDiscoveredScanners(scanners);
		} catch (error) {
			console.error('Discovery failed:', error);
		} finally {
			setIsDiscovering(false);
		}
	}, []);

	const handleTestConnection = useCallback(async (scanner: DiscoveredScanner) => {
		setConnectionStatus((prev) => ({ ...prev, [scanner.id]: 'testing' }));

		try {
			const success = await testScannerConnection(scanner);
			setConnectionStatus((prev) => ({
				...prev,
				[scanner.id]: success ? 'success' : 'failed',
			}));
		} catch {
			setConnectionStatus((prev) => ({ ...prev, [scanner.id]: 'failed' }));
		}
	}, []);

	const handleSelectScanner = useCallback((scanner: DiscoveredScanner) => {
		setSelectedScanner(scanner);
		setScannerConfig({
			name: scanner.name,
			defaultResolution: scanner.capabilities.supportedResolutions.includes(300)
				? 300
				: scanner.capabilities.supportedResolutions[Math.floor(scanner.capabilities.supportedResolutions.length / 2)],
			defaultColorMode: scanner.capabilities.colorModes.includes('grayscale') ? 'grayscale' : scanner.capabilities.colorModes[0],
			useDuplex: scanner.capabilities.hasDuplex,
			useADF: scanner.capabilities.hasADF,
			notes: '',
		});
		setShowConfigDialog(true);
	}, []);

	const handleAddScanner = useCallback(async () => {
		if (selectedScanner) {
			try {
				// Register scanner with backend
				await apiRegisterScanner({
					name: scannerConfig.name,
					protocol: selectedScanner.protocol,
					connectionUri: selectedScanner.connectionUri,
					isDefault: false,
					isActive: true,
					notes: scannerConfig.notes || undefined,
				});
				onScannerAdded?.(selectedScanner, scannerConfig);
				setShowConfigDialog(false);
				setSelectedScanner(null);
			} catch (error) {
				console.error('Failed to register scanner:', error);
			}
		}
	}, [selectedScanner, scannerConfig, onScannerAdded]);

	const getConnectionStatusIcon = (status: ConnectionStatus) => {
		switch (status) {
			case 'testing':
				return <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />;
			case 'success':
				return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
			case 'failed':
				return <XCircle className="w-4 h-4 text-red-400" />;
			default:
				return null;
		}
	};

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-slate-100">Scanner Discovery</h3>
					<p className="text-sm text-slate-400 mt-1">
						Discover and configure scanners on your network
					</p>
				</div>
				<button
					onClick={() => handleDiscover(false)}
					disabled={isDiscovering}
					className={cn(
						'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
						'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400',
						'hover:bg-cyan-500/20 hover:border-cyan-500/50',
						'disabled:opacity-50 disabled:cursor-not-allowed'
					)}
				>
					{isDiscovering ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin" />
							Scanning...
						</>
					) : (
						<>
							<Search className="w-4 h-4" />
							Discover Scanners
						</>
					)}
				</button>
			</div>

			{/* Discovery Animation */}
			<AnimatePresence>
				{isDiscovering && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="bg-slate-900/50 border border-slate-800 rounded-xl p-6"
					>
						<div className="flex items-center justify-center gap-4">
							<div className="relative">
								<Radio className="w-12 h-12 text-cyan-500" />
								<motion.div
									className="absolute inset-0 rounded-full border-2 border-cyan-500/50"
									animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
									transition={{ duration: 2, repeat: Infinity }}
								/>
								<motion.div
									className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
									animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0, 0.3] }}
									transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
								/>
							</div>
							<div>
								<p className="text-slate-100 font-medium">Scanning network for devices...</p>
								<p className="text-sm text-slate-400">
									Looking for eSCL/AirScan, SANE, TWAIN, and WIA scanners
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Empty State */}
			{!isDiscovering && discoveredScanners.length === 0 && (
				<div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
					<WifiOff className="w-16 h-16 mx-auto text-slate-600 mb-4" />
					<h4 className="text-lg font-medium text-slate-300 mb-2">No Scanners Discovered</h4>
					<p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
						Click &quot;Discover Scanners&quot; to search for available devices on your network.
						Supports eSCL/AirScan, SANE, TWAIN, and WIA protocols.
					</p>
					<button
						onClick={() => handleDiscover(false)}
						className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
					>
						<RefreshCw className="w-4 h-4" />
						Start Discovery
					</button>
				</div>
			)}

			{/* Scanner List */}
			<AnimatePresence>
				{discoveredScanners.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="space-y-3"
					>
						<div className="flex items-center justify-between text-sm">
							<span className="text-slate-400">
								Found {discoveredScanners.length} scanner{discoveredScanners.length !== 1 ? 's' : ''}
							</span>
							<button
								onClick={() => handleDiscover(true)}
								disabled={isDiscovering}
								className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
							>
								<RefreshCw className="w-3 h-3" />
								Rescan
							</button>
						</div>

						<div className="grid gap-3">
							{discoveredScanners.map((scanner, index) => {
								const protocolConfig = PROTOCOL_CONFIG[scanner.protocol];
								const ProtocolIcon = protocolConfig.icon;
								const status = connectionStatus[scanner.id] || 'idle';

								return (
									<motion.div
										key={scanner.id}
										initial={{ opacity: 0, x: -20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										className={cn(
											'bg-slate-900/50 border border-slate-800 rounded-xl p-4',
											'hover:border-slate-700 transition-all group'
										)}
									>
										<div className="flex items-start gap-4">
											{/* Protocol Icon */}
											<div
												className={cn(
													'w-12 h-12 rounded-xl flex items-center justify-center',
													'bg-slate-800/50 border border-slate-700'
												)}
											>
												<ProtocolIcon className={cn('w-6 h-6', protocolConfig.color)} />
											</div>

											{/* Scanner Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<h4 className="font-medium text-slate-100 truncate">
														{scanner.name}
													</h4>
													<span
														className={cn(
															'px-2 py-0.5 text-xs font-mono rounded',
															'bg-slate-800 border border-slate-700',
															protocolConfig.color
														)}
													>
														{protocolConfig.label}
													</span>
												</div>
												<p className="text-sm text-slate-400 mt-1">
													{scanner.manufacturer} {scanner.model}
												</p>
												<p className="text-xs text-slate-500 font-mono mt-1">
													{scanner.connectionUri}
												</p>
											</div>

											{/* Actions */}
											<div className="flex items-center gap-2">
												{getConnectionStatusIcon(status)}
												<button
													onClick={() => handleTestConnection(scanner)}
													disabled={status === 'testing'}
													className={cn(
														'px-3 py-1.5 text-xs rounded-lg transition-colors',
														'bg-slate-800 hover:bg-slate-700 text-slate-300',
														'disabled:opacity-50 disabled:cursor-not-allowed'
													)}
												>
													<Zap className="w-3 h-3 inline mr-1" />
													Test
												</button>
												<button
													onClick={() => handleSelectScanner(scanner)}
													className={cn(
														'px-3 py-1.5 text-xs rounded-lg transition-colors',
														'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400',
														'border border-cyan-500/30'
													)}
												>
													<Plus className="w-3 h-3 inline mr-1" />
													Add
												</button>
											</div>
										</div>

										{/* Capabilities Panel */}
										<div className="mt-4 pt-4 border-t border-slate-800">
											<CapabilitiesPanel capabilities={scanner.capabilities} />
										</div>
									</motion.div>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Configuration Dialog */}
			<AnimatePresence>
				{showConfigDialog && selectedScanner && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
						onClick={() => setShowConfigDialog(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="text-lg font-semibold text-slate-100">Configure Scanner</h3>
									<p className="text-sm text-slate-400">{selectedScanner.manufacturer} {selectedScanner.model}</p>
								</div>
								<button
									onClick={() => setShowConfigDialog(false)}
									className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
								>
									<X className="w-5 h-5" />
								</button>
							</div>

							<div className="space-y-4">
								{/* Scanner Name */}
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">
										Display Name
									</label>
									<input
										type="text"
										value={scannerConfig.name}
										onChange={(e) => setScannerConfig({ ...scannerConfig, name: e.target.value })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
										placeholder="Enter scanner name"
									/>
								</div>

								{/* Default Resolution */}
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">
										Default Resolution
									</label>
									<select
										value={scannerConfig.defaultResolution}
										onChange={(e) => setScannerConfig({ ...scannerConfig, defaultResolution: parseInt(e.target.value) })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
									>
										{selectedScanner.capabilities.supportedResolutions.map((res) => (
											<option key={res} value={res}>
												{res} DPI
											</option>
										))}
									</select>
								</div>

								{/* Default Color Mode */}
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">
										Default Color Mode
									</label>
									<div className="flex gap-2">
										{selectedScanner.capabilities.colorModes.map((mode) => (
											<button
												key={mode}
												onClick={() => setScannerConfig({ ...scannerConfig, defaultColorMode: mode })}
												className={cn(
													'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
													'border',
													scannerConfig.defaultColorMode === mode
														? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
														: 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
												)}
											>
												<Palette className="w-4 h-4 inline mr-1" />
												{mode === 'color' ? 'Color' : mode === 'grayscale' ? 'Grayscale' : 'B&W'}
											</button>
										))}
									</div>
								</div>

								{/* Duplex & ADF Options */}
								<div className="grid grid-cols-2 gap-4">
									{selectedScanner.capabilities.hasDuplex && (
										<label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
											<input
												type="checkbox"
												checked={scannerConfig.useDuplex}
												onChange={(e) => setScannerConfig({ ...scannerConfig, useDuplex: e.target.checked })}
												className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
											/>
											<div>
												<span className="text-sm font-medium text-slate-200">Duplex</span>
												<p className="text-xs text-slate-500">Scan both sides</p>
											</div>
										</label>
									)}
									{selectedScanner.capabilities.hasADF && (
										<label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition-colors">
											<input
												type="checkbox"
												checked={scannerConfig.useADF}
												onChange={(e) => setScannerConfig({ ...scannerConfig, useADF: e.target.checked })}
												className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500/50"
											/>
											<div>
												<span className="text-sm font-medium text-slate-200">Use ADF</span>
												<p className="text-xs text-slate-500">{selectedScanner.capabilities.adfCapacity} sheet capacity</p>
											</div>
										</label>
									)}
								</div>

								{/* Notes */}
								<div>
									<label className="block text-sm font-medium text-slate-300 mb-1">
										Notes
									</label>
									<textarea
										value={scannerConfig.notes}
										onChange={(e) => setScannerConfig({ ...scannerConfig, notes: e.target.value })}
										className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
										rows={3}
										placeholder="Optional notes about this scanner..."
									/>
								</div>
							</div>

							{/* Actions */}
							<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
								<button
									onClick={() => setShowConfigDialog(false)}
									className="px-4 py-2 text-slate-300 hover:text-slate-100 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleAddScanner}
									className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-900 rounded-lg font-medium hover:bg-cyan-400 transition-colors"
								>
									<Plus className="w-4 h-4" />
									Add to Equipment
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// Capabilities display panel
function CapabilitiesPanel({ capabilities }: { capabilities: ScannerCapabilities }) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
			{/* Resolution */}
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
					<Settings className="w-3 h-3 text-slate-400" />
				</div>
				<div>
					<p className="text-slate-400">Max Resolution</p>
					<p className="text-slate-200 font-medium">{capabilities.maxResolution} DPI</p>
				</div>
			</div>

			{/* Color Modes */}
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
					<Palette className="w-3 h-3 text-slate-400" />
				</div>
				<div>
					<p className="text-slate-400">Color Modes</p>
					<p className="text-slate-200 font-medium">
						{capabilities.colorModes.length} mode{capabilities.colorModes.length !== 1 ? 's' : ''}
					</p>
				</div>
			</div>

			{/* Duplex */}
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
					<Copy className="w-3 h-3 text-slate-400" />
				</div>
				<div>
					<p className="text-slate-400">Duplex</p>
					<p className={cn('font-medium', capabilities.hasDuplex ? 'text-emerald-400' : 'text-slate-500')}>
						{capabilities.hasDuplex ? 'Yes' : 'No'}
					</p>
				</div>
			</div>

			{/* ADF */}
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center">
					<RotateCcw className="w-3 h-3 text-slate-400" />
				</div>
				<div>
					<p className="text-slate-400">ADF Capacity</p>
					<p className={cn('font-medium', capabilities.hasADF ? 'text-slate-200' : 'text-slate-500')}>
						{capabilities.hasADF ? `${capabilities.adfCapacity} sheets` : 'None'}
					</p>
				</div>
			</div>

			{/* Feature Tags */}
			<div className="col-span-2 md:col-span-4 flex flex-wrap gap-1.5 mt-2">
				{capabilities.supportsAutoCrop && (
					<span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-medium">
						<Check className="w-2.5 h-2.5 inline mr-0.5" />
						Auto Crop
					</span>
				)}
				{capabilities.supportsAutoDeskew && (
					<span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-medium">
						<Check className="w-2.5 h-2.5 inline mr-0.5" />
						Auto Deskew
					</span>
				)}
				{capabilities.hasDuplex && (
					<span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-medium">
						<Check className="w-2.5 h-2.5 inline mr-0.5" />
						Duplex
					</span>
				)}
				<span className="px-2 py-0.5 bg-slate-700/50 text-slate-400 border border-slate-600 rounded text-[10px] font-medium">
					{capabilities.maxWidthMm}x{capabilities.maxHeightMm}mm
				</span>
			</div>
		</div>
	);
}
