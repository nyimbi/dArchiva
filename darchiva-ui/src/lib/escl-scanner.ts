// (c) Copyright Datacraft, 2026
/**
 * Browser-based eSCL (AirScan) Scanner Service
 *
 * This service enables direct communication between the browser and eSCL-compatible
 * scanners on the local network. This is essential when the backend runs on a remote
 * server but the scanner is local to the user's machine.
 *
 * eSCL Protocol Overview:
 * - GET /eSCL/ScannerCapabilities - Get scanner capabilities XML
 * - GET /eSCL/ScannerStatus - Get current scanner status
 * - POST /eSCL/ScanJobs - Create a new scan job (returns job URL in Location header)
 * - GET /eSCL/ScanJobs/{jobId}/ScanImageInfo - Get scan job image info
 * - GET /eSCL/ScanJobs/{jobId}/NextDocument - Retrieve scanned image
 * - DELETE /eSCL/ScanJobs/{jobId} - Cancel/delete scan job
 */

export interface ESCLScannerInfo {
	name: string;
	host: string;
	port: number;
	protocol: 'escl';
	manufacturer?: string;
	model?: string;
	serialNumber?: string;
	uuid?: string;
	adminUri?: string;
	iconUri?: string;
}

export interface ESCLCapabilities {
	version: string;
	makeAndModel: string;
	manufacturer?: string;
	serialNumber?: string;
	uuid?: string;
	adminUri?: string;
	iconUri?: string;
	platen: {
		supported: boolean;
		minWidth: number;
		maxWidth: number;
		minHeight: number;
		maxHeight: number;
		resolutions: number[];
		colorModes: string[];
		formats: string[];
	};
	adf?: {
		supported: boolean;
		duplex: boolean;
		minWidth: number;
		maxWidth: number;
		minHeight: number;
		maxHeight: number;
		resolutions: number[];
		colorModes: string[];
		formats: string[];
		capacity?: number;
	};
	settingProfiles?: string[];
	supportedIntents?: string[];
}

export interface ESCLScanOptions {
	inputSource: 'Platen' | 'Feeder' | 'ADFDuplex';
	colorMode: 'RGB24' | 'Grayscale8' | 'BlackAndWhite1';
	resolution: number; // DPI
	format: 'image/jpeg' | 'image/png' | 'application/pdf' | 'image/tiff';
	width?: number; // 1/300 inch units (default: max)
	height?: number; // 1/300 inch units (default: max)
	xOffset?: number;
	yOffset?: number;
	brightness?: number; // -100 to 100
	contrast?: number; // -100 to 100
	threshold?: number; // 0-255 for B&W
	compressionQuality?: number; // 0-100 for JPEG
	intent?: 'Preview' | 'TextAndGraphic' | 'Photo' | 'Document';
}

export interface ESCLScanJob {
	jobUri: string;
	state: 'Pending' | 'Processing' | 'Completed' | 'Canceled' | 'Aborted';
	pagesScanned: number;
	pagesAvailable: number;
}

export interface ESCLScanResult {
	success: boolean;
	pages: Blob[];
	format: string;
	errors: string[];
}

// Parse XML helper
function parseXml(xmlString: string): Document {
	const parser = new DOMParser();
	return parser.parseFromString(xmlString, 'text/xml');
}

// Get text content from XML element
function getXmlText(doc: Document, selector: string): string | undefined {
	const prefixes = ['scan:', 'pwg:', ''];
	for (const prefix of prefixes) {
		const el = doc.querySelector(`${prefix}${selector}`);
		if (el?.textContent) {
			return el.textContent.trim();
		}
	}
	// Try with getElementsByTagName which ignores namespaces
	const elements = doc.getElementsByTagName(selector);
	if (elements.length > 0 && elements[0].textContent) {
		return elements[0].textContent.trim();
	}
	return undefined;
}

// Get all matching elements
function getXmlElements(doc: Document, tagName: string): Element[] {
	const elements: Element[] = [];
	const prefixes = ['scan:', 'pwg:', ''];
	for (const prefix of prefixes) {
		const els = doc.querySelectorAll(`${prefix}${tagName}`);
		elements.push(...Array.from(els));
	}
	// Also try getElementsByTagName
	const directEls = doc.getElementsByTagName(tagName);
	elements.push(...Array.from(directEls));
	// Deduplicate
	return [...new Set(elements)];
}

