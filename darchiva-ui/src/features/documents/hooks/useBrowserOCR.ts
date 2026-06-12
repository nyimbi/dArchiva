/**
 * React hook for browser-based OCR using VLM
 *
 * Supports:
 * - Ollama Cloud (recommended)
 * - Local Ollama
 * - Anthropic Claude Vision
 * - OpenAI GPT-4 Vision
 *
 * This allows OCR to be processed in the browser when the backend is remote.
 */
import {
  checkOllamaStatus,
  ocrPdfDocument,
  performOCR,
  VLM_PROVIDERS,
  type VLMConfig,
  type OCRResult as VLMOCRResult,
  type VLMProvider
} from '@/lib/vlm-ocr';
import { useCallback,useRef,useState } from 'react';

export interface BrowserOCRConfig {
	provider: VLMProvider;
	ollamaHost: string;
	ollamaModel: string;
	ollamaApiKey: string; // For Ollama Cloud
	apiKey: string; // For Anthropic/OpenAI/Azure
	// Azure OpenAI specific
	azureEndpoint: string;
	azureDeployment: string;
	azureApiVersion: string;
	enabled: boolean;
}

export interface OCRProgress {
	currentPage: number;
	totalPages: number;
	status: 'idle' | 'processing' | 'complete' | 'error';
	partialText?: string;
	error?: string;
}

export interface PageOCRResult {
	pageNumber: number;
	text: string;
	processingTimeMs: number;
}

export interface DocumentOCRResult {
	pages: PageOCRResult[];
	fullText: string;
	totalProcessingTimeMs: number;
	provider: VLMProvider;
	model: string;
}

export interface ConnectionStatus {
	available: boolean;
	isCloud: boolean;
	models: string[];
	error?: string;
}

export interface UseBrowserOCRReturn {
	// Status
	status: ConnectionStatus | null;
	isConnected: boolean;
	isProcessing: boolean;
	progress: OCRProgress;
	availableModels: string[];

	// Actions
	checkConnection: () => Promise<ConnectionStatus>;
	ocrImage: (image: Blob) => Promise<VLMOCRResult>;
	ocrPdf: (pdfData: ArrayBuffer | Uint8Array) => Promise<DocumentOCRResult>;
	ocrFile: (file: File) => Promise<DocumentOCRResult>;
	cancelOCR: () => void;

	// Configuration
	setConfig: (config: Partial<BrowserOCRConfig>) => void;
	config: BrowserOCRConfig;
	providerInfo: typeof VLM_PROVIDERS;
}

const DEFAULT_CONFIG: BrowserOCRConfig = {
	provider: 'azure-openai',
	ollamaHost: 'https://ollama.com',
	ollamaModel: 'qwen3-vl:235b-cloud',
	ollamaApiKey: import.meta.env.VITE_OLLAMA_API_KEY || '',
	apiKey: import.meta.env.VITE_AZURE_OPENAI_API_KEY || '',
	// Azure OpenAI defaults from environment
	azureEndpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://lindela.openai.azure.com/',
	azureDeployment: import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini',
	azureApiVersion: import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
	enabled: false,
};

// Load config from localStorage
function loadConfig(): BrowserOCRConfig {
	try {
		const stored = localStorage.getItem('browserOCRConfig');
		if (stored) {
			return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
		}
	} catch {
		// Ignore parse errors
	}
	return DEFAULT_CONFIG;
}

// Save config to localStorage
function saveConfig(config: BrowserOCRConfig): void {
	try {
		// Don't persist API keys for security
		const safeConfig = { ...config, ollamaApiKey: '', apiKey: '' };
		localStorage.setItem('browserOCRConfig', JSON.stringify(safeConfig));
	} catch {
		// Ignore storage errors
	}
}

