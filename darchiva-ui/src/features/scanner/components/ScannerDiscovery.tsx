// (c) Copyright Datacraft, 2026
/**
 * Scanner discovery and registration.
 *
 * Discovery strategy (in priority order):
 *  1. Backend-managed discovery (mDNS/Bonjour via server) — fastest, most accurate.
 *  2. Client-side network range scan (192.168.x.1-254, batches of 20) — browser fallback.
 *  3. Manual IP/hostname entry — always available regardless of network restrictions.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Loader2,
  Network,
  Plus,
  Printer,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useDiscoverScanners, useRegisterScanner, useScanners } from '../api';
import { discoverNetworkScanners, probeSpecificHost } from '../lib/network-discovery';
import type { DiscoveredScanner, Scanner } from '../types';

interface ScannerDiscoveryProps {
  onScannerSelect?: (scanner: Scanner) => void;
}

// ── Skeleton placeholder ────────────────────────────────────────────────────

function ScannerCardSkeleton() {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
    </div>
  );
}

// ── Manual "Add Scanner" form ───────────────────────────────────────────────

interface ManualAddFormProps {
  onFound: (scanner: DiscoveredScanner) => void;
}

function ManualAddForm({ onFound }: ManualAddFormProps) {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('80');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host.trim()) return;
    setError(null);
    setChecking(true);
    try {
      const portNum = Math.max(1, Math.min(65535, parseInt(port, 10) || 80));
      const result = await probeSpecificHost(host.trim(), portNum, 5_000);
      if (result) {
        onFound(result);
        setHost('');
        setPort('80');
      } else {
        setError('No eSCL scanner found at that address. Verify the IP and port.');
      }
    } catch {
      setError('Connection failed. Check the address and try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.1.50"
          className="input-field flex-1 text-sm"
          disabled={checking}
          aria-label="Scanner IP address or hostname"
        />
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          placeholder="80"
          className="input-field w-20 text-sm"
          min="1"
          max="65535"
          disabled={checking}
          aria-label="Port"
        />
        <button
          type="submit"
          disabled={!host.trim() || checking}
          className="btn-primary px-3 py-2 text-sm whitespace-nowrap flex items-center gap-1.5"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          {checking ? 'Checking…' : 'Check'}
        </button>
      </div>
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ScannerDiscovery({ onScannerSelect }: ScannerDiscoveryProps) {
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredScanner | null>(null);
  const [customName, setCustomName] = useState('');
  const [localDiscovered, setLocalDiscovered] = useState<DiscoveredScanner[]>([]);
  const [isNetworkScanning, setIsNetworkScanning] = useState(false);
  const [networkProgress, setNetworkProgress] = useState(0);
  const [showManualForm, setShowManualForm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const { data: scanners, isLoading: scannersLoading, isError: scannersError } = useScanners();
  const discover = useDiscoverScanners(); // backend mDNS discovery
  const register = useRegisterScanner();

  // Merge backend-discovered and locally-discovered, deduplicating by root_url/host.
  const allDiscovered: DiscoveredScanner[] = (() => {
    const seen = new Set<string>();
    const merged: DiscoveredScanner[] = [];
    for (const s of [...(discover.data ?? []), ...localDiscovered]) {
      const key = s.root_url ?? `${s.host}:${s.port}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(s);
      }
    }
    return merged;
  })();

  // Backend discovery (resets local results so the list stays coherent)
  const handleBackendDiscover = () => {
    setLocalDiscovered([]);
    discover.mutate();
  };

  // Client-side network range scan
  const handleNetworkScan = useCallback(async () => {
    // Second click while running = cancel
    if (isNetworkScanning) {
      abortRef.current?.abort();
      return;
    }

    abortRef.current = new AbortController();
    setIsNetworkScanning(true);
    setNetworkProgress(0);
    setLocalDiscovered([]);

    try {
      // Rough estimate: 4 prefixes × 254 hosts, probed in batches of 20
      const TOTAL_ESTIMATED = 4 * 254;
      let probed = 0;

      await discoverNetworkScanners({
        signal: abortRef.current.signal,
        batchSize: 20,
        timeoutMs: 2_000,
        onBatchResult: (found) => {
          setLocalDiscovered((prev) => {
            const existing = new Set(prev.map((s) => s.host));
            return [...prev, ...found.filter((s) => !existing.has(s.host))];
          });
          probed += 20;
          setNetworkProgress(Math.min(99, Math.round((probed / TOTAL_ESTIMATED) * 100)));
        },
      });
    } finally {
      setIsNetworkScanning(false);
      setNetworkProgress(100);
    }
  }, [isNetworkScanning]);

  // Handle a scanner found via manual entry — pre-select for registration
  const handleManualFound = (scanner: DiscoveredScanner) => {
    setLocalDiscovered((prev) => {
      const existing = new Set(prev.map((s) => s.host));
      return existing.has(scanner.host) ? prev : [...prev, scanner];
    });
    setShowManualForm(false);
    setSelectedDiscovered(scanner);
  };

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

  const isDiscovering = discover.isPending || isNetworkScanning;

  return (
    <div className="space-y-6">
      {/* ── Registered Scanners ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-slate-100">Registered Scanners</h3>
          <button
            onClick={handleBackendDiscover}
            disabled={isDiscovering}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            {discover.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            Discover
          </button>
        </div>

        {scannersLoading ? (
          // Loading skeleton while the scanner list is being fetched
          <div className="grid gap-3">
            {[0, 1].map((i) => <ScannerCardSkeleton key={i} />)}
          </div>
        ) : scannersError ? (
          <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load registered scanners. Check your connection and try refreshing.
          </div>
        ) : scanners?.length ? (
          <div className="grid gap-3">
            {scanners.map((scanner) => (
              <motion.button
                key={scanner.id}
                onClick={() => onScannerSelect?.(scanner)}
                className="glass-card p-4 flex items-center gap-4 hover:border-brass-500/50 transition-colors text-left w-full"
                whileHover={{ scale: 1.01 }}
              >
                <div className={cn(
                  'p-3 rounded-xl flex-shrink-0',
                  scanner.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : scanner.status === 'error' || scanner.status === 'offline'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-brass-500/10 text-brass-400',
                )}>
                  <Printer className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200 truncate">{scanner.name}</p>
                  <p className="text-sm text-slate-500 truncate">
                    {scanner.manufacturer} {scanner.model}
                  </p>
                </div>
                <StatusBadge status={scanner.status} />
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scanners registered</p>
            <button
              onClick={handleBackendDiscover}
              className="mt-3 text-brass-400 hover:text-brass-300 text-sm"
            >
              Discover scanners
            </button>
          </div>
        )}
      </section>

      {/* ── Find Scanners ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-slate-100">Find Scanners</h3>
          <button
            onClick={() => setShowManualForm((v) => !v)}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Manually
          </button>
        </div>

        {/* Manual IP entry — always available, shown on demand */}
        <AnimatePresence>
          {showManualForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card p-4 space-y-2">
                <p className="text-xs text-slate-400">
                  Enter the scanner IP address and port (default 80):
                </p>
                <ManualAddForm onFound={handleManualFound} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Network range scan button — starts/cancels the sweep */}
        <button
          onClick={handleNetworkScan}
          disabled={discover.isPending}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm transition-all',
            isNetworkScanning
              ? 'border-amber-500/50 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10'
              : 'border-slate-700 text-slate-400 hover:border-brass-500/50 hover:text-brass-400',
          )}
        >
          {isNetworkScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>
                Scanning network…{networkProgress > 0 ? ` ${networkProgress}%` : ''}
              </span>
              <X className="w-4 h-4 ml-1 opacity-60 flex-shrink-0" />
            </>
          ) : (
            <>
              <Network className="w-4 h-4 flex-shrink-0" />
              Scan Local Network (192.168.x.1–254)
            </>
          )}
        </button>

        {/* Skeleton placeholders while the network sweep is running and nothing found yet */}
        <AnimatePresence>
          {isNetworkScanning && localDiscovered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-3"
            >
              {[0, 1, 2].map((i) => <ScannerCardSkeleton key={i} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Discovered Scanners (backend + local network) ──────────────── */}
      <AnimatePresence>
        {allDiscovered.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <h3 className="font-display font-semibold text-slate-100 mb-4">
              Discovered Scanners
              <span className="ml-2 text-xs font-normal text-slate-500">
                {allDiscovered.length} found
              </span>
            </h3>
            <div className="grid gap-3">
              {allDiscovered.map((discovered, idx) => {
                const isRegistered = scanners?.some(
                  (s) => s.connection_uri === discovered.root_url,
                );
                return (
                  <motion.div
                    key={`${discovered.host}-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => !isRegistered && setSelectedDiscovered(discovered)}
                    className={cn(
                      'glass-card p-4 flex items-center gap-4',
                      isRegistered
                        ? 'opacity-50 cursor-default'
                        : 'cursor-pointer hover:border-brass-500/50',
                    )}
                  >
                    <div className="p-3 rounded-xl bg-slate-700/50 text-slate-400 flex-shrink-0">
                      <Wifi className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200">{discovered.name}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {discovered.protocol.toUpperCase()} • {discovered.root_url}
                      </p>
                    </div>
                    {isRegistered
                      ? <span className="text-xs text-slate-500 flex-shrink-0">Already registered</span>
                      : <Plus className="w-5 h-5 text-brass-400 flex-shrink-0" />}
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Registration Dialog ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDiscovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setSelectedDiscovered(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
                Register Scanner
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Scanner Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={selectedDiscovered.name}
                    className="input-field w-full"
                  />
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400 space-y-1">
                  <p><strong className="text-slate-300">Protocol:</strong> {selectedDiscovered.protocol.toUpperCase()}</p>
                  <p><strong className="text-slate-300">Host:</strong> {selectedDiscovered.host}:{selectedDiscovered.port}</p>
                  <p className="truncate"><strong className="text-slate-300">URI:</strong> {selectedDiscovered.root_url}</p>
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={() => setSelectedDiscovered(null)} className="btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={handleRegister}
                  disabled={register.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {register.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Plus className="w-4 h-4" />}
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

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    online:     { color: 'badge-green', label: 'Online' },
    idle:       { color: 'badge-green', label: 'Ready' },
    warming_up: { color: 'badge-brass', label: 'Warming up' },
    scanning:   { color: 'badge-brass', label: 'Scanning' },
    busy:       { color: 'badge-brass', label: 'Busy' },
    error:      { color: 'badge-red',   label: 'Error' },
    offline:    { color: 'badge-gray',  label: 'Offline' },
  };
  const { color, label } = config[status] ?? { color: 'badge-gray', label: status };
  return <span className={cn('badge', color)}>{label}</span>;
}
