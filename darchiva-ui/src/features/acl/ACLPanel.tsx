// (c) Copyright Datacraft, 2026
/**
 * ACLPanel — per-resource access control list UI.
 * Shows who has access to a document or folder, lets the owner grant/revoke.
 *
 * Props:
 *   documentId   — resource UUID
 *   resourceType — 'document' | 'folder' (default: 'document')
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Crown, Lock, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
	useDocumentACL,
	useGrantAccess,
	useMyPermissions,
	useRevokeAccess,
} from './api';
import type { ACLEntry, GrantAccessInput, ResourceType } from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string): string {
	return name
		.split(/\s+/)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.slice(0, 2)
		.join('');
}

function Avatar({ name }: { name: string }) {
	return (
		<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground select-none">
			{initials(name)}
		</span>
	);
}

// ---------------------------------------------------------------------------
// Grant access dialog
// ---------------------------------------------------------------------------

interface GrantDialogProps {
	open: boolean;
	onClose: () => void;
	resourceType: ResourceType;
	resourceId: string;
}

function GrantDialog({ open, onClose, resourceType, resourceId }: GrantDialogProps) {
	const grantAccess = useGrantAccess();
	const [principalName, setPrincipalName] = useState('');
	const [principalId, setPrincipalId] = useState('');
	const [principalType, setPrincipalType] = useState<'user' | 'group'>('user');
	const [canWrite, setCanWrite] = useState(false);
	const [canDelete, setCanDelete] = useState(false);
	const [canShare, setCanShare] = useState(false);
	const [expiresAt, setExpiresAt] = useState('');
	const [error, setError] = useState('');

	function reset() {
		setPrincipalName('');
		setPrincipalId('');
		setPrincipalType('user');
		setCanWrite(false);
		setCanDelete(false);
		setCanShare(false);
		setExpiresAt('');
		setError('');
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');
		if (!principalName.trim() || !principalId.trim()) {
			setError('Name and ID are required.');
			return;
		}
		const input: GrantAccessInput = {
			principal_type: principalType,
			principal_id: principalId.trim(),
			principal_name: principalName.trim(),
			can_read: true,
			can_write: canWrite,
			can_delete: canDelete,
			can_share: canShare,
			expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
		};
		try {
			await grantAccess.mutateAsync({ resourceType, resourceId, input });
			reset();
			onClose();
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { detail?: string } } })?.response?.data
					?.detail ?? 'Failed to grant access.';
			setError(msg);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Grant Access</DialogTitle>
					<DialogDescription>
						Add a user or group to this {resourceType}.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-2">
					<div className="flex gap-2">
						<Button
							type="button"
							variant={principalType === 'user' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setPrincipalType('user')}
						>
							User
						</Button>
						<Button
							type="button"
							variant={principalType === 'group' ? 'default' : 'outline'}
							size="sm"
							onClick={() => setPrincipalType('group')}
						>
							Group
						</Button>
					</div>

					<div className="space-y-1">
						<Label htmlFor="principal-name">
							{principalType === 'user' ? 'Email / Name' : 'Group Name'}
						</Label>
						<Input
							id="principal-name"
							placeholder={principalType === 'user' ? 'alice@example.com' : 'Engineering'}
							value={principalName}
							onChange={(e) => setPrincipalName(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="principal-id">
							{principalType === 'user' ? 'User ID' : 'Group ID'}
						</Label>
						<Input
							id="principal-id"
							placeholder="UUID"
							value={principalId}
							onChange={(e) => setPrincipalId(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Permissions</Label>
						<div className="flex flex-wrap gap-4 pt-1">
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox checked disabled />
								Read
							</label>
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox
									checked={canWrite}
									onCheckedChange={(v) => setCanWrite(Boolean(v))}
								/>
								Write
							</label>
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox
									checked={canDelete}
									onCheckedChange={(v) => setCanDelete(Boolean(v))}
								/>
								Delete
							</label>
							<label className="flex items-center gap-2 text-sm cursor-pointer">
								<Checkbox
									checked={canShare}
									onCheckedChange={(v) => setCanShare(Boolean(v))}
								/>
								Share
							</label>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="expires-at">Expiry (optional)</Label>
						<Input
							id="expires-at"
							type="datetime-local"
							value={expiresAt}
							onChange={(e) => setExpiresAt(e.target.value)}
						/>
					</div>

					{error && (
						<p className="text-sm text-destructive">{error}</p>
					)}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => { reset(); onClose(); }}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={grantAccess.isPending}>
							{grantAccess.isPending && (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							)}
							Grant Access
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Single ACL row
// ---------------------------------------------------------------------------

interface ACLRowProps {
	entry: ACLEntry;
	canManage: boolean;
	resourceType: ResourceType;
	resourceId: string;
}

function ACLRow({ entry, canManage, resourceType, resourceId }: ACLRowProps) {
	const revokeAccess = useRevokeAccess();

	function handleRevoke() {
		revokeAccess.mutate({
			resourceType,
			resourceId,
			aclId: entry.id,
		});
	}

	const expiryLabel = entry.expires_at
		? `Expires ${formatDistanceToNow(parseISO(entry.expires_at), { addSuffix: true })}`
		: null;

	return (
		<div className="flex items-center gap-3 py-2">
			<Avatar name={entry.principal_name} />

			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{entry.principal_name}</p>
				<p className="text-xs text-muted-foreground capitalize">
					{entry.principal_type}
					{expiryLabel && (
						<span className="ml-2 text-amber-600">{expiryLabel}</span>
					)}
				</p>
			</div>

			<div className="flex items-center gap-1 flex-shrink-0">
				<Badge variant="secondary" className="text-xs">Read</Badge>
				{entry.can_write && (
					<Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
						Write
					</Badge>
				)}
				{entry.can_delete && (
					<Badge variant="outline" className="text-xs border-red-400 text-red-700">
						Delete
					</Badge>
				)}
				{entry.can_share && (
					<Badge variant="outline" className="text-xs">Share</Badge>
				)}
			</div>

			{canManage && (
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-destructive"
					onClick={handleRevoke}
					disabled={revokeAccess.isPending}
					title="Revoke access"
				>
					{revokeAccess.isPending ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : (
						<Trash2 className="h-3 w-3" />
					)}
				</Button>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export interface ACLPanelProps {
	documentId: string;
	resourceType?: ResourceType;
}

export function ACLPanel({ documentId, resourceType = 'document' }: ACLPanelProps) {
	const [grantOpen, setGrantOpen] = useState(false);

	const { data: entries = [], isLoading, isError } = useDocumentACL(resourceType, documentId);
	const { data: myPerms } = useMyPermissions(resourceType, documentId);

	// User can manage ACL if they have the share permission
	const canManage = myPerms?.can_share ?? false;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Lock className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Access Control</span>
				</div>
				{canManage && (
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-xs gap-1"
						onClick={() => setGrantOpen(true)}
					>
						<UserPlus className="h-3 w-3" />
						Grant Access
					</Button>
				)}
			</div>

			<Separator />

			{isLoading && (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				</div>
			)}

			{isError && (
				<p className="text-xs text-destructive py-2">Failed to load ACL entries.</p>
			)}

			{!isLoading && !isError && entries.length === 0 && (
				<div className="py-4 text-center space-y-1">
					<Crown className="h-6 w-6 text-muted-foreground mx-auto" />
					<p className="text-xs text-muted-foreground">
						Only you have access to this {resourceType}.
					</p>
				</div>
			)}

			{!isLoading && entries.length > 0 && (
				<div className="divide-y">
					{entries.map((entry) => (
						<ACLRow
							key={entry.id}
							entry={entry}
							canManage={canManage}
							resourceType={resourceType}
							resourceId={documentId}
						/>
					))}
				</div>
			)}

			<GrantDialog
				open={grantOpen}
				onClose={() => setGrantOpen(false)}
				resourceType={resourceType}
				resourceId={documentId}
			/>
		</div>
	);
}
