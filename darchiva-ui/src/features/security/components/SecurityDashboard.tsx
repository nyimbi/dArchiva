// (c) Copyright Datacraft, 2026
/**
 * Security Dashboard - Comprehensive security management interface.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Shield, Lock, Key, Building2, FileText, Activity,
	ChevronRight, Settings
} from 'lucide-react';
import type { PBACPolicy } from '../types';
import { SecurityMetrics } from './SecurityMetrics';
import { PolicyList } from './PolicyList';
import { PolicyEditor } from './PolicyEditor';
import { PolicyApprovalQueue } from './PolicyApprovalQueue';
import { EvaluationLogViewer } from './EvaluationLogViewer';
import { KeyManagement } from './KeyManagement';
import { HiddenDocumentRequests } from './HiddenDocumentRequests';
import { DepartmentAccessMatrix } from './DepartmentAccessMatrix';

type TabId = 'overview' | 'policies' | 'approvals' | 'encryption' | 'departments' | 'logs';

interface TabConfig {
	id: TabId;
	label: string;
	icon: typeof Shield;
	description: string;
}

const TABS: TabConfig[] = [
	{ id: 'overview', label: 'Overview', icon: Activity, description: 'Security metrics and analytics' },
	{ id: 'policies', label: 'Policies', icon: Shield, description: 'Manage access policies' },
	{ id: 'approvals', label: 'Approvals', icon: FileText, description: 'Review pending approvals' },
	{ id: 'encryption', label: 'Encryption', icon: Key, description: 'Key management' },
	{ id: 'departments', label: 'Departments', icon: Building2, description: 'Cross-department access' },
	{ id: 'logs', label: 'Audit Logs', icon: FileText, description: 'Evaluation history' },
];

function TabButton({ tab, isActive, onClick }: { tab: TabConfig; isActive: boolean; onClick: () => void }) {
	const Icon = tab.icon;

	return (
		<button
			onClick={onClick}
			className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
				isActive
					? 'bg-charcoal text-cream shadow-lg'
					: 'text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal'
			}`}
		>
			<div className={`rounded-lg p-2 ${isActive ? 'bg-cream/20' : 'bg-charcoal/5 group-hover:bg-charcoal/10'}`}>
				<Icon className="h-4 w-4" />
			</div>
			<div className="flex-1 min-w-0">
				<span className="block font-['DM_Sans'] text-sm font-medium">{tab.label}</span>
				<span className={`block truncate font-['DM_Sans'] text-xs ${isActive ? 'text-cream/60' : 'text-charcoal/40'}`}>
					{tab.description}
				</span>
			</div>
			{isActive && (
				<ChevronRight className="h-4 w-4 text-cream/60" />
			)}
		</button>
	);
}

export function SecurityDashboard() {
	const [activeTab, setActiveTab] = useState<TabId>('overview');
	const [showPolicyEditor, setShowPolicyEditor] = useState(false);
	const [editingPolicy, setEditingPolicy] = useState<PBACPolicy | undefined>();

	const handleEditPolicy = (policy: PBACPolicy) => {
		setEditingPolicy(policy);
		setShowPolicyEditor(true);
	};

	const handleCreatePolicy = () => {
		setEditingPolicy(undefined);
		setShowPolicyEditor(true);
	};

	const handleSavePolicy = (policy: PBACPolicy) => {
		setShowPolicyEditor(false);
		setEditingPolicy(undefined);
		// Refresh would happen through state management in real app
	};

	const renderContent = () => {
		switch (activeTab) {
			case 'overview':
				return (
					<div className="space-y-8">
						<SecurityMetrics />
						<div className="grid gap-6 lg:grid-cols-2">
							<PolicyApprovalQueue />
							<HiddenDocumentRequests />
						</div>
					</div>
				);
			case 'policies':
				return <PolicyList onEdit={handleEditPolicy} onCreate={handleCreatePolicy} />;
			case 'approvals':
				return <PolicyApprovalQueue />;
			case 'encryption':
				return (
					<div className="space-y-8">
						<KeyManagement />
						<HiddenDocumentRequests />
					</div>
				);
			case 'departments':
				return <DepartmentAccessMatrix />;
			case 'logs':
				return <EvaluationLogViewer />;
			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-cream">
			{/* Header */}
			<div className="border-b-2 border-charcoal/10 bg-parchment">
				<div className="mx-auto max-w-7xl px-6 py-8">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="rounded-xl bg-charcoal p-3">
								<Lock className="h-6 w-6 text-cream" />
							</div>
							<div>
								<h1 className="font-['Newsreader'] text-3xl font-bold text-charcoal">
									Security Center
								</h1>
								<p className="mt-1 font-['DM_Sans'] text-charcoal/60">
									Manage access policies, encryption, and audit controls
								</p>
							</div>
						</div>

						<button className="flex items-center gap-2 rounded-lg bg-charcoal/5 px-4 py-2 font-['DM_Sans'] text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/10">
							<Settings className="h-4 w-4" /> Settings
						</button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="mx-auto max-w-7xl px-6 py-8">
				<div className="flex gap-8">
					{/* Sidebar Navigation */}
					<div className="w-64 flex-shrink-0">
						<nav className="sticky top-8 space-y-2">
							{TABS.map(tab => (
								<TabButton
									key={tab.id}
									tab={tab}
									isActive={activeTab === tab.id}
									onClick={() => setActiveTab(tab.id)}
								/>
							))}
						</nav>

						{/* Quick Stats */}
						<div className="mt-8 rounded-xl border-2 border-charcoal/10 bg-parchment p-4">
							<h3 className="font-['Newsreader'] text-sm font-semibold text-charcoal/60">
								Quick Stats
							</h3>
							<div className="mt-3 space-y-3">
								<div className="flex items-center justify-between">
									<span className="font-['DM_Sans'] text-sm text-charcoal/60">Active Policies</span>
									<span className="font-['DM_Sans'] text-sm font-semibold text-charcoal">12</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-['DM_Sans'] text-sm text-charcoal/60">Pending Reviews</span>
									<span className="font-['DM_Sans'] text-sm font-semibold text-gold">3</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="font-['DM_Sans'] text-sm text-charcoal/60">Encrypted Docs</span>
									<span className="font-['DM_Sans'] text-sm font-semibold text-charcoal">847</span>
								</div>
							</div>
						</div>
					</div>

					{/* Content Area */}
					<div className="flex-1 min-w-0">
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

			{/* Policy Editor Modal */}
			<AnimatePresence>
				{showPolicyEditor && (
					<PolicyEditor
						policy={editingPolicy}
						onSave={handleSavePolicy}
						onCancel={() => setShowPolicyEditor(false)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
