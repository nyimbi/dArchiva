// (c) Copyright Datacraft, 2026
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
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
} from './pages';

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
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Layout />}>
						<Route index element={<Dashboard />} />
						<Route path="documents" element={<Documents />} />
						<Route path="workflows" element={<Workflows />} />
						<Route path="forms" element={<Forms />} />
						<Route path="cases" element={<Cases />} />
						<Route path="portfolios" element={<Portfolios />} />
						<Route path="ingestion" element={<Ingestion />} />
						<Route path="routing" element={<Routing />} />
						<Route path="settings" element={<Settings />} />
						<Route path="encryption" element={<Encryption />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
