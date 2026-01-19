// (c) Copyright Datacraft, 2026
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { AuthProvider, LoginPage, ProtectedRoute } from './features/auth';
import {
	Dashboard,
	Documents,
	Workflows,
	Forms,
	Cases,
	Portfolios,
	Ingestion,
	Routing,
	Settings,
	Encryption,
	Security,
	UserHomePage,
} from './pages';
import {
	ScanningProjects,
	ProjectDetails,
	QCReview,
	Resources,
	ScanningStation,
} from './features/scanning-projects/pages';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			retry: 1,
		},
	},
});

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<BrowserRouter>
					<Routes>
						{/* Public route */}
						<Route path="/login" element={<LoginPage />} />

						{/* Protected routes */}
						<Route
							path="/"
							element={
								<ProtectedRoute>
									<Layout />
								</ProtectedRoute>
							}
						>
							<Route index element={<UserHomePage />} />
							<Route path="dashboard" element={<Dashboard />} />
							<Route path="documents" element={<Documents />} />
							<Route path="documents/:folderId" element={<Documents />} />
							<Route path="workflows" element={<Workflows />} />
							<Route path="forms" element={<Forms />} />
							<Route path="cases" element={<Cases />} />
							<Route path="portfolios" element={<Portfolios />} />
							<Route path="ingestion" element={<Ingestion />} />
							<Route path="routing" element={<Routing />} />
							<Route path="settings" element={<Settings />} />
							<Route path="encryption" element={<Encryption />} />
							<Route path="security" element={<Security />} />
							{/* Scanning Projects */}
							<Route path="scanning-projects" element={<ScanningProjects />} />
							<Route path="scanning-projects/:projectId" element={<ProjectDetails />} />
							<Route path="scanning-projects/:projectId/qc" element={<QCReview />} />
							<Route path="scanning-projects/:projectId/batches/:batchId/scan" element={<ScanningStation />} />
							<Route path="scanning-projects/resources" element={<Resources />} />
						</Route>
					</Routes>
				</BrowserRouter>
			</AuthProvider>
		</QueryClientProvider>
	);
}
