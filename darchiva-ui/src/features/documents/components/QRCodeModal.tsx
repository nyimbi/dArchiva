// (c) Copyright Datacraft, 2026
// QRCodeModal — display, download, and print a document QR code / label
import { useState } from 'react';
import { Check, Copy, Download, ExternalLink, Loader2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useDocumentQRCode } from '../api/qr';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
	documentId: string;
	documentTitle: string;
	open: boolean;
	onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QRCodeModal({ documentId, documentTitle, open, onClose }: Props) {
	const [copied, setCopied] = useState(false);

	const { data: qrUrl, isLoading, isError } = useDocumentQRCode(documentId, 200);

	const documentUrl = `${window.location.origin}/document/${documentId}`;

	// ── actions ───────────────────────────────────────────────────────────────

	function handleDownloadQR() {
		if (!qrUrl) return;
		const a = document.createElement('a');
		a.href = qrUrl;
		a.download = `qr-${documentId}.png`;
		a.click();
	}

	function handlePrintLabel() {
		window.open(`/api/v1/documents/${documentId}/label`, '_blank');
	}

	async function handleCopyUrl() {
		try {
			await navigator.clipboard.writeText(documentUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// clipboard API may be unavailable in some embedded contexts
		}
	}

	// ── render ────────────────────────────────────────────────────────────────

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<QrCode className="h-5 w-5 text-muted-foreground" />
						Document QR Code
					</DialogTitle>
				</DialogHeader>

				{/* QR image area */}
				<div className="flex flex-col items-center gap-3 py-2">
					{isLoading && (
						<div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border bg-muted/30">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					)}

					{isError && (
						<div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive">
							Failed to load QR code
						</div>
					)}

					{qrUrl && !isLoading && (
						<img
							src={qrUrl}
							alt={`QR code for ${documentTitle}`}
							className="rounded-lg border shadow-sm"
							width={200}
							height={200}
						/>
					)}

					{/* Document title */}
					<p
						className="max-w-[200px] truncate text-center text-sm font-medium"
						title={documentTitle}
					>
						{documentTitle}
					</p>

					{/* URL chip */}
					<p className="max-w-full truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
						{documentUrl}
					</p>
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
					{/* Copy URL */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleCopyUrl}
						className="w-full sm:w-auto"
					>
						{copied ? (
							<>
								<Check className="mr-1.5 h-4 w-4 text-green-600" />
								Copied
							</>
						) : (
							<>
								<Copy className="mr-1.5 h-4 w-4" />
								Copy URL
							</>
						)}
					</Button>

					<div className="flex gap-2">
						{/* Download QR PNG */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleDownloadQR}
							disabled={!qrUrl || isLoading}
						>
							<Download className="mr-1.5 h-4 w-4" />
							Download QR
						</Button>

						{/* Print label — opens PDF in new tab */}
						<Button
							size="sm"
							onClick={handlePrintLabel}
						>
							<ExternalLink className="mr-1.5 h-4 w-4" />
							Print Label
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
