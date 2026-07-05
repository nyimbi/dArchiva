// (c) Copyright Datacraft, 2026
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
	const navigate = useNavigate();

	return (
		<div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-16">
			<div className="flex max-w-md flex-col items-center gap-5 text-center">
				<div className="text-8xl font-bold text-slate-700">404</div>
				<h1 className="text-2xl font-semibold text-slate-100">Page not found</h1>
				<div className="flex flex-col gap-2 sm:flex-row">
					<Button onClick={() => navigate('/')}>Return Home</Button>
					<Button variant="ghost" onClick={() => window.history.back()}>
						Go Back
					</Button>
				</div>
			</div>
		</div>
	);
}
