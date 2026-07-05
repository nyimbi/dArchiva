// (c) Copyright Datacraft, 2026
import { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { AuthProvider, ProtectedRoute } from './features/auth';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { useBranding } from './hooks/useBranding';
import { NotificationToaster } from './components/NotificationToaster';
import { ShortcutsProvider } from './features/shortcuts/ShortcutsProvider';
import { ThemeProvider } from './features/theme/ThemeProvider';

import { ScanningLayout } from './features/scanning-ops/layouts/ScanningLayout';

const Analytics = lazy(() =>
	import('./pages/Analytics').then((module) => ({ default: module.Analytics })),
);
const ApiKeys = lazy(() =>
	import('./pages/ApiKeys').then((module) => ({ default: module.ApiKeys })),
);
const AuditLogs = lazy(() =>
	import('./pages/AuditLogs').then((module) => ({ default: module.AuditLogs })),
);
const AutoRoutingRules = lazy(() =>
	import('./features/auto-routing/AutoRoutingRules').then((module) => ({
		default: module.AutoRoutingRules,
	})),
);
const AutomationRulesPage = lazy(() =>
	import('./features/automation/AutomationRulesPage').then((module) => ({
		default: module.AutomationRulesPage,
	})),
);
const Cases = lazy(() =>
	import('./pages/Cases').then((module) => ({ default: module.Cases })),
);
const ConnectorsPage = lazy(() =>
	import('./features/connectors/ConnectorsPage').then((module) => ({
		default: module.ConnectorsPage,
	})),
);
const ComplianceDashboard = lazy(() =>
	import('./features/compliance/ComplianceDashboard').then((module) => ({
		default: module.ComplianceDashboard,
	})),
);
const CostDashboard = lazy(() =>
	import('./features/billing/components/CostDashboard').then((module) => ({
		default: module.CostDashboard,
	})),
);
const Dashboard = lazy(() =>
	import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const DataExportPage = lazy(() => import('./features/data-export/DataExportPage'));
const DocumentComparison = lazy(() =>
	import('./pages/DocumentComparison').then((module) => ({
		default: module.DocumentComparison,
	})),
);
const DocumentDetail = lazy(() =>
	import('./pages/DocumentDetail').then((module) => ({ default: module.DocumentDetail })),
);
const Documents = lazy(() =>
	import('./pages/Documents').then((module) => ({ default: module.Documents })),
);
const EmailIngestConfigs = lazy(() =>
	import('./features/email-ingest/EmailIngestConfigs').then((module) => ({
		default: module.EmailIngestConfigs,
	})),
);
const Encryption = lazy(() =>
	import('./pages/Encryption').then((module) => ({ default: module.Encryption })),
);
const EntityGraphPage = lazy(() =>
	import('./features/entity-graph/EntityGraphPage').then((module) => ({
		default: module.EntityGraphPage,
	})),
);
const ExceptionQueue = lazy(() =>
	import('./pages/ExceptionQueue').then((module) => ({ default: module.ExceptionQueue })),
);
const FleetManagement = lazy(() =>
	import('./features/agents/components/FleetManagement').then((module) => ({
		default: module.FleetManagement,
	})),
);
const Forms = lazy(() =>
	import('./pages/Forms').then((module) => ({ default: module.Forms })),
);
const HierarchyPage = lazy(() =>
	import('./pages/Hierarchy').then((module) => ({ default: module.HierarchyPage })),
);
const IAMDashboard = lazy(() =>
	import('./features/iam/components/IAMDashboard').then((module) => ({
		default: module.IAMDashboard,
	})),
);
const Inbox = lazy(() =>
	import('./pages/Inbox').then((module) => ({ default: module.Inbox })),
);
const Ingestion = lazy(() =>
	import('./pages/Ingestion').then((module) => ({ default: module.Ingestion })),
);
const IngestionDashboard = lazy(() =>
	import('./pages/IngestionDashboard').then((module) => ({
		default: module.IngestionDashboard,
	})),
);
const InventoryManager = lazy(() =>
	import('./features/inventory/components/InventoryManager').then((module) => ({
		default: module.InventoryManager,
	})),
);
const LoginPage = lazy(() =>
	import('./features/auth/components/LoginPage').then((module) => ({
		default: module.LoginPage,
	})),
);
const NotFound = lazy(() =>
	import('./pages/NotFound').then((module) => ({ default: module.NotFound })),
);
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const OperatorDashboard = lazy(() =>
	import('./features/scanning-ops/pages/OperatorDashboard').then((module) => ({
		default: module.OperatorDashboard,
	})),
);
const Portfolios = lazy(() =>
	import('./pages/Portfolios').then((module) => ({ default: module.Portfolios })),
);
const ProjectDetails = lazy(() =>
	import('./features/scanning-projects/pages/ProjectDetails').then((module) => ({
		default: module.ProjectDetails,
	})),
);
const QCReview = lazy(() =>
	import('./features/scanning-projects/pages/QCReview').then((module) => ({
		default: module.QCReview,
	})),
);
const QualityDashboard = lazy(() =>
	import('./features/quality/components/QualityDashboard').then((module) => ({
		default: module.QualityDashboard,
	})),
);
const Resources = lazy(() =>
	import('./features/scanning-projects/pages/Resources').then((module) => ({
		default: module.Resources,
	})),
);
const RetentionPolicies = lazy(() =>
	import('./pages/RetentionPolicies').then((module) => ({
		default: module.RetentionPolicies,
	})),
);
const RoleManagement = lazy(() =>
	import('./features/admin/RoleManagement').then((module) => ({
		default: module.RoleManagement,
	})),
);
const Routing = lazy(() =>
	import('./pages/Routing').then((module) => ({ default: module.Routing })),
);
const ScheduledReportsPage = lazy(() =>
	import('./features/reports/ScheduledReportsPage').then((module) => ({
		default: module.ScheduledReportsPage,
	})),
);
const ScanningInterface = lazy(() =>
	import('./features/scanning-ops/pages/ScanningInterface').then((module) => ({
		default: module.ScanningInterface,
	})),
);
const ScanningProjects = lazy(() =>
	import('./features/scanning-projects/pages/ScanningProjects').then((module) => ({
		default: module.ScanningProjects,
	})),
);
const ScanningStation = lazy(() =>
	import('./features/scanning-projects/pages/ScanningStation').then((module) => ({
		default: module.ScanningStation,
	})),
);
const SearchPage = lazy(() =>
	import('./pages/SearchPage').then((module) => ({ default: module.SearchPage })),
);
const Security = lazy(() =>
	import('./pages/Security').then((module) => ({ default: module.Security })),
);
const SegmentationPage = lazy(() =>
	import('./features/segmentation/SegmentationPage').then((module) => ({
		default: module.SegmentationPage,
	})),
);
const SerialNumbersPage = lazy(() =>
	import('./features/serial-numbers/SerialNumbersPage').then((module) => ({
		default: module.SerialNumbersPage,
	})),
);
const SettingsPage = lazy(() =>
	import('./features/settings/components/SettingsPage').then((module) => ({
		default: module.SettingsPage,
	})),
);
const SharedDocuments = lazy(() =>
	import('./pages/SharedDocuments').then((module) => ({
		default: module.SharedDocuments,
	})),
);
const StationHome = lazy(() =>
	import('./features/scanning-ops/pages/StationHome').then((module) => ({
		default: module.StationHome,
	})),
);
const SuperAdminPage = lazy(() =>
	import('./features/superadmin/SuperAdminPage').then((module) => ({
		default: module.SuperAdminPage,
	})),
);
const SupervisorDashboard = lazy(() =>
	import('./pages/SupervisorDashboard').then((module) => ({
		default: module.SupervisorDashboard,
	})),
);
const SystemHealth = lazy(() =>
	import('./pages/SystemHealth').then((module) => ({ default: module.SystemHealth })),
);
const TagManagementPage = lazy(() =>
	import('./features/tags/TagManagementPage').then((module) => ({
		default: module.TagManagementPage,
	})),
);
const TemplatesPage = lazy(() =>
	import('./features/templates/TemplatesPage').then((module) => ({
		default: module.TemplatesPage,
	})),
);
const TenantsPage = lazy(() =>
	import('./features/tenants/components/TenantsPage').then((module) => ({
		default: module.TenantsPage,
	})),
);
const UnauthorizedPage = lazy(() =>
	import('./pages/UnauthorizedPage').then((module) => ({
		default: module.UnauthorizedPage,
	})),
);
const UserHomePage = lazy(() =>
	import('./features/home/components/UserHomePage').then((module) => ({
		default: module.UserHomePage,
	})),
);
const UserManagement = lazy(() =>
	import('./features/admin/UserManagement').then((module) => ({
		default: module.UserManagement,
	})),
);
const UserProfile = lazy(() =>
	import('./pages/UserProfile').then((module) => ({ default: module.UserProfile })),
);
const WarehouseDashboard = lazy(() =>
	import('./features/scanning-ops/pages/WarehouseDashboard').then((module) => ({
		default: module.WarehouseDashboard,
	})),
);
const Webhooks = lazy(() =>
	import('./pages/Webhooks').then((module) => ({ default: module.Webhooks })),
);
const Workflows = lazy(() =>
	import('./pages/Workflows').then((module) => ({ default: module.Workflows })),
);

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});

