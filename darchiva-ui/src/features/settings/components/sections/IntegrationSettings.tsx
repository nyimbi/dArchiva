// Integration Settings Section
import { cn } from '@/lib/utils';
import { KeyIcon,LinkIcon,PlusIcon,TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useCreateWebhook,useDeleteWebhook,useIntegrationSettings,useUpdateIntegrationSettings,useUpdateOAuthProvider,useWebhooks } from '../../api/hooks';
import type { OAuthProvider,WebhookConfig } from '../../types';
import { SettingsBadge,SettingsButton,SettingsCard,SettingsField,SettingsToggle } from '../ui/SettingsControls';

const WEBHOOK_EVENTS = [
	'document.created',
	'document.updated',
	'batch.completed',
	'workflow.triggered',
	'approval.requested',
] as const;

export function IntegrationSettings() {
	const { data: settings } = useIntegrationSettings();
	const { data: webhooks } = useWebhooks();
	const updateIntegrationMutation = useUpdateIntegrationSettings();
	const updateOAuthMutation = useUpdateOAuthProvider();
	const createWebhookMutation = useCreateWebhook();
	const deleteWebhookMutation = useDeleteWebhook();

	const [showNewWebhook, setShowNewWebhook] = useState(false);

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Integrations</h2>
				<p className="text-sm text-slate-400 mt-1">OAuth providers, webhooks, and API access</p>
			</div>

			<SettingsCard title="OAuth Providers">
				<div className="space-y-3">
					{settings?.oauth_providers?.map((provider) => (
						<OAuthProviderRow
							key={provider.id}
							provider={provider}
							onUpdate={(data) => updateOAuthMutation.mutate({ id: provider.id, data })}
						/>
					))}
					{(!settings?.oauth_providers || settings.oauth_providers.length === 0) && (
						<p className="text-sm text-slate-500">No OAuth providers configured</p>
					)}
				</div>
			</SettingsCard>

			<SettingsCard title="API Access">
				<SettingsToggle
					label="Enable API Keys"
					description="Allow API access via keys"
					checked={settings?.api_key_enabled ?? true}
					onChange={(api_key_enabled) => updateIntegrationMutation.mutate({ api_key_enabled })}
					disabled={updateIntegrationMutation.isPending}
				/>
				<div className="flex items-center justify-between py-2">
					<div>
						<span className="text-sm font-medium text-slate-200">Rate Limit</span>
						<span className="block text-xs text-slate-500">Requests per minute per key</span>
					</div>
					<span className="font-mono text-cyan-400">{settings?.api_rate_limit || 100}/min</span>
				</div>
			</SettingsCard>

			<SettingsCard
				title="Webhooks"
				description="Send events to external services"
			>
				<div className="space-y-3">
					{webhooks?.map((webhook) => (
						<WebhookRow
							key={webhook.id}
							webhook={webhook}
							onDelete={() => deleteWebhookMutation.mutate(webhook.id)}
						/>
					))}
					{(!webhooks || webhooks.length === 0) && !showNewWebhook && (
						<p className="text-sm text-slate-500">No webhooks configured</p>
					)}
					{showNewWebhook && (
						<NewWebhookForm
							onSubmit={(data) => {
								createWebhookMutation.mutate(data);
								setShowNewWebhook(false);
							}}
							onCancel={() => setShowNewWebhook(false)}
						/>
					)}
				</div>
				{!showNewWebhook && (
					<div className="pt-4">
						<SettingsButton onClick={() => setShowNewWebhook(true)}>
							<PlusIcon className="w-4 h-4 mr-2" />
							Add Webhook
						</SettingsButton>
					</div>
				)}
			</SettingsCard>
		</div>
	);
}

function OAuthProviderRow({ provider, onUpdate }: { provider: OAuthProvider; onUpdate: (data: Partial<OAuthProvider>) => void }) {
	return (
		<div className={cn(
			'flex items-center justify-between p-4 rounded-lg border',
			provider.enabled
				? 'bg-slate-800/50 border-slate-700'
				: 'bg-slate-900/50 border-slate-800 opacity-60'
		)}>
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
					<KeyIcon className="w-5 h-5 text-slate-400" />
				</div>
				<div>
					<span className="font-medium text-slate-200">{provider.name}</span>
					{provider.client_id && (
						<span className="block text-xs text-slate-500 font-mono">{provider.client_id.slice(0, 20)}...</span>
					)}
				</div>
			</div>
			<SettingsToggle
				label=""
				checked={provider.enabled}
				onChange={(enabled) => onUpdate({ enabled })}
			/>
		</div>
	);
}

function WebhookRow({ webhook, onDelete }: { webhook: WebhookConfig; onDelete: () => void }) {
	return (
		<div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
					<LinkIcon className="w-5 h-5 text-slate-400" />
				</div>
				<div>
					<span className="font-medium text-slate-200">{webhook.name}</span>
					<span className="block text-xs text-slate-500 font-mono truncate max-w-xs">{webhook.url}</span>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<SettingsBadge variant={webhook.active ? 'success' : 'default'}>
					{webhook.active ? 'Active' : 'Inactive'}
				</SettingsBadge>
				<button
					onClick={onDelete}
					className="p-2 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
				>
					<TrashIcon className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}

function NewWebhookForm({ onSubmit, onCancel }: {
	onSubmit: (data: Omit<WebhookConfig, 'id' | 'created_at'>) => void;
	onCancel: () => void;
}) {
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [selectedEvents, setSelectedEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
	const [secret, setSecret] = useState('');

	const toggleEvent = (event: string, checked: boolean) => {
		setSelectedEvents((current) =>
			checked ? [...current, event] : current.filter((selectedEvent) => selectedEvent !== event)
		);
	};

	const generateSecret = () => {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		setSecret(Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(''));
	};

	return (
		<div className="p-4 rounded-lg bg-slate-900 border border-cyan-500/30 space-y-4">
			<SettingsField label="Name" value={name} onChange={setName} placeholder="My Webhook" />
			<SettingsField label="URL" value={url} onChange={setUrl} placeholder="https://..." />
			<div className="space-y-2">
				<span className="text-sm font-medium text-slate-200">Events</span>
				<div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
					{WEBHOOK_EVENTS.map((event) => (
						<label key={event} className="flex items-center gap-3 text-sm text-slate-300">
							<input
								type="checkbox"
								checked={selectedEvents.includes(event)}
								onChange={(e) => toggleEvent(event, e.target.checked)}
								className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
							/>
							<span className="font-mono text-xs">{event}</span>
						</label>
					))}
				</div>
			</div>
			<div className="space-y-2">
				<SettingsField
					label="Signing Secret"
					value={secret}
					onChange={setSecret}
					type="password"
					placeholder="Optional"
				/>
				<SettingsButton onClick={generateSecret}>Generate</SettingsButton>
			</div>
			<div className="flex gap-2">
				<SettingsButton onClick={onCancel}>Cancel</SettingsButton>
				<SettingsButton
					variant="primary"
					onClick={() =>
						onSubmit({
							name,
							url,
							events: selectedEvents,
							active: true,
							secret: secret.trim() || null,
						})
					}
				>
					Create
				</SettingsButton>
			</div>
		</div>
	);
}