// Parse resolution from SupportedResolutions element
function parseResolutions(doc: Document): number[] {
	const resolutions: number[] = [];

	// Look for DiscreteResolutions or just Resolution elements
	const discreteRes = getXmlElements(doc, 'DiscreteResolution');
	for (const res of discreteRes) {
		const xRes = res.querySelector('XResolution')?.textContent;
		if (xRes) {
			resolutions.push(parseInt(xRes, 10));
		}
	}

	// Also check for direct Resolution elements
	const resElements = getXmlElements(doc, 'Resolution');
	for (const res of resElements) {
		const val = parseInt(res.textContent || '', 10);
		if (!isNaN(val) && val > 0) {
			resolutions.push(val);
		}
	}

	// Default resolutions if none found
	if (resolutions.length === 0) {
		return [150, 300, 600];
	}

	return [...new Set(resolutions)].sort((a, b) => a - b);
}

// Parse color modes
function parseColorModes(doc: Document): string[] {
	const modes: string[] = [];
	const colorModeElements = getXmlElements(doc, 'ColorMode');
	for (const el of colorModeElements) {
		if (el.textContent) {
			modes.push(el.textContent.trim());
		}
	}

	if (modes.length === 0) {
		return ['RGB24', 'Grayscale8'];
	}

	return [...new Set(modes)];
}

// Parse formats
function parseFormats(doc: Document): string[] {
	const formats: string[] = [];
	const formatElements = getXmlElements(doc, 'DocumentFormat');
	for (const el of formatElements) {
		if (el.textContent) {
			formats.push(el.textContent.trim());
		}
	}
	const mimeElements = getXmlElements(doc, 'MimeType');
	for (const el of mimeElements) {
		if (el.textContent) {
			formats.push(el.textContent.trim());
		}
	}

	if (formats.length === 0) {
		return ['image/jpeg', 'application/pdf'];
	}

	return [...new Set(formats)];
}

/**
 * Browser-based eSCL Scanner Client
 */
export class ESCLScanner {
	private baseUrl: string;
	private proxyUrl?: string;
	private capabilities?: ESCLCapabilities;

	/**
	 * Create an eSCL scanner client
	 * @param host Scanner host/IP
	 * @param port Scanner port (typically 80, 443, or 8080)
	 * @param useSSL Use HTTPS
	 * @param proxyUrl Optional local proxy URL for CORS bypass
	 */
	constructor(
		public readonly host: string,
		public readonly port: number = 80,
		public readonly useSSL: boolean = false,
		proxyUrl?: string
	) {
		const protocol = useSSL ? 'https' : 'http';
		this.baseUrl = `${protocol}://${host}:${port}`;
		this.proxyUrl = proxyUrl;
	}

	/**
	 * Get URL for requests, applying proxy if configured
	 */
	private getUrl(path: string): string {
		const targetUrl = `${this.baseUrl}${path}`;
		if (this.proxyUrl) {
			// Proxy expects the target URL as a parameter
			return `${this.proxyUrl}?url=${encodeURIComponent(targetUrl)}`;
		}
		return targetUrl;
	}

	/**
	 * Perform a fetch request with CORS handling
	 */
	private async fetchWithCors(url: string, options: RequestInit = {}): Promise<Response> {
		const fetchOptions: RequestInit = {
			...options,
			mode: this.proxyUrl ? 'cors' : 'no-cors',
		};

		try {
			const response = await fetch(url, fetchOptions);
			return response;
		} catch (error) {
			// If direct request fails, it might be CORS - suggest proxy
			throw new Error(
				`Failed to connect to scanner at ${this.baseUrl}. ` +
				`This may be due to CORS restrictions. Consider using a local scanner proxy. ` +
				`Original error: ${error}`
			);
		}
	}

