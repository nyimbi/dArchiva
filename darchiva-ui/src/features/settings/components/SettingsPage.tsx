// Unified Settings Page
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EXTENDED_SETTINGS_SECTIONS, type SettingsSectionId, type SettingsSection } from '../types';
import { GeneralSettings } from './sections/GeneralSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { StorageSettings } from './sections/StorageSettings';
import { OCRSettings } from './sections/OCRSettings';
import { SearchSettings } from './sections/SearchSettings';
import { SecuritySettings } from './sections/SecuritySettings';
import { EmailSettings } from './sections/EmailSettings';
import { WorkflowSettings } from './sections/WorkflowSettings';
import { IntegrationSettings } from './sections/IntegrationSettings';
import { UsersAccessSettings } from './sections/UsersAccessSettings';
import { ServicesPanel } from './services/ServicesPanel';
import { WorkersPanel } from './services/WorkersPanel';
import { QueuesPanel } from './services/QueuesPanel';
import { SchedulerPanel } from './services/SchedulerPanel';
import { SystemHealthBanner } from './SystemHealthBanner';
import {
	UserIcon,
	UsersIcon,
	PaintBrushIcon,
	CircleStackIcon,
	DocumentMagnifyingGlassIcon,
	MagnifyingGlassIcon,
	ShieldCheckIcon,
	EnvelopeIcon,
	BoltIcon,
	PuzzlePieceIcon,
	ServerIcon,
	CogIcon,
	QueueListIcon,
	ClockIcon,
	BellIcon,
	EyeSlashIcon,
	PrinterIcon,
} from '@heroicons/react/24/outline';

const SECTION_ICONS: Record<string, React.ComponentType<any>> = {
	general: UserIcon,
	appearance: PaintBrushIcon,
	storage: CircleStackIcon,
	ocr: DocumentMagnifyingGlassIcon,
	search: MagnifyingGlassIcon,
	scanner: PrinterIcon,
	security: ShieldCheckIcon,
	email: EnvelopeIcon,
	workflow: BoltIcon,
	integrations: PuzzlePieceIcon,
	services: ServerIcon,
	workers: CogIcon,
	queues: QueueListIcon,
	scheduler: ClockIcon,
	notifications: BellIcon,
	privacy: EyeSlashIcon,
	'users-access': UsersIcon,
};

interface SettingsPageProps {
	isAdmin?: boolean;
	className?: string;
}

export function SettingsPage({ isAdmin = false, className }: SettingsPageProps) {
	const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');

	// Filter sections based on admin status
	const availableSections = EXTENDED_SETTINGS_SECTIONS.filter(
		(section) => !section.adminOnly || isAdmin
	);

	// Group sections by category
	const personalSections = availableSections.filter((s) => s.category === 'personal');
	const systemSections = availableSections.filter((s) => s.category === 'system');
	const integrationSections = availableSections.filter((s) => s.category === 'integration');

	return (
		<div className={cn('min-h-screen bg-[#0a0e14]', className)}>
			{/* System Health Banner */}
			{isAdmin && <SystemHealthBanner />}

			<div className="flex h-[calc(100vh-48px)]">
				{/* Sidebar Navigation */}
				<aside className="w-64 border-r border-slate-800 bg-[#0f1419] overflow-y-auto">
					<div className="p-4">
						<h1 className="text-lg font-semibold text-white mb-1">Settings</h1>
						<p className="text-xs text-slate-500 font-mono">// SYSTEM CONFIGURATION</p>
					</div>

					<nav className="px-2 pb-4 space-y-6">
						{/* Personal Settings */}
						<SectionGroup title="Personal" sections={personalSections} activeSection={activeSection} onSelect={setActiveSection} />

						{/* System Settings */}
						{systemSections.length > 0 && (
							<SectionGroup title="System" sections={systemSections} activeSection={activeSection} onSelect={setActiveSection} />
						)}

						{/* Integration Settings */}
						{integrationSections.length > 0 && (
							<SectionGroup title="Integrations" sections={integrationSections} activeSection={activeSection} onSelect={setActiveSection} />
						)}
					</nav>
				</aside>

				{/* Main Content */}
				<main className="flex-1 overflow-y-auto">
					<div className="max-w-4xl mx-auto p-8">
						<SettingsContent section={activeSection} isAdmin={isAdmin} />
					</div>
				</main>
			</div>
		</div>
	);
}

interface SectionGroupProps {
	title: string;
	sections: SettingsSection[];
	activeSection: SettingsSectionId;
	onSelect: (id: SettingsSectionId) => void;
}

function SectionGroup({ title, sections, activeSection, onSelect }: SectionGroupProps) {
	return (
		<div>
			<h3 className="px-3 mb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
				{title}
			</h3>
			<div className="space-y-0.5">
				{sections.map((section) => {
					const Icon = SECTION_ICONS[section.id] || CogIcon;
					const isActive = section.id === activeSection;

					return (
						<button
							key={section.id}
							onClick={() => onSelect(section.id)}
							className={cn(
								'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
								isActive
									? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
									: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
							)}
						>
							<Icon className="w-4 h-4 flex-shrink-0" />
							<div className="min-w-0">
								<div className="text-sm font-medium truncate">{section.label}</div>
								{isActive && (
									<div className="text-[10px] text-slate-500 truncate">{section.description}</div>
								)}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

interface SettingsContentProps {
	section: SettingsSectionId;
	isAdmin: boolean;
}

function SettingsContent({ section, isAdmin }: SettingsContentProps) {
	switch (section) {
		case 'general':
			return <GeneralSettings />;
		case 'appearance':
			return <AppearanceSettings />;
		case 'storage':
			return <StorageSettings />;
		case 'ocr':
			return <OCRSettings />;
		case 'search':
			return <SearchSettings />;
		case 'security':
			return <SecuritySettings />;
		case 'email':
			return <EmailSettings />;
		case 'workflow':
			return <WorkflowSettings />;
		case 'integrations':
			return <IntegrationSettings />;
		case 'users-access':
			return <UsersAccessSettings />;
		case 'services' as SettingsSectionId:
			return <ServicesPanel />;
		case 'workers' as SettingsSectionId:
			return <WorkersPanel />;
		case 'queues' as SettingsSectionId:
			return <QueuesPanel />;
		case 'scheduler' as SettingsSectionId:
			return <SchedulerPanel />;
		default:
			return (
				<div className="text-center py-12 text-slate-500">
					<p>Section not implemented</p>
				</div>
			);
	}
}
