// (c) Copyright Datacraft, 2026
/**
 * React hook for browser-based eSCL scanning
 *
 * This hook provides direct browser-to-scanner communication for cases where
 * the backend is remote but the scanner is local to the user.
 */

import { apiClient } from '@/lib/api-client';
import {
  ESCLCapabilities,
  ESCLScanOptions,
  ESCLScanner,
  ESCLScannerInfo,
  discoverLocalScanners,
  internalColorModeToEscl,
  internalFormatToMime
} from '@/lib/escl-scanner';
import { useMutation } from '@tanstack/react-query';
import { useCallback,useEffect,useRef,useState } from 'react';

export interface BrowserScannerConfig {
	/** Known scanner hosts to probe */
	knownHosts?: string[];
	/** Local proxy URL for CORS bypass (optional) */
	proxyUrl?: string;
	/** Auto-discover scanners on mount */
	autoDiscover?: boolean;
	/** Poll interval for scanner status (ms) */
	statusPollInterval?: number;
}

export interface BrowserScanResult {
	success: boolean;
	pages: Blob[];
	documentIds: string[];
	format: string;
	errors: string[];
}

export interface UseBrowserScannerReturn {
	// State
	scanners: ESCLScannerInfo[];
	activeScanner: ESCLScannerInfo | null;
	capabilities: ESCLCapabilities | null;
	isDiscovering: boolean;
	isScanning: boolean;
	scanProgress: { current: number; total: number } | null;
	error: string | null;

	// Actions
	discoverScanners: () => Promise<void>;
	selectScanner: (scanner: ESCLScannerInfo) => Promise<void>;
	scan: (options: {
		resolution: number;
		colorMode: 'color' | 'grayscale' | 'monochrome';
		format: 'jpeg' | 'png' | 'tiff' | 'pdf';
		duplex?: boolean;
		inputSource?: 'platen' | 'adf' | 'adf_duplex';
		projectId?: string;
		batchId?: string;
	}) => Promise<BrowserScanResult>;
	cancelScan: () => void;
	addKnownHost: (host: string) => void;
	removeKnownHost: (host: string) => void;
}

/**
 * Upload scanned pages to backend
 */
async function uploadScannedPages(
	pages: Blob[],
	options: {
		projectId?: string;
		batchId?: string;
		format: string;
	}
): Promise<string[]> {
	const documentIds: string[] = [];

	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];
		const formData = new FormData();

		// Determine file extension
		const ext = options.format.includes('jpeg') ? 'jpg' :
			options.format.includes('png') ? 'png' :
				options.format.includes('tiff') ? 'tiff' :
					options.format.includes('pdf') ? 'pdf' : 'jpg';

		const filename = `scan_${Date.now()}_${i + 1}.${ext}`;
		formData.append('file', page, filename);

		if (options.projectId) {
			formData.append('project_id', options.projectId);
		}
		if (options.batchId) {
			formData.append('batch_id', options.batchId);
		}

		// Upload to backend
		const { data } = await apiClient.post<{ id: string }>('/documents/upload-scan', formData);
		documentIds.push(data.id);
	}

	return documentIds;
}

/**
 * Hook for browser-based eSCL scanning
 */
