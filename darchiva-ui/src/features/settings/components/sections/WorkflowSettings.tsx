// Workflow Settings Section
import { SettingsCard, SettingsToggle, SettingsSlider } from '../ui/SettingsControls';
import { useWorkflowSettings, useUpdateWorkflowSettings } from '../../api/hooks';

export function WorkflowSettings() {
	const { data: settings } = useWorkflowSettings();
	const updateMutation = useUpdateWorkflowSettings();

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Workflows</h2>
				<p className="text-sm text-slate-400 mt-1">Automation and document routing settings</p>
			</div>

			<SettingsCard title="Automation">
				<SettingsToggle
					label="Auto-Routing"
					description="Automatically route documents based on rules"
					checked={settings?.auto_routing_enabled ?? true}
					onChange={(v) => updateMutation.mutate({ auto_routing_enabled: v })}
				/>
				<SettingsToggle
					label="Escalation"
					description="Auto-escalate overdue tasks"
					checked={settings?.escalation_enabled ?? true}
					onChange={(v) => updateMutation.mutate({ escalation_enabled: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Execution">
				<SettingsSlider
					label="Approval Timeout"
					description="Hours before approval requests expire"
					value={settings?.approval_timeout_hours || 72}
					min={1}
					max={720}
					unit=" hours"
					onChange={(v) => updateMutation.mutate({ approval_timeout_hours: v })}
				/>
				<SettingsSlider
					label="Max Parallel Tasks"
					description="Maximum concurrent workflow tasks"
					value={settings?.max_parallel_tasks || 10}
					min={1}
					max={50}
					onChange={(v) => updateMutation.mutate({ max_parallel_tasks: v })}
				/>
			</SettingsCard>

			<SettingsCard title="Error Handling">
				<SettingsToggle
					label="Retry Failed Tasks"
					description="Automatically retry failed workflow steps"
					checked={settings?.retry_failed_tasks ?? true}
					onChange={(v) => updateMutation.mutate({ retry_failed_tasks: v })}
				/>
				{settings?.retry_failed_tasks && (
					<SettingsSlider
						label="Max Retries"
						value={settings?.max_retries || 3}
						min={1}
						max={10}
						onChange={(v) => updateMutation.mutate({ max_retries: v })}
					/>
				)}
			</SettingsCard>

			<SettingsCard title="Notifications">
				<SettingsToggle
					label="Email Notifications"
					description="Send workflow updates via email"
					checked={settings?.email_notifications ?? true}
					onChange={(v) => updateMutation.mutate({ email_notifications: v })}
				/>
				<SettingsToggle
					label="Slack Notifications"
					description="Send updates to Slack channels"
					checked={settings?.slack_notifications ?? false}
					onChange={(v) => updateMutation.mutate({ slack_notifications: v })}
				/>
				<SettingsToggle
					label="Webhook Notifications"
					description="Send updates to custom webhooks"
					checked={settings?.webhook_notifications ?? false}
					onChange={(v) => updateMutation.mutate({ webhook_notifications: v })}
				/>
			</SettingsCard>
		</div>
	);
}
