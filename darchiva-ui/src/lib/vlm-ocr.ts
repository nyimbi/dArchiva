/**
 * Unified VLM OCR Client
 *
 * Supports the configured OpenAI-compatible LiteLLM gateway for browser OCR.
 *
 * Use this when you want OCR processed in the browser rather than backend.
 *
 * Requests are proxied through the backend to avoid CORS issues.
 */

export type VLMProvider = 'openai';

/**
 * Get the OCR proxy base URL from the backend
 */
function getProxyBaseUrl(): string {
	return '/api/v1/ocr-proxy';
}

export interface VLMConfig {
	provider: VLMProvider;
	apiKey?: string;
	openaiBaseUrl?: string;
	openaiModel?: string;
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
 * OpenAI-compatible LiteLLM OCR via backend proxy.
 *
 * The gateway URL and API key are held server-side; the browser never
 * sees or supplies them.
 */
async function ocrWithOpenAI(
	imageBlob: Blob,
	model: string = 'qwen2.5-VL'
): Promise<OCRResult> {
	const startTime = performance.now();

	// Convert image to base64 data URL
	const dataUrl = await blobToBase64(imageBlob);

	const proxyUrl = `${getProxyBaseUrl()}/openai/chat/completions`;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	const token = localStorage.getItem('darchiva_token');
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(proxyUrl, {
		method: 'POST',
		headers,
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
 * Unified OCR function
 */
export async function performOCR(
	imageBlob: Blob,
	config: VLMConfig
): Promise<OCRResult> {
	if (config.provider !== 'openai') {
		throw new Error('Browser OCR is restricted to the LiteLLM gateway');
	}

	return ocrWithOpenAI(
		imageBlob,
		config.openaiModel || 'qwen2.5-VL'
	);
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
	openai: {
		name: 'LiteLLM Gateway',
		description: 'OpenAI-compatible local proxy',
		requiresApiKey: true,
		defaultModel: 'qwen2.5-VL',
		models: ['qwen2.5-VL'],
	},
} as const;
