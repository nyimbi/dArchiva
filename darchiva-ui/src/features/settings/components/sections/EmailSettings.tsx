// Email Settings Section
import { SettingsCard, SettingsField, SettingsToggle, SettingsButton, SettingsBadge } from '../ui/SettingsControls';
import { useEmailSettings, useUpdateEmailSettings, useTestEmailSettings } from '../../api/hooks';
import { useState } from 'react';

export function EmailSettings() {
	const { data: settings } = useEmailSettings();
	const updateMutation = useUpdateEmailSettings();
	const testMutation = useTestEmailSettings();
	const [testEmail, setTestEmail] = useState('');

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Email</h2>
				<p className="text-sm text-slate-400 mt-1">SMTP and email ingestion configuration</p>
			</div>

			<SettingsCard title="SMTP Configuration">
				<SettingsField
					label="SMTP Host"
					value={settings?.smtp_host || ''}
					placeholder="smtp.example.com"
					onChange={(v) => updateMutation.mutate({ smtp_host: v })}
				/>
				<div className="grid grid-cols-2 gap-4">
					<SettingsField
						label="Port"
						type="number"
						value={String(settings?.smtp_port || 587)}
						onChange={(v) => updateMutation.mutate({ smtp_port: parseInt(v) })}
					/>
					<div className="flex items-end pb-2">
						<SettingsToggle
							label="Use TLS"
							checked={settings?.smtp_use_tls ?? true}
							onChange={(v) => updateMutation.mutate({ smtp_use_tls: v })}
						/>
					</div>
				</div>
				<SettingsField
					label="Username"
					value={settings?.smtp_username || ''}
					onChange={(v) => updateMutation.mutate({ smtp_username: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Sender Identity">
				<SettingsField
					label="From Address"
					type="email"
					value={settings?.from_address || ''}
					placeholder="noreply@example.com"
					onChange={(v) => updateMutation.mutate({ from_address: v })}
				/>
				<SettingsField
					label="From Name"
					value={settings?.from_name || ''}
					placeholder="dArchiva"
					onChange={(v) => updateMutation.mutate({ from_name: v })}
				/>
				<SettingsField
					label="Reply-To"
					type="email"
					value={settings?.reply_to || ''}
					placeholder="support@example.com"
					onChange={(v) => updateMutation.mutate({ reply_to: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Test Configuration">
				<div className="flex gap-3">
					<input
						type="email"
						value={testEmail}
						onChange={(e) => setTestEmail(e.target.value)}
						placeholder="Enter email to test..."
						className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-700 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
					/>
					<SettingsButton
						variant="primary"
						loading={testMutation.isPending}
						onClick={() => testMutation.mutate(testEmail)}
					>
						Send Test
					</SettingsButton>
				</div>
				{testMutation.isSuccess && (
					<div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
						Test email sent successfully!
					</div>
				)}
				{testMutation.isError && (
					<div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
						Failed: {testMutation.error?.message}
					</div>
				)}
			</SettingsCard>

			<SettingsCard title="Email Ingestion (IMAP)">
				<SettingsToggle
					label="Enable IMAP"
					description="Import documents from email"
					checked={settings?.imap_enabled ?? false}
					onChange={(v) => updateMutation.mutate({ imap_enabled: v })}
				/>
				{settings?.imap_enabled && (
					<>
						<SettingsField
							label="IMAP Host"
							value={settings?.imap_host || ''}
							onChange={(v) => updateMutation.mutate({ imap_host: v })}
						/>
						<SettingsToggle
							label="Auto-Import"
							description="Automatically import new emails"
							checked={settings?.auto_import_enabled ?? false}
							onChange={(v) => updateMutation.mutate({ auto_import_enabled: v })}
						/>
					</>
				)}
			</SettingsCard>
		</div>
	);
}
