import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestSignature } from './api';

interface Props {
	documentId: string;
	open: boolean;
	onClose: () => void;
}

export function SignatureRequestDialog({ documentId, open, onClose }: Props) {
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const [page, setPage] = useState(1);

	const { mutate: requestSignature, isPending, error } = useRequestSignature(documentId);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		requestSignature(
			{
				requestedFromEmail: email.trim(),
				requestedFromName: name.trim(),
				signaturePage: page,
			},
			{
				onSuccess: () => {
					setEmail('');
					setName('');
					setPage(1);
					onClose();
				},
			},
		);
	}

	// Normalised position: x=0.7, y=0.85, w=0.25, h=0.1 (defaults)
	const previewX = 0.7;
	const previewY = 0.85;
	const previewW = 0.25;
	const previewH = 0.1;

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Request Signature</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="sig-email">Signer email *</Label>
						<Input
							id="sig-email"
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="signer@example.com"
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="sig-name">Signer name</Label>
						<Input
							id="sig-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Full name (optional)"
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="sig-page">Page number</Label>
						<Input
							id="sig-page"
							type="number"
							min={1}
							value={page}
							onChange={(e) => setPage(Math.max(1, parseInt(e.target.value) || 1))}
						/>
					</div>

					{/* Signature position preview */}
					<div className="space-y-1">
						<Label>Signature position preview</Label>
						<div
							className="relative border rounded bg-white"
							style={{ width: '100%', paddingBottom: '141.4%' /* A4 aspect ratio */ }}
							aria-label="Page preview showing signature placement"
						>
							<div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground select-none">
								Page {page}
							</div>
							{/* Signature placement indicator */}
							<div
								className="absolute border-2 border-blue-500 bg-blue-100/40 rounded flex items-center justify-center"
								style={{
									left: `${previewX * 100}%`,
									top: `${previewY * 100}%`,
									width: `${previewW * 100}%`,
									height: `${previewH * 100}%`,
								}}
							>
								<span className="text-[10px] text-blue-700 font-medium truncate px-1">
									Sign here
								</span>
							</div>
						</div>
						<p className="text-xs text-muted-foreground">
							Signature will appear at bottom-right of the page.
						</p>
					</div>

					{error && (
						<p className="text-sm text-destructive">
							Failed to send request. Please try again.
						</p>
					)}

					<DialogFooter className="gap-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending || !email.trim()}>
							{isPending ? 'Sending…' : 'Send Request'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
