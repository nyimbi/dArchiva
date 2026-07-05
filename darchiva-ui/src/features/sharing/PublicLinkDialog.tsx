// (c) Copyright Datacraft, 2026
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
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Link2, Loader2, QrCode, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type PublicLinkExpiry = '1h' | '24h' | '7d' | '30d' | 'never';
type PublicLinkPermission = 'view' | 'download' | 'comment';

interface PublicLinkDialogProps {
	documentId: string;
	documentTitle: string;
	open: boolean;
	onClose: () => void;
}

interface PublicLinkRecord {
	id?: string;
	url?: string;
	link?: string;
	signedUrl?: string;
	signed_url?: string;
	expiresAt?: string | null;
	expires_at?: string | null;
	permissions?: PublicLinkPermission[];
	permission?: PublicLinkPermission;
	isActive?: boolean;
	is_active?: boolean;
}

const EXPIRY_OPTIONS: { value: PublicLinkExpiry; label: string }[] = [
	{ value: '1h', label: '1 hour' },
	{ value: '24h', label: '24 hours' },
	{ value: '7d', label: '7 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'never', label: 'Never' },
];

const PERMISSION_OPTIONS: { value: PublicLinkPermission; label: string }[] = [
	{ value: 'view', label: 'View only' },
	{ value: 'download', label: 'Download allowed' },
	{ value: 'comment', label: 'Comment allowed' },
];

const publicLinkKeys = {
	byNode: (nodeId: string) => ['public-link', nodeId] as const,
};

function linkUrl(link: PublicLinkRecord | null | undefined): string {
	return link?.url ?? link?.signedUrl ?? link?.signed_url ?? link?.link ?? '';
}

function usePublicLink(nodeId: string, open: boolean) {
	return useQuery({
		queryKey: publicLinkKeys.byNode(nodeId),
		queryFn: async () => {
			try {
				const { data } = await apiClient.get<PublicLinkRecord>(`/nodes/${nodeId}/public-link`);
				return data;
			} catch (err: any) {
				if (err?.response?.status === 404 || err?.status === 404) return null;
				throw err;
			}
		},
		enabled: !!nodeId && open,
	});
}

function useCreatePublicLink(nodeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			expiry,
			permission,
		}: {
			expiry: PublicLinkExpiry;
			permission: PublicLinkPermission;
		}) => {
			const { data } = await apiClient.post<PublicLinkRecord>(
				`/nodes/${nodeId}/public-link`,
				{
					expiry,
					permission,
					permissions: permission === 'view' ? ['view'] : ['view', permission],
				},
			);
			return data;
		},
		onSuccess: (data) => {
			queryClient.setQueryData(publicLinkKeys.byNode(nodeId), data);
			queryClient.invalidateQueries({ queryKey: publicLinkKeys.byNode(nodeId) });
		},
	});
}

function useRevokePublicLink(nodeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await apiClient.delete(`/nodes/${nodeId}/public-link`);
		},
		onSuccess: () => {
			queryClient.setQueryData(publicLinkKeys.byNode(nodeId), null);
			queryClient.invalidateQueries({ queryKey: publicLinkKeys.byNode(nodeId) });
		},
	});
}

