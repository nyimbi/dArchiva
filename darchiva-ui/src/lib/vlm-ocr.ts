/**
 * Unified VLM OCR Client
 *
 * Supports multiple backends:
 * 1. Local Ollama (privacy, no cost, requires local GPU)
 * 2. Ollama Cloud (same API, hosted - recommended)
 * 3. Anthropic Claude Vision (best quality)
 * 4. OpenAI GPT-4 Vision (alternative)
 *
 * Use this when you want OCR processed in the browser rather than backend.
 *
 * Cloud providers are proxied through the backend to avoid CORS issues.
 */

export type VLMProvider = 'ollama' | 'ollama-cloud' | 'anthropic' | 'openai' | 'azure-openai';

/**
 * Get the OCR proxy base URL from the backend
 */
function getProxyBaseUrl(): string {
	return '/api/v1/ocr-proxy';
}

export interface VLMConfig {
	provider: VLMProvider;
	// Ollama settings (local or cloud)
	ollamaHost?: string; // 'http://localhost:11434' for local, 'https://ollama.com' for cloud
	ollamaModel?: string;
	ollamaApiKey?: string; // Required for Ollama Cloud
	// Other cloud API settings
	apiKey?: string;
	anthropicModel?: string;
	openaiModel?: string;
	// Azure OpenAI settings
	azureOpenaiEndpoint?: string;
	azureOpenaiDeployment?: string;
	azureOpenaiApiVersion?: string;
}

export interface OCRResult {
	text: string;
	confidence: number;
	processingTimeMs: number;
	provider: VLMProvider;
	model: string;
	metadata?: Record<string, unknown>;
}

// OCR prompt for VLM
const OCR_PROMPT = `You are a precise OCR system. Extract ALL text from this document image.

IMPORTANT INSTRUCTIONS:
1. Transcribe EVERY piece of text visible in the image
2. Maintain the original layout and structure (paragraphs, lists, tables)
3. Include headers, footers, page numbers, stamps, and annotations
4. Preserve any dates, numbers, and special characters exactly as shown
5. If text is handwritten, do your best to read it accurately
6. For tables, preserve column alignment using spaces or tabs
7. Mark unclear text with [unclear] but still attempt to read it

Output the text exactly as it appears, preserving the document's structure.
Provide ONLY the extracted text, no commentary or explanations.`;

/**
 * Convert blob to base64 data URL
 */
async function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Anthropic Claude Vision OCR (via backend proxy to avoid CORS)
 */
async function ocrWithAnthropic(
	imageBlob: Blob,
	apiKey: string,
	model: string = 'claude-sonnet-4-20250514'
): Promise<OCRResult> {
	const startTime = performance.now();

	// Convert image to base64
	const dataUrl = await blobToBase64(imageBlob);
	const base64Data = dataUrl.split(',')[1];
	const mediaType = imageBlob.type || 'image/png';

	// Use backend proxy to avoid CORS
	const proxyUrl = `${getProxyBaseUrl()}/anthropic/messages`;

	const response = await fetch(proxyUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Anthropic-Api-Key': apiKey,
		},
		credentials: 'include',
		body: JSON.stringify({
			model,
			max_tokens: 8192,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'image',
							source: {
								type: 'base64',
								media_type: mediaType,
								data: base64Data,
							},
						},
						{
							type: 'text',
							text: OCR_PROMPT,
						},
					],
				},
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	const text = data.content?.[0]?.text || '';

	return {
		text: text.trim(),
		confidence: 0.98,
		processingTimeMs: performance.now() - startTime,
		provider: 'anthropic',
		model,
		metadata: {
			inputTokens: data.usage?.input_tokens,
			outputTokens: data.usage?.output_tokens,
			stopReason: data.stop_reason,
		},
	};
}

/**
 * OpenAI GPT-4 Vision OCR (via backend proxy to avoid CORS)
 */
async function ocrWithOpenAI(
	imageBlob: Blob,
	apiKey: string,
	model: string = 'gpt-4o'
): Promise<OCRResult> {
	const startTime = performance.now();

	// Convert image to base64 data URL
	const dataUrl = await blobToBase64(imageBlob);

	// Use backend proxy to avoid CORS
	const proxyUrl = `${getProxyBaseUrl()}/openai/chat/completions`;

	const response = await fetch(proxyUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-OpenAI-Api-Key': apiKey,
		},
		credentials: 'include',
		body: JSON.stringify({
			model,
			max_tokens: 8192,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'image_url',
							image_url: {
								url: dataUrl,
								detail: 'high',
							},
						},
						{
							type: 'text',
							text: OCR_PROMPT,
						},
					],
				},
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	const text = data.choices?.[0]?.message?.content || '';

	return {
		text: text.trim(),
		confidence: 0.97,
		processingTimeMs: performance.now() - startTime,
		provider: 'openai',
		model,
		metadata: {
			promptTokens: data.usage?.prompt_tokens,
			completionTokens: data.usage?.completion_tokens,
			finishReason: data.choices?.[0]?.finish_reason,
		},
	};
}

