// General Settings Section
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsField, SettingsToggle, SettingsSelect } from '../ui/SettingsControls';
import { useTenantSettings, useUpdateTenantSettings } from '../../api/hooks';

export function GeneralSettings() {
	const { data: settings, isLoading } = useTenantSettings();
	const updateMutation = useUpdateTenantSettings();

	if (isLoading) return <SettingsLoading />;

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="General Settings"
				description="Basic organization and account settings"
			/>

			<SettingsCard title="Organization">
				<SettingsField
					label="Organization Name"
					description="Your organization's display name"
					value={settings?.name || ''}
					onChange={(value) => updateMutation.mutate({ name: value })}
				/>
				<SettingsField
					label="Domain"
					description="Your organization's domain"
					value={settings?.domain || ''}
					onChange={(value) => updateMutation.mutate({ domain: value })}
					placeholder="example.com"
				/>
			</SettingsCard>

			<SettingsCard title="Localization">
				<SettingsSelect
					label="Timezone"
					description="Default timezone for the organization"
					value={settings?.timezone || 'UTC'}
					options={[
						{ value: 'UTC', label: 'UTC' },
						{ value: 'America/New_York', label: 'Eastern Time' },
						{ value: 'America/Los_Angeles', label: 'Pacific Time' },
						{ value: 'Europe/London', label: 'London' },
						{ value: 'Europe/Paris', label: 'Paris' },
						{ value: 'Asia/Tokyo', label: 'Tokyo' },
					]}
					onChange={(value) => updateMutation.mutate({ timezone: value })}
				/>
				<SettingsSelect
					label="Default Language"
					value={settings?.default_language || 'en'}
					options={[
						{ value: 'en', label: 'English' },
						{ value: 'es', label: 'Spanish' },
						{ value: 'fr', label: 'French' },
						{ value: 'de', label: 'German' },
						{ value: 'pt', label: 'Portuguese' },
					]}
					onChange={(value) => updateMutation.mutate({ default_language: value })}
				/>
				<SettingsSelect
					label="Date Format"
					value={settings?.date_format || 'YYYY-MM-DD'}
					options={[
						{ value: 'YYYY-MM-DD', label: '2024-01-15' },
						{ value: 'DD/MM/YYYY', label: '15/01/2024' },
						{ value: 'MM/DD/YYYY', label: '01/15/2024' },
						{ value: 'DD.MM.YYYY', label: '15.01.2024' },
					]}
					onChange={(value) => updateMutation.mutate({ date_format: value })}
				/>
			</SettingsCard>
		</div>
	);
}

function SettingsLoading() {
	return (
		<div className="space-y-6">
			{[1, 2].map((i) => (
				<div key={i} className="bg-slate-800/50 rounded-lg p-6 animate-pulse">
					<div className="h-4 w-32 bg-slate-700 rounded mb-4" />
					<div className="space-y-3">
						<div className="h-10 bg-slate-700 rounded" />
						<div className="h-10 bg-slate-700 rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

function SettingsHeader({ title, description }: { title: string; description: string }) {
	return (
		<div className="mb-8">
			<h2 className="text-xl font-semibold text-white">{title}</h2>
			<p className="text-sm text-slate-400 mt-1">{description}</p>
		</div>
	);
}
