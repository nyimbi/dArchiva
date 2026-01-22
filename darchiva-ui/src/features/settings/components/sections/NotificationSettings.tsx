// (c) Copyright Datacraft, 2026
// Notification Settings - Email and in-app notification preferences
import { SettingsCard, SettingsToggle, SettingsSelect } from '../ui/SettingsControls';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../../api/hooks';

function SettingsHeader({ title, description }: { title: string; description: string }) {
	return (
		<div>
			<h2 className="text-xl font-semibold text-white">{title}</h2>
			<p className="text-sm text-slate-400 mt-1">{description}</p>
		</div>
	);
}

function SettingsLoading() {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
		</div>
	);
}

export function NotificationSettings() {
	const { data: prefs, isLoading } = useNotificationPreferences();
	const updateMutation = useUpdateNotificationPreferences();

	if (isLoading) return <SettingsLoading />;

	const update = (key: string, value: boolean | string) => {
		updateMutation.mutate({ [key]: value });
	};

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Notification Settings"
				description="Configure how and when you receive notifications"
			/>

			<SettingsCard title="Email Notifications">
				<SettingsToggle
					label="Enable Email Notifications"
					description="Receive important updates via email"
					checked={prefs?.email_enabled ?? true}
					onChange={(checked) => update('email_enabled', checked)}
				/>

				<div className="border-t border-slate-700/50 pt-4 mt-4 space-y-4">
					<SettingsToggle
						label="Document Updates"
						description="When documents you're assigned to are updated"
						checked={prefs?.email_document_updates ?? true}
						onChange={(checked) => update('email_document_updates', checked)}
						disabled={!prefs?.email_enabled}
					/>
					<SettingsToggle
						label="Workflow Assignments"
						description="When you're assigned to a workflow task"
						checked={prefs?.email_workflow_assignments ?? true}
						onChange={(checked) => update('email_workflow_assignments', checked)}
						disabled={!prefs?.email_enabled}
					/>
					<SettingsToggle
						label="SLA Warnings"
						description="When a task is approaching its deadline"
						checked={prefs?.email_sla_warnings ?? true}
						onChange={(checked) => update('email_sla_warnings', checked)}
						disabled={!prefs?.email_enabled}
					/>
					<SettingsToggle
						label="Comments & Mentions"
						description="When someone mentions you or comments on your items"
						checked={prefs?.email_mentions ?? true}
						onChange={(checked) => update('email_mentions', checked)}
						disabled={!prefs?.email_enabled}
					/>
					<SettingsToggle
						label="System Announcements"
						description="Important system updates and maintenance notices"
						checked={prefs?.email_system ?? true}
						onChange={(checked) => update('email_system', checked)}
						disabled={!prefs?.email_enabled}
					/>
				</div>
			</SettingsCard>

			<SettingsCard title="Email Digest">
				<SettingsSelect
					label="Digest Frequency"
					description="How often to receive summary emails"
					value={prefs?.digest_frequency || 'daily'}
					options={[
						{ value: 'never', label: 'Never' },
						{ value: 'daily', label: 'Daily' },
						{ value: 'weekly', label: 'Weekly' },
						{ value: 'monthly', label: 'Monthly' },
					]}
					onChange={(value) => update('digest_frequency', value)}
				/>
				<SettingsSelect
					label="Digest Time"
					description="Preferred time to receive digest emails"
					value={prefs?.digest_time || '09:00'}
					options={[
						{ value: '06:00', label: '6:00 AM' },
						{ value: '09:00', label: '9:00 AM' },
						{ value: '12:00', label: '12:00 PM' },
						{ value: '18:00', label: '6:00 PM' },
					]}
					onChange={(value) => update('digest_time', value)}
				/>
			</SettingsCard>

			<SettingsCard title="In-App Notifications">
				<SettingsToggle
					label="Enable In-App Notifications"
					description="Show notifications in the application"
					checked={prefs?.inapp_enabled ?? true}
					onChange={(checked) => update('inapp_enabled', checked)}
				/>
				<SettingsToggle
					label="Desktop Notifications"
					description="Show browser notifications when not focused"
					checked={prefs?.desktop_enabled ?? false}
					onChange={(checked) => update('desktop_enabled', checked)}
				/>
				<SettingsToggle
					label="Sound Alerts"
					description="Play a sound when notifications arrive"
					checked={prefs?.sound_enabled ?? false}
					onChange={(checked) => update('sound_enabled', checked)}
				/>

				<div className="border-t border-slate-700/50 pt-4 mt-4 space-y-4">
					<SettingsToggle
						label="Document Activity"
						description="Updates to documents in your workspace"
						checked={prefs?.inapp_documents ?? true}
						onChange={(checked) => update('inapp_documents', checked)}
						disabled={!prefs?.inapp_enabled}
					/>
					<SettingsToggle
						label="Workflow Updates"
						description="Status changes and task assignments"
						checked={prefs?.inapp_workflows ?? true}
						onChange={(checked) => update('inapp_workflows', checked)}
						disabled={!prefs?.inapp_enabled}
					/>
					<SettingsToggle
						label="Team Activity"
						description="Updates from your team members"
						checked={prefs?.inapp_team ?? true}
						onChange={(checked) => update('inapp_team', checked)}
						disabled={!prefs?.inapp_enabled}
					/>
				</div>
			</SettingsCard>

			<SettingsCard title="Do Not Disturb">
				<SettingsToggle
					label="Enable Do Not Disturb"
					description="Pause all notifications during specified hours"
					checked={prefs?.dnd_enabled ?? false}
					onChange={(checked) => update('dnd_enabled', checked)}
				/>
				<div className="flex gap-4 mt-4">
					<SettingsSelect
						label="Start Time"
						value={prefs?.dnd_start || '22:00'}
						options={[
							{ value: '18:00', label: '6:00 PM' },
							{ value: '20:00', label: '8:00 PM' },
							{ value: '22:00', label: '10:00 PM' },
							{ value: '00:00', label: '12:00 AM' },
						]}
						onChange={(value) => update('dnd_start', value)}
						disabled={!prefs?.dnd_enabled}
					/>
					<SettingsSelect
						label="End Time"
						value={prefs?.dnd_end || '08:00'}
						options={[
							{ value: '06:00', label: '6:00 AM' },
							{ value: '07:00', label: '7:00 AM' },
							{ value: '08:00', label: '8:00 AM' },
							{ value: '09:00', label: '9:00 AM' },
						]}
						onChange={(value) => update('dnd_end', value)}
						disabled={!prefs?.dnd_enabled}
					/>
				</div>
			</SettingsCard>
		</div>
	);
}
