// API Token List - Warm Archival Theme
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
	Key, Plus, Trash2, Copy, Check, Clock, Shield, AlertTriangle,
	ChevronDown, ChevronUp, MoreHorizontal, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTokens, useDeleteToken, useRevokeToken } from '../api/hooks';
import { CreateTokenModal } from './CreateTokenModal';
import { DeleteTokenDialog } from './DeleteTokenDialog';
import type { APIToken } from '../types';
import '../styles/theme.css';

type SortField = 'name' | 'createdAt' | 'expiresAt' | 'lastUsedAt';
type SortDir = 'asc' | 'desc';

export function TokenList() {
	const { data, isLoading } = useTokens();
	const [showCreate, setShowCreate] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<APIToken | null>(null);
	const [sortField, setSortField] = useState<SortField>('createdAt');
	const [sortDir, setSortDir] = useState<SortDir>('desc');

	const tokens = data?.items ?? [];
	const sorted = [...tokens].sort((a, b) => {
		const aVal = a[sortField] ?? '';
		const bVal = b[sortField] ?? '';
		return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
	});

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDir('desc');
		}
	};

	const SortIcon = ({ field }: { field: SortField }) => (
		sortField === field ? (
			sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
		) : null
	);

	if (isLoading) {
		return (
			<div className="token-root p-8">
				<div className="token-card animate-pulse h-64" />
			</div>
		);
	}

	return (
		<div className="token-root min-h-screen p-8">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<div className="flex items-start justify-between mb-8 token-animate-in">
					<div>
						<h1 className="token-heading flex items-center gap-3">
							<Key className="w-7 h-7 text-[var(--token-accent)]" />
							API Tokens
						</h1>
						<p className="token-subtext mt-1">
							Personal access tokens for CLI tools, scripts, and integrations
						</p>
					</div>
					<Button onClick={() => setShowCreate(true)} className="token-btn-primary">
						<Plus className="w-4 h-4 mr-2" />
						Generate Token
					</Button>
				</div>

				{/* Token Table */}
				<div className="token-card token-animate-in" style={{ animationDelay: '0.1s' }}>
					{tokens.length === 0 ? (
						<div className="p-12 text-center">
							<Key className="w-12 h-12 mx-auto text-[var(--token-muted)] mb-4" />
							<p className="token-subtext">No API tokens yet</p>
							<p className="text-sm text-[var(--token-muted)] mt-1">
								Generate a token to access the API programmatically
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead>
									<tr className="border-b border-[var(--token-border)]">
										{(['name', 'createdAt', 'expiresAt', 'lastUsedAt'] as SortField[]).map(field => (
											<th
												key={field}
												onClick={() => handleSort(field)}
												className="token-th cursor-pointer hover:bg-[var(--token-hover)] transition-colors"
											>
												<span className="flex items-center gap-1">
													{field === 'name' ? 'Token Name' :
													 field === 'createdAt' ? 'Created' :
													 field === 'expiresAt' ? 'Expires' : 'Last Used'}
													<SortIcon field={field} />
												</span>
											</th>
										))}
										<th className="token-th text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{sorted.map((token, i) => (
										<TokenRow
											key={token.id}
											token={token}
											index={i}
											onDelete={() => setDeleteTarget(token)}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Security Note */}
				<div className="token-card-muted mt-6 flex items-start gap-3 token-animate-in" style={{ animationDelay: '0.2s' }}>
					<Shield className="w-5 h-5 text-[var(--token-gold)] flex-shrink-0 mt-0.5" />
					<div>
						<p className="font-medium text-[var(--token-text)]">Security Note</p>
						<p className="text-sm text-[var(--token-muted)] mt-0.5">
							Tokens provide full API access. Keep them secret and rotate regularly.
							Revoke any token you suspect has been compromised.
						</p>
					</div>
				</div>
			</div>

			<CreateTokenModal open={showCreate} onClose={() => setShowCreate(false)} />
			<DeleteTokenDialog token={deleteTarget} onClose={() => setDeleteTarget(null)} />
		</div>
	);
}

function TokenRow({ token, index, onDelete }: { token: APIToken; index: number; onDelete: () => void }) {
	const [copied, setCopied] = useState(false);
	const revokeToken = useRevokeToken();
	const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
	const expiresSoon = token.expiresAt && !isExpired &&
		new Date(token.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	const copyPrefix = () => {
		navigator.clipboard.writeText(token.tokenPrefix);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const formatDate = (date: string | null) => {
		if (!date) return '—';
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	};

	const relativeTime = (date: string | null) => {
		if (!date) return 'Never';
		const diff = Date.now() - new Date(date).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 30) return `${days} days ago`;
		return formatDate(date);
	};

	return (
		<tr
			className="token-row group"
			style={{ animationDelay: `${0.05 * index}s` }}
		>
			<td className="token-td">
				<div className="flex items-center gap-3">
					<div className="token-icon-box">
						<Key className="w-4 h-4" />
					</div>
					<div>
						<p className="font-medium text-[var(--token-text)]">{token.name}</p>
						<div className="flex items-center gap-2 mt-0.5">
							<code className="token-prefix">{token.tokenPrefix}•••••••</code>
							<button onClick={copyPrefix} className="token-copy-btn">
								{copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
							</button>
						</div>
					</div>
				</div>
			</td>
			<td className="token-td text-[var(--token-muted)]">
				{formatDate(token.createdAt)}
			</td>
			<td className="token-td">
				{isExpired ? (
					<Badge variant="destructive" className="token-badge-expired">
						<AlertTriangle className="w-3 h-3 mr-1" /> Expired
					</Badge>
				) : expiresSoon ? (
					<Badge className="token-badge-warning">
						<Clock className="w-3 h-3 mr-1" /> {formatDate(token.expiresAt)}
					</Badge>
				) : (
					<span className="text-[var(--token-muted)]">
						{token.expiresAt ? formatDate(token.expiresAt) : 'Never'}
					</span>
				)}
			</td>
			<td className="token-td text-[var(--token-muted)]">
				{relativeTime(token.lastUsedAt)}
			</td>
			<td className="token-td text-right">
				<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={() => revokeToken.mutate(token.id)}
						className="token-action-btn text-[var(--token-warning)]"
						title="Revoke token"
					>
						<RefreshCw className="w-4 h-4" />
					</button>
					<button
						onClick={onDelete}
						className="token-action-btn text-[var(--token-danger)]"
						title="Delete token"
					>
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</td>
		</tr>
	);
}

// Scope badges component
export function ScopeBadges({ scopes }: { scopes: string[] }) {
	if (!scopes.length) return <span className="text-[var(--token-muted)]">No scopes</span>;

	const grouped = scopes.reduce((acc, scope) => {
		const [group] = scope.split(':');
		acc[group] = (acc[group] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	return (
		<div className="flex flex-wrap gap-1">
			{Object.entries(grouped).map(([group, count]) => (
				<Badge key={group} variant="secondary" className="token-scope-badge">
					{group} ({count})
				</Badge>
			))}
		</div>
	);
}
