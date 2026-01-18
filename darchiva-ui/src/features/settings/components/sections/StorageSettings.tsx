// Storage Settings Section
import { cn } from '@/lib/utils';
import { SettingsCard, SettingsField, SettingsToggle, SettingsSelect, SettingsSlider, SettingsBadge, SettingsButton } from '../ui/SettingsControls';
import { useStorageSettings, useUpdateStorageSettings } from '../../api/hooks';

export function StorageSettings() {
	const { data: settings, isLoading } = useStorageSettings();
	const updateMutation = useUpdateStorageSettings();

	const usagePercent = settings ? (settings.used_storage_bytes / settings.total_storage_bytes) * 100 : 0;
	const usedGB = settings ? (settings.used_storage_bytes / 1024 / 1024 / 1024).toFixed(2) : 0;
	const totalGB = settings ? (settings.total_storage_bytes / 1024 / 1024 / 1024).toFixed(2) : 0;

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Storage</h2>
				<p className="text-sm text-slate-400 mt-1">Configure file storage and lifecycle policies</p>
			</div>

			{/* Usage Overview */}
			<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-medium text-white">Storage Usage</h3>
					<SettingsBadge variant={usagePercent > 80 ? 'warning' : 'success'}>
						{usagePercent.toFixed(1)}% used
					</SettingsBadge>
				</div>
				<div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
					<div
						className={cn(
							'h-full rounded-full transition-all',
							usagePercent > 80 ? 'bg-amber-500' : 'bg-cyan-500'
						)}
						style={{ width: `${usagePercent}%` }}
					/>
				</div>
				<div className="flex justify-between text-xs text-slate-500 font-mono">
					<span>{usedGB} GB used</span>
					<span>{totalGB} GB total</span>
				</div>
			</div>

			<SettingsCard title="Storage Provider">
				<SettingsSelect
					label="Backend"
					description="Where files are stored"
					value={settings?.provider || 'local'}
					options={[
						{ value: 'local', label: 'Local Filesystem' },
						{ value: 's3', label: 'Amazon S3' },
						{ value: 'linode', label: 'Linode Object Storage' },
						{ value: 'r2', label: 'Cloudflare R2' },
					]}
					onChange={(v) => updateMutation.mutate({ provider: v as any })}
				/>
				{settings?.provider !== 'local' && (
					<>
						<SettingsField
							label="Bucket Name"
							value={settings?.bucket_name || ''}
							onChange={(v) => updateMutation.mutate({ bucket_name: v })}
						/>
						<SettingsField
							label="Region"
							value={settings?.region || ''}
							onChange={(v) => updateMutation.mutate({ region: v })}
						/>
					</>
				)}
			</SettingsCard>

			<SettingsCard title="File Policies">
				<SettingsSlider
					label="Max File Size"
					description="Maximum allowed upload size"
					value={settings?.max_file_size_mb || 100}
					min={1}
					max={500}
					unit=" MB"
					onChange={(v) => updateMutation.mutate({ max_file_size_mb: v })}
				/>
				<SettingsToggle
					label="Version Control"
					description="Keep previous versions of files"
					checked={settings?.versioning_enabled ?? true}
					onChange={(v) => updateMutation.mutate({ versioning_enabled: v })}
				/>
				{settings?.versioning_enabled && (
					<SettingsSlider
						label="Max Versions"
						value={settings?.max_versions || 10}
						min={1}
						max={50}
						onChange={(v) => updateMutation.mutate({ max_versions: v })}
					/>
				)}
			</SettingsCard>

			<SettingsCard title="Lifecycle & Archival">
				<SettingsSlider
					label="Auto-Archive After"
					description="Move untouched files to archive tier"
					value={settings?.auto_archive_days || 0}
					min={0}
					max={365}
					unit=" days"
					onChange={(v) => updateMutation.mutate({ auto_archive_days: v || null })}
				/>
				<SettingsSelect
					label="Archive Tier"
					value={settings?.archive_tier || 'cold'}
					options={[
						{ value: 'hot', label: 'Hot (Instant access)' },
						{ value: 'cold', label: 'Cold (Minutes to access)' },
						{ value: 'archive', label: 'Archive (Hours to access)' },
					]}
					onChange={(v) => updateMutation.mutate({ archive_tier: v as any })}
				/>
			</SettingsCard>
		</div>
	);
}
