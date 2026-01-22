// (c) Copyright Datacraft, 2026
/**
 * Scanner discovery and registration.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Plus, Loader2, CheckCircle2, AlertCircle, Printer, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDiscoverScanners, useRegisterScanner, useScanners } from '../api';
import type { DiscoveredScanner, Scanner } from '../types';

interface ScannerDiscoveryProps {
	onScannerSelect?: (scanner: Scanner) => void;
}

export function ScannerDiscovery({ onScannerSelect }: ScannerDiscoveryProps) {
	const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredScanner | null>(null);
	const [customName, setCustomName] = useState('');

	const { data: scanners, isLoading: scannersLoading } = useScanners();
	const discover = useDiscoverScanners();
	const register = useRegisterScanner();

	const handleRegister = async () => {
		if (!selectedDiscovered) return;
		const registered = await register.mutateAsync({
			...selectedDiscovered,
			name: customName || selectedDiscovered.name,
		});
		setSelectedDiscovered(null);
		setCustomName('');
		onScannerSelect?.(registered);
	};

	return (
		<div className="space-y-6">
			{/* Registered Scanners */}
			<section>
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-display font-semibold text-slate-100">Registered Scanners</h3>
					<button onClick={() => discover.mutate()} disabled={discover.isPending} className="btn-ghost text-sm">
						{discover.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
						Discover
					</button>
				</div>

				{scannersLoading ? (
					<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
				) : scanners?.length ? (
					<div className="grid gap-3">
						{scanners.map((scanner) => (
							<motion.button
								key={scanner.id}
								onClick={() => onScannerSelect?.(scanner)}
								className="glass-card p-4 flex items-center gap-4 hover:border-brass-500/50 transition-colors text-left w-full"
								whileHover={{ scale: 1.01 }}
							>
								<div className={cn('p-3 rounded-xl', scanner.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : scanner.status === 'error' || scanner.status === 'offline' ? 'bg-red-500/10 text-red-400' : 'bg-brass-500/10 text-brass-400')}>
									<Printer className="w-6 h-6" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-slate-200 truncate">{scanner.name}</p>
									<p className="text-sm text-slate-500">{scanner.manufacturer} {scanner.model}</p>
								</div>
								<StatusBadge status={scanner.status} />
							</motion.button>
						))}
					</div>
				) : (
					<div className="text-center py-8 text-slate-500">
						<WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p>No scanners registered</p>
						<button onClick={() => discover.mutate()} className="mt-3 text-brass-400 hover:text-brass-300 text-sm">
							Discover scanners
						</button>
					</div>
				)}
			</section>

			{/* Discovered Scanners */}
			<AnimatePresence>
				{discover.data && discover.data.length > 0 && (
					<motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
						<h3 className="font-display font-semibold text-slate-100 mb-4">Discovered Scanners</h3>
						<div className="grid gap-3">
							{discover.data.map((discovered, idx) => {
								const isRegistered = scanners?.some((s) => s.connection_uri === discovered.root_url);
								return (
									<motion.div
										key={idx}
										onClick={() => !isRegistered && setSelectedDiscovered(discovered)}
										className={cn('glass-card p-4 flex items-center gap-4', isRegistered ? 'opacity-50' : 'cursor-pointer hover:border-brass-500/50')}
									>
										<div className="p-3 rounded-xl bg-slate-700/50 text-slate-400"><Wifi className="w-6 h-6" /></div>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-slate-200">{discovered.name}</p>
											<p className="text-sm text-slate-500">{discovered.protocol.toUpperCase()} • {discovered.root_url}</p>
										</div>
										{isRegistered ? <span className="text-xs text-slate-500">Already registered</span> : <Plus className="w-5 h-5 text-brass-400" />}
									</motion.div>
								);
							})}
						</div>
					</motion.section>
				)}
			</AnimatePresence>

			{/* Registration Dialog */}
			<AnimatePresence>
				{selectedDiscovered && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedDiscovered(null)}>
						<motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="glass-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
							<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">Register Scanner</h3>
							<div className="space-y-4">
								<div>
									<label className="text-sm text-slate-400 mb-1 block">Scanner Name</label>
									<input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={selectedDiscovered.name} className="input-field w-full" />
								</div>
								<div className="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400">
									<p><strong>Protocol:</strong> {selectedDiscovered.protocol.toUpperCase()}</p>
									<p><strong>URI:</strong> {selectedDiscovered.root_url}</p>
								</div>
							</div>
							<div className="mt-6 flex gap-2 justify-end">
								<button onClick={() => setSelectedDiscovered(null)} className="btn-ghost">Cancel</button>
								<button onClick={handleRegister} disabled={register.isPending} className="btn-primary">
									{register.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
									Register
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const config: Record<string, { color: string; label: string }> = {
		idle: { color: 'badge-green', label: 'Ready' },
		warming_up: { color: 'badge-brass', label: 'Warming up' },
		scanning: { color: 'badge-brass', label: 'Scanning' },
		busy: { color: 'badge-brass', label: 'Busy' },
		error: { color: 'badge-red', label: 'Error' },
		offline: { color: 'badge-gray', label: 'Offline' },
	};
	const { color, label } = config[status] || { color: 'badge-gray', label: status };
	return <span className={cn('badge', color)}>{label}</span>;
}
