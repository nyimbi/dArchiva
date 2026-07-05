/**
 * Browser-based eSCL scanner discovery via local network range probing.
 *
 * Technique: fetch in `no-cors` mode resolves with an opaque response for any
 * live HTTP server and rejects on network failure (host unreachable / timeout).
 * This lets us detect host liveness without reading response bodies, working
 * around CORS restrictions — at the cost of not being able to parse capabilities.
 * Returned descriptors have null manufacturer/model; those fields are populated
 * by the backend after registration when it performs a real eSCL handshake.
 *
 * Browser limitations:
 *   - Mixed-content: HTTPS pages cannot probe HTTP endpoints on iOS/Safari.
 *   - Local network access: iOS 14+ presents a permission nag on first probe.
 *   - AbortSignal.timeout: requires Chrome 103+, Firefox 100+, Safari 16.4+.
 */

import type { DiscoveredScanner } from '../types';

/** Ports to try on each candidate host, in preference order. */
const PROBE_PORTS = [80, 443, 9100] as const;

/**
 * eSCL capabilities path used as the probe target.
 * A 200 (or even a CORS-blocked opaque) response on this path strongly
 * suggests an eSCL-capable device.
 */
const ESCL_PROBE_PATH = '/eSCL/ScannerCapabilities';

/**
 * Well-known scanner IP addresses to check before the full range sweep.
 * These cover common consumer scanner/MFP defaults and gateway addresses.
 */
export const FAST_PATH_HOSTS: readonly string[] = [
  '192.168.1.50',   // HP LaserJet MFP common static assignment
  '192.168.0.50',
  '192.168.1.100',
  '192.168.0.100',
  '192.168.1.200',
  '192.168.0.200',
  '192.168.1.1',    // Common router/AP addresses (some have integrated printers)
  '192.168.0.1',
  '10.0.0.1',
  '10.0.1.1',
  '172.16.0.1',
];

// ── Core probe primitives ───────────────────────────────────────────────────

/**
 * Probe one port on one host using a no-cors fetch.
 * Returns true if the host responded (opaque success), false on network failure.
 */
async function probePort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  const scheme = port === 443 ? 'https' : 'http';
  const portSuffix =
    (scheme === 'http' && port === 80) || (scheme === 'https' && port === 443)
      ? ''
      : `:${port}`;
  const url = `${scheme}://${host}${portSuffix}${ESCL_PROBE_PATH}`;
  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',      // Opaque response — we only care about liveness
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return true;
  } catch {
    return false;
  }
}

/** Build the descriptor URL for a confirmed live port. */
function buildRootUrl(host: string, port: number): string {
  const scheme = port === 443 ? 'https' : 'http';
  const portSuffix =
    (scheme === 'http' && port === 80) || (scheme === 'https' && port === 443)
      ? ''
      : `:${port}`;
  return `${scheme}://${host}${portSuffix}/eSCL`;
}

/**
 * Probe one host across all candidate ports.
 * Returns a DiscoveredScanner descriptor on the first responsive port, or null.
 */
async function probeHost(
  host: string,
  timeoutMs: number,
): Promise<DiscoveredScanner | null> {
  for (const port of PROBE_PORTS) {
    const alive = await probePort(host, port, timeoutMs);
    if (alive) {
      return {
        name: `Scanner at ${host}`,
        host,
        port,
        protocol: 'escl',
        uuid: null,
        manufacturer: null,
        model: null,
        serial: null,
        root_url: buildRootUrl(host, port),
        discovered_at: new Date().toISOString(),
      };
    }
  }
  return null;
}

/** Run probeHost concurrently for a batch of hosts. */
async function probeBatch(
  hosts: string[],
  timeoutMs: number,
  signal: AbortSignal,
): Promise<DiscoveredScanner[]> {
  if (signal.aborted) return [];
  const results = await Promise.allSettled(hosts.map((h) => probeHost(h, timeoutMs)));
  return results
    .filter((r): r is PromiseFulfilledResult<DiscoveredScanner | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((s): s is DiscoveredScanner => s !== null);
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface NetworkDiscoveryOptions {
  /**
   * Network prefix to scan, e.g. '192.168.1'.
   * Omit to sweep all common home/office prefixes.
   */
  networkPrefix?: string;
  /** Per-host probe timeout in ms. Default: 2000. */
  timeoutMs?: number;
  /** Number of hosts probed concurrently per batch. Default: 20. */
  batchSize?: number;
  /**
   * Fired after each batch with the scanners found in that batch.
   * Use for incremental UI updates — don't wait for the full sweep to finish.
   */
  onBatchResult?: (found: DiscoveredScanner[]) => void;
  signal?: AbortSignal;
}

/**
 * Discover eSCL scanners on the local network.
 *
 * Strategy:
 *   1. Fast path  — probe well-known scanner IPs immediately (returns in ~2 s).
 *   2. Full sweep — probe 1-254 for each prefix in batches of `batchSize`.
 *
 * `opts.onBatchResult` fires incrementally so the UI can display results as
 * they arrive rather than waiting for the entire sweep to complete.
 */
export async function discoverNetworkScanners(
  opts: NetworkDiscoveryOptions = {},
): Promise<DiscoveredScanner[]> {
  const {
    networkPrefix,
    timeoutMs = 2_000,
    batchSize = 20,
    onBatchResult,
    signal = new AbortController().signal,
  } = opts;

  const found: DiscoveredScanner[] = [];

  const emit = (batch: DiscoveredScanner[]) => {
    if (batch.length === 0) return;
    found.push(...batch);
    onBatchResult?.(batch);
  };

  // 1. Fast path: known addresses
  const fastResults = await probeBatch([...FAST_PATH_HOSTS], timeoutMs, signal);
  emit(fastResults);
  if (signal.aborted) return found;

  // 2. Full range sweep
  const prefixes = networkPrefix
    ? [networkPrefix]
    : ['192.168.1', '192.168.0', '10.0.0', '10.0.1'];

  const alreadyFound = new Set(found.map((s) => s.host));

  for (const prefix of prefixes) {
    if (signal.aborted) break;

    const hosts = Array.from({ length: 254 }, (_, i) => `${prefix}.${i + 1}`).filter(
      (h) => !alreadyFound.has(h),
    );

    for (let i = 0; i < hosts.length; i += batchSize) {
      if (signal.aborted) break;
      const batchHosts = hosts.slice(i, i + batchSize);
      const batchResults = await probeBatch(batchHosts, timeoutMs, signal);
      batchResults.forEach((s) => alreadyFound.add(s.host));
      emit(batchResults);
    }
  }

  return found;
}

/**
 * Validate a single manually entered host and port.
 * Returns a DiscoveredScanner descriptor if an eSCL-looking endpoint responds,
 * or null if the host is unreachable or times out.
 */
export async function probeSpecificHost(
  host: string,
  port = 80,
  timeoutMs = 3_000,
): Promise<DiscoveredScanner | null> {
  const alive = await probePort(host.trim(), port, timeoutMs);
  if (!alive) return null;
  return {
    name: `Scanner at ${host}`,
    host: host.trim(),
    port,
    protocol: 'escl',
    uuid: null,
    manufacturer: null,
    model: null,
    serial: null,
    root_url: buildRootUrl(host.trim(), port),
    discovered_at: new Date().toISOString(),
  };
}