/**
 * Azure OpenAI GPT-4 Vision OCR (via backend proxy to avoid CORS)
 */
async function ocrWithAzureOpenAI(
	imageBlob: Blob,
	apiKey: string,
	endpoint: string,
	deployment: string,
	apiVersion: string = '2024-02-15-preview'
): Promise<OCRResult> {
	const startTime = performance.now();

	// Convert image to base64 data URL
	const dataUrl = await blobToBase64(imageBlob);

	// Use backend proxy to avoid CORS
	const proxyUrl = `${getProxyBaseUrl()}/azure-openai/chat/completions`;

	const response = await fetch(proxyUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Azure-Api-Key': apiKey,
			'X-Azure-Endpoint': endpoint,
			'X-Azure-Deployment': deployment,
			'X-Azure-Api-Version': apiVersion,
		},
		credentials: 'include',
		body: JSON.stringify({
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'image_url',
							image_url: {
								url: dataUrl,
								detail: 'high',
							},
						},
						{
							type: 'text',
							text: OCR_PROMPT,
						},
					],
				},
			],
			max_tokens: 8192,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	const text = data.choices?.[0]?.message?.content || '';

	return {
		text: text.trim(),
		confidence: 0.97,
		processingTimeMs: performance.now() - startTime,
		provider: 'azure-openai',
		model: deployment,
		metadata: {
			promptTokens: data.usage?.prompt_tokens,
			completionTokens: data.usage?.completion_tokens,
			finishReason: data.choices?.[0]?.finish_reason,
		},
	};
}

/**
 * Ollama VLM OCR (local or cloud)
 * Cloud requests go through backend proxy to avoid CORS
 * Local requests go direct to localhost
 */
