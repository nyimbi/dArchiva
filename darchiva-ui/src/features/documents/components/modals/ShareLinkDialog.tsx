// Share Link Dialog — create expiring share links and manage existing ones
import { Button } from '@/components/ui/button';
import {
	useCreateShareLink,
	useDeactivateShareLink,
	useShareLinks,
} from '@/features/documents/hooks/useShareLinks';
import {
	Check,
	Clock,
	Copy,
	Eye,
	KeyRound,
	Link2,
	Loader2,
	ShieldOff,
	X,
} from 'lucide-react';
import { useState } from 'react';

interface Props {
	open: boolean;
	documentId: string;
	documentTitle?: string;
	onClose: () => void;
}

type Expiry = '1h' | '24h' | '7d' | '30d' | 'never';

const EXPIRY_OPTIONS: { value: Expiry; label: string }[] = [
	{ value: '1h', label: '1 hour' },
	{ value: '24h', label: '24 hours' },
	{ value: '7d', label: '7 days' },
	{ value: '30d', label: '30 days' },
	{ value: 'never', label: 'Never expires' },
];

function formatExpiry(expiresAt: string | null): string {
	if (!expiresAt) return 'Never expires';
	const d = new Date(expiresAt);
	const now = new Date();
	if (d < now) return 'Expired';
	const diffMs = d.getTime() - now.getTime();
	const diffH = Math.floor(diffMs / 3_600_000);
	if (diffH < 24) return `Expires in ${diffH}h`;
	const diffD = Math.floor(diffH / 24);
	return `Expires in ${diffD}d`;
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1800);
	};

	return (
		<button
			onClick={handleCopy}
			title="Copy link"
			className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
		>
			{copied ? (
				<Check className="w-4 h-4 text-emerald-400" />
			) : (
				<Copy className="w-4 h-4" />
			)}
		</button>
	);
}

export function ShareLinkDialog({ open, documentId, documentTitle, onClose }: Props) {
	const [expiry, setExpiry] = useState<Expiry>('7d');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [maxViews, setMaxViews] = useState('');

	const { data: links, isLoading: linksLoading } = useShareLinks(documentId);
	const createLink = useCreateShareLink(documentId);
	const deactivate = useDeactivateShareLink(documentId);

	const handleCreate = async () => {
		await createLink.mutateAsync({
			expiry,
			password: password.trim() || undefined,
			maxViews: maxViews ? parseInt(maxViews, 10) : undefined,
		});
		setPassword('');
		setMaxViews('');
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
			/>
			<div className="relative z-10 w-full max-w-lg mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
					<div className="flex items-center gap-2">
						<Link2 className="w-5 h-5 text-brass-400" />
						<h3 className="font-semibold text-slate-100">Share link</h3>
						{documentTitle && (
							<span className="text-slate-400 text-sm truncate max-w-[200px]">
								— {documentTitle}
							</span>
						)}
					</div>
					<button
						onClick={onClose}
						className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Create form */}
				<div className="px-5 py-4 border-b border-slate-800">
					<p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
						New link
					</p>

					{/* Expiry */}
					<div className="mb-3">
						<label className="text-sm text-slate-300 mb-1.5 block">
							Expiry
						</label>
						<div className="flex flex-wrap gap-2">
							{EXPIRY_OPTIONS.map((opt) => (
								<button
									key={opt.value}
									onClick={() => setExpiry(opt.value)}
									className={`px-3 py-1 rounded-full text-sm transition-colors ${
										expiry === opt.value
											? 'bg-brass-500 text-slate-900 font-medium'
											: 'bg-slate-800 text-slate-300 hover:bg-slate-700'
									}`}
								>
									{opt.label}
								</button>
							))}
						</div>
					</div>

					{/* Password */}
					<div className="mb-3">
						<label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
							<KeyRound className="w-3.5 h-3.5" />
							Password
							<span className="text-slate-500">(optional)</span>
						</label>
						<div className="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Leave blank for no password"
								className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brass-500 pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
							>
								<Eye className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Max views */}
					<div className="mb-4">
						<label className="text-sm text-slate-300 mb-1.5 block flex items-center gap-1">
							<Eye className="w-3.5 h-3.5" />
							Max views
							<span className="text-slate-500">(optional)</span>
						</label>
						<input
							type="number"
							min="1"
							value={maxViews}
							onChange={(e) => setMaxViews(e.target.value)}
							placeholder="Unlimited"
							className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brass-500"
						/>
					</div>

					<Button
						onClick={handleCreate}
						disabled={createLink.isPending}
						className="w-full bg-brass-500 hover:bg-brass-600 text-slate-900 font-medium"
					>
						{createLink.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin mr-2" />
						) : (
							<Link2 className="w-4 h-4 mr-2" />
						)}
						Create share link
					</Button>

					{createLink.isError && (
						<p className="text-red-400 text-sm mt-2">
							Failed to create link. Please try again.
						</p>
					)}
				</div>

				{/* Existing links */}
				<div className="px-5 py-4 overflow-y-auto flex-1">
					<p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
						Existing links
					</p>

					{linksLoading ? (
						<div className="flex justify-center py-6">
							<Loader2 className="w-5 h-5 animate-spin text-slate-500" />
						</div>
					) : !links || links.length === 0 ? (
						<p className="text-sm text-slate-500 text-center py-4">
							No share links yet.
						</p>
					) : (
						<ul className="space-y-2">
							{links.map((link) => (
								<li
									key={link.id}
									className={`rounded-lg border px-3 py-2.5 ${
										link.isActive && link.isValid
											? 'border-slate-700 bg-slate-800'
											: 'border-slate-800 bg-slate-850 opacity-50'
									}`}
								>
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0">
											{/* URL row */}
											<div className="flex items-center gap-1 mb-1">
												<span className="text-xs text-slate-400 truncate font-mono">
													{link.url}
												</span>
												<CopyButton text={link.url} />
											</div>

											{/* Badges */}
											<div className="flex flex-wrap items-center gap-2">
												<span
													className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
														!link.isActive || !link.isValid
															? 'bg-slate-700 text-slate-400'
															: 'bg-emerald-900/50 text-emerald-400'
													}`}
												>
													<Clock className="w-3 h-3" />
													{formatExpiry(link.expiresAt)}
												</span>

												<span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
													<Eye className="w-3 h-3" />
													{link.viewCount}
													{link.maxViews != null
														? ` / ${link.maxViews} views`
														: ' views'}
												</span>

												{link.passwordProtected && (
													<span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">
														<KeyRound className="w-3 h-3" />
														Password
													</span>
												)}

												{!link.isActive && (
													<span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">
														Deactivated
													</span>
												)}
											</div>
										</div>

										{/* Deactivate button */}
										{link.isActive && (
											<button
												title="Deactivate link"
												disabled={deactivate.isPending}
												onClick={() => deactivate.mutate(link.id)}
												className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors flex-shrink-0"
											>
												{deactivate.isPending ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<ShieldOff className="w-4 h-4" />
												)}
											</button>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