	/**
	 * Check if scanner is reachable
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const response = await this.fetchWithCors(
				this.getUrl('/eSCL/ScannerStatus'),
				{ method: 'GET' }
			);
			return response.ok || response.type === 'opaque';
		} catch {
			return false;
		}
	}

	/**
	 * Get scanner capabilities
	 */
	async getCapabilities(): Promise<ESCLCapabilities> {
		if (this.capabilities) {
			return this.capabilities;
		}

		const response = await fetch(this.getUrl('/eSCL/ScannerCapabilities'), {
			method: 'GET',
			headers: { 'Accept': 'text/xml, application/xml' },
		});

		if (!response.ok) {
			throw new Error(`Failed to get scanner capabilities: ${response.status}`);
		}

		const xml = await response.text();
		const doc = parseXml(xml);

		// Parse capabilities from XML
		const capabilities: ESCLCapabilities = {
			version: getXmlText(doc, 'Version') || '2.1',
			makeAndModel: getXmlText(doc, 'MakeAndModel') || 'Unknown Scanner',
			manufacturer: getXmlText(doc, 'Manufacturer'),
			serialNumber: getXmlText(doc, 'SerialNumber'),
			uuid: getXmlText(doc, 'UUID'),
			adminUri: getXmlText(doc, 'AdminURI'),
			iconUri: getXmlText(doc, 'IconURI'),
			platen: {
				supported: true,
				minWidth: 0,
				maxWidth: 2550, // ~8.5" at 300dpi
				minHeight: 0,
				maxHeight: 3300, // ~11" at 300dpi
				resolutions: parseResolutions(doc),
				colorModes: parseColorModes(doc),
				formats: parseFormats(doc),
			},
		};

		// Check for ADF
		const adfElements = getXmlElements(doc, 'Adf');
		if (adfElements.length > 0 || getXmlText(doc, 'AdfSimplexInputCaps')) {
			capabilities.adf = {
				supported: true,
				duplex: !!getXmlText(doc, 'AdfDuplexInputCaps'),
				minWidth: 0,
				maxWidth: 2550,
				minHeight: 0,
				maxHeight: 4200, // ~14" at 300dpi
				resolutions: parseResolutions(doc),
				colorModes: parseColorModes(doc),
				formats: parseFormats(doc),
			};
		}

		this.capabilities = capabilities;
		return capabilities;
	}

	/**
	 * Get current scanner status
	 */
	async getStatus(): Promise<{
		state: 'Idle' | 'Processing' | 'Stopped';
		adfState?: 'ScannerAdfLoaded' | 'ScannerAdfEmpty' | 'ScannerAdfJam';
	}> {
		const response = await fetch(this.getUrl('/eSCL/ScannerStatus'), {
			method: 'GET',
			headers: { 'Accept': 'text/xml, application/xml' },
		});

		if (!response.ok) {
			throw new Error(`Failed to get scanner status: ${response.status}`);
		}

		const xml = await response.text();
		const doc = parseXml(xml);

		return {
			state: (getXmlText(doc, 'State') || 'Idle') as 'Idle' | 'Processing' | 'Stopped',
			adfState: getXmlText(doc, 'AdfState') as 'ScannerAdfLoaded' | 'ScannerAdfEmpty' | 'ScannerAdfJam' | undefined,
		};
	}

	/**
	 * Create scan settings XML
	 */
	private buildScanSettingsXml(options: ESCLScanOptions): string {
		const caps = this.capabilities;

		// Determine input source caps
		const isPlaten = options.inputSource === 'Platen';

		// Width/height are expected in 1/300-inch units by eSCL.
		const defaultWidth = isPlaten
			? caps?.platen.maxWidth
			: (caps?.adf?.maxWidth ?? caps?.platen.maxWidth);
		const defaultHeight = isPlaten
			? caps?.platen.maxHeight
			: (caps?.adf?.maxHeight ?? caps?.platen.maxHeight);
		const widthIn300ths = options.width ?? defaultWidth ?? 2550;
		const heightIn300ths = options.height ?? defaultHeight ?? 3300;

		return `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.1</pwg:Version>
  <scan:Intent>${options.intent || 'Document'}</scan:Intent>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:XOffset>${options.xOffset || 0}</pwg:XOffset>
      <pwg:YOffset>${options.yOffset || 0}</pwg:YOffset>
      <pwg:Width>${widthIn300ths}</pwg:Width>
      <pwg:Height>${heightIn300ths}</pwg:Height>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>${options.inputSource}</pwg:InputSource>
  <scan:ColorMode>${options.colorMode}</scan:ColorMode>
  <scan:XResolution>${options.resolution}</scan:XResolution>
  <scan:YResolution>${options.resolution}</scan:YResolution>
  <pwg:DocumentFormat>${options.format}</pwg:DocumentFormat>
  ${options.brightness !== undefined ? `<scan:Brightness>${options.brightness}</scan:Brightness>` : ''}
  ${options.contrast !== undefined ? `<scan:Contrast>${options.contrast}</scan:Contrast>` : ''}
  ${options.threshold !== undefined ? `<scan:Threshold>${options.threshold}</scan:Threshold>` : ''}
  ${options.compressionQuality !== undefined ? `<scan:CompressionFactor>${options.compressionQuality}</scan:CompressionFactor>` : ''}
</scan:ScanSettings>`;
	}

