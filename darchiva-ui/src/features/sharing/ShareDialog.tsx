// (c) Copyright Datacraft, 2026
/**
 * External document sharing dialog.
 * Lets authenticated users create time-limited public share links,
 * view active links, copy them, and revoke them.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
	Check,
	Clock,
	Copy,
	Eye,
	Link2,
	Loader2,
	Lock,
	X,
} from 'lucide-react';
import { useState } from 'react';
import { useCreateShare, useDocumentShares, useRevokeShare } from './api';
import type { CreateShareLinkInput, ShareLink } from './api';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShareDialogProps {
	documentId: string;
	documentTitle: string;
	open: boolean;
	onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ExpiryOption = CreateShareLinkInput['expiry'];

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
	{ value: '1h', label: '1 hour' },
	{ value: '24h', label: '24 hours' },
	{ value: '7d', label: '7 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'never', label: 'Never' },
];

function ExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
	if (!expiresAt) {
		return (
			<Badge variant="secondary" className="text-xs">
				Never expires
			</Badge>
		);
	}
	const date = parseISO(expiresAt);
	const now = new Date();
	if (date < now) {
		return (
			<Badge variant="destructive" className="text-xs">
				Expired
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="text-xs gap-1">
			<Clock className="w-3 h-3" />
			{formatDistanceToNow(date, { addSuffix: true })}
		</Badge>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Button
			size="icon"
			variant="ghost"
			className="h-7 w-7 shrink-0"
			onClick={handleCopy}
			title="Copy link"
		>
			{copied ? (
				<Check className="h-3.5 w-3.5 text-green-600" />
			) : (
				<Copy className="h-3.5 w-3.5" />
			)}
		</Button>
	);
}

// ---------------------------------------------------------------------------
// ActiveLinkRow
// ---------------------------------------------------------------------------

function ActiveLinkRow({
	link,
	documentId,
}: {
	link: ShareLink;
	documentId: string;
}) {
	const revoke = useRevokeShare();

	return (
		<div className="flex items-start gap-2 rounded-md border p-3 text-sm">
			<Link2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-1.5 flex-wrap">
					<ExpiryBadge expiresAt={link.expires_at} />
					{link.password_protected && (
						<Badge variant="outline" className="text-xs gap-1">
							<Lock className="w-3 h-3" />
							Password
						</Badge>
					)}
					{link.max_views != null && (
						<Badge variant="outline" className="text-xs gap-1">
							<Eye className="w-3 h-3" />
							{link.view_count}/{link.max_views} views
						</Badge>
					)}
					{!link.is_valid && link.is_active && (
						<Badge variant="destructive" className="text-xs">
							Exhausted
						</Badge>
					)}
				</div>
				<p className="truncate text-xs text-muted-foreground font-mono">
					{link.url}
				</p>
			</div>
			<div className="flex items-center gap-1 shrink-0">
				<CopyButton text={link.url} />
				<Button
					size="icon"
					variant="ghost"
					className="h-7 w-7 text-destructive hover:text-destructive"
					disabled={revoke.isPending}
					onClick={() =>
						revoke.mutate({ documentId, linkId: link.id })
					}
					title="Revoke link"
				>
					{revoke.isPending ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<X className="h-3.5 w-3.5" />
					)}
				</Button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ShareDialog({
	documentId,
	documentTitle,
	open,
	onClose,
}: ShareDialogProps) {
	const [expiry, setExpiry] = useState<ExpiryOption>('7d');
	const [usePassword, setUsePassword] = useState(false);
	const [password, setPassword] = useState('');
	const [maxViews, setMaxViews] = useState('');

	const { data: links = [], isLoading } = useDocumentShares(documentId);
	const createShare = useCreateShare();

	const activeLinks = links.filter((l) => l.is_active);

	async function handleCreate() {
		const input: CreateShareLinkInput = { expiry };
		if (usePassword && password) input.password = password;
		const views = parseInt(maxViews, 10);
		if (!isNaN(views) && views > 0) input.max_views = views;

		await createShare.mutateAsync({ documentId, input });

		// Reset form
		setPassword('');
		setMaxViews('');
		setUsePassword(false);
		setExpiry('7d');
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-4 w-4" />
						Share Link
					</DialogTitle>
					<DialogDescription className="truncate">
						{documentTitle}
					</DialogDescription>
				</DialogHeader>

				{/* ── Create section ─────────────────────────────────────── */}
				<div className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="expiry-select">Expires</Label>
						<Select
							value={expiry}
							onValueChange={(v) => setExpiry(v as ExpiryOption)}
						>
							<SelectTrigger id="expiry-select">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{EXPIRY_OPTIONS.map((o) => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between">
						<Label
							htmlFor="password-toggle"
							className="cursor-pointer"
						>
							Password protect
						</Label>
						<Switch
							id="password-toggle"
							checked={usePassword}
							onCheckedChange={setUsePassword}
						/>
					</div>

					{usePassword && (
						<div className="space-y-1.5">
							<Label htmlFor="share-password">Password</Label>
							<div className="relative">
								<Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
								<Input
									id="share-password"
									type="password"
									placeholder="Enter password"
									className="pl-8"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
								/>
							</div>
						</div>
					)}

					<div className="space-y-1.5">
						<Label htmlFor="max-views">
							Max views{' '}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</Label>
						<Input
							id="max-views"
							type="number"
							min={1}
							placeholder="Unlimited"
							value={maxViews}
							onChange={(e) => setMaxViews(e.target.value)}
						/>
					</div>

					<Button
						className="w-full"
						onClick={handleCreate}
						disabled={
							createShare.isPending ||
							(usePassword && !password)
						}
					>
						{createShare.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating…
							</>
						) : (
							<>
								<Link2 className="mr-2 h-4 w-4" />
								Create Link
							</>
						)}
					</Button>
				</div>

				{/* ── Active links section ────────────────────────────────── */}
				{(isLoading || activeLinks.length > 0) && (
					<>
						<Separator />
						<div className="space-y-2">
							<p className="text-sm font-medium">Active Links</p>
							{isLoading ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading…
								</div>
							) : (
								<div className="space-y-2 max-h-56 overflow-y-auto pr-1">
									{activeLinks.map((link) => (
										<ActiveLinkRow
											key={link.id}
											link={link}
											documentId={documentId}
										/>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
