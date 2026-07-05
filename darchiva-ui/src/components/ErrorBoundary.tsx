// (c) Copyright Datacraft, 2026
import React, { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="flex min-h-[60vh] items-center justify-center p-8">
					<Card className="w-full max-w-md border-slate-800 bg-slate-900 text-slate-100 shadow-xl">
						<CardContent className="flex flex-col items-center gap-5 px-6 py-10 text-center">
							<div className="space-y-2">
								<h2 className="text-xl font-semibold tracking-tight">⚠ Something went wrong</h2>
								{import.meta.env.DEV && this.state.error && (
									<p className="break-words text-sm text-slate-400">
										{this.state.error.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-2 sm:flex-row">
								<Button onClick={this.handleReset}>
									Try Again
								</Button>
								<Button variant="outline" asChild>
									<a href="/">Go Home</a>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

export function withErrorBoundary<T extends object>(
	WrappedComponent: React.ComponentType<T>,
	fallback?: ReactNode,
): React.ComponentType<T> {
	const displayName = WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component';

	function WithErrorBoundaryWrapper(props: T) {
		return (
			<ErrorBoundary fallback={fallback}>
				<WrappedComponent {...props} />
			</ErrorBoundary>
		);
	}

	WithErrorBoundaryWrapper.displayName = `withErrorBoundary(${displayName})`;
	return WithErrorBoundaryWrapper;
}
