// (c) Copyright Datacraft, 2026
// Profile Settings - User's personal preferences
import { useState } from 'react';
import { SettingsCard, SettingsField, SettingsToggle, SettingsSelect } from '../ui/SettingsControls';
import { useCurrentUser, useUpdateProfile } from '@/features/auth/api';

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

export function ProfileSettings() {
	const { data: user, isLoading } = useCurrentUser();
	const updateMutation = useUpdateProfile();
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

	if (isLoading) return <SettingsLoading />;

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => setAvatarPreview(reader.result as string);
			reader.readAsDataURL(file);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Profile Settings"
				description="Manage your personal information and preferences"
			/>

			<SettingsCard title="Personal Information">
				<div className="flex items-start gap-6 pb-4 border-b border-slate-700/50">
					<div className="relative group">
						<div className="w-20 h-20 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600">
							{avatarPreview || user?.avatar_url ? (
								<img
									src={avatarPreview || user?.avatar_url}
									alt="Avatar"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-2xl text-slate-400">
									{user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
								</div>
							)}
						</div>
						<label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
							<input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
								<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
								<circle cx="12" cy="13" r="4" />
							</svg>
						</label>
					</div>
					<div className="flex-1 space-y-1">
						<p className="text-sm text-slate-400">Profile Picture</p>
						<p className="text-xs text-slate-500">JPG, PNG or GIF. Max 2MB.</p>
					</div>
				</div>

				<SettingsField
					label="First Name"
					value={user?.first_name || ''}
					onChange={(value) => updateMutation.mutate({ first_name: value })}
				/>
				<SettingsField
					label="Last Name"
					value={user?.last_name || ''}
					onChange={(value) => updateMutation.mutate({ last_name: value })}
				/>
				<SettingsField
					label="Email"
					value={user?.email || ''}
					onChange={() => {}}
					disabled
					description="Contact your administrator to change your email"
				/>
				<SettingsField
					label="Job Title"
					value={user?.job_title || ''}
					onChange={(value) => updateMutation.mutate({ job_title: value })}
					placeholder="e.g., Records Manager"
				/>
				<SettingsField
					label="Phone"
					value={user?.phone || ''}
					onChange={(value) => updateMutation.mutate({ phone: value })}
					placeholder="+1 (555) 000-0000"
				/>
			</SettingsCard>

			<SettingsCard title="Display Preferences">
				<SettingsSelect
					label="Language"
					value={user?.preferences?.language || 'en'}
					options={[
						{ value: 'en', label: 'English' },
						{ value: 'es', label: 'Español' },
						{ value: 'fr', label: 'Français' },
						{ value: 'de', label: 'Deutsch' },
						{ value: 'pt', label: 'Português' },
					]}
					onChange={(value) => updateMutation.mutate({ preferences: { ...user?.preferences, language: value } })}
				/>
				<SettingsSelect
					label="Date Format"
					value={user?.preferences?.date_format || 'MM/DD/YYYY'}
					options={[
						{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
						{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
						{ value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
					]}
					onChange={(value) => updateMutation.mutate({ preferences: { ...user?.preferences, date_format: value } })}
				/>
				<SettingsSelect
					label="Time Format"
					value={user?.preferences?.time_format || '12h'}
					options={[
						{ value: '12h', label: '12-hour (1:30 PM)' },
						{ value: '24h', label: '24-hour (13:30)' },
					]}
					onChange={(value) => updateMutation.mutate({ preferences: { ...user?.preferences, time_format: value } })}
				/>
				<SettingsToggle
					label="Compact View"
					description="Use a denser layout with smaller spacing"
					checked={user?.preferences?.compact_view || false}
					onChange={(checked) => updateMutation.mutate({ preferences: { ...user?.preferences, compact_view: checked } })}
				/>
			</SettingsCard>

			<SettingsCard title="Keyboard Shortcuts">
				<SettingsToggle
					label="Enable Keyboard Shortcuts"
					description="Use keyboard shortcuts for common actions"
					checked={user?.preferences?.keyboard_shortcuts || true}
					onChange={(checked) => updateMutation.mutate({ preferences: { ...user?.preferences, keyboard_shortcuts: checked } })}
				/>
				<div className="mt-4 space-y-2 text-sm">
					<div className="flex justify-between text-slate-400">
						<span>Search</span>
						<kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">⌘K</kbd>
					</div>
					<div className="flex justify-between text-slate-400">
						<span>New Document</span>
						<kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">⌘N</kbd>
					</div>
					<div className="flex justify-between text-slate-400">
						<span>Quick Actions</span>
						<kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-mono">⌘J</kbd>
					</div>
				</div>
			</SettingsCard>

			<SettingsCard title="Password">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-white">Change Password</p>
						<p className="text-xs text-slate-500 mt-1">Last changed 30 days ago</p>
					</div>
					<button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded transition-colors">
						Update Password
					</button>
				</div>
			</SettingsCard>
		</div>
	);
}