	/**
	 * Start a scan job
	 */
	async createScanJob(options: ESCLScanOptions): Promise<string> {
		// Ensure we have capabilities
		if (!this.capabilities) {
			await this.getCapabilities();
		}

		const settingsXml = this.buildScanSettingsXml(options);

		const response = await fetch(this.getUrl('/eSCL/ScanJobs'), {
			method: 'POST',
			headers: {
				'Content-Type': 'text/xml; charset=utf-8',
				'Accept': 'text/xml, application/xml',
			},
			body: settingsXml,
		});

		if (!response.ok && response.status !== 201) {
			const errorText = await response.text();
			throw new Error(`Failed to create scan job: ${response.status} - ${errorText}`);
		}

		// Job URL is in Location header
		const jobUrl = response.headers.get('Location');
		if (!jobUrl) {
			throw new Error('Scanner did not return job URL in Location header');
		}

		return jobUrl;
	}

	/**
	 * Get scan job status
	 */
	async getScanJobStatus(jobUrl: string): Promise<ESCLScanJob> {
		const response = await fetch(jobUrl, {
			method: 'GET',
			headers: { 'Accept': 'text/xml, application/xml' },
		});

		if (!response.ok) {
			throw new Error(`Failed to get scan job status: ${response.status}`);
		}

		const xml = await response.text();
		const doc = parseXml(xml);

		return {
			jobUri: jobUrl,
			state: (getXmlText(doc, 'JobState') || 'Processing') as ESCLScanJob['state'],
			pagesScanned: parseInt(getXmlText(doc, 'ImagesToTransfer') || '0', 10),
			pagesAvailable: parseInt(getXmlText(doc, 'ImagesCompleted') || '0', 10),
		};
	}

	/**
	 * Get next scanned document
	 */
	async getNextDocument(jobUrl: string): Promise<Blob | null> {
		const nextDocUrl = `${jobUrl}/NextDocument`;

		const response = await fetch(nextDocUrl, {
			method: 'GET',
			headers: { 'Accept': 'image/jpeg, image/png, application/pdf, */*' },
		});

		// 404 means no more documents
		if (response.status === 404) {
			return null;
		}

		// 410 Gone means job completed, no more pages
		if (response.status === 410) {
			return null;
		}

		// 503 Service Unavailable - scanner still processing
		if (response.status === 503) {
			throw new Error('SCANNER_PROCESSING');
		}

		if (!response.ok) {
			throw new Error(`Failed to get scanned document: ${response.status}`);
		}

		const blob = await response.blob();
		return blob;
	}

	/**
	 * Cancel/delete a scan job
	 */
	async cancelScanJob(jobUrl: string): Promise<void> {
		try {
			await fetch(jobUrl, { method: 'DELETE' });
		} catch {
			// Best effort cancellation.
		}
	}