export function useBrowserOCR(): UseBrowserOCRReturn {
	const [config, setConfigState] = useState<BrowserOCRConfig>(loadConfig);
	const [status, setStatus] = useState<ConnectionStatus | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [progress, setProgress] = useState<OCRProgress>({
		currentPage: 0,
		totalPages: 0,
		status: 'idle',
	});
	const [availableModels, setAvailableModels] = useState<string[]>([]);

	const cancelledRef = useRef(false);

	const setConfig = useCallback((updates: Partial<BrowserOCRConfig>) => {
		setConfigState((prev) => {
			const newConfig = { ...prev, ...updates };
			saveConfig(newConfig);
			return newConfig;
		});
	}, []);

	// Build VLMConfig from our config
	const getVLMConfig = useCallback((): VLMConfig => {
		return {
			provider: config.provider,
			ollamaHost: config.ollamaHost,
			ollamaModel: config.ollamaModel,
			ollamaApiKey: config.ollamaApiKey,
			apiKey: config.apiKey,
			anthropicModel: 'claude-sonnet-4-20250514',
			openaiModel: 'gpt-4o',
			// Azure OpenAI settings
			azureOpenaiEndpoint: config.azureEndpoint,
			azureOpenaiDeployment: config.azureDeployment,
			azureOpenaiApiVersion: config.azureApiVersion,
		};
	}, [config]);

	const checkConnection = useCallback(async (): Promise<ConnectionStatus> => {
		// For Ollama (local or cloud), check status
		if (config.provider === 'ollama' || config.provider === 'ollama-cloud') {
			const host =
				config.provider === 'ollama-cloud'
					? 'https://ollama.com'
					: config.ollamaHost;
			const result = await checkOllamaStatus(host, config.ollamaApiKey);
			setStatus(result);
			if (result.available) {
				setAvailableModels(result.models);
			}
			return result;
		}

		// For Anthropic/OpenAI, just check if API key is set
		const hasKey = !!config.apiKey;
		const result: ConnectionStatus = {
			available: hasKey,
			isCloud: true,
			models: VLM_PROVIDERS[config.provider].models as unknown as string[],
			error: hasKey ? undefined : 'API key required',
		};
		setStatus(result);
		setAvailableModels(result.models);
		return result;
	}, [config]);

	const ocrImage = useCallback(
		async (image: Blob): Promise<VLMOCRResult> => {
			setIsProcessing(true);
			setProgress({ currentPage: 1, totalPages: 1, status: 'processing' });

			try {
				const result = await performOCR(image, getVLMConfig());
				setProgress({ currentPage: 1, totalPages: 1, status: 'complete' });
				return result;
			} catch (error) {
				setProgress({
					currentPage: 1,
					totalPages: 1,
					status: 'error',
					error: error instanceof Error ? error.message : 'OCR failed',
				});
				throw error;
			} finally {
				setIsProcessing(false);
			}
		},
		[getVLMConfig]
	);

	const ocrPdf = useCallback(
		async (pdfData: ArrayBuffer | Uint8Array): Promise<DocumentOCRResult> => {
			cancelledRef.current = false;
			setIsProcessing(true);

			try {
				const vlmConfig = getVLMConfig();

				const result = await ocrPdfDocument(
					pdfData,
					vlmConfig,
					(current, total, partialText) => {
						if (cancelledRef.current) return;
						setProgress({
							currentPage: current,
							totalPages: total,
							status: 'processing',
							partialText,
						});
					}
				);

				setProgress({
					currentPage: result.pages.length,
					totalPages: result.pages.length,
					status: 'complete',
				});

				return {
					pages: result.pages.map((p, i) => ({
						pageNumber: i + 1,
						text: p.text,
						processingTimeMs: p.processingTimeMs,
					})),
					fullText: result.fullText,
					totalProcessingTimeMs: result.totalTimeMs,
					provider: config.provider,
					model: config.ollamaModel || VLM_PROVIDERS[config.provider].defaultModel,
				};
			} catch (error) {
				setProgress((prev) => ({
					...prev,
					status: 'error',
					error: error instanceof Error ? error.message : 'OCR failed',
				}));
				throw error;
			} finally {
				setIsProcessing(false);
			}
		},
		[config.provider, config.ollamaModel, getVLMConfig]
	);

	const ocrFile = useCallback(
		async (file: File): Promise<DocumentOCRResult> => {
			const isPdf =
				file.type === 'application/pdf' ||
				file.name.toLowerCase().endsWith('.pdf');
			const isImage = file.type.startsWith('image/');

			if (isPdf) {
				const arrayBuffer = await file.arrayBuffer();
				return ocrPdf(arrayBuffer);
			} else if (isImage) {
				const result = await ocrImage(file);
				return {
					pages: [
						{
							pageNumber: 1,
							text: result.text,
							processingTimeMs: result.processingTimeMs,
						},
					],
					fullText: result.text,
					totalProcessingTimeMs: result.processingTimeMs,
					provider: result.provider,
					model: result.model,
				};
			} else {
				throw new Error(`Unsupported file type: ${file.type}`);
			}
		},
		[ocrPdf, ocrImage]
	);

	const cancelOCR = useCallback(() => {
		cancelledRef.current = true;
	}, []);

	return {
		status,
		isConnected: status?.available ?? false,
		isProcessing,
		progress,
		availableModels,

		checkConnection,
		ocrImage,
		ocrPdf,
		ocrFile,
		cancelOCR,

		setConfig,
		config,
		providerInfo: VLM_PROVIDERS,
	};
}

export default useBrowserOCR;
