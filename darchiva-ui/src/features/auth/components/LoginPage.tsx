// (c) Copyright Datacraft, 2026
/**
 * Login page with warm archival aesthetic.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { login } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			await login(username, password);
			navigate(from, { replace: true });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-amber-50 to-orange-50 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
			{/* Decorative elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-orange-300/20 dark:from-amber-900/20 dark:to-orange-900/10 rounded-full blur-3xl" />
				<div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-stone-200/40 to-amber-200/30 dark:from-stone-800/30 dark:to-amber-900/20 rounded-full blur-3xl" />
				{/* Subtle grid pattern */}
				<div
					className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
					style={{
						backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
					}}
				/>
			</div>

			<div className="relative w-full max-w-md mx-4">
				{/* Logo and title */}
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg shadow-amber-500/20 mb-4">
						<svg
							className="w-8 h-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
							/>
						</svg>
					</div>
					<h1 className="text-3xl font-serif font-semibold text-stone-800 dark:text-stone-100 tracking-tight">
						dArchiva
					</h1>
					<p className="mt-2 text-stone-500 dark:text-stone-400 font-sans text-sm">
						Enterprise Document Management
					</p>
				</div>

				{/* Login card */}
				<div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-stone-900/5 dark:shadow-stone-950/50 border border-stone-200/50 dark:border-stone-700/50 p-8">
					<h2 className="text-xl font-serif font-medium text-stone-800 dark:text-stone-100 mb-6">
						Sign in to your account
					</h2>

					{error && (
						<div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
							<p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
								<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
								{error}
							</p>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label
								htmlFor="username"
								className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
							>
								Username
							</label>
							<input
								id="username"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								autoComplete="username"
								autoFocus
								className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:ring-amber-600/50 dark:focus:border-amber-600 transition-colors"
								placeholder="Enter your username"
							/>
						</div>

						<div>
							<label
								htmlFor="password"
								className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoComplete="current-password"
								className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:focus:ring-amber-600/50 dark:focus:border-amber-600 transition-colors"
								placeholder="Enter your password"
							/>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
						>
							{isSubmitting ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Signing in...
								</span>
							) : (
								'Sign in'
							)}
						</button>
					</form>
				</div>

				{/* Footer */}
				<p className="mt-6 text-center text-xs text-stone-400 dark:text-stone-500">
					&copy; {new Date().getFullYear()} Datacraft. All rights reserved.
				</p>
			</div>
		</div>
	);
}