	/**
	 * Perform a complete scan operation
	 */
	async scan(options: ESCLScanOptions): Promise<ESCLScanResult> {
		const pages: Blob[] = [];
		const errors: string[] = [];
		let jobUrl: string | null = null;

		try {
			// Create scan job
			jobUrl = await this.createScanJob(options);

			// Wait for scanner to process and retrieve pages
			const maxRetries = 60; // 60 seconds max wait
			let retries = 0;
			let consecutiveErrors = 0;

			while (retries < maxRetries) {
				try {
					// Try to get next document
					const doc = await this.getNextDocument(jobUrl);

					if (doc === null) {
						// No more documents
						break;
					}

					pages.push(doc);
					consecutiveErrors = 0;

					// For platen, typically only one page
					if (options.inputSource === 'Platen' && pages.length > 0) {
						break;
					}

				} catch (e) {
					const errorMsg = (e as Error).message;

					if (errorMsg === 'SCANNER_PROCESSING') {
						// Scanner still processing, wait and retry
						await new Promise(r => setTimeout(r, 1000));
						retries++;
						continue;
					}

					consecutiveErrors++;

					if (consecutiveErrors >= 3) {
						errors.push(`Failed to retrieve document: ${errorMsg}`);
						break;
					}

					await new Promise(r => setTimeout(r, 1000));
					retries++;
				}
			}

			if (retries >= maxRetries) {
				errors.push('Scan timeout - scanner took too long to respond');
			}

			return {
				success: pages.length > 0,
				pages,
				format: options.format,
				errors,
			};

		} catch (e) {
			errors.push((e as Error).message);
			return {
				success: false,
				pages,
				format: options.format,
				errors,
			};
		} finally {
			// Cleanup job
			if (jobUrl) {
				await this.cancelScanJob(jobUrl);
			}
		}
	}
}

/**
 * Discover eSCL scanners on the local network
 * Note: This requires either:
 * 1. A local mDNS/DNS-SD service
 * 2. Known scanner IPs
 * 3. A local discovery agent
 */
export async function discoverLocalScanners(
	knownHosts?: string[],
	proxyUrl?: string
): Promise<ESCLScannerInfo[]> {
	const scanners: ESCLScannerInfo[] = [];
	const commonPorts = [80, 443, 8080, 8443, 9095];

	// If we have known hosts, probe them
	if (knownHosts && knownHosts.length > 0) {
		const probePromises = knownHosts.flatMap(host =>
			commonPorts.map(async port => {
				const scanner = new ESCLScanner(host, port, port === 443 || port === 8443, proxyUrl);
				try {
					const caps = await scanner.getCapabilities();
					const info: ESCLScannerInfo = {
						name: caps.makeAndModel,
						host,
						port,
						protocol: 'escl',
					};
					if (caps.manufacturer) info.manufacturer = caps.manufacturer;
					if (caps.makeAndModel) info.model = caps.makeAndModel;
					if (caps.serialNumber) info.serialNumber = caps.serialNumber;
					if (caps.uuid) info.uuid = caps.uuid;
					return info;
				} catch {
					return null;
				}
			})
		);

		const results = await Promise.all(probePromises);
		for (const result of results) {
			if (result !== null) {
				scanners.push(result);
			}
		}
	}

	return scanners;
}

/**
 * Convert eSCL color mode string to our internal format
 */
export function esclColorModeToInternal(mode: string): 'color' | 'grayscale' | 'monochrome' {
	switch (mode) {
		case 'RGB24':
		case 'RGB48':
			return 'color';
		case 'Grayscale8':
		case 'Grayscale16':
			return 'grayscale';
		case 'BlackAndWhite1':
			return 'monochrome';
		default:
			return 'color';
	}
}

/**
 * Convert internal color mode to eSCL format
 */
export function internalColorModeToEscl(mode: 'color' | 'grayscale' | 'monochrome'): string {
	switch (mode) {
		case 'color':
			return 'RGB24';
		case 'grayscale':
			return 'Grayscale8';
		case 'monochrome':
			return 'BlackAndWhite1';
	}
}

/**
 * Convert internal format to MIME type
 */
export function internalFormatToMime(format: 'jpeg' | 'png' | 'tiff' | 'pdf'): string {
	switch (format) {
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'tiff':
			return 'image/tiff';
		case 'pdf':
			return 'application/pdf';
	}
}

/**
 * Convert MIME type to internal format
 */
export function mimeToInternalFormat(mime: string): 'jpeg' | 'png' | 'tiff' | 'pdf' {
	if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpeg';
	if (mime.includes('png')) return 'png';
	if (mime.includes('tiff') || mime.includes('tif')) return 'tiff';
	if (mime.includes('pdf')) return 'pdf';
	return 'jpeg';
}
