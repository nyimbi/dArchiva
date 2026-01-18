// Appearance Settings Section
import { SettingsCard, SettingsToggle, SettingsSelect } from '../ui/SettingsControls';

export function AppearanceSettings() {
	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Appearance</h2>
				<p className="text-sm text-slate-400 mt-1">Customize how dArchiva looks and feels</p>
			</div>

			<SettingsCard title="Theme">
				<SettingsSelect
					label="Color Theme"
					description="Choose your preferred color scheme"
					value="dark"
					options={[
						{ value: 'light', label: 'Light' },
						{ value: 'dark', label: 'Dark' },
						{ value: 'system', label: 'System' },
					]}
					onChange={() => {}}
				/>
				<SettingsToggle
					label="Compact Mode"
					description="Reduce spacing for more content density"
					checked={false}
					onChange={() => {}}
				/>
				<SettingsToggle
					label="Enable Animations"
					description="Show motion effects and transitions"
					checked={true}
					onChange={() => {}}
				/>
			</SettingsCard>

			<SettingsCard title="Document Browser">
				<SettingsSelect
					label="Default View"
					value="grid"
					options={[
						{ value: 'grid', label: 'Grid' },
						{ value: 'list', label: 'List' },
						{ value: 'table', label: 'Table' },
					]}
					onChange={() => {}}
				/>
				<SettingsSelect
					label="Thumbnail Size"
					value="medium"
					options={[
						{ value: 'small', label: 'Small' },
						{ value: 'medium', label: 'Medium' },
						{ value: 'large', label: 'Large' },
					]}
					onChange={() => {}}
				/>
				<SettingsToggle label="Show Thumbnails" checked={true} onChange={() => {}} />
				<SettingsToggle label="Show File Extensions" checked={true} onChange={() => {}} />
			</SettingsCard>
		</div>
	);
}
