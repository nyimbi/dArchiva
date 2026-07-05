// (c) Copyright Datacraft, 2026
import { lazy,Suspense,useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter,Route,Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { AuthProvider,LoginPage,ProtectedRoute } from './features/auth';
import {
  Analytics,
  ApiKeys,
  AuditLogs,
  Cases,
  Dashboard,
  DocumentDetail,
  Documents,
  Encryption,
  ExceptionQueue,
  Forms,
  HierarchyPage,
  Inbox,
  Ingestion,
  IngestionDashboard,
  NotFound,
  Portfolios,
  RetentionPolicies,
  Routing,
  SearchPage,
  Security,
  SharedDocuments,
  SystemHealth,
  UnauthorizedPage,
  UserHomePage,
  UserProfile,
  Workflows,
} from './pages';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { useBranding } from './hooks/useBranding';
import { SupervisorDashboard } from './pages/SupervisorDashboard';
import { Webhooks } from './pages/Webhooks';

import {
  ProjectDetails,
  QCReview,
  Resources,
  ScanningProjects,
  ScanningStation,
} from './features/scanning-projects/pages';

import { AutoRoutingRules } from './features/auto-routing/AutoRoutingRules';
import { TemplatesPage } from './features/templates/TemplatesPage';
import { UserManagement } from './features/admin/UserManagement';
import { RoleManagement } from './features/admin/RoleManagement';
import { EmailIngestConfigs } from './features/email-ingest/EmailIngestConfigs';
import { ConnectorsPage } from './features/connectors/ConnectorsPage';
import { TenantsPage } from './features/tenants';
import { SettingsPage } from './features/settings';
import { NotificationToaster } from './components/NotificationToaster';
import { ShortcutsProvider } from './features/shortcuts/ShortcutsProvider';
import { AutomationRulesPage } from './features/automation/AutomationRulesPage';
import { ScheduledReportsPage } from './features/reports/ScheduledReportsPage';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { CostDashboard } from './features/billing';
import { QualityDashboard } from './features/quality';
import { SerialNumbersPage } from './features/serial-numbers';
import { InventoryManager } from './features/inventory';

import { ScanningLayout } from './features/scanning-ops/layouts/ScanningLayout';
import { OperatorDashboard } from './features/scanning-ops/pages/OperatorDashboard';
import { ScanningInterface } from './features/scanning-ops/pages/ScanningInterface';
import { StationHome } from './features/scanning-ops/pages/StationHome';
import { WarehouseDashboard } from './features/scanning-ops/pages/WarehouseDashboard';

const FleetManagement = lazy(() =>
	import('./features/agents/components/FleetManagement').then((module) => ({
		default: module.FleetManagement,
	})),
);
const DocumentComparison = lazy(() =>
	import('./pages/DocumentComparison').then((module) => ({
		default: module.DocumentComparison,
	})),
);
const DataExportPage = lazy(() => import('./features/data-export/DataExportPage'));
const SuperAdminPage = lazy(() =>
	import('./features/superadmin/SuperAdminPage').then((module) => ({
		default: module.SuperAdminPage,
	})),
);
const EntityGraphPage = lazy(() =>
	import('./features/entity-graph/EntityGraphPage').then((module) => ({
		default: module.EntityGraphPage,
	})),
);
const IAMDashboard = lazy(() =>
	import('./features/iam/components/IAMDashboard').then((module) => ({
		default: module.IAMDashboard,
	})),
);
const ComplianceDashboard = lazy(() =>
	import('./features/compliance/ComplianceDashboard').then((module) => ({
		default: module.ComplianceDashboard,
	})),
);
const SegmentationPage = lazy(() =>
	import('./features/segmentation/SegmentationPage').then((module) => ({
		default: module.SegmentationPage,
	})),
);
const TagManagementPage = lazy(() =>
	import('./features/tags/TagManagementPage').then((module) => ({
		default: module.TagManagementPage,
	})),
);
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});

function RouteFallback() {
	return (
		<div className="flex min-h-48 items-center justify-center">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-brass-500" />
		</div>
	);
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
