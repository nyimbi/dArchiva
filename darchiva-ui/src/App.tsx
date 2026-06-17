// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter,Route,Routes } from 'react-router-dom';
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
  Inbox,
  Ingestion,
  IngestionDashboard,
  Portfolios,
  RetentionPolicies,
  Routing,
  SearchPage,
  Security,
  Settings,
  SharedDocuments,
  SystemHealth,
  UnauthorizedPage,
  UserHomePage,
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
import { FleetManagement } from './features/agents';
import { UserManagement } from './features/admin/UserManagement';
import { RoleManagement } from './features/admin/RoleManagement';
import { EmailIngestConfigs } from './features/email-ingest/EmailIngestConfigs';
import { ConnectorsPage } from './features/connectors/ConnectorsPage';
import { NotificationToaster } from './components/NotificationToaster';
import { DocumentComparison } from './pages/DocumentComparison';
import { ShortcutsProvider } from './features/shortcuts/ShortcutsProvider';

import { ScanningLayout } from './features/scanning-ops/layouts/ScanningLayout';
import { OperatorDashboard } from './features/scanning-ops/pages/OperatorDashboard';
import { ScanningInterface } from './features/scanning-ops/pages/ScanningInterface';
import { StationHome } from './features/scanning-ops/pages/StationHome';
import { WarehouseDashboard } from './features/scanning-ops/pages/WarehouseDashboard';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});

function AppInner() {
	const { logoUrl } = useBranding();
	void logoUrl; // side-effect: applies CSS variables and caches branding
	const [wizardDismissed, setWizardDismissed] = useState(false);

	return (
		<>
			<NotificationToaster />
			{!wizardDismissed && <OnboardingWizard onDone={() => setWizardDismissed(true)} />}
		</>
	);
}

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<ShortcutsProvider>
				<AppInner />
				<BrowserRouter>
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
								<Route path="settings" element={<Settings />} />
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
								<Route path="templates" element={<TemplatesPage />} />
								<Route path="compare" element={<DocumentComparison />} />
								<Route path="connectors" element={<ConnectorsPage />} />
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
				</BrowserRouter>
				</ShortcutsProvider>
			</AuthProvider>
		</QueryClientProvider>
	);
}
