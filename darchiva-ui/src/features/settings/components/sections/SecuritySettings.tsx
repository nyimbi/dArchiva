// Security Settings Section
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsToggle, SettingsSlider, SettingsBadge } from '../ui/SettingsControls';
import { useSecuritySettings, useUpdateSecuritySettings } from '../../api/hooks';
import { ShieldCheckIcon, KeyIcon, FingerPrintIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

export function SecuritySettings() {
	const { data: settings } = useSecuritySettings();
	const updateMutation = useUpdateSecuritySettings();

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Security</h2>
				<p className="text-sm text-slate-400 mt-1">Authentication, access control, and audit settings</p>
			</div>

			<SettingsCard title="Multi-Factor Authentication">
				<SettingsToggle
					label="Require MFA"
					description="Enforce MFA for all users"
					checked={settings?.mfa_required ?? false}
					onChange={(v) => updateMutation.mutate({ mfa_required: v })}
				/>
				<div className="pt-4">
					<span className="text-sm font-medium text-slate-200 block mb-3">Allowed MFA Methods</span>
					<div className="grid grid-cols-2 gap-3">
						<MFAMethodCard
							icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
							label="Authenticator App"
							method="totp"
							enabled={settings?.mfa_methods?.includes('totp')}
							onChange={(enabled) => {
								const methods = settings?.mfa_methods || [];
								const updated = enabled ? [...methods, 'totp'] : methods.filter(m => m !== 'totp');
								updateMutation.mutate({ mfa_methods: updated as any });
							}}
						/>
						<MFAMethodCard
							icon={<FingerPrintIcon className="w-5 h-5" />}
							label="Passkeys"
							method="webauthn"
							enabled={settings?.mfa_methods?.includes('webauthn')}
							onChange={(enabled) => {
								const methods = settings?.mfa_methods || [];
								const updated = enabled ? [...methods, 'webauthn'] : methods.filter(m => m !== 'webauthn');
								updateMutation.mutate({ mfa_methods: updated as any });
							}}
						/>
					</div>
				</div>
				<SettingsToggle
					label="Enable Passkeys"
					description="Allow passwordless login with FIDO2/WebAuthn"
					checked={settings?.passkeys_enabled ?? false}
					onChange={(v) => updateMutation.mutate({ passkeys_enabled: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Password Policy">
				<SettingsSlider
					label="Minimum Length"
					value={settings?.password_min_length || 8}
					min={6}
					max={32}
					unit=" chars"
					onChange={(v) => updateMutation.mutate({ password_min_length: v })}
				/>
				<SettingsToggle
					label="Require Special Characters"
					checked={settings?.password_require_special ?? true}
					onChange={(v) => updateMutation.mutate({ password_require_special: v })}
				/>
				<SettingsToggle
					label="Require Numbers"
					checked={settings?.password_require_numbers ?? true}
					onChange={(v) => updateMutation.mutate({ password_require_numbers: v })}
				/>
				<SettingsToggle
					label="Require Uppercase"
					checked={settings?.password_require_uppercase ?? true}
					onChange={(v) => updateMutation.mutate({ password_require_uppercase: v })}
				/>
				<SettingsSlider
					label="Password Expiry"
					description="Force password change after (0 = never)"
					value={settings?.password_expiry_days || 0}
					min={0}
					max={365}
					unit=" days"
					onChange={(v) => updateMutation.mutate({ password_expiry_days: v || null })}
				/>
			</SettingsCard>

			<SettingsCard title="Session & Lockout">
				<SettingsSlider
					label="Session Timeout"
					description="Auto-logout after inactivity"
					value={settings?.session_timeout_minutes || 60}
					min={5}
					max={1440}
					unit=" min"
					onChange={(v) => updateMutation.mutate({ session_timeout_minutes: v })}
				/>
				<SettingsSlider
					label="Max Login Attempts"
					value={settings?.max_login_attempts || 5}
					min={3}
					max={10}
					onChange={(v) => updateMutation.mutate({ max_login_attempts: v })}
				/>
				<SettingsSlider
					label="Lockout Duration"
					value={settings?.lockout_duration_minutes || 30}
					min={5}
					max={1440}
					unit=" min"
					onChange={(v) => updateMutation.mutate({ lockout_duration_minutes: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Audit & Privacy">
				<SettingsSlider
					label="Audit Log Retention"
					description="How long to keep audit logs"
					value={settings?.audit_log_retention_days || 90}
					min={30}
					max={730}
					unit=" days"
					onChange={(v) => updateMutation.mutate({ audit_log_retention_days: v })}
				/>
				<SettingsToggle
					label="Mask Sensitive Data"
					description="Hide PII in logs and exports"
					checked={settings?.sensitive_data_masking ?? true}
					onChange={(v) => updateMutation.mutate({ sensitive_data_masking: v })}
				/>
			</SettingsCard>
		</div>
	);
}

function MFAMethodCard({ icon, label, method, enabled, onChange }: {
	icon: React.ReactNode;
	label: string;
	method: string;
	enabled?: boolean;
	onChange: (enabled: boolean) => void;
}) {
	return (
		<button
			onClick={() => onChange(!enabled)}
			className={cn(
				'p-4 rounded-lg border text-left transition-all',
				enabled
					? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
					: 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
			)}
		>
			<div className="flex items-center gap-3">
				{icon}
				<span className="text-sm font-medium">{label}</span>
			</div>
		</button>
	);
}
