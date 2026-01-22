// (c) Copyright Datacraft, 2026
/**
 * Protected route wrapper that redirects to login if not authenticated.
 */
import { Navigate, useLocation, Outlet } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
	children?: React.ReactNode;
	requiredScopes?: string[];
}


export function ProtectedRoute({ children, requiredScopes }: ProtectedRouteProps) {
	const { user, isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	// Show loading state while checking auth
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-stone-950">
				<div className="flex flex-col items-center gap-4">
					<div className="w-12 h-12 rounded-full border-4 border-stone-200 dark:border-stone-700 border-t-amber-500 animate-spin" />
					<p className="text-stone-500 dark:text-stone-400 text-sm">Loading...</p>
				</div>
			</div>
		);
	}

	// Redirect to login if not authenticated
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	// Check for required scopes if provided
	if (requiredScopes && requiredScopes.length > 0) {
		const hasRequiredScopes = requiredScopes.every((scope) => user?.scopes?.includes(scope));
		if (!hasRequiredScopes) {
			return <Navigate to="/unauthorized" replace />;
		}
	}

	return <>{children || <Outlet />}</>;
}


