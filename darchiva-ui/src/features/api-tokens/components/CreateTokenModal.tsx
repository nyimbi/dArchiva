// Create Token Modal - Warm Archival Theme
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
	X, Key, Copy, Check, Eye, EyeOff, AlertTriangle, Shield, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateToken } from '../api/hooks';
import { SCOPE_GROUPS, EXPIRY_OPTIONS, type TokenScope, type APITokenCreated } from '../types';

interface Props {
	open: boolean;
	onClose: () => void;
}

type Step = 'configure' | 'reveal';

export function CreateTokenModal({ open, onClose }: Props) {
	const createToken = useCreateToken();
	const [step, setStep] = useState<Step>('configure');
	const [name, setName] = useState('');
	const [scopes, setScopes] = useState<Set<TokenScope>>(new Set());
	const [expiry, setExpiry] = useState('90');
	const [createdToken, setCreatedToken] = useState<APITokenCreated | null>(null);
	const [copied, setCopied] = useState(false);
	const [showToken, setShowToken] = useState(false);

	const reset = useCallback(() => {
		setStep('configure');
		setName('');
		setScopes(new Set());
		setExpiry('90');
		setCreatedToken(null);
		setCopied(false);
		setShowToken(false);
	}, []);

	const handleClose = () => {
		reset();
		onClose();
	};

	const toggleScope = (scope: TokenScope) => {
		setScopes(prev => {
			const next = new Set(prev);
			next.has(scope) ? next.delete(scope) : next.add(scope);
			return next;
		});
	};

	const selectAllInGroup = (groupScopes: TokenScope[]) => {
		setScopes(prev => {
			const next = new Set(prev);
			const allSelected = groupScopes.every(s => next.has(s));
			groupScopes.forEach(s => allSelected ? next.delete(s) : next.add(s));
			return next;
		});
	};

	const handleCreate = async () => {
		const result = await createToken.mutateAsync({
			name,
			scopes: Array.from(scopes),
			expiresInDays: expiry === 'never' ? undefined : parseInt(expiry),
		});
		setCreatedToken(result);
		setStep('reveal');
	};

	const copyToken = () => {
		if (createdToken) {
			navigator.clipboard.writeText(createdToken.token);
			setCopied(true);
			setTimeout(() => setCopied(false), 3000);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
			<div className="token-modal relative z-10 w-full max-w-lg mx-4 token-modal-animate">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-[var(--token-border)]">
					<div className="flex items-center gap-3">
						<div className="token-icon-box-lg">
							<Key className="w-5 h-5" />
						</div>
						<div>
							<h2 className="font-display text-lg font-semibold text-[var(--token-text)]">
								{step === 'configure' ? 'Generate API Token' : 'Token Created'}
							</h2>
							<p className="text-sm text-[var(--token-muted)]">
								{step === 'configure' ? 'Configure access permissions' : 'Save this token now'}
							</p>
						</div>
					</div>
					<button onClick={handleClose} className="token-close-btn">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 max-h-[60vh] overflow-y-auto">
					{step === 'configure' ? (
						<div className="space-y-5">
							{/* Token Name */}
							<div>
								<label className="token-label">Token Name</label>
								<input
									type="text"
									value={name}
									onChange={e => setName(e.target.value)}
									placeholder="e.g., CI Pipeline, Local Dev"
									className="token-input"
								/>
							</div>

							{/* Expiration */}
							<div>
								<label className="token-label">Expiration</label>
								<div className="grid grid-cols-5 gap-2">
									{EXPIRY_OPTIONS.map(opt => (
										<button
											key={opt.value}
											onClick={() => setExpiry(opt.value)}
											className={cn(
												'token-expiry-btn',
												expiry === opt.value && 'token-expiry-btn-active'
											)}
										>
											{opt.label}
										</button>
									))}
								</div>
							</div>

							{/* Scopes */}
							<div>
								<label className="token-label">Permissions</label>
								<div className="space-y-3">
									{Object.entries(SCOPE_GROUPS).map(([key, group]) => {
										const allSelected = group.scopes.every(s => scopes.has(s));
										const someSelected = group.scopes.some(s => scopes.has(s));
										return (
											<div key={key} className="token-scope-group">
												<button
													onClick={() => selectAllInGroup(group.scopes)}
													className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-[var(--token-hover)]"
												>
													<div className={cn(
														'token-checkbox',
														allSelected && 'token-checkbox-checked',
														someSelected && !allSelected && 'token-checkbox-partial'
													)} />
													<span className="font-medium text-[var(--token-text)]">{group.label}</span>
												</button>
												<div className="ml-6 mt-1 space-y-1">
													{group.scopes.map(scope => (
														<label key={scope} className="token-scope-item">
															<input
																type="checkbox"
																checked={scopes.has(scope)}
																onChange={() => toggleScope(scope)}
																className="token-checkbox-input"
															/>
															<code className="text-xs">{scope}</code>
														</label>
													))}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-5">
							{/* Warning */}
							<div className="token-warning-box">
								<AlertTriangle className="w-5 h-5 text-[var(--token-warning)] flex-shrink-0" />
								<div>
									<p className="font-medium text-[var(--token-warning)]">Copy your token now</p>
									<p className="text-sm text-[var(--token-muted)] mt-0.5">
										This is the only time you'll see this token. Store it securely.
									</p>
								</div>
							</div>

							{/* Token Display */}
							<div className="token-reveal-box">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium text-[var(--token-text)]">{createdToken?.name}</span>
									<button onClick={() => setShowToken(!showToken)} className="token-copy-btn">
										{showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
								<div className="relative">
									<code className="token-value block">
										{showToken ? createdToken?.token : '•'.repeat(48)}
									</code>
									<button
										onClick={copyToken}
										className={cn(
											'token-copy-big',
											copied && 'token-copy-big-success'
										)}
									>
										{copied ? (
											<><Check className="w-4 h-4" /> Copied!</>
										) : (
											<><Copy className="w-4 h-4" /> Copy</>
										)}
									</button>
								</div>
							</div>

							{/* Token Info */}
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="token-info-item">
									<Clock className="w-4 h-4 text-[var(--token-muted)]" />
									<span className="text-[var(--token-muted)]">Expires:</span>
									<span className="text-[var(--token-text)]">
										{createdToken?.expiresAt
											? new Date(createdToken.expiresAt).toLocaleDateString()
											: 'Never'}
									</span>
								</div>
								<div className="token-info-item">
									<Shield className="w-4 h-4 text-[var(--token-muted)]" />
									<span className="text-[var(--token-muted)]">Scopes:</span>
									<span className="text-[var(--token-text)]">{scopes.size}</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--token-border)]">
					{step === 'configure' ? (
						<>
							<Button variant="ghost" onClick={handleClose}>Cancel</Button>
							<Button
								onClick={handleCreate}
								disabled={!name.trim() || createToken.isPending}
								className="token-btn-primary"
							>
								{createToken.isPending ? 'Generating...' : 'Generate Token'}
							</Button>
						</>
					) : (
						<Button onClick={handleClose} className="token-btn-primary">
							Done
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
