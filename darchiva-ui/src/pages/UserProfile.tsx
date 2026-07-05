// (c) Copyright Datacraft, 2026
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
	AlertTriangle,
	Camera,
	KeyRound,
	Plus,
	QrCode,
	Shield,
	Trash2,
} from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';

interface ApiToken {
	id: string;
	name: string;
	lastUsed?: string;
}

interface ProfileForm {
	firstName: string;
	lastName: string;
	email: string;
	jobTitle: string;
	department: string;
	phone: string;
	avatarUrl?: string;
	twoFactorEnabled?: boolean;
	apiTokens: ApiToken[];
}

interface TwoFactorSetupResponse {
	qr_code?: string;  // base64 PNG/SVG or data URI
	qr_url?: string;   // URL to QR image
	secret?: string;   // TOTP secret for manual entry
}

const emptyProfile: ProfileForm = {
	firstName: '',
	lastName: '',
	email: '',
	jobTitle: '',
	department: '',
	phone: '',
	apiTokens: [],
};

function passwordScore(password: string) {
	let score = 0;
	if (password.length >= 8) score += 1;
	if (/[A-Z]/.test(password)) score += 1;
	if (/[0-9]/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;
	return score;
}

export function UserProfile() {
	const [profile, setProfile] = useState<ProfileForm>(emptyProfile);
	const [avatarFileName, setAvatarFileName] = useState('');
	const [avatarUploading, setAvatarUploading] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
	const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
	const [twoFactorSetting, setTwoFactorSetting] = useState(false);

	useEffect(() => {
		let mounted = true;
		const loadProfile = async () => {
			setLoading(true);
			setError(null);
			try {
				const { data } = await apiClient.get<Partial<ProfileForm> & { tokens?: ApiToken[] }>('/users/me');
				if (!mounted) return;
				setProfile({
					...emptyProfile,
					...data,
					apiTokens: data.apiTokens ?? data.tokens ?? [],
				});
			} catch {
				if (mounted) setError('Could not load your profile.');
			} finally {
				if (mounted) setLoading(false);
			}
		};

		loadProfile();
		return () => {
			mounted = false;
		};
	}, []);

	const initials = useMemo(() => {
		const value = `${profile.firstName} ${profile.lastName}`.trim() || profile.email || 'User';
		return value
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('');
	}, [profile.email, profile.firstName, profile.lastName]);

	const score = passwordScore(newPassword);
	const scoreLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
	const passwordMismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

	const updateField = (field: keyof ProfileForm, value: string) => {
		setProfile((current) => ({ ...current, [field]: value }));
	};

	// Bug fix #1: upload avatar to API on file pick, update avatarUrl from response
	const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		setAvatarFileName(file.name);
		setAvatarUploading(true);
		setError(null);
		setStatus(null);
		try {
			const formData = new FormData();
			formData.append('avatar', file);
			const { data } = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			setProfile((current) => ({ ...current, avatarUrl: data.avatarUrl }));
			setStatus('Avatar updated.');
		} catch {
			setError('Could not upload avatar.');
		} finally {
			setAvatarUploading(false);
		}
	};

	const saveProfile = async () => {
		setSaving(true);
		setError(null);
		setStatus(null);
		try {
			const { apiTokens, email, ...payload } = profile;
			void apiTokens;
			void email;
			const { data } = await apiClient.patch<Partial<ProfileForm>>('/users/me', payload);
			setProfile((current) => ({ ...current, ...data }));
			setStatus('Profile saved.');
		} catch {
			setError('Could not save your profile.');
		} finally {
			setSaving(false);
		}
	};

	const changePassword = async () => {
		if (!currentPassword || !newPassword || passwordMismatch || score < 2) return;
		setSaving(true);
		setError(null);
		setStatus(null);
		try {
			await apiClient.post('/users/me/password', { currentPassword, newPassword });
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setStatus('Password updated.');
		} catch {
			setError('Could not update password.');
		} finally {
			setSaving(false);
		}
	};

	// Bug fix #2: use response data to render real QR code or fallback TOTP secret
	const setupTwoFactor = async () => {
		setError(null);
		setStatus(null);
		setTwoFactorSetting(true);
		setTwoFactorQrCode(null);
		setTwoFactorSecret(null);
		try {
			const { data } = await apiClient.post<TwoFactorSetupResponse>('/users/me/2fa/setup', {});
			setProfile((current) => ({ ...current, twoFactorEnabled: true }));
			if (data.qr_code) {
				// Accept a bare base64 string or a full data URI
				setTwoFactorQrCode(
					data.qr_code.startsWith('data:')
						? data.qr_code
						: `data:image/png;base64,${data.qr_code}`,
				);
			} else if (data.qr_url) {
				setTwoFactorQrCode(data.qr_url);
			}
			if (data.secret) {
				setTwoFactorSecret(data.secret);
			}
			setStatus('Two-factor authentication setup started. Scan the QR code with your authenticator app.');
		} catch {
			setError('Could not start two-factor setup.');
		} finally {
			setTwoFactorSetting(false);
		}
	};

	const generateToken = async () => {
		setError(null);
		setStatus(null);
		try {
			const { data } = await apiClient.post<ApiToken>('/users/me/tokens', {
				name: `Personal token ${profile.apiTokens.length + 1}`,
			});
			setProfile((current) => ({ ...current, apiTokens: [data, ...current.apiTokens] }));
			setStatus('API token generated.');
		} catch {
			setError('Could not generate token.');
		}
	};

	const revokeToken = async (tokenId: string) => {
		setError(null);
		setStatus(null);
		try {
			await apiClient.delete(`/users/me/tokens/${tokenId}`);
			setProfile((current) => ({
				...current,
				apiTokens: current.apiTokens.filter((token) => token.id !== tokenId),
			}));
			setStatus('API token revoked.');
		} catch {
			setError('Could not revoke token.');
		}
	};

	const deactivateAccount = async () => {
		setError(null);
		setStatus(null);
		try {
			await apiClient.patch('/users/me', { active: false });
			setStatus('Account deactivation requested.');
		} catch {
			setError('Could not deactivate account.');
		}
	};

	if (loading) {
		return (
			<div className="mx-auto max-w-5xl space-y-4 p-6">
				<div className="h-8 w-56 animate-pulse rounded bg-slate-800" />
				<div className="h-80 animate-pulse rounded-lg bg-slate-900" />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-6 p-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">My Profile</h1>
					<p className="mt-1 text-sm text-slate-400">Manage your identity, sign-in security, and personal access.</p>
				</div>
				<Button onClick={saveProfile} disabled={saving} className="bg-brass-500 text-slate-950 hover:bg-brass-400">
					{saving ? 'Saving...' : 'Save changes'}
				</Button>
			</div>

			{status && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{status}</div>}
			{error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

			<div className="grid gap-6 lg:grid-cols-[300px_1fr]">
				<section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
					<div className="flex flex-col items-center text-center">
						<div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-slate-800 text-3xl font-semibold text-brass-300">
							{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
							{avatarUploading && (
								<div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/70">
									<div className="h-6 w-6 animate-spin rounded-full border-2 border-brass-400 border-t-transparent" />
								</div>
							)}
						</div>
						<h2 className="mt-4 text-lg font-semibold text-slate-100">{profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}` : 'Profile photo'}</h2>
						<p className="text-sm text-slate-500">{profile.email}</p>
						<label className="mt-4 inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-700 px-4 text-sm text-slate-200 hover:bg-slate-800">
							<Camera className="h-4 w-4" />
							{avatarUploading ? 'Uploading...' : 'Upload photo'}
							<input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarUploading} className="sr-only" />
						</label>
						{avatarFileName && !avatarUploading && <p className="mt-2 text-xs text-slate-500">{avatarFileName}</p>}
					</div>
				</section>

				<section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
					<h2 className="text-lg font-semibold text-slate-100">Edit profile</h2>
					<div className="mt-5 grid gap-4 sm:grid-cols-2">
						<div className="space-y-1">
							<Label htmlFor="firstName">First name</Label>
							<Input id="firstName" value={profile.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="lastName">Last name</Label>
							<Input id="lastName" value={profile.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="email">Email</Label>
							<Input id="email" value={profile.email} readOnly className="bg-slate-950 text-slate-500" />
						</div>
						<div className="space-y-1">
							<Label htmlFor="jobTitle">Job title</Label>
							<Input id="jobTitle" value={profile.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="department">Department</Label>
							<Input id="department" value={profile.department} onChange={(event) => updateField('department', event.target.value)} />
						</div>
						<div className="space-y-1">
							<Label htmlFor="phone">Phone</Label>
							<Input id="phone" value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} />
						</div>
					</div>
				</section>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
					<div className="flex items-center gap-2">
						<KeyRound className="h-5 w-5 text-brass-300" />
						<h2 className="text-lg font-semibold text-slate-100">Change password</h2>
					</div>
					<div className="mt-5 space-y-4">
						<Input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
						<Input type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
						<Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
						<div>
							<div className="h-2 overflow-hidden rounded-full bg-slate-800">
								<div className="h-full rounded-full bg-brass-400 transition-all" style={{ width: `${Math.max(score, 1) * 25}%` }} />
							</div>
							<p className={`mt-2 text-xs ${passwordMismatch ? 'text-red-300' : 'text-slate-500'}`}>
								{passwordMismatch ? 'Passwords do not match.' : scoreLabel}
							</p>
						</div>
						<Button onClick={changePassword} disabled={saving || passwordMismatch || score < 2}>
							Update password
						</Button>
					</div>
				</section>

				<section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-brass-300" />
							<h2 className="text-lg font-semibold text-slate-100">Two-factor auth</h2>
						</div>
						<Badge variant={profile.twoFactorEnabled ? 'default' : 'outline'}>
							{profile.twoFactorEnabled ? 'Enabled' : 'Not configured'}
						</Badge>
					</div>
					<div className="mt-5 flex items-start gap-5">
						<div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800 text-slate-500">
							{twoFactorQrCode ? (
								<img src={twoFactorQrCode} alt="2FA QR code — scan with your authenticator app" className="h-full w-full rounded-lg object-contain" />
							) : (
								<QrCode className="h-16 w-16" />
							)}
						</div>
						<div className="space-y-3">
							<p className="text-sm text-slate-400">Scan the setup code with your authenticator app when setup starts.</p>
							{twoFactorSecret && (
								<div className="space-y-1">
									<p className="text-xs text-slate-500">Or enter this secret manually:</p>
									<code className="block break-all rounded bg-slate-800 px-3 py-2 font-mono text-xs text-brass-300">
										{twoFactorSecret}
									</code>
								</div>
							)}
							<Button onClick={setupTwoFactor} disabled={twoFactorSetting}>
								{twoFactorSetting ? 'Setting up...' : 'Setup 2FA'}
							</Button>
						</div>
					</div>
				</section>
			</div>

			<section className="rounded-lg border border-slate-800 bg-slate-900 p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-100">API tokens</h2>
						<p className="text-sm text-slate-500">Personal tokens for scripts and integrations.</p>
					</div>
					<Button onClick={generateToken}>
						<Plus className="h-4 w-4" />
						Generate new
					</Button>
				</div>
				<div className="mt-5 divide-y divide-slate-800 overflow-hidden rounded-md border border-slate-800">
					{profile.apiTokens.length === 0 ? (
						<div className="px-4 py-6 text-center text-sm text-slate-500">No personal API tokens.</div>
					) : (
						profile.apiTokens.map((token) => (
							<div key={token.id} className="flex items-center justify-between gap-4 px-4 py-3">
								<div>
									<p className="text-sm font-medium text-slate-200">{token.name}</p>
									<p className="text-xs text-slate-500">
										Last used {token.lastUsed || 'never'}
									</p>
								</div>
								<Button variant="ghost" size="sm" onClick={() => revokeToken(token.id)} className="text-red-300 hover:text-red-200">
									<Trash2 className="h-4 w-4" />
									Revoke
								</Button>
							</div>
						))
					)}
				</div>
			</section>

			<section className="rounded-lg border border-red-500/30 bg-red-950/20 p-5">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex gap-3">
						<AlertTriangle className="mt-0.5 h-5 w-5 text-red-300" />
						<div>
							<h2 className="text-lg font-semibold text-red-100">Danger zone</h2>
							<p className="text-sm text-red-200/70">Deactivate this account and prevent new sign-ins.</p>
						</div>
					</div>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive">Deactivate account</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Deactivate account?</AlertDialogTitle>
								<AlertDialogDescription>
									This will disable access for this profile. An administrator may be required to restore it.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={deactivateAccount} className="bg-red-600 text-white hover:bg-red-500">
									Deactivate account
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</section>
		</div>
	);
}

export default UserProfile;
