// (c) Copyright Datacraft, 2026
import { CustomFieldsSettings } from '@/features/settings/components/sections/CustomFieldsSettings';
import { DocumentTypesSettings } from '@/features/settings/components/sections/DocumentTypesSettings';
import { NotificationSettings } from '@/features/settings/components/sections/NotificationSettings';
import { TagsSettings } from '@/features/settings/components/sections/TagsSettings';
import { UsersAccessSettings } from '@/features/settings/components/sections/UsersAccessSettings';
import { GeneralSettings, StorageSettings } from '@/features/settings';
import { BrandingSettings } from '@/features/tenant/BrandingSettings';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
	Bell,
	Building2,
	Database,
	FileType,
	Globe,
	List as ListIcon,
	Palette,
	Settings as SettingsIcon,
	Shield,
	Tag as TagIcon,
	Users,
} from 'lucide-react';
import { useState } from 'react';

const tabs = [
	{ id: 'general', label: 'General', icon: Building2 },
	{ id: 'branding', label: 'Branding', icon: Palette },
	{ id: 'tags', label: 'Tags', icon: TagIcon },
	{ id: 'custom-fields', label: 'Custom Fields', icon: ListIcon },
	{ id: 'document-types', label: 'Document Types', icon: FileType },
	{ id: 'users', label: 'Users & Access', icon: Users },
	{ id: 'security', label: 'Security', icon: Shield },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
	{ id: 'integrations', label: 'Integrations', icon: Globe },
	{ id: 'storage', label: 'Storage', icon: Database },
];

export function Settings() {
	const [activeTab, setActiveTab] = useState('general');

	const renderContent = () => {
		switch (activeTab) {
			case 'general':
				return <GeneralSettings />;
			case 'branding':
				return <BrandingSettings />;
			case 'users':
				return <UsersAccessSettings />;
			case 'tags':
				return <TagsSettings />;
			case 'custom-fields':
				return <CustomFieldsSettings />;
			case 'document-types':
				return <DocumentTypesSettings />;
			case 'storage':
				return <StorageSettings />;
			case 'notifications':
				return <NotificationSettings />;
			default:
				return (
					<div className="text-center py-12">
						<SettingsIcon className="w-12 h-12 mx-auto text-slate-700 mb-4" />
						<p className="text-slate-500">
							No configurable options are available for this section yet.
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