export function useBrowserScanner(config: BrowserScannerConfig = {}): UseBrowserScannerReturn {
	const {
		knownHosts: initialHosts = [],
		proxyUrl,
		autoDiscover = true,
	} = config;

	// State
	const [scanners, setScanners] = useState<ESCLScannerInfo[]>([]);
	const [activeScanner, setActiveScanner] = useState<ESCLScannerInfo | null>(null);
	const [capabilities, setCapabilities] = useState<ESCLCapabilities | null>(null);
	const [isDiscovering, setIsDiscovering] = useState(false);
	const [isScanning, setIsScanning] = useState(false);
	const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [knownHosts, setKnownHosts] = useState<string[]>(initialHosts);

	// Refs
	const scannerClientRef = useRef<ESCLScanner | null>(null);
	const cancelFlagRef = useRef(false);

	// Load known hosts from localStorage
	useEffect(() => {
		try {
			const stored = localStorage.getItem('escl-known-hosts');
			if (stored) {
				const hosts = JSON.parse(stored) as string[];
				setKnownHosts(prev => [...new Set([...prev, ...hosts])]);
			}
		} catch {
			// Ignore errors
		}
	}, []);

	// Save known hosts to localStorage
	useEffect(() => {
		if (knownHosts.length > 0) {
			localStorage.setItem('escl-known-hosts', JSON.stringify(knownHosts));
		}
	}, [knownHosts]);

	// Discover scanners
	const discoverScanners = useCallback(async () => {
		setIsDiscovering(true);
		setError(null);

		try {
			const discovered = await discoverLocalScanners(knownHosts, proxyUrl);
			setScanners(discovered);

			// Auto-select first scanner if none selected
			if (discovered.length > 0 && !activeScanner) {
				const first = discovered[0];
				setActiveScanner(first);

				// Get capabilities
				const client = new ESCLScanner(first.host, first.port, first.port === 443 || first.port === 8443, proxyUrl);
				const caps = await client.getCapabilities();
				setCapabilities(caps);
				scannerClientRef.current = client;
			}
		} catch (e) {
			setError(`Failed to discover scanners: ${(e as Error).message}`);
		} finally {
			setIsDiscovering(false);
		}
	}, [knownHosts, proxyUrl, activeScanner]);

	// Auto-discover on mount
	useEffect(() => {
		if (autoDiscover && knownHosts.length > 0) {
			discoverScanners();
		}
	}, [autoDiscover, discoverScanners, knownHosts.length]);

	// Select scanner
	const selectScanner = useCallback(async (scanner: ESCLScannerInfo) => {
		setActiveScanner(scanner);
		setError(null);

		try {
			const client = new ESCLScanner(
				scanner.host,
				scanner.port,
				scanner.port === 443 || scanner.port === 8443,
				proxyUrl
			);
			const caps = await client.getCapabilities();
			setCapabilities(caps);
			scannerClientRef.current = client;

			// Add to known hosts if not already there
			if (!knownHosts.includes(scanner.host)) {
				setKnownHosts(prev => [...prev, scanner.host]);
			}
		} catch (e) {
			setError(`Failed to connect to scanner: ${(e as Error).message}`);
			setCapabilities(null);
			scannerClientRef.current = null;
		}
	}, [proxyUrl, knownHosts]);

	// Scan mutation
	const scanMutation = useMutation({
		mutationFn: async (options: {
			resolution: number;
			colorMode: 'color' | 'grayscale' | 'monochrome';
			format: 'jpeg' | 'png' | 'tiff' | 'pdf';
			duplex?: boolean;
			inputSource?: 'platen' | 'adf' | 'adf_duplex';
			projectId?: string;
			batchId?: string;
		}): Promise<BrowserScanResult> => {
			if (!scannerClientRef.current) {
				throw new Error('No scanner selected');
			}

			setIsScanning(true);
			setScanProgress({ current: 0, total: 0 });
			cancelFlagRef.current = false;

			// Map input source
			let esclInputSource: ESCLScanOptions['inputSource'] = 'Platen';
			if (options.inputSource === 'adf') {
				esclInputSource = 'Feeder';
			} else if (options.inputSource === 'adf_duplex' || options.duplex) {
				esclInputSource = 'ADFDuplex';
			}

			const esclOptions: ESCLScanOptions = {
				inputSource: esclInputSource,
				colorMode: internalColorModeToEscl(options.colorMode) as ESCLScanOptions['colorMode'],
				resolution: options.resolution,
				format: internalFormatToMime(options.format) as ESCLScanOptions['format'],
				intent: 'Document',
			};

			// Perform scan
			const result = await scannerClientRef.current.scan(esclOptions);

			if (cancelFlagRef.current) {
				return {
					success: false,
					pages: [],
					documentIds: [],
					format: options.format,
					errors: ['Scan cancelled by user'],
				};
			}

			// Upload pages to backend
			let documentIds: string[] = [];
			if (result.success && result.pages.length > 0) {
				setScanProgress({ current: 0, total: result.pages.length });

				documentIds = await uploadScannedPages(result.pages, {
					projectId: options.projectId,
					batchId: options.batchId,
					format: result.format,
				});

			}

			return {
				success: result.success,
				pages: result.pages,
				documentIds,
				format: options.format,
				errors: result.errors,
			};
		},
		onSuccess: () => {
			setIsScanning(false);
			setScanProgress(null);
			setError(null);
		},
		onError: (e) => {
			setIsScanning(false);
			setScanProgress(null);
			setError((e as Error).message);
		},
	});

	// Scan function
	const scan = useCallback(async (options: Parameters<typeof scanMutation.mutateAsync>[0]) => {
		return scanMutation.mutateAsync(options);
	}, [scanMutation]);

	// Cancel scan
	const cancelScan = useCallback(() => {
		cancelFlagRef.current = true;
		// Note: Can't actually cancel in-progress eSCL scan, but we can ignore results
	}, []);

	// Add known host
	const addKnownHost = useCallback((host: string) => {
		setKnownHosts(prev => {
			if (prev.includes(host)) return prev;
			return [...prev, host];
		});
	}, []);

	// Remove known host
	const removeKnownHost = useCallback((host: string) => {
		setKnownHosts(prev => prev.filter(h => h !== host));
	}, []);

	return {
		scanners,
		activeScanner,
		capabilities,
		isDiscovering,
		isScanning,
		scanProgress,
		error,
		discoverScanners,
		selectScanner,
		scan,
		cancelScan,
		addKnownHost,
		removeKnownHost,
	};
}
