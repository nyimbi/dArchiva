// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Settings as SettingsIcon,
	Building2,
	Palette,
	Users,
	Shield,
	Bell,
	Globe,
	Database,
	Save,
	Upload,
	Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
	{ id: 'general', label: 'General', icon: Building2 },
	{ id: 'branding', label: 'Branding', icon: Palette },
	{ id: 'users', label: 'Users & Access', icon: Users },
	{ id: 'security', label: 'Security', icon: Shield },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
	{ id: 'integrations', label: 'Integrations', icon: Globe },
	{ id: 'storage', label: 'Storage', icon: Database },
];

function GeneralSettings() {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Organization Details
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Organization Name</label>
						<input type="text" defaultValue="Acme Corporation" className="input-field" />
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Slug</label>
						<input type="text" defaultValue="acme-corp" className="input-field font-mono" disabled />
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Contact Email</label>
						<input type="email" defaultValue="admin@acme.com" className="input-field" />
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Contact Phone</label>
						<input type="tel" defaultValue="+1 (555) 123-4567" className="input-field" />
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Document Settings
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Document Numbering</label>
						<input type="text" defaultValue="{YEAR}-{SEQ:6}" className="input-field font-mono" />
						<p className="text-xs text-slate-500 mt-1">
							Preview: 2024-000001
						</p>
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Default Language</label>
						<select className="input-field">
							<option value="en">English</option>
							<option value="es">Spanish</option>
							<option value="fr">French</option>
							<option value="de">German</option>
						</select>
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Default Retention (days)</label>
						<input type="number" defaultValue="2555" className="input-field" />
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Auto-Archive After (days)</label>
						<input type="number" defaultValue="365" className="input-field" />
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Feature Toggles
				</h3>
				<div className="space-y-4">
					{[
						{ id: 'ocr', label: 'OCR Processing', description: 'Automatically extract text from documents', enabled: true },
						{ id: 'ai', label: 'AI Features', description: 'AI-powered classification and extraction', enabled: true },
						{ id: 'workflow', label: 'Workflow Engine', description: 'Document approval workflows', enabled: true },
						{ id: 'encryption', label: 'Encryption', description: 'Client-side document encryption', enabled: false },
					].map((feature) => (
						<div key={feature.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
							<div>
								<p className="font-medium text-slate-200">{feature.label}</p>
								<p className="text-sm text-slate-500">{feature.description}</p>
							</div>
							<button
								className={cn(
									'relative w-11 h-6 rounded-full transition-colors',
									feature.enabled ? 'bg-brass-500' : 'bg-slate-700'
								)}
							>
								<div
									className={cn(
										'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
										feature.enabled ? 'left-6' : 'left-1'
									)}
								/>
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

function BrandingSettings() {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Logo & Icons
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="p-6 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 hover:border-brass-500/50 transition-colors cursor-pointer text-center">
						<Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
						<p className="text-sm text-slate-400">Logo (Light)</p>
						<p className="text-xs text-slate-600 mt-1">PNG, SVG • Max 2MB</p>
					</div>
					<div className="p-6 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 hover:border-brass-500/50 transition-colors cursor-pointer text-center">
						<Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
						<p className="text-sm text-slate-400">Logo (Dark)</p>
						<p className="text-xs text-slate-600 mt-1">PNG, SVG • Max 2MB</p>
					</div>
					<div className="p-6 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 hover:border-brass-500/50 transition-colors cursor-pointer text-center">
						<Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
						<p className="text-sm text-slate-400">Favicon</p>
						<p className="text-xs text-slate-600 mt-1">ICO, PNG • 32x32</p>
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Colors
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Primary Color</label>
						<div className="flex gap-2">
							<input type="color" defaultValue="#f4be4f" className="w-12 h-10 rounded cursor-pointer" />
							<input type="text" defaultValue="#f4be4f" className="input-field flex-1 font-mono uppercase" />
						</div>
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Secondary Color</label>
						<div className="flex gap-2">
							<input type="color" defaultValue="#1e293b" className="w-12 h-10 rounded cursor-pointer" />
							<input type="text" defaultValue="#1e293b" className="input-field flex-1 font-mono uppercase" />
						</div>
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Login Page
				</h3>
				<div className="space-y-4">
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Background Image</label>
						<div className="p-6 bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 hover:border-brass-500/50 transition-colors cursor-pointer text-center">
							<Upload className="w-8 h-8 mx-auto text-slate-500 mb-2" />
							<p className="text-sm text-slate-400">Drop image or click to upload</p>
						</div>
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Welcome Message</label>
						<textarea
							rows={3}
							defaultValue="Welcome to dArchiva. Please sign in to access your documents."
							className="input-field resize-none"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function StorageSettings() {
	const storageUsed = 45.2; // GB
	const storageQuota = 100; // GB
	const percentage = (storageUsed / storageQuota) * 100;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Storage Usage
				</h3>
				<div className="p-6 bg-slate-800/30 rounded-xl">
					<div className="flex items-end justify-between mb-4">
						<div>
							<p className="text-3xl font-display font-semibold text-slate-100">
								{storageUsed} GB
							</p>
							<p className="text-sm text-slate-500">of {storageQuota} GB used</p>
						</div>
						<p className="text-lg font-semibold text-brass-400">{percentage.toFixed(1)}%</p>
					</div>
					<div className="progress-bar h-3">
						<div
							className="progress-bar-fill"
							style={{ width: `${percentage}%` }}
						/>
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Storage Settings
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Storage Quota (GB)</label>
						<input type="number" defaultValue="100" className="input-field" />
					</div>
					<div>
						<label className="text-sm text-slate-400 mb-1 block">Warning Threshold (%)</label>
						<input type="number" defaultValue="80" className="input-field" />
					</div>
				</div>
			</div>

			<div className="border-t border-slate-700/50 pt-6">
				<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
					Storage Backend
				</h3>
				<div className="space-y-3">
					{[
						{ id: 'local', label: 'Local Storage', description: 'Store files on local filesystem', selected: false },
						{ id: 'aws', label: 'AWS S3', description: 'Amazon Simple Storage Service', selected: true },
						{ id: 'r2', label: 'Cloudflare R2', description: 'S3-compatible object storage', selected: false },
						{ id: 'linode', label: 'Linode Object Storage', description: 'S3-compatible cloud storage', selected: false },
					].map((backend) => (
						<div
							key={backend.id}
							className={cn(
								'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors',
								backend.selected
									? 'bg-brass-500/10 border-brass-500/50'
									: 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
							)}
						>
							<div className={cn(
								'w-5 h-5 rounded-full border-2 flex items-center justify-center',
								backend.selected ? 'border-brass-500 bg-brass-500' : 'border-slate-600'
							)}>
								{backend.selected && <Check className="w-3 h-3 text-slate-900" />}
							</div>
							<div>
								<p className="font-medium text-slate-200">{backend.label}</p>
								<p className="text-sm text-slate-500">{backend.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export function Settings() {
	const [activeTab, setActiveTab] = useState('general');

	const renderContent = () => {
		switch (activeTab) {
			case 'general':
				return <GeneralSettings />;
			case 'branding':
				return <BrandingSettings />;
			case 'storage':
				return <StorageSettings />;
			default:
				return (
					<div className="text-center py-12">
						<SettingsIcon className="w-12 h-12 mx-auto text-slate-700 mb-4" />
						<p className="text-slate-500">
							{tabs.find(t => t.id === activeTab)?.label} settings coming soon
						</p>
					</div>
				);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Settings
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Configure organization and system settings
					</p>
				</div>
				<button className="btn-primary">
					<Save className="w-4 h-4" />
					Save Changes
				</button>
			</div>

			<div className="flex gap-6">
				{/* Sidebar */}
				<div className="w-56 flex-shrink-0">
					<nav className="space-y-1">
						{tabs.map((tab) => {
							const Icon = tab.icon;
							return (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id)}
									className={cn(
										'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
										activeTab === tab.id
											? 'bg-brass-500/10 text-brass-400'
											: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
									)}
								>
									<Icon className="w-4 h-4" />
									{tab.label}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Content */}
				<div className="flex-1 glass-card p-6">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
						>
							{renderContent()}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
}