function RouteFallback() {
	return <div className="h-screen w-full animate-pulse bg-gray-100" />;
}

function AppInner() {
	const { logoUrl } = useBranding();
	void logoUrl; // side-effect: applies CSS variables and caches branding
	const [wizardDismissed, setWizardDismissed] = useState(
		() => localStorage.getItem('darchiva-onboarding-done') === 'true'
	);

	return (
		<>
			<Toaster richColors position="top-right" visibleToasts={4} />
			<NotificationToaster />
			{!wizardDismissed && <OnboardingWizard onDone={() => {
				localStorage.setItem('darchiva-onboarding-done', 'true');
				setWizardDismissed(true);
			}} />}
		</>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ThemeProvider>
			<AuthProvider>
				<BrowserRouter>
				<ShortcutsProvider>
				<AppInner />
				<ErrorBoundary>
				<Suspense fallback={<RouteFallback />}>
					<Routes>
						{/* Public route */}
						<Route path="/login" element={<LoginPage />} />
						<Route path="/unauthorized" element={<UnauthorizedPage />} />

						{/* Protected routes */}
						<Route path="/" element={<Layout />}>
							<Route element={<ProtectedRoute />}>
								<Route index element={<UserHomePage />} />
								<Route path="inbox" element={<Inbox />} />
								<Route path="shared" element={<SharedDocuments />} />
								<Route path="profile" element={<UserProfile />} />
								<Route path="notifications" element={<NotificationsPage />} />

								<Route path="dashboard" element={<Dashboard />} />
								<Route path="documents" element={<Documents />} />
								<Route path="documents/:folderId" element={<Documents />} />
								<Route path="document/:id" element={<DocumentDetail />} />
								<Route path="workflows" element={<Workflows />} />
								<Route path="forms" element={<Forms />} />
								<Route path="cases" element={<Cases />} />
								<Route path="portfolios" element={<Portfolios />} />
								<Route path="ingestion" element={<Ingestion />} />
								<Route path="ingestion/dashboard" element={<IngestionDashboard />} />
								<Route path="routing" element={<Routing />} />
								<Route path="auto-routing" element={<AutoRoutingRules />} />
								<Route path="audit" element={<AuditLogs />} />
								<Route path="search" element={<SearchPage />} />
								<Route path="settings" element={<SettingsPage isAdmin />} />
								<Route path="encryption" element={<Encryption />} />
								<Route path="security" element={<Security />} />
								{/* Scanning Projects */}
								<Route path="scanning-projects" element={<ScanningProjects />} />
								<Route path="scanning-projects/:projectId" element={<ProjectDetails />} />
								<Route path="scanning-projects/:projectId/qc" element={<QCReview />} />
								<Route path="scanning-projects/:projectId/batches/:batchId/scan" element={<ScanningStation />} />
								<Route path="scanning-projects/resources" element={<Resources />} />
								<Route path="retention" element={<RetentionPolicies />} />
								<Route path="webhooks" element={<Webhooks />} />
								<Route path="agents" element={<FleetManagement />} />
								<Route path="supervisor" element={<SupervisorDashboard />} />
								<Route path="exception-queue" element={<ExceptionQueue />} />
									<Route path="system" element={<SystemHealth />} />
									<Route path="api-keys" element={<ApiKeys />} />
									<Route path="admin/users" element={<UserManagement />} />
									<Route path="admin/roles" element={<RoleManagement />} />
									<Route path="settings/email-ingest" element={<EmailIngestConfigs />} />
								<Route path="tags" element={<TagManagementPage />} />
								<Route path="templates" element={<TemplatesPage />} />
								<Route path="compare" element={<DocumentComparison />} />
								<Route path="connectors" element={<ConnectorsPage />} />
								<Route path="admin/data-export" element={<DataExportPage />} />
								<Route path="superadmin" element={<SuperAdminPage />} />
								<Route path="automation" element={<AutomationRulesPage />} />
								<Route path="reports/scheduled" element={<ScheduledReportsPage />} />
								<Route path="analytics" element={<Analytics />} />
								<Route path="entity-graph" element={<EntityGraphPage />} />
								<Route path="billing" element={<CostDashboard />} />
								<Route path="quality" element={<QualityDashboard />} />
								<Route path="iam" element={<IAMDashboard />} />
								<Route path="compliance" element={<ComplianceDashboard />} />
								<Route path="serial-numbers" element={<SerialNumbersPage />} />
								<Route path="onboarding" element={<OnboardingWizard onDone={() => window.history.back()} />} />
								<Route path="inventory" element={<InventoryManager />} />
								<Route path="segmentation" element={<SegmentationPage />} />
								<Route path="hierarchy" element={<HierarchyPage />} />
								<Route path="admin/tenants" element={<TenantsPage />} />
								<Route path="*" element={<NotFound />} />
							</Route>
						</Route>

						{/* Scanning Operations (Dedicated Layout) - Also Protected */}
						<Route element={<ProtectedRoute />}>
							<Route path="/scanning" element={<ScanningLayout />}>
								<Route index element={<StationHome />} />
								<Route path="warehouse" element={<WarehouseDashboard />} />
								<Route path="operator" element={<OperatorDashboard />} />
								<Route path="interface" element={<ScanningInterface />} />
							</Route>
						</Route>

					</Routes>
				</Suspense>
				</ErrorBoundary>
				</ShortcutsProvider>
				</BrowserRouter>
			</AuthProvider>
			</ThemeProvider>
		</QueryClientProvider>
	);
}
