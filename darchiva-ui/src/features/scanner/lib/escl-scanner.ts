/**
 * Client-side eSCL (AirScan) scanner driver.
 *
 * Implements the eSCL protocol for direct browser-to-scanner communication.
 * Requires one of:
 *   - A scanner that sends permissive CORS headers (uncommon on consumer hardware)
 *   - An Electron / browser-extension context that bypasses CORS
 *   - A same-origin reverse-proxy that forwards requests to the scanner
 *
 * For standard web deployments, use the backend scan API (api/hooks.ts) instead.
 * This class is the reference implementation of the eSCL flow and is used by
 * network-discovery.ts for capability probing.
 */

export interface ESCLScanSettings {
  /** DPI — 150, 300, 600, 1200. Default: 300. */
  resolution?: number;
  /** eSCL colour mode token. Default: RGB24. */
  colorMode?: 'RGB24' | 'Grayscale8' | 'BlackAndWhite1';
  /** Scanner input source. Overridden per method. */
  inputSource?: 'Platen' | 'Adf';
  /** MIME type for the output document. Default: image/jpeg. */
  format?: 'image/jpeg' | 'image/png' | 'application/pdf';
}

export interface ESCLPage {
  pageNumber: number;
  blob: Blob;
  mimeType: string;
}

/**
 * Called after each page is retrieved from the ADF.
 * `done` is true on the final call (after JobState reaches a terminal state).
 */
export type ADFProgressCallback = (pagesFetched: number, done: boolean) => void;

const ESCL_NS = 'http://schemas.hp.com/imaging/escl/2011/05/03';
const PWG_NS = 'http://www.pwg.org/schemas/2010/12/sm';

function buildScanSettingsXml(
  settings: ESCLScanSettings,
  inputSource: 'Platen' | 'Adf',
): string {
  const res = settings.resolution ?? 300;
  const color = settings.colorMode ?? 'RGB24';
  const fmt = settings.format ?? 'image/jpeg';
  return `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="${ESCL_NS}" xmlns:pwg="${PWG_NS}">
  <pwg:Version>2.0</pwg:Version>
  <scan:Intent>Document</scan:Intent>
  <scan:InputSource>${inputSource}</scan:InputSource>
  <scan:XResolution>${res}</scan:XResolution>
  <scan:YResolution>${res}</scan:YResolution>
  <scan:ColorMode>${color}</scan:ColorMode>
  <pwg:DocumentFormat>${fmt}</pwg:DocumentFormat>
</scan:ScanSettings>`;
}

export class ESCLScanner {
  private readonly esclBase: string;
  private readonly origin: string;

  /**
   * @param host Bare host ("192.168.1.50"), full URL ("http://192.168.1.50"),
   *             or a URL already including the /eSCL path.
   */
  constructor(host: string) {
    let base = host.includes('://') ? host : `http://${host}`;
    base = base.replace(/\/$/, '');
    if (!base.endsWith('/eSCL')) base = `${base}/eSCL`;
    this.esclBase = base;
    this.origin = new URL(this.esclBase).origin;
  }

  /** Retrieve scanner capabilities as raw XML. Useful for capability negotiation. */
  async getCapabilities(signal?: AbortSignal): Promise<string> {
    const resp = await fetch(`${this.esclBase}/ScannerCapabilities`, { signal });
    if (!resp.ok) throw new Error(`Capabilities fetch failed: HTTP ${resp.status}`);
    return resp.text();
  }

  /**
   * Single-page platen scan.
   * Returns the raw image Blob from a single NextDocument fetch.
   */
  async scan(settings: ESCLScanSettings = {}, signal?: AbortSignal): Promise<Blob> {
    const jobUrl = await this._startJob(settings, 'Platen', signal);
    const resp = await fetch(`${jobUrl}/NextDocument`, { signal });
    if (!resp.ok) throw new Error(`Document fetch failed: HTTP ${resp.status}`);
    return resp.blob();
  }

