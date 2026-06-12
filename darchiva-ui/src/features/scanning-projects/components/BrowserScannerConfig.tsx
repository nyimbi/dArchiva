// (c) Copyright Datacraft, 2026
/**
 * Browser Scanner Configuration Component
 *
 * Allows users to configure direct browser-to-scanner communication
 * for cases where the backend is remote but the scanner is local.
 */

import type { ESCLScannerInfo } from '@/lib/escl-scanner';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { useBrowserScanner } from '../hooks/useBrowserScanner';

export type ScanMode = 'backend' | 'browser';

export interface BrowserScannerConfigProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	scanMode: ScanMode;
	onScanModeChange: (mode: ScanMode) => void;
	onScannerSelect?: (scanner: ESCLScannerInfo | null) => void;
}

export function BrowserScannerConfig({
	open,
	onOpenChange,
	scanMode,
	onScanModeChange,
	onScannerSelect,
}: BrowserScannerConfigProps) {
	const [newHost, setNewHost] = useState('');
	const [showAddHost, setShowAddHost] = useState(false);

	const {
		scanners,
		activeScanner,
		capabilities,
		isDiscovering,
		error,
		discoverScanners,
		selectScanner,
		addKnownHost,
	} = useBrowserScanner({
		autoDiscover: false, // Manual discovery when dialog opens
	});

	// Discover scanners when dialog opens and browser mode is selected
	useEffect(() => {
		if (open && scanMode === 'browser') {
			discoverScanners();
		}
	}, [open, scanMode, discoverScanners]);

	// Notify parent of scanner selection
	useEffect(() => {
		onScannerSelect?.(activeScanner);
	}, [activeScanner, onScannerSelect]);

	const handleAddHost = () => {
		if (newHost.trim()) {
			addKnownHost(newHost.trim());
			setNewHost('');
			setShowAddHost(false);
			// Re-discover with new host
			setTimeout(() => discoverScanners(), 100);
		}
	};

	const handleSelectScanner = async (scanner: ESCLScannerInfo) => {
		await selectScanner(scanner);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-2">
						Scanner Configuration
					</Dialog.Title>
					<Dialog.Description className="text-sm text-slate-400 mb-6">
						Choose how to connect to your scanner
					</Dialog.Description>

					{/* Scan Mode Selection */}
					<div className="space-y-4 mb-6">
						<label className="block text-sm font-medium text-slate-300">
							Connection Mode
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => onScanModeChange('backend')}
								className={cn(
									'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
									scanMode === 'backend'
										? 'border-brass-500 bg-brass-500/10'
										: 'border-slate-700 hover:border-slate-600'
								)}
							>
								<Server className={cn(
									'w-8 h-8',
									scanMode === 'backend' ? 'text-brass-400' : 'text-slate-400'
								)} />
								<span className={cn(
									'text-sm font-medium',
									scanMode === 'backend' ? 'text-brass-400' : 'text-slate-300'
								)}>
									Backend Mode
								</span>
								<span className="text-xs text-slate-500 text-center">
									Server connects to scanner
								</span>
							</button>

							<button
								onClick={() => onScanModeChange('browser')}
								className={cn(
									'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
									scanMode === 'browser'
										? 'border-brass-500 bg-brass-500/10'
										: 'border-slate-700 hover:border-slate-600'
								)}
							>
								<Monitor className={cn(
									'w-8 h-8',
									scanMode === 'browser' ? 'text-brass-400' : 'text-slate-400'
								)} />
								<span className={cn(
									'text-sm font-medium',
									scanMode === 'browser' ? 'text-brass-400' : 'text-slate-300'
								)}>
									Browser Mode
								</span>
								<span className="text-xs text-slate-500 text-center">
									Direct scanner connection
								</span>
							</button>
						</div>
					</div>

					{/* Mode Description */}
					<div className={cn(
						'flex items-start gap-3 p-3 rounded-lg mb-6',
						scanMode === 'backend' ? 'bg-blue-500/10' : 'bg-purple-500/10'
					)}>
						<Info className={cn(
							'w-5 h-5 flex-shrink-0 mt-0.5',
							scanMode === 'backend' ? 'text-blue-400' : 'text-purple-400'
						)} />
						<div className="text-sm">
							{scanMode === 'backend' ? (
								<>
									<p className="text-blue-400 font-medium">Backend Mode</p>
									<p className="text-slate-400 mt-1">
										The server handles scanner communication. Use this when both your browser
										and backend can reach the scanner on the network.
									</p>
								</>
							) : (
								<>
									<p className="text-purple-400 font-medium">Browser Mode</p>
									<p className="text-slate-400 mt-1">
										Your browser connects directly to the scanner. Use this when the backend
										is remote (cloud) but the scanner is on your local network.
									</p>
								</>
							)}
						</div>
					</div>

					{/* Browser Mode: Scanner Discovery */}
					{scanMode === 'browser' && (
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-slate-300">
									Local Scanners
								</label>
								<div className="flex items-center gap-2">
									<button
										onClick={() => setShowAddHost(true)}
										className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
										title="Add scanner IP"
									>
										<Plus className="w-4 h-4" />
									</button>
									<button
										onClick={discoverScanners}
										disabled={isDiscovering}
										className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
										title="Refresh"
									>
										{isDiscovering ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<RefreshCw className="w-4 h-4" />
										)}
									</button>
								</div>
							</div>

							{/* Add Host Form */}
							{showAddHost && (
								<div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
									<input
										type="text"
										value={newHost}
										onChange={(e) => setNewHost(e.target.value)}
										placeholder="Scanner IP (e.g., 192.168.1.100)"
										className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brass-500"
										onKeyDown={(e) => e.key === 'Enter' && handleAddHost()}
									/>
									<button
										onClick={handleAddHost}
										className="px-3 py-1.5 bg-brass-500 text-slate-900 rounded text-sm font-medium hover:bg-brass-400 transition-colors"
									>
										Add
									</button>
									<button
										onClick={() => setShowAddHost(false)}
										className="p-1.5 text-slate-400 hover:text-slate-100"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							)}

							{/* Scanner List */}
							{isDiscovering ? (
								<div className="flex items-center justify-center gap-2 py-8 text-slate-400">
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Searching for scanners...</span>
								</div>
							) : scanners.length === 0 ? (
								<div className="text-center py-8">
									<WifiOff className="w-12 h-12 mx-auto text-slate-600 mb-3" />
									<p className="text-slate-400">No scanners found</p>
									<p className="text-sm text-slate-500 mt-1">
										Add a scanner IP address to connect
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{scanners.map((scanner) => (
										<button
											key={`${scanner.host}:${scanner.port}`}
											onClick={() => handleSelectScanner(scanner)}
											className={cn(
												'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
												activeScanner?.host === scanner.host && activeScanner?.port === scanner.port
													? 'border-brass-500 bg-brass-500/10'
													: 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
											)}
										>
											<div className={cn(
												'w-10 h-10 rounded-lg flex items-center justify-center',
												activeScanner?.host === scanner.host && activeScanner?.port === scanner.port
													? 'bg-brass-500/20'
													: 'bg-slate-700'
											)}>
												<Wifi className={cn(
													'w-5 h-5',
													activeScanner?.host === scanner.host && activeScanner?.port === scanner.port
														? 'text-brass-400'
														: 'text-slate-400'
												)} />
											</div>
											<div className="flex-1 min-w-0">
												<p className={cn(
													'font-medium truncate',
													activeScanner?.host === scanner.host && activeScanner?.port === scanner.port
														? 'text-brass-400'
														: 'text-slate-200'
												)}>
													{scanner.name || scanner.model || 'Unknown Scanner'}
												</p>
												<p className="text-xs text-slate-500 truncate">
													{scanner.host}:{scanner.port}
													{scanner.manufacturer && ` · ${scanner.manufacturer}`}
												</p>
											</div>
											{activeScanner?.host === scanner.host && activeScanner?.port === scanner.port && (
												<Check className="w-5 h-5 text-brass-400" />
											)}
										</button>
									))}
								</div>
							)}

							{/* Error Display */}
							{error && (
								<div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
									<AlertCircle className="w-4 h-4 flex-shrink-0" />
									<p className="text-sm">{error}</p>
								</div>
							)}

							{/* Selected Scanner Capabilities */}
							{activeScanner && capabilities && (
								<div className="p-3 bg-slate-800/50 rounded-lg space-y-2">
									<p className="text-sm font-medium text-slate-300">
										{capabilities.makeAndModel}
									</p>
									<div className="flex flex-wrap gap-2 text-xs">
										{capabilities.platen.supported && (
											<span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
												Flatbed
											</span>
										)}
										{capabilities.adf?.supported && (
											<span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
												ADF {capabilities.adf.duplex ? '(Duplex)' : ''}
											</span>
										)}
										<span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
											{Math.max(...capabilities.platen.resolutions)} DPI max
										</span>
									</div>
								</div>
							)}

							{/* CORS Notice */}
							<div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
								<p className="text-xs text-amber-400">
									<strong>Note:</strong> Browser-based scanning requires the scanner to support
									CORS or a local proxy. If scanning fails, you may need to use Backend Mode
									or run a local scanner proxy.
								</p>
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
						>
							Done
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

/**
 * Small indicator showing current scan mode
 */
export function ScanModeIndicator({
	mode,
	onClick,
}: {
	mode: ScanMode;
	onClick?: () => void;
}) {
	return (
		<button
			onClick={onClick}
			className={cn(
				'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
				mode === 'backend'
					? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
					: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
			)}
			title={`Click to change scan mode (currently: ${mode})`}
		>
			{mode === 'backend' ? (
				<>
					<Server className="w-3 h-3" />
					<span>Backend</span>
				</>
			) : (
				<>
					<Monitor className="w-3 h-3" />
					<span>Browser</span>
				</>
			)}
		</button>
	);
}