function PublicLinkQr({ value }: { value: string }) {
	const cells = useMemo(() => {
		const size = 25;
		let seed = 0;
		for (let i = 0; i < value.length; i += 1) {
			seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
		}
		const finder = (x: number, y: number) =>
			(x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
		return Array.from({ length: size * size }, (_, index) => {
			const x = index % size;
			const y = Math.floor(index / size);
			if (finder(x, y)) {
				const inTopRight = x >= size - 7;
				const fx = inTopRight ? x - (size - 7) : x;
				const fy = y >= size - 7 ? y - (size - 7) : y;
				return (
					fx === 0 ||
					fx === 6 ||
					fy === 0 ||
					fy === 6 ||
					(fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
				);
			}
			seed = (seed * 1664525 + 1013904223 + x * 17 + y * 29) >>> 0;
			return ((seed >>> 28) & 1) === 1;
		});
	}, [value]);

	return (
		<svg
			viewBox="0 0 25 25"
			role="img"
			aria-label="Public link QR code"
			className="h-36 w-36 rounded-md bg-white p-2"
			shapeRendering="crispEdges"
		>
			<rect width="25" height="25" fill="white" />
			{cells.map((filled, index) =>
				filled ? (
					<rect
						key={index}
						x={index % 25}
						y={Math.floor(index / 25)}
						width="1"
						height="1"
						fill="#020617"
					/>
				) : null,
			)}
		</svg>
	);
}

function CopyLinkButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 2000);
	}

	return (
		<Button type="button" variant="outline" size="icon" onClick={handleCopy} disabled={!value}>
			{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
		</Button>
	);
}

export function PublicLinkDialog({
	documentId,
	documentTitle,
	open,
	onClose,
}: PublicLinkDialogProps) {
	const [expiry, setExpiry] = useState<PublicLinkExpiry>('7d');
	const [permission, setPermission] = useState<PublicLinkPermission>('view');
	const { data: existingLink, isLoading, isError } = usePublicLink(documentId, open);
	const createLink = useCreatePublicLink(documentId);
	const revokeLink = useRevokePublicLink(documentId);

	const currentLink = createLink.data ?? existingLink ?? null;
	const url = linkUrl(currentLink);
	const expiresAt = currentLink?.expiresAt ?? currentLink?.expires_at ?? null;

	async function handleGenerate() {
		await createLink.mutateAsync({ expiry, permission });
	}

	async function handleRevoke() {
		await revokeLink.mutateAsync();
		createLink.reset();
	}

	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						Create Public Link
					</DialogTitle>
					<DialogDescription className="truncate">{documentTitle}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label htmlFor="public-link-expiry">Expiry</Label>
							<Select value={expiry} onValueChange={(value) => setExpiry(value as PublicLinkExpiry)}>
								<SelectTrigger id="public-link-expiry">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{EXPIRY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="public-link-permissions">Permissions</Label>
							<Select
								value={permission}
								onValueChange={(value) => setPermission(value as PublicLinkPermission)}
							>
								<SelectTrigger id="public-link-permissions">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PERMISSION_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<Button type="button" onClick={handleGenerate} disabled={createLink.isPending}>
						{createLink.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<ShieldCheck className="mr-2 h-4 w-4" />
						)}
						Generate signed URL
					</Button>

					<Separator />

					{isLoading && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Checking for existing public link...
						</div>
					)}

					{isError && (
						<p className="text-sm text-destructive">Could not load existing public link.</p>
					)}

					{url ? (
						<div className="grid gap-4 sm:grid-cols-[1fr_auto]">
							<div className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="generated-public-link">Generated link</Label>
									<div className="flex gap-2">
										<Input id="generated-public-link" value={url} readOnly className="font-mono text-xs" />
										<CopyLinkButton value={url} />
									</div>
								</div>
								<div className="flex flex-wrap gap-2">
									<Badge variant="outline">
										{PERMISSION_OPTIONS.find((option) => option.value === permission)?.label ?? 'View only'}
									</Badge>
									<Badge variant="secondary">
										{expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : 'Never expires'}
									</Badge>
								</div>
								<Button
									type="button"
									variant="outline"
									onClick={handleRevoke}
									disabled={revokeLink.isPending}
									className="text-destructive hover:text-destructive"
								>
									{revokeLink.isPending ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<X className="mr-2 h-4 w-4" />
									)}
									Revoke link
								</Button>
							</div>
							<div className="flex flex-col items-center gap-2 rounded-md border bg-muted/30 p-3">
								<QrCode className="h-4 w-4 text-muted-foreground" />
								<PublicLinkQr value={url} />
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							No public link is active for this document.
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