async function ocrWithOllama(
	imageBlob: Blob,
	host: string = 'http://localhost:11434',
	model: string = 'qwen2.5-vl:7b',
	apiKey?: string
): Promise<OCRResult> {
	const startTime = performance.now();

	// Convert image to base64 (without data URL prefix)
	const dataUrl = await blobToBase64(imageBlob);
	const base64Data = dataUrl.split(',')[1];

	// Normalize host URL and check if cloud
	const baseUrl = host.replace(/\/$/, '');
	const isCloud = baseUrl.includes('ollama.com');

	// Build request body
	const requestBody = {
		model,
		messages: [
			{
				role: 'user',
				content: OCR_PROMPT,
				images: [base64Data],
			},
		],
		stream: false,
		options: {
			temperature: 0.1,
			num_predict: 8192,
		},
	};

	let response: Response;

	if (isCloud) {
		// Use backend proxy for cloud to avoid CORS
		const proxyUrl = `${getProxyBaseUrl()}/ollama/chat`;
		response = await fetch(proxyUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Ollama-Api-Key': apiKey || '',
				'X-Ollama-Host': baseUrl,
			},
			credentials: 'include',
			body: JSON.stringify(requestBody),
		});
	} else {
		// Direct connection for local Ollama (no CORS issues with localhost)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		response = await fetch(`${baseUrl}/api/chat`, {
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		});
	}

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Ollama API error: ${response.status} - ${error}`);
	}

	const data = await response.json();
	const text = data.message?.content || '';

	return {
		text: text.trim(),
		confidence: 0.95,
		processingTimeMs: performance.now() - startTime,
		provider: isCloud ? 'ollama-cloud' : 'ollama',
		model: data.model || model,
		metadata: {
			promptTokens: data.prompt_eval_count,
			completionTokens: data.eval_count,
			totalDuration: data.total_duration,
			isCloud,
		},
	};
}

/**
 * Check if Ollama is available (local or cloud)
 * Cloud requests go through backend proxy to avoid CORS
 */
export async function checkOllamaStatus(
	host: string = 'http://localhost:11434',
	apiKey?: string
): Promise<{ available: boolean; models: string[]; isCloud: boolean; error?: string }> {
	try {
		const baseUrl = host.replace(/\/$/, '');
		const isCloud = baseUrl.includes('ollama.com');

		let response: Response;

		if (isCloud) {
			// Use backend proxy for cloud to avoid CORS
			const proxyUrl = `${getProxyBaseUrl()}/ollama/tags`;
			response = await fetch(proxyUrl, {
				headers: {
					'X-Ollama-Api-Key': apiKey || '',
					'X-Ollama-Host': baseUrl,
				},
				credentials: 'include',
			});
		} else {
			// Direct connection for local Ollama
			const headers: Record<string, string> = {};
			if (apiKey) {
				headers['Authorization'] = `Bearer ${apiKey}`;
			}
			response = await fetch(`${baseUrl}/api/tags`, { headers });
		}

		if (!response.ok) {
			return { available: false, models: [], isCloud, error: `HTTP ${response.status}` };
		}
		const data = await response.json();
		const models = (data.models || []).map((m: { name: string }) => m.name);
		return { available: true, models, isCloud };
	} catch (error) {
		return {
			available: false,
			models: [],
			isCloud: host.includes('ollama.com'),
			error: error instanceof Error ? error.message : 'Connection failed',
		};
	}
}

/**
 * Unified OCR function
 */
export async function performOCR(
	imageBlob: Blob,
	config: VLMConfig
): Promise<OCRResult> {
	switch (config.provider) {
		case 'anthropic':
			if (!config.apiKey) {
				throw new Error('Anthropic API key is required');
			}
			return ocrWithAnthropic(
				imageBlob,
				config.apiKey,
				config.anthropicModel || 'claude-sonnet-4-20250514'
			);

		case 'openai':
			if (!config.apiKey) {
				throw new Error('OpenAI API key is required');
			}
			return ocrWithOpenAI(
				imageBlob,
				config.apiKey,
				config.openaiModel || 'gpt-4o'
			);

		case 'azure-openai':
			if (!config.apiKey) {
				throw new Error('Azure OpenAI API key is required');
			}
			if (!config.azureOpenaiEndpoint || !config.azureOpenaiDeployment) {
				throw new Error('Azure OpenAI endpoint and deployment are required');
			}
			return ocrWithAzureOpenAI(
				imageBlob,
				config.apiKey,
				config.azureOpenaiEndpoint,
				config.azureOpenaiDeployment,
				config.azureOpenaiApiVersion || '2024-02-15-preview'
			);

		case 'ollama-cloud':
			if (!config.ollamaApiKey) {
				throw new Error('Ollama Cloud API key is required');
			}
			return ocrWithOllama(
				imageBlob,
				'https://ollama.com',
				config.ollamaModel || 'qwen2.5-vl:7b',
				config.ollamaApiKey
			);

		case 'ollama':
		default:
			return ocrWithOllama(
				imageBlob,
				config.ollamaHost || 'http://localhost:11434',
				config.ollamaModel || 'qwen2.5-vl:7b',
				config.ollamaApiKey
			);
	}
}

/**
 * Render PDF page to image (using pdfjs-dist)
 */
export async function renderPdfPage(
	pdfData: ArrayBuffer | Uint8Array,
	pageNumber: number,
	scale: number = 2.0
): Promise<Blob> {
	const pdfjsLib = await import('pdfjs-dist');
	pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

	const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
	const page = await pdf.getPage(pageNumber);
	const viewport = page.getViewport({ scale });

	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	if (!context) throw new Error('Could not get canvas context');

	canvas.width = viewport.width;
	canvas.height = viewport.height;

	await page.render({ canvasContext: context, viewport }).promise;

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
			'image/png',
			1.0
		);
	});
}

/**
 * OCR entire PDF document
 */
export async function ocrPdfDocument(
	pdfData: ArrayBuffer | Uint8Array,
	config: VLMConfig,
	onProgress?: (current: number, total: number, partialText: string) => void
): Promise<{ pages: OCRResult[]; fullText: string; totalTimeMs: number }> {
	const startTime = performance.now();
	const pdfjsLib = await import('pdfjs-dist');
	pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

	const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
	const totalPages = pdf.numPages;

	const pages: OCRResult[] = [];
	const texts: string[] = [];

	for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
		const pageImage = await renderPdfPage(pdfData, pageNum);
		const result = await performOCR(pageImage, config);
		pages.push(result);
		texts.push(result.text);

		onProgress?.(pageNum, totalPages, texts.join('\n\n--- Page Break ---\n\n'));
	}

	return {
		pages,
		fullText: texts.join('\n\n'),
		totalTimeMs: performance.now() - startTime,
	};
}

/**
 * VLM provider display info
 */
export const VLM_PROVIDERS = {
	'azure-openai': {
		name: 'Azure OpenAI',
		description: 'Enterprise Azure GPT-4 Vision',
		requiresApiKey: true,
		defaultModel: 'gpt-4.1-mini',
		models: ['gpt-4.1-mini', 'gpt-4o', 'gpt-4-turbo'],
		requiresEndpoint: true,
	},
	'ollama-cloud': {
		name: 'Ollama Cloud',
		description: 'Hosted VLM (recommended)',
		requiresApiKey: true,
		defaultModel: 'qwen3-vl:235b-cloud',
		models: ['qwen3-vl:235b-cloud', 'qwen2.5-vl:7b', 'qwen2-vl:7b', 'llava:13b', 'minicpm-v:8b'],
		host: 'https://ollama.com',
	},
	ollama: {
		name: 'Local Ollama',
		description: 'Run VLM locally',
		requiresApiKey: false,
		defaultModel: 'qwen3-vl:235b-cloud',
		models: ['qwen3-vl:235b-cloud', 'qwen3-vl:latest', 'qwen2.5-vl:7b', 'qwen2-vl:7b', 'llava:13b', 'minicpm-v:8b'],
		host: 'http://localhost:11434',
	},
	anthropic: {
		name: 'Anthropic Claude',
		description: 'Best quality, highest cost',
		requiresApiKey: true,
		defaultModel: 'claude-sonnet-4-20250514',
		models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'],
	},
	openai: {
		name: 'OpenAI GPT-4',
		description: 'Alternative cloud option',
		requiresApiKey: true,
		defaultModel: 'gpt-4o',
		models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
	},
} as const;