  /**
   * Multi-page ADF scan.
   *
   * eSCL ADF flow (per HP M181fw implementation notes):
   *   1. POST /ScanJobs with InputSource: Adf  →  Location: job URL
   *   2. Loop: GET {job}/NextDocument
   *      - 200/201 → page data; continue
   *      - 404     → ADF tray empty; stop
   *   3. Poll {job} JobState until Completed/Aborted/Canceled
   *
   * `onProgress(n, done)` fires after each page (done=false) and once more
   * when the job reaches a terminal state (done=true), so the UI can show
   * "Page N of ?" in real time without knowing the total page count.
   */
  async scanADF(
    settings: ESCLScanSettings = {},
    onProgress?: ADFProgressCallback,
    signal?: AbortSignal,
  ): Promise<ESCLPage[]> {
    const jobUrl = await this._startJob(settings, 'Adf', signal);
    const pages: ESCLPage[] = [];

    // Page fetch loop — ends when scanner returns 404 (no more pages in tray)
    for (;;) {
      if (signal?.aborted) {
        // Best-effort cancel before re-throwing
        await this.cancelJob(jobUrl).catch(() => {});
        throw new DOMException('ADF scan aborted', 'AbortError');
      }

      const resp = await fetch(`${jobUrl}/NextDocument`, { signal });

      if (resp.status === 404) {
        // eSCL sentinel: ADF tray is empty
        break;
      }
      if (!resp.ok) {
        throw new Error(`NextDocument failed: HTTP ${resp.status}`);
      }

      const mimeType = resp.headers.get('Content-Type') ?? 'image/jpeg';
      const blob = await resp.blob();
      pages.push({ pageNumber: pages.length + 1, blob, mimeType });
      onProgress?.(pages.length, false);
    }

    // Wait for the scanner mechanism to reset before declaring done
    await this._waitForJobCompletion(jobUrl, signal);
    onProgress?.(pages.length, true);

    return pages;
  }

  /**
   * Cancel an in-progress scan job.
   *
   * Issues DELETE {jobUrl} per eSCL spec §6.4.
   * 200, 204, and 404 (already completed) are all treated as success.
   *
   * @param jobUrl Absolute URL or path-only job URL returned in Location header.
   */
  async cancelJob(jobUrl: string): Promise<void> {
    const url = jobUrl.startsWith('http') ? jobUrl : `${this.origin}${jobUrl}`;
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok && resp.status !== 404) {
      throw new Error(`Cancel failed: HTTP ${resp.status}`);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _startJob(
    settings: ESCLScanSettings,
    inputSource: 'Platen' | 'Adf',
    signal?: AbortSignal,
  ): Promise<string> {
    const xml = buildScanSettingsXml(settings, inputSource);
    const resp = await fetch(`${this.esclBase}/ScanJobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
      body: xml,
      signal,
    });
    if (resp.status !== 201) {
      throw new Error(`ScanJobs POST returned HTTP ${resp.status} (expected 201)`);
    }
    const location = resp.headers.get('Location');
    if (!location) throw new Error('ScanJobs response missing Location header');
    return location.startsWith('http') ? location : `${this.origin}${location}`;
  }

  /**
   * Poll {jobUrl} until JobState reaches a terminal state (Completed/Aborted/Canceled)
   * or the timeout expires. Prevents starting a second job while the ADF is still
   * mechanically resetting.
   */
  private async _waitForJobCompletion(
    jobUrl: string,
    signal?: AbortSignal,
    timeoutMs = 30_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (signal?.aborted) return;

      const resp = await fetch(jobUrl, { signal }).catch(() => null);
      // Gone or network error — treat as done
      if (!resp || !resp.ok) return;

      const text = await resp.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      const state = doc.querySelector('JobState')?.textContent?.trim();

      if (state === 'Completed' || state === 'Aborted' || state === 'Canceled') return;

      await new Promise<void>((resolve) => setTimeout(resolve, 1_500));
    }
  }
}
